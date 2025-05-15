import { useState, useEffect, useRef } from 'react';
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
import { ChevronLeft, ShoppingBag, Star, Package } from 'lucide-react-native';
import { useCartStore } from '@/lib/store/cartStore';

export default function PackScreen() {
  const { id } = useLocalSearchParams();
  const [pack, setPack] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, any[]>>({});
  const addPack = useCartStore(state => state.addPack);

  useEffect(() => {
    loadPack();
  }, [id]);

  async function loadPack() {
    try {
      setLoading(true);

      // Load category details
      const { data, error } = await supabase
        .from('packs')
        .select(`
          *,
          pack_products (
            quantity,
            is_fixed,
            products (
              id,
              name,
              price,
              image_url,
              description
            )
          ),
          pack_categories (
            id,
            category_id,
            products_count,
            categories (
              id,
              name
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setPack(data);

      // Initialize selected products state
      const initial: Record<string, any[]> = {};
      data.pack_categories?.forEach((pc: any) => {
        initial[pc.category_id] = [];
      });
      setSelectedProducts(initial);
    } catch (error) {
      console.error('Error loading pack:', error);
      Alert.alert('Error', 'Failed to load pack details');
    } finally {
      setLoading(false);
    }
  }

  const handleAddToCart = async () => {
    try {
      // Vérifier que tous les produits requis sont sélectionnés
      const allCategoriesComplete = pack.pack_categories?.every((category: any) => {
        const selected = selectedProducts[category.category_id]?.length || 0;
        return selected === category.products_count;
      });

      if (!allCategoriesComplete) {
        Alert.alert(
          'Configuration incomplète',
          'Veuillez sélectionner tous les produits requis pour chaque catégorie'
        );
        return;
      }

      setAddingToCart(true);
      await addPack(id as string, selectedProducts);
      Alert.alert('Succès', 'Pack ajouté au panier');
      router.push('/cart');
    } catch (error) {
      console.error('Error adding pack to cart:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le pack au panier');
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

  if (!pack) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Pack non trouvé</Text>
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

  // Séparer les produits fixes des catégories personnalisables
  const fixedProducts = pack.pack_products.filter((item: any) => item.is_fixed);
  const hasCustomizableCategories = pack.pack_categories && pack.pack_categories.length > 0;

  // Vérifier si toutes les catégories sont complètes
  const allCategoriesComplete = !hasCustomizableCategories || pack.pack_categories.every((category: any) => {
    const selected = selectedProducts[category.category_id]?.length || 0;
    return selected === category.products_count;
  });

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
            uri: pack.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000'
          }}
          style={styles.image}
        />

        <View style={styles.content}>
          <Text style={styles.name}>{pack.name}</Text>
          <Text style={styles.price}>{pack.price}€/pack</Text>

          <View style={styles.packInfo}>
            <Package size={20} color="#666" />
            <Text style={styles.packCount}>
              {pack.total_products_count} produits
            </Text>
          </View>

          <Text style={styles.description}>{pack.description}</Text>

          {/* Section des produits fixes */}
          {fixedProducts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Produits inclus</Text>
              {fixedProducts.map((item: any) => (
                <View key={item.products.id} style={styles.productCard}>
                  <Image
                    source={{
                      uri: item.products.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000'
                    }}
                    style={styles.productImage}
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{item.products.name}</Text>
                    <Text style={styles.productDescription} numberOfLines={2}>
                      {item.products.description}
                    </Text>
                    <Text style={styles.productQuantity}>
                      Quantité: {item.quantity}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Section des catégories personnalisables */}
          {hasCustomizableCategories && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Catégories personnalisables</Text>
              {pack.pack_categories.map((category: any) => (
                <View key={category.id} style={styles.categoryCard}>
                  <Text style={styles.categoryName}>
                    {category.categories.name}
                  </Text>
                  <Text style={styles.categoryCount}>
                    Sélectionnez {category.products_count} produit{category.products_count > 1 ? 's' : ''}
                  </Text>
                  <View style={styles.selectionStatus}>
                    <Text style={[
                      styles.selectionText,
                      (selectedProducts[category.category_id]?.length || 0) === category.products_count && styles.selectionComplete
                    ]}>
                      {(selectedProducts[category.category_id]?.length || 0)}/{category.products_count} sélectionnés
                    </Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={styles.customizeButton}
                onPress={() => router.push(`/pack/${id}/customize`)}
              >
                <Text style={styles.customizeButtonText}>
                  Personnaliser le pack
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.addButton,
              (!allCategoriesComplete || addingToCart) && styles.addButtonDisabled
            ]}
            onPress={handleAddToCart}
            disabled={!allCategoriesComplete || addingToCart}
          >
            {addingToCart ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <ShoppingBag size={20} color="#fff" />
                <Text style={styles.addButtonText}>
                  {allCategoriesComplete ? 'Ajouter au panier' : 'Personnalisez d\'abord le pack'}
                </Text>
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
  content: {
    padding: 20,
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
  packInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  packCount: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#666',
  },
  description: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#000',
    marginBottom: 16,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: 100,
    height: 100,
    backgroundColor: '#f5f5f5',
  },
  productInfo: {
    flex: 1,
    padding: 12,
  },
  productName: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#000',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    marginBottom: 8,
  },
  productQuantity: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#221DB6',
  },
  categoryCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#000',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    marginBottom: 8,
  },
  selectionStatus: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 8,
  },
  selectionText: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#666',
    textAlign: 'center',
  },
  selectionComplete: {
    color: '#22c55e',
  },
  customizeButton: {
    backgroundColor: '#221DB6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  customizeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#221DB6',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#fff',
  },
});