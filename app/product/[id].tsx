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
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Heart, ShoppingBag } from 'lucide-react-native';
import { useCartStore } from '@/lib/store/cartStore';

export default function ProductScreen() {
  const { id } = useLocalSearchParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    loadProduct();
  }, [id]);

  async function loadProduct() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            id,
            name
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleAddToCart = async () => {
    try {
      setAddingToCart(true);
      await addItem(id as string);
      Alert.alert('Succès', 'Produit ajouté au panier');
      router.push('/cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter au panier');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#221DB6" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Produit non trouvé</Text>
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

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
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
      <ScrollView style={styles.container} bounces={false}>
        <Image
          source={{
            uri: product.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000'
          }}
          style={styles.image}
        />
        
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => setIsFavorite(!isFavorite)}
        >
          <Heart
            size={24}
            color={isFavorite ? '#ff4444' : '#fff'}
            fill={isFavorite ? '#ff4444' : 'none'}
          />
        </TouchableOpacity>

        <View style={styles.content}>
          {product.categories && (
            <Text style={styles.category}>{product.categories.name}</Text>
          )}

          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>{product.price}€/plateau</Text>

          <Text style={styles.description}>{product.description}</Text>

          {product.stock > 0 ? (
            <Text style={styles.stock}>
              En stock ({product.stock} disponibles)
            </Text>
          ) : (
            <Text style={styles.outOfStock}>Rupture de stock</Text>
          )}

          <TouchableOpacity
            style={[
              styles.addButton,
              (!product.stock || addingToCart) && styles.addButtonDisabled
            ]}
            onPress={handleAddToCart}
            disabled={!product.stock || addingToCart}
          >
            {addingToCart ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <ShoppingBag size={20} color="#fff" />
                <Text style={styles.addButtonText}>Ajouter au panier</Text>
              </>
            )}
          </TouchableOpacity>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
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
  image: {
    width: '100%',
    height: 400,
    backgroundColor: '#f5f5f5',
  },
  favoriteButton: {
    position: 'absolute',
    top: 80,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  category: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 24,
    fontFamily: 'Roboto-Bold',
    color: '#000',
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#221DB6',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
  },
  stock: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#22c55e',
    marginBottom: 24,
  },
  outOfStock: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#dc2626',
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#221DB6',
    padding: 16,
    borderRadius: 12,
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#fff',
  },
});