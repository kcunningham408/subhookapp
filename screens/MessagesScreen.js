import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text,
    TouchableOpacity, View,
} from 'react-native';
import ErrorBanner from '../components/ErrorBanner';
import { getConversations } from '../services/api';

export default function MessagesScreen({ navigation, route }) {
  const { user } = route.params;
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await getConversations();
      setConversations(res.conversations || []);
    } catch (e) {
      setError('Could not load messages. Pull to refresh or tap Retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) load();
    }, [load, user])
  );

  if (!user) return null;

  const getOtherName = (convo) => {
    const otherId = convo.participants?.find((p) => p !== user.uid);
    return convo.participantNames?.[otherId] || 'Unknown';
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderConvo = ({ item }) => (
    <TouchableOpacity
      style={s.card}
      onPress={() => navigation.navigate('Chat', { conversation: item, user })}
      activeOpacity={0.7}
    >
      <View style={s.row}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{getOtherName(item).charAt(0).toUpperCase()}</Text>
          {(item.unreadCount || 0) > 0 && (
            <View style={s.unreadDot}>
              <Text style={s.unreadDotText}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.nameRow}>
            <Text style={[s.name, (item.unreadCount || 0) > 0 && { color: '#fff' }]}>{getOtherName(item)}</Text>
            <Text style={s.time}>{formatTime(item.updatedAt)}</Text>
          </View>
          <Text style={[s.preview, (item.unreadCount || 0) > 0 && { color: '#94a3b8', fontWeight: '600' }]} numberOfLines={1}>
            {item.lastMessage || 'No messages yet'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#334155" style={{ marginLeft: 8 }} />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;
  }

  return (
    <View style={s.container}>
      <LinearGradient colors={['#1e293b', '#0a0e1a']} style={s.header}>
        <Ionicons name="chatbubbles" size={24} color="#3b82f6" />
        <Text style={s.title}>Messages</Text>
        {conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0) > 0 && (
          <View style={[s.badge, { backgroundColor: '#ef444420' }]}>
            <Text style={[s.badgeText, { color: '#ef4444' }]}>
              {conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}
            </Text>
          </View>
        )}
      </LinearGradient>
      <ErrorBanner message={error} onRetry={load} onDismiss={() => setError(null)} />
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConvo}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#3b82f6" />}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color="#1e293b" />
            <Text style={s.empty}>No conversations yet</Text>
            <Text style={s.emptySub}>Message a player or manager to get started</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  center: { flex: 1, backgroundColor: '#0a0e1a', justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  badge: {
    backgroundColor: '#3b82f620', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  badgeText: { color: '#3b82f6', fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: '#111827', borderRadius: 14, marginHorizontal: 16, padding: 16,
    marginBottom: 8, borderWidth: 1, borderColor: '#1e293b',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8,
    elevation: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#3b82f620',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarText: { color: '#3b82f6', fontSize: 19, fontWeight: '700' },
  unreadDot: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, borderWidth: 2, borderColor: '#111827',
  },
  unreadDotText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: '#fff' },
  time: { fontSize: 12, color: '#475569' },
  preview: { fontSize: 14, color: '#64748b', marginTop: 3 },
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  empty: { color: '#475569', fontSize: 16, fontWeight: '600', marginTop: 14 },
  emptySub: { color: '#334155', fontSize: 13, marginTop: 4 },
});
