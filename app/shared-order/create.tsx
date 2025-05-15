import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  ChevronLeft,
  Copy,
  Share2,
  Users,
  Clock,
  ShoppingBag,
} from 'lucide-react-native';

export default function CreateSharedOrderScreen() {
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/shared-order/join/${order.id}`;
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(shareUrl);
        Alert.alert('Success', 'Link copied to clipboard!');
      } else {
        await Share.share({
          message: `Join my shared order: ${shareUrl}`,
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share order');
    }
  };

  const handleViewCart = () => {
    router.push(`/shared-order/${order.id}`);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Create Shared Order',
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
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Share with Friends</Text>
            <Text style={styles.description}>
              Share this order with friends to shop together. Each person can add items
              and pay their share.
            </Text>

            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
            >
              <Share2 size={20} color="#fff" />
              <Text style={styles.shareButtonText}>Share Order</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => {/* Copy code */}}
            >
              <Copy size={20} color="#000" />
              <Text style={styles.copyButtonText}>Copy Invite Code</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Participants</Text>
            <View style={styles.participantsContainer}>
              {participants.length === 0 ? (
                <View style={styles.emptyState}>
                  <Users size={48} color="#666" />
                  <Text style={styles.emptyStateText}>
                    No participants yet
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    Share the invite code to get started
                  </Text>
                </View>
              ) : (
                participants.map((participant) => (
                  <View key={participant.id} style={styles.participantCard}>
                    <View style={styles.participantAvatar}>
                      <Text style={styles.participantInitial}>
                        {participant.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantName}>
                        {participant.name}
                      </Text>
                      <Text style={styles.participantRole}>
                        {participant.role === 'owner' ? 'Host' : 'Participant'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Details</Text>
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Clock size={20} color="#666" />
                <Text style={styles.detailText}>
                  Expires in 24 hours
                </Text>
              </View>
              <View style={styles.detailRow}>
                <ShoppingBag size={20} color="#666" />
                <Text style={styles.detailText}>
                  0 items added
                </Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.viewCartButton}
          onPress={handleViewCart}
        >
          <Text style={styles.viewCartButtonText}>View Shared Cart</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Roboto-Bold',
    color: '#000',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  shareButton: {
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    marginLeft: 8,
  },
  copyButton: {
    backgroundColor: '#f5f5f5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  copyButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    marginLeft: 8,
  },
  participantsContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: 'Roboto-Medium',
    color: '#333',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    textAlign: 'center',
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantInitial: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#000',
  },
  participantInfo: {
    marginLeft: 12,
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#000',
    marginBottom: 2,
  },
  participantRole: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#666',
  },
  detailsContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#666',
    marginLeft: 12,
  },
  viewCartButton: {
    backgroundColor: '#000',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewCartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
  },
});