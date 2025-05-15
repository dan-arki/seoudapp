import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Search, ChevronDown, Heart, ShoppingBag, Package } from 'lucide-react-native';
import { useCartStore } from '@/lib/store/cartStore';

type SortOption = {
  label: string;
  value: string;
  order: 'asc' | 'desc';
};

const sortOptions: SortOption[] = [
  { label: 'Nouveaux en premier', value: 'created_at', order: 'desc' },
  { label: 'Prix croissant', value: 'price', order: 'asc' },
  { label: 'Prix décroissant', value: 'price', order: 'desc' },
  { label: 'Populaires', value: 'name', order: 'asc' },
];

export default function CatalogScreen() {
  const { category } = useLocalSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(category as string || 'packs');
  const [selectedSort, setSelectedSort] = useState<SortOption>(sortOptions[0]);
  const [showSortModal, setShowSortModal] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const addPack = useCartStore(state => state.addPack);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    async function loadCategories() {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    }
    loadCategories();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      if (selectedCategory === 'packs') {
        const { data: packsData, error: packsError } = await supabase
          .from('packs')
          .select(`
            id,
            name,
            description,
            price,
            image_url,
            total_products_count,
            is_active
          `)
          .eq('is_active', true)
          .order(selectedSort.value, {
            ascending: selectedSort.order === 'asc'
          });

        if (packsError) throw packsError;
        setPacks(packsData || []);
        setProducts([]);
      } else {
        let query = supabase
          .from('products')
          .select(`
            *,
            categories (
              id,
              name
            )
          `)
          .eq('is_active', true);

        if (selectedCategory) {
          query = query.eq('category_id', selectedCategory);
        }

        if (searchQuery) {
          query = query.ilike('name', `%${searchQuery}%`);
        }

        query = query.order(selectedSort.value, {
          ascending: selectedSort.order === 'asc',
        });

        const { data, error } = await query;

        if (error) throw error;
        setProducts(data || []);
        setPacks([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, selectedSort]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return newFavorites;
    });
  };

  const PackCard = ({ pack }: { pack: any }) => {
    const [addingToCart, setAddingToCart] = useState(false);

    const handleAddToCart = async (e: any) => {
      e.stopPropagation();
      try {
        setAddingToCart(true);
        await addPack(pack.id);
        Alert.alert('Succès', 'Pack ajouté au panier');
        router.push('/cart');
      } catch (error) {
        console.error('Error adding pack to cart:', error);
        Alert.alert('Erreur', 'Impossible d\'ajouter le pack au panier');
      } finally {
        setAddingToCart(false);
      }
    };

    return (
      <TouchableOpacity 
        style={styles.productCard}
        onPress={() => router.push(`/pack/${pack.id}`)}
      >
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(pack.id);
          }}
        >
          <Heart
            size={24}
            color={favorites.has(pack.id) ? '#ff4444' : '#fff'}
            fill={favorites.has(pack.id) ? '#ff4444' : 'none'}
          />
        </TouchableOpacity>
        
        <Image
          source={{
            uri: pack.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000'
          }}
          style={styles.productImage}
        />
        
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{pack.name}</Text>
          <Text style={styles.productDescription} numberOfLines={2}>
            {pack.description}
          </Text>
          <View style={styles.packDetails}>
            <Package size={16} color="#666" />
            <Text style={styles.packCount}>
              {pack.total_products_count} produits
            </Text>
          </View>
          <Text style={styles.productPrice}>{pack.price}€/pack</Text>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddToCart}
            disabled={addingToCart}
          >
            {addingToCart ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <ShoppingBag size={20} color="#fff" />
                <Text style={styles.addButtonText}>Ajouter</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const ProductCard = ({ product }: { product: any }) => {
    const [addingToCart, setAddingToCart] = useState(false);

    const handleAddToCart = async (e: any) => {
      e.stopPropagation();
      try {
        setAddingToCart(true);
        await addItem(product.id);
        Alert.alert('Succès', 'Produit ajouté au panier');
        router.push('/cart');
      } catch (error) {
        console.error('Error adding to cart:', error);
        Alert.alert('Erreur', 'Impossible d\'ajouter au panier');
      } finally {
        setAddingToCart(false);
      }
    };

    return (
      <TouchableOpacity 
        style={styles.productCard}
        onPress={() => router.push(`/product/${product.id}`)}
      >
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(product.id);
          }}
        >
          <Heart
            size={24}
            color={favorites.has(product.id) ? '#ff4444' : '#fff'}
            fill={favorites.has(product.id) ? '#ff4444' : 'none'}
          />
        </TouchableOpacity>
        
        <Image
          source={{
            uri: product.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000'
          }}
          style={styles.productImage}
        />
        
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productPrice}>{product.price}€/plateau</Text>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddToCart}
            disabled={addingToCart}
          >
            {addingToCart ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <ShoppingBag size={20} color="#fff" />
                <Text style={styles.addButtonText}>Ajouter</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Search size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un produit"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={loadData}
          returnKeyType="search"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryPill,
            selectedCategory === 'packs' && styles.categoryPillActive
          ]}
          onPress={() => setSelectedCategory('packs')}
        >
          <Package size={16} color={selectedCategory === 'packs' ? '#fff' : '#000'} />
          <Text
            style={[
              styles.categoryText,
              selectedCategory === 'packs' && styles.categoryTextActive
            ]}
          >
            Packs
          </Text>
        </TouchableOpacity>

        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryPill,
              selectedCategory === cat.id && styles.categoryPillActive
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat.id && styles.categoryTextActive
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.sortButton}
        onPress={() => setShowSortModal(true)}
      >
        <Text style={styles.sortButtonText}>
          Trier par: {selectedSort.label}
        </Text>
        <ChevronDown size={20} color="#666" />
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#221DB6" />
        </View>
      ) : (
        <ScrollView
          style={styles.productsContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.productsGrid}>
            {selectedCategory === 'packs' ? (
              packs.map((pack) => (
                <PackCard key={pack.id} pack={pack} />
              ))
            ) : (
              products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={showSortModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Trier par</Text>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={`${option.value}-${option.order}`}
                style={[
                  styles.sortOption,
                  selectedSort.value === option.value &&
                    selectedSort.order === option.order &&
                    styles.sortOptionActive
                ]}
                onPress={() => {
                  setSelectedSort(option);
                  setShowSortModal(false);
                  loadData();
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    selectedSort.value === option.value &&
                      selectedSort.order === option.order &&
                      styles.sortOptionTextActive
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchInput: {
    flex: 1,
    height: 48,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
  },
  categoriesContainer: {
    maxHeight: 48,
    marginBottom: 16,
  },
  categoriesContent: {
    paddingHorizontal: 16,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: '#221DB6',
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#000',
    marginLeft: 4,
  },
  categoryTextActive: {
    color: '#fff',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sortButtonText: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productsContainer: {
    flex: 1,
  },
  productsGrid: {
    padding: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#221DB6',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    marginBottom: 8,
  },
  packDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  packCount: {
    marginLeft: 6,
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#666',
  },
  productPrice: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#221DB6',
    padding: 12,
    borderRadius: 12,
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#fff',
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
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    marginBottom: 16,
  },
  sortOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sortOptionActive: {
    backgroundColor: '#f5f7f9',
  },
  sortOptionText: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#333',
  },
  sortOptionTextActive: {
    fontFamily: 'Roboto-Bold',
    color: '#221DB6',
  },
});