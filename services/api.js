import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://subhook-server.onrender.com';
const TOKEN_KEY = 'subhook_token';
const USER_KEY = 'subhook_user';

const apiRequest = async (path, options = {}) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

// ── Auth ────────────────────────────────────────────────────────────────────

export const register = async (phone, password, name) => {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: { phone, password, name },
  });
  await AsyncStorage.setItem(TOKEN_KEY, data.token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
};

export const login = async (phone, password) => {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: { phone, password },
  });
  await AsyncStorage.setItem(TOKEN_KEY, data.token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
};

export const getStoredUser = async () => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const data = await apiRequest('/auth/me');
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data;
  } catch {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    return null;
  }
};

export const resetPassword = async (phone, newPassword) => {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { phone, newPassword },
  });
};

export const logout = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
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

export const searchPlayers = async (position) => {
  const params = position ? `?position=${encodeURIComponent(position)}` : '';
  return apiRequest(`/search/players${params}`);
};
