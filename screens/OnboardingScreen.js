import { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { saveProfile, updateUser } from '../services/api';

const POSITIONS = ['Pitcher', 'Catcher', '1st Base', '2nd Base', '3rd Base', 'Shortstop', 'Left Field', 'Center Field', 'Right Field'];
const SKILL_LEVELS = ['Recreational', 'Intermediate', 'Competitive', 'Elite'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function OnboardingScreen({ navigation, route }) {
  const { user, setUser } = route.params;

  const [positions, setPositions] = useState([]);
  const [skillLevel, setSkillLevel] = useState('');
  const [availability, setAvailability] = useState([]);
  const [travelRadius, setTravelRadius] = useState('25');
  const [saving, setSaving] = useState(false);

  const toggleItem = (item, list, setter) => {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const save = async () => {
    if (positions.length === 0) return Alert.alert('Pick at least one position');
    if (!skillLevel) return Alert.alert('Pick your skill level');
    setSaving(true);
    try {
      await saveProfile({
        positions, skillLevel, availability, travelRadius: parseInt(travelRadius) || 25,
        freeAgentMode: true,
      });
      await updateUser({ onboardingComplete: true });
      setUser({ ...user, onboardingComplete: true });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Set Up Your Profile</Text>

        <Text style={s.section}>Positions You Play</Text>
        <View style={s.chips}>
          {POSITIONS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[s.chip, positions.includes(p) && s.chipActive]}
              onPress={() => toggleItem(p, positions, setPositions)}
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

        <Text style={s.section}>Availability</Text>
        <View style={s.chips}>
          {DAYS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[s.chip, availability.includes(d) && s.chipActive]}
              onPress={() => toggleItem(d, availability, setAvailability)}
            >
              <Text style={[s.chipText, availability.includes(d) && s.chipTextActive]}>{d}</Text>
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

        <TouchableOpacity style={s.btn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Save & Continue</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1a2e' },
  scroll: { padding: 28, paddingTop: 60 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 28 },
  section: { fontSize: 14, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#334155',
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 17, color: '#fff', borderWidth: 1, borderColor: '#334155',
  },
  btn: {
    backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 32, marginBottom: 40,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
