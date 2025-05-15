import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Bell,
  MapPin,
  CreditCard,
  Heart,
  ClipboardList,
  Settings,
  LogOut,
} from 'lucide-react-native';
import { ProfileEdit } from '@/components/ProfileEdit';
import { AddressList } from '@/components/AddressList';
import { AddressForm } from '@/components/AddressForm';
import { OrderHistory } from '@/components/OrderHistory';
import { FavoriteOrdersList } from '@/components/FavoriteOrdersList';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showAddressList, setShowAddressList] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showFavoriteOrders, setShowFavoriteOrders] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const MenuItem = ({ icon: Icon, label, onPress }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemContent}>
        <Icon size={24} color="#000" strokeWidth={1.5} />
        <Text style={styles.menuItemLabel}>{label}</Text>
      </View>
      <ChevronRight size={20} color="#666" />
    </TouchableOpacity>
  );

  const Section = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {profile?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>{profile?.name || 'Utilisateur'}</Text>
          <Text style={styles.email}>{profile?.email || ''}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <Section title="Mon compte">
          <MenuItem
            icon={User}
            label="Modifier mes informations"
            onPress={() => setShowProfileEdit(true)}
          />
          <MenuItem
            icon={Bell}
            label="Notifications"
            onPress={() => {}}
          />
          <MenuItem
            icon={MapPin}
            label="Mes adresses"
            onPress={() => setShowAddressList(true)}
          />
          <MenuItem
            icon={CreditCard}
            label="Moyens de paiement"
            onPress={() => {}}
          />
        </Section>

        <Section title="Mes commandes">
          <MenuItem
            icon={Heart}
            label="Mes commandes favorites"
            onPress={() => setShowFavoriteOrders(true)}
          />
          <MenuItem
            icon={ClipboardList}
            label="Historique des commandes"
            onPress={() => setShowOrderHistory(true)}
          />
        </Section>

        <Section title="Paramètres">
          <MenuItem
            icon={Settings}
            label="Préférences"
            onPress={() => {}}
          />
        </Section>

        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <LogOut size={24} color="#D80000" />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showProfileEdit}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProfileEdit(false)}
      >
        <ProfileEdit onClose={() => {
          setShowProfileEdit(false);
          loadProfile();
        }} />
      </Modal>

      <Modal
        visible={showAddressForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddressForm(false)}
      >
        <AddressForm onClose={() => {
          setShowAddressForm(false);
          setShowAddressList(true);
        }} />
      </Modal>

      <Modal
        visible={showAddressList}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddressList(false)}
      >
        <AddressList
          onClose={() => setShowAddressList(false)}
          onAddNew={() => {
            setShowAddressList(false);
            setShowAddressForm(true);
          }}
        />
      </Modal>

      <Modal
        visible={showOrderHistory}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOrderHistory(false)}
      >
        <OrderHistory onClose={() => setShowOrderHistory(false)} />
      </Modal>

      <Modal
        visible={showFavoriteOrders}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFavoriteOrders(false)}
      >
        <FavoriteOrdersList onClose={() => setShowFavoriteOrders(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#221DB6',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontFamily: 'Roboto-Bold',
    color: '#221DB6',
  },
  name: {
    fontSize: 24,
    fontFamily: 'Roboto-Bold',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#221DB6',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemLabel: {
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#000',
  },
  logoutContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D80000',
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#D80000',
  },
});