import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Device from 'expo-device';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import ErrorBoundary from './components/ErrorBoundary';
import BroadcastDetailScreen from './screens/BroadcastDetailScreen';
import MyGamesScreen from './screens/CalendarScreen';
import ChatScreen from './screens/ChatScreen';
import CreateBroadcastScreen from './screens/CreateBroadcastScreen';
import DashboardScreen from './screens/DashboardScreen';
import HeatMapScreen from './screens/HeatMapScreen';
import LoginScreen from './screens/LoginScreen';
import MessagesScreen from './screens/MessagesScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import PlayerProfileScreen from './screens/PlayerProfileScreen';
import ProfileScreen from './screens/ProfileScreen';
import RatePlayerScreen from './screens/RatePlayerScreen';
// RoleSelectScreen removed — single unified role
import GameHistoryScreen from './screens/GameHistoryScreen';
import SearchScreen from './screens/SearchScreen';
import SettingsScreen from './screens/SettingsScreen';
import TeamsScreen from './screens/TeamsScreen';

import { getCachedUser, getConversations, getStoredUser, registerPushToken } from './services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

const linking = {
  prefixes: [Linking.createURL('/'), 'subhook://'],
  config: {
    screens: {
      BroadcastDetail: 'broadcast/:broadcastId',
      PlayerProfile: 'player/:uid',
    },
  },
};

const TAB_ICONS = {
  Dashboard: { focused: 'home', unfocused: 'home-outline' },
  Map: { focused: 'map', unfocused: 'map-outline' },
  Search: { focused: 'search', unfocused: 'search-outline' },
  Messages: { focused: 'chatbubbles', unfocused: 'chatbubbles-outline' },
  'My Games': { focused: 'football', unfocused: 'football-outline' },
  Profile: { focused: 'person', unfocused: 'person-outline' },
};

function MainTabs({ user, setUser }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await getConversations();
      const total = (res.conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      setUnreadCount(total);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refreshUnread();
    const interval = setInterval(refreshUnread, 30000);
    return () => clearInterval(interval);
  }, [refreshUnread, user]);

  if (!user) return null;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0e1a',
          borderTopColor: '#1a2236',
          borderTopWidth: 0.5,
          height: 88,
          paddingBottom: 28,
          paddingTop: 8,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#475569',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name] || { focused: 'ellipse', unfocused: 'ellipse-outline' };
          return <Ionicons name={focused ? icons.focused : icons.unfocused} size={24} color={color} />;
        },
        ...(route.name === 'Messages' && unreadCount > 0
          ? { tabBarBadge: unreadCount > 9 ? '9+' : unreadCount, tabBarBadgeStyle: { backgroundColor: '#ef4444', fontSize: 10, fontWeight: '700' } }
          : {}),
      })}
    >
      <Tab.Screen name="Dashboard">
        {(props) => <DashboardScreen {...props} route={{ ...props.route, params: { user, setUser } }} />}
      </Tab.Screen>
      <Tab.Screen name="Map">
        {(props) => <HeatMapScreen {...props} route={{ ...props.route, params: { user } }} />}
      </Tab.Screen>
      <Tab.Screen name="Search">
        {(props) => <SearchScreen {...props} route={{ ...props.route, params: { user } }} />}
      </Tab.Screen>
      <Tab.Screen name="Messages">
        {(props) => <MessagesScreen {...props} route={{ ...props.route, params: { user } }} />}
      </Tab.Screen>
      <Tab.Screen name="My Games">
        {(props) => <MyGamesScreen {...props} route={{ ...props.route, params: { user } }} />}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {(props) => <ProfileScreen {...props} route={{ ...props.route, params: { user, setUser } }} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

async function registerForPushNotifications() {
  if (!Device.isDevice) return null;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }
  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: 'fb7c3352-19e5-4b31-b414-00e56cdcc429',
  })).data;
  return token;
}

export default function App() {
  const [user, setUser] = useState(undefined);
  const notificationListener = useRef();
  const responseListener = useRef();
  const pendingDeepLink = useRef(null);

  useEffect(() => {
    let timeout;
    // 1. Show cached user instantly (no network needed)
    getCachedUser()
      .then((cached) => {
        if (cached?.user) setUser(cached.user);
      })
      .catch(() => {});
    // 2. Verify with server in background
    getStoredUser()
      .then((res) => setUser(res?.user ?? null))
      .catch(() => setUser(null));
    // 3. Safety: if everything is slow, go to login after 5 seconds
    timeout = setTimeout(() => {
      setUser((prev) => (prev === undefined ? null : prev));
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  // When user logs in, navigate to any pending deep link
  useEffect(() => {
    if (user && pendingDeepLink.current && navigationRef.isReady()) {
      const { screen, params } = pendingDeepLink.current;
      const currentUser = user;
      pendingDeepLink.current = null;
      setTimeout(() => {
        if (currentUser) navigationRef.navigate(screen, { ...params, user: currentUser });
      }, 300);
    }
  }, [user]);

  // Register push token when user is logged in
  useEffect(() => {
    if (!user) return;
    registerForPushNotifications().then(async (token) => {
      if (token) {
        try { await registerPushToken(token); } catch (e) { console.warn('Push token registration failed', e); }
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});
    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data;
      if (!data?.type || !navigationRef.isReady()) return;
      setTimeout(async () => {
        if (data.type === 'new_message' && data.conversationId) {
          try {
            const res = await getConversations();
            const convo = (res.conversations || []).find(c => c.id === data.conversationId);
            if (convo) {
              navigationRef.navigate('Chat', { conversation: convo, user });
            }
          } catch {}
        } else if (data.type === 'broadcast_response' || data.type === 'roster_added' ||
            data.type === 'waitlist_added' || data.type === 'attendance_confirmed' ||
            data.type === 'promoted_from_waitlist' || data.type === 'game_reminder' ||
            data.type === 'new_broadcast') {
          if (data.broadcastId) {
            navigationRef.navigate('BroadcastDetail', { broadcastId: data.broadcastId, user });
          }
        }
      }, 300);
    });

    return () => {
      if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [user]);

  if (user === undefined) {
    return (
      <ErrorBoundary>
      <View style={{ flex: 1, backgroundColor: '#0a0e1a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#3b82f6" size="large" />
        <Text style={{ color: '#94a3b8', marginTop: 16, fontSize: 16, fontWeight: '600' }}>Loading SubHook...</Text>
        <Text style={{ color: '#475569', marginTop: 8, fontSize: 12 }}>Connecting to server...</Text>
      </View>
      </ErrorBoundary>
    );
  }

  const needsOnboarding = user && !user.onboardingComplete;

  return (
    <ErrorBoundary>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        fallback={
          <View style={{ flex: 1, backgroundColor: '#0a0e1a', justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color="#3b82f6" size="large" />
          </View>
        }
        onUnhandledAction={(action) => {
          // Deep link arrived while not logged in — stash it
          if (action?.payload?.name === 'BroadcastDetail' && action.payload.params?.broadcastId) {
            pendingDeepLink.current = { screen: 'BroadcastDetail', params: action.payload.params };
          } else if (action?.payload?.name === 'PlayerProfile' && action.payload.params?.uid) {
            pendingDeepLink.current = { screen: 'PlayerProfile', params: action.payload.params };
          }
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLogin={(data) => setUser(data.user)} />}
            </Stack.Screen>
          ) : needsOnboarding ? (
            <Stack.Screen name="Onboarding">
              {(props) => <OnboardingScreen {...props} route={{ ...props.route, params: { user, setUser } }} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="MainTabs">
                {() => <MainTabs user={user} setUser={setUser} />}
              </Stack.Screen>
              <Stack.Screen name="CreateBroadcast" component={CreateBroadcastScreen} initialParams={{ user }} />
              <Stack.Screen name="BroadcastDetail" component={BroadcastDetailScreen} initialParams={{ user }} />
              <Stack.Screen name="Chat" component={ChatScreen} initialParams={{ user }} />
              <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} initialParams={{ user }} />
              <Stack.Screen name="GameHistory" component={GameHistoryScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Teams" component={TeamsScreen} />
              <Stack.Screen name="RatePlayer" component={RatePlayerScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
