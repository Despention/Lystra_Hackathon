import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import UploadScreen from '../screens/UploadScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import ResultScreen from '../screens/ResultScreen';
import IssueDetailScreen from '../screens/IssueDetailScreen';
import { useTheme, useTranslation } from '../contexts/ThemeContext';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  History: { active: 'time', inactive: 'time-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

function MainTabs() {
  const theme = useTheme();
  const t = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const name = focused ? icons?.active : icons?.inactive;
          return <Ionicons name={(name || 'ellipse-outline') as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.text.tertiary,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
        },
        tabBarLabelStyle: { fontSize: 11 },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('home') }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: t('history') }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: t('settings') }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const theme = useTheme();
  const t = useTranslation();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text.primary,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Upload" component={UploadScreen} options={{ title: t('newAnalysis') }} />
        <Stack.Screen name="Analysis" component={AnalysisScreen} options={{ title: t('analyzeDoc'), headerBackVisible: false }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ title: t('results') }} />
        <Stack.Screen name="IssueDetail" component={IssueDetailScreen} options={{ title: t('issue') }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
