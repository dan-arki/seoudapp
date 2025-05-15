import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { X, Package, Clock, ChevronRight } from 'lucide-react-native';

interface OrderHistoryProps {
  onClose: () => void;
}

export function OrderHistory({ onClose }: OrderHistoryProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            price,
            products (
              id,
              name,
              image_url
            )
          )
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'en_attente_paiement':
        return '#fef3c7';
      case 'confirmée':
        return '#dcfce7';
      case 'préparation':
        return '#dbeafe';
      case 'expédiée':
        return '#f3e8ff';
      case 'livrée':
        return '#dcfce7';
      case 'annulée':
        return '#fee2e2';
      default:
        return '#f3f4f6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'en_attente_paiement':
        return 'En attente de paiement';
      case 'confirmée':
        return 'Confirmée';
      case 'préparation':
        return 'En préparation';
      case 'expédiée':
        return 'Expédiée';
      case 'livrée':
        return 'Livrée';
      case 'annulée':
        return 'Annulée';
      default:
        return status;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Historique des commandes</Text>
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
                <Package size={48} color="#666" />
                <Text style={styles.emptyTitle}>Aucune commande</Text>
                <Text style={styles.emptyText}>
                  Vous n'avez pas encore passé de commande
                </Text>
              </View>
            ) : (
              orders.map((order) => (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View style={styles.orderInfo}>
                      <Text style={styles.orderId}>Commande #{order.id.slice(0, 8)}</Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(order.status) }
                      ]}>
                        <Text style={styles.statusText}>
                          {getStatusText(order.status)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.orderDate}>
                      <Clock size={16} color="#666" />
                      <Text style={styles.dateText}>
                        {formatDate(order.created_at)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.orderItems}>
                    {order.order_items.slice(0, 2).map((item: any) => (
                      <View key={item.id} style={styles.orderItem}>
                        <Image
                          source={{
                            uri: item.products.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000'
                          }}
                          style={styles.itemImage}
                        />
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName} numberOfLines={1}>
                            {item.products.name}
                          </Text>
                          <Text style={styles.itemQuantity}>
                            Quantité: {item.quantity}
                          </Text>
                        </View>
                      </View>
                    ))}
                    {order.order_items.length > 2 && (
                      <Text style={styles.moreItems}>
                        +{order.order_items.length - 2} autres articles
                      </Text>
                    )}
                  </View>

                  <View style={styles.orderFooter}>
                    <Text style={styles.totalAmount}>
                      Total: ${order.total_amount.toFixed(2)}
                    </Text>
                    <TouchableOpacity style={styles.detailsButton}>
                      <Text style={styles.detailsButtonText}>Détails</Text>
                      <ChevronRight size={16} color="#000" />
                    </TouchableOpacity>
                  </View>
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
    marginBottom: 16,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Roboto-Medium',
    color: '#666',
  },
  orderDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
  },
  orderItems: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  moreItems: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalAmount: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#000',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailsButtonText: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#000',
    marginRight: 4,
  },
});