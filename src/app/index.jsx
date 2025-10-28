import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useUser } from "../context/UserContext";

export default function Index() {
  const router = useRouter();
  const { updateProfile, updateContacts, updateShortcuts, updateIncidents } = useUser();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const checkAuthAndLoadData = async () => {
      const user = auth.currentUser;

      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userRef);

          if (docSnap.exists()) {
            const data = docSnap.data();

            updateProfile({
              username: data.username || "",
              name: data.name || "",
              email: data.email || "",
              phone: data.phone || "",
              profilePic: data.profilePic || null,
            });

            if (data.contacts) updateContacts(data.contacts);
            if (data.shortcuts) updateShortcuts(data.shortcuts);
            if (data.incidents) updateIncidents(data.incidents);
          }

          router.replace("/home");
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      } else {
        router.replace("/initial"); // not logged in
      }

      setLoading(false);
    };

    checkAuthAndLoadData();
  }, [mounted]);

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#652a9c" />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
