import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { updateUser } from '../services/api';

const ROLES = [
  { key: 'player', icon: 'baseball', color: '#3b82f6', label: 'Player', desc: "I'm looking to play" },
  { key: 'manager', icon: 'clipboard', color: '#8b5cf6', label: 'Manager', desc: 'I need subs for my team' },
  { key: 'both', icon: 'swap-horizontal', color: '#10b981', label: 'Both', desc: 'I play and manage' },
];

export default function RoleSelectScreen({ navigation, route }) {
  const { user, setUser } = route.params;

  const pick = async (role) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateUser({ role });
      setUser({ ...user, role });
      navigation.navigate('Onboarding');
    } catch (e) {
      console.warn('Role update failed', e);
    }
  };

  return (
    <LinearGradient colors={['#111827', '#0a0e1a']} style={s.container}>
      <View style={s.headerIcon}>
        <Ionicons name="baseball" size={32} color="#3b82f6" />
      </View>
      <Text style={s.title}>What's your role?</Text>
      <Text style={s.sub}>You can always change this later</Text>
      {ROLES.map((r) => (
        <TouchableOpacity key={r.key} style={s.card} onPress={() => pick(r.key)} activeOpacity={0.7}>
          <View style={[s.iconWrap, { backgroundColor: r.color + '20' }]}>
            <Ionicons name={r.icon} size={24} color={r.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>{r.label}</Text>
            <Text style={s.desc}>{r.desc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#334155" />
        </TouchableOpacity>
      ))}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 28 },
  headerIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: '#3b82f615',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827',
    borderRadius: 14, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#1e293b',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8,
    elevation: 4,
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  label: { fontSize: 17, fontWeight: '700', color: '#fff' },
  desc: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
});
