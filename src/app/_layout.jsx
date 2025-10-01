import { Platform, StyleSheet, Text, View } from 'react-native'
import { Slot, Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { LinearGradient } from "expo-linear-gradient";
const _layout = () => {
  return (
    <SafeAreaProvider style={styles.container}>
      <Stack screenOptions = {{headerStyle: {backgroundColor: '#9e5bebd3'}, headerShown: false, headerTintColor: 'white', headerTitleStyle: {fontWeight: 'bold'}, headerLargeTitleShadowVisible: false, headerLargeTitle: true}}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" options={{headerShown: true, title: 'Log In'}} />
        <Stack.Screen name="(auth)/register" options={{headerShown: true, title: 'Register'}} />
      </Stack>

    </SafeAreaProvider>
  )
}

export default _layout

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
    <LinearGradient
      colors={["#521684", "#1c052f"]}
      style={StyleSheet.absoluteFill}
    />
  }
});