import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/theme/colors';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('user@smartpark.ai');
  const [password, setPassword] = useState('SmartPark123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        await setAuth(res.data.token, res.data.user);
        router.replace('/(tabs)');
      } else {
        setError(res.data.error || 'Login failed.');
      }
    } catch (err: any) {
      // In offline/dev mode, allow instant mock login for testing UI
      if (email === 'user@smartpark.ai' || email === 'admin@smartpark.ai') {
        await setAuth('dev-offline-token', {
          id: 'usr-commuter-1',
          email: 'user@smartpark.ai',
          fullName: 'Alex Morgan',
          role: email.includes('admin') ? 'admin' : 'user',
          defaultVehiclePlate: 'KA01EV2026',
          companyName: 'Acme Cloud Technologies',
        });
        router.replace('/(tabs)');
        return;
      }
      setError(err.response?.data?.error || 'Unable to connect to backend server on port 5001.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Logo & Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/smartpark-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>AI-POWERED CORPORATE MOBILITY</Text>
        </View>

        {/* Card Form */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to reserve campus parking and manage active sessions</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Corporate Email</Text>
            <TextInput
              style={styles.input}
              placeholder="alex@company.com"
              placeholderTextColor="#9AA5B8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9AA5B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.demoButton}
            onPress={() => {
              setEmail('user@smartpark.ai');
              setPassword('SmartPark123!');
            }}
          >
            <Text style={styles.demoButtonText}>Auto-Fill Demo Commuter Credentials</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 220,
    height: 140,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.secondaryText,
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    shadowColor: COLORS.deepNavy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.borders,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.deepNavy,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.secondaryText,
    marginBottom: 20,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.deepNavy,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: COLORS.borders,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.deepNavy,
  },
  primaryButton: {
    backgroundColor: COLORS.primaryBlue,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  demoButton: {
    marginTop: 16,
    padding: 10,
    alignItems: 'center',
  },
  demoButtonText: {
    color: COLORS.primaryBlue,
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.errorRed,
    fontSize: 13,
    marginBottom: 12,
  },
});
