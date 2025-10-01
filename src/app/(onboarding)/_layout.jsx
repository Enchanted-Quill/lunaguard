import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function Layout() {
  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

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