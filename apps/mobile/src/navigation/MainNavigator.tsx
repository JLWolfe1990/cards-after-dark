import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/contexts/ThemeContext';

// Screens
import { GameScreen } from '@/screens/game/GameScreen';
import { VotingScreen } from '@/screens/game/VotingScreen';
import { ActivityScreen } from '@/screens/game/ActivityScreen';
import { ResultsScreen } from '@/screens/game/ResultsScreen';
import { HistoryScreen } from '@/screens/history/HistoryScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { SettingsScreen } from '@/screens/profile/SettingsScreen';

// Stack param lists
export type GameStackParamList = {
  GameHome: undefined;
  Voting: undefined;
  Activity: { cardId: string };
  Results: undefined;
};

export type HistoryStackParamList = {
  HistoryList: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Game: undefined;
  History: undefined;
  Profile: undefined;
};

// Stack navigators
const GameStack = createStackNavigator<GameStackParamList>();
const HistoryStack = createStackNavigator<HistoryStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();

const GameNavigator: React.FC = () => (
  <GameStack.Navigator screenOptions={{ headerShown: false }}>
    <GameStack.Screen name="GameHome" component={GameScreen} />
    <GameStack.Screen name="Voting" component={VotingScreen} />
    <GameStack.Screen name="Activity" component={ActivityScreen} />
    <GameStack.Screen name="Results" component={ResultsScreen} />
  </GameStack.Navigator>
);

const HistoryNavigator: React.FC = () => (
  <HistoryStack.Navigator screenOptions={{ headerShown: false }}>
    <HistoryStack.Screen name="HistoryList" component={HistoryScreen} />
  </HistoryStack.Navigator>
);

const ProfileNavigator: React.FC = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
    <ProfileStack.Screen name="Settings" component={SettingsScreen} />
  </ProfileStack.Navigator>
);

// Main tab navigator
const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Game':
              iconName = focused ? 'cards' : 'cards-outline';
              break;
            case 'History':
              iconName = focused ? 'history' : 'history';
              break;
            case 'Profile':
              iconName = focused ? 'account' : 'account-outline';
              break;
            default:
              iconName = 'circle';
          }

          return (
            <Icon
              name={iconName}
              size={size}
              color={focused ? theme.colors.primary : theme.colors.textSecondary}
            />
          );
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 68,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen 
        name="Game" 
        component={GameNavigator}
        options={{ 
          tabBarLabel: 'Play',
          tabBarTestID: 'tab-game',
        }} 
      />
      <Tab.Screen 
        name="History" 
        component={HistoryNavigator}
        options={{ 
          tabBarLabel: 'History',
          tabBarTestID: 'tab-history',
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileNavigator}
        options={{ 
          tabBarLabel: 'Profile',
          tabBarTestID: 'tab-profile',
        }} 
      />
    </Tab.Navigator>
  );
};