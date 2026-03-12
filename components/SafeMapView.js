import { StyleSheet, Text, View } from 'react-native';

let RNMaps = null;
try {
  RNMaps = require('react-native-maps');
} catch (e) {
  console.warn('react-native-maps failed to load:', e);
}

const FallbackMap = (props) => (
  <View style={[styles.fallback, props.style]}>
    <Text style={styles.fallbackText}>Map unavailable</Text>
  </View>
);

const Noop = () => null;
const PassThrough = ({ children }) => <>{children}</>;

export const MapViewSafe = RNMaps?.default || FallbackMap;
export const Marker = RNMaps?.Marker || Noop;
export const Callout = RNMaps?.Callout || PassThrough;
export const Circle = RNMaps?.Circle || Noop;

export default MapViewSafe;

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
  },
  fallbackText: { color: '#64748b', fontSize: 14 },
});
