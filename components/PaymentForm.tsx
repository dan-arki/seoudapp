import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { createPaymentIntent, confirmPayment } from '@/lib/stripe';

interface PaymentFormProps {
  amount: number;
  paymentMethod: 'individual' | 'group';
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function PaymentForm({ amount, paymentMethod, onSuccess, onError }: PaymentFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Basic validation
      if (!cardNumber || !expiry || !cvc) {
        throw new Error('Veuillez remplir tous les champs');
      }

      // Create payment intent
      const clientSecret = await createPaymentIntent(amount, paymentMethod);

      // Confirm payment
      await confirmPayment(clientSecret);

      onSuccess();
    } catch (error) {
      console.error('Payment error:', error);
      onError(error instanceof Error ? error.message : 'Erreur de paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Numéro de carte</Text>
        <TextInput
          style={styles.input}
          value={cardNumber}
          onChangeText={setCardNumber}
          placeholder="4242 4242 4242 4242"
          keyboardType="number-pad"
          maxLength={19}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.formGroup, styles.half]}>
          <Text style={styles.label}>Date d'expiration</Text>
          <TextInput
            style={styles.input}
            value={expiry}
            onChangeText={setExpiry}
            placeholder="MM/YY"
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>

        <View style={[styles.formGroup, styles.half]}>
          <Text style={styles.label}>CVC</Text>
          <TextInput
            style={styles.input}
            value={cvc}
            onChangeText={setCvc}
            placeholder="123"
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            Payer {amount.toFixed(2)}€
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  button: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
  },
});