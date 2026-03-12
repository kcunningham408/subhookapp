import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, Dimensions, FlatList, KeyboardAvoidingView, Platform,
    StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { saveProfile, updateUser } from '../services/api';

const { width: SCREEN_W } = Dimensions.get('window');
const POSITIONS = ['Pitcher', 'Catcher', '1st Base', '2nd Base', '3rd Base', 'Shortstop', 'Left Field', 'Center Field', 'Right Field'];
const SKILL_LEVELS = ['Recreational', 'Intermediate', 'Competitive', 'Elite'];
const SKILL_COLORS = { Recreational: '#64748b', Intermediate: '#3b82f6', Competitive: '#8b5cf6', Elite: '#f59e0b' };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PAGES = [
  { icon: 'baseball', color: '#3b82f6', title: 'Welcome to SubHook!', sub: 'Let\'s set up your profile so we can find the best games for you.' },
  { icon: 'people', color: '#8b5cf6', title: 'What positions\ndo you play?', sub: 'Select all that apply' },
  { icon: 'trophy', color: '#f59e0b', title: 'What\'s your\nskill level?', sub: 'This helps match you with the right games' },
  { icon: 'calendar', color: '#10b981', title: 'When are you\navailable?', sub: 'Optional — helps us suggest games' },
  { icon: 'location', color: '#ef4444', title: 'Where are you\nbased?', sub: 'Optional — for nearby game matching' },
];

export default function OnboardingScreen({ navigation, route }) {
  const { user, setUser } = route.params;
  const flatListRef = useRef(null);
  const [page, setPage] = useState(0);
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

  const goNext = () => {
    if (page === 1 && positions.length === 0) return Alert.alert('Pick at least one position');
    if (page === 2 && !skillLevel) return Alert.alert('Pick your skill level');
    if (page < PAGES.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const next = page + 1;
      setPage(next);
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
    }
  };

  const goBack = () => {
    if (page > 0) {
      const prev = page - 1;
      setPage(prev);
      flatListRef.current?.scrollToIndex({ index: prev, animated: true });
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const profileData = { positions, skillLevel, freeAgentMode: true };
      if (availability.length > 0) profileData.availability = availability;
      if (travelRadius) profileData.travelRadius = parseInt(travelRadius) || 25;
      if (homeZip.trim()) profileData.homeZip = homeZip.trim();
      await saveProfile(profileData);
      await updateUser({ onboardingComplete: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUser({ ...user, onboardingComplete: true });
    } catch (e) {
      setSaving(false);
      Alert.alert('Error', e.message);
    }
  };

  const renderPage = ({ index }) => {
    const pg = PAGES[index];
    return (
      <View style={[s.page, { width: SCREEN_W }]}>
        {/* Page Header */}
        <View style={s.pageHeader}>
          <View style={[s.pageIcon, { backgroundColor: pg.color + '20' }]}>
            <Ionicons name={pg.icon} size={36} color={pg.color} />
          </View>
          <Text style={s.pageTitle}>{pg.title}</Text>
          <Text style={s.pageSub}>{pg.sub}</Text>
        </View>

        {/* Page Content */}
        <View style={s.pageContent}>
          {index === 0 && (
            <View style={s.welcomeFeatures}>
              {[
                { icon: 'megaphone', text: 'Post broadcasts when you need a sub' },
                { icon: 'search', text: 'Find available players nearby' },
                { icon: 'map', text: 'See games on the heat map' },
                { icon: 'chatbubbles', text: 'Message players directly' },
              ].map((f, i) => (
                <View key={i} style={s.featureRow}>
                  <Ionicons name={f.icon} size={20} color="#3b82f6" />
                  <Text style={s.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>
          )}

          {index === 1 && (
            <View style={s.chips}>
              {POSITIONS.map((p) => (
                <TouchableOpacity key={p} style={[s.chip, positions.includes(p) && s.chipActive]} onPress={() => toggleItem(p, positions, setPositions)}>
                  {positions.includes(p) && <Ionicons name="checkmark" size={14} color="#fff" style={{ marginRight: 4 }} />}
                  <Text style={[s.chipText, positions.includes(p) && s.chipTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
              {positions.length > 0 && <Text style={s.chipCount}>{positions.length} selected</Text>}
            </View>
          )}

          {index === 2 && (
            <View style={s.chips}>
              {SKILL_LEVELS.map((l) => {
                const active = skillLevel === l;
                const color = SKILL_COLORS[l];
                return (
                  <TouchableOpacity key={l} style={[s.skillChip, active && { backgroundColor: color, borderColor: color }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSkillLevel(l); }}>
                    <Ionicons name="trophy" size={16} color={active ? '#fff' : color} />
                    <Text style={[s.skillChipText, active && { color: '#fff' }]}>{l}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {index === 3 && (
            <View style={s.dayGrid}>
              {DAYS.map((d) => (
                <TouchableOpacity key={d} style={[s.dayChip, availability.includes(d) && s.dayChipActive]}
                  onPress={() => toggleItem(d, availability, setAvailability)}>
                  <Text style={[s.dayChipText, availability.includes(d) && s.dayChipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {index === 4 && (
            <View style={s.locationInputs}>
              <Text style={s.inputLabel}>Home ZIP Code</Text>
              <TextInput style={s.input} value={homeZip} onChangeText={setHomeZip}
                keyboardType="number-pad" placeholder="e.g. 95628" placeholderTextColor="#475569" maxLength={5} />
              <Text style={s.inputLabel}>Travel Radius (miles)</Text>
              <TextInput style={s.input} value={travelRadius} onChangeText={setTravelRadius}
                keyboardType="number-pad" placeholder="e.g. 25" placeholderTextColor="#475569" />
            </View>
          )}
        </View>
      </View>
    );
  };

  const isLast = page === PAGES.length - 1;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Progress Dots */}
      <View style={s.dotsRow}>
        {PAGES.map((_, i) => (
          <View key={i} style={[s.dot, i === page && s.dotActive, i < page && s.dotDone]} />
        ))}
      </View>

      <FlatList
        ref={flatListRef}
        data={PAGES}
        renderItem={renderPage}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
      />

      {/* Bottom Nav */}
      <View style={s.bottomBar}>
        {page > 0 ? (
          <TouchableOpacity style={s.backBtn} onPress={goBack}>
            <Ionicons name="arrow-back" size={20} color="#94a3b8" />
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 80 }} />}

        <Text style={s.pageNum}>{page + 1} / {PAGES.length}</Text>

        {isLast ? (
          <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.8}>
            <LinearGradient colors={['#3b82f6', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.nextBtn}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                <Text style={s.nextBtnText}>Done</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={goNext} activeOpacity={0.8}>
            <LinearGradient colors={['#3b82f6', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.nextBtn}>
              <Text style={s.nextBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    paddingTop: 60, paddingBottom: 10,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#1e293b',
  },
  dotActive: { backgroundColor: '#3b82f6', width: 24 },
  dotDone: { backgroundColor: '#3b82f680' },
  page: { flex: 1 },
  pageHeader: { alignItems: 'center', paddingTop: 30, paddingHorizontal: 30 },
  pageIcon: {
    width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 36 },
  pageSub: { fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 8 },
  pageContent: { flex: 1, paddingTop: 30, paddingHorizontal: 20 },

  // Welcome
  welcomeFeatures: { gap: 16 },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#111827',
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1e293b',
  },
  featureText: { fontSize: 15, color: '#e2e8f0', fontWeight: '500', flex: 1 },

  // Chips
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111827', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#1e293b',
  },
  chipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  chipCount: { fontSize: 12, color: '#3b82f6', width: '100%', marginTop: 4 },

  // Skill
  skillChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%',
    backgroundColor: '#111827', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16,
    borderWidth: 1.5, borderColor: '#1e293b', marginBottom: 8,
  },
  skillChipText: { fontSize: 16, fontWeight: '600', color: '#94a3b8' },

  // Days
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  dayChip: {
    width: 70, alignItems: 'center',
    backgroundColor: '#111827', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#1e293b',
  },
  dayChipActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  dayChipText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  dayChipTextActive: { color: '#fff' },

  // Location inputs
  locationInputs: { gap: 8 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginTop: 8 },
  input: {
    backgroundColor: '#111827', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#1e293b',
  },

  // Bottom
  bottomBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 80 },
  backText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
  pageNum: { color: '#475569', fontSize: 13, fontWeight: '600' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
