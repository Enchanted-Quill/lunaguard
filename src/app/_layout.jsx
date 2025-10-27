import { StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { UserProvider } from '../context/UserContext';
import { initializeApp } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';

if (!auth().app) {
  initializeApp();
}

const _layout = () => {
  return (
    <UserProvider>
      <SafeAreaProvider style={styles.container}>
        <Stack screenOptions={{
          headerStyle: {backgroundColor: '#9e5bebd3'},
          headerShown: false,
          headerTintColor: 'white',
          headerTitleStyle: {fontWeight: 'bold'},
          headerLargeTitleShadowVisible: false,
          headerLargeTitle: true
        }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)/login" options={{headerShown: true, title: 'Log In'}} />
          <Stack.Screen name="(auth)/register" options={{headerShown: true, title: 'Register'}} />
          <Stack.Screen name="(settings)/settings" />
          <Stack.Screen name="(settings)/changesettings" />
          <Stack.Screen name="map" />
        </Stack>
      </SafeAreaProvider>
    </UserProvider>
  )
}

export default _layout

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#521684'
  }
});