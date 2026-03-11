import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
} from 'react-native';
import { login, register, resetPassword } from '../services/api';

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset'
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      return Alert.alert('Invalid Number', 'Please enter a valid phone number.');
    }
    if (!password || password.length < 6) {
      return Alert.alert('Invalid Password', 'Password must be at least 6 characters.');
    }
    if (mode === 'register' && !name.trim()) {
      return Alert.alert('Name Required', 'Please enter your name.');
    }

    setLoading(true);
    try {
      let user;
      if (mode === 'register') {
        user = await register(phone, password, name.trim());
      } else {
        user = await login(phone, password);
      }
      onLogin(user);
    } catch (e) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      return Alert.alert('Invalid Number', 'Please enter your phone number first.');
    }
    if (!password || password.length < 6) {
      return Alert.alert('Invalid Password', 'New password must be at least 6 characters.');
    }
    setLoading(true);
    try {
      await resetPassword(phone, password);
      Alert.alert('Success', 'Password updated! You can now sign in.');
      setMode('login');
      setPassword('');
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.logo}>⚾ SubHook</Text>
      <Text style={styles.tagline}>Softball's free agency platform</Text>

      {mode === 'register' && (
        <>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            placeholder="John Smith"
            placeholderTextColor="#475569"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </>
      )}

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        placeholder="(555) 000-0000"
        placeholderTextColor="#475569"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>{mode === 'reset' ? 'New Password' : 'Password'}</Text>
      <TextInput
        style={styles.input}
        placeholder="••••••"
        placeholderTextColor="#475569"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {mode === 'reset' ? (
        <TouchableOpacity style={styles.btn} onPress={handleReset} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Reset Password</Text>}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>}
        </TouchableOpacity>
      )}

      {mode === 'login' && (
        <TouchableOpacity onPress={() => { setMode('reset'); setPassword(''); }}>
          <Text style={styles.link}>Forgot Password?</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => { setMode(mode === 'register' ? 'login' : mode === 'reset' ? 'login' : 'register'); setPassword(''); setName(''); }}>
        <Text style={styles.back}>
          {mode === 'login' ? "Don't have an account? Sign Up" : 'Back to Sign In'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1a2e',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 48,
  },
  label: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: '#fff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  btn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  back: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  link: {
    color: '#2563eb',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
});
