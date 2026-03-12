import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
    ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { createBroadcast } from '../services/api';

const POSITIONS = ['Pitcher', 'Catcher', '1st Base', '2nd Base', '3rd Base', 'Shortstop', 'Left Field', 'Center Field', 'Right Field'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatDate = (d) => {
  if (!d) return '';
  return `${DAYS[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
};

const formatTime = (d) => {
  if (!d) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export default function CreateBroadcastScreen({ navigation, route }) {
  const { user } = route.params;

  const [broadcastType, setBroadcastType] = useState('manager'); // 'manager' = sub needed, 'player' = available
  const [dateObj, setDateObj] = useState(null);
  const [timeObj, setTimeObj] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [positions, setPositions] = useState([]);
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (p) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPositions(positions.includes(p) ? positions.filter((x) => x !== p) : [...positions, p]);
  };

  const submit = async () => {
    if (!dateObj) return Alert.alert('Date is required', 'When is the game?');
    setSaving(true);
    try {
      const res = await createBroadcast({
        type: broadcastType,
        date: formatDate(dateObj),
        time: formatTime(timeObj),
        positions,
        locationName: locationName.trim(),
        locationAddress: locationAddress.trim(),
        notes: notes.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Posted!', 'Your broadcast is live.', [
        {
          text: 'Share',
          onPress: async () => {
            try {
              const broadcastId = res?.broadcast?.id || res?.id || '';
              await Share.share({
                message: `Check out my SubHook broadcast! ${broadcastType === 'player' ? "I'm available to play" : "I need a sub"} on ${formatDate(dateObj)}${locationName ? ` at ${locationName}` : ''}. Open SubHook to respond!`,
                url: `subhook://broadcast/${broadcastId}`,
              });
            } catch {}
            navigation.goBack();
          },
        },
        { text: 'Done', onPress: () => navigation.goBack() },
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
        {/* Header */}
        <LinearGradient colors={['#1e293b', '#0a0e1a']} style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#3b82f6" />
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>
          <View style={s.headerIcon}>
            <Ionicons name="megaphone" size={28} color="#3b82f6" />
          </View>
          <Text style={s.title}>Create Broadcast</Text>
          <Text style={s.sub}>Post a sub request or broadcast your availability</Text>
        </LinearGradient>

        {/* Broadcast Type Toggle */}
        <Text style={s.label}>
          <Ionicons name="radio" size={12} color="#94a3b8" />  Broadcast Type *
        </Text>
        <View style={s.chips}>
          <TouchableOpacity
            style={[s.chip, broadcastType === 'manager' && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBroadcastType('manager'); }}
          >
            <Ionicons name="megaphone" size={14} color={broadcastType === 'manager' ? '#fff' : '#94a3b8'} style={{ marginRight: 4 }} />
            <Text style={[s.chipText, broadcastType === 'manager' && s.chipTextActive]}>Sub Needed</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.chip, broadcastType === 'player' && { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBroadcastType('player'); }}
          >
            <Ionicons name="hand-right" size={14} color={broadcastType === 'player' ? '#fff' : '#94a3b8'} style={{ marginRight: 4 }} />
            <Text style={[s.chipText, broadcastType === 'player' && s.chipTextActive]}>I'm Available</Text>
          </TouchableOpacity>
        </View>

        {/* Date & Time Row */}
        <View style={s.rowFields}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>
              <Ionicons name="calendar" size={12} color="#94a3b8" />  Date *
            </Text>
            <TouchableOpacity style={s.pickerBtn} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={18} color={dateObj ? '#3b82f6' : '#475569'} />
              <Text style={[s.pickerText, dateObj && s.pickerTextActive]}>
                {dateObj ? formatDate(dateObj) : 'Select date'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>
              <Ionicons name="time" size={12} color="#94a3b8" />  Time
            </Text>
            <TouchableOpacity style={s.pickerBtn} onPress={() => setShowTimePicker(true)}>
              <Ionicons name="time-outline" size={18} color={timeObj ? '#3b82f6' : '#475569'} />
              <Text style={[s.pickerText, timeObj && s.pickerTextActive]}>
                {timeObj ? formatTime(timeObj) : 'Select time'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <View style={s.pickerWrap}>
            <DateTimePicker
              value={dateObj || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              themeVariant="dark"
              onChange={(_, selected) => {
                if (Platform.OS === 'android') setShowDatePicker(false);
                if (selected) setDateObj(selected);
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={s.pickerDone} onPress={() => { if (!dateObj) setDateObj(new Date()); setShowDatePicker(false); }}>
                <Text style={s.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {showTimePicker && (
          <View style={s.pickerWrap}>
            <DateTimePicker
              value={timeObj || new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minuteInterval={5}
              themeVariant="dark"
              onChange={(_, selected) => {
                if (Platform.OS === 'android') setShowTimePicker(false);
                if (selected) setTimeObj(selected);
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={s.pickerDone} onPress={() => { if (!timeObj) setTimeObj(new Date()); setShowTimePicker(false); }}>
                <Text style={s.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Positions */}
        <Text style={s.label}>
          <Ionicons name="people" size={12} color="#94a3b8" />  Positions
        </Text>
        <View style={s.chips}>
          {POSITIONS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[s.chip, positions.includes(p) && s.chipActive]}
              onPress={() => toggle(p)}
            >
              {positions.includes(p) && <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginRight: 4 }} />}
              <Text style={[s.chipText, positions.includes(p) && s.chipTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {positions.length > 0 && (
          <Text style={s.chipCount}>{positions.length} position{positions.length !== 1 ? 's' : ''} selected</Text>
        )}

        {/* Location */}
        <Text style={s.label}>
          <Ionicons name="location" size={12} color="#94a3b8" />  Field / Location Name
        </Text>
        <TextInput style={s.input} placeholder="e.g. Central Park Field 3" placeholderTextColor="#475569" value={locationName} onChangeText={setLocationName} />

        <Text style={s.label}>
          <Ionicons name="navigate" size={12} color="#94a3b8" />  Address (for directions)
        </Text>
        <TextInput style={s.input} placeholder="e.g. 123 Main St, San Jose, CA" placeholderTextColor="#475569" value={locationAddress} onChangeText={setLocationAddress} />
        <Text style={s.hint}>Players can tap for turn-by-turn directions</Text>

        {/* Notes */}
        <Text style={s.label}>
          <Ionicons name="document-text" size={12} color="#94a3b8" />  Notes
        </Text>
        <TextInput
          style={[s.input, { height: 90, textAlignVertical: 'top', paddingTop: 14 }]}
          placeholder="Any extra details — skill level, what to bring, etc."
          placeholderTextColor="#475569"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {/* Submit */}
        <TouchableOpacity onPress={submit} disabled={saving} activeOpacity={0.8}>
          <LinearGradient colors={['#3b82f6', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.submitBtn}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="rocket" size={20} color="#fff" />
                <Text style={s.submitText}>Post Broadcast</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backText: { color: '#3b82f6', fontSize: 16, fontWeight: '600', marginLeft: 6 },
  headerIcon: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: '#3b82f620',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 6 },
  sub: { fontSize: 14, color: '#64748b' },
  rowFields: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, marginTop: 20, letterSpacing: 0.5, paddingHorizontal: 20 },
  input: {
    backgroundColor: '#111827', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#1e293b', marginHorizontal: 20,
  },
  hint: { fontSize: 12, color: '#475569', marginTop: 6, paddingHorizontal: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111827', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: '#1e293b',
  },
  chipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  chipCount: { fontSize: 12, color: '#3b82f6', marginTop: 8, paddingHorizontal: 20 },
  submitBtn: {
    borderRadius: 14, paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 20, marginTop: 28,
  },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#111827', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#1e293b', marginHorizontal: 20,
  },
  pickerText: { fontSize: 16, color: '#475569' },
  pickerTextActive: { color: '#fff' },
  pickerWrap: {
    backgroundColor: '#111827', borderRadius: 12, marginHorizontal: 20, marginTop: 8,
    overflow: 'hidden', borderWidth: 1, borderColor: '#1e293b',
  },
  pickerDone: { alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#1e293b' },
  pickerDoneText: { color: '#3b82f6', fontSize: 16, fontWeight: '700' },
});
