import React from 'react';
import { Stack } from 'expo-router'

const OnboardingNavigator = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' }
      }}
    >
      <Stack.Screen name="onboarding1" />
      <Stack.Screen name="onboarding2" />
      <Stack.Screen name="onboarding3" />
      <Stack.Screen name="onboarding4" />
    </Stack>
  );
};

export default OnboardingNavigator;