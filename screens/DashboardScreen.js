import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text,
    TouchableOpacity, View,
} from 'react-native';
import { getActiveNow, getBroadcasts, setActiveNow } from '../services/api';

export default function DashboardScreen({ navigation, route }) {
  const { user, setUser } = route.params;
  const [myBroadcasts, setMyBroadcasts] = useState([]);
  const [feed, setFeed] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isActive, setIsActive] = useState(user?.activeNow || false);

  const isManager = user?.role === 'manager' || user?.role === 'both';
  const isPlayer = user?.role === 'player' || user?.role === 'both';

  const load = useCallback(async () => {
    try {
      const [myRes, feedRes, activeRes] = await Promise.all([
        getBroadcasts(null, true),
        getBroadcasts(isPlayer ? 'manager' : 'player'),
        getActiveNow(),
      ]);
      setMyBroadcasts(myRes.broadcasts || []);
      setFeed(feedRes.broadcasts || []);
      setActiveUsers(activeRes.active || []);
    } catch (e) {
      console.warn('Dashboard load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isPlayer]);

  useFocusEffect(useCallback(() => { if (user) load(); }, [load, user]));

  if (!user) return null;

  const onRefresh = () => { setRefreshing(true); load(); };

  const toggleActive = async () => {
    const next = !isActive;
    setIsActive(next);
    try { await setActiveNow(next); } catch (e) { setIsActive(!next); }
  };

  const tonight = [];
  const later = [];
  const todayShort = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  feed.forEach((b) => {
    const d = (b.date || '').toLowerCase();
    if (d.includes('tonight') || d.includes('today') || d.includes(todayShort)) {
      tonight.push(b);
    } else {
      later.push(b);
    }
  });

  const statusColor = (status) => {
    if (status === 'confirmed') return '#10b981';
    if (status === 'expired' || status === 'closed' || status === 'cancelled') return '#ef4444';
    return '#f59e0b';
  };

  const renderBroadcast = (item) => (
    <TouchableOpacity
      key={item.id}
      style={s.card}
      onPress={() => navigation.navigate('BroadcastDetail', { broadcast: item, user })}
      activeOpacity={0.7}
    >
      <View style={s.cardHeader}>
        <View style={s.cardTypeRow}>
          <View style={[s.cardTypeBadge, { backgroundColor: item.type === 'player' ? '#8b5cf620' : '#3b82f620' }]}>
            <Ionicons
              name={item.type === 'player' ? 'hand-right' : 'megaphone'}
              size={14}
              color={item.type === 'player' ? '#8b5cf6' : '#3b82f6'}
            />
            <Text style={[s.cardTypeText, { color: item.type === 'player' ? '#8b5cf6' : '#3b82f6' }]}>
              {item.type === 'player' ? 'Available' : 'Sub Needed'}
            </Text>
          </View>
          <View style={[s.statusPill, { backgroundColor: statusColor(item.status) + '20' }]}>
            <View style={[s.statusDot, { backgroundColor: statusColor(item.status) }]} />
            <Text style={[s.statusText, { color: statusColor(item.status) }]}>
              {item.status?.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={s.cardCreator}>{item.creatorName || 'Unknown'}</Text>
      </View>

      <View style={s.cardBody}>
        <View style={s.cardMetaRow}>
          <Ionicons name="calendar-outline" size={14} color="#64748b" />
          <Text style={s.cardMeta}>{item.date}{item.time ? ` @ ${item.time}` : ''}</Text>
        </View>
        {item.locationName ? (
          <View style={s.cardMetaRow}>
            <Ionicons name="location-outline" size={14} color="#64748b" />
            <Text style={s.cardMeta}>{item.locationName}</Text>
          </View>
        ) : null}
        {(item.positions || []).length > 0 && (
          <View style={s.positionRow}>
            {item.positions.slice(0, 3).map((p) => (
              <View key={p} style={s.posChip}>
                <Text style={s.posChipText}>{p}</Text>
              </View>
            ))}
            {item.positions.length > 3 && (
              <Text style={s.posMore}>+{item.positions.length - 3}</Text>
            )}
          </View>
        )}
        {item.notes ? <Text style={s.cardNotes} numberOfLines={2}>{item.notes}</Text> : null}
      </View>

      <View style={s.cardFooter}>
        <View style={s.responseCount}>
          <Ionicons name="people-outline" size={14} color="#64748b" />
          <Text style={s.responseText}>{(item.responses || []).length} response(s)</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#475569" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;
  }

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      {/* Header */}
      <LinearGradient colors={['#0f172a', '#0a0e1a']} style={s.headerGradient}>
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Hey {user.name?.split(' ')[0] || 'there'}</Text>
            <View style={s.roleRow}>
              <View style={s.roleBadge}>
                <Ionicons
                  name={isManager ? 'shield-checkmark' : 'baseball'}
                  size={12}
                  color="#3b82f6"
                />
                <Text style={s.roleText}>
                  {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Calendar')}
            style={s.headerActionBtn}
          >
            <Ionicons name="calendar-outline" size={22} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Active Now Toggle */}
      <TouchableOpacity
        style={[s.activeRow, isActive && s.activeRowOn]}
        onPress={toggleActive}
        activeOpacity={0.8}
      >
        <View style={s.activeLeft}>
          <View style={[s.activePulse, isActive && s.activePulseOn]} />
          <View>
            <Text style={s.activeLabel}>
              {isActive ? 'You\'re Active' : 'Go Active'}
            </Text>
            <Text style={s.activeSub}>
              {isActive ? 'Others can see you — auto-expires in 30min' : 'Let others know you\'re available'}
            </Text>
          </View>
        </View>
        <View style={[s.activeToggle, isActive && s.activeToggleOn]}>
          <View style={[s.toggleKnob, isActive && s.toggleKnobOn]} />
        </View>
      </TouchableOpacity>

      {/* Active Users */}
      {activeUsers.length > 0 && (
        <>
          <View style={s.sectionHeader}>
            <View style={[s.sectionDot, { backgroundColor: '#10b981' }]} />
            <Text style={s.sectionTitle}>Active Now</Text>
            <View style={s.countBadge}>
              <Text style={s.countText}>{activeUsers.length}</Text>
            </View>
          </View>
          <FlatList
            horizontal
            data={activeUsers}
            keyExtractor={(item) => item.uid}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.activeCard}
                onPress={() => navigation.navigate('PlayerProfile', { profileUid: item.uid, user })}
                activeOpacity={0.7}
              >
                <View style={s.activeAvatar}>
                  <Text style={s.activeAvatarText}>{(item.name || '?')[0].toUpperCase()}</Text>
                  <View style={s.onlineDot} />
                </View>
                <Text style={s.activeCardName} numberOfLines={1}>{item.name?.split(' ')[0]}</Text>
                <Text style={s.activeCardRole} numberOfLines={1}>
                  {(item.positions || []).slice(0, 2).join(', ') || item.role}
                </Text>
              </TouchableOpacity>
            )}
          />
        </>
      )}

      {/* Create Broadcast Button */}
      <TouchableOpacity
        style={s.createBtn}
        onPress={() => navigation.navigate('CreateBroadcast', { user })}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#3b82f6', '#2563eb', '#1d4ed8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.createBtnGradient}
        >
          <Ionicons name={isManager ? 'megaphone' : 'flash'} size={20} color="#fff" />
          <Text style={s.createBtnText}>
            {isManager ? 'Post Sub Request' : 'Broadcast Availability'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {myBroadcasts.length > 0 && (
        <>
          <View style={s.sectionHeader}>
            <Ionicons name="radio-outline" size={16} color="#94a3b8" />
            <Text style={s.sectionTitle}>Your Active Broadcasts</Text>
          </View>
          {myBroadcasts.map(renderBroadcast)}
        </>
      )}

      {tonight.length > 0 && (
        <>
          <View style={s.sectionHeader}>
            <Ionicons name="flame" size={16} color="#f59e0b" />
            <Text style={[s.sectionTitle, { color: '#f59e0b' }]}>Tonight</Text>
          </View>
          {tonight.map(renderBroadcast)}
        </>
      )}

      <View style={s.sectionHeader}>
        <Ionicons name="list-outline" size={16} color="#94a3b8" />
        <Text style={s.sectionTitle}>
          {isPlayer ? 'Teams Looking for Subs' : 'Players Available'}
        </Text>
      </View>
      {later.length > 0 ? later.map(renderBroadcast) : (
        <View style={s.emptyState}>
          <Ionicons name="baseball-outline" size={48} color="#1e293b" />
          <Text style={s.emptyText}>No broadcasts yet</Text>
          <Text style={s.emptySub}>Pull to refresh or create one!</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  center: { flex: 1, backgroundColor: '#0a0e1a', justifyContent: 'center', alignItems: 'center' },
  headerGradient: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  roleRow: { flexDirection: 'row', marginTop: 6 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#3b82f615', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  roleText: { fontSize: 12, color: '#3b82f6', fontWeight: '600' },
  headerActionBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff08',
    alignItems: 'center', justifyContent: 'center',
  },

  // Active Toggle
  activeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#111827', marginHorizontal: 16, borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#1e293b',
  },
  activeRowOn: { borderColor: '#10b98140', backgroundColor: '#10b98108' },
  activeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  activePulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#475569' },
  activePulseOn: { backgroundColor: '#10b981' },
  activeLabel: { fontSize: 15, fontWeight: '700', color: '#e2e8f0' },
  activeSub: { fontSize: 12, color: '#64748b', marginTop: 1 },
  activeToggle: {
    width: 48, height: 28, borderRadius: 14, backgroundColor: '#1e293b',
    justifyContent: 'center', paddingHorizontal: 3,
  },
  activeToggleOn: { backgroundColor: '#10b981' },
  toggleKnob: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#475569',
  },
  toggleKnobOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },

  // Active Users
  activeCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 14, width: 90,
    alignItems: 'center', borderWidth: 1, borderColor: '#10b98130',
  },
  activeAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  activeAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981',
    borderWidth: 2, borderColor: '#111827',
  },
  activeCardName: { fontSize: 13, fontWeight: '700', color: '#e2e8f0' },
  activeCardRole: { fontSize: 11, color: '#64748b', marginTop: 2 },

  // Sections
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, marginBottom: 12, marginTop: 20,
  },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 },
  countBadge: {
    backgroundColor: '#10b98120', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  countText: { color: '#10b981', fontSize: 12, fontWeight: '700' },

  // Create Button
  createBtn: {
    marginHorizontal: 16, marginTop: 20, marginBottom: 4, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10,
    elevation: 6,
  },
  createBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 10,
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Cards
  card: {
    backgroundColor: '#111827', borderRadius: 14, marginHorizontal: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#1e293b',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: { marginBottom: 12 },
  cardTypeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTypeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  cardTypeText: { fontSize: 13, fontWeight: '600' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  cardCreator: { fontSize: 16, fontWeight: '700', color: '#e2e8f0' },
  cardBody: { gap: 6 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardMeta: { fontSize: 13, color: '#64748b' },
  positionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  posChip: { backgroundColor: '#3b82f615', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  posChipText: { fontSize: 12, color: '#3b82f6', fontWeight: '600' },
  posMore: { fontSize: 12, color: '#64748b', alignSelf: 'center' },
  cardNotes: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1e293b',
  },
  responseCount: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  responseText: { fontSize: 12, color: '#64748b' },

  // Empty State
  emptyState: { alignItems: 'center', marginTop: 40, gap: 8 },
  emptyText: { color: '#475569', fontSize: 16, fontWeight: '600' },
  emptySub: { color: '#334155', fontSize: 14 },
});
