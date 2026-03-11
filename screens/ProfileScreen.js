import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getStoredUser, logout, saveProfile, updateUser } from '../services/api';

const POSITIONS = ['Pitcher', 'Catcher', '1st Base', '2nd Base', '3rd Base', 'Shortstop', 'Left Field', 'Center Field', 'Right Field'];
const SKILL_LEVELS = ['Recreational', 'Intermediate', 'Competitive', 'Elite'];

export default function ProfileScreen({ navigation, route }) {
  const { user, setUser } = route.params;
  const [profile, setProfile] = useState(null);
  const [positions, setPositions] = useState([]);
  const [skillLevel, setSkillLevel] = useState('');
  const [travelRadius, setTravelRadius] = useState('25');
  const [freeAgent, setFreeAgent] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const res = await getStoredUser();
          if (res?.profile) {
            const p = res.profile;
            setProfile(p);
            setPositions(p.positions || []);
            setSkillLevel(p.skillLevel || '');
            setTravelRadius(String(p.travelRadius || 25));
            setFreeAgent(p.freeAgentMode !== false);
          }
        } catch (e) {
          console.warn('Profile load error', e);
        } finally {
          setLoading(false);
        }
      })();
    }, [])
  );

  const togglePos = (p) => {
    setPositions(positions.includes(p) ? positions.filter((x) => x !== p) : [...positions, p]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveProfile({
        positions, skillLevel, travelRadius: parseInt(travelRadius) || 25,
        freeAgentMode: freeAgent,
      });
      Alert.alert('Saved!');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#2563eb" size="large" /></View>;
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll}>
      <Text style={s.title}>👤 Profile</Text>
      <Text style={s.name}>{user.name}</Text>
      <Text style={s.phone}>{user.phone}</Text>
      <Text style={s.role}>Role: {user.role}</Text>

      <View style={s.toggleRow}>
        <Text style={s.section}>Free Agent Mode</Text>
        <TouchableOpacity
          style={[s.toggle, freeAgent && s.toggleOn]}
          onPress={() => setFreeAgent(!freeAgent)}
        >
          <Text style={s.toggleText}>{freeAgent ? 'ON' : 'OFF'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.section}>Positions</Text>
      <View style={s.chips}>
        {POSITIONS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[s.chip, positions.includes(p) && s.chipActive]}
            onPress={() => togglePos(p)}
          >
            <Text style={[s.chipText, positions.includes(p) && s.chipTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.section}>Skill Level</Text>
      <View style={s.chips}>
        {SKILL_LEVELS.map((l) => (
          <TouchableOpacity
            key={l}
            style={[s.chip, skillLevel === l && s.chipActive]}
            onPress={() => setSkillLevel(l)}
          >
            <Text style={[s.chipText, skillLevel === l && s.chipTextActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.section}>Travel Radius (miles)</Text>
      <TextInput
        style={s.input}
        value={travelRadius}
        onChangeText={setTravelRadius}
        keyboardType="number-pad"
        placeholder="25"
        placeholderTextColor="#475569"
      />

      <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Profile</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Text style={s.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1a2e' },
  scroll: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: '#0f1a2e', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 16 },
  name: { fontSize: 20, fontWeight: '700', color: '#fff' },
  phone: { fontSize: 14, color: '#64748b', marginTop: 4 },
  role: { fontSize: 14, color: '#2563eb', fontWeight: '600', marginTop: 4, marginBottom: 20 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  toggle: { backgroundColor: '#334155', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6 },
  toggleOn: { backgroundColor: '#22c55e' },
  toggleText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  section: { fontSize: 14, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginTop: 20, marginBottom: 10, letterSpacing: 0.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#94a3b8', fontSize: 14 },
  chipTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 17, color: '#fff', borderWidth: 1, borderColor: '#334155',
  },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 28 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  logoutBtn: { marginTop: 20, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
