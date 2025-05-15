import { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';
import { addToCart } from '@/lib/cart';

type AddToCartButtonProps = {
  productId: string;
  quantity?: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
};

export function AddToCartButton({
  productId,
  quantity = 1,
  onSuccess,
  onError,
  disabled,
}: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    try {
      setLoading(true);
      const result = await addToCart(productId, quantity);
      
      if (result.success) {
        onSuccess?.();
      } else {
        onError?.(result.error || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to add to cart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <ShoppingBag size={20} color="#fff" />
          <Text style={styles.text}>Add to Cart</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  text: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#fff',
  },
});