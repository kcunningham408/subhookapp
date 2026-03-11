import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import LoginScreen from './screens/LoginScreen';
import RoleSelectScreen from './screens/RoleSelectScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import DashboardScreen from './screens/DashboardScreen';
import SearchScreen from './screens/SearchScreen';
import MessagesScreen from './screens/MessagesScreen';
import ProfileScreen from './screens/ProfileScreen';
import CreateBroadcastScreen from './screens/CreateBroadcastScreen';
import BroadcastDetailScreen from './screens/BroadcastDetailScreen';
import ChatScreen from './screens/ChatScreen';
import PlayerProfileScreen from './screens/PlayerProfileScreen';

import { getStoredUser } from './services/api';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = { Dashboard: '⚾', Search: '🔍', Messages: '💬', Profile: '👤' };

function MainTabs({ user, setUser }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155', height: 88, paddingBottom: 28 },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 22, color }}>{TAB_ICONS[route.name] || '•'}</Text>
        ),
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
      <Tab.Screen name="Profile">
        {(props) => <ProfileScreen {...props} route={{ ...props.route, params: { user, setUser } }} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    getStoredUser().then((res) => setUser(res?.user ?? null));
  }, []);

  if (user === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f1a2e', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#2563eb" size="large" />
      </View>
    );
  }

  const needsOnboarding = user && !user.onboardingComplete;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLogin={(data) => setUser(data.user)} />}
            </Stack.Screen>
          ) : needsOnboarding ? (
            <>
              <Stack.Screen name="RoleSelect" initialParams={{ user, setUser }}>
                {(props) => <RoleSelectScreen {...props} route={{ ...props.route, params: { user, setUser } }} />}
              </Stack.Screen>
              <Stack.Screen name="Onboarding">
                {(props) => <OnboardingScreen {...props} />}
              </Stack.Screen>
            </>
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
