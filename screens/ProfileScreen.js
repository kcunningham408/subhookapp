import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text,
    TextInput, TouchableOpacity, View,
} from 'react-native';
import { deleteAccount, getStoredUser, logout, saveProfile, setActiveNow } from '../services/api';

const POSITIONS = ['Pitcher', 'Catcher', '1st Base', '2nd Base', '3rd Base', 'Shortstop', 'Left Field', 'Center Field', 'Right Field'];
const SKILL_LEVELS = ['Recreational', 'Intermediate', 'Competitive', 'Elite'];
const SKILL_COLORS = { Recreational: '#64748b', Intermediate: '#3b82f6', Competitive: '#8b5cf6', Elite: '#f59e0b' };

export default function ProfileScreen({ navigation, route }) {
  const { user, setUser } = route.params;
  const [profile, setProfile] = useState(null);
  const [positions, setPositions] = useState([]);
  const [skillLevel, setSkillLevel] = useState('');
  const [travelRadius, setTravelRadius] = useState('25');
  const [homeZip, setHomeZip] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamColor, setTeamColor] = useState('');
  const [isActive, setIsActive] = useState(user?.activeNow || false);
  const [freeAgent, setFreeAgent] = useState(true);
  const [photoBase64, setPhotoBase64] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      (async () => {
        try {
          const res = await getStoredUser();
          if (res?.profile) {
            const p = res.profile;
            setProfile(p);
            setPositions(p.positions || []);
            setSkillLevel(p.skillLevel || '');
            setTravelRadius(String(p.travelRadius || 25));
            setHomeZip(p.homeZip || '');
            setTeamName(p.teamName || '');
            setTeamColor(p.teamColor || '');
            setFreeAgent(p.freeAgentMode !== false);
            if (p.photoBase64) setPhotoBase64(p.photoBase64);
          }
        } catch (e) {
          console.warn('Profile load error', e);
        } finally {
          setLoading(false);
        }
      })();
    }, [user])
  );

  if (!user) return null;

  const togglePos = (p) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPositions(positions.includes(p) ? positions.filter((x) => x !== p) : [...positions, p]);
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    try {
      const ref = ImageManipulator.manipulate(result.assets[0].uri);
      ref.resize({ width: 200, height: 200 });
      const manipulated = await ref.renderAsync();
      const finalImage = await manipulated.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
      setPhotoBase64(finalImage.base64);
    } catch (e) {
      console.warn('Image manipulate error:', e);
      Alert.alert('Error', 'Could not process image.');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveProfile({
        positions, skillLevel, travelRadius: parseInt(travelRadius) || 25,
        freeAgentMode: freeAgent, homeZip: homeZip.trim(),
        teamName: teamName.trim(), teamColor: teamColor.trim(),
        ...(photoBase64 ? { photoBase64 } : {}),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved!');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        try {
          await logout();
        } finally {
          setUser(null);
        }
      }},
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteAccount();
            await logout();
          } catch (e) {
            Alert.alert('Error', e.message);
            return;
          }
          setUser(null);
        }},
      ]
    );
  };

  const toggleActive = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = !isActive;
    setIsActive(next);
    try { await setActiveNow(next); } catch (e) { setIsActive(!next); }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll}>
      {/* Header Card */}
      <LinearGradient colors={['#1e293b', '#111827']} style={s.headerCard}>
        <TouchableOpacity onPress={pickPhoto} activeOpacity={0.7}>
          {photoBase64 ? (
            <Image source={{ uri: `data:image/jpeg;base64,${photoBase64}` }} style={s.avatarPhoto} />
          ) : (
            <View style={s.avatarLarge}>
              <Text style={s.avatarLargeText}>{(user.name || '?').charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={s.cameraIcon}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={s.name}>{user.name}</Text>
        <Text style={s.phone}>{user.phone}</Text>
        <View style={s.rolePill}>
          <Ionicons name={user.role === 'player' ? 'baseball' : user.role === 'manager' ? 'clipboard' : 'swap-horizontal'} size={14} color="#3b82f6" />
          <Text style={s.roleText}>{user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}</Text>
        </View>
      </LinearGradient>

      {/* Active Now Toggle */}
      <View style={s.card}>
        <View style={s.toggleRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[s.statusDot, isActive && s.statusDotActive]} />
              <Text style={s.toggleLabel}>Active Right Now</Text>
            </View>
            <Text style={s.toggleSub}>Auto-expires after 30 min</Text>
          </View>
          <TouchableOpacity
            style={[s.toggleSwitch, isActive && s.toggleSwitchOn]}
            onPress={toggleActive}
            activeOpacity={0.8}
          >
            <View style={[s.toggleKnob, isActive && s.toggleKnobOn]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Free Agent Toggle */}
      <View style={s.card}>
        <View style={s.toggleRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="flash" size={18} color={freeAgent ? '#10b981' : '#475569'} />
              <Text style={s.toggleLabel}>Free Agent Mode</Text>
            </View>
            <Text style={s.toggleSub}>Get notified about available games</Text>
          </View>
          <TouchableOpacity
            style={[s.toggleSwitch, freeAgent && s.toggleSwitchOn]}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const next = !freeAgent;
              setFreeAgent(next);
              try { await saveProfile({ freeAgentMode: next }); } catch (e) { setFreeAgent(!next); }
            }}
            activeOpacity={0.8}
          >
            <View style={[s.toggleKnob, freeAgent && s.toggleKnobOn]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Positions */}
      <Text style={s.section}>
        <Ionicons name="people" size={13} color="#94a3b8" />  Positions
      </Text>
      <View style={s.chips}>
        {POSITIONS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[s.chip, positions.includes(p) && s.chipActive]}
            onPress={() => togglePos(p)}
          >
            {positions.includes(p) && <Ionicons name="checkmark" size={14} color="#fff" style={{ marginRight: 4 }} />}
            <Text style={[s.chipText, positions.includes(p) && s.chipTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Skill Level */}
      <Text style={s.section}>
        <Ionicons name="trophy" size={13} color="#94a3b8" />  Skill Level
      </Text>
      <View style={s.chips}>
        {SKILL_LEVELS.map((l) => {
          const active = skillLevel === l;
          const color = SKILL_COLORS[l];
          return (
            <TouchableOpacity
              key={l}
              style={[s.chip, active && { backgroundColor: color, borderColor: color }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSkillLevel(l); }}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{l}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Details */}
      <Text style={s.section}>
        <Ionicons name="car" size={13} color="#94a3b8" />  Travel Radius (miles)
      </Text>
      <TextInput
        style={s.input}
        value={travelRadius}
        onChangeText={setTravelRadius}
        keyboardType="number-pad"
        placeholder="25"
        placeholderTextColor="#475569"
      />

      <Text style={s.section}>
        <Ionicons name="location" size={13} color="#94a3b8" />  Home ZIP Code
      </Text>
      <TextInput
        style={s.input}
        value={homeZip}
        onChangeText={setHomeZip}
        keyboardType="number-pad"
        placeholder="e.g. 95014"
        placeholderTextColor="#475569"
        maxLength={5}
      />

      {(user.role === 'manager' || user.role === 'both') && (
        <>
          <Text style={s.section}>
            <Ionicons name="shield" size={13} color="#94a3b8" />  Team Name
          </Text>
          <TextInput
            style={s.input}
            value={teamName}
            onChangeText={setTeamName}
            placeholder="e.g. Bay Area Sluggers"
            placeholderTextColor="#475569"
          />
          <Text style={s.section}>
            <Ionicons name="color-palette" size={13} color="#94a3b8" />  Team Color
          </Text>
          <TextInput
            style={s.input}
            value={teamColor}
            onChangeText={setTeamColor}
            placeholder="e.g. Red, Blue, Green"
            placeholderTextColor="#475569"
          />
        </>
      )}

      {/* Save */}
      <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.8}>
        <LinearGradient colors={['#3b82f6', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtn}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={s.saveBtnText}>Save Profile</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text style={s.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Delete Account */}
      <TouchableOpacity style={s.deleteBtn} onPress={handleDeleteAccount}>
        <Ionicons name="trash-outline" size={16} color="#64748b" />
        <Text style={s.deleteText}>Delete Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  scroll: { paddingBottom: 40 },
  center: { flex: 1, backgroundColor: '#0a0e1a', justifyContent: 'center', alignItems: 'center' },
  headerCard: {
    paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20,
    alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#3b82f620',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    borderWidth: 3, borderColor: '#3b82f640',
  },
  avatarPhoto: {
    width: 80, height: 80, borderRadius: 40, marginBottom: 14,
    borderWidth: 3, borderColor: '#3b82f640',
  },
  cameraIcon: {
    position: 'absolute', bottom: 10, right: -4,
    backgroundColor: '#3b82f6', borderRadius: 12, width: 24, height: 24,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#111827',
  },
  avatarLargeText: { color: '#3b82f6', fontSize: 32, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff' },
  phone: { fontSize: 14, color: '#64748b', marginTop: 4 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#3b82f620', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10,
  },
  roleText: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: '#111827', borderRadius: 14, marginHorizontal: 16, padding: 18,
    marginBottom: 10, borderWidth: 1, borderColor: '#1e293b',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8,
    elevation: 4,
  },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { fontSize: 16, fontWeight: '700', color: '#fff' },
  toggleSub: { fontSize: 12, color: '#475569', marginTop: 3, marginLeft: 26 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#334155' },
  statusDotActive: { backgroundColor: '#10b981' },
  toggleSwitch: {
    width: 50, height: 28, borderRadius: 14, backgroundColor: '#1e293b',
    padding: 3, justifyContent: 'center',
  },
  toggleSwitchOn: { backgroundColor: '#10b981' },
  toggleKnob: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#475569',
  },
  toggleKnobOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  section: {
    fontSize: 13, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase',
    marginTop: 24, marginBottom: 10, letterSpacing: 0.5, paddingHorizontal: 20,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111827', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: '#1e293b',
  },
  chipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  input: {
    backgroundColor: '#111827', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#1e293b', marginHorizontal: 20,
  },
  saveBtn: {
    borderRadius: 14, paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 20, marginTop: 28,
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 20, paddingVertical: 14, marginBottom: 20,
  },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginBottom: 40, paddingVertical: 10,
  },
  deleteText: { color: '#64748b', fontSize: 13, fontWeight: '500' },
});
