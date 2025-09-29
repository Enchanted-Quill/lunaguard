import { Platform, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Slot, Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
const _layout = () => {
  return (
    <SafeAreaProvider style={{flex: 1}}>
      <Stack screenOptions = {{headerStyle: {backgroundColor: '#9e5bebd3'}, headerShown: false, headerTintColor: 'white', headerTitleStyle: {fontWeight: 'bold'}, headerLargeTitleShadowVisible: false, headerLargeTitle: true}}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" options={{headerShown: true, title: 'Log In'}} />
        <Stack.Screen name="(auth)/register" options={{headerShown: true, title: 'Register'}} />
      </Stack>

    </SafeAreaProvider>
  )
}

export default _layout

const styles = StyleSheet.create({})