import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { submitRating } from '../services/api';

const CATEGORIES = [
  { key: 'reliability', label: 'Reliability', icon: 'time-outline', desc: 'Shows up on time' },
  { key: 'teamwork', label: 'Teamwork', icon: 'people-outline', desc: 'Good teammate' },
  { key: 'skill', label: 'Skill', icon: 'star-outline', desc: 'Player ability' },
];

function StarRow({ value, onChange }) {
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => { onChange(n); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={32} color={n <= value ? '#f59e0b' : '#334155'} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function RatePlayerScreen({ navigation, route }) {
  const { targetUid, targetName, broadcastId } = route.params;
  const [ratings, setRatings] = useState({ reliability: 0, teamwork: 0, skill: 0 });
  const [submitting, setSubmitting] = useState(false);

  const allRated = ratings.reliability > 0 && ratings.teamwork > 0 && ratings.skill > 0;

  const handleSubmit = async () => {
    if (!allRated) return Alert.alert('Please rate all categories');
    setSubmitting(true);
    try {
      await submitRating(targetUid, broadcastId, ratings.reliability, ratings.teamwork, ratings.skill);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Rating Submitted', `Thanks for rating ${targetName}!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      const msg = e.message || 'Failed to submit rating';
      if (msg.includes('already rated')) {
        Alert.alert('Already Rated', 'You have already rated this player for this game.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#0f172a', '#0a0e1a']} style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#3b82f6" />
        </TouchableOpacity>
        <Text style={s.title}>Rate Player</Text>
        <Text style={s.subtitle}>{targetName}</Text>
      </LinearGradient>

      <View style={s.content}>
        {CATEGORIES.map((cat) => (
          <View key={cat.key} style={s.catCard}>
            <View style={s.catHeader}>
              <Ionicons name={cat.icon} size={20} color="#3b82f6" />
              <View>
                <Text style={s.catLabel}>{cat.label}</Text>
                <Text style={s.catDesc}>{cat.desc}</Text>
              </View>
            </View>
            <StarRow value={ratings[cat.key]} onChange={(v) => setRatings(prev => ({ ...prev, [cat.key]: v }))} />
          </View>
        ))}

        <TouchableOpacity onPress={handleSubmit} disabled={submitting || !allRated} activeOpacity={0.8}>
          <LinearGradient
            colors={allRated ? ['#3b82f6', '#8b5cf6'] : ['#1e293b', '#1e293b']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.submitBtn}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : (
              <Text style={[s.submitText, !allRated && { color: '#475569' }]}>Submit Rating</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  backBtn: { marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 16, color: '#94a3b8', marginTop: 4 },
  content: { padding: 20, gap: 16 },
  catCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#1e293b',
  },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  catLabel: { fontSize: 16, fontWeight: '700', color: '#fff' },
  catDesc: { fontSize: 12, color: '#64748b' },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  submitBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
