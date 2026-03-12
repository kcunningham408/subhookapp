import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList, Modal, RefreshControl, StyleSheet, Text,
    TextInput, TouchableOpacity, View,
} from 'react-native';
import ErrorBanner from '../components/ErrorBanner';
import { createTeam, deleteTeam, getMyTeams, inviteToTeam, leaveTeam, searchPlayers } from '../services/api';

export default function TeamsScreen({ navigation, route }) {
  const { user } = route.params;
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [manageTeam, setManageTeam] = useState(null);
  const [inviteSearch, setInviteSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

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
      const res = await getMyTeams();
      setTeams(res.teams || []);
    } catch (e) {
      setError('Could not load teams. Pull to refresh or tap Retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleCreate = async () => {
    if (!newName.trim()) return Alert.alert('Enter a team name');
    setCreating(true);
    try {
      await createTeam(newName.trim(), newColor.trim(), newDesc.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreate(false);
      setNewName(''); setNewColor(''); setNewDesc('');
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleLeave = (team) => {
    Alert.alert('Leave Team', `Leave ${team.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: async () => {
        try {
          await leaveTeam(team.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          load();
        } catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const handleDelete = (team) => {
    Alert.alert('Delete Team', `This will permanently delete ${team.name}. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteTeam(team.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          load();
        } catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const handleSearchPlayers = async (text) => {
    setInviteSearch(text);
    if (text.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await searchPlayers();
      const results = (res.players || []).filter(p =>
        p.uid !== user?.uid &&
        p.name?.toLowerCase().includes(text.toLowerCase()) &&
        !(manageTeam?.members || []).includes(p.uid)
      );
      setSearchResults(results.slice(0, 10));
    } catch { setSearchResults([]); Alert.alert('Error', 'Search failed. Try again.'); }
    finally { setSearching(false); }
  };

  const handleInvite = async (playerId) => {
    if (!manageTeam) return;
    try {
      await inviteToTeam(manageTeam.id, playerId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Invited!', 'Player added to team.');
      setInviteSearch('');
      setSearchResults([]);
      load();
      setManageTeam(null);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  if (loading) {
    return (
      <View style={s.container}>
        <LinearGradient colors={['#0f172a', '#0a0e1a']} style={s.header}>
          <View style={s.backBtn} />
          <View style={s.headerRow}>
            <Text style={s.title}>My Teams</Text>
          </View>
        </LinearGradient>
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {[1, 2, 3].map(i => (
            <View key={i} style={[s.card, { gap: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <SkeletonBlock width={18} height={18} style={{ borderRadius: 9 }} />
                <SkeletonBlock width={140} height={18} />
              </View>
              <SkeletonBlock width={200} height={13} />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <SkeletonBlock width={80} height={32} style={{ borderRadius: 8 }} />
                <SkeletonBlock width={80} height={32} style={{ borderRadius: 8 }} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <LinearGradient colors={['#0f172a', '#0a0e1a']} style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#3b82f6" />
        </TouchableOpacity>
        <View style={s.headerRow}>
          <Text style={s.title}>My Teams</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCreate(true); }}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ErrorBanner message={error} onRetry={load} onDismiss={() => setError(null)} />

      <FlatList
        data={teams}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#3b82f6" />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="shield-outline" size={48} color="#1e293b" />
            <Text style={s.emptyTitle}>No Teams Yet</Text>
            <Text style={s.emptySub}>Create a team and invite your regular players</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreate(true)}>
              <Ionicons name="add" size={18} color="#3b82f6" />
              <Text style={s.emptyBtnText}>Create Team</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const isOwner = item.ownerId === user?.uid;
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <View style={s.nameRow}>
                    <Ionicons name="shield" size={18} color="#f59e0b" />
                    <Text style={s.teamName}>{item.name}</Text>
                    {isOwner && (
                      <View style={s.ownerBadge}>
                        <Text style={s.ownerText}>Owner</Text>
                      </View>
                    )}
                  </View>
                  {item.color ? <Text style={s.teamColor}>Color: {item.color}</Text> : null}
                  {item.description ? <Text style={s.teamDesc}>{item.description}</Text> : null}
                </View>
              </View>

              <View style={s.membersRow}>
                <Ionicons name="people" size={14} color="#64748b" />
                <Text style={s.membersText}>
                  {(item.memberDetails || []).map(m => m.name).join(', ') || 'No members'}
                </Text>
                <View style={s.countBadge}>
                  <Text style={s.countText}>{(item.members || []).length}</Text>
                </View>
              </View>

              <View style={s.cardActions}>
                {isOwner ? (
                  <>
                    <TouchableOpacity style={s.actionBtn} onPress={() => { Haptics.selectionAsync(); setManageTeam(item); setInviteSearch(''); setSearchResults([]); }}>
                      <Ionicons name="settings-outline" size={16} color="#3b82f6" />
                      <Text style={s.actionText}>Manage</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, s.actionBtnDanger]} onPress={() => handleDelete(item)}>
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      <Text style={[s.actionText, { color: '#ef4444' }]}>Delete</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={[s.actionBtn, s.actionBtnDanger]} onPress={() => handleLeave(item)}>
                    <Ionicons name="exit-outline" size={16} color="#ef4444" />
                    <Text style={[s.actionText, { color: '#ef4444' }]}>Leave</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowCreate(false)}>
          <View style={s.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Create Team</Text>
            <TextInput style={s.modalInput} value={newName} onChangeText={setNewName}
              placeholder="Team Name *" placeholderTextColor="#475569" />
            <TextInput style={s.modalInput} value={newColor} onChangeText={setNewColor}
              placeholder="Team Color (optional)" placeholderTextColor="#475569" />
            <TextInput style={[s.modalInput, { height: 80, textAlignVertical: 'top', paddingTop: 14 }]}
              value={newDesc} onChangeText={setNewDesc} multiline
              placeholder="Description (optional)" placeholderTextColor="#475569" />
            <TouchableOpacity onPress={handleCreate} disabled={creating} activeOpacity={0.8}>
              <LinearGradient colors={['#3b82f6', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.modalBtn}>
                {creating ? <ActivityIndicator color="#fff" /> : (
                  <Text style={s.modalBtnText}>Create Team</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Manage Team Modal */}
      <Modal visible={!!manageTeam} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setManageTeam(null)}>
          <View style={s.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{manageTeam?.name}</Text>

            <Text style={s.manageLabel}>Members ({(manageTeam?.memberDetails || []).length})</Text>
            {(manageTeam?.memberDetails || []).map(m => (
              <View key={m.uid} style={s.memberRow}>
                <View style={s.memberAvatar}>
                  <Text style={s.memberAvatarText}>{(m.name || '?')[0].toUpperCase()}</Text>
                </View>
                <Text style={s.memberName}>{m.name}</Text>
                {m.uid === manageTeam?.ownerId && (
                  <View style={s.ownerBadge}><Text style={s.ownerText}>Owner</Text></View>
                )}
              </View>
            ))}

            <Text style={[s.manageLabel, { marginTop: 16 }]}>Invite Player</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Search by name..."
              placeholderTextColor="#475569"
              value={inviteSearch}
              onChangeText={handleSearchPlayers}
            />
            {searching && <ActivityIndicator color="#3b82f6" style={{ marginVertical: 8 }} />}
            {searchResults.map(p => (
              <TouchableOpacity key={p.uid} style={s.searchResult} onPress={() => handleInvite(p.uid)}>
                <View style={s.memberAvatar}>
                  <Text style={s.memberAvatarText}>{(p.name || '?')[0].toUpperCase()}</Text>
                </View>
                <Text style={s.memberName}>{p.name}</Text>
                <Ionicons name="add-circle" size={22} color="#10b981" />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  center: { flex: 1, backgroundColor: '#0a0e1a', justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20 },
  backBtn: { marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#fff' },
  addBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#3b82f6',
    alignItems: 'center', justifyContent: 'center',
  },
  card: {
    backgroundColor: '#111827', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#1e293b',
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  ownerBadge: { backgroundColor: '#f59e0b20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  ownerText: { fontSize: 11, color: '#f59e0b', fontWeight: '700' },
  teamColor: { fontSize: 13, color: '#64748b', marginTop: 4 },
  teamDesc: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  membersRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  membersText: { fontSize: 13, color: '#94a3b8', flex: 1 },
  countBadge: { backgroundColor: '#3b82f620', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  countText: { color: '#3b82f6', fontSize: 12, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 12 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 8, backgroundColor: '#1e293b',
  },
  actionBtnDanger: { backgroundColor: '#ef444410' },
  actionText: { fontSize: 13, fontWeight: '600', color: '#3b82f6' },
  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyTitle: { color: '#e2e8f0', fontSize: 18, fontWeight: '700', marginTop: 8 },
  emptySub: { color: '#64748b', fontSize: 14, textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#3b82f620',
  },
  emptyBtnText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#334155', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 20 },
  modalInput: {
    backgroundColor: '#0a0e1a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#1e293b', marginBottom: 12,
  },
  modalBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    justifyContent: 'center', marginTop: 8,
  },
  modalBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  manageLabel: { fontSize: 14, fontWeight: '700', color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  memberAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  memberName: { flex: 1, color: '#e2e8f0', fontSize: 15, fontWeight: '600' },
  searchResult: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
});
