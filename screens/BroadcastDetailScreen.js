import { Ionicons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert,
    Linking, Platform, RefreshControl, ScrollView,
    StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import MapView, { Marker } from '../components/SafeMapView';
import { normalizePosition, normalizePositions } from '../components/FieldPositionPicker';
import {
    addComment, addToRoster, cancelBroadcast, closeBroadcast, confirmAttendance,
    confirmBroadcast, getBroadcast, getComments, getOrCreateConversation, removeFromRoster,
    respondToBroadcast, sendGameReminder,
} from '../services/api';

export default function BroadcastDetailScreen({ navigation, route }) {
  const { broadcast: initial, user, broadcastId: paramId } = route.params || {};
  const [broadcast, setBroadcast] = useState(initial || null);
  const [loading, setLoading] = useState(!initial);
  const [refreshing, setRefreshing] = useState(false);
  const [responding, setResponding] = useState(false);
  const [mapCoords, setMapCoords] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Fetch broadcast if only ID was provided (deep link)
  useEffect(() => {
    if (!initial && paramId) {
      (async () => {
        try {
          const res = await getBroadcast(paramId);
          setBroadcast(res.broadcast);
        } catch (e) {
          Alert.alert('Error', 'Could not load broadcast.');
          navigation.goBack();
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [initial, paramId]);

  // Use stored coordinates if available, otherwise geocode
  useEffect(() => {
    if (!broadcast) return;
    if (broadcast.latitude && broadcast.longitude) {
      setMapCoords({ latitude: broadcast.latitude, longitude: broadcast.longitude });
      return;
    }
    let cancelled = false;
    const geocode = async () => {
      const addr = broadcast.locationAddress || broadcast.locationName;
      if (!addr) return;
      setGeocoding(true);
      try {
        const results = await Location.geocodeAsync(addr);
        if (!cancelled && results.length > 0) {
          setMapCoords({ latitude: results[0].latitude, longitude: results[0].longitude });
        }
      } catch (e) {
        console.warn('Geocode failed', e);
      } finally {
        if (!cancelled) setGeocoding(false);
      }
    };
    geocode();
    return () => { cancelled = true; };
  }, [broadcast?.locationAddress, broadcast?.locationName, broadcast?.latitude, broadcast?.longitude]);

  // Load comments on mount
  useEffect(() => {
    if (broadcast?.id) {
      getComments(broadcast.id).then(res => setComments(res.comments || [])).catch(() => {});
    }
  }, [broadcast?.id]);

  if (loading || !broadcast) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0e1a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  const isOwner = broadcast.creatorId === user?.uid;
  const responses = broadcast.responses || [];
  const acceptedResponses = responses.filter((r) => r.action === 'accept');
  const alreadyResponded = responses.some((r) => r.userId === user?.uid);
  const roster = broadcast.roster || [];
  const waitlist = broadcast.waitlist || [];
  const myRosterEntry = roster.find(r => r.userId === user?.uid);
  const onWaitlist = waitlist.some(r => r.userId === user?.uid);
  const isExpired = broadcast.status === 'expired' || broadcast.status === 'closed' || broadcast.status === 'cancelled';
  const expiresAt = broadcast.expiresAt ? new Date(broadcast.expiresAt) : null;

  const statusColor = (status) => {
    if (status === 'confirmed') return '#10b981';
    if (status === 'expired' || status === 'closed' || status === 'cancelled') return '#ef4444';
    return '#f59e0b';
  };

  const refresh = async () => {
    try {
      const [bRes, cRes] = await Promise.all([
        getBroadcast(broadcast.id),
        getComments(broadcast.id),
      ]);
      setBroadcast(bRes.broadcast);
      setComments(cRes.comments || []);
    } catch (e) {
      Alert.alert('Error', 'Could not refresh. Please try again.');
    }
  };

  const handlePostComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || postingComment) return;
    setPostingComment(true);
    try {
      await addComment(broadcast.id, trimmed);
      setCommentText('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const res = await getComments(broadcast.id);
      setComments(res.comments || []);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setPostingComment(false);
    }
  };

  const handleRespond = async (action) => {
    setResponding(true);
    try {
      await respondToBroadcast(broadcast.id, action);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBroadcast({
        ...broadcast,
        responses: [
          ...responses,
          { userId: user?.uid, name: user?.name, action, at: new Date().toISOString() },
        ],
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setResponding(false);
    }
  };

  const handleAddToRoster = async (userId, slot) => {
    if (rosterLoading) return;
    setRosterLoading(true);
    try {
      const res = await addToRoster(broadcast.id, userId, slot);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBroadcast({ ...broadcast, roster: res.roster, waitlist: res.waitlist });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setRosterLoading(false);
    }
  };

  const handleRemoveFromRoster = async (userId) => {
    if (rosterLoading) return;
    setRosterLoading(true);
    try {
      const res = await removeFromRoster(broadcast.id, userId);
      setBroadcast({ ...broadcast, roster: res.roster, waitlist: res.waitlist });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setRosterLoading(false);
    }
  };

  const handleConfirmAttendance = async () => {
    Alert.alert(
      "Confirm you'll be there",
      "You're committing to show up. Better not bail! \u{1F525}",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: "I'll be there! \u26be",
          onPress: async () => {
            try {
              const res = await confirmAttendance(broadcast.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setBroadcast({ ...broadcast, roster: res.roster });
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const handleSendReminder = async () => {
    if (rosterLoading) return;
    setRosterLoading(true);
    try {
      const res = await sendGameReminder(broadcast.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Reminder Sent!', `Notified ${res.reminded} player(s): "Better not bail!" 🔥`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setRosterLoading(false);
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

  const handleClose = async () => {
    Alert.alert('Close Broadcast', 'Mark as filled/closed?', [
      { text: 'No' },
      {
        text: 'Yes, Close',
        onPress: async () => {
          try {
            await closeBroadcast(broadcast.id);
            setBroadcast({ ...broadcast, status: 'closed' });
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

  const openDirections = () => {
    const address = broadcast.locationAddress || broadcast.locationName || '';
    const hasCoords = broadcast.latitude && broadcast.longitude;
    if (!address && !hasCoords) return Alert.alert('No Location', 'This broadcast has no location set.');
    let url;
    if (hasCoords) {
      const ll = `${broadcast.latitude},${broadcast.longitude}`;
      const label = encodeURIComponent(broadcast.locationName || address);
      url = Platform.select({
        ios: `maps://maps.apple.com/?daddr=${ll}&q=${label}`,
        android: `geo:${ll}?q=${ll}(${label})`,
        default: `https://maps.apple.com/?daddr=${ll}`,
      });
    } else {
      const encoded = encodeURIComponent(address);
      url = Platform.select({
        ios: `maps://maps.apple.com/?daddr=${encoded}`,
        android: `geo:0,0?q=${encoded}`,
        default: `https://maps.apple.com/?daddr=${encoded}`,
      });
    }
    Linking.openURL(url).catch(() => {
      const fallback = hasCoords
        ? `https://maps.apple.com/?daddr=${broadcast.latitude},${broadcast.longitude}`
        : `https://maps.apple.com/?daddr=${encodeURIComponent(address)}`;
      Linking.openURL(fallback);
    });
  };

  const handleAddToCalendar = async () => {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow calendar access.');
      return;
    }
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const defaultCal = Platform.OS === 'ios'
      ? calendars.find(c => c.allowsModifications && c.source?.name === 'iCloud') || calendars.find(c => c.allowsModifications)
      : calendars.find(c => c.allowsModifications && c.isPrimary) || calendars.find(c => c.allowsModifications);
    if (!defaultCal) { Alert.alert('No Calendar', 'No writable calendar found.'); return; }

    let startDate = new Date();
    const dateStr = broadcast.date || '';
    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
    if (match) {
      startDate.setMonth(parseInt(match[1]) - 1);
      startDate.setDate(parseInt(match[2]));
      if (startDate < new Date()) startDate.setFullYear(startDate.getFullYear() + 1);
    }
    if (broadcast.time) {
      const tm = broadcast.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (tm) {
        let h = parseInt(tm[1]);
        if (tm[3]?.toUpperCase() === 'PM' && h < 12) h += 12;
        if (tm[3]?.toUpperCase() === 'AM' && h === 12) h = 0;
        startDate.setHours(h, parseInt(tm[2]), 0, 0);
      }
    } else { startDate.setHours(18, 0, 0, 0); }
    const endDate = new Date(startDate.getTime() + 2 * 3600000);

    try {
      await Calendar.createEventAsync(defaultCal.id, {
        title: `SubHook: ${broadcast.locationName || 'Softball Game'}`,
        startDate, endDate,
        location: broadcast.locationAddress || broadcast.locationName || '',
        notes: `Positions: ${normalizePositions(broadcast.positions).join(', ')}\n${broadcast.notes || ''}`.trim(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      Alert.alert('Added!', 'Game added to your calendar.');
    } catch { Alert.alert('Error', 'Could not add to calendar.'); }
  };

  const sc = statusColor(broadcast.status);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refresh().finally(() => setRefreshing(false)); }} tintColor="#3b82f6" />}
    >
      {/* Header */}
      <LinearGradient colors={['#0f172a', '#0a0e1a']} style={s.headerArea}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={[s.statusPill, { backgroundColor: sc + '20' }]}>
          <View style={[s.statusDot, { backgroundColor: sc }]} />
          <Text style={[s.statusText, { color: sc }]}>{broadcast.status?.toUpperCase()}</Text>
        </View>
      </LinearGradient>

      {/* Broadcast Info Card */}
      <View style={s.infoCard}>
        <View style={s.typeRow}>
          <View style={[s.typeBadge, { backgroundColor: broadcast.type === 'player' ? '#8b5cf620' : '#3b82f620' }]}>
            <Ionicons
              name={broadcast.type === 'player' ? 'hand-right' : 'megaphone'}
              size={16}
              color={broadcast.type === 'player' ? '#8b5cf6' : '#3b82f6'}
            />
            <Text style={[s.typeText, { color: broadcast.type === 'player' ? '#8b5cf6' : '#3b82f6' }]}>
              {broadcast.type === 'player' ? 'Player Available' : 'Sub Needed'}
            </Text>
          </View>
        </View>

        <Text style={s.creatorName}>{broadcast.creatorName || 'Unknown'}</Text>

        <View style={s.detailRows}>
          <View style={s.detailRow}>
            <Ionicons name="calendar" size={16} color="#3b82f6" />
            <Text style={s.detailText}>{broadcast.date}{broadcast.time ? ` @ ${broadcast.time}` : ''}</Text>
            <TouchableOpacity style={s.addCalBtn} onPress={handleAddToCalendar}>
              <Ionicons name="add-circle-outline" size={14} color="#3b82f6" />
              <Text style={s.addCalText}>Add to Cal</Text>
            </TouchableOpacity>
          </View>
          {broadcast.locationName ? (
            <TouchableOpacity style={s.detailRow} onPress={openDirections}>
              <Ionicons name="location" size={16} color="#10b981" />
              <Text style={[s.detailText, { color: '#10b981' }]}>{broadcast.locationName}</Text>
              <Ionicons name="navigate-outline" size={14} color="#10b981" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ) : null}
          {(broadcast.positions || []).length > 0 && (
            <View style={s.posRow}>
              {broadcast.positions.map((p) => (
                <View key={p} style={s.posChip}>
                  <Text style={s.posChipText}>{normalizePosition(p)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {broadcast.notes ? (
          <View style={s.notesBox}>
            <Ionicons name="document-text-outline" size={14} color="#64748b" />
            <Text style={s.notesText}>{broadcast.notes}</Text>
          </View>
        ) : null}

        {expiresAt && !isExpired && (
          <View style={s.expiryRow}>
            <Ionicons name="time-outline" size={14} color="#f59e0b" />
            <Text style={s.expiryText}>
              Expires {expiresAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
        )}
      </View>

      {/* Map */}
      {(broadcast.locationName || broadcast.locationAddress) && (
        <View style={s.mapSection}>
          {mapCoords ? (
            <View style={s.mapContainer}>
              <MapView
                style={s.map}
                initialRegion={{
                  ...mapCoords,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker
                  coordinate={mapCoords}
                  title={broadcast.locationName || 'Field'}
                  description={broadcast.locationAddress || ''}
                />
              </MapView>
              <TouchableOpacity style={s.mapOverlayBtn} onPress={openDirections} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.mapOverlayBtnInner}
                >
                  <Ionicons name="navigate" size={18} color="#fff" />
                  <Text style={s.mapOverlayBtnText}>Get Directions</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : geocoding ? (
            <View style={s.mapLoading}>
              <ActivityIndicator color="#3b82f6" />
              <Text style={s.mapLoadingText}>Loading map...</Text>
            </View>
          ) : (
            <TouchableOpacity style={s.directionsBtn} onPress={openDirections} activeOpacity={0.8}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.directionsBtnInner}
              >
                <Ionicons name="navigate" size={20} color="#fff" />
                <Text style={s.directionsBtnText}>Get Directions</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Player actions: respond or confirm attendance */}
      {!isOwner && broadcast.status === 'open' && !alreadyResponded && (
        <TouchableOpacity style={s.respondBtn} onPress={() => handleRespond('accept')} disabled={responding} activeOpacity={0.8}>
          <LinearGradient colors={['#3b82f6', '#2563eb']} style={s.respondBtnInner}>
            {responding ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={s.respondBtnText}>I'm Interested</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      )}

      {!isOwner && alreadyResponded && !myRosterEntry && !onWaitlist && (
        <View style={s.respondedBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#10b981" />
          <Text style={s.respondedText}>You've responded — waiting to hear back</Text>
        </View>
      )}

      {/* Player: on roster, needs to confirm attendance */}
      {!isOwner && myRosterEntry && !myRosterEntry.confirmed && (
        <TouchableOpacity style={s.confirmAttendBtn} onPress={handleConfirmAttendance} activeOpacity={0.8}>
          <LinearGradient colors={['#f59e0b', '#d97706']} style={s.confirmAttendInner}>
            <Ionicons name="flame" size={22} color="#fff" />
            <View>
              <Text style={s.confirmAttendTitle}>You're on the roster!</Text>
              <Text style={s.confirmAttendSub}>Tap to confirm — Better not bail!</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {!isOwner && myRosterEntry && myRosterEntry.confirmed && (
        <View style={s.confirmedBanner}>
          <Ionicons name="checkmark-done-circle" size={22} color="#10b981" />
          <View>
            <Text style={s.confirmedTitle}>You're confirmed!</Text>
            <Text style={s.confirmedSub}>Don't forget to show up</Text>
          </View>
        </View>
      )}

      {!isOwner && onWaitlist && (
        <View style={s.waitlistBanner}>
          <Ionicons name="hourglass-outline" size={18} color="#f59e0b" />
          <Text style={s.waitlistText}>You're on the waitlist — we'll notify you if a spot opens</Text>
        </View>
      )}

      {/* Owner: Roster Section */}
      {isOwner && roster.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="people" size={16} color="#10b981" />
            <Text style={s.sectionTitle}>Roster ({roster.length})</Text>
          </View>
          {roster.map((r) => (
            <View key={r.userId} style={s.rosterCard}>
              <View style={s.rosterLeft}>
                <View style={s.rosterAvatar}>
                  <Text style={s.rosterAvatarText}>{(r.name || '?')[0].toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={s.rosterName}>{r.name}</Text>
                  <View style={s.rosterStatus}>
                    {r.confirmed ? (
                      <>
                        <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                        <Text style={s.rosterConfirmed}>Confirmed</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="time-outline" size={12} color="#f59e0b" />
                        <Text style={s.rosterPending}>Awaiting confirmation</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
              <View style={s.rosterActions}>
                <TouchableOpacity onPress={() => handleMessage(r.userId)} style={s.rosterAction}>
                  <Ionicons name="chatbubble-outline" size={16} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemoveFromRoster(r.userId)} style={s.rosterAction}>
                  <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Owner: Waitlist Section */}
      {isOwner && waitlist.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="hourglass-outline" size={16} color="#f59e0b" />
            <Text style={s.sectionTitle}>Waitlist ({waitlist.length})</Text>
          </View>
          {waitlist.map((r) => (
            <View key={r.userId} style={s.rosterCard}>
              <View style={s.rosterLeft}>
                <View style={[s.rosterAvatar, { backgroundColor: '#1e293b' }]}>
                  <Text style={s.rosterAvatarText}>{(r.name || '?')[0].toUpperCase()}</Text>
                </View>
                <Text style={s.rosterName}>{r.name}</Text>
              </View>
              <View style={s.rosterActions}>
                <TouchableOpacity onPress={() => handleAddToRoster(r.userId, 'roster')} style={s.promoteBtn}>
                  <Text style={s.promoteText}>Promote</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemoveFromRoster(r.userId)} style={s.rosterAction}>
                  <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Owner: Responses (not yet rostered) */}
      {isOwner && broadcast.status === 'open' && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="hand-right-outline" size={16} color="#94a3b8" />
            <Text style={s.sectionTitle}>Responses ({acceptedResponses.length})</Text>
          </View>
          {acceptedResponses.length === 0 ? (
            <Text style={s.emptyText}>No responses yet</Text>
          ) : (
            acceptedResponses
              .filter(r => !roster.some(ro => ro.userId === r.userId) && !waitlist.some(w => w.userId === r.userId))
              .map((r, i) => (
                <View key={r.userId + i} style={s.responderCard}>
                  <View style={s.rosterLeft}>
                    <View style={[s.rosterAvatar, { backgroundColor: '#1e293b' }]}>
                      <Text style={s.rosterAvatarText}>{(r.name || '?')[0].toUpperCase()}</Text>
                    </View>
                    <Text style={s.rosterName}>{r.name}</Text>
                  </View>
                  <View style={s.responderActions}>
                    <TouchableOpacity
                      onPress={() => handleAddToRoster(r.userId, 'roster')}
                      style={s.addRosterBtn}
                    >
                      <Ionicons name="add-circle" size={14} color="#10b981" />
                      <Text style={s.addRosterText}>Roster</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleAddToRoster(r.userId, 'waitlist')}
                      style={s.addWaitlistBtn}
                    >
                      <Text style={s.addWaitlistText}>Waitlist</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleMessage(r.userId)} style={s.rosterAction}>
                      <Ionicons name="chatbubble-outline" size={16} color="#3b82f6" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
          )}
        </View>
      )}

      {/* Owner: Reminder & Management */}
      {isOwner && roster.length > 0 && (
        <TouchableOpacity style={s.reminderBtn} onPress={handleSendReminder} activeOpacity={0.8}>
          <Ionicons name="notifications" size={18} color="#f59e0b" />
          <Text style={s.reminderText}>Send "Better Not Bail!" Reminder</Text>
        </TouchableOpacity>
      )}

      {isOwner && broadcast.status === 'open' && (
        <View style={s.ownerActions}>
          <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
            <Ionicons name="checkmark-done-circle-outline" size={18} color="#10b981" />
            <Text style={s.closeText}>Mark as Filled</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Non-owner: Message creator */}
      {!isOwner && (
        <TouchableOpacity
          style={s.messageCreatorBtn}
          onPress={() => handleMessage(broadcast.creatorId)}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#3b82f6" />
          <Text style={s.messageCreatorText}>Message {broadcast.creatorName?.split(' ')[0]}</Text>
        </TouchableOpacity>
      )}

      {/* Rate Players (after game is closed/expired, for non-owner roster members) */}
      {!isOwner && isExpired && myRosterEntry && (
        <TouchableOpacity
          style={s.rateBtn}
          onPress={() => navigation.navigate('RatePlayer', {
            targetUid: broadcast.creatorId,
            targetName: broadcast.creatorName || 'Player',
            broadcastId: broadcast.id,
          })}
          activeOpacity={0.8}
        >
          <Ionicons name="star" size={18} color="#f59e0b" />
          <Text style={s.rateBtnText}>Rate Game Organizer</Text>
        </TouchableOpacity>
      )}

      {/* Comments / Questions */}
      <View style={s.commentsSection}>
        <View style={s.sectionHeader}>
          <Ionicons name="chatbox-outline" size={16} color="#94a3b8" />
          <Text style={s.sectionTitle}>Comments ({comments.length})</Text>
        </View>
        {comments.map((c, i) => (
          <View key={c.id || i} style={s.commentCard}>
            <View style={s.commentAvatar}>
              <Text style={s.commentAvatarText}>{(c.name || '?')[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.commentName}>{c.name}</Text>
              <Text style={s.commentBody}>{c.text}</Text>
              <Text style={s.commentTime}>
                {c.createdAt ? new Date(c.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
              </Text>
            </View>
          </View>
        ))}
        {comments.length === 0 && (
          <Text style={s.noComments}>No comments yet — ask a question or leave a note</Text>
        )}
        <View style={s.commentInputRow}>
          <TextInput
            style={s.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor="#475569"
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity
            style={[s.commentSendBtn, commentText.trim() && s.commentSendBtnActive]}
            onPress={handlePostComment}
            disabled={postingComment || !commentText.trim()}
          >
            {postingComment ? <ActivityIndicator color="#fff" size="small" /> : (
              <Ionicons name="send" size={18} color={commentText.trim() ? '#fff' : '#475569'} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  headerArea: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff10',
    alignItems: 'center', justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  // Info Card
  infoCard: {
    backgroundColor: '#111827', borderRadius: 16, marginHorizontal: 16, padding: 20,
    borderWidth: 1, borderColor: '#1e293b',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8,
    elevation: 4,
  },
  typeRow: { marginBottom: 12 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  typeText: { fontSize: 13, fontWeight: '700' },
  creatorName: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 16 },
  detailRows: { gap: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 15, color: '#e2e8f0', flex: 1 },
  addCalBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#3b82f615', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  addCalText: { fontSize: 11, fontWeight: '700', color: '#3b82f6' },
  posRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  posChip: { backgroundColor: '#3b82f615', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  posChipText: { fontSize: 13, color: '#3b82f6', fontWeight: '600' },
  notesBox: {
    flexDirection: 'row', gap: 8, marginTop: 16, padding: 12,
    backgroundColor: '#0a0e1a', borderRadius: 10,
  },
  notesText: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic', flex: 1 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  expiryText: { fontSize: 13, color: '#f59e0b' },

  // Map
  mapSection: { marginHorizontal: 16, marginTop: 16 },
  mapContainer: {
    borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#1e293b',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
    elevation: 4,
  },
  map: { width: '100%', height: 180 },
  mapOverlayBtn: {
    position: 'absolute', bottom: 12, right: 12, borderRadius: 10, overflow: 'hidden',
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6,
    elevation: 6,
  },
  mapOverlayBtnInner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  mapOverlayBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  mapLoading: {
    height: 120, backgroundColor: '#111827', borderRadius: 16, borderWidth: 1, borderColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  mapLoadingText: { color: '#475569', fontSize: 13 },

  // Directions fallback
  directionsBtn: {
    borderRadius: 12, overflow: 'hidden',
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10,
    elevation: 6,
  },
  directionsBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 8,
  },
  directionsBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Respond
  respondBtn: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 12, overflow: 'hidden',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10,
    elevation: 6,
  },
  respondBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 8,
  },
  respondBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  respondedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 16, padding: 14,
    backgroundColor: '#10b98110', borderRadius: 12, borderWidth: 1, borderColor: '#10b98130',
  },
  respondedText: { color: '#10b981', fontSize: 14, fontWeight: '600' },

  // Confirm Attendance
  confirmAttendBtn: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10,
    elevation: 6,
  },
  confirmAttendInner: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20, gap: 14,
  },
  confirmAttendTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  confirmAttendSub: { color: '#ffffffcc', fontSize: 13, marginTop: 2 },
  confirmedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginTop: 16, padding: 16,
    backgroundColor: '#10b98110', borderRadius: 14, borderWidth: 1, borderColor: '#10b98130',
  },
  confirmedTitle: { color: '#10b981', fontSize: 16, fontWeight: '700' },
  confirmedSub: { color: '#10b98199', fontSize: 13, marginTop: 2 },
  waitlistBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 16, padding: 14,
    backgroundColor: '#f59e0b10', borderRadius: 12, borderWidth: 1, borderColor: '#f59e0b30',
  },
  waitlistText: { color: '#f59e0b', fontSize: 14, fontWeight: '600', flex: 1 },

  // Sections
  section: { marginHorizontal: 16, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 },

  // Roster Cards
  rosterCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#1e293b',
  },
  rosterLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rosterAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#3b82f620',
    alignItems: 'center', justifyContent: 'center',
  },
  rosterAvatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  rosterName: { fontSize: 15, fontWeight: '600', color: '#e2e8f0' },
  rosterStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  rosterConfirmed: { fontSize: 12, color: '#10b981', fontWeight: '600' },
  rosterPending: { fontSize: 12, color: '#f59e0b' },
  rosterActions: { flexDirection: 'row', gap: 8 },
  rosterAction: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#0a0e1a',
    alignItems: 'center', justifyContent: 'center',
  },
  promoteBtn: { backgroundColor: '#10b98115', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  promoteText: { color: '#10b981', fontSize: 12, fontWeight: '700' },

  // Responder Cards
  responderCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#1e293b',
  },
  responderActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  addRosterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#10b98115', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  addRosterText: { color: '#10b981', fontSize: 12, fontWeight: '700' },
  addWaitlistBtn: { backgroundColor: '#f59e0b15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  addWaitlistText: { color: '#f59e0b', fontSize: 12, fontWeight: '700' },
  emptyText: { color: '#475569', fontSize: 14, marginLeft: 24 },

  // Reminder
  reminderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 20, paddingVertical: 14,
    backgroundColor: '#f59e0b15', borderRadius: 12, borderWidth: 1, borderColor: '#f59e0b30',
  },
  reminderText: { color: '#f59e0b', fontSize: 15, fontWeight: '700' },

  // Owner Actions
  ownerActions: {
    flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 20,
  },
  closeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#10b98110', borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: '#10b98130',
  },
  closeText: { color: '#10b981', fontSize: 14, fontWeight: '700' },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#ef444410', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20,
    borderWidth: 1, borderColor: '#ef444430',
  },
  cancelText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },

  // Message Creator
  messageCreatorBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 16, paddingVertical: 14,
    backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#1e293b',
  },
  messageCreatorText: { color: '#3b82f6', fontSize: 15, fontWeight: '700' },

  // Rate Button
  rateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, paddingVertical: 14,
    backgroundColor: '#f59e0b15', borderRadius: 12, borderWidth: 1, borderColor: '#f59e0b30',
  },
  rateBtnText: { color: '#f59e0b', fontSize: 15, fontWeight: '700' },

  // Comments
  commentsSection: { marginHorizontal: 16, marginTop: 24, marginBottom: 16 },
  commentCard: {
    flexDirection: 'row', gap: 10, marginBottom: 10, padding: 12,
    backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#1e293b',
  },
  commentAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#3b82f620',
    alignItems: 'center', justifyContent: 'center',
  },
  commentAvatarText: { color: '#3b82f6', fontSize: 14, fontWeight: '700' },
  commentName: { fontSize: 13, fontWeight: '700', color: '#e2e8f0' },
  commentBody: { fontSize: 14, color: '#94a3b8', marginTop: 2, lineHeight: 20 },
  commentTime: { fontSize: 11, color: '#475569', marginTop: 4 },
  noComments: { color: '#475569', fontSize: 13, marginBottom: 12 },
  commentInputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8,
  },
  commentInput: {
    flex: 1, backgroundColor: '#111827', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, color: '#fff', fontSize: 14, maxHeight: 80,
    borderWidth: 1, borderColor: '#1e293b',
  },
  commentSendBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center',
  },
  commentSendBtnActive: { backgroundColor: '#3b82f6' },
});
