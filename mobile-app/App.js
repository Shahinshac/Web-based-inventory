import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';

import CustomersScreen from './src/screens/CustomersScreen';
import CustomerCardScreen from './src/screens/CustomerCardScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import LoginScreen from './src/screens/LoginScreen';

import { AuthProvider, useAuth } from './src/hooks/useAuth';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabIcon({ name, color, size }) {
  const icons = {
    dashboard: '📊',
    customers: '👥',
    scan: '📷',
  };
  return <Text style={{ fontSize: size * 0.8 }}>{icons[name] || '●'}</Text>;
}

function CustomersStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#2563eb' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="CustomersList"
        component={CustomersScreen}
        options={{ title: 'Customers' }}
      />
      <Stack.Screen
        name="CustomerCard"
        component={CustomerCardScreen}
        options={{ title: 'Customer Card' }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <TabIcon name={route.name.toLowerCase()} color={color} size={size} />
        ),
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          borderTopWidth: 1,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Customers" component={CustomersStack} />
      <Tab.Screen name="Scan" component={QRScannerScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
