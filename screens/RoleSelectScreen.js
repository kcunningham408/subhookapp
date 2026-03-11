import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { updateUser } from '../services/api';

const ROLES = [
  { key: 'player', emoji: '⚾', label: 'Player', desc: "I'm looking to play" },
  { key: 'manager', emoji: '📋', label: 'Manager', desc: 'I need subs for my team' },
  { key: 'both', emoji: '🔄', label: 'Both', desc: 'I play and manage' },
];

export default function RoleSelectScreen({ navigation, route }) {
  const { user, setUser } = route.params;

  const pick = async (role) => {
    try {
      await updateUser({ role });
      const updated = { ...user, role };
      setUser(updated);
      navigation.replace('Onboarding', { user: updated, setUser });
    } catch (e) {
      console.warn('Role update failed', e);
    }
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>What's your role?</Text>
      <Text style={s.sub}>You can always change this later</Text>
      {ROLES.map((r) => (
        <TouchableOpacity key={r.key} style={s.card} onPress={() => pick(r.key)}>
          <Text style={s.emoji}>{r.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>{r.label}</Text>
            <Text style={s.desc}>{r.desc}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1a2e', justifyContent: 'center', padding: 28 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b',
    borderRadius: 12, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#334155',
  },
  emoji: { fontSize: 28, marginRight: 16 },
  label: { fontSize: 17, fontWeight: '700', color: '#fff' },
  desc: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
});
