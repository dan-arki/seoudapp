import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface CartItem {
  id: string;
  quantity: number;
  pack_id: string | null;
  pack_price: number | null;
  products: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    stock: number;
  };
  packs?: {
    id: string;
    name: string;
    price: number;
    description: string | null;
  };
}

interface CartStore {
  items: CartItem[];
  loading: boolean;
  loadCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  addPack: (packId: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  removePack: (packId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number, isPack: boolean, packId?: string) => Promise<void>;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  loading: false,

  loadCart: async () => {
    try {
      set({ loading: true });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          pack_id,
          pack_price,
          products (
            id,
            name,
            price,
            image_url,
            stock
          ),
          packs (
            id,
            name,
            price,
            description
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      set({ items: data || [] });
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (productId: string, quantity = 1) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if product exists and has enough stock
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      if (!product) throw new Error('Product not found');
      if (product.stock < quantity) throw new Error('Not enough stock');

      // Check if item already exists in cart
      const { data: existingItem, error: existingError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .is('pack_id', null)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingItem) {
        // Update quantity if item exists
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock) throw new Error('Not enough stock');

        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('id', existingItem.id);

        if (updateError) throw updateError;
      } else {
        // Insert new item if it doesn't exist
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: productId,
            quantity,
            pack_id: null,
            pack_price: null
          });

        if (insertError) throw insertError;
      }

      // Reload cart
      await get().loadCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  },

  addPack: async (packId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get pack details with products
      const { data: pack, error: packError } = await supabase
        .from('packs')
        .select(`
          *,
          pack_products (
            quantity,
            products (
              id,
              stock
            )
          )
        `)
        .eq('id', packId)
        .single();

      if (packError) throw packError;
      if (!pack) throw new Error('Pack not found');

      // Check stock for all products in the pack
      for (const item of pack.pack_products) {
        if (item.products.stock < item.quantity) {
          throw new Error('Not enough stock for some products in this pack');
        }
      }

      // Check if the pack already exists in the cart
      const { data: existingPackItems, error: existingPackError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('pack_id', packId);

      if (existingPackError) throw existingPackError;

      if (existingPackItems && existingPackItems.length > 0) {
        // Update quantities for existing pack items
        for (const item of existingPackItems) {
          const { error: updateError } = await supabase
            .from('cart_items')
            .update({ quantity: item.quantity + 1 })
            .eq('id', item.id);

          if (updateError) throw updateError;
        }
      } else {
        // Insert new pack items
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert(
            pack.pack_products.map(item => ({
              user_id: user.id,
              product_id: item.products.id,
              quantity: item.quantity,
              pack_id: packId,
              pack_price: pack.price / pack.pack_products.length
            }))
          );

        if (insertError) throw insertError;
      }

      // Reload cart
      await get().loadCart();
    } catch (error) {
      console.error('Error adding pack to cart:', error);
      throw error;
    }
  },

  removeItem: async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      await get().loadCart();
    } catch (error) {
      console.error('Error removing item:', error);
      throw error;
    }
  },

  removePack: async (packId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('pack_id', packId);

      if (error) throw error;
      await get().loadCart();
    } catch (error) {
      console.error('Error removing pack:', error);
      throw error;
    }
  },

  updateQuantity: async (itemId: string, quantity: number, isPack: boolean, packId?: string) => {
    try {
      if (quantity < 1) {
        if (isPack && packId) {
          await get().removePack(packId);
        } else {
          await get().removeItem(itemId);
        }
        return;
      }

      // Update quantity for the item
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId);

      if (error) throw error;

      // If this is a pack item, update all items in the pack to the same quantity
      if (isPack && packId) {
        const { error: packError } = await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('pack_id', packId);

        if (packError) throw packError;
      }

      await get().loadCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      throw error;
    }
  },
}));