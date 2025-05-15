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
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  ChevronLeft,
  Users,
  CreditCard,
} from 'lucide-react-native';
import { PaymentForm } from '@/components/PaymentForm';

export default function SharedOrderCheckoutScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'individual' | 'group'>('individual');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

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

      // Load order details
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

      // Load participants
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

      // Load items
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
    const packGroups = new Map();
    let total = 0;

    items.forEach(item => {
      if (item.pack_id) {
        if (!packGroups.has(item.pack_id)) {
          packGroups.set(item.pack_id, {
            price: item.packs.price,
            items: []
          });
        }
        packGroups.get(item.pack_id).items.push(item);
      } else {
        total += item.products.price * item.quantity;
      }
    });

    packGroups.forEach(pack => {
      total += pack.price;
    });

    return total;
  };

  const calculateIndividualShare = () => {
    const total = calculateTotal();
    return total / participants.length;
  };

  const handlePaymentSuccess = async () => {
    try {
      // Update order status
      const { error: updateError } = await supabase
        .from('shared_orders')
        .update({ status: 'completed' })
        .eq('id', id);

      if (updateError) throw updateError;

      // Navigate to confirmation
      router.push(`/shared-order/${id}/confirmation`);
    } catch (error) {
      console.error('Error updating order:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la commande');
    }
  };

  const handlePaymentError = (error: string) => {
    Alert.alert('Erreur de paiement', error);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Paiement',
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
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {!showPaymentForm ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mode de paiement</Text>
                <View style={styles.paymentOptions}>
                  <TouchableOpacity
                    style={[
                      styles.paymentOption,
                      paymentMethod === 'individual' && styles.paymentOptionActive,
                    ]}
                    onPress={() => setPaymentMethod('individual')}
                  >
                    <Users size={24} color={paymentMethod === 'individual' ? '#fff' : '#000'} />
                    <Text style={[
                      styles.paymentOptionText,
                      paymentMethod === 'individual' && styles.paymentOptionTextActive,
                    ]}>
                      Payer ma part
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentOption,
                      paymentMethod === 'group' && styles.paymentOptionActive,
                    ]}
                    onPress={() => setPaymentMethod('group')}
                  >
                    <CreditCard size={24} color={paymentMethod === 'group' ? '#fff' : '#000'} />
                    <Text style={[
                      styles.paymentOptionText,
                      paymentMethod === 'group' && styles.paymentOptionTextActive,
                    ]}>
                      Payer pour le groupe
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Résumé de la commande</Text>
                {participants.map((participant) => (
                  <View key={participant.id} style={styles.participantSummary}>
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantName}>
                        {participant.users.name}
                      </Text>
                      <Text style={styles.participantItems}>
                        {items.filter(item => item.user_id === participant.user_id).length} articles
                      </Text>
                    </View>
                    <Text style={styles.participantTotal}>
                      ${(calculateTotal() / participants.length).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Détails du paiement</Text>
                <View style={styles.paymentDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Sous-total</Text>
                    <Text style={styles.detailValue}>
                      ${calculateTotal().toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Frais de service</Text>
                    <Text style={styles.detailValue}>$0.00</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>TVA</Text>
                    <Text style={styles.detailValue}>$0.00</Text>
                  </View>
                  <View style={[styles.detailRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      ${paymentMethod === 'individual' 
                        ? calculateIndividualShare().toFixed(2)
                        : calculateTotal().toFixed(2)
                      }
                    </Text>
                  </View>
                  {paymentMethod === 'individual' && (
                    <Text style={styles.shareNote}>
                      Votre part ({(100 / participants.length).toFixed(0)}% du total)
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.proceedButton}
                onPress={() => setShowPaymentForm(true)}
              >
                <Text style={styles.proceedButtonText}>
                  Procéder au paiement
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <PaymentForm
              amount={paymentMethod === 'individual' ? calculateIndividualShare() : calculateTotal()}
              paymentMethod={paymentMethod}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerButton: {
    padding: 8,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#f5f5f5',
  },
  paymentOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  paymentOptionText: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  paymentOptionTextActive: {
    color: '#fff',
  },
  participantSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  participantItems: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
  },
  participantTotal: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#1a1a1a',
  },
  paymentDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#1a1a1a',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#1a1a1a',
  },
  shareNote: {
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  proceedButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});