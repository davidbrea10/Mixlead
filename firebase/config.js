import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCSyYP0Al8mbfn3JSAOvq_TFryuEIkO-34",
  authDomain: "mixlead-e7783.firebaseapp.com",
  projectId: "mixlead-e7783",
  storageBucket: "mixlead-e7783.appspot.com",
  messagingSenderId: "705615556084",
  appId: "1:705615556084:web:6a3bf1e694b6f7f1189da1",
  measurementId: "G-YP4RVR5JD5",
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Inicializa Firebase Auth con persistencia en AsyncStorage
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Inicializa Firestore
const db = getFirestore(app);

export { app, db, auth };
