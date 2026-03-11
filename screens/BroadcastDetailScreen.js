import { useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import {
  cancelBroadcast, confirmBroadcast, getOrCreateConversation,
  respondToBroadcast,
} from '../services/api';

export default function BroadcastDetailScreen({ navigation, route }) {
  const { broadcast: initial, user } = route.params;
  const [broadcast, setBroadcast] = useState(initial);
  const [loading, setLoading] = useState(false);

  const isOwner = broadcast.creatorId === user.uid;
  const responses = broadcast.responses || [];
  const acceptedResponses = responses.filter((r) => r.action === 'accept');
  const alreadyResponded = responses.some((r) => r.userId === user.uid);

  const handleRespond = async (action) => {
    setLoading(true);
    try {
      await respondToBroadcast(broadcast.id, action);
      setBroadcast({
        ...broadcast,
        responses: [
          ...responses,
          { userId: user.uid, name: user.name, action, at: new Date().toISOString() },
        ],
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (responderId) => {
    setLoading(true);
    try {
      await confirmBroadcast(broadcast.id, responderId);
      setBroadcast({ ...broadcast, status: 'confirmed', confirmedUserId: responderId });
      Alert.alert('Confirmed!', 'The spot has been filled.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    Alert.alert('Cancel Broadcast', 'Are you sure?', [
      { text: 'No' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelBroadcast(broadcast.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handleMessage = async (otherUserId) => {
    try {
      const res = await getOrCreateConversation(otherUserId);
      navigation.navigate('Chat', { conversation: res.conversation, user });
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={s.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 20, paddingTop: 60 }}>
        <Text style={s.back}>← Back</Text>
      </TouchableOpacity>

      <View style={s.card}>
        <Text style={s.type}>{broadcast.type === 'player' ? '🙋 Player Available' : '📋 Sub Needed'}</Text>
        <Text style={s.creator}>{broadcast.creatorName || 'Unknown'}</Text>
        <Text style={s.meta}>{broadcast.date}{broadcast.time ? ` @ ${broadcast.time}` : ''}</Text>
        {broadcast.locationName ? <Text style={s.meta}>📍 {broadcast.locationName}</Text> : null}
        <Text style={s.positions}>{(broadcast.positions || []).join(', ') || 'Any position'}</Text>
        {broadcast.notes ? <Text style={s.notes}>{broadcast.notes}</Text> : null}

        <View style={s.statusRow}>
          <Text style={[s.status, broadcast.status === 'confirmed' && { color: '#22c55e' }]}>
            {broadcast.status?.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Respond buttons (non-owner, open broadcast) */}
      {!isOwner && broadcast.status === 'open' && !alreadyResponded && (
        <View style={s.actions}>
          <TouchableOpacity style={s.acceptBtn} onPress={() => handleRespond('accept')} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>✅ I'm Interested</Text>}
          </TouchableOpacity>
        </View>
      )}

      {!isOwner && alreadyResponded && (
        <Text style={s.responded}>You've already responded to this broadcast</Text>
      )}

      {/* Owner: see responses and confirm */}
      {isOwner && broadcast.status === 'open' && (
        <>
          <Text style={s.sectionTitle}>Responses ({acceptedResponses.length})</Text>
          <FlatList
            data={acceptedResponses}
            keyExtractor={(item, i) => item.userId + i}
            renderItem={({ item }) => (
              <View style={s.responderCard}>
                <Text style={s.responderName}>{item.name}</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity onPress={() => handleMessage(item.userId)}>
                    <Text style={s.msgBtn}>💬 Message</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleConfirm(item.userId)}>
                    <Text style={s.confirmBtn}>✅ Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={s.empty}>No responses yet</Text>}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
          <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
            <Text style={s.cancelText}>Cancel Broadcast</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Non-owner: option to message the creator */}
      {!isOwner && (
        <TouchableOpacity
          style={[s.acceptBtn, { marginHorizontal: 20, marginTop: 12, backgroundColor: '#1e293b' }]}
          onPress={() => handleMessage(broadcast.creatorId)}
        >
          <Text style={[s.btnText, { color: '#2563eb' }]}>💬 Message {broadcast.creatorName?.split(' ')[0]}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1a2e' },
  back: { color: '#2563eb', fontSize: 16 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, marginHorizontal: 20, padding: 20, borderWidth: 1, borderColor: '#334155' },
  type: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 6 },
  creator: { fontSize: 16, color: '#cbd5e1', marginBottom: 4 },
  meta: { fontSize: 14, color: '#64748b', marginBottom: 2 },
  positions: { fontSize: 14, color: '#2563eb', fontWeight: '600', marginTop: 8 },
  notes: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic', marginTop: 8 },
  statusRow: { marginTop: 12 },
  status: { fontSize: 13, fontWeight: '700', color: '#f59e0b' },
  actions: { paddingHorizontal: 20, marginTop: 20 },
  acceptBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  responded: { color: '#22c55e', textAlign: 'center', marginTop: 20, fontSize: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#94a3b8', paddingHorizontal: 20, marginTop: 24, marginBottom: 10 },
  responderCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1e293b', borderRadius: 10, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#334155',
  },
  responderName: { fontSize: 15, color: '#fff', fontWeight: '600' },
  msgBtn: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  confirmBtn: { color: '#22c55e', fontSize: 14, fontWeight: '600' },
  empty: { color: '#475569', textAlign: 'center', marginTop: 20 },
  cancelBtn: { marginHorizontal: 20, marginTop: 20, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
