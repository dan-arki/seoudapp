import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Bell, Users, ChevronRight, Heart, Package } from 'lucide-react-native';

const CATEGORY_EMOJIS: Record<string, string> = {
  'Viandes': '🍗',
  'Poissons': '🐟',
  'Snacks': '🥜',
  'Légumes': '🥬',
  'Boissons': '🥤',
  'Alcools': '🍷',
};

export default function HomeScreen() {
  const [userName, setUserName] = useState<string>('');
  const [packs, setPacks] = useState<any[]>([]);
  const [randomProducts, setRandomProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserName(profile.name.split(' ')[0]);
        }
      }

      // Load categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(6); // Limit to 6 categories

      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Load active packs
      const { data: packsData } = await supabase
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
        .order('created_at', { ascending: false })
        .limit(5);

      if (packsData) {
        setPacks(packsData);
      }

      // Load random active products
      const { data: productsData } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          stock,
          category_id,
          categories (
            name
          )
        `)
        .eq('is_active', true)
        .limit(5);

      if (productsData) {
        const shuffledProducts = [...productsData].sort(() => Math.random() - 0.5);
        setRandomProducts(shuffledProducts);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#221DB6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Bienvenue,</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Bell size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Join Order Button */}
        <TouchableOpacity
          style={styles.joinOrderButton}
          onPress={() => router.push('/shared-order/join')}
        >
          <Users size={24} color="#221DB6" />
          <Text style={styles.joinOrderText}>Rejoindre une commande</Text>
        </TouchableOpacity>

        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nos catégories</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => router.push('/categories')}
            >
              <Text style={styles.seeAllText}>voir tout</Text>
              <ChevronRight size={20} color="#221DB6" />
            </TouchableOpacity>
          </View>

          <View style={styles.categoriesGrid}>
            {categories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => router.push(`/catalog?category=${category.id}`)}
              >
                <Text style={styles.categoryEmoji}>
                  {CATEGORY_EMOJIS[category.name] || '📦'}
                </Text>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Seouda Packs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nos Packs Seouda</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => router.push('/catalog?category=packs')}
            >
              <Text style={styles.seeAllText}>voir tout</Text>
              <ChevronRight size={20} color="#221DB6" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.packsContainer}
          >
            {packs.map(pack => (
              <TouchableOpacity
                key={pack.id}
                style={styles.packCard}
                onPress={() => router.push(`/pack/${pack.id}`)}
              >
                <Image
                  source={{
                    uri: pack.image_url || 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=1000'
                  }}
                  style={styles.packImage}
                />
                <View style={styles.packBadge}>
                  <Package size={16} color="#fff" />
                  <Text style={styles.packBadgeText}>
                    {pack.total_products_count} produits
                  </Text>
                </View>
                <View style={styles.packInfo}>
                  <Text style={styles.packName}>{pack.name}</Text>
                  <Text style={styles.packPrice}>${pack.price.toFixed(2)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Random Products Section */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Produits populaires</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => router.push('/catalog')}
            >
              <Text style={styles.seeAllText}>voir tout</Text>
              <ChevronRight size={20} color="#221DB6" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productsContainer}
          >
            {randomProducts.map(product => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => router.push(`/product/${product.id}`)}
              >
                <Image
                  source={{
                    uri: product.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000'
                  }}
                  style={styles.productImage}
                />
                <View style={styles.productInfo}>
                  <Text style={styles.productCategory}>
                    {product.categories?.name}
                  </Text>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#221DB6',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userName: {
    fontSize: 24,
    fontFamily: 'Roboto-Bold',
    color: '#fff',
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  joinOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#221DB6',
    backgroundColor: 'transparent',
  },
  joinOrderText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#221DB6',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  lastSection: {
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#000',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#221DB6',
    marginRight: 4,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryCard: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#F5F7F9',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#000',
    textAlign: 'center',
  },
  packsContainer: {
    paddingRight: 20,
  },
  packCard: {
    width: 280,
    marginRight: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
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
  packImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#f5f5f5',
  },
  packBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  packBadgeText: {
    marginLeft: 6,
    fontSize: 12,
    fontFamily: 'Roboto-Medium',
    color: '#fff',
  },
  packInfo: {
    padding: 16,
  },
  packName: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#221DB6',
    marginBottom: 4,
  },
  packPrice: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#000',
  },
  productsContainer: {
    paddingRight: 20,
  },
  productCard: {
    width: 200,
    marginRight: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
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
  productImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#f5f5f5',
  },
  productInfo: {
    padding: 12,
  },
  productCategory: {
    fontSize: 12,
    fontFamily: 'Roboto-Medium',
    color: '#666',
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#000',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#221DB6',
  },
});