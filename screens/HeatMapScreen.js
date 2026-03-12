import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import MapView, { Callout, Circle, Marker } from 'react-native-maps';
import { getBroadcasts } from '../services/api';

const TYPE_COLORS = {
  manager: { pin: '#ef4444', bg: '#fef2f2', ring: 'rgba(239,68,68,0.15)', label: 'Sub Needed' },
  player:  { pin: '#8b5cf6', bg: '#f5f3ff', ring: 'rgba(139,92,246,0.15)', label: 'Available' },
};

const DEFAULT_REGION = {
  latitude: 37.3382,
  longitude: -121.8863,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

export default function HeatMapScreen({ navigation, route }) {
  const { user } = route.params;
  const mapRef = useRef(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [filter, setFilter] = useState('all'); // 'all' | 'manager' | 'player'

  // Geocode cache to avoid repeated lookups
  const geocodeCache = useRef({});

  const geocode = async (addr) => {
    if (!addr) return null;
    if (geocodeCache.current[addr]) return geocodeCache.current[addr];
    try {
      const results = await Location.geocodeAsync(addr);
      if (results.length > 0) {
        const coords = { latitude: results[0].latitude, longitude: results[0].longitude };
        geocodeCache.current[addr] = coords;
        return coords;
      }
    } catch {}
    return null;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBroadcasts();
      const all = res.broadcasts || [];

      // Geocode all broadcasts in parallel
      const withCoords = await Promise.all(
        all.map(async (b) => {
          const addr = b.locationAddress || b.locationName;
          const coords = await geocode(addr);
          return coords ? { ...b, coords } : null;
        })
      );

      const valid = withCoords.filter(Boolean);
      setBroadcasts(valid);

      // Fit map to show all markers
      if (valid.length > 0 && mapRef.current) {
        const coords = valid.map((b) => b.coords);
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 120, right: 60, bottom: 120, left: 60 },
          animated: true,
        });
      }
    } catch (e) {
      Alert.alert('Error', 'Could not load map data. Try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = filter === 'all' ? broadcasts : broadcasts.filter((b) => b.type === filter);

  const managerCount = broadcasts.filter((b) => b.type === 'manager').length;
  const playerCount = broadcasts.filter((b) => b.type === 'player').length;

  return (
    <View style={s.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_REGION}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton={false}
        userInterfaceStyle="dark"
        mapType="mutedStandard"
      >
        {/* Heat circles behind markers */}
        {filtered.map((b) => (
          <Circle
            key={`ring-${b.id}`}
            center={b.coords}
            radius={800}
            fillColor={TYPE_COLORS[b.type]?.ring || 'rgba(59,130,246,0.1)'}
            strokeColor="transparent"
          />
        ))}

        {/* Markers */}
        {filtered.map((b) => {
          const colors = TYPE_COLORS[b.type] || TYPE_COLORS.manager;
          return (
            <Marker
              key={b.id}
              coordinate={b.coords}
              pinColor={colors.pin}
            >
              <View style={[s.markerWrap]}>
                <View style={[s.markerDot, { backgroundColor: colors.pin }]}>
                  <Ionicons
                    name={b.type === 'manager' ? 'megaphone' : 'hand-right'}
                    size={14}
                    color="#fff"
                  />
                </View>
              </View>
              <Callout
                tooltip
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('BroadcastDetail', { broadcast: b, user });
                }}
              >
                <View style={s.callout}>
                  <View style={[s.calloutBadge, { backgroundColor: colors.pin }]}>
                    <Text style={s.calloutBadgeText}>{colors.label}</Text>
                  </View>
                  <Text style={s.calloutTitle} numberOfLines={1}>
                    {b.creatorName || 'Player'}
                  </Text>
                  <Text style={s.calloutLocation} numberOfLines={1}>
                    {b.locationName || b.locationAddress || 'Unknown'}
                  </Text>
                  {b.positions?.length > 0 && (
                    <Text style={s.calloutPositions} numberOfLines={1}>
                      {b.positions.join(', ')}
                    </Text>
                  )}
                  <Text style={s.calloutDate}>
                    {b.date ? new Date(b.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''}
                    {b.time ? ` · ${b.time}` : ''}
                  </Text>
                  <Text style={s.calloutTap}>Tap for details →</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Top safe area header */}
      <View style={s.topBar}>
        <View style={s.topBarInner}>
          <Ionicons name="map" size={20} color="#3b82f6" />
          <Text style={s.topBarTitle}>Nearby Games</Text>
          {loading && <ActivityIndicator size="small" color="#3b82f6" style={{ marginLeft: 8 }} />}
        </View>
        <Text style={s.topBarSub}>
          {managerCount} sub {managerCount === 1 ? 'request' : 'requests'} · {playerCount} available
        </Text>
      </View>

      {/* Filter chips */}
      <View style={s.filterRow}>
        {[
          { key: 'all', label: 'All', icon: 'globe', count: broadcasts.length },
          { key: 'manager', label: 'Subs Needed', icon: 'megaphone', count: managerCount },
          { key: 'player', label: 'Available', icon: 'hand-right', count: playerCount },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter(f.key);
            }}
          >
            <Ionicons
              name={f.icon}
              size={13}
              color={filter === f.key ? '#fff' : '#94a3b8'}
              style={{ marginRight: 4 }}
            />
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>
              {f.label} ({f.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* My Location button */}
      <TouchableOpacity
        style={s.locationBtn}
        onPress={async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Location Permission', 'Please enable location access in Settings to use this feature.');
              return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            mapRef.current?.animateToRegion({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.15,
              longitudeDelta: 0.15,
            }, 500);
          } catch { Alert.alert('Error', 'Could not get your location.'); }
        }}
      >
        <Ionicons name="navigate" size={22} color="#3b82f6" />
      </TouchableOpacity>

      {/* Refresh button */}
      <TouchableOpacity
        style={s.refreshBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          load();
        }}
      >
        <Ionicons name="refresh" size={20} color="#3b82f6" />
      </TouchableOpacity>

      {/* Empty state */}
      {!loading && broadcasts.length === 0 && (
        <View style={s.emptyOverlay}>
          <View style={s.emptyCard}>
            <Ionicons name="map-outline" size={48} color="#475569" />
            <Text style={s.emptyTitle}>No Broadcasts Yet</Text>
            <Text style={s.emptySub}>
              When players post games or availability, they'll appear here on the map
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20, paddingBottom: 14,
    backgroundColor: 'rgba(10,14,26,0.92)',
  },
  topBarInner: { flexDirection: 'row', alignItems: 'center' },
  topBarTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginLeft: 8 },
  topBarSub: { fontSize: 13, color: '#64748b', marginTop: 4 },

  // Filter row
  filterRow: {
    position: 'absolute', top: Platform.OS === 'ios' ? 118 : 98,
    left: 0, right: 0,
    flexDirection: 'row', paddingHorizontal: 16, gap: 8,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(17,24,39,0.9)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#1e293b',
  },
  filterChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#fff' },

  // Markers
  markerWrap: { alignItems: 'center' },
  markerDot: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },

  // Callout
  callout: {
    backgroundColor: '#111827', borderRadius: 14, padding: 14,
    width: 220, borderWidth: 1, borderColor: '#1e293b',
  },
  calloutBadge: {
    alignSelf: 'flex-start', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  calloutBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  calloutTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  calloutLocation: { color: '#94a3b8', fontSize: 13, marginBottom: 4 },
  calloutPositions: { color: '#3b82f6', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  calloutDate: { color: '#64748b', fontSize: 12 },
  calloutTap: { color: '#3b82f6', fontSize: 11, fontWeight: '600', marginTop: 8 },

  // My location button
  locationBtn: {
    position: 'absolute', bottom: 110, right: 16,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(17,24,39,0.95)', borderWidth: 1, borderColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },

  // Refresh button
  refreshBtn: {
    position: 'absolute', bottom: 170, right: 16,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(17,24,39,0.95)', borderWidth: 1, borderColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },

  // Empty state
  emptyOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: 'rgba(17,24,39,0.95)', borderRadius: 20, padding: 32,
    alignItems: 'center', marginHorizontal: 40, borderWidth: 1, borderColor: '#1e293b',
  },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySub: { color: '#64748b', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
