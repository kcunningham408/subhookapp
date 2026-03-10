import { signInWithPhoneNumber } from 'firebase/auth';
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
import { auth } from '../services/firebase';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    const digits = phone.replace(/\D/g, '');
    const formatted = phone.trim().startsWith('+') ? phone.trim() : `+1${digits}`;
    if (digits.length < 10) {
      return Alert.alert('Invalid Number', 'Please enter a valid phone number.');
    }
    setLoading(true);
    try {
      const result = await signInWithPhoneNumber(auth, formatted);
      setConfirmation(result);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not send code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    if (!code || code.length !== 6) {
      return Alert.alert('Invalid Code', 'Please enter the 6-digit code.');
    }
    setLoading(true);
    try {
      await confirmation.confirm(code);
      // onAuthStateChanged in App.js handles navigation
    } catch (e) {
      Alert.alert('Wrong Code', 'That code did not match. Try again.');
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

      {!confirmation ? (
        <>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+1 (555) 000-0000"
            placeholderTextColor="#475569"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoFocus
          />
          <TouchableOpacity style={styles.btn} onPress={sendCode} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Send Code</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.label}>6-Digit Code</Text>
          <TextInput
            style={styles.input}
            placeholder="123456"
            placeholderTextColor="#475569"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
          <TouchableOpacity style={styles.btn} onPress={confirmCode} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Verify</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setConfirmation(null)}>
            <Text style={styles.back}>← Change number</Text>
          </TouchableOpacity>
        </>
      )}
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
});
