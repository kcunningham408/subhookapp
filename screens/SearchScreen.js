import { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getOrCreateConversation, searchPlayers } from '../services/api';

const POSITIONS = ['All', 'Pitcher', 'Catcher', '1st Base', '2nd Base', '3rd Base', 'Shortstop', 'Left Field', 'Center Field', 'Right Field'];

export default function SearchScreen({ navigation, route }) {
  const { user } = route.params;
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pos = filter === 'All' ? null : filter;
      const res = await searchPlayers(pos);
      setPlayers(res.players || []);
    } catch (e) {
      console.warn('Search error', e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleMessage = async (otherUid) => {
    try {
      const res = await getOrCreateConversation(otherUid);
      navigation.navigate('Chat', { conversation: res.conversation, user });
    } catch (e) {
      console.warn('Create convo error', e);
    }
  };

  const renderPlayer = ({ item }) => (
    <TouchableOpacity
      style={s.card}
      onPress={() => navigation.navigate('PlayerProfile', { profileUid: item.uid, user })}
    >
      <View style={s.rowBetween}>
        <Text style={s.name}>{item.name || 'Unknown'}</Text>
        <Text style={s.skill}>{item.skillLevel || ''}</Text>
      </View>
      <Text style={s.positions}>{(item.positions || []).join(', ')}</Text>
      {item.travelRadius && <Text style={s.meta}>📍 {item.travelRadius} mi radius</Text>}
      <TouchableOpacity style={s.msgBtn} onPress={() => handleMessage(item.uid)}>
        <Text style={s.msgText}>💬 Message</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <Text style={s.title}>🔍 Find Players</Text>

      <FlatList
        horizontal
        data={POSITIONS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.chip, filter === item && s.chipActive]}
            onPress={() => setFilter(item)}
          >
            <Text style={[s.chipText, filter === item && s.chipTextActive]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator color="#2563eb" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => item.uid}
          renderItem={renderPlayer}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={s.empty}>No free agents found for this position</Text>}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1a2e', paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', paddingHorizontal: 20, marginBottom: 16 },
  filterRow: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  chip: { backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#94a3b8', fontSize: 14 },
  chipTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#1e293b', borderRadius: 12, marginHorizontal: 20, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 17, fontWeight: '700', color: '#fff' },
  skill: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  positions: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  meta: { fontSize: 13, color: '#64748b', marginTop: 4 },
  msgBtn: { marginTop: 10, alignSelf: 'flex-start' },
  msgText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  empty: { color: '#475569', textAlign: 'center', marginTop: 40, fontSize: 15 },
});
