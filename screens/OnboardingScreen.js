import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
    ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { saveProfile, updateUser } from '../services/api';

const POSITIONS = ['Pitcher', 'Catcher', '1st Base', '2nd Base', '3rd Base', 'Shortstop', 'Left Field', 'Center Field', 'Right Field'];
const SKILL_LEVELS = ['Recreational', 'Intermediate', 'Competitive', 'Elite'];
const SKILL_COLORS = { Recreational: '#64748b', Intermediate: '#3b82f6', Competitive: '#8b5cf6', Elite: '#f59e0b' };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function OnboardingScreen({ navigation, route }) {
  const { user, setUser } = route.params;

  const [positions, setPositions] = useState([]);
  const [skillLevel, setSkillLevel] = useState('');
  const [availability, setAvailability] = useState([]);
  const [travelRadius, setTravelRadius] = useState('');
  const [homeZip, setHomeZip] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleItem = (item, list, setter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const save = async () => {
    if (positions.length === 0) return Alert.alert('Pick at least one position');
    if (!skillLevel) return Alert.alert('Pick your skill level');
    setSaving(true);
    try {
      const profileData = {
        positions, skillLevel, freeAgentMode: true,
      };
      if (availability.length > 0) profileData.availability = availability;
      if (travelRadius) profileData.travelRadius = parseInt(travelRadius) || 25;
      if (homeZip.trim()) profileData.homeZip = homeZip.trim();
      await saveProfile(profileData);
      await updateUser({ onboardingComplete: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // setUser triggers navigation away (unmounts this screen),
      // so it must be the last thing called — no state updates after.
      setUser({ ...user, onboardingComplete: true });
    } catch (e) {
      setSaving(false);
      Alert.alert('Error', e.message);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['#1e293b', '#0a0e1a']} style={s.header}>
          <View style={s.headerIcon}>
            <Ionicons name="person-add" size={28} color="#3b82f6" />
          </View>
          <Text style={s.title}>Set Up Your Profile</Text>
          <Text style={s.subtitle}>Tell us about your game so we can find the best matches</Text>
        </LinearGradient>

        {/* Positions */}
        <Text style={s.section}>
          <Ionicons name="people" size={13} color="#94a3b8" />  Positions You Play *
        </Text>
        <View style={s.chips}>
          {POSITIONS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[s.chip, positions.includes(p) && s.chipActive]}
              onPress={() => toggleItem(p, positions, setPositions)}
            >
              {positions.includes(p) && <Ionicons name="checkmark" size={14} color="#fff" style={{ marginRight: 4 }} />}
              <Text style={[s.chipText, positions.includes(p) && s.chipTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {positions.length > 0 && (
          <Text style={s.chipCount}>{positions.length} selected</Text>
        )}

        {/* Skill Level */}
        <Text style={s.section}>
          <Ionicons name="trophy" size={13} color="#94a3b8" />  Skill Level *
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

        {/* Home ZIP */}
        <Text style={s.sectionOpt}>
          <Ionicons name="location" size={13} color="#64748b" />  Home ZIP Code (optional)
        </Text>
        <TextInput
          style={s.input}
          value={homeZip}
          onChangeText={setHomeZip}
          keyboardType="number-pad"
          placeholder="e.g. 95628"
          placeholderTextColor="#475569"
          maxLength={5}
        />

        {/* Availability */}
        <Text style={s.sectionOpt}>
          <Ionicons name="calendar" size={13} color="#64748b" />  Availability (optional)
        </Text>
        <View style={s.dayChips}>
          {DAYS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[s.dayChip, availability.includes(d) && s.dayChipActive]}
              onPress={() => toggleItem(d, availability, setAvailability)}
            >
              <Text style={[s.dayChipText, availability.includes(d) && s.dayChipTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Travel Radius */}
        <Text style={s.sectionOpt}>
          <Ionicons name="car" size={13} color="#64748b" />  Travel Radius in miles (optional)
        </Text>
        <TextInput
          style={s.input}
          value={travelRadius}
          onChangeText={setTravelRadius}
          keyboardType="number-pad"
          placeholder="e.g. 25"
          placeholderTextColor="#475569"
        />

        {/* Save */}
        <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.8}>
          <LinearGradient colors={['#3b82f6', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="arrow-forward-circle" size={22} color="#fff" />
                <Text style={s.btnText}>Save & Continue</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 24 },
  headerIcon: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: '#3b82f620',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', lineHeight: 20 },
  section: {
    fontSize: 13, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: 24, marginBottom: 10, paddingHorizontal: 20,
  },
  sectionOpt: {
    fontSize: 13, fontWeight: '600', color: '#64748b', textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: 24, marginBottom: 10, paddingHorizontal: 20,
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
  chipCount: { fontSize: 12, color: '#3b82f6', marginTop: 8, paddingHorizontal: 20 },
  dayChips: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  dayChip: {
    flex: 1, alignItems: 'center',
    backgroundColor: '#111827', borderRadius: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#1e293b',
  },
  dayChipActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  dayChipText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  dayChipTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#111827', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#1e293b', marginHorizontal: 20,
  },
  btn: {
    borderRadius: 14, paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    marginHorizontal: 20, marginTop: 32,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
