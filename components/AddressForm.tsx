import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface AddressFormProps {
  onClose: () => void;
}

export function AddressForm({ onClose }: AddressFormProps) {
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

  const handleSubmit = async () => {
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

      const { error } = await supabase
        .from('delivery_addresses')
        .insert({
          ...formData,
          user_id: user.id,
        });

      if (error) throw error;

      Alert.alert('Succès', 'Adresse enregistrée avec succès');
      onClose();
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Erreur', 'Échec de l\'enregistrement de l\'adresse');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Ajouter une adresse</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nom de l'adresse</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Domicile, Bureau, etc."
            />
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
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSubmit}
          >
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
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
  form: {
    padding: 20,
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
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
  },
  saveButton: {
    backgroundColor: '#000',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
  },
});