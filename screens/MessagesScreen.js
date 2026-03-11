import { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getConversations } from '../services/api';

export default function MessagesScreen({ navigation, route }) {
  const { user } = route.params;
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const res = await getConversations();
          setConversations(res.conversations || []);
        } catch (e) {
          console.warn('Load convos error', e);
        } finally {
          setLoading(false);
        }
      })();
    }, [])
  );

  const getOtherName = (convo) => {
    const otherId = convo.participants?.find((p) => p !== user.uid);
    return convo.participantNames?.[otherId] || 'Unknown';
  };

  const renderConvo = ({ item }) => (
    <TouchableOpacity
      style={s.card}
      onPress={() => navigation.navigate('Chat', { conversation: item, user })}
    >
      <View style={s.row}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{getOtherName(item).charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{getOtherName(item)}</Text>
          <Text style={s.preview} numberOfLines={1}>
            {item.lastMessage || 'No messages yet'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#2563eb" size="large" /></View>;
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>💬 Messages</Text>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConvo}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<Text style={s.empty}>No conversations yet</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1a2e', paddingTop: 60 },
  center: { flex: 1, backgroundColor: '#0f1a2e', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', paddingHorizontal: 20, marginBottom: 16 },
  card: {
    backgroundColor: '#1e293b', borderRadius: 12, marginHorizontal: 20, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  name: { fontSize: 16, fontWeight: '700', color: '#fff' },
  preview: { fontSize: 14, color: '#64748b', marginTop: 2 },
  empty: { color: '#475569', textAlign: 'center', marginTop: 40, fontSize: 15 },
});
