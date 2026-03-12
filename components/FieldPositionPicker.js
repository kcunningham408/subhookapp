import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Softball positions with abbreviated labels
export const POSITIONS = [
  { key: 'P', label: 'P', full: 'Pitcher' },
  { key: 'C', label: 'C', full: 'Catcher' },
  { key: '1B', label: '1B', full: '1st Base' },
  { key: '2B', label: '2B', full: '2nd Base' },
  { key: '3B', label: '3B', full: '3rd Base' },
  { key: 'SS', label: 'SS', full: 'Shortstop' },
  { key: 'LF', label: 'LF', full: 'Left Field' },
  { key: 'LCF', label: 'LC', full: 'Left Center' },
  { key: 'RCF', label: 'RC', full: 'Right Center' },
  { key: 'RF', label: 'RF', full: 'Right Field' },
];

export const POSITION_KEYS = POSITIONS.map(p => p.key);

// Map old full names to new abbreviated ones (for data migration)
export const LEGACY_MAP = {
  'Pitcher': 'P', 'Catcher': 'C', '1st Base': '1B', '2nd Base': '2B',
  '3rd Base': '3B', 'Shortstop': 'SS', 'Left Field': 'LF',
  'Center Field': 'LCF', 'Right Field': 'RF',
};
export const normalizePosition = (p) => LEGACY_MAP[p] || p;
export const normalizePositions = (arr) => (arr || []).map(normalizePosition);

// Field coordinates (percentage-based, origin top-left of field box)
// Diamond oriented with home plate at bottom center
const FIELD_SPOTS = {
  C:   { top: 88, left: 50 },   // catcher behind home plate
  P:   { top: 62, left: 50 },   // pitcher center of diamond
  '1B': { top: 55, left: 72 },  // first base right side
  '2B': { top: 40, left: 57 },  // second base upper right
  SS:  { top: 40, left: 43 },   // shortstop upper left
  '3B': { top: 55, left: 28 },  // third base left side
  LF:  { top: 18, left: 15 },   // left field far left
  LCF: { top: 10, left: 35 },   // left center
  RCF: { top: 10, left: 65 },   // right center
  RF:  { top: 18, left: 85 },   // right field far right
};

export default function FieldPositionPicker({ selected = [], onToggle, size = 300 }) {
  return (
    <View style={[styles.fieldWrap, { width: size, height: size }]}>
      {/* Field background */}
      <View style={styles.outfield}>
        <View style={styles.infield}>
          {/* Diamond lines */}
          <View style={styles.diamondLine1} />
          <View style={styles.diamondLine2} />
        </View>
      </View>

      {/* Position dots */}
      {POSITIONS.map((pos) => {
        const spot = FIELD_SPOTS[pos.key];
        const isSelected = selected.includes(pos.key);
        return (
          <TouchableOpacity
            key={pos.key}
            style={[
              styles.posBtn,
              { top: `${spot.top}%`, left: `${spot.left}%` },
              isSelected && styles.posBtnActive,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggle(pos.key);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.posLabel, isSelected && styles.posLabelActive]}>
              {pos.label}
            </Text>
            {isSelected && (
              <Ionicons name="checkmark" size={10} color="#fff" style={styles.checkIcon} />
            )}
          </TouchableOpacity>
        );
      })}

      {/* Home plate indicator */}
      <View style={styles.homePlate} />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: {
    position: 'relative',
    alignSelf: 'center',
    marginVertical: 8,
  },
  outfield: {
    position: 'absolute',
    top: 0, left: '10%', right: '10%', bottom: '5%',
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: '#16a34a18',
    borderWidth: 1,
    borderColor: '#16a34a30',
  },
  infield: {
    position: 'absolute',
    bottom: '20%',
    left: '25%',
    right: '25%',
    aspectRatio: 1,
    transform: [{ rotate: '45deg' }],
    borderWidth: 1,
    borderColor: '#f59e0b40',
    backgroundColor: '#f59e0b08',
  },
  diamondLine1: {
    position: 'absolute', top: '50%', left: 0, right: 0,
    height: 1, backgroundColor: '#f59e0b25',
  },
  diamondLine2: {
    position: 'absolute', left: '50%', top: 0, bottom: 0,
    width: 1, backgroundColor: '#f59e0b25',
  },
  homePlate: {
    position: 'absolute',
    bottom: '2%',
    left: '50%',
    marginLeft: -6,
    width: 12,
    height: 12,
    backgroundColor: '#f59e0b',
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  posBtn: {
    position: 'absolute',
    marginLeft: -20,
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  posBtnActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  posLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.3,
  },
  posLabelActive: {
    color: '#fff',
  },
  checkIcon: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#10b981',
    borderRadius: 6,
    width: 12,
    height: 12,
    textAlign: 'center',
    lineHeight: 12,
    overflow: 'hidden',
  },
});
