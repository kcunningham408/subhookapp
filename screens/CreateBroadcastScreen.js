import { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { createBroadcast } from '../services/api';

const POSITIONS = ['Pitcher', 'Catcher', '1st Base', '2nd Base', '3rd Base', 'Shortstop', 'Left Field', 'Center Field', 'Right Field'];

export default function CreateBroadcastScreen({ navigation, route }) {
  const { user } = route.params;
  const isManager = user.role === 'manager' || user.role === 'both';

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [positions, setPositions] = useState([]);
  const [locationName, setLocationName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (p) => {
    setPositions(positions.includes(p) ? positions.filter((x) => x !== p) : [...positions, p]);
  };

  const submit = async () => {
    if (!date.trim()) return Alert.alert('Date is required', 'When is the game?');
    setSaving(true);
    try {
      await createBroadcast({
        type: isManager ? 'manager' : 'player',
        date: date.trim(),
        time: time.trim(),
        positions,
        locationName: locationName.trim(),
        notes: notes.trim(),
      });
      Alert.alert('Posted!', 'Your broadcast is live.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>

        <Text style={s.title}>
          {isManager ? '📋 Post Sub Request' : '📣 Broadcast Availability'}
        </Text>
        <Text style={s.sub}>
          {isManager
            ? 'Let players know you need a sub'
            : 'Let managers know you\'re available'}
        </Text>

        <Text style={s.label}>Date *</Text>
        <TextInput style={s.input} placeholder="e.g. Friday 6/15" placeholderTextColor="#475569" value={date} onChangeText={setDate} />

        <Text style={s.label}>Time</Text>
        <TextInput style={s.input} placeholder="e.g. 7:00 PM" placeholderTextColor="#475569" value={time} onChangeText={setTime} />

        <Text style={s.label}>Positions {isManager ? 'Needed' : 'You Can Play'}</Text>
        <View style={s.chips}>
          {POSITIONS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[s.chip, positions.includes(p) && s.chipActive]}
              onPress={() => toggle(p)}
            >
              <Text style={[s.chipText, positions.includes(p) && s.chipTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Location / Field Name</Text>
        <TextInput style={s.input} placeholder="e.g. Central Park Field 3" placeholderTextColor="#475569" value={locationName} onChangeText={setLocationName} />

        <Text style={s.label}>Notes</Text>
        <TextInput
          style={[s.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Any extra details..."
          placeholderTextColor="#475569"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <TouchableOpacity style={s.btn} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Post Broadcast</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1a2e' },
  scroll: { padding: 20, paddingTop: 60 },
  back: { color: '#2563eb', fontSize: 16, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 6 },
  sub: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, marginTop: 16, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#334155',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#94a3b8', fontSize: 14 },
  chipTextActive: { color: '#fff' },
  btn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 28, marginBottom: 40 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
