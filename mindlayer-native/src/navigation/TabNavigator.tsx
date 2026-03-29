import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import InsightsScreen from '../screens/InsightsScreen';
import JournalScreen from '../screens/JournalScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { colors } from '../utils/theme';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.text3,
        tabBarStyle: {
          backgroundColor: colors.bg1,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 6,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 82 : 62,
          // Subtle top shadow
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home:     focused ? 'home'      : 'home-outline',
            Insights: focused ? 'bar-chart' : 'bar-chart-outline',
            Journal:  focused ? 'book'      : 'book-outline',
            Settings: focused ? 'settings'  : 'settings-outline',
          };
          return (
            <View style={focused ? styles.activeIconWrap : null}>
              <Ionicons name={icons[route.name] ?? 'ellipse'} size={focused ? 22 : 21} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Journal"  component={JournalScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

import { Platform } from 'react-native';

const styles = StyleSheet.create({
  activeIconWrap: {
    backgroundColor: `${colors.accent}14`,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
});
