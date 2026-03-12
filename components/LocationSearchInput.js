import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function LocationSearchInput({
  value,
  onSelect, // ({ name, address, latitude, longitude }) => void
  placeholder = 'Search for a field or address…',
}) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedCoord, setSelectedCoord] = useState(null);
  const mapRef = useRef(null);
  const debounceRef = useRef(null);

  const search = async (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 3) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        // geocodeAsync uses Apple Maps on iOS (CLGeocoder)
        const coords = await Location.geocodeAsync(text.trim());
        if (coords.length === 0) { setResults([]); setSearching(false); return; }

        // Reverse-geocode each result to get formatted addresses
        const resolved = [];
        for (const c of coords.slice(0, 5)) {
          try {
            const rev = await Location.reverseGeocodeAsync({ latitude: c.latitude, longitude: c.longitude });
            if (rev.length > 0) {
              const r = rev[0];
              const parts = [r.name, r.street, r.city, r.region, r.postalCode].filter(Boolean);
              resolved.push({
                name: r.name || text.trim(),
                address: parts.join(', '),
                latitude: c.latitude,
                longitude: c.longitude,
              });
            }
          } catch { /* skip bad results */ }
        }
        setResults(resolved);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const selectResult = (item) => {
    setQuery(item.address);
    setSelectedCoord(item);
    setResults([]);
    onSelect(item);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: item.latitude,
        longitude: item.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 400);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSelectedCoord(null);
    onSelect(null);
  };

  return (
    <View style={styles.wrap}>
      {/* Search input */}
      <View style={styles.inputRow}>
        <Ionicons name="search" size={16} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#475569"
          value={query}
          onChangeText={search}
          returnKeyType="search"
        />
        {searching && <ActivityIndicator size="small" color="#3b82f6" style={styles.spinner} />}
        {query.length > 0 && !searching && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Results dropdown */}
      {results.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={results}
            keyExtractor={(_, i) => String(i)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultRow} onPress={() => selectResult(item)}>
                <Ionicons name="location" size={16} color="#3b82f6" />
                <View style={styles.resultText}>
                  <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.resultAddr} numberOfLines={1}>{item.address}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Map preview when location selected */}
      {selectedCoord && (
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: selectedCoord.latitude,
              longitude: selectedCoord.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Marker
              coordinate={{ latitude: selectedCoord.latitude, longitude: selectedCoord.longitude }}
              pinColor="#3b82f6"
            />
          </MapView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    zIndex: 100,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 15,
  },
  spinner: {
    marginLeft: 8,
  },
  clearBtn: {
    marginLeft: 8,
    padding: 2,
  },
  dropdown: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a20',
  },
  resultText: {
    flex: 1,
    marginLeft: 10,
  },
  resultName: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
  },
  resultAddr: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  mapWrap: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    height: 150,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  map: {
    flex: 1,
  },
});
