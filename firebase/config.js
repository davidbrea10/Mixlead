import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  // Funciones principales de Auth
  getAuth,
  initializeAuth,
  // Tipos de Persistencia
  getReactNativePersistence, // Para RN
  indexedDBLocalPersistence, // Para Web (preferido)
  browserLocalPersistence, // Para Web (alternativa)
  // browserSessionPersistence, // Otra opción web
  // inMemoryPersistence // Otra opción web/RN
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native"; // Importa Platform
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID,
} from "@env";

// Configuración de Firebase (sin cambios)
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  measurementId: FIREBASE_MEASUREMENT_ID,
};

// Inicializa Firebase App (sin cambios)
const app = initializeApp(firebaseConfig);

// --- Inicialización de Auth específica de plataforma ---
let auth;

if (Platform.OS === "web") {
  // En la web, usa persistencia web (IndexedDB es preferible)
  console.log("Initializing Firebase Auth for Web with IndexedDB persistence");
  auth = initializeAuth(app, {
    persistence: indexedDBLocalPersistence, // O browserLocalPersistence
    // popupRedirectResolver: browserPopupRedirectResolver, // Puede ser necesario si usas popups/redirects
  });
} else {
  // En móvil (Android/iOS), usa persistencia de React Native
  console.log(
    "Initializing Firebase Auth for React Native with AsyncStorage persistence",
  );
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}
// -------------------------------------------------------

// Inicializa Firestore (sin cambios)
const db = getFirestore(app);

console.log("Firebase.js: Exporting auth object:", auth);

export { app, db, auth };
