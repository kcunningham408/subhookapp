import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import BroadcastDetailScreen from './screens/BroadcastDetailScreen';
import CalendarScreen from './screens/CalendarScreen';
import ChatScreen from './screens/ChatScreen';
import CreateBroadcastScreen from './screens/CreateBroadcastScreen';
import DashboardScreen from './screens/DashboardScreen';
import LoginScreen from './screens/LoginScreen';
import MessagesScreen from './screens/MessagesScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import PlayerProfileScreen from './screens/PlayerProfileScreen';
import ProfileScreen from './screens/ProfileScreen';
import RoleSelectScreen from './screens/RoleSelectScreen';
import SearchScreen from './screens/SearchScreen';

import { getStoredUser, getConversations, registerPushToken } from './services/api';

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

const TAB_ICONS = {
  Dashboard: { focused: 'home', unfocused: 'home-outline' },
  Search: { focused: 'search', unfocused: 'search-outline' },
  Messages: { focused: 'chatbubbles', unfocused: 'chatbubbles-outline' },
  Calendar: { focused: 'calendar', unfocused: 'calendar-outline' },
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
      <Tab.Screen name="Search">
        {(props) => <SearchScreen {...props} route={{ ...props.route, params: { user } }} />}
      </Tab.Screen>
      <Tab.Screen name="Messages">
        {(props) => <MessagesScreen {...props} route={{ ...props.route, params: { user } }} />}
      </Tab.Screen>
      <Tab.Screen name="Calendar">
        {(props) => <CalendarScreen {...props} route={{ ...props.route, params: { user } }} />}
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

  useEffect(() => {
    getStoredUser().then((res) => setUser(res?.user ?? null));
  }, []);

  // Register push token when user is logged in
  useEffect(() => {
    if (!user) return;
    registerForPushNotifications().then(async (token) => {
      if (token) {
        try { await registerPushToken(token); } catch (e) { console.warn('Push token registration failed', e); }
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (!data?.type || !navigationRef.isReady()) return;
      setTimeout(() => {
        if (data.type === 'broadcast_response' || data.type === 'roster_added' ||
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
      <View style={{ flex: 1, backgroundColor: '#0a0e1a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  const needsRole = user && !user.onboardingComplete && !user.role;
  const needsOnboarding = user && !user.onboardingComplete && !!user.role;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLogin={(data) => setUser(data.user)} />}
            </Stack.Screen>
          ) : needsRole ? (
            <Stack.Screen name="RoleSelect">
              {(props) => <RoleSelectScreen {...props} route={{ ...props.route, params: { user, setUser } }} />}
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
              <Stack.Screen name="CreateBroadcast" component={CreateBroadcastScreen} />
              <Stack.Screen name="BroadcastDetail" component={BroadcastDetailScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
