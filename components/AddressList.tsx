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
import { supabase } from '@/lib/supabase';
import { X, Chrome as Home, Building2, Building, MapPin, PencilLine, Trash2, Plus } from 'lucide-react-native';

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

interface AddressListProps {
  onClose: () => void;
  onAddNew: () => void;
}

export function AddressList({ onClose, onAddNew }: AddressListProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAddresses();
  }, []);

  async function loadAddresses() {
    try {
      setLoading(true);
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
    } catch (error) {
      console.error('Error loading addresses:', error);
      Alert.alert('Erreur', 'Impossible de charger les adresses');
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    try {
      Alert.alert(
        'Supprimer l\'adresse',
        'Êtes-vous sûr de vouloir supprimer cette adresse ?',
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
                .from('delivery_addresses')
                .delete()
                .eq('id', id);

              if (error) throw error;
              await loadAddresses();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error deleting address:', error);
      Alert.alert('Erreur', 'Impossible de supprimer l\'adresse');
    }
  };

  const getAddressIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('maison')) return <Home size={24} color="#000" />;
    if (lowerName.includes('bureau')) return <Building2 size={24} color="#000" />;
    if (lowerName.includes('appartement')) return <Building size={24} color="#000" />;
    return <MapPin size={24} color="#000" />;
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Mes adresses</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#221DB6" />
          </View>
        ) : (
          <>
            <ScrollView style={styles.addressList}>
              {addresses.length === 0 ? (
                <View style={styles.emptyState}>
                  <MapPin size={48} color="#666" />
                  <Text style={styles.emptyTitle}>Aucune adresse</Text>
                  <Text style={styles.emptyText}>
                    Ajoutez une adresse pour faciliter vos livraisons
                  </Text>
                </View>
              ) : (
                addresses.map((address) => (
                  <View key={address.id} style={styles.addressCard}>
                    <View style={styles.addressHeader}>
                      <View style={styles.addressType}>
                        {getAddressIcon(address.name)}
                        <Text style={styles.addressName}>{address.name}</Text>
                        {address.is_default && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultText}>Par défaut</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.addressActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.deleteButton]}
                          onPress={() => handleDelete(address.id)}
                        >
                          <Trash2 size={20} color="#dc2626" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.addressDetails}>
                      <Text style={styles.recipientName}>{address.recipient_name}</Text>
                      <Text style={styles.addressText}>{address.street}</Text>
                      {address.apartment && (
                        <Text style={styles.addressText}>Apt {address.apartment}</Text>
                      )}
                      {address.floor && (
                        <Text style={styles.addressText}>Étage {address.floor}</Text>
                      )}
                      <Text style={styles.addressText}>
                        {address.city}, {address.postal_code}
                      </Text>
                      <Text style={styles.phoneText}>{address.phone}</Text>
                      {address.instructions && (
                        <Text style={styles.instructions}>{address.instructions}</Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.addButton}
              onPress={onAddNew}
            >
              <Plus size={24} color="#fff" />
              <Text style={styles.addButtonText}>Ajouter une adresse</Text>
            </TouchableOpacity>
          </>
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
  addressList: {
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
  addressCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressType: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressName: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    marginLeft: 8,
  },
  defaultBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  defaultText: {
    color: '#16a34a',
    fontSize: 12,
    fontFamily: 'Roboto-Medium',
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  addressDetails: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  recipientName: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#333',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    marginBottom: 2,
  },
  phoneText: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    marginTop: 4,
  },
  instructions: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#221DB6',
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    marginLeft: 8,
  },
});