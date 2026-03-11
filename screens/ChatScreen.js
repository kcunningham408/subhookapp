import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { getMessages, sendMessage } from '../services/api';

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
    // Poll every 5 seconds
    pollRef.current = setInterval(load, 5000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    try {
      await sendMessage(conversation.id, trimmed);
      await load();
    } catch (e) {
      console.warn('Send error', e);
    } finally {
      setSending(false);
    }
  };

  const renderMsg = ({ item }) => {
    const isMe = item.senderId === user.uid;
    return (
      <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
        {!isMe && <Text style={s.sender}>{item.senderName}</Text>}
        <Text style={s.msgText}>{item.text}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerName}>{otherName}</Text>
        <View style={{ width: 50 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMsg}
        contentContainerStyle={s.msgList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="Type a message..."
          placeholderTextColor="#475569"
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity style={s.sendBtn} onPress={send} disabled={sending}>
          <Text style={s.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1a2e' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 14,
    backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  back: { color: '#2563eb', fontSize: 16 },
  headerName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  msgList: { padding: 16, paddingBottom: 8 },
  bubble: { maxWidth: '80%', borderRadius: 14, padding: 12, marginBottom: 8 },
  bubbleMe: { backgroundColor: '#2563eb', alignSelf: 'flex-end' },
  bubbleThem: { backgroundColor: '#1e293b', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#334155' },
  sender: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  msgText: { color: '#fff', fontSize: 15 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#1e293b', borderTopWidth: 1, borderTopColor: '#334155',
    paddingBottom: Platform.OS === 'ios' ? 34 : 10,
  },
  input: {
    flex: 1, backgroundColor: '#0f1a2e', borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 10, color: '#fff', fontSize: 15, maxHeight: 100,
    borderWidth: 1, borderColor: '#334155',
  },
  sendBtn: { marginLeft: 10, paddingVertical: 10, paddingHorizontal: 16 },
  sendText: { color: '#2563eb', fontSize: 16, fontWeight: '700' },
});
