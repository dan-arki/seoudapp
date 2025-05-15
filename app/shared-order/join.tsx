import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Users, Copy } from 'lucide-react-native';

export default function JoinSharedOrderScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!code.trim()) {
        setError('Veuillez entrer un code d\'invitation');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      // Check if order exists and is active
      const { data: order, error: orderError } = await supabase
        .from('shared_orders')
        .select('*')
        .eq('id', code)
        .single();

      if (orderError) {
        if (orderError.code === 'PGRST116') {
          setError('Code d\'invitation invalide');
        } else {
          throw orderError;
        }
        return;
      }

      if (!order) {
        setError('Code d\'invitation invalide');
        return;
      }

      if (order.status !== 'active') {
        setError('Cette commande n\'est plus active');
        return;
      }

      if (new Date(order.expires_at) < new Date()) {
        setError('Cette commande a expiré');
        return;
      }

      // Check if user is already a participant
      const { data: participants, error: participantsError } = await supabase
        .from('shared_order_participants')
        .select('id')
        .eq('shared_order_id', order.id)
        .eq('user_id', user.id);

      if (participantsError) throw participantsError;

      if (participants && participants.length > 0) {
        // User is already a participant, just navigate to the order
        router.push(`/shared-order/${order.id}`);
        return;
      }

      // Add user as participant
      const { error: participantError } = await supabase
        .from('shared_order_participants')
        .insert({
          shared_order_id: order.id,
          user_id: user.id,
          role: 'participant'
        });

      if (participantError) throw participantError;

      // Navigate to shared order
      router.push(`/shared-order/${order.id}`);
    } catch (error) {
      console.error('Error joining order:', error);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (code) {
      Alert.alert('Succès', 'Code copié dans le presse-papier');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Commande partagée',
          headerShown: true,
          headerTitleStyle: styles.headerTitle,
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
        <View style={styles.content}>
          <View style={styles.header}>
            <Users size={48} color="#221DB6" />
            <Text style={styles.title}>Rejoindre une commande</Text>
            <Text style={styles.subtitle}>
              Insérez le code que vous avez reçu ci-dessous
            </Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Lien partagé</Text>
            <View style={styles.codeInputContainer}>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={(text) => {
                  setCode(text);
                  setError(null);
                }}
                placeholder="Entrez le code d'invitation"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
              />
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyCode}
              >
                <Copy size={20} color="#221DB6" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.joinButton, loading && styles.joinButtonDisabled]}
            onPress={handleJoin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Users size={20} color="#fff" />
                <Text style={styles.joinButtonText}>
                  Joindre la commande
                </Text>
              </>
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
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Medium',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Roboto-Bold',
    color: '#000',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#666',
    marginBottom: 8,
  },
  codeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#000',
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#221DB6',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  joinButtonDisabled: {
    opacity: 0.7,
  },
  joinButtonText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#fff',
  },
});