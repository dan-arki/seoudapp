import { Tabs } from 'expo-router';
import { Home, Search, ShoppingBag, User } from 'lucide-react-native';
import { Platform, StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#221DB6',
        tabBarInactiveTintColor: '#2E2E2E',
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size, focused }) => (
            <Home
              size={24}
              color={color}
              strokeWidth={focused ? 2.5 : 1.5}
            />
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Produits',
          tabBarIcon: ({ color, size, focused }) => (
            <Search
              size={24}
              color={color}
              strokeWidth={focused ? 2.5 : 1.5}
            />
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Panier',
          tabBarIcon: ({ color, size, focused }) => (
            <ShoppingBag
              size={24}
              color={color}
              strokeWidth={focused ? 2.5 : 1.5}
            />
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size, focused }) => (
            <User
              size={24}
              color={color}
              strokeWidth={focused ? 2.5 : 1.5}
            />
          ),
          tabBarLabel: () => null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 20,
    right: 20,
    height: 64,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderTopWidth: 0,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    paddingHorizontal: 8,
  },
  tabBarIcon: {
    marginTop: 8,
  },
  tabBarLabel: {
    display: 'none',
  },
});