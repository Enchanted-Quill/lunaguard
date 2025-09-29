// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

import React from "react";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyABfu_CZbRMAck-FdPUc-qzrhm2rKJcoB8",
  authDomain: "lunaguard-304d3.firebaseapp.com",
  projectId: "lunaguard-304d3",
  storageBucket: "lunaguard-304d3.firebasestorage.app",
  messagingSenderId: "877797615505",
  appId: "1:877797615505:web:55f5e70ffcff74fd909c30"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});