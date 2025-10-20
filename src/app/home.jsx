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
        <Text style={styles.subtitle}>What do you want to do today?</Text>

        {/* Settings Button */}
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.5}
          onPress={() => router.push("/(settings)/settings")} // Navigate to settings
        >
          <Text style={styles.buttonText}>Settings</Text>
        </TouchableOpacity>

        {/* Map Button */}
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.5}
          onPress={() => router.push("/map")} // Navigate to map
        >
          <Text style={styles.buttonText}>Map</Text>
        </TouchableOpacity>

        {/* Empowerment Circles Button */}
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.5}
          onPress={() => router.push("/chat")} // Navigate to Empowerment Circles
        >
          <Text style={styles.buttonText}>Empowerment Circles</Text>
        </TouchableOpacity>

        {/* Evidence Locker Button */}
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.5}
          onPress={() => router.push("/evidence")} // Navigate to evidence locker
        >
          <Text style={styles.buttonText}>Evidence Locker</Text>
        </TouchableOpacity>

        {/* SOS Button */}
        <TouchableOpacity
          style={styles.emergencyButton}
          activeOpacity={0.5}
        >
        <LinearGradient
        colors={["#eb697c", "#7e1067"]}
        style= {styles.gradientBackground}
        />
          <Text style={styles.buttonText}>SOS</Text>
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
    width: 200,
    marginVertical: 8,
    alignSelf: "center",
    alignItems: "center"
  },
  buttonText: {
    color: "#e0c8c4",
    fontSize: 16,
    fontWeight: "600",
  },
  emergencyButton: {
    borderRadius: 25,
    paddingVertical: 12,
    width: 200,
    marginVertical: 8,
    alignSelf: "center",
    alignItems: "center"
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 25
  }
});
