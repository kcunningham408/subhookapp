import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
    Animated, FlatList, LayoutAnimation, RefreshControl, StyleSheet, Text,
    TouchableOpacity, View,
} from 'react-native';
import ErrorBanner from '../components/ErrorBanner';
import { getGameHistory } from '../services/api';

const SPRING_CONFIG = {
  duration: 400,
  create: { type: 'spring', property: 'opacity', springDamping: 0.7 },
  update: { type: 'spring', springDamping: 0.7 },
  delete: { type: 'spring', property: 'opacity', springDamping: 0.7 },
};

export default function GameHistoryScreen({ navigation, route }) {
  const { user } = route.params;
  const [data, setData] = useState({ created: [], participated: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('all'); // 'all' | 'created' | 'joined'
  const [error, setError] = useState(null);

  // Skeleton shimmer
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (loading) {
      Animated.loop(Animated.timing(shimmerAnim, { toValue: 1, duration: 1200, useNativeDriver: true })).start();
    }
  }, [loading]);
  const shimmerTranslate = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-200, 200] });
  const SkeletonBlock = ({ width, height, style }) => (
    <View style={[{ width, height, borderRadius: 8, backgroundColor: '#1e293b', overflow: 'hidden' }, style]}>
      <Animated.View style={{ width: '100%', height: '100%', backgroundColor: '#ffffff08', transform: [{ translateX: shimmerTranslate }] }} />
    </View>
  );

  const load = async () => {
    try {
      setError(null);
      const res = await getGameHistory();
      LayoutAnimation.configureNext(SPRING_CONFIG);
      setData(res);
    } catch (e) {
      setError('Could not load game history. Tap Retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const allGames = [...data.created.map(g => ({ ...g, _role: 'created' })),
    ...data.participated.map(g => ({ ...g, _role: 'joined' }))]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const filtered = tab === 'all' ? allGames : allGames.filter(g => g._role === tab);
  const stats = data.stats || {};

  if (loading) {
    return (
      <View style={s.container}>
        <LinearGradient colors={['#0f172a', '#0a0e1a']} style={s.header}>
          <View style={s.backBtn} />
          <SkeletonBlock width={160} height={26} />
          <SkeletonBlock width={100} height={14} style={{ marginTop: 6 }} />
        </LinearGradient>
        <View style={s.statsRow}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={[s.statCard, { alignItems: 'center', gap: 6 }]}>
              <SkeletonBlock width={36} height={22} />
              <SkeletonBlock width={30} height={10} />
            </View>
          ))}
        </View>
        <View style={{ paddingHorizontal: 16, gap: 10, marginTop: 16 }}>
          {[1, 2, 3].map(i => (
            <View key={i} style={[s.card, { gap: 8 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <SkeletonBlock width={90} height={20} style={{ borderRadius: 8 }} />
                <SkeletonBlock width={60} height={20} style={{ borderRadius: 8 }} />
              </View>
              <SkeletonBlock width={140} height={14} />
              <SkeletonBlock width={200} height={14} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <LinearGradient colors={['#0f172a', '#0a0e1a']} style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#3b82f6" />
        </TouchableOpacity>
        <Text style={s.title}>Game History</Text>
        <Text style={s.sub}>{stats.totalGames || 0} total games</Text>
      </LinearGradient>

      <ErrorBanner message={error} onRetry={load} onDismiss={() => setError(null)} />

      {/* Stats Cards */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statNum}>{stats.totalGames || 0}</Text>
          <Text style={s.statLabel}>Total</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNum}>{stats.gamesCreated || 0}</Text>
          <Text style={s.statLabel}>Created</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNum}>{stats.gamesJoined || 0}</Text>
          <Text style={s.statLabel}>Joined</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statNum, { color: (stats.showUpRate || 100) >= 80 ? '#10b981' : '#ef4444' }]}>
            {stats.showUpRate || 100}%
          </Text>
          <Text style={s.statLabel}>Show-up</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {[{ key: 'all', label: 'All' }, { key: 'created', label: 'Created' }, { key: 'joined', label: 'Joined' }].map(t => (
          <TouchableOpacity key={t.key} style={[s.tab, tab === t.key && s.tabActive]}
            onPress={() => { Haptics.selectionAsync(); LayoutAnimation.configureNext(SPRING_CONFIG); setTab(t.key); }}>
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item, idx) => item.id + idx}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#3b82f6" />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="time-outline" size={48} color="#1e293b" />
            <Text style={s.emptyText}>No game history yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => { Haptics.selectionAsync(); navigation.navigate('BroadcastDetail', { broadcast: item, user }); }}
            activeOpacity={0.7}
          >
            <View style={s.cardTop}>
              <View style={[s.typeBadge, { backgroundColor: item.type === 'player' ? '#8b5cf620' : '#3b82f620' }]}>
                <Ionicons name={item.type === 'player' ? 'hand-right' : 'megaphone'} size={13}
                  color={item.type === 'player' ? '#8b5cf6' : '#3b82f6'} />
                <Text style={{ color: item.type === 'player' ? '#8b5cf6' : '#3b82f6', fontSize: 12, fontWeight: '600' }}>
                  {item.type === 'player' ? 'Available' : 'Sub Needed'}
                </Text>
              </View>
              <View style={[s.roleBadge, { backgroundColor: item._role === 'created' ? '#f59e0b20' : '#10b98120' }]}>
                <Text style={{ color: item._role === 'created' ? '#f59e0b' : '#10b981', fontSize: 11, fontWeight: '700' }}>
                  {item._role === 'created' ? 'HOSTED' : 'JOINED'}
                </Text>
              </View>
            </View>
            <Text style={s.cardCreator}>{item.creatorName || 'You'}</Text>
            <View style={s.cardMeta}>
              <Ionicons name="calendar-outline" size={13} color="#64748b" />
              <Text style={s.metaText}>{item.date}{item.time ? ` · ${item.time}` : ''}</Text>
            </View>
            {item.locationName ? (
              <View style={s.cardMeta}>
                <Ionicons name="location-outline" size={13} color="#64748b" />
                <Text style={s.metaText}>{item.locationName}</Text>
              </View>
            ) : null}
            <View style={s.statusRow}>
              <Text style={[s.statusPill, {
                color: item.status === 'confirmed' ? '#10b981' : item.status === 'closed' ? '#64748b' : '#ef4444',
                backgroundColor: (item.status === 'confirmed' ? '#10b981' : item.status === 'closed' ? '#64748b' : '#ef4444') + '15',
              }]}>
                {(item.status || '').toUpperCase()}
              </Text>
              {item._role === 'joined' && (
                <TouchableOpacity
                  style={s.rateBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate('RatePlayer', {
                      targetUid: item.creatorId,
                      targetName: item.creatorName || 'Organizer',
                      broadcastId: item.id,
                    });
                  }}
                >
                  <Ionicons name="star" size={14} color="#f59e0b" />
                  <Text style={s.rateBtnText}>Rate</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  center: { flex: 1, backgroundColor: '#0a0e1a', justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20 },
  backBtn: { marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff' },
  sub: { fontSize: 14, color: '#64748b', marginTop: 4 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#1e293b',
  },
  statNum: { fontSize: 22, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 4 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#111827', borderWidth: 1, borderColor: '#1e293b',
  },
  tabActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  tabText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#111827', borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#1e293b',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  roleBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  cardCreator: { fontSize: 16, fontWeight: '700', color: '#e2e8f0', marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  metaText: { color: '#64748b', fontSize: 13 },
  statusRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: { fontSize: 11, fontWeight: '700', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', overflow: 'hidden' },
  rateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f59e0b15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  rateBtnText: { color: '#f59e0b', fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { color: '#475569', fontSize: 16, fontWeight: '600' },
});
