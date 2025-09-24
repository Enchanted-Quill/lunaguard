import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

const logo = require("../assets/logo.png"); // adjust path if needed

export default function HomeScreen() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [pulse]);

  const animatedOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.7], // stronger contrast
  });

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={["#521684", "#1c052f"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated lighting effects */}
      <Animated.View
        style={[
          styles.lightEffect,
          { top: -180, left: -180, opacity: animatedOpacity },
        ]}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0.7)", "transparent"]}
          start={{ x: 0.2, y: 0.2 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.lightEffect,
          { bottom: -220, right: -220, opacity: animatedOpacity },
        ]}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0.6)", "transparent"]}
          start={{ x: 0.8, y: 0.8 }}
          end={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Main content */}
      <SafeAreaView style={styles.inner}>
        {/* Logo */}
        <Image source={logo} style={styles.logo} resizeMode="contain" />

        <Text style={styles.title}>
          <Text style={styles.luna}>luna</Text>
          <Text style={styles.guard}>guard</Text>
        </Text>
        <Text style={styles.subtitle}>Safety that never sleeps.</Text>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button}>
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
    width: 120, // smaller logo
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
    marginBottom: 20, // reduced spacing before buttons
    textAlign: "center",
  },
  button: {
    backgroundColor: "#652a9c",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 40,
    marginVertical: 8,
    alignSelf: "center",
  },
  buttonText: {
    color: "#e0c8c4",
    fontSize: 16,
    fontWeight: "600",
  },
  lightEffect: {
    position: "absolute",
    width: 480, // larger radius for stronger glow
    height: 480,
    borderRadius: 240,
  },
});
