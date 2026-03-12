import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Calendar from 'expo-calendar';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    FlatList,
    LayoutAnimation, Platform, RefreshControl, ScrollView, StyleSheet, Text,
    TouchableOpacity, View,
} from 'react-native';
import ErrorBanner from '../components/ErrorBanner';
import { normalizePosition, normalizePositions } from '../components/FieldPositionPicker';
import { getMyGames } from '../services/api';

const SPRING_CONFIG = {
  duration: 400,
  create: { type: 'spring', property: 'opacity', springDamping: 0.7 },
  update: { type: 'spring', springDamping: 0.7 },
  delete: { type: 'spring', property: 'opacity', springDamping: 0.7 },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Build 7-day strip starting from today
const buildDayStrip = () => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      key: `${d.getMonth() + 1}/${d.getDate()}`,
      label: i === 0 ? 'Today' : DAY_NAMES[d.getDay()],
      dateNum: d.getDate(),
      month: MONTH_NAMES[d.getMonth()],
    });
  }
  return days;
};

const addToCalendar = async (game) => {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Please allow calendar access to add games.');
    return;
  }
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const defaultCal = Platform.OS === 'ios'
    ? calendars.find(c => c.allowsModifications && c.source?.name === 'iCloud')
      || calendars.find(c => c.allowsModifications)
    : calendars.find(c => c.allowsModifications && c.isPrimary)
      || calendars.find(c => c.allowsModifications);
  if (!defaultCal) { Alert.alert('No Calendar', 'No writable calendar found.'); return; }

  const now = new Date();
  let startDate = new Date();
  const match = (game.date || '').match(/(\d{1,2})\/(\d{1,2})/);
  if (match) {
    startDate.setMonth(parseInt(match[1]) - 1);
    startDate.setDate(parseInt(match[2]));
    if (startDate < now) startDate.setFullYear(startDate.getFullYear() + 1);
  }
  if (game.time) {
    const tm = game.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (tm) {
      let h = parseInt(tm[1]);
      const m = parseInt(tm[2]);
      if (tm[3]?.toUpperCase() === 'PM' && h < 12) h += 12;
      if (tm[3]?.toUpperCase() === 'AM' && h === 12) h = 0;
      startDate.setHours(h, m, 0, 0);
    }
  } else { startDate.setHours(18, 0, 0, 0); }

  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  try {
    await Calendar.createEventAsync(defaultCal.id, {
      title: `SubHook: ${game.locationName || 'Softball Game'}`,
      startDate, endDate,
      location: game.locationAddress || game.locationName || '',
      notes: `Positions: ${normalizePositions(game.positions).join(', ')}\n${game.notes || ''}`.trim(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    Alert.alert('Added!', 'Game added to your calendar.');
  } catch { Alert.alert('Error', 'Could not add to calendar.'); }
};

const STATUS_CONFIG = {
  open: { color: '#3b82f6', icon: 'radio-button-on', label: 'OPEN' },
  confirmed: { color: '#10b981', icon: 'checkmark-circle', label: 'CONFIRMED' },
  expired: { color: '#ef4444', icon: 'close-circle', label: 'EXPIRED' },
  closed: { color: '#ef4444', icon: 'close-circle', label: 'CLOSED' },
};

export default function MyGamesScreen({ navigation, route }) {
  const { user } = route.params;
  const [created, setCreated] = useState([]);
  const [accepted, setAccepted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState('all');
  const dayStrip = useMemo(() => buildDayStrip(), []);

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

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await getMyGames();
      LayoutAnimation.configureNext(SPRING_CONFIG);
      setCreated(res.created || []);
      setAccepted(res.accepted || []);
    } catch {
      setError('Could not load your games. Pull to refresh or tap Retry.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { if (user) load(); }, [load, user]));

  // Combine + filter by selected day
  const allGames = useMemo(() => {
    return [
      ...created.map((g) => ({ ...g, _type: 'created' })),
      ...accepted.map((g) => ({ ...g, _type: 'accepted' })),
    ];
  }, [created, accepted]);

  const filteredGames = useMemo(() => {
    if (selectedDay === 'all') return allGames;
    return allGames.filter((g) => {
      const dateStr = g.date || '';
      return dateStr.includes(selectedDay);
    });
  }, [allGames, selectedDay]);

  // Count games per day for badges
  const countForDay = useCallback((dayKey) => {
    return allGames.filter(g => (g.date || '').includes(dayKey)).length;
  }, [allGames]);

  if (!user) return null;
  const onRefresh = () => { setRefreshing(true); load(); };

  const renderGame = ({ item }) => {
    const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.open;
    const isCreated = item._type === 'created';
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => { Haptics.selectionAsync(); navigation.navigate('BroadcastDetail', { broadcast: item, user }); }}
        activeOpacity={0.7}
      >
        <View style={s.cardHeader}>
          <View style={s.cardHeaderLeft}>
            <Ionicons name={isCreated ? 'megaphone' : 'checkmark-done'} size={16} color={isCreated ? '#8b5cf6' : '#10b981'} />
            <Text style={s.creatorText}>
              {isCreated ? 'You posted' : (item.creatorName || 'Unknown')}
            </Text>
          </View>
          <View style={[s.statusPill, { backgroundColor: sc.color + '20' }]}>
            <Ionicons name={sc.icon} size={12} color={sc.color} />
            <Text style={[s.statusLabel, { color: sc.color }]}>{sc.label}</Text>
          </View>
        </View>

        {/* Date + Time */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Ionicons name="calendar-outline" size={14} color="#64748b" />
            <Text style={s.metaText}>{item.date || 'TBD'}</Text>
          </View>
          {item.time ? (
            <View style={s.metaItem}>
              <Ionicons name="time-outline" size={14} color="#64748b" />
              <Text style={s.metaText}>{item.time}</Text>
            </View>
          ) : null}
        </View>

        {item.locationName ? (
          <View style={s.metaRow}>
            <Ionicons name="location-outline" size={14} color="#64748b" />
            <Text style={s.metaText}>{item.locationName}</Text>
          </View>
        ) : null}

        {(item.positions || []).length > 0 && (
          <View style={s.posRow}>
            {item.positions.map((p) => (
              <View key={p} style={s.posPill}>
                <Text style={s.posPillText}>{normalizePosition(p)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.cardFooter}>
          <TouchableOpacity
            style={s.calBtn}
            onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); addToCalendar(item); }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="calendar-outline" size={15} color="#3b82f6" />
            <Text style={s.calBtnText}>Add to Cal</Text>
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={16} color="#334155" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={s.container}>
        <LinearGradient colors={['#1e293b', '#0a0e1a']} style={s.header}>
          <Ionicons name="football" size={24} color="#3b82f6" />
          <Text style={s.title}>My Games</Text>
        </LinearGradient>
        <View style={{ paddingTop: 8 }}>
          {[1, 2, 3].map(i => (
            <View key={i} style={[s.card, { gap: 10 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <SkeletonBlock width={140} height={20} />
                <SkeletonBlock width={70} height={20} style={{ borderRadius: 8 }} />
              </View>
              <SkeletonBlock width={180} height={14} />
              <SkeletonBlock width={220} height={14} />
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                {[1, 2].map(j => <SkeletonBlock key={j} width={60} height={24} style={{ borderRadius: 8 }} />)}
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <LinearGradient colors={['#1e293b', '#0a0e1a']} style={s.header}>
        <Ionicons name="football" size={24} color="#3b82f6" />
        <Text style={s.title}>My Games</Text>
        <View style={s.countBadge}>
          <Text style={s.countText}>{allGames.length}</Text>
        </View>
      </LinearGradient>

      {/* Day strip */}
      <View style={s.dayStripWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dayStrip}>
          <TouchableOpacity
            style={[s.dayChip, selectedDay === 'all' && s.dayChipActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); LayoutAnimation.configureNext(SPRING_CONFIG); setSelectedDay('all'); }}
          >
            <Text style={[s.dayLabel, selectedDay === 'all' && s.dayLabelActive]}>All</Text>
            <Text style={[s.dayCount, selectedDay === 'all' && s.dayCountActive]}>{allGames.length}</Text>
          </TouchableOpacity>
          {dayStrip.map((d) => {
            const ct = countForDay(d.key);
            const active = selectedDay === d.key;
            return (
              <TouchableOpacity
                key={d.key}
                style={[s.dayChip, active && s.dayChipActive]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); LayoutAnimation.configureNext(SPRING_CONFIG); setSelectedDay(d.key); }}
              >
                <Text style={[s.dayLabel, active && s.dayLabelActive]}>{d.label}</Text>
                <Text style={[s.dayNum, active && s.dayNumActive]}>{d.dateNum}</Text>
                {ct > 0 && <View style={[s.dayDot, active && s.dayDotActive]}><Text style={s.dayDotText}>{ct}</Text></View>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ErrorBanner message={error} onRetry={load} onDismiss={() => setError(null)} />

      <FlatList
        data={filteredGames}
        keyExtractor={(item) => item.id}
        renderItem={renderGame}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        contentContainerStyle={{ paddingBottom: 30, paddingTop: 8 }}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Ionicons name="football-outline" size={48} color="#1e293b" />
            <Text style={s.empty}>
              {selectedDay === 'all' ? 'No games yet' : 'No games this day'}
            </Text>
            <Text style={s.emptySub}>Create or respond to a broadcast to see your games here</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  countBadge: {
    backgroundColor: '#3b82f620', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  countText: { color: '#3b82f6', fontSize: 13, fontWeight: '700' },

  // Day strip
  dayStripWrap: {
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
    backgroundColor: '#0a0e1a',
  },
  dayStrip: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  dayChip: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    backgroundColor: '#111827', borderWidth: 1, borderColor: '#1e293b',
    minWidth: 52,
  },
  dayChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  dayLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', textTransform: 'uppercase' },
  dayLabelActive: { color: '#fff' },
  dayNum: { fontSize: 18, fontWeight: '800', color: '#94a3b8', marginTop: 2 },
  dayNumActive: { color: '#fff' },
  dayCount: { fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 2 },
  dayCountActive: { color: '#fff' },
  dayDot: {
    backgroundColor: '#3b82f620', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, marginTop: 4,
  },
  dayDotActive: { backgroundColor: '#ffffff30' },
  dayDotText: { fontSize: 10, fontWeight: '700', color: '#3b82f6' },

  // Cards
  card: {
    backgroundColor: '#111827', borderRadius: 14, marginHorizontal: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#1e293b',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  creatorText: { fontSize: 15, fontWeight: '700', color: '#e2e8f0' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  statusLabel: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 14, color: '#94a3b8' },
  posRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  posPill: { backgroundColor: '#3b82f615', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  posPillText: { fontSize: 12, color: '#3b82f6', fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1e293b' },
  calBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3b82f615', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  calBtnText: { fontSize: 11, fontWeight: '700', color: '#3b82f6' },
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  empty: { color: '#475569', fontSize: 16, fontWeight: '600', marginTop: 14 },
  emptySub: { color: '#334155', fontSize: 13, marginTop: 4 },
});
