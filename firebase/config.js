import { initializeApp } from 'firebase/app';
import {
  Platform, // Importa Platform para ajustes específicos si fueran necesarios
} from "react-native";
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID,
} from "@env";
// Asegúrate de importar estas si usas persistencia en Auth
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getReactNativePersistence,
  initializeAuth,
  // Si usas persistencia web, asegúrate de importar estas si no están disponibles globalmente
  indexedDBLocalPersistence,
  browserLocalPersistence
} from "firebase/auth";
// Asegúrate de importar getFirestore si usas Firestore
import { getFirestore } from "firebase/firestore";

// Configuración de Firebase usando variables de entorno
// Asegúrate de que @env esté configurado y que estas variables estén accesibles
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  measurementId: FIREBASE_MEASUREMENT_ID,
};

// Inicializa Firebase App
const app = initializeApp(firebaseConfig);

// >>>>> Inicializa Auth y Firestore AQUÍ <<<<<

// Inicializa Auth condicionalmente según la plataforma
let authInstance; // Usamos un nombre temporal aquí
if (Platform.OS === "web") {
  console.log("Initializing Firebase Auth for Web with IndexedDB persistence");
  authInstance = initializeAuth(app, {
      persistence: typeof indexedDBLocalPersistence !== 'undefined' ? indexedDBLocalPersistence : browserLocalPersistence,
  });
} else {
  console.log(
      "Initializing Firebase Auth for React Native with AsyncStorage persistence",
  );
  authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
  });
}

// Inicializa Firestore
const dbInstance = getFirestore(app);

// >>>>> Exporta las instancias inicializadas <<<<<
export const auth = authInstance; // Exportamos la instancia de Auth
export const db = dbInstance;   // Exportamos la instancia de Firestore
export { app }; // Puedes exportar la app principal también si la necesitas