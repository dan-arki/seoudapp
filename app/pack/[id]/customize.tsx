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
  Image,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Package, Check, CircleAlert as AlertCircle, Plus, Minus } from 'lucide-react-native';
import { useCartStore } from '@/lib/store/cartStore';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  description: string | null;
  stock: number;
}

interface Category {
  id: string;
  name: string;
  products_count: number;
  products: Product[];
}

interface PackProduct {
  id: string;
  quantity: number;
  is_fixed: boolean;
  products: Product;
}

interface SelectedProduct {
  product: Product;
  quantity: number;
}

export default function PackCustomizeScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [pack, setPack] = useState<any>(null);
  const [fixedProducts, setFixedProducts] = useState<PackProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, SelectedProduct[]>>({});
  const [saving, setSaving] = useState(false);
  const addPack = useCartStore(state => state.addPack);

  useEffect(() => {
    loadPack();
  }, [id]);

  async function loadPack() {
    try {
      setLoading(true);
      
      // Load pack details with fixed products
      const { data: packData, error: packError } = await supabase
        .from('packs')
        .select(`
          *,
          pack_products (
            id,
            quantity,
            is_fixed,
            products (
              id,
              name,
              price,
              image_url,
              description,
              stock
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

      if (packError) throw packError;
      if (!packData) throw new Error('Pack not found');

      setPack(packData);

      // Separate fixed products
      const fixed = packData.pack_products.filter((p: any) => p.is_fixed);
      setFixedProducts(fixed);

      // Load available products for each category
      const categoriesWithProducts = await Promise.all(
        packData.pack_categories.map(async (pc: any) => {
          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', pc.category_id)
            .eq('is_active', true);

          if (productsError) throw productsError;

          return {
            id: pc.category_id,
            name: pc.categories.name,
            products_count: pc.products_count,
            products: products || [],
          };
        })
      );

      setCategories(categoriesWithProducts);

      // Initialize selected products state
      const initial: Record<string, SelectedProduct[]> = {};
      packData.pack_categories.forEach((pc: any) => {
        initial[pc.category_id] = [];
      });
      setSelectedProducts(initial);

    } catch (error) {
      console.error('Error loading pack:', error);
      router.back();
    } finally {
      setLoading(false);
    }
  }

  const handleProductSelection = (categoryId: string, product: Product) => {
    setSelectedProducts(prev => {
      const current = prev[categoryId] || [];
      const existingProduct = current.find(p => p.product.id === product.id);
      const requiredCount = categories.find(c => c.id === categoryId)?.products_count || 0;
      
      if (existingProduct) {
        // Remove product if it exists
        return {
          ...prev,
          [categoryId]: current.filter(p => p.product.id !== product.id)
        };
      } else {
        // Add product with initial quantity of 1
        const totalQuantity = current.reduce((sum, p) => sum + p.quantity, 0);
        if (totalQuantity < requiredCount) {
          return {
            ...prev,
            [categoryId]: [...current, { product, quantity: 1 }]
          };
        }
      }
      return prev;
    });
  };

  const updateProductQuantity = (categoryId: string, productId: string, change: number) => {
    setSelectedProducts(prev => {
      const current = prev[categoryId] || [];
      const requiredCount = categories.find(c => c.id === categoryId)?.products_count || 0;
      const totalQuantity = current.reduce((sum, p) => sum + p.quantity, 0);
      
      // Calculate new quantity
      const updatedProducts = current.map(item => {
        if (item.product.id === productId) {
          const newQuantity = Math.max(1, item.quantity + change);
          // Check if new total would exceed required count
          if (totalQuantity - item.quantity + newQuantity <= requiredCount) {
            return { ...item, quantity: newQuantity };
          }
        }
        return item;
      });

      return {
        ...prev,
        [categoryId]: updatedProducts
      };
    });
  };

  const isProductSelected = (categoryId: string, productId: string) => {
    return selectedProducts[categoryId]?.some(p => p.product.id === productId) || false;
  };

  const getSelectionStatus = (categoryId: string) => {
    const selected = selectedProducts[categoryId]?.reduce((sum, p) => sum + p.quantity, 0) || 0;
    const required = categories.find(c => c.id === categoryId)?.products_count || 0;
    return {
      selected,
      required,
      isComplete: selected === required,
      remaining: required - selected,
    };
  };

  const isAllCategoriesComplete = () => {
    return categories.every(category => {
      const status = getSelectionStatus(category.id);
      return status.isComplete;
    });
  };

  const handleAddToCart = async () => {
    try {
      setSaving(true);
      await addPack(id as string);
      router.push('/cart');
    } catch (error) {
      console.error('Error adding pack to cart:', error);
      Alert.alert('Error', 'Failed to add pack to cart');
    } finally {
      setSaving(false);
    }
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
          headerTitle: 'Customize Pack',
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
      <View style={styles.container}>
        <ScrollView style={styles.content}>
          {/* Fixed Products Section */}
          {fixedProducts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Package size={20} color="#000" />
                <Text style={styles.sectionTitle}>Fixed Products</Text>
              </View>
              {fixedProducts.map(item => (
                <View key={item.id} style={styles.productItem}>
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
                      Quantity: {item.quantity}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Customizable Categories Section */}
          {categories.map(category => {
            const status = getSelectionStatus(category.id);
            return (
              <View key={category.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{category.name}</Text>
                  <View style={[
                    styles.selectionStatus,
                    status.isComplete ? styles.selectionComplete : styles.selectionIncomplete
                  ]}>
                    <Text style={[
                      styles.selectionStatusText,
                      status.isComplete ? styles.selectionCompleteText : styles.selectionIncompleteText
                    ]}>
                      {status.isComplete
                        ? 'Selection complete'
                        : `Select ${status.remaining} more`}
                    </Text>
                  </View>
                </View>

                <View style={styles.productsGrid}>
                  {category.products.map(product => {
                    const isSelected = isProductSelected(category.id, product.id);
                    const selectedProduct = selectedProducts[category.id]?.find(p => p.product.id === product.id);
                    
                    return (
                      <View key={product.id} style={styles.selectableProductContainer}>
                        <TouchableOpacity
                          style={[
                            styles.selectableProduct,
                            isSelected && styles.selectedProduct
                          ]}
                          onPress={() => handleProductSelection(category.id, product)}
                          disabled={!isSelected && status.isComplete}
                        >
                          <Image
                            source={{
                              uri: product.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000'
                            }}
                            style={styles.selectableProductImage}
                          />
                          {isSelected && (
                            <View style={styles.selectedOverlay}>
                              <Check size={24} color="#fff" />
                            </View>
                          )}
                          <View style={styles.selectableProductInfo}>
                            <Text style={styles.selectableProductName}>
                              {product.name}
                            </Text>
                            <Text style={styles.selectableProductPrice}>
                              ${product.price.toFixed(2)}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {isSelected && (
                          <View style={styles.quantityControls}>
                            <TouchableOpacity
                              style={styles.quantityButton}
                              onPress={() => updateProductQuantity(category.id, product.id, -1)}
                            >
                              <Minus size={16} color="#666" />
                            </TouchableOpacity>
                            <Text style={styles.quantityText}>
                              {selectedProduct?.quantity || 1}
                            </Text>
                            <TouchableOpacity
                              style={styles.quantityButton}
                              onPress={() => updateProductQuantity(category.id, product.id, 1)}
                            >
                              <Plus size={16} color="#666" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          {!isAllCategoriesComplete() && (
            <View style={styles.warning}>
              <AlertCircle size={20} color="#f59e0b" />
              <Text style={styles.warningText}>
                Please complete all category selections
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.addButton,
              (!isAllCategoriesComplete() || saving) && styles.addButtonDisabled
            ]}
            onPress={handleAddToCart}
            disabled={!isAllCategoriesComplete() || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.addButtonText}>Add to Cart</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    marginLeft: 8,
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
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
    color: '#000',
  },
  selectionStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 'auto',
  },
  selectionComplete: {
    backgroundColor: '#dcfce7',
  },
  selectionIncomplete: {
    backgroundColor: '#fef3c7',
  },
  selectionStatusText: {
    fontSize: 12,
    fontFamily: 'Roboto-Medium',
  },
  selectionCompleteText: {
    color: '#16a34a',
  },
  selectionIncompleteText: {
    color: '#d97706',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  selectableProductContainer: {
    width: '48%',
  },
  selectableProduct: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectedProduct: {
    borderWidth: 2,
    borderColor: '#000',
  },
  selectableProductImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#f5f5f5',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectableProductInfo: {
    padding: 12,
  },
  selectableProductName: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    marginBottom: 4,
  },
  selectableProductPrice: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#000',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginTop: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    marginHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
    backgroundColor: '#fff',
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#d97706',
  },
  addButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
  },
});