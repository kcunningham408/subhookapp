import { useEffect, useState } from 'react';
import {
  ActivityIndicator, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { getOrCreateConversation, getProfile } from '../services/api';

export default function PlayerProfileScreen({ navigation, route }) {
  const { profileUid, user } = route.params;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getProfile(profileUid);
        setProfile(res.profile);
      } catch (e) {
        console.warn('Profile load error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profileUid]);

  const handleMessage = async () => {
    try {
      const res = await getOrCreateConversation(profileUid);
      navigation.navigate('Chat', { conversation: res.conversation, user });
    } catch (e) {
      console.warn('Create convo error', e);
    }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#2563eb" size="large" /></View>;
  }

  if (!profile) {
    return (
      <View style={s.center}>
        <Text style={s.empty}>Profile not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.backRow}>
        <Text style={s.back}>← Back</Text>
      </TouchableOpacity>

      <View style={s.card}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{(profile.name || '?').charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={s.name}>{profile.name || 'Unknown'}</Text>
        {profile.skillLevel && <Text style={s.skill}>{profile.skillLevel}</Text>}
        <Text style={s.positions}>{(profile.positions || []).join(', ') || 'No positions listed'}</Text>
        {profile.travelRadius && <Text style={s.meta}>📍 {profile.travelRadius} mi travel radius</Text>}
        {profile.availability?.length > 0 && (
          <Text style={s.meta}>📅 {profile.availability.join(', ')}</Text>
        )}
        <View style={s.badge}>
          <Text style={s.badgeText}>{profile.freeAgentMode ? '🟢 Free Agent' : '⚪ Not Available'}</Text>
        </View>
      </View>

      {profileUid !== user.uid && (
        <TouchableOpacity style={s.msgBtn} onPress={handleMessage}>
          <Text style={s.msgBtnText}>💬 Send Message</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1a2e' },
  center: { flex: 1, backgroundColor: '#0f1a2e', justifyContent: 'center', alignItems: 'center' },
  backRow: { paddingHorizontal: 20, paddingTop: 60 },
  back: { color: '#2563eb', fontSize: 16 },
  card: {
    backgroundColor: '#1e293b', borderRadius: 16, marginHorizontal: 20, marginTop: 20,
    padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#334155',
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  skill: { fontSize: 14, color: '#2563eb', fontWeight: '600', marginBottom: 8 },
  positions: { fontSize: 15, color: '#94a3b8', textAlign: 'center' },
  meta: { fontSize: 14, color: '#64748b', marginTop: 8 },
  badge: { marginTop: 16, backgroundColor: '#0f1a2e', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 },
  badgeText: { color: '#cbd5e1', fontSize: 14, fontWeight: '600' },
  msgBtn: { backgroundColor: '#2563eb', borderRadius: 12, marginHorizontal: 20, marginTop: 24, paddingVertical: 14, alignItems: 'center' },
  msgBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  empty: { color: '#64748b', fontSize: 16, marginBottom: 16 },
});
