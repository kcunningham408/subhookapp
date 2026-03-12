import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated, Dimensions, FlatList, LayoutAnimation, Platform, RefreshControl,
    ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View,
} from 'react-native';
import ErrorBanner from '../components/ErrorBanner';
import { normalizePosition } from '../components/FieldPositionPicker';
import { getActiveNow, getBroadcasts, setActiveNow } from '../services/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_W } = Dimensions.get('window');

const TAB_KEYS = ['subs', 'players', 'mine'];
const TAB_LABELS = { subs: 'Subs Needed', players: 'Available', mine: 'My Posts' };
const TAB_ICONS = { subs: 'megaphone', players: 'hand-right', mine: 'radio-outline' };
const TAB_COLORS = { subs: '#3b82f6', players: '#8b5cf6', mine: '#f59e0b' };

const SPRING_CONFIG = { duration: 300, update: { type: LayoutAnimation.Types.easeInEaseOut }, delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity } };

// ── Skeleton shimmer placeholder ──
function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  return (
    <View style={[s.card, { overflow: 'hidden' }]}>
      <Animated.View style={[s.cardAccent, { backgroundColor: '#1e293b', opacity }]} />
      <View style={s.cardInner}>
        <Animated.View style={{ height: 12, width: 100, backgroundColor: '#1e293b', borderRadius: 4, opacity }} />
        <Animated.View style={{ height: 16, width: 160, backgroundColor: '#1e293b', borderRadius: 4, marginTop: 8, opacity }} />
        <Animated.View style={{ height: 12, width: 200, backgroundColor: '#1e293b', borderRadius: 4, marginTop: 8, opacity }} />
        <Animated.View style={{ height: 12, width: 120, backgroundColor: '#1e293b', borderRadius: 4, marginTop: 8, opacity }} />
      </View>
    </View>
  );
}

function SkeletonLoading() {
  return (
    <View style={s.container}>
      <LinearGradient colors={['#0f172a', '#0a0e1a']} style={s.headerGradient}>
        <View style={{ height: 26, width: 180, backgroundColor: '#1e293b', borderRadius: 6 }} />
        <View style={{ height: 13, width: 140, backgroundColor: '#1e293b', borderRadius: 4, marginTop: 8 }} />
        <View style={[s.statsRow, { marginTop: 16 }]}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={s.statBox}>
              <View style={{ height: 20, width: 24, backgroundColor: '#1e293b', borderRadius: 4 }} />
              <View style={{ height: 10, width: 40, backgroundColor: '#1e293b', borderRadius: 3, marginTop: 6 }} />
            </View>
          ))}
        </View>
      </LinearGradient>
      <View style={{ paddingTop: 20 }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    </View>
  );
}

export default function DashboardScreen({ navigation, route }) {
  const { user, setUser } = route.params;
  const [myBroadcasts, setMyBroadcasts] = useState([]);
  const [feed, setFeed] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isActive, setIsActive] = useState(user?.activeNow || false);
  const [nearMeOnly, setNearMeOnly] = useState(false);
  const [myLocation, setMyLocation] = useState(null);
  const geocodeCache = useRef({});
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('subs');
  const [filterTonight, setFilterTonight] = useState(false);

  // Animations
  const fabScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for active indicator
  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isActive, pulseAnim]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [myRes, feedRes, activeRes] = await Promise.all([
        getBroadcasts(null, true),
        getBroadcasts(),
        getActiveNow(),
      ]);
      LayoutAnimation.configureNext(SPRING_CONFIG);
      setMyBroadcasts(myRes.broadcasts || []);
      setFeed((feedRes.broadcasts || []).filter(b => b.creatorId !== user?.uid));
      setActiveUsers(activeRes.active || []);
    } catch (e) {
      setError('Could not load dashboard. Pull to refresh or tap Retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useFocusEffect(useCallback(() => { if (user) load(); }, [load, user]));

  if (!user) return null;

  const onRefresh = () => { setRefreshing(true); load(); };

  const toggleActive = async () => {
    const next = !isActive;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsActive(next);
    try { await setActiveNow(next); } catch (e) { setIsActive(!next); }
  };

  const toggleNearMe = async () => {
    if (!nearMeOnly && !myLocation) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setMyLocation(loc.coords);
      for (const b of feed) {
        const addr = b.locationAddress || b.locationName;
        if (!addr || geocodeCache.current[b.id]) continue;
        try {
          const results = await Location.geocodeAsync(addr);
          if (results.length > 0) {
            geocodeCache.current[b.id] = { lat: results[0].latitude, lng: results[0].longitude };
          }
        } catch {}
      }
    }
    setNearMeOnly(!nearMeOnly);
  };

  // Haversine distance in miles
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const radiusMiles = parseInt(user?.travelRadius) || 25;

  // ── Filtered data per tab ──
  const applyFilters = (list) => {
    let out = list;
    if (nearMeOnly && myLocation) {
      out = out.filter(b => {
        const coords = b.location || geocodeCache.current[b.id];
        if (coords && coords.lat && coords.lng) {
          return getDistance(myLocation.latitude, myLocation.longitude, coords.lat, coords.lng) <= radiusMiles;
        }
        return true;
      });
    }
    if (filterTonight) {
      const todayShort = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
      out = out.filter(b => {
        const d = (b.date || '').toLowerCase();
        return d.includes('tonight') || d.includes('today') || d.includes(todayShort);
      });
    }
    return out;
  };

  const subsFeed = applyFilters(feed.filter(b => b.type === 'manager'));
  const playersFeed = applyFilters(feed.filter(b => b.type === 'player'));
  const myFeed = myBroadcasts;

  const currentFeed = activeTab === 'subs' ? subsFeed
    : activeTab === 'players' ? playersFeed
    : myFeed;

  // ── Quick stats ──
  const totalResponses = myBroadcasts.reduce((s, b) => s + (b.responses || []).length, 0);

  const statusColor = (status) => {
    if (status === 'confirmed') return '#10b981';
    if (status === 'expired' || status === 'closed' || status === 'cancelled') return '#ef4444';
    return '#f59e0b';
  };

  const timeAgo = (b) => {
    const ct = b.createdAt;
    if (!ct) return '';
    const ms = ct._seconds ? ct._seconds * 1000 : new Date(ct).getTime();
    const diff = Date.now() - ms;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  // ── Compact card ──
  const renderCard = ({ item }) => {
    const isMine = item.creatorId === user?.uid;
    const accent = item.type === 'player' ? '#8b5cf6' : '#3b82f6';
    const responses = (item.responses || []).length;

    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => navigation.navigate('BroadcastDetail', { broadcast: item, user })}
        activeOpacity={0.7}
      >
        {/* Left accent stripe */}
        <View style={[s.cardAccent, { backgroundColor: accent }]} />

        <View style={s.cardInner}>
          {/* Top row: type + status + time */}
          <View style={s.cardTopRow}>
            <View style={s.cardTopLeft}>
              <Ionicons
                name={item.type === 'player' ? 'hand-right' : 'megaphone'}
                size={13}
                color={accent}
              />
              <Text style={[s.cardTypeLabel, { color: accent }]}>
                {item.type === 'player' ? 'Available' : 'Sub Needed'}
              </Text>
            </View>
            <View style={s.cardTopRight}>
              <View style={[s.statusPill, { backgroundColor: statusColor(item.status) + '20' }]}>
                <View style={[s.statusDot, { backgroundColor: statusColor(item.status) }]} />
                <Text style={[s.statusText, { color: statusColor(item.status) }]}>
                  {item.status?.toUpperCase()}
                </Text>
              </View>
              <Text style={s.cardTime}>{timeAgo(item)}</Text>
            </View>
          </View>

          {/* Creator name */}
          <Text style={s.cardCreator}>{isMine ? 'You' : (item.creatorName || 'Unknown')}</Text>

          {/* Date + Location row */}
          <View style={s.cardMetaWrap}>
            <View style={s.cardMetaItem}>
              <Ionicons name="calendar-outline" size={13} color="#64748b" />
              <Text style={s.cardMeta}>{item.date}{item.time ? ` @ ${item.time}` : ''}</Text>
            </View>
            {item.locationName ? (
              <View style={s.cardMetaItem}>
                <Ionicons name="location-outline" size={13} color="#64748b" />
                <Text style={s.cardMeta} numberOfLines={1}>{item.locationName}</Text>
              </View>
            ) : null}
          </View>

          {/* Bottom row: positions + responses */}
          <View style={s.cardBottom}>
            <View style={s.positionRow}>
              {(item.positions || []).slice(0, 4).map((p) => (
                <View key={p} style={[s.posChip, { backgroundColor: accent + '15' }]}>
                  <Text style={[s.posChipText, { color: accent }]}>{normalizePosition(p)}</Text>
                </View>
              ))}
              {(item.positions || []).length > 4 && (
                <Text style={s.posMore}>+{item.positions.length - 4}</Text>
              )}
            </View>
            {responses > 0 && (
              <View style={s.responseBadge}>
                <Ionicons name="people" size={12} color="#94a3b8" />
                <Text style={s.responseText}>{responses}</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#334155" style={s.cardChevron} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <SkeletonLoading />;
  }

  return (
    <View style={s.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        contentContainerStyle={{ paddingBottom: 100 }}
        stickyHeaderIndices={[2]}
      >
        {/* ── Header ── */}
        <LinearGradient colors={['#0f172a', '#0a0e1a']} style={s.headerGradient}>
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Text style={s.greeting}>Hey {user.name?.split(' ')[0] || 'there'} <Text style={s.wave}>👋</Text></Text>
              <Text style={s.subGreeting}>
                {feed.length > 0
                  ? `${feed.length} broadcast${feed.length !== 1 ? 's' : ''} near you`
                  : 'No broadcasts yet — be the first!'}
              </Text>
            </View>
            <View style={s.headerActions}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Calendar')}
                style={s.headerBtn}
              >
                <Ionicons name="calendar-outline" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={s.statNum}>{myBroadcasts.length}</Text>
              <Text style={s.statLabel}>Active</Text>
            </View>
            <View style={[s.statDivider]} />
            <View style={s.statBox}>
              <Text style={[s.statNum, { color: '#10b981' }]}>{totalResponses}</Text>
              <Text style={s.statLabel}>Responses</Text>
            </View>
            <View style={[s.statDivider]} />
            <View style={s.statBox}>
              <Text style={[s.statNum, { color: '#8b5cf6' }]}>{activeUsers.length}</Text>
              <Text style={s.statLabel}>Online</Text>
            </View>
            <View style={[s.statDivider]} />
            <TouchableOpacity style={s.statBox} onPress={toggleActive} activeOpacity={0.7}>
              <View style={s.activeIndicatorWrap}>
                {isActive && (
                  <Animated.View style={[s.pulseRing, { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({ inputRange: [1, 1.4], outputRange: [0.6, 0] }) }]} />
                )}
                <View style={[s.activeIndicator, isActive && s.activeIndicatorOn]}>
                  <View style={[s.activeInnerDot, isActive && s.activeInnerDotOn]} />
                </View>
              </View>
              <Text style={[s.statLabel, isActive && { color: '#10b981' }]}>
                {isActive ? 'Active' : 'Go Live'}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── Active Users Row ── */}
        {activeUsers.length > 0 ? (
          <View style={s.activeSection}>
            <FlatList
              horizontal
              data={activeUsers}
              keyExtractor={(item) => item.uid}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              renderItem={({ item: activeItem }) => (
                <TouchableOpacity
                  style={s.activeChip}
                  onPress={() => navigation.navigate('PlayerProfile', { profileUid: activeItem.uid, user })}
                  activeOpacity={0.7}
                >
                  <View style={s.activeAvatar}>
                    <Text style={s.activeAvatarText}>{(activeItem.name || '?')[0].toUpperCase()}</Text>
                    <View style={s.onlineDot} />
                  </View>
                  <Text style={s.activeChipName} numberOfLines={1}>{activeItem.name?.split(' ')[0]}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        ) : <View />}

        {/* ── Sticky Tab Bar + Filters ── */}
        <View style={s.stickyBar}>
          <View style={s.tabBar}>
            {TAB_KEYS.map((key) => {
              const isOn = activeTab === key;
              const color = TAB_COLORS[key];
              const count = key === 'subs' ? subsFeed.length
                : key === 'players' ? playersFeed.length
                : myFeed.length;
              return (
                <TouchableOpacity
                  key={key}
                  style={[s.tab, isOn && { borderBottomColor: color, borderBottomWidth: 2 }]}
                  onPress={() => { LayoutAnimation.configureNext(SPRING_CONFIG); Haptics.selectionAsync(); setActiveTab(key); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name={TAB_ICONS[key]} size={16} color={isOn ? color : '#475569'} />
                  <Text style={[s.tabLabel, isOn && { color }]}>{TAB_LABELS[key]}</Text>
                  {count > 0 && (
                    <View style={[s.tabBadge, { backgroundColor: isOn ? color + '25' : '#1e293b' }]}>
                      <Text style={[s.tabBadgeText, { color: isOn ? color : '#64748b' }]}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Filters row */}
          <View style={s.filterRow}>
            <TouchableOpacity
              style={[s.filterChip, nearMeOnly && s.filterOn]}
              onPress={() => { Haptics.selectionAsync(); toggleNearMe(); }}
              activeOpacity={0.7}
            >
              <Ionicons name="location" size={13} color={nearMeOnly ? '#fff' : '#64748b'} />
              <Text style={[s.filterText, nearMeOnly && { color: '#fff' }]}>Near Me</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.filterChip, filterTonight && s.filterOnHot]}
              onPress={() => { LayoutAnimation.configureNext(SPRING_CONFIG); Haptics.selectionAsync(); setFilterTonight(!filterTonight); }}
              activeOpacity={0.7}
            >
              <Ionicons name="flame" size={13} color={filterTonight ? '#fff' : '#64748b'} />
              <Text style={[s.filterText, filterTonight && { color: '#fff' }]}>Tonight</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ErrorBanner message={error} onRetry={load} onDismiss={() => setError(null)} />

        {/* ── Feed ── */}
        {currentFeed.length > 0 ? (
          currentFeed.map((item) => (
            <View key={item.id}>{renderCard({ item })}</View>
          ))
        ) : (
          <View style={s.emptyState}>
            <Ionicons
              name={activeTab === 'mine' ? 'radio-outline' : 'baseball-outline'}
              size={52}
              color="#1e293b"
            />
            <Text style={s.emptyTitle}>
              {activeTab === 'mine' ? 'No active broadcasts' : activeTab === 'subs' ? 'No subs needed right now' : 'No players available'}
            </Text>
            <Text style={s.emptySub}>
              {activeTab === 'mine'
                ? 'Create one and find your next sub!'
                : 'Check back soon or widen your filters'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Floating Create Button ── */}
      <Animated.View style={[s.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          onPressIn={() => {
            Animated.spring(fabScale, { toValue: 0.88, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
          }}
          onPressOut={() => {
            Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 8 }).start();
          }}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('CreateBroadcast', { user }); }}
          activeOpacity={1}
        >
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.fabGradient}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  center: { flex: 1, backgroundColor: '#0a0e1a', justifyContent: 'center', alignItems: 'center' },

  // Header
  headerGradient: { paddingTop: 58, paddingBottom: 16, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  wave: { fontSize: 24 },
  subGreeting: { fontSize: 13, color: '#64748b', marginTop: 3 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#ffffff08',
    alignItems: 'center', justifyContent: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827',
    borderRadius: 14, marginTop: 16, paddingVertical: 14, paddingHorizontal: 4,
    borderWidth: 1, borderColor: '#1e293b',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: '#f1f5f9' },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  statDivider: { width: 1, height: 28, backgroundColor: '#1e293b' },
  activeIndicator: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center',
  },
  activeIndicatorOn: { backgroundColor: '#10b98125' },
  activeInnerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#475569' },
  activeInnerDotOn: { backgroundColor: '#10b981' },
  activeIndicatorWrap: { alignItems: 'center', justifyContent: 'center' },
  pulseRing: {
    position: 'absolute', width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: '#10b981',
  },

  // Active users
  activeSection: { paddingVertical: 12 },
  activeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#111827', borderRadius: 24, paddingRight: 14, paddingLeft: 4,
    paddingVertical: 4, borderWidth: 1, borderColor: '#10b98130',
  },
  activeAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center',
  },
  activeAvatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  onlineDot: {
    position: 'absolute', bottom: -1, right: -1,
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981',
    borderWidth: 2, borderColor: '#111827',
  },
  activeChipName: { fontSize: 13, fontWeight: '600', color: '#e2e8f0', maxWidth: 70 },

  // Sticky tab bar
  stickyBar: { backgroundColor: '#0a0e1a', paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  tabBar: {
    flexDirection: 'row', paddingHorizontal: 8,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 },
  tabBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 2 },
  tabBadgeText: { fontSize: 11, fontWeight: '700' },

  // Filters
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#111827', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: '#1e293b',
  },
  filterOn: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterOnHot: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  filterText: { color: '#64748b', fontSize: 12, fontWeight: '600' },

  // Cards
  card: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: '#111827', borderRadius: 14, marginHorizontal: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#1e293b',
    overflow: 'hidden',
  },
  cardAccent: { width: 4 },
  cardInner: { flex: 1, padding: 14, gap: 6 },
  cardChevron: { alignSelf: 'center', marginRight: 10 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTypeLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  cardTime: { fontSize: 11, color: '#475569' },
  cardCreator: { fontSize: 15, fontWeight: '700', color: '#e2e8f0' },
  cardMetaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMeta: { fontSize: 12, color: '#64748b', maxWidth: 140 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  positionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  posChip: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  posChipText: { fontSize: 11, fontWeight: '700' },
  posMore: { fontSize: 11, color: '#64748b', alignSelf: 'center' },
  responseBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  responseText: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },

  // Empty
  emptyState: { alignItems: 'center', marginTop: 50, gap: 8, paddingHorizontal: 40 },
  emptyTitle: { color: '#475569', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptySub: { color: '#334155', fontSize: 13, textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute', bottom: 28, right: 20,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
  },
});
