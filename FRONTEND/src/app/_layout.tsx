import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FinanceProvider } from '../context/FinanceContext';
import { THEME } from '../constants/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <FinanceProvider>
        <StatusBar style="dark" backgroundColor={THEME.colors.background} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: THEME.colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="transactions" />
          <Stack.Screen name="insights" />
          <Stack.Screen name="recurring" />
          <Stack.Screen name="anomalies" />
          <Stack.Screen name="simulator" />
          <Stack.Screen name="analysis" />
          <Stack.Screen name="assistant" />
          <Stack.Screen name="goals" />
          <Stack.Screen name="settings" />
        </Stack>
      </FinanceProvider>
    </SafeAreaProvider>
  );
}
