import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getNotificationPrefs, updateNotificationPrefs } from '../services/api';

const PREF_ITEMS = [
  { key: 'newBroadcasts', label: 'New Broadcasts Nearby', icon: 'megaphone', sub: 'When someone posts a game near you' },
  { key: 'messages', label: 'Messages', icon: 'chatbubble', sub: 'New direct messages' },
  { key: 'rosterUpdates', label: 'Roster Updates', icon: 'people', sub: 'When you\'re added to a roster or waitlist' },
  { key: 'gameReminders', label: 'Game Reminders', icon: 'alarm', sub: '"Better not bail" game day reminders' },
  { key: 'ratings', label: 'Ratings', icon: 'star', sub: 'When someone rates you after a game' },
];

export default function SettingsScreen({ navigation, route }) {
  const { user } = route.params;
  const [prefs, setPrefs] = useState({
    newBroadcasts: true, messages: true, rosterUpdates: true, gameReminders: true, ratings: true,
  });
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const res = await getNotificationPrefs();
          setPrefs(res.prefs);
        } catch (e) {
          console.warn('Prefs load error', e);
        } finally {
          setLoading(false);
        }
      })();
    }, [])
  );

  const togglePref = async (key) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      await updateNotificationPrefs(next);
    } catch (e) {
      setPrefs(prefs); // revert
      Alert.alert('Error', 'Could not save preference. Try again.');
    }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll}>
      <LinearGradient colors={['#0f172a', '#0a0e1a']} style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#3b82f6" />
        </TouchableOpacity>
        <Text style={s.title}>Settings</Text>
      </LinearGradient>

      {/* Notifications */}
      <Text style={s.sectionLabel}>NOTIFICATIONS</Text>
      <View style={s.card}>
        {PREF_ITEMS.map((item, idx) => (
          <View key={item.key}>
            {idx > 0 && <View style={s.divider} />}
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Ionicons name={item.icon} size={20} color="#3b82f6" />
                <View>
                  <Text style={s.rowLabel}>{item.label}</Text>
                  <Text style={s.rowSub}>{item.sub}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[s.toggle, prefs[item.key] && s.toggleOn]}
                onPress={() => togglePref(item.key)}
              >
                <View style={[s.knob, prefs[item.key] && s.knobOn]} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Account Info */}
      <Text style={s.sectionLabel}>ACCOUNT</Text>
      <View style={s.card}>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Name</Text>
          <Text style={s.infoValue}>{user?.name}</Text>
        </View>
        <View style={s.divider} />
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Phone</Text>
          <Text style={s.infoValue}>{user?.phone}</Text>
        </View>
        <View style={s.divider} />
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Plan</Text>
          <View style={[s.planBadge, user?.subscriptionStatus === 'pro' && s.planBadgePro]}>
            <Ionicons name={user?.subscriptionStatus === 'pro' ? 'diamond' : 'person'} size={12}
              color={user?.subscriptionStatus === 'pro' ? '#f59e0b' : '#64748b'} />
            <Text style={[s.planText, user?.subscriptionStatus === 'pro' && s.planTextPro]}>
              {user?.subscriptionStatus === 'pro' ? 'Pro' : 'Free'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  scroll: { paddingBottom: 40 },
  center: { flex: 1, backgroundColor: '#0a0e1a', justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#64748b', letterSpacing: 1,
    marginTop: 24, marginBottom: 10, paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#111827', borderRadius: 14, marginHorizontal: 16,
    padding: 4, borderWidth: 1, borderColor: '#1e293b',
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#e2e8f0' },
  rowSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#1e293b', marginHorizontal: 14 },
  toggle: {
    width: 48, height: 28, borderRadius: 14, backgroundColor: '#1e293b',
    justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: '#3b82f6' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#475569' },
  knobOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14,
  },
  infoLabel: { fontSize: 14, color: '#94a3b8' },
  infoValue: { fontSize: 14, color: '#e2e8f0', fontWeight: '600' },
  planBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  planBadgePro: { backgroundColor: '#f59e0b20' },
  planText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  planTextPro: { color: '#f59e0b' },
});
