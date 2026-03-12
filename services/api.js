import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://subhook-server.onrender.com';
const TOKEN_KEY = 'subhook_token';
const USER_KEY = 'subhook_user';

const getToken = async () => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // Fallback to AsyncStorage for migration from old installs
    return AsyncStorage.getItem(TOKEN_KEY);
  }
};

const setToken = async (token) => {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  // Clean up old AsyncStorage token if it exists
  AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
};

const deleteToken = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
};

const apiRequest = async (path, options = {}) => {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(res.ok ? 'Invalid server response' : `Server error (${res.status})`);
  }
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

// ── Auth ────────────────────────────────────────────────────────────────────

export const register = async (phone, password, name) => {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: { phone, password, name },
  });
  await setToken(data.token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
};

export const login = async (phone, password) => {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: { phone, password },
  });
  await setToken(data.token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
};

export const getStoredUser = async () => {
  try {
    const token = await getToken();
    if (!token) return null;
    const data = await apiRequest('/auth/me');
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data;
  } catch {
    await deleteToken();
    await AsyncStorage.removeItem(USER_KEY);
    return null;
  }
};

export const resetPassword = async (phone, newPassword, code) => {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { phone, newPassword, code },
  });
};

export const requestResetCode = async (phone) => {
  return apiRequest('/auth/request-reset-code', {
    method: 'POST',
    body: { phone },
  });
};

export const logout = async () => {
  await deleteToken();
  await AsyncStorage.removeItem(USER_KEY);
};

export const deleteAccount = async () => {
  return apiRequest('/auth/delete-account', { method: 'DELETE' });
};

// ── User ────────────────────────────────────────────────────────────────────

export const updateUser = async (data) => {
  return apiRequest('/user', { method: 'PUT', body: data });
};

// ── Profile ─────────────────────────────────────────────────────────────────

export const saveProfile = async (data) => {
  return apiRequest('/profile', { method: 'PUT', body: data });
};

export const getProfile = async (uid) => {
  return apiRequest(`/profile/${uid}`);
};

// ── Broadcasts ──────────────────────────────────────────────────────────────

export const createBroadcast = async (data) => {
  return apiRequest('/broadcasts', { method: 'POST', body: data });
};

export const getBroadcasts = async (type, mine = false) => {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (mine) params.append('mine', 'true');
  return apiRequest(`/broadcasts?${params.toString()}`);
};

export const getBroadcast = async (id) => {
  return apiRequest(`/broadcasts/${id}`);
};

export const respondToBroadcast = async (id, action) => {
  return apiRequest(`/broadcasts/${id}/respond`, {
    method: 'POST',
    body: { action },
  });
};

export const confirmBroadcast = async (id, responderId) => {
  return apiRequest(`/broadcasts/${id}/confirm`, {
    method: 'POST',
    body: { responderId },
  });
};

export const cancelBroadcast = async (id) => {
  return apiRequest(`/broadcasts/${id}/cancel`, { method: 'POST' });
};

export const closeBroadcast = async (id) => {
  return apiRequest(`/broadcasts/${id}/close`, { method: 'POST' });
};

export const getMyGames = async () => {
  return apiRequest('/broadcasts/my-games');
};

// ── Messages ────────────────────────────────────────────────────────────────

export const getOrCreateConversation = async (otherUserId) => {
  return apiRequest('/conversations', {
    method: 'POST',
    body: { otherUserId },
  });
};

export const getConversations = async () => {
  return apiRequest('/conversations');
};

export const sendMessage = async (convoId, text) => {
  return apiRequest(`/conversations/${convoId}/messages`, {
    method: 'POST',
    body: { text },
  });
};

export const getMessages = async (convoId) => {
  return apiRequest(`/conversations/${convoId}/messages`);
};

// ── Search ──────────────────────────────────────────────────────────────────

export const searchPlayers = async (position, activeOnly = false) => {
  const params = new URLSearchParams();
  if (position) params.append('position', position);
  if (activeOnly) params.append('activeOnly', 'true');
  const qs = params.toString();
  return apiRequest(`/search/players${qs ? '?' + qs : ''}`);
};

// ── Active Now ──────────────────────────────────────────────────────────────

export const setActiveNow = async (active) => {
  return apiRequest('/active-now', { method: 'POST', body: { active } });
};

export const getActiveNow = async () => {
  return apiRequest('/active-now');
};

// ── Push Token ──────────────────────────────────────────────────────────────

export const registerPushToken = async (token) => {
  return apiRequest('/push-token', { method: 'POST', body: { token } });
};

// ── Roster & Waitlist ───────────────────────────────────────────────────────

export const addToRoster = async (broadcastId, userId, slot) => {
  return apiRequest(`/broadcasts/${broadcastId}/roster`, {
    method: 'POST',
    body: { userId, slot },
  });
};

export const removeFromRoster = async (broadcastId, userId) => {
  return apiRequest(`/broadcasts/${broadcastId}/roster/remove`, {
    method: 'POST',
    body: { userId },
  });
};

export const confirmAttendance = async (broadcastId) => {
  return apiRequest(`/broadcasts/${broadcastId}/confirm-attendance`, {
    method: 'POST',
  });
};

export const sendGameReminder = async (broadcastId) => {
  return apiRequest(`/broadcasts/${broadcastId}/remind`, {
    method: 'POST',
  });
};

export const notifyFreeAgents = async (broadcastId, positionNeeded, message) => {
  return apiRequest('/notify-free-agents-expo', {
    method: 'POST',
    body: { broadcastId, positionNeeded, message },
  });
};

// ── Block / Report ──────────────────────────────────────────────────────────

export const blockUser = async (blockedUserId) => {
  return apiRequest('/block', { method: 'POST', body: { blockedUserId } });
};

export const unblockUser = async (uid) => {
  return apiRequest(`/block/${uid}`, { method: 'DELETE' });
};

export const getBlocks = async () => {
  return apiRequest('/blocks');
};

export const reportUser = async (reportedUserId, reason) => {
  return apiRequest('/report', { method: 'POST', body: { reportedUserId, reason } });
};

// ── Ratings ─────────────────────────────────────────────────────────────────

export const submitRating = async (ratedUserId, broadcastId, reliability, teamwork, skill) => {
  return apiRequest('/ratings', { method: 'POST', body: { ratedUserId, broadcastId, reliability, teamwork, skill } });
};

export const getRatings = async (uid) => {
  return apiRequest(`/ratings/${uid}`);
};

// ── Comments ────────────────────────────────────────────────────────────────

export const addComment = async (broadcastId, text) => {
  return apiRequest(`/broadcasts/${broadcastId}/comments`, { method: 'POST', body: { text } });
};

export const getComments = async (broadcastId) => {
  return apiRequest(`/broadcasts/${broadcastId}/comments`);
};

// ── Game History ────────────────────────────────────────────────────────────

export const getGameHistory = async () => {
  return apiRequest('/game-history');
};

export const getUserStats = async (uid) => {
  return apiRequest(`/user-stats/${uid}`);
};

// ── Notification Preferences ────────────────────────────────────────────────

export const getNotificationPrefs = async () => {
  return apiRequest('/notification-preferences');
};

export const updateNotificationPrefs = async (prefs) => {
  return apiRequest('/notification-preferences', { method: 'PUT', body: prefs });
};

// ── Teams ───────────────────────────────────────────────────────────────────

export const createTeam = async (name, color, description) => {
  return apiRequest('/teams', { method: 'POST', body: { name, color, description } });
};

export const getMyTeams = async () => {
  return apiRequest('/teams');
};

export const getTeam = async (id) => {
  return apiRequest(`/teams/${id}`);
};

export const inviteToTeam = async (teamId, userId) => {
  return apiRequest(`/teams/${teamId}/invite`, { method: 'POST', body: { userId } });
};

export const leaveTeam = async (teamId) => {
  return apiRequest(`/teams/${teamId}/leave`, { method: 'POST' });
};

export const deleteTeam = async (teamId) => {
  return apiRequest(`/teams/${teamId}`, { method: 'DELETE' });
};
