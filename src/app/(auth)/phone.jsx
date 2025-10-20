import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  View,
  TouchableOpacity,
  Alert
} from "react-native";
import { getAuth, signInWithPhoneNumber } from "@react-native-firebase/auth";
import { useRouter } from "expo-router";

export default function PhoneAuth() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  const router = useRouter();
  const auth = getAuth();

  const sendCode = async () => {
    if (!phoneNumber) {
      Alert.alert("Error", "Please enter a phone number.");
      return;
    }
    try {
      const formattedNumber = phoneNumber.startsWith("+")
        ? phoneNumber
        : `+1${phoneNumber}`;
      const confirmResult = await signInWithPhoneNumber(auth, formattedNumber);
      setConfirmation(confirmResult);
      Alert.alert("Code Sent", "Check your SMS for the verification code.");
    } catch (error) {
      console.error("Phone Sign-In Error:", error);
      Alert.alert("Error", error.message);
    }
  };

  const confirmCode = async () => {
    if (!confirmation) return;
    try {
      await confirmation.confirm(code);
      Alert.alert("Success", "Phone authentication complete!");
      router.replace("/home"); // navigate to home after success
    } catch (error) {
      console.error("OTP Confirm Error:", error);
      Alert.alert("Invalid Code", "The code you entered is incorrect.");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <View style={styles.container}>
          <Text style={styles.heading}>Phone Authentication</Text>

          <Text style={styles.label}>Enter your phone number</Text>
          <TextInput
            style={styles.input}
            placeholder="123 456 7890"
            placeholderTextColor="#ccc"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />

          <TouchableOpacity style={styles.button} onPress={sendCode}>
            <Text style={styles.buttonText}>Send Code</Text>
          </TouchableOpacity>

          {confirmation && (
            <View style={styles.verificationContainer}>
              <Text style={styles.label}>Enter verification code</Text>
              <TextInput
                style={styles.input}
                placeholder="123456"
                placeholderTextColor="#ccc"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
              />
              <TouchableOpacity style={styles.button} onPress={confirmCode}>
                <Text style={styles.buttonText}>Verify Code</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a033d",
    padding: 20,
    justifyContent: "center",
  },
  heading: {
    fontSize: 28,
    color: "#e1c8f5",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 30,
  },
  label: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderColor: "#7b2cbf",
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    color: "#fff",
    fontSize: 16,
  },
  button: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 5,
    backgroundColor: "#570d81ff",
    alignItems: "center",
    marginVertical: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  verificationContainer: {
    marginTop: 20,
  },
});
