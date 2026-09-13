import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import NewGameScreen from './src/screens/NewGameScreen';
import ScorecardScreen from './src/screens/ScorecardScreen';
import GameSummaryScreen from './src/screens/GameSummaryScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import CourseListScreen from './src/screens/CourseListScreen';
import CourseEditScreen from './src/screens/CourseEditScreen';
import PlayerStatsScreen from './src/screens/PlayerStatsScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    primary: colors.primary,
    border: colors.border,
  },
};

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Friends" component={FriendsScreen} options={{ title: 'Friends' }} />
            <Stack.Screen name="Courses" component={CourseListScreen} options={{ title: 'Courses' }} />
            <Stack.Screen
              name="CourseEdit"
              component={CourseEditScreen}
              options={{ title: 'Course' }}
            />
            <Stack.Screen name="NewGame" component={NewGameScreen} options={{ title: 'New Game' }} />
            <Stack.Screen
              name="Scorecard"
              component={ScorecardScreen}
              options={{ title: 'Scorecard' }}
            />
            <Stack.Screen
              name="GameSummary"
              component={GameSummaryScreen}
              options={{ title: 'Summary' }}
            />
            <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
            <Stack.Screen
              name="PlayerStats"
              component={PlayerStatsScreen}
              options={{ title: 'Player Stats' }}
            />
            <Stack.Screen
              name="Leaderboard"
              component={LeaderboardScreen}
              options={{ title: 'Leaderboard' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
