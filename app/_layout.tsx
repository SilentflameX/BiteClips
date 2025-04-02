import React from 'react';
import { AuthProvider } from './AuthContext';  // Import your AuthProvider
import { Stack } from 'expo-router';  // Import the Stack component from expo-router

export default function Layout() {
  return (
    <AuthProvider>  {/* Wrap your entire app with AuthProvider */}
      <Stack screenOptions={{ headerShown: false }}/>  {/* Expo Router automatically handles navigation */}
    </AuthProvider>
  );
}
