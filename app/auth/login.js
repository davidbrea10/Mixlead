import React from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet, // Importa StyleSheet para una mejor organización
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { collectionGroup, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useTranslation } from "react-i18next";
import i18n from "../locales/i18n";
import Toast from "react-native-toast-message";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isTablet = SCREEN_WIDTH >= 700;

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  const insets = useSafeAreaInsets();

  // Reemplaza tu useEffect actual por este
  useEffect(() => {
    const debugBiometrics = async () => {
      console.log("--- [Depuración Biométrica] ---");

      // 1. Comprobación de hardware
      const compatible = await LocalAuthentication.hasHardwareAsync();
      console.log(
        `[Depuración Biométrica] 1. ¿El hardware es compatible?: ${compatible}`,
      );

      // 2. Comprobación de huellas/caras registradas en el dispositivo
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      console.log(
        `[Depuración Biométrica] 2. ¿Hay huellas/caras registradas en el móvil?: ${enrolled}`,
      );

      // 3. Comprobación de credenciales guardadas en la app
      const savedEmail = await SecureStore.getItemAsync("savedEmail");
      console.log(
        `[Depuración Biométrica] 3. ¿Hay credenciales guardadas en la app?: ${savedEmail ? `Sí (${savedEmail})` : "No"}`,
      );

      // 4. Decisión final
      if (compatible && enrolled && savedEmail) {
        console.log(
          "[Depuración Biométrica] ✅ Todas las condiciones se cumplen. El botón debería mostrarse.",
        );
        setIsBiometricSupported(true);
      } else {
        console.log(
          "[Depuración Biométrica] ❌ Una o más condiciones fallaron. El botón permanecerá oculto.",
        );
        if (!compatible)
          console.log(
            "--> Causa: La librería no detecta el hardware biométrico.",
          );
        if (!enrolled)
          console.log(
            "--> Causa: El móvil no tiene ninguna huella/cara configurada en sus ajustes.",
          );
        if (!savedEmail)
          console.log(
            "--> Causa: Aún no has iniciado sesión una vez con contraseña para guardar las credenciales.",
          );
      }
      console.log("--- [Fin Depuración Biométrica] ---");
    };

    debugBiometrics();
  }, []);

  const flag =
    i18n.language === "es"
      ? require("../../assets/es.png")
      : require("../../assets/en.png");

  const { t } = useTranslation();

  const handleLogin = async () => {
    // Validación inicial (sin cambios)
    if (!email || !password) {
      Toast.show({
        type: "error",
        text1: t("error_title"),
        text2: t("please_enter_credentials"),
        visibilityTime: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Autenticar con Firebase Auth (sin cambios)
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // 2. Verificar si el email está verificado (sin cambios)
      if (!user.emailVerified) {
        Toast.show({
          type: "error",
          text1: t("error_title"),
          text2: t("email_not_verified"),
          visibilityTime: 4000,
        });
        setLoading(false);
        // await signOut(auth); // Considerar desloguear
        return;
      }

      // --- PASO 3: Buscar datos usando Collection Group Query POR EMAIL ---
      // ESTE CÓDIGO YA FUNCIONA CON LA ESTRUCTURA /companies/{id}/employees/{uid}
      console.log(
        `User authenticated: ${user.uid}. Searching Firestore data by email: ${user.email}...`,
      );
      const employeesGroupRef = collectionGroup(db, "employees"); // Busca en TODAS las colecciones llamadas 'employees'

      // Busca donde el campo 'email' dentro de esos documentos coincida
      const userQuery = query(
        employeesGroupRef,
        where("email", "==", user.email),
      );

      const userQuerySnapshot = await getDocs(userQuery); // Ejecuta la consulta
      // --- FIN PASO 3 ---

      // --- PASO 4: Procesar el resultado ---
      if (!userQuerySnapshot.empty) {
        // Se encontró el documento del empleado en alguna subcolección 'employees'
        if (userQuerySnapshot.size > 1) {
          console.warn(
            `Warning: Found multiple (${userQuerySnapshot.size}) user data entries for email ${user.email}. Using the first one.`,
          );
        }
        const userDoc = userQuerySnapshot.docs[0];
        const userData = userDoc.data();
        const userRole = userData.role;

        console.log(`Firestore data found. Role: ${userRole}`);

        Toast.show({
          type: "success",
          text1: t("success_title"),
          text2: t("login_successful"),
          visibilityTime: 2000,
        });

        // Redirigir según el rol (sin cambios)
        if (
          userRole === "admin" ||
          userRole === "coordinator" ||
          userRole === "employee"
        ) {
          // Guarda las credenciales solo si el login fue exitoso
          await SecureStore.setItemAsync("savedEmail", email);
          await SecureStore.setItemAsync("savedPassword", password);
          console.log("Credentials saved for biometric login.");

          // Redirección (sin cambios)
          if (userRole === "admin") {
            router.replace("/admin/home");
          } else if (userRole === "coordinator") {
            router.replace("/coordinator/home");
          } else {
            router.replace("/employee/home");
          }
        }
      } else {
        // Autenticado, pero no se encontró el documento en Firestore con ese email
        console.error(
          `Login Error: Firestore data not found for authenticated user ${user.uid} with email ${user.email} in any 'employees' subcollection.`,
        );
        Toast.show({
          type: "error",
          text1: t("error_title"),
          text2: t("user_data_not_found"),
          visibilityTime: 4000,
        });
        await signOut(auth); // Desloguear si no hay datos
      }
      // --- FIN PASO 4 ---
    } catch (error) {
      // --- Manejo de errores de Autenticación (sin cambios) ---
      let errorMessage = t("login_failed");
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password"
      ) {
        errorMessage = t("invalid_credentials");
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = t("too_many_attempts");
      } else if (error.code === "auth/invalid-email") {
        errorMessage = t("invalid_email_format");
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = t("network_error");
      } else {
        console.error("Login Error Raw:", error);
      }
      Toast.show({
        type: "error",
        text1: t("error_title"),
        text2: errorMessage,
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      // 1. Muestra el diálogo de autenticación biométrica
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: t("biometric_prompt"), // Añade esta traducción
        disableDeviceFallback: true, // No permite usar el PIN del dispositivo
        cancelLabel: t("cancel"), // Añade esta traducción
      });

      // 2. Si la autenticación es exitosa
      if (biometricAuth.success) {
        setLoading(true);
        // Recupera las credenciales guardadas
        const savedEmail = await SecureStore.getItemAsync("savedEmail");
        const savedPassword = await SecureStore.getItemAsync("savedPassword");

        if (savedEmail && savedPassword) {
          // Inicia sesión con las credenciales recuperadas
          // (Esta es la misma lógica que en handleLogin)
          const userCredential = await signInWithEmailAndPassword(
            auth,
            savedEmail,
            savedPassword,
          );
          const userDoc = (
            await getDocs(
              query(
                collectionGroup(db, "employees"),
                where("email", "==", savedEmail),
              ),
            )
          ).docs[0];
          const userRole = userDoc.data().role;

          Toast.show({
            type: "success",
            text1: t("success_title"),
            text2: t("login_successful"),
          });

          if (userRole === "admin") router.replace("/admin/home");
          else if (userRole === "coordinator")
            router.replace("/coordinator/home");
          else router.replace("/employee/home");
        }
      }
    } catch (error) {
      console.error("Biometric login error:", error);
      Toast.show({
        type: "error",
        text1: t("error_title"),
        text2: t("biometric_failed"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    router.push("auth/register");
  };

  const handleRecoverPassword = () => {
    router.push("auth/passwordReset");
  };

  const handleLanguageChange = () => {
    const newLang = i18n.language === "en" ? "es" : "en";
    i18n.changeLanguage(newLang);
  };

  return (
    // 1. Make LinearGradient the outermost container
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={styles.fullScreenGradient} // Use a style that ensures it fills the screen
    >
      {/* 2. Place SafeAreaView INSIDE the gradient */}
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }}
      >
        {/* Nuevo contenedor para encabezado */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={handleLanguageChange}
            style={styles.languageSelector}
          >
            <Image
              source={flag}
              style={styles.flagImage}
              resizeMode="contain"
            />
            <Text style={styles.languageText}>{t("change_language")}</Text>
          </TouchableOpacity>
        </View>

        {/* Contenedor principal del contenido */}
        <View style={styles.contentContainer}>
          {/* Welcome Text */}
          <Text style={styles.welcomeText}>{t("welcome_back")}</Text>

          {/* Logo */}
          <Image
            source={require("../../assets/icon.png")}
            style={styles.logo}
          />

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                placeholder={t("enter_email")}
                placeholderTextColor={"gray"}
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                autoCorrect={false}
              />
              {email.length > 0 && (
                <TouchableOpacity
                  onPress={() => setEmail("")}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={24} color="gray" />
                </TouchableOpacity>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <TextInput
                placeholder={t("password")}
                placeholderTextColor={"gray"}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                textContentType="password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={24}
                  color="gray"
                />
              </TouchableOpacity>
            </View>

            {/* Recover Password Link */}
            <TouchableOpacity
              onPress={handleRecoverPassword}
              style={styles.recoverPasswordButton}
            >
              <Text style={styles.recoverPasswordText}>
                {t("recover_password")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <View style={styles.signInContainer}>
            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.signInButtonBase,
                isBiometricSupported && styles.signInButtonWithBiometric, // Estilo para hacer espacio
                loading && styles.signInButtonLoading,
                pressed && !loading && styles.signInButtonPressed,
              ]}
            >
              {loading && !isBiometricSupported ? (
                <ActivityIndicator
                  size="small"
                  color="#fff"
                  style={styles.spinner}
                />
              ) : null}
              <Text style={styles.signInButtonText}>
                {loading ? t("signing_in") : t("sign_in")}
              </Text>
            </Pressable>

            {/* --- BOTÓN BIOMÉTRICO --- */}
            {isBiometricSupported && (
              <TouchableOpacity
                onPress={handleBiometricLogin}
                testID="biometric-button"
                disabled={loading}
                style={styles.biometricButton}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#006892" />
                ) : (
                  <Ionicons name="finger-print" size={32} color="#006892" />
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>
              {t("no_account")}{" "}
              <Text style={styles.registerLink} onPress={handleRegister}>
                {t("register_here")}
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

// Define los estilos usando StyleSheet
const styles = StyleSheet.create({
  fullScreenGradient: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },

  headerContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  languageSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 15,
  },
  flagImage: { width: 28, height: 28, borderRadius: 14 },
  languageText: { marginLeft: 8, fontSize: 16, color: "#333" },

  contentContainer: {
    flex: 1,
    width: "90%",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 20,
  },
  welcomeText: {
    fontSize: isTablet ? 40 : 32,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#444B59",
    textAlign: "center",
  },
  logo: {
    width: isTablet ? 250 : 150,
    height: isTablet ? 250 : 150,
    marginBottom: 30,
    resizeMode: "contain",
  },

  inputContainer: { width: "100%", marginBottom: 15 },
  inputWrapper: { position: "relative", width: "100%", marginBottom: 15 },
  input: {
    height: 55,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 18,
    backgroundColor: "white",
    paddingRight: 50,
    color: "black",
  },
  clearButton: {
    position: "absolute",
    right: 10,
    top: 0,
    height: "100%",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  eyeButton: {
    position: "absolute",
    right: 10,
    top: 0,
    height: "100%",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  recoverPasswordButton: {
    alignSelf: "flex-end",
    marginTop: -5,
    marginBottom: 10,
  },
  recoverPasswordText: { color: "gray", fontSize: 16 },

  signInContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 10,
  },

  signInButtonBase: {
    height: 55,
    flex: 1, // Ocupa el espacio disponible
    backgroundColor: "#006892",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  signInButtonLoading: { backgroundColor: "#a0a0a0" },
  signInButtonPressed: { opacity: 0.8 },
  spinner: { marginRight: 10 },
  signInButtonText: { color: "#fff", fontSize: 19, fontWeight: "bold" },

  registerContainer: { alignItems: "center", marginTop: 40 },
  registerText: {
    fontSize: 18,
    textAlign: "center",
    color: "#444B59",
    lineHeight: 24,
  },
  registerLink: { color: "#006892", fontWeight: "bold" },

  signInButtonWithBiometric: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  biometricButton: {
    width: 60,
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#006892",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
});
