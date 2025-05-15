import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function Index() {
  const [session, setSession] = useState<boolean | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (mounted) {
          setSession(!!session);
        }
      } catch (error) {
        console.error('Session check error:', error);
        if (mounted) {
          setError(error instanceof Error ? error : new Error('Session check failed'));
          setSession(false);
        }
      }
    }

    // Check initial session
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(!!session);
      }
    });

    // Cleanup
    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Show loading indicator while checking auth state
  if (session === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#221DB6" />
      </View>
    );
  }

  // Redirect based on auth state
  return session ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});