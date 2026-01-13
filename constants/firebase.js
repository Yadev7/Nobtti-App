import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // حط المعلومات ديالك هنا
    apiKey: "AIzaSyC937DPgGBc5OaPEOS7Kj0ZugsJtIKDhuM",
  authDomain: "bookingapp-a78ce.firebaseapp.com",
  projectId: "bookingapp-a78ce",
  storageBucket: "bookingapp-a78ce.firebasestorage.app",
  messagingSenderId: "615212946308",
  appId: "1:615212946308:web:2998648512e0f1d9a203d1",
  measurementId: "G-VRSF0VZ9JW"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
