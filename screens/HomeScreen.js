import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { logout } from '../services/api';

export default function HomeScreen({ user, setUser }) {
  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚾ SubHook</Text>
      <Text style={styles.sub}>Hey {user?.name?.split(' ')[0] || 'there'} 👋</Text>
      <Text style={styles.sub}>More features coming soon.</Text>
      <TouchableOpacity style={styles.btn} onPress={handleLogout}>
        <Text style={styles.btnText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  sub: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 48,
  },
  btn: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
  },
});
