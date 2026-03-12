import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActionSheetIOS, Alert, AppState, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text,
    TextInput, TouchableOpacity, View,
} from 'react-native';
import { blockUser, getMessages, reportUser, sendMessage } from '../services/api';

export default function ChatScreen({ navigation, route }) {
  const { conversation, user } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const pollRef = useRef(null);

  const otherId = conversation.participants?.find((p) => p !== user.uid);
  const otherName = conversation.participantNames?.[otherId] || 'Unknown';

  const load = useCallback(async () => {
    try {
      const res = await getMessages(conversation.id);
      setMessages(res.messages || []);
    } catch (e) {
      console.warn('Load msgs error', e);
    }
  }, [conversation.id]);

  useEffect(() => {
    load();
    // Adaptive polling: 2s when app is active, 10s when backgrounded
    const FAST_INTERVAL = 2000;
    const SLOW_INTERVAL = 10000;
    let interval = FAST_INTERVAL;
    const startPolling = () => {
      clearInterval(pollRef.current);
      pollRef.current = setInterval(load, interval);
    };
    startPolling();
    const sub = AppState.addEventListener('change', (state) => {
      interval = state === 'active' ? FAST_INTERVAL : SLOW_INTERVAL;
      startPolling();
    });
    return () => { clearInterval(pollRef.current); sub.remove(); };
  }, [load]);

  const send = async (override) => {
    const trimmed = (override || text).trim();
    if (!trimmed || sending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSending(true);
    if (!override) setText('');
    try {
      await sendMessage(conversation.id, trimmed);
      await load();
    } catch (e) {
      console.warn('Send error', e);
    } finally {
      setSending(false);
    }
  };

  const QUICK_REPLIES = [
    { text: "I'm in", icon: 'checkmark-circle' },
    { text: 'Running late', icon: 'time' },
    { text: "Where's the field?", icon: 'location' },
  ];

  const handleBlockReport = () => {
    const options = ['Block User', 'Report User', 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 2, destructiveButtonIndex: 0 },
        (idx) => {
          if (idx === 0) {
            Alert.alert('Block User', `Block ${otherName}? They won\u2019t be able to message you.`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Block', style: 'destructive', onPress: async () => {
                try { await blockUser(otherId); Alert.alert('Blocked', 'User blocked.'); navigation.goBack(); }
                catch (e) { Alert.alert('Error', e.message); }
              }},
            ]);
          } else if (idx === 1) {
            Alert.alert('Report User', 'Why?', [
              { text: 'Spam', onPress: async () => { try { await reportUser(otherId, 'Spam'); Alert.alert('Reported', 'Thanks.'); } catch {} }},
              { text: 'Harassment', onPress: async () => { try { await reportUser(otherId, 'Harassment'); Alert.alert('Reported', 'Thanks.'); } catch {} }},
              { text: 'Cancel', style: 'cancel' },
            ]);
          }
        },
      );
    } else {
      Alert.alert('Options', '', [
        { text: 'Block User', style: 'destructive', onPress: async () => {
          try { await blockUser(otherId); Alert.alert('Blocked', 'User blocked.'); navigation.goBack(); }
          catch (e) { Alert.alert('Error', e.message); }
        }},
        { text: 'Report User', onPress: async () => {
          try { await reportUser(otherId, 'Inappropriate'); Alert.alert('Reported', 'Thanks.'); }
          catch {} }},
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const renderMsg = ({ item }) => {
    const isMe = item.senderId === user.uid;
    return (
      <View style={[s.bubbleWrap, isMe ? s.bubbleWrapMe : s.bubbleWrapThem]}>
        {!isMe && (
          <View style={s.msgAvatar}>
            <Text style={s.msgAvatarText}>{(item.senderName || '?').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
          {!isMe && <Text style={s.sender}>{item.senderName}</Text>}
          <Text style={[s.msgText, isMe && { color: '#fff' }]}>{item.text}</Text>
          <Text style={[s.timestamp, isMe && { color: '#ffffff80' }]}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#3b82f6" />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.headerProfile}
          onPress={() => navigation.navigate('PlayerProfile', { profileUid: otherId, user })}
          activeOpacity={0.7}
        >
          <View style={s.headerAvatar}>
            <Text style={s.headerAvatarText}>{otherName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerName}>{otherName}</Text>
            <Text style={s.headerSub}>Tap for player info</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#334155" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleBlockReport} style={{ padding: 8 }}>
          <Ionicons name="ellipsis-vertical" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMsg}
        contentContainerStyle={s.msgList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Quick Replies */}
      <View style={s.quickRow}>
        {QUICK_REPLIES.map((qr) => (
          <TouchableOpacity key={qr.text} style={s.quickBtn} onPress={() => send(qr.text)}>
            <Ionicons name={qr.icon} size={14} color="#3b82f6" />
            <Text style={s.quickText}>{qr.text}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Input */}
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="Type a message..."
          placeholderTextColor="#475569"
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity
          style={[s.sendBtn, text.trim() && s.sendBtnActive]}
          onPress={() => send()}
          disabled={sending || !text.trim()}
        >
          <Ionicons name="send" size={20} color={text.trim() ? '#fff' : '#475569'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 14,
    backgroundColor: '#111827', borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerProfile: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#3b82f620',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  headerAvatarText: { color: '#3b82f6', fontSize: 16, fontWeight: '700' },
  headerName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: '#3b82f6', marginTop: 1 },
  msgList: { padding: 16, paddingBottom: 8 },
  bubbleWrap: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  bubbleWrapMe: { justifyContent: 'flex-end' },
  bubbleWrapThem: { justifyContent: 'flex-start' },
  msgAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  msgAvatarText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  bubble: { maxWidth: '75%', borderRadius: 18, padding: 12, paddingBottom: 6 },
  bubbleMe: { backgroundColor: '#3b82f6', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#111827', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#1e293b' },
  sender: { fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: '600' },
  msgText: { color: '#e2e8f0', fontSize: 15, lineHeight: 21 },
  timestamp: { fontSize: 10, color: '#475569', marginTop: 4, alignSelf: 'flex-end' },
  quickRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 8, gap: 8, backgroundColor: '#111827' },
  quickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#0a0e1a', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: '#1e293b',
  },
  quickText: { color: '#94a3b8', fontSize: 13 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#111827', borderTopWidth: 1, borderTopColor: '#1e293b',
    paddingBottom: Platform.OS === 'ios' ? 34 : 10,
  },
  input: {
    flex: 1, backgroundColor: '#0a0e1a', borderRadius: 22, paddingHorizontal: 16,
    paddingVertical: 10, color: '#fff', fontSize: 15, maxHeight: 100,
    borderWidth: 1, borderColor: '#1e293b',
  },
  sendBtn: {
    marginLeft: 10, width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: '#3b82f6' },
});
