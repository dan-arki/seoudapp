import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { ShoppingBag, Star } from 'lucide-react-native';
import { useCartStore } from '@/lib/store/cartStore';
import { useState } from 'react';

type ProductCardProps = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  description?: string | null;
  rating?: number;
  compact?: boolean;
};

export function ProductCard({ 
  id, 
  name, 
  price, 
  imageUrl, 
  description,
  rating = 4.5,
  compact 
}: ProductCardProps) {
  const [adding, setAdding] = useState(false);
  const addItem = useCartStore(state => state.addItem);

  const handleAddToCart = async (e: any) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Stop event propagation
    
    try {
      setAdding(true);
      await addItem(id);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setAdding(false);
    }
  };

  const CardContent = () => (
    <View style={[
      styles.container, 
      compact && styles.containerCompact,
      Platform.OS === 'web' && styles.webHover
    ]}>
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000'
          }}
          style={styles.image}
        />
        {!compact && (
          <View style={styles.ratingContainer}>
            <Star size={12} color="#FFD700" fill="#FFD700" />
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>{name}</Text>
        {!compact && description && (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        )}
        <View style={styles.footer}>
          <Text style={styles.price}>${price.toFixed(2)}</Text>
          <TouchableOpacity 
            style={[styles.addButton, adding && styles.addButtonDisabled]}
            onPress={handleAddToCart}
            disabled={adding}
          >
            {adding ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ShoppingBag size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <Link href={`/product/${id}`} style={[styles.link, compact && styles.linkCompact]}>
        <CardContent />
      </Link>
    );
  }

  return (
    <Link href={`/product/${id}`} asChild>
      <TouchableOpacity>
        <CardContent />
      </TouchableOpacity>
    </Link>
  );
}

const styles = StyleSheet.create({
  link: {
    textDecorationLine: 'none',
    display: 'block',
    marginBottom: 16,
  },
  linkCompact: {
    marginBottom: 0,
    marginRight: 16,
  },
  container: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  containerCompact: {
    width: 200,
    marginRight: 0,
  },
  webHover: {
    cursor: 'pointer',
    transition: 'transform 0.2s ease-in-out',
    ':hover': {
      transform: 'translateY(-4px)',
    },
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
  },
  ratingContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontFamily: 'Roboto-Medium',
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  content: {
    padding: 16,
  },
  name: {
    fontFamily: 'Roboto-Medium',
    fontSize: 16,
    marginBottom: 8,
    color: '#1a1a1a',
  },
  description: {
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontFamily: 'Roboto-Bold',
    fontSize: 18,
    color: '#000',
  },
  addButton: {
    backgroundColor: '#000',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
});