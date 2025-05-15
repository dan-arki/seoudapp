import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ChevronLeft, CreditCard, MapPin, Plus, ChevronDown, X, Building2, Chrome as Home, Building } from 'lucide-react-native';
import { useCartStore } from '@/lib/store/cartStore';
import { supabase } from '@/lib/supabase';
import { createPaymentIntent, confirmPayment } from '@/lib/stripe';

type AddressType = 'home' | 'office' | 'apartment' | 'other';

interface Address {
  id: string;
  name: string;
  recipient_name: string;
  street: string;
  apartment: string | null;
  floor: string | null;
  building_code: string | null;
  city: string;
  postal_code: string;
  phone: string;
  instructions: string | null;
  is_default: boolean;
}

export default function CheckoutScreen() {
  const [loading, setLoading] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const items = useCartStore(state => state.items);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  // New address form state
  const [addressType, setAddressType] = useState<AddressType>('home');
  const [formData, setFormData] = useState({
    name: '',
    recipient_name: '',
    street: '',
    apartment: '',
    floor: '',
    building_code: '',
    city: '',
    postal_code: '',
    phone: '',
    instructions: '',
    is_default: false,
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('delivery_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);

      // Set default address if available
      const defaultAddress = data?.find(addr => addr.is_default);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
      Alert.alert('Erreur', 'Impossible de charger les adresses');
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleSaveAddress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        return;
      }

      if (!formData.name || !formData.recipient_name || !formData.street || !formData.city || !formData.postal_code || !formData.phone) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
        return;
      }

      const { data, error } = await supabase
        .from('delivery_addresses')
        .insert({
          ...formData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await loadAddresses();
      setSelectedAddress(data);
      setShowAddressForm(false);
      setShowAddressModal(false);
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer l\'adresse');
    }
  };

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

  const handlePayment = async () => {
    try {
      if (!selectedAddress) {
        Alert.alert('Erreur', 'Veuillez sélectionner une adresse de livraison');
        return;
      }

      if (!cardNumber || !expiryDate || !cvv) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs de paiement');
        return;
      }

      setLoading(true);

      // Create payment intent
      const total = calculateTotal();
      const clientSecret = await createPaymentIntent(total);

      // Confirm payment with Stripe
      const paymentResult = await confirmPayment(clientSecret);

      if (paymentResult.status === 'succeeded') {
        Alert.alert(
          'Succès',
          'Votre paiement a été traité avec succès',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      } else {
        throw new Error('Le paiement a échoué');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert(
        'Erreur de paiement',
        error instanceof Error ? error.message : 'Une erreur est survenue lors du paiement'
      );
    } finally {
      setLoading(false);
    }
  };

  const getAddressIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'home':
        return <Home size={24} color="#000" />;
      case 'office':
        return <Building2 size={24} color="#000" />;
      case 'apartment':
        return <Building size={24} color="#000" />;
      default:
        return <MapPin size={24} color="#000" />;
    }
  };

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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adresse de livraison</Text>
            
            <TouchableOpacity
              style={styles.addressButton}
              onPress={() => setShowAddressModal(true)}
            >
              <MapPin size={24} color="#000" />
              <Text style={styles.addressButtonText}>
                {selectedAddress ? selectedAddress.name : 'Sélectionner une adresse'}
              </Text>
              <ChevronDown size={20} color="#666" style={styles.addressButtonIcon} />
            </TouchableOpacity>

            {selectedAddress && (
              <View style={styles.selectedAddress}>
                <Text style={styles.addressName}>{selectedAddress.name}</Text>
                <Text style={styles.addressText}>{selectedAddress.recipient_name}</Text>
                <Text style={styles.addressText}>{selectedAddress.street}</Text>
                {selectedAddress.apartment && (
                  <Text style={styles.addressText}>Apt {selectedAddress.apartment}</Text>
                )}
                {selectedAddress.floor && (
                  <Text style={styles.addressText}>Étage {selectedAddress.floor}</Text>
                )}
                <Text style={styles.addressText}>
                  {selectedAddress.city}, {selectedAddress.postal_code}
                </Text>
                {selectedAddress.instructions && (
                  <Text style={styles.addressInstructions}>{selectedAddress.instructions}</Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détails du paiement</Text>
            
            <View style={styles.card}>
              <CreditCard size={24} color="#000" />
              <Text style={styles.cardText}>Carte bancaire</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Numéro de carte</Text>
              <TextInput
                style={styles.input}
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChangeText={setCardNumber}
                keyboardType="number-pad"
                maxLength={19}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.half]}>
                <Text style={styles.label}>Date d'expiration</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/YY"
                  value={expiryDate}
                  onChangeText={setExpiryDate}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>

              <View style={[styles.formGroup, styles.half]}>
                <Text style={styles.label}>CVV</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  value={cvv}
                  onChangeText={setCvv}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Résumé de la commande</Text>
            
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Sous-total</Text>
                <Text style={styles.summaryValue}>${calculateTotal().toFixed(2)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Frais de livraison</Text>
                <Text style={styles.summaryValue}>$0.00</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>TVA</Text>
                <Text style={styles.summaryValue}>$0.00</Text>
              </View>

              <View style={[styles.summaryRow, styles.total]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${calculateTotal().toFixed(2)}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.payButton, loading && styles.payButtonDisabled]}
            onPress={handlePayment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payButtonText}>
                Payer ${calculateTotal().toFixed(2)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showAddressModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une adresse</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAddressModal(false)}
              >
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {loadingAddresses ? (
              <ActivityIndicator size="large" color="#000" style={styles.modalLoading} />
            ) : (
              <ScrollView style={styles.addressList}>
                {addresses.map((address) => (
                  <TouchableOpacity
                    key={address.id}
                    style={[
                      styles.addressOption,
                      selectedAddress?.id === address.id && styles.addressOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedAddress(address);
                      setShowAddressModal(false);
                    }}
                  >
                    {getAddressIcon(address.name)}
                    <View style={styles.addressOptionContent}>
                      <Text style={styles.addressOptionName}>{address.name}</Text>
                      <Text style={styles.addressOptionDetails}>
                        {address.street}, {address.city}
                      </Text>
                    </View>
                    {address.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>Par défaut</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={styles.newAddressButton}
                  onPress={() => {
                    setShowAddressForm(true);
                    setShowAddressModal(false);
                  }}
                >
                  <Plus size={24} color="#000" />
                  <Text style={styles.newAddressButtonText}>
                    Ajouter une nouvelle adresse
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddressForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddressForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle adresse</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAddressForm(false)}
              >
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.addressForm}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Type d'adresse</Text>
                <View style={styles.addressTypes}>
                  <TouchableOpacity
                    style={[
                      styles.addressTypeButton,
                      addressType === 'home' && styles.addressTypeButtonActive
                    ]}
                    onPress={() => {
                      setAddressType('home');
                      setFormData({ ...formData, name: 'Maison' });
                    }}
                  >
                    <Home size={24} color={addressType === 'home' ? '#fff' : '#000'} />
                    <Text style={[
                      styles.addressTypeText,
                      addressType === 'home' && styles.addressTypeTextActive
                    ]}>Maison</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.addressTypeButton,
                      addressType === 'office' && styles.addressTypeButtonActive
                    ]}
                    onPress={() => {
                      setAddressType('office');
                      setFormData({ ...formData, name: 'Bureau' });
                    }}
                  >
                    <Building2 size={24} color={addressType === 'office' ? '#fff' : '#000'} />
                    <Text style={[
                      styles.addressTypeText,
                      addressType === 'office' && styles.addressTypeTextActive
                    ]}>Bureau</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.addressTypeButton,
                      addressType === 'apartment' && styles.addressTypeButtonActive
                    ]}
                    onPress={() => {
                      setAddressType('apartment');
                      setFormData({ ...formData, name: 'Appartement' });
                    }}
                  >
                    <Building size={24} color={addressType === 'apartment' ? '#fff' : '#000'} />
                    <Text style={[
                      styles.addressTypeText,
                      addressType === 'apartment' && styles.addressTypeTextActive
                    ]}>Appartement</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom du destinataire</Text>
                <TextInput
                  style={styles.input}
                  value={formData.recipient_name}
                  onChangeText={(text) => setFormData({ ...formData, recipient_name: text })}
                  placeholder="Nom complet"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Rue</Text>
                <TextInput
                  style={styles.input}
                  value={formData.street}
                  onChangeText={(text) => setFormData({ ...formData, street: text })}
                  placeholder="Adresse"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Appartement (Optionnel)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.apartment}
                  onChangeText={(text) => setFormData({ ...formData, apartment: text })}
                  placeholder="Numéro d'appartement"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Étage (Optionnel)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.floor}
                  onChangeText={(text) => setFormData({ ...formData, floor: text })}
                  placeholder="Numéro d'étage"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Code d'entrée (Optionnel)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.building_code}
                  onChangeText={(text) => setFormData({ ...formData, building_code: text })}
                  placeholder="Code d'accès"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Ville</Text>
                <TextInput
                  style={styles.input}
                  value={formData.city}
                  onChangeText={(text) => setFormData({ ...formData, city: text })}
                  placeholder="Ville"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Code postal</Text>
                <TextInput
                  style={styles.input}
                  value={formData.postal_code}
                  onChangeText={(text) => setFormData({ ...formData, postal_code: text })}
                  placeholder="Code postal"
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Téléphone</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="Numéro de téléphone"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Instructions de livraison (Optionnel)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.instructions}
                  onChangeText={(text) => setFormData({ ...formData, instructions: text })}
                  placeholder="Instructions spéciales pour la livraison"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formGroup}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setFormData({ ...formData, is_default: !formData.is_default })}
                >
                  <View style={[styles.checkbox, formData.is_default && styles.checkboxChecked]} />
                  <Text style={styles.checkboxLabel}>Définir comme adresse par défaut</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveAddress}
              >
                <Text style={styles.saveButtonText}>Enregistrer l'adresse</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    marginBottom: 16,
  },
  addressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  addressButtonText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
  },
  addressButtonIcon: {
    marginLeft: 8,
  },
  selectedAddress: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
  },
  addressName: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    marginBottom: 2,
  },
  addressInstructions: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  cardText: {
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  summary: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
  },
  total: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
  },
  totalValue: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
  },
  payButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
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
  modalLoading: {
    padding: 40,
  },
  addressList: {
    padding: 20,
  },
  addressOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  addressOptionSelected: {
    backgroundColor: '#000',
  },
  addressOptionContent: {
    flex: 1,
    marginLeft: 12,
  },
  addressOptionName: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#000',
    marginBottom: 4,
  },
  addressOptionDetails: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
  },
  defaultBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  defaultText: {
    fontSize: 12,
    fontFamily: 'Roboto-Medium',
    color: '#16a34a',
  },
  newAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  newAddressButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
  },
  addressForm: {
    padding: 20,
  },
  addressTypes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  addressTypeButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  addressTypeButtonActive: {
    backgroundColor: '#000',
  },
  addressTypeText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#000',
  },
  addressTypeTextActive: {
    color: '#fff',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#000',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#000',
  },
  checkboxLabel: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
  },
});