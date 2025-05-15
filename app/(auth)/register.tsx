import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { UserPlus } from 'lucide-react-native';

// More permissive email regex that matches Supabase's requirements
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    
    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    
    // Additional validation for common email patterns
    if (trimmedEmail.includes('..') || trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    
    const [localPart, domain] = trimmedEmail.split('@');
    if (localPart.length > 64 || domain.length > 255) {
      setEmailError('Email address is too long');
      return false;
    }

    setEmailError(null);
    return true;
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError(null);
      setEmailError(null);
      setPasswordError(null);

      // Validate inputs
      const trimmedEmail = email.trim().toLowerCase();
      const isEmailValid = validateEmail(trimmedEmail);
      const isPasswordValid = validatePassword(password);

      if (!isEmailValid || !isPasswordValid) {
        return;
      }

      if (!name.trim()) {
        setError('Name is required');
        return;
      }

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            name: name.trim(),
            phone: phone.trim() || null,
          },
        },
      });

      if (authError) {
        console.error('Auth error:', authError);
        if (authError.message.includes('email')) {
          setEmailError(authError.message);
        } else if (authError.message.includes('password')) {
          setPasswordError(authError.message);
        } else {
          setError(authError.message);
        }
        return;
      }

      if (!authData.user) {
        setError('Registration failed. Please try again.');
        return;
      }

      // Create user profile with a retry mechanism
      let retryCount = 0;
      const maxRetries = 3;
      let profileCreated = false;

      while (retryCount < maxRetries && !profileCreated) {
        try {
          const { error: profileError } = await supabase
            .from('users')
            .insert([
              {
                id: authData.user.id,
                name: name.trim(),
                email: trimmedEmail,
                phone: phone.trim() || null,
              },
            ])
            .select()
            .single();

          if (!profileError) {
            profileCreated = true;
          } else {
            console.error(`Profile creation attempt ${retryCount + 1} failed:`, profileError);
            retryCount++;
            if (retryCount < maxRetries) {
              // Wait for a short time before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } catch (err) {
          console.error(`Profile creation attempt ${retryCount + 1} error:`, err);
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (!profileCreated) {
        // If profile creation failed after all retries
        setError('Failed to create user profile. Please try again.');
        // Clean up auth if profile creation fails
        await supabase.auth.signOut();
        return;
      }

      // Success - redirect to home
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Registration error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?q=80&w=1000' }}
        style={styles.backgroundImage}
      />
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <UserPlus size={48} color="#fff" />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join us and start shopping</Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={[styles.input, !name.trim() && error && styles.inputError]}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, emailError && styles.inputError]}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (text) validateEmail(text);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              {emailError && (
                <Text style={styles.fieldError}>{emailError}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, passwordError && styles.inputError]}
                placeholder="Choose a password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (text) validatePassword(text);
                }}
                secureTextEntry
                autoComplete="new-password"
              />
              {passwordError && (
                <Text style={styles.fieldError}>{passwordError}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                placeholderTextColor="#999"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/login" style={styles.link}>
                Sign In
              </Link>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginVertical: 40,
  },
  title: {
    fontFamily: 'Roboto-Bold',
    fontSize: 32,
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Roboto-Regular',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  form: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Roboto-Medium',
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#333',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  fieldError: {
    color: '#dc2626',
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontFamily: 'Roboto-Regular',
    color: '#666',
  },
  link: {
    fontFamily: 'Roboto-Medium',
    color: '#000',
  },
  errorContainer: {
    backgroundColor: 'rgba(254, 226, 226, 0.9)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#dc2626',
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
  },
});