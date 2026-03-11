import { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getBroadcasts, logout } from '../services/api';

export default function DashboardScreen({ navigation, route }) {
  const { user, setUser } = route.params;
  const isManager = user.role === 'manager' || user.role === 'both';
  const isPlayer = user.role === 'player' || user.role === 'both';

  const [myBroadcasts, setMyBroadcasts] = useState([]);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [myRes, feedRes] = await Promise.all([
        getBroadcasts(null, true),
        getBroadcasts(isPlayer ? 'manager' : 'player'),
      ]);
      setMyBroadcasts(myRes.broadcasts || []);
      setFeed(feedRes.broadcasts || []);
    } catch (e) {
      console.warn('Dashboard load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isPlayer]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleLogout = async () => { await logout(); setUser(null); };

  const renderBroadcast = ({ item }) => (
    <TouchableOpacity
      style={s.card}
      onPress={() => navigation.navigate('BroadcastDetail', { broadcast: item, user })}
    >
      <View style={s.cardRow}>
        <Text style={s.cardType}>{item.type === 'player' ? '🙋 Player Available' : '📋 Sub Needed'}</Text>
        <Text style={s.cardStatus}>{item.status}</Text>
      </View>
      <Text style={s.cardCreator}>{item.creatorName || 'Unknown'}</Text>
      <Text style={s.cardMeta}>
        {item.date}{item.time ? ` @ ${item.time}` : ''} · {(item.positions || []).join(', ') || 'Any position'}
      </Text>
      {item.notes ? <Text style={s.cardNotes}>{item.notes}</Text> : null}
      <Text style={s.cardResponses}>{(item.responses || []).length} response(s)</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#2563eb" size="large" /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Hey {user.name?.split(' ')[0] || 'there'} 👋</Text>
          <Text style={s.role}>{user.role?.charAt(0).toUpperCase() + user.role?.slice(1)} Mode</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={s.createBtn}
        onPress={() => navigation.navigate('CreateBroadcast', { user })}
      >
        <Text style={s.createBtnText}>
          {isManager ? '📢 Post Sub Request' : '📣 Broadcast Availability'}
        </Text>
      </TouchableOpacity>

      {myBroadcasts.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Your Active Broadcasts</Text>
          <FlatList
            data={myBroadcasts}
            keyExtractor={(item) => item.id}
            renderItem={renderBroadcast}
            scrollEnabled={false}
          />
        </>
      )}

      <Text style={s.sectionTitle}>
        {isPlayer ? 'Teams Looking for Subs' : 'Players Available'}
      </Text>

      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        renderItem={renderBroadcast}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
        ListEmptyComponent={
          <Text style={s.empty}>No broadcasts yet. Pull to refresh!</Text>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1a2e', paddingTop: 60 },
  center: { flex: 1, backgroundColor: '#0f1a2e', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#fff' },
  role: { fontSize: 13, color: '#64748b', marginTop: 2 },
  logoutText: { color: '#64748b', fontSize: 14 },
  createBtn: {
    backgroundColor: '#2563eb', borderRadius: 12, marginHorizontal: 20, paddingVertical: 14,
    alignItems: 'center', marginBottom: 20,
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#94a3b8', paddingHorizontal: 20, marginBottom: 10, marginTop: 10 },
  card: {
    backgroundColor: '#1e293b', borderRadius: 12, marginHorizontal: 20, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardType: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cardStatus: { fontSize: 12, color: '#22c55e', fontWeight: '600', textTransform: 'uppercase' },
  cardCreator: { fontSize: 14, color: '#cbd5e1', marginBottom: 4 },
  cardMeta: { fontSize: 13, color: '#64748b' },
  cardNotes: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginTop: 6 },
  cardResponses: { fontSize: 12, color: '#64748b', marginTop: 8 },
  empty: { color: '#475569', textAlign: 'center', marginTop: 40, fontSize: 15 },
});
