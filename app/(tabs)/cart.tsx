import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Link, Stack, router } from 'expo-router';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Users, Package, Heart } from 'lucide-react-native';
import { useCartStore } from '@/lib/store/cartStore';
import { supabase } from '@/lib/supabase';

export default function CartScreen() {
  const { items, loading, loadCart, updateQuantity, removePack } = useCartStore();
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const calculateTotal = () => {
    const packGroups = new Map();
    let total = 0;

    items.forEach(item => {
      if (item.pack_id) {
        if (!packGroups.has(item.pack_id)) {
          packGroups.set(item.pack_id, {
            price: item.packs!.price,
            quantity: item.quantity,
            items: []
          });
        }
        packGroups.get(item.pack_id).items.push(item);
      } else {
        total += item.products.price * item.quantity;
      }
    });

    packGroups.forEach(pack => {
      total += pack.price * pack.quantity;
    });

    return total;
  };

  const handleCreateSharedOrder = async () => {
    try {
      setCreatingOrder(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      // Create shared order
      const { data: order, error: orderError } = await supabase
        .from('shared_orders')
        .insert({
          name: 'Commande partagée',
          created_by: user.id,
          status: 'active',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Add creator as participant
      const { error: participantError } = await supabase
        .from('shared_order_participants')
        .insert({
          shared_order_id: order.id,
          user_id: user.id,
          role: 'owner',
        });

      if (participantError) throw participantError;

      // Group items by pack
      const packGroups = new Map();
      const regularItems = [];

      items.forEach(item => {
        if (item.pack_id) {
          if (!packGroups.has(item.pack_id)) {
            packGroups.set(item.pack_id, {
              items: [],
              price: item.packs!.price
            });
          }
          packGroups.get(item.pack_id).items.push(item);
        } else {
          regularItems.push(item);
        }
      });

      // Add regular items
      if (regularItems.length > 0) {
        const regularSharedItems = regularItems.map(item => ({
          shared_order_id: order.id,
          product_id: item.products.id,
          user_id: user.id,
          quantity: item.quantity,
          pack_id: null,
          pack_price: null
        }));

        const { error: itemsError } = await supabase
          .from('shared_order_items')
          .insert(regularSharedItems);

        if (itemsError) throw itemsError;
      }

      // Add pack items
      for (const [packId, pack] of packGroups) {
        const packItems = pack.items.map(item => ({
          shared_order_id: order.id,
          product_id: item.products.id,
          user_id: user.id,
          quantity: item.quantity,
          pack_id: packId,
          pack_price: pack.price / pack.items.length
        }));

        const { error: packItemsError } = await supabase
          .from('shared_order_items')
          .insert(packItems);

        if (packItemsError) throw packItemsError;
      }

      // Navigate to the shared order
      router.push({
        pathname: '/shared-order/[id]',
        params: { id: order.id }
      });
    } catch (error) {
      console.error('Error creating shared order:', error);
      Alert.alert('Erreur', 'Impossible de créer la commande partagée');
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleSaveAsFavorite = async () => {
    try {
      setSavingFavorite(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      // Save current cart items as favorite order
      const { error } = await supabase
        .from('favorite_orders')
        .insert({
          user_id: user.id,
          name: 'Commande favorite',
          items: items
        });

      if (error) throw error;

      Alert.alert('Succès', 'Commande ajoutée aux favoris');
      setShowFavoriteModal(false);
    } catch (error) {
      console.error('Error saving favorite:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter aux favoris');
    } finally {
      setSavingFavorite(false);
    }
  };

  // Group items by pack
  const groupedItems = items.reduce((groups: any, item) => {
    if (item.pack_id) {
      if (!groups.packs[item.pack_id]) {
        groups.packs[item.pack_id] = {
          id: item.pack_id,
          name: item.packs!.name,
          price: item.packs!.price,
          quantity: item.quantity,
          items: []
        };
      }
      groups.packs[item.pack_id].items.push(item);
    } else {
      groups.individual.push(item);
    }
    return groups;
  }, { packs: {}, individual: [] });

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Panier',
          headerTitleStyle: styles.headerTitle,
          headerShown: true,
        }}
      />
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#221DB6" />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ShoppingBag size={64} color="#666" />
            <Text style={styles.emptyTitle}>Votre panier est vide</Text>
            <Text style={styles.emptyText}>
              Ajoutez des produits à votre panier pour les voir ici
            </Text>
            <Link href="/(tabs)" asChild>
              <TouchableOpacity style={styles.continueButton}>
                <Text style={styles.continueButtonText}>Continuer les achats</Text>
              </TouchableOpacity>
            </Link>
          </View>
        ) : (
          <>
            <ScrollView style={styles.itemsContainer}>
              {Object.values(groupedItems.packs).map((pack: any) => (
                <View key={pack.id} style={styles.packContainer}>
                  <View style={styles.packHeader}>
                    <View style={styles.packTitleContainer}>
                      <Package size={20} color="#000" />
                      <Text style={styles.packTitle}>{pack.name}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => removePack(pack.id)}
                    >
                      <Trash2 size={16} color="#dc2626" />
                    </TouchableOpacity>
                  </View>

                  {/* Produits inclus */}
                  <View style={styles.packSection}>
                    <Text style={styles.packSectionTitle}>Produits inclus</Text>
                    {pack.items.filter((item: any) => item.is_fixed).map((item: any) => (
                      <View key={item.id} style={styles.packItemContainer}>
                        <Image
                          source={{
                            uri: item.products.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000'
                          }}
                          style={styles.packItemImage}
                        />
                        <View style={styles.packItemDetails}>
                          <Text style={styles.packItemName}>{item.products.name}</Text>
                          <Text style={styles.packItemQuantity}>Quantité: {item.quantity}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Produits sélectionnés */}
                  {pack.items.some((item: any) => !item.is_fixed) && (
                    <View style={styles.packSection}>
                      <Text style={styles.packSectionTitle}>Produits sélectionnés</Text>
                      {pack.items
                        .filter((item: any) => !item.is_fixed)
                        .map((item: any) => (
                          <View key={item.id} style={styles.packItemContainer}>
                            <Image
                              source={{
                                uri: item.products.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000'
                              }}
                              style={styles.packItemImage}
                            />
                            <View style={styles.packItemDetails}>
                              <Text style={styles.packItemName}>{item.products.name}</Text>
                              <Text style={styles.packItemQuantity}>Quantité: {item.quantity}</Text>
                            </View>
                          </View>
                        ))}
                    </View>
                  )}
                  
                  <View style={styles.packFooter}>
                    <View style={styles.packQuantityContainer}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(pack.items[0].id, pack.quantity - 1, true, pack.id)}
                      >
                        <Minus size={16} color="#666" />
                      </TouchableOpacity>
                      <Text style={styles.quantity}>{pack.quantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(pack.items[0].id, pack.quantity + 1, true, pack.id)}
                      >
                        <Plus size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.packPrice}>Prix: ${(pack.price * pack.quantity).toFixed(2)}</Text>
                  </View>
                </View>
              ))}

              {groupedItems.individual.map((item: any) => (
                <View key={item.id} style={styles.cartItem}>
                  <Image
                    source={{
                      uri: item.products.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000'
                    }}
                    style={styles.itemImage}
                  />
                  <View style={styles.itemDetails}>
                    <Link href={`/product/${item.products.id}`} asChild>
                      <TouchableOpacity>
                        <Text style={styles.itemName}>{item.products.name}</Text>
                      </TouchableOpacity>
                    </Link>
                    <Text style={styles.itemPrice}>
                      ${(item.products.price * item.quantity).toFixed(2)}
                    </Text>
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(item.id, item.quantity - 1, false)}
                      >
                        <Minus size={16} color="#666" />
                      </TouchableOpacity>
                      <Text style={styles.quantity}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(item.id, item.quantity + 1, false)}
                        disabled={item.quantity >= item.products.stock}
                      >
                        <Plus size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={styles.favoriteCheckbox}
                onPress={() => {
                  // Ouvrir directement la modal au lieu de cocher la checkbox
                  setShowFavoriteModal(true);
                }}
              >
                <View style={styles.checkboxContainer}>
                  <View style={[
                    styles.checkbox,
                    // La checkbox est cochée uniquement pendant la sauvegarde
                    savingFavorite && styles.checkboxChecked
                  ]}>
                    {savingFavorite && <Heart size={16} color="#fff" />}
                  </View>
                  <View style={styles.checkboxTexts}>
                    <Text style={styles.checkboxTitle}>
                      Ajouter à mes commandes favorites
                    </Text>
                    <Text style={styles.checkboxSubtitle}>
                      Retrouver vos commandes favorites dans votre profil.
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sharedOrderButton, creatingOrder && styles.sharedOrderButtonDisabled]}
                onPress={handleCreateSharedOrder}
                disabled={creatingOrder}
              >
                {creatingOrder ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Users size={20} color="#000" />
                    <Text style={styles.sharedOrderButtonText}>Partager le paiement</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.footer}>
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>
                  ${calculateTotal().toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={() => router.push('/checkout')}
              >
                <Text style={styles.checkoutButtonText}>Passer la commande</Text>
                <ArrowRight size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        )}

        <Modal
          visible={showFavoriteModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFavoriteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Ajouter aux favoris</Text>
              <Text style={styles.modalText}>
                Voulez-vous sauvegarder cette commande dans vos favoris ?
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowFavoriteModal(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Annuler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={handleSaveAsFavorite}
                  disabled={savingFavorite}
                >
                  {savingFavorite ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonTextConfirm}>Confirmer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontFamily: 'Roboto-Bold',
    fontSize: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontFamily: 'Roboto-Bold',
    fontSize: 24,
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: 'Roboto-Regular',
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  continueButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  continueButtonText: {
    fontFamily: 'Roboto-Medium',
    fontSize: 16,
    color: '#fff',
  },
  itemsContainer: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  packContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    margin: 20,
    marginBottom: 0,
    padding: 16,
  },
  packHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  packTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  packTitle: {
    fontFamily: 'Roboto-Bold',
    fontSize: 18,
    color: '#000',
    marginLeft: 8,
  },
  packItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  packItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  packItemDetails: {
    marginLeft: 12,
    flex: 1,
  },
  packItemName: {
    fontFamily: 'Roboto-Medium',
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  packItemQuantity: {
    fontFamily: 'Roboto-Regular',
    fontSize: 12,
    color: '#666',
  },
  packFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  packQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  packPrice: {
    fontFamily: 'Roboto-Bold',
    fontSize: 16,
    color: '#000',
    textAlign: 'right',
  },
  cartItem: {
    flexDirection: 'row',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 16,
  },
  itemName: {
    fontFamily: 'Roboto-Medium',
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontFamily: 'Roboto-Bold',
    fontSize: 18,
    color: '#000',
    marginBottom: 12,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    fontFamily: 'Roboto-Medium',
    fontSize: 16,
    marginHorizontal: 16,
  },
  deleteButton: {
    marginLeft: 'auto',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharedOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  sharedOrderButtonDisabled: {
    opacity: 0.7,
  },
  sharedOrderButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#000',
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontFamily: 'Roboto-Regular',
    fontSize: 16,
    color: '#666',
  },
  totalAmount: {
    fontFamily: 'Roboto-Bold',
    fontSize: 24,
    color: '#000',
  },
  checkoutButton: {
    backgroundColor: '#221DB6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  checkoutButtonText: {
    fontFamily: 'Roboto-Medium',
    fontSize: 16,
    color: '#fff',
    marginRight: 8,
  },
  favoriteCheckbox: {
    backgroundColor: '#f5f5f5',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#221DB6',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#221DB6',
  },
  checkboxTexts: {
    flex: 1,
  },
  checkboxTitle: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#221DB6',
    marginBottom: 4,
  },
  checkboxSubtitle: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f5f5f5',
  },
  modalButtonConfirm: {
    backgroundColor: '#221DB6',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#666',
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#fff',
  },
  packSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  packSectionTitle: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#666',
    marginBottom: 8,
  },
});