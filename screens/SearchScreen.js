import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated, FlatList,
    Image, LayoutAnimation, Modal, RefreshControl, StyleSheet, Text,
    TextInput, TouchableOpacity, View,
} from 'react-native';
import ErrorBanner from '../components/ErrorBanner';
import { normalizePosition, POSITIONS as POS_LIST } from '../components/FieldPositionPicker';
import { getOrCreateConversation, searchPlayers } from '../services/api';

const POSITIONS = ['All', ...POS_LIST.map(p => p.key)];

const SKILL_COLORS = {
  'Recreational': '#64748b',
  'Intermediate': '#3b82f6',
  'Competitive': '#8b5cf6',
  'Elite': '#f59e0b',
};

const SPRING_CONFIG = {
  duration: 400,
  create: { type: 'spring', property: 'opacity', springDamping: 0.7 },
  update: { type: 'spring', springDamping: 0.7 },
  delete: { type: 'spring', property: 'opacity', springDamping: 0.7 },
};

export default function SearchScreen({ navigation, route }) {
  const { user } = route.params;
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [activeOnly, setActiveOnly] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [distances, setDistances] = useState({});
  const zipCoordsCache = useRef({});

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
  const SkeletonCard = () => (
    <View style={[s.card, { gap: 12 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <SkeletonBlock width={48} height={48} style={{ borderRadius: 24 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonBlock width={120} height={16} />
          <SkeletonBlock width={80} height={12} />
        </View>
        <SkeletonBlock width={40} height={40} style={{ borderRadius: 20 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3].map(i => <SkeletonBlock key={i} width={60} height={24} style={{ borderRadius: 6 }} />)}
      </View>
    </View>
  );

  const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const geocodeZip = async (zip) => {
    if (zipCoordsCache.current[zip]) return zipCoordsCache.current[zip];
    try {
      const results = await Location.geocodeAsync(zip);
      if (results.length > 0) {
        zipCoordsCache.current[zip] = { latitude: results[0].latitude, longitude: results[0].longitude };
        return zipCoordsCache.current[zip];
      }
    } catch {}
    return null;
  };

  const computeDistances = useCallback(async (playerList) => {
    if (!user?.homeZip) return;
    const userCoords = await geocodeZip(user.homeZip);
    if (!userCoords) return;
    const distMap = {};
    for (const p of playerList) {
      if (p.homeZip && p.homeZip !== user.homeZip) {
        const pCoords = await geocodeZip(p.homeZip);
        if (pCoords) {
          distMap[p.uid] = Math.round(haversine(userCoords.latitude, userCoords.longitude, pCoords.latitude, pCoords.longitude));
        }
      } else if (p.homeZip === user.homeZip) {
        distMap[p.uid] = 0;
      }
    }
    setDistances(distMap);
  }, [user?.homeZip]);

  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const pos = filter === 'All' ? null : filter;
      const res = await searchPlayers(pos, activeOnly);
      const list = res.players || [];
      LayoutAnimation.configureNext(SPRING_CONFIG);
      setPlayers(list);
      computeDistances(list);
    } catch (e) {
      setError('Could not load players. Pull to refresh or tap Retry.');
    } finally {
      setLoading(false);
    }
  }, [filter, activeOnly, computeDistances]);

  useFocusEffect(useCallback(() => { if (user) load(); }, [load, user]));

  if (!user) return null;

  const onRefresh = () => { setRefreshing(true); load().finally(() => setRefreshing(false)); };

  const filteredPlayers = searchText.trim()
    ? players.filter((p) => (p.name || '').toLowerCase().includes(searchText.trim().toLowerCase()))
    : players;

  const handleMessage = async (otherUid) => {
    try {
      const res = await getOrCreateConversation(otherUid);
      navigation.navigate('Chat', { conversation: res.conversation, user });
    } catch (e) {
      Alert.alert('Error', 'Could not start conversation. Please try again.');
    }
  };

  const renderPlayer = ({ item }) => {
    const skillColor = SKILL_COLORS[item.skillLevel] || '#64748b';
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => { Haptics.selectionAsync(); navigation.navigate('PlayerProfile', { profileUid: item.uid, user }); }}
        activeOpacity={0.7}
      >
        <View style={s.cardTop}>
          <View style={s.avatarWrap}>
            {item.photoBase64 ? (
              <Image source={{ uri: `data:image/jpeg;base64,${item.photoBase64}` }} style={[s.avatarImg, item.activeNow && s.avatarActive]} />
            ) : (
              <View style={[s.avatar, item.activeNow && s.avatarActive]}>
                <Text style={s.avatarText}>{(item.name || '?')[0].toUpperCase()}</Text>
              </View>
            )}
            {item.activeNow && <View style={s.onlineDot} />}
          </View>
          <View style={s.cardInfo}>
            <Text style={s.name}>{item.name || 'Unknown'}</Text>
            <View style={s.metaRow}>
              {item.repScore > 0 && (
                <View style={[s.repBadge, item.repScore >= 70 ? s.repBadgeHigh : item.repScore >= 40 ? s.repBadgeMed : s.repBadgeLow]}>
                  <Ionicons name="shield-checkmark" size={11} color={item.repScore >= 70 ? '#10b981' : item.repScore >= 40 ? '#f59e0b' : '#64748b'} />
                  <Text style={[s.repText, { color: item.repScore >= 70 ? '#10b981' : item.repScore >= 40 ? '#f59e0b' : '#64748b' }]}>{item.repScore}</Text>
                </View>
              )}
              {item.skillLevel ? (
                <View style={[s.skillBadge, { backgroundColor: skillColor + '20' }]}>
                  <Text style={[s.skillText, { color: skillColor }]}>{item.skillLevel}</Text>
                </View>
              ) : null}
              {item.activeNow && (
                <View style={s.activeBadge}>
                  <View style={s.activeBadgeDot} />
                  <Text style={s.activeBadgeText}>Active</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity style={s.msgBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleMessage(item.uid); }}>
            <Ionicons name="chatbubble" size={18} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        {(item.positions || []).length > 0 && (
          <View style={s.posRow}>
            {item.positions.map((p) => (
              <View key={p} style={s.posChip}>
                <Text style={s.posChipText}>{normalizePosition(p)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.cardBottom}>
          {item.homeZip ? (
            <View style={s.infoTag}>
              <Ionicons name="location-outline" size={13} color="#64748b" />
              <Text style={s.infoTagText}>
                {distances[item.uid] !== undefined
                  ? (distances[item.uid] === 0 ? 'Same area' : `~${distances[item.uid]} mi`)
                  : `ZIP ${item.homeZip}`}
              </Text>
            </View>
          ) : null}
          {item.travelRadius ? (
            <View style={s.infoTag}>
              <Ionicons name="car-outline" size={13} color="#64748b" />
              <Text style={s.infoTagText}>{item.travelRadius} mi</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#0f172a', '#0a0e1a']} style={s.headerGradient}>
        <Text style={s.title}>Find Players</Text>
        <Text style={s.subtitle}>{filteredPlayers.length} free agent{filteredPlayers.length !== 1 ? 's' : ''} found</Text>
      </LinearGradient>

      {/* Search Bar */}
      <View style={s.searchBar}>
        <Ionicons name="search" size={18} color="#475569" />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name..."
          placeholderTextColor="#475569"
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={18} color="#475569" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Bar */}
      <View style={s.filterBar}>
        <TouchableOpacity
          style={s.filterSelector}
          onPress={() => { setShowPicker(true); Haptics.selectionAsync(); }}
          activeOpacity={0.7}
        >
          <Ionicons name="baseball-outline" size={16} color="#3b82f6" />
          <Text style={s.filterLabel}>{filter}</Text>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.activeFilter, activeOnly && s.activeFilterOn]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveOnly(!activeOnly); }}
          activeOpacity={0.7}
        >
          <View style={[s.activeFilterDot, activeOnly && s.activeFilterDotOn]} />
          <Text style={[s.activeFilterText, activeOnly && { color: '#10b981' }]}>Active</Text>
        </TouchableOpacity>
      </View>

      {/* Position Picker Modal */}
      <Modal visible={showPicker} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Filter by Position</Text>
            <View style={s.modalGrid}>
              {POSITIONS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[s.modalChip, filter === p && s.modalChipActive]}
                  onPress={() => { Haptics.selectionAsync(); setFilter(p); setShowPicker(false); }}
                >
                  <Text style={[s.modalChipText, filter === p && s.modalChipTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <ErrorBanner message={error} onRetry={load} onDismiss={() => setError(null)} />

      {loading ? (
        <View style={{ paddingTop: 8 }}>
          {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filteredPlayers}
          keyExtractor={(item) => item.uid}
          renderItem={renderPlayer}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="search-outline" size={48} color="#1e293b" />
              <Text style={s.emptyText}>No free agents found</Text>
              <Text style={s.emptySub}>Try a different position or check back later</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  headerGradient: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },

  // Search Bar
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#111827', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    marginHorizontal: 16, marginBottom: 4, borderWidth: 1, borderColor: '#1e293b',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#fff', paddingVertical: 4 },

  // Filter Bar
  filterBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  filterSelector: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#111827', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#1e293b',
  },
  filterLabel: { flex: 1, fontSize: 15, color: '#e2e8f0', fontWeight: '600' },
  activeFilter: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#111827', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#1e293b',
  },
  activeFilterOn: { borderColor: '#10b98140', backgroundColor: '#10b98108' },
  activeFilterDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#475569' },
  activeFilterDotOn: { backgroundColor: '#10b981' },
  activeFilterText: { fontSize: 14, color: '#64748b', fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000080' },
  modalSheet: {
    backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#334155',
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 20 },
  modalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modalChip: {
    backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: '#334155',
  },
  modalChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  modalChipText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  modalChipTextActive: { color: '#fff' },

  // Player Cards
  card: {
    backgroundColor: '#111827', borderRadius: 14, marginHorizontal: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#1e293b',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8,
    elevation: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: {
    width: 48, height: 48, borderRadius: 24,
  },
  avatarActive: { borderWidth: 2, borderColor: '#10b981' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  onlineDot: {
    position: 'absolute', bottom: 0, right: -2,
    width: 14, height: 14, borderRadius: 7, backgroundColor: '#10b981',
    borderWidth: 2.5, borderColor: '#111827',
  },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#e2e8f0' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  skillBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  skillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activeBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  activeBadgeText: { fontSize: 11, color: '#10b981', fontWeight: '600' },
  repBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  repBadgeHigh: { backgroundColor: '#10b98120' },
  repBadgeMed: { backgroundColor: '#f59e0b20' },
  repBadgeLow: { backgroundColor: '#64748b20' },
  repText: { fontSize: 11, fontWeight: '800' },
  msgBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#3b82f615',
    alignItems: 'center', justifyContent: 'center',
  },
  posRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  posChip: { backgroundColor: '#3b82f610', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  posChipText: { fontSize: 12, color: '#3b82f6', fontWeight: '600' },
  cardBottom: { flexDirection: 'row', gap: 12, marginTop: 10 },
  infoTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoTagText: { fontSize: 12, color: '#64748b' },

  // Empty
  emptyState: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { color: '#475569', fontSize: 16, fontWeight: '600' },
  emptySub: { color: '#334155', fontSize: 14 },
});
