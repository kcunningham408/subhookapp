import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { login, register, requestResetCode, resetPassword } from '../services/api';

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset' | 'resetVerify'
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Logo pulse animation
  const logoScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, { toValue: 1.06, duration: 2000, useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Button press animation
  const btnScale = useRef(new Animated.Value(1)).current;
  const animateBtn = () => {
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
  };

  // Spinner animation
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (loading) {
      Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 800, useNativeDriver: true })).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [loading]);
  const spinRotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

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
    animateBtn();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  const handleRequestCode = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      return Alert.alert('Invalid Number', 'Please enter your phone number first.');
    }
    setLoading(true);
    animateBtn();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await requestResetCode(phone);
      Alert.alert('Code Sent', 'Check your notifications for the verification code.');
      setMode('resetVerify');
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not send code.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      return Alert.alert('Invalid Number', 'Please enter your phone number first.');
    }
    if (!code || code.length !== 6) {
      return Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
    }
    if (!password || password.length < 6) {
      return Alert.alert('Invalid Password', 'New password must be at least 6 characters.');
    }
    setLoading(true);
    animateBtn();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await resetPassword(phone, password, code);
      Alert.alert('Success', 'Password updated! You can now sign in.');
      setMode('login');
      setPassword('');
      setCode('');
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
      <LinearGradient colors={['#111827', '#0a0e1a']} style={styles.gradient}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Animated.View style={[styles.logoIcon, { transform: [{ scale: logoScale }] }]}>
            <Ionicons name="baseball" size={36} color="#3b82f6" />
          </Animated.View>
          <Text style={styles.logo}>SubHook</Text>
          <Text style={styles.tagline}>Softball's free agency platform</Text>
        </View>

        {/* Form */}
        {mode === 'register' && (
          <>
            <Text style={styles.label}>Your Name</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color="#475569" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="John Smith"
                placeholderTextColor="#475569"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </>
        )}

        <Text style={styles.label}>{mode === 'reset' ? 'Phone Number' : mode === 'resetVerify' ? '' : 'Phone Number'}</Text>
        {mode !== 'resetVerify' && (
          <>
            <View style={styles.inputWrap}>
              <Ionicons name="call-outline" size={18} color="#475569" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="(555) 000-0000"
                placeholderTextColor="#475569"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </>
        )}

        {mode !== 'reset' && mode !== 'resetVerify' && (
          <>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#475569" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••"
                placeholderTextColor="#475569"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#475569" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {mode === 'reset' ? (
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity onPress={handleRequestCode} disabled={loading} activeOpacity={0.8}>
            <LinearGradient colors={['#3b82f6', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
              {loading
                ? <Animated.View style={{ transform: [{ rotate: spinRotate }] }}><Ionicons name="reload" size={20} color="#fff" /></Animated.View>
                : <Text style={styles.btnText}>Send Verification Code</Text>}
            </LinearGradient>
          </TouchableOpacity>
          </Animated.View>
        ) : mode === 'resetVerify' ? (
          <>
            <Text style={styles.label}>Verification Code</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="keypad-outline" size={18} color="#475569" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="6-digit code"
                placeholderTextColor="#475569"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#475569" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••"
                placeholderTextColor="#475569"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity onPress={handleReset} disabled={loading} activeOpacity={0.8}>
              <LinearGradient colors={['#3b82f6', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
                {loading
                  ? <Animated.View style={{ transform: [{ rotate: spinRotate }] }}><Ionicons name="reload" size={20} color="#fff" /></Animated.View>
                  : <Text style={styles.btnText}>Reset Password</Text>}
              </LinearGradient>
            </TouchableOpacity>
            </Animated.View>
          </>
        ) : (
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
            <LinearGradient colors={['#3b82f6', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
              {loading
                ? <Animated.View style={{ transform: [{ rotate: spinRotate }] }}><Ionicons name="reload" size={20} color="#fff" /></Animated.View>
                : <Text style={styles.btnText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>}
            </LinearGradient>
          </TouchableOpacity>
          </Animated.View>
        )}

        {mode === 'login' && (
          <TouchableOpacity onPress={() => { setMode('reset'); setPassword(''); }}>
            <Text style={styles.link}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setMode(mode === 'register' ? 'login' : mode === 'reset' || mode === 'resetVerify' ? 'login' : 'register'); setPassword(''); setName(''); setCode(''); }}>
          <Text style={styles.back}>
            {mode === 'login' ? "Don't have an account? Sign Up" : 'Back to Sign In'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logoWrap: { alignItems: 'center', marginBottom: 48 },
  logoIcon: {
    width: 72, height: 72, borderRadius: 22, backgroundColor: '#3b82f615',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12,
  },
  logo: { fontSize: 36, fontWeight: '800', color: '#fff' },
  tagline: { fontSize: 14, color: '#64748b', marginTop: 6 },
  label: {
    fontSize: 13, color: '#94a3b8', marginBottom: 8, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111827', borderRadius: 12,
    borderWidth: 1, borderColor: '#1e293b', marginBottom: 16,
  },
  inputIcon: { marginLeft: 14 },
  input: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 14,
    fontSize: 17, color: '#fff',
  },
  eyeBtn: { padding: 14 },
  btn: {
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  back: { color: '#64748b', textAlign: 'center', marginTop: 20, fontSize: 14 },
  link: { color: '#3b82f6', textAlign: 'center', marginTop: 16, fontSize: 14 },
});
