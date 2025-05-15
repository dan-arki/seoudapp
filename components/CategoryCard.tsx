import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Link } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';

type CategoryCardProps = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
};

export function CategoryCard({ id, name, description, imageUrl }: CategoryCardProps) {
  const defaultImage = 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?q=80&w=1000';

  const CardContent = () => (
    <View style={[styles.container, Platform.OS === 'web' && styles.webHover]}>
      <Image 
        source={{ uri: imageUrl || defaultImage }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.textContainer}>
            <Text style={styles.name}>{name}</Text>
            {description && (
              <Text style={styles.description} numberOfLines={2}>
                {description}
              </Text>
            )}
          </View>
          <View style={styles.iconContainer}>
            <ArrowRight size={24} color="#fff" />
          </View>
        </View>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <Link href={`/catalog?category=${id}`} style={styles.link}>
        <CardContent />
      </Link>
    );
  }

  return (
    <Link href={`/catalog?category=${id}`} asChild>
      <TouchableOpacity>
        <CardContent />
      </TouchableOpacity>
    </Link>
  );
}

const styles = StyleSheet.create({
  link: {
    textDecorationLine: 'none',
    display: 'block',
    width: '100%',
  },
  container: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  webHover: {
    cursor: 'pointer',
    transition: 'transform 0.2s ease-in-out',
    ':hover': {
      transform: 'scale(1.02)',
    },
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontFamily: 'Roboto-Bold',
    fontSize: 20,
    color: '#fff',
    marginBottom: 4,
  },
  description: {
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});