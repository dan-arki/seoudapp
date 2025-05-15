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
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  ChevronLeft,
  Users,
  Clock,
  Share2,
  Package,
  Plus,
  Minus,
  Trash2,
} from 'lucide-react-native';

export default function SharedOrderScreen() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSharedOrder();
  }, [id]);

  async function loadSharedOrder() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      // Get order details with creator info
      const { data: orderData, error: orderError } = await supabase
        .from('shared_orders')
        .select(`
          *,
          creator:users (
            id,
            name,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Load participants with user info
      const { data: participantsData, error: participantsError } = await supabase
        .from('shared_order_participants')
        .select(`
          *,
          users (
            id,
            name,
            email
          )
        `)
        .eq('shared_order_id', id);

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);

      // Load items with product info
      const { data: itemsData, error: itemsError } = await supabase
        .from('shared_order_items')
        .select(`
          *,
          products (*),
          packs (*),
          users (
            id,
            name,
            email
          )
        `)
        .eq('shared_order_id', id);

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error loading shared order:', error);
      Alert.alert('Erreur', 'Impossible de charger la commande');
    } finally {
      setLoading(false);
    }
  }

  const calculateTotal = () => {
    let total = 0;
    items.forEach(item => {
      if (item.pack_id) {
        total += item.pack_price * item.quantity;
      } else {
        total += item.products.price * item.quantity;
      }
    });
    return total;
  };

  const calculateUserTotal = (userId: string) => {
    let total = 0;
    items
      .filter(item => item.user_id === userId)
      .forEach(item => {
        if (item.pack_id) {
          total += item.pack_price * item.quantity;
        } else {
          total += item.products.price * item.quantity;
        }
      });
    return total;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#221DB6" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Commande non trouvée</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={20} color="#000" />
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isExpired = new Date(order.expires_at) < new Date();
  const isActive = order.status === 'active' && !isExpired;

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Commande partagée',
          headerTitleStyle: styles.headerTitle,
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.back()}
            >
              <ChevronLeft size={24} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <ScrollView style={styles.content}>
          <View style={styles.header}>
            <View style={styles.orderInfo}>
              <Text style={styles.orderName}>{order.name}</Text>
              <View style={[
                styles.statusBadge,
                !isActive && styles.statusBadgeInactive
              ]}>
                <Text style={[
                  styles.statusText,
                  !isActive && styles.statusTextInactive
                ]}>
                  {isExpired ? 'Expirée' : order.status}
                </Text>
              </View>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Users size={20} color="#666" />
                <Text style={styles.infoText}>
                  Créée par {order.creator.name}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Clock size={20} color="#666" />
                <Text style={styles.infoText}>
                  Expire le {new Date(order.expires_at).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {isActive && (
              <TouchableOpacity style={styles.shareButton}>
                <Share2 size={20} color="#fff" />
                <Text style={styles.shareButtonText}>Partager</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Participants</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.participantsContainer}
            >
              {participants.map((participant) => (
                <View key={participant.id} style={styles.participantCard}>
                  <View style={styles.participantAvatar}>
                    <Text style={styles.participantInitial}>
                      {participant.users.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.participantName}>
                    {participant.users.name}
                  </Text>
                  <Text style={styles.participantTotal}>
                    ${calculateUserTotal(participant.user_id).toFixed(2)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Articles</Text>
            {items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <Image
                  source={{
                    uri: item.products.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000'
                  }}
                  style={styles.itemImage}
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.products.name}</Text>
                  <Text style={styles.itemPrice}>
                    ${(item.pack_id ? item.pack_price : item.products.price).toFixed(2)}
                  </Text>
                  <View style={styles.itemMeta}>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity style={styles.quantityButton}>
                        <Minus size={16} color="#666" />
                      </TouchableOpacity>
                      <Text style={styles.quantity}>{item.quantity}</Text>
                      <TouchableOpacity style={styles.quantityButton}>
                        <Plus size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.addedBy}>
                      Ajouté par {item.users.name}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              ${calculateTotal().toFixed(2)}
            </Text>
          </View>
          {isActive && (
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={() => router.push(`/shared-order/${id}/checkout`)}
            >
              <Text style={styles.checkoutButtonText}>
                Passer au paiement
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
    fontSize: 18,
    fontFamily: 'Roboto-Medium',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Roboto-Medium',
    color: '#666',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  orderName: {
    fontSize: 24,
    fontFamily: 'Roboto-Bold',
    color: '#221DB6',
  },
  statusBadge: {
    backgroundColor: '#e5f7ed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeInactive: {
    backgroundColor: '#f5f5f5',
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#22c55e',
    textTransform: 'capitalize',
  },
  statusTextInactive: {
    color: '#666',
  },
  infoSection: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#221DB6',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#fff',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#000',
    marginBottom: 16,
  },
  participantsContainer: {
    paddingRight: 20,
  },
  participantCard: {
    alignItems: 'center',
    marginRight: 16,
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#221DB6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  participantInitial: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#fff',
  },
  participantName: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#000',
    marginBottom: 4,
  },
  participantTotal: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#666',
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  itemImage: {
    width: 100,
    height: 100,
    backgroundColor: '#f5f5f5',
  },
  itemInfo: {
    flex: 1,
    padding: 12,
  },
  itemName: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#000',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#221DB6',
    marginBottom: 12,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    marginHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
  },
  addedBy: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#666',
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
    backgroundColor: '#fff',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#666',
  },
  totalAmount: {
    fontSize: 24,
    fontFamily: 'Roboto-Bold',
    color: '#221DB6',
  },
  checkoutButton: {
    backgroundColor: '#221DB6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#fff',
  },
});