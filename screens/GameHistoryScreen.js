import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { getGameHistory } from '../services/api';

export default function GameHistoryScreen({ navigation, route }) {
  const { user } = route.params;
  const [data, setData] = useState({ created: [], participated: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('all'); // 'all' | 'created' | 'joined'

  const load = async () => {
    try {
      const res = await getGameHistory();
      setData(res);
    } catch (e) {
      console.warn('History load error', e);
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
    return <View style={s.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;
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
            onPress={() => setTab(t.key)}>
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
            onPress={() => navigation.navigate('BroadcastDetail', { broadcast: item, user })}
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
  statusRow: { marginTop: 8 },
  statusPill: { fontSize: 11, fontWeight: '700', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', overflow: 'hidden' },
  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { color: '#475569', fontSize: 16, fontWeight: '600' },
});
