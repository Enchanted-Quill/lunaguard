import {
  StyleSheet,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  TouchableOpacity,
  View,
  Alert
} from 'react-native';


import auth from '@react-native-firebase/auth';
import { useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { signInWithGoogle } from '../../utils/firebaseAuth';

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const register = async () => {
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(
        email.trim(),
        password.trim()
      );
      if (userCredential) router.replace('/home');
    } catch (error) {
      console.error("Registration error:", error.code, error.message);
      Alert.alert('Sign up failed: ' + error.message);
    }
  };

  const handleGoogleRegister = async () => {
      try {
        await signInWithGoogle();
        Alert.alert('Success', 'Google sign-up successful!');
        router.replace('/home');
      } catch (error) {
        Alert.alert('Error', 'Google sign-up failed. Please try again.');
      }
    };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={["#521684", "#1c052f"]}
            style={StyleSheet.absoluteFill}
          />
          <Image
            source={require('../../assets/register.png')}
            style={styles.img}
            resizeMode="contain"
          />
          <Text style={styles.title}>
            <Text style={styles.luna}>Sign </Text>
            <Text style={styles.guard}>Up</Text>
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.textInput}
            placeholder="password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity onPress={register} style={styles.button}>
            <Text style={styles.text}>Register</Text>
          </TouchableOpacity>

          <Text style={styles.orText}>OR</Text>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.secondaryButton}
              accessibilityRole="button"
              accessibilityLabel="Continue with Phone"
              onPress= {()=> {router.push('/(auth)/phone')}}
            >
              <MaterialIcons
                name="phone"
                size={18}
                color="#FFFFFF"
                style={styles.icon}
              />
              <Text style={styles.secondaryText}>Continue With Phone</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              accessibilityRole="button"
              onPress={handleGoogleRegister}
              accessibilityLabel="Continue with Google"
            >
              <FontAwesome
                name="google"
                size={18}
                color="#FFFFFF"
                style={styles.icon}
              />
              <Text style={styles.secondaryText}>Continue With Google</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

export default SignUp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#301934',
  },
  img: {
    width: 200,
    height: 180,
    marginBottom: 10,
  },
  title: {
    fontSize: 62,
    fontWeight: "bold",
    marginBottom: 12,
  },
  luna: {
    color: "#e1c8f5",
  },
  guard: {
    color: "#ac78cf",
  },
  textInput: {
    height: 50,
    width: '90%',
    backgroundColor: '#8d5fc4',
    borderWidth: 2,
    borderRadius: 15,
    marginVertical: 8,
    paddingHorizontal: 25,
    fontSize: 16,
    color: '#ffffffff',
    shadowColor: '#9E9E9E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  button: {
    width: '60%',
    marginVertical: 15,
    backgroundColor: '#570d81ff',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#815cc0ff',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 7,
    elevation: 5,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  card: {
    width: '92%',
    backgroundColor: 'rgba(255, 255, 255, 0)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  orText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  secondaryButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 12,
    borderRadius: 10,
    marginVertical: 6,
    paddingHorizontal: 12,
  },
  secondaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  icon: {
    marginRight: 10,
    opacity: 0.95,
  }
});
