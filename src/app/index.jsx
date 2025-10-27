import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '877797615505-7ulh4595slq2roakc1gmd22aceabaufd.apps.googleusercontent.com', // Replace with your Web Client ID
});

//Finds saved logo in assets
const logo = require("../assets/logo.png");

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={["#521684", "#1c052f"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Main content */}
      <SafeAreaView style={styles.inner}>

        {/* Logo */}
        <Image source={logo} style={styles.logo} resizeMode="contain" />

        {/* Title */}
        <Text style={styles.title}>
          <Text style={styles.luna}>luna</Text>
          <Text style={styles.guard}>guard</Text>
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>Safety that never sleeps.</Text>

        {/* Login Button */}
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.5}
          onPress={() => router.push("/login")} // Navigate to login
        >
          <Text style={styles.buttonText}>Log In</Text>
        </TouchableOpacity>

        {/* Register Button */}
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.5}
          onPress={() => router.push("/(auth)/register")} // Navigate to register
        >
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logo: {
    width: 120,
    height: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 12,
  },
  luna: {
    color: "#e1c8f5",
  },
  guard: {
    color: "#ac78cf",
  },
  subtitle: {
    fontSize: 18,
    color: "#e0c8c4",
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#652a9c",
    borderRadius: 25,
    paddingVertical: 12,
    width: 120,
    marginVertical: 8,
    alignSelf: "center",
    alignItems: "center"
  },
  buttonText: {
    color: "#e0c8c4",
    fontSize: 16,
    fontWeight: "600",
  },
});