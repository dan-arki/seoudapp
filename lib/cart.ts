import { supabase } from '@/lib/supabase';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

export async function addToCart(productId: string, quantity: number = 1) {
  try {
    // Validate productId
    if (!productId || !isValidUUID(productId)) {
      throw new Error('ID de produit invalide');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    // Check if product exists and has enough stock
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('stock')
      .eq('id', productId)
      .single();

    if (productError) throw productError;
    if (!product) throw new Error('Produit non trouvé');
    if (product.stock < quantity) throw new Error('Stock insuffisant');

    // Check if item already exists in cart
    const { data: existingItem, error: existingError } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .is('pack_id', null) // Only check for non-pack items
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingItem) {
      // Update quantity if item exists
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock) throw new Error('Stock insuffisant');

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

    return { success: true };
  } catch (error) {
    console.error('Error adding to cart:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Échec de l\'ajout au panier',
    };
  }
}

export async function removeFromCart(itemId: string) {
  try {
    if (!itemId || !isValidUUID(itemId)) {
      throw new Error('ID d\'article invalide');
    }

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error removing from cart:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Échec de la suppression du panier',
    };
  }
}

export async function updateCartItemQuantity(itemId: string, quantity: number) {
  try {
    if (!itemId || !isValidUUID(itemId)) {
      throw new Error('ID d\'article invalide');
    }

    if (quantity < 1) {
      return removeFromCart(itemId);
    }

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating cart:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Échec de la mise à jour du panier',
    };
  }
}

export async function getCartItems() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

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
        )
      `)
      .eq('user_id', user.id);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error getting cart items:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Échec de la récupération du panier',
      data: [],
    };
  }
}

export async function addPackToCart(packId: string) {
  try {
    if (!packId || !isValidUUID(packId)) {
      throw new Error('ID de pack invalide');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

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
    if (!pack) throw new Error('Pack non trouvé');

    // Check stock for all products in the pack
    for (const item of pack.pack_products) {
      if (item.products.stock < item.quantity) {
        throw new Error('Stock insuffisant pour certains produits de ce pack');
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

    return { success: true };
  } catch (error) {
    console.error('Error adding pack to cart:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Échec de l\'ajout du pack au panier',
    };
  }
}