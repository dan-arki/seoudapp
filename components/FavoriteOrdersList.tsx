import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { X, Heart, ShoppingBag, ArrowRight, Package } from 'lucide-react-native';
import { useCartStore } from '@/lib/store/cartStore';

interface FavoriteOrdersListProps {
  onClose: () => void;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000';

export function FavoriteOrdersList({ onClose }: FavoriteOrdersListProps) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [reordering, setReordering] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const addItem = useCartStore(state => state.addItem);
  const addPack = useCartStore(state => state.addPack);

  useEffect(() => {
    loadFavoriteOrders();
  }, []);

  const loadFavoriteOrders = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('favorite_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load product details for each order's items
      const ordersWithDetails = await Promise.all(
        (data || []).map(async (order) => {
          const itemsWithDetails = await Promise.all(
            order.items.map(async (item: any) => {
              try {
                if (item.pack_id && isValidUUID(item.pack_id)) {
                  const { data: pack } = await supabase
                    .from('packs')
                    .select('name, image_url')
                    .eq('id', item.pack_id)
                    .single();
                  return { 
                    ...item, 
                    pack: pack || { name: 'Pack indisponible', image_url: DEFAULT_IMAGE }
                  };
                } else if (isValidUUID(item.product_id)) {
                  const { data: product } = await supabase
                    .from('products')
                    .select('name, image_url')
                    .eq('id', item.product_id)
                    .single();
                  return { 
                    ...item, 
                    product: product || { name: 'Produit indisponible', image_url: DEFAULT_IMAGE }
                  };
                }
                return {
                  ...item,
                  product: { name: 'Produit indisponible', image_url: DEFAULT_IMAGE }
                };
              } catch (error) {
                console.error('Error fetching item details:', error);
                return {
                  ...item,
                  product: { name: 'Produit indisponible', image_url: DEFAULT_IMAGE }
                };
              }
            })
          );
          return { ...order, items: itemsWithDetails };
        })
      );

      setOrders(ordersWithDetails);
    } catch (error) {
      console.error('Error loading favorite orders:', error);
      Alert.alert('Erreur', 'Impossible de charger les commandes favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (order: any) => {
    try {
      setReordering(order.id);
      const items = order.items;
      let hasValidItems = false;
      let invalidItems = [];
      let validItemsCount = 0;

      // Group items by pack
      const packGroups = new Map();
      const regularItems = [];

      // First, validate all items and group them
      for (const item of items) {
        if (!item) continue;

        if (item.pack_id) {
          if (!isValidUUID(item.pack_id)) {
            invalidItems.push('Pack invalide');
            continue;
          }
          // Verify pack exists and is active
          const { data: pack } = await supabase
            .from('packs')
            .select('id, is_active')
            .eq('id', item.pack_id)
            .eq('is_active', true)
            .single();
          
          if (!pack) {
            invalidItems.push('Pack indisponible');
            continue;
          }

          if (!packGroups.has(item.pack_id)) {
            packGroups.set(item.pack_id, []);
          }
          packGroups.get(item.pack_id).push(item);
          validItemsCount++;
          hasValidItems = true;
        } else {
          if (!item.product_id || !isValidUUID(item.product_id)) {
            invalidItems.push('Produit invalide');
            continue;
          }
          // Verify product exists and is active
          const { data: product } = await supabase
            .from('products')
            .select('id, is_active')
            .eq('id', item.product_id)
            .eq('is_active', true)
            .single();
          
          if (!product) {
            invalidItems.push('Produit indisponible');
            continue;
          }

          regularItems.push(item);
          validItemsCount++;
          hasValidItems = true;
        }
      }

      // If no valid items were found, show an error and return early
      if (!hasValidItems) {
        Alert.alert(
          'Commande non disponible',
          'Cette commande ne peut pas être passée car tous les produits sont indisponibles.'
        );
        return;
      }

      // Add regular items
      for (const item of regularItems) {
        await addItem(item.product_id, item.quantity);
      }

      // Add packs
      for (const [packId, packItems] of packGroups) {
        await addPack(packId);
      }

      if (invalidItems.length > 0) {
        Alert.alert(
          'Commande partiellement ajoutée',
          `${validItemsCount} produit(s) ont été ajoutés au panier. Certains produits ne sont plus disponibles et n'ont pas été ajoutés.`
        );
      } else {
        Alert.alert('Succès', 'La commande a été ajoutée au panier');
      }
      onClose();
    } catch (error) {
      console.error('Error reordering:', error);
      Alert.alert('Erreur', 'Impossible de passer la commande');
    } finally {
      setReordering(null);
    }
  };

  const handleDelete = async (orderId: string) => {
    try {
      if (!isValidUUID(orderId)) {
        throw new Error('Invalid order ID');
      }

      Alert.alert(
        'Supprimer la commande',
        'Êtes-vous sûr de vouloir supprimer cette commande favorite ?',
        [
          {
            text: 'Annuler',
            style: 'cancel',
          },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              const { error } = await supabase
                .from('favorite_orders')
                .delete()
                .eq('id', orderId);

              if (error) throw error;
              await loadFavoriteOrders();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error deleting order:', error);
      Alert.alert('Erreur', 'Impossible de supprimer la commande');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Mes commandes favorites</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#221DB6" />
          </View>
        ) : (
          <ScrollView style={styles.ordersList}>
            {orders.length === 0 ? (
              <View style={styles.emptyState}>
                <Heart size={48} color="#666" />
                <Text style={styles.emptyTitle}>Aucune commande favorite</Text>
                <Text style={styles.emptyText}>
                  Ajoutez des commandes à vos favoris pour les retrouver ici
                </Text>
              </View>
            ) : (
              orders.map((order) => (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderName}>{order.name}</Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(order.id)}
                    >
                      <X size={20} color="#dc2626" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.orderInfo}>
                    <Text style={styles.orderDate}>
                      Créée le {new Date(order.created_at).toLocaleDateString()}
                    </Text>
                  </View>

                  {/* Items List */}
                  <View style={styles.itemsList}>
                    {order.items.map((item: any, index: number) => (
                      <View key={index} style={styles.itemRow}>
                        <Image
                          source={{
                            uri: (item.pack?.image_url || item.product?.image_url || DEFAULT_IMAGE)
                          }}
                          style={styles.itemImage}
                        />
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>
                            {item.pack?.name || item.product?.name || 'Produit indisponible'}
                          </Text>
                          <Text style={styles.itemQuantity}>
                            Quantité: {item.quantity}
                          </Text>
                        </View>
                        {item.pack_id && (
                          <Package size={16} color="#666" style={styles.packIcon} />
                        )}
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.reorderButton,
                      reordering === order.id && styles.reorderButtonDisabled
                    ]}
                    onPress={() => handleReorder(order)}
                    disabled={reordering === order.id}
                  >
                    {reordering === order.id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <ShoppingBag size={20} color="#fff" />
                        <Text style={styles.reorderButtonText}>
                          Commander à nouveau
                        </Text>
                        <ArrowRight size={20} color="#fff" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ordersList: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderName: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#221DB6',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderInfo: {
    marginBottom: 16,
  },
  orderDate: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    marginBottom: 4,
  },
  itemsList: {
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#333',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#666',
  },
  packIcon: {
    marginLeft: 8,
  },
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#221DB6',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  reorderButtonDisabled: {
    opacity: 0.7,
  },
  reorderButtonText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#fff',
    textAlign: 'center',
  },
});