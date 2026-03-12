import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
    ActionSheetIOS,
    ActivityIndicator,
    Alert, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { blockUser, getOrCreateConversation, getProfile, getRatings, getUserStats, invitePlayer, reportUser } from '../services/api';

const SKILL_COLORS = { Recreational: '#64748b', Intermediate: '#3b82f6', Competitive: '#8b5cf6', Elite: '#f59e0b' };

export default function PlayerProfileScreen({ navigation, route }) {
  const { profileUid, user } = route.params;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [profRes, ratRes, statRes] = await Promise.all([
          getProfile(profileUid),
          getRatings(profileUid).catch(() => ({})),
          getUserStats(profileUid).catch(() => ({})),
        ]);
        setProfile(profRes.profile);
        setRatings(ratRes);
        setStats(statRes.stats || statRes);
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
      Alert.alert('Error', 'Could not start conversation. Please try again.');
    }
  };

  const handleBlockReport = () => {
    const options = ['Block User', 'Report User', 'Cancel'];
    const cancelButtonIndex = 2;
    const destructiveButtonIndex = 0;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex, destructiveButtonIndex },
        (idx) => handleBlockReportAction(idx),
      );
    } else {
      Alert.alert('Options', '', [
        { text: 'Block User', style: 'destructive', onPress: () => handleBlockReportAction(0) },
        { text: 'Report User', onPress: () => handleBlockReportAction(1) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleBlockReportAction = async (idx) => {
    if (idx === 0) {
      Alert.alert('Block User', `Are you sure you want to block ${profile?.name || 'this user'}? They won\u2019t be able to find or message you.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block', style: 'destructive', onPress: async () => {
            try {
              await blockUser(profileUid);
              Alert.alert('Blocked', 'User has been blocked.');
              navigation.goBack();
            } catch (e) { Alert.alert('Error', e.message); }
          },
        },
      ]);
    } else if (idx === 1) {
      Alert.alert('Report User', 'Why are you reporting this user?', [
        { text: 'Spam', onPress: () => submitReport('Spam') },
        { text: 'Harassment', onPress: () => submitReport('Harassment') },
        { text: 'Inappropriate', onPress: () => submitReport('Inappropriate content') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const submitReport = async (reason) => {
    try {
      await reportUser(profileUid, reason);
      Alert.alert('Reported', 'Thank you. We\u2019ll review this report.');
    } catch (e) { Alert.alert('Error', e.message); }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;
  }

  if (!profile) {
    return (
      <View style={s.center}>
        <Ionicons name="person-outline" size={48} color="#1e293b" />
        <Text style={s.empty}>Profile not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backLink}>
          <Ionicons name="arrow-back" size={18} color="#3b82f6" />
          <Text style={s.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const skillColor = SKILL_COLORS[profile.skillLevel] || '#3b82f6';

  return (
    <ScrollView style={s.container}>
      {/* Header */}
      <LinearGradient colors={['#1e293b', '#0a0e1a']} style={s.headerArea}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#3b82f6" />
        </TouchableOpacity>

        {profileUid !== user?.uid && (
          <TouchableOpacity onPress={handleBlockReport} style={s.moreBtn}>
            <Ionicons name="ellipsis-horizontal" size={22} color="#94a3b8" />
          </TouchableOpacity>
        )}

        {profile.photoBase64 ? (
          <Image source={{ uri: `data:image/jpeg;base64,${profile.photoBase64}` }} style={s.avatarPhoto} />
        ) : (
          <View style={s.avatarLarge}>
            <Text style={s.avatarLargeText}>{(profile.name || '?').charAt(0).toUpperCase()}</Text>
            {profile.activeNow && <View style={s.onlineDot} />}
          </View>
        )}

        {profile.activeNow && (
          <View style={s.activePill}>
            <View style={s.activeDot} />
            <Text style={s.activeText}>Active Now</Text>
          </View>
        )}

        {/* Reputation Score Badge */}
        {stats?.repScore > 0 && (
          <View style={[s.repBadge, stats.repScore >= 70 ? s.repBadgeHigh : stats.repScore >= 40 ? s.repBadgeMed : s.repBadgeLow]}>
            <Ionicons name="shield-checkmark" size={16} color={stats.repScore >= 70 ? '#10b981' : stats.repScore >= 40 ? '#f59e0b' : '#64748b'} />
            <Text style={[s.repScore, { color: stats.repScore >= 70 ? '#10b981' : stats.repScore >= 40 ? '#f59e0b' : '#64748b' }]}>{stats.repScore}</Text>
            <Text style={s.repLabel}>REP</Text>
          </View>
        )}

        <Text style={s.name}>{profile.name || 'Unknown'}</Text>

        {profile.teamName ? (
          <View style={s.teamRow}>
            <Ionicons name="shield" size={14} color="#f59e0b" />
            <Text style={s.teamName}>{profile.teamName}</Text>
          </View>
        ) : null}

        {profile.skillLevel && (
          <View style={[s.skillPill, { backgroundColor: skillColor + '20' }]}>
            <Ionicons name="trophy" size={13} color={skillColor} />
            <Text style={[s.skillText, { color: skillColor }]}>{profile.skillLevel}</Text>
          </View>
        )}
      </LinearGradient>

      {/* Stats Cards */}
      <View style={s.statsRow}>
        {profile.homeZip ? (
          <View style={s.statCard}>
            <Ionicons name="location" size={20} color="#3b82f6" />
            <Text style={s.statValue}>{profile.homeZip}</Text>
            <Text style={s.statLabel}>ZIP</Text>
          </View>
        ) : null}
        {profile.travelRadius ? (
          <View style={s.statCard}>
            <Ionicons name="car" size={20} color="#8b5cf6" />
            <Text style={s.statValue}>{profile.travelRadius} mi</Text>
            <Text style={s.statLabel}>Travel</Text>
          </View>
        ) : null}
        <View style={s.statCard}>
          <Ionicons name="flash" size={20} color={profile.freeAgentMode ? '#10b981' : '#475569'} />
          <Text style={s.statValue}>{profile.freeAgentMode ? 'Yes' : 'No'}</Text>
          <Text style={s.statLabel}>Free Agent</Text>
        </View>
      </View>

      {/* Ratings */}
      {ratings?.avg && (
        <View style={s.ratingsSection}>
          <Text style={s.sectionTitle}>
            <Ionicons name="star" size={14} color="#f59e0b" />  Player Ratings
          </Text>
          <View style={s.ratingsRow}>
            {[
              { key: 'reliability', label: 'Reliability', icon: 'time-outline' },
              { key: 'teamwork', label: 'Teamwork', icon: 'people-outline' },
              { key: 'skill', label: 'Skill', icon: 'star-outline' },
            ].map(r => (
              <View key={r.key} style={s.ratingCard}>
                <Ionicons name={r.icon} size={16} color="#f59e0b" />
                <Text style={s.ratingValue}>
                  {ratings.avg[r.key] ? ratings.avg[r.key].toFixed(1) : '—'}
                </Text>
                <Text style={s.ratingLabel}>{r.label}</Text>
              </View>
            ))}
          </View>
          <Text style={s.ratingCount}>{ratings?.count || 0} rating(s)</Text>
        </View>
      )}

      {/* Game Stats */}
      {stats?.totalGames > 0 && (
        <View style={s.gameStatsSection}>
          <Text style={s.sectionTitle}>
            <Ionicons name="trophy" size={14} color="#8b5cf6" />  Game Stats
          </Text>
          <View style={s.gameStatsRow}>
            <View style={s.gameStatCard}>
              <Text style={s.gameStatValue}>{stats.totalGames}</Text>
              <Text style={s.gameStatLabel}>Games</Text>
            </View>
            <View style={s.gameStatCard}>
              <Text style={s.gameStatValue}>{stats.gamesCreated || 0}</Text>
              <Text style={s.gameStatLabel}>Created</Text>
            </View>
            <View style={s.gameStatCard}>
              <Text style={s.gameStatValue}>{stats.showUpRate ? `${Math.round(stats.showUpRate)}%` : '—'}</Text>
              <Text style={s.gameStatLabel}>Show-up</Text>
            </View>
          </View>
        </View>
      )}

      {/* Positions */}
      {(profile.positions || []).length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            <Ionicons name="people" size={14} color="#94a3b8" />  Positions
          </Text>
          <View style={s.posRow}>
            {profile.positions.map((p) => (
              <View key={p} style={s.posPill}>
                <Text style={s.posPillText}>{p}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Availability */}
      {profile.availability?.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            <Ionicons name="calendar" size={14} color="#94a3b8" />  Availability
          </Text>
          <View style={s.posRow}>
            {profile.availability.map((d) => (
              <View key={d} style={s.dayPill}>
                <Text style={s.dayPillText}>{d}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Message Button */}
      {profileUid !== user.uid && (
        <View style={{ marginHorizontal: 20, marginTop: 24, marginBottom: 40, gap: 12 }}>
          <TouchableOpacity onPress={handleMessage} activeOpacity={0.8}>
            <LinearGradient colors={['#3b82f6', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.msgBtn}>
              <Ionicons name="chatbubble" size={20} color="#fff" />
              <Text style={s.msgBtnText}>Send Message</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Invite to Game',
                  `Send ${profile.name} a notification that you need a sub?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Send Invite',
                      onPress: async () => {
                        try {
                          await invitePlayer(profileUid, `${user.name} wants you to sub for a game!`);
                          Alert.alert('Invite Sent!', `${profile.name} has been notified.`);
                        } catch (e) {
                          Alert.alert('Error', e.message);
                        }
                      },
                    },
                  ]
                );
              }}
              activeOpacity={0.8}
            >
              <View style={s.inviteBtn}>
                <Ionicons name="baseball" size={20} color="#10b981" />
                <Text style={s.inviteBtnText}>Invite to Game</Text>
              </View>
            </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  center: { flex: 1, backgroundColor: '#0a0e1a', justifyContent: 'center', alignItems: 'center' },
  headerArea: { paddingTop: 60, paddingBottom: 28, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 60, left: 16, padding: 8 },
  moreBtn: { position: 'absolute', top: 60, right: 16, padding: 8 },
  avatarLarge: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#3b82f620',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    borderWidth: 3, borderColor: '#3b82f640',
  },
  avatarPhoto: {
    width: 88, height: 88, borderRadius: 44, marginBottom: 14,
    borderWidth: 3, borderColor: '#3b82f640',
  },
  avatarLargeText: { color: '#3b82f6', fontSize: 36, fontWeight: '700' },
  onlineDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 16, height: 16, borderRadius: 8, backgroundColor: '#10b981',
    borderWidth: 3, borderColor: '#1e293b',
  },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#10b98120', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10,
  },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  activeText: { color: '#10b981', fontSize: 13, fontWeight: '700' },
  repBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 10, marginTop: 10,
  },
  repBadgeHigh: { backgroundColor: '#10b98120' },
  repBadgeMed: { backgroundColor: '#f59e0b20' },
  repBadgeLow: { backgroundColor: '#64748b20' },
  repScore: { fontSize: 20, fontWeight: '900' },
  repLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 1 },
  name: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  teamName: { fontSize: 14, color: '#f59e0b', fontWeight: '600' },
  skillPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10,
  },
  skillText: { fontSize: 13, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 20 },
  statCard: {
    flex: 1, backgroundColor: '#111827', borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#1e293b',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8,
    elevation: 4,
  },
  statValue: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 8 },
  statLabel: { fontSize: 11, color: '#475569', marginTop: 2, textTransform: 'uppercase' },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  posRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  posPill: { backgroundColor: '#3b82f615', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  posPillText: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },
  dayPill: { backgroundColor: '#8b5cf615', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  dayPillText: { color: '#8b5cf6', fontSize: 13, fontWeight: '600' },
  msgBtn: {
    borderRadius: 14, paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  msgBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  inviteBtn: {
    borderRadius: 14, paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#111827', borderWidth: 1, borderColor: '#10b98140',
  },
  inviteBtnText: { color: '#10b981', fontSize: 17, fontWeight: '700' },
  empty: { color: '#475569', fontSize: 16, fontWeight: '600', marginTop: 14 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  backLinkText: { color: '#3b82f6', fontSize: 15, fontWeight: '600' },

  // Ratings
  ratingsSection: { marginHorizontal: 20, marginTop: 20 },
  ratingsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  ratingCard: {
    flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#1e293b',
  },
  ratingValue: { fontSize: 22, fontWeight: '800', color: '#f59e0b', marginTop: 6 },
  ratingLabel: { fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: '600' },
  ratingCount: { fontSize: 12, color: '#475569', marginTop: 8 },

  // Game Stats
  gameStatsSection: { marginHorizontal: 20, marginTop: 20 },
  gameStatsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  gameStatCard: {
    flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#1e293b',
  },
  gameStatValue: { fontSize: 22, fontWeight: '800', color: '#8b5cf6' },
  gameStatLabel: { fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: '600' },
});
