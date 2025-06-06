import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
  StyleSheet, // Import StyleSheet
  ActivityIndicator, // Import ActivityIndicator
  SafeAreaView,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
// Add a second document with a generated ID.
import { auth, db } from "../../firebase/config"; // Asegúrate de la ruta correcta
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import {
  doc,
  setDoc,
  collection, // <-- Necesario
  query, // <-- Necesario
  where, // <-- Necesario
  getDocs, // <-- Necesario
} from "firebase/firestore";
import { useTranslation } from "react-i18next";
import i18n from "../locales/i18n"; // Importa la configuración de i18next
import { format } from "date-fns"; // Importamos date-fns para formatear la fecha
import Toast from "react-native-toast-message";

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dni: "",
    phone: "",
    birthDate: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    dni: "",
    phone: "",
    birthDate: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [birthDate, setBirthDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);

  const flag =
    i18n.language === "es"
      ? require("../../assets/es.png")
      : require("../../assets/en.png");

  // Initialize i18n
  const { t } = useTranslation();

  const validatePassword = (password) => {
    // Expresión regular: al menos 8 caracteres, una letra y un número
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

    if (!password) {
      setErrors((prev) => ({ ...prev, password: t("errors.required") }));
    } else if (!passwordRegex.test(password)) {
      setErrors((prev) => ({
        ...prev,
        password: t("errors.invalidPassword"),
      }));
    } else {
      setErrors((prev) => ({ ...prev, password: "" }));
    }
  };

  const handleInputChange = (field, value) => {
    setForm({ ...form, [field]: value });

    // Validaciones en vivo
    if (field === "dni") {
      validateDni(value);
    } else if (field === "phone") {
      validatePhone(value);
    } else if (field === "birthDate") {
      validateAge(value);
    } else if (field === "password") {
      validatePassword(value);
    } else if (field === "confirmPassword") {
      validateConfirmPassword(value);
    }
  };

  const validateConfirmPassword = (confirmPassword) => {
    if (confirmPassword !== form.password) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: t("errors.passwordsMismatch"),
      }));
    } else {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  };

  const validateDni = async (dni) => {
    const dniRegex = /^[0-9]{8}[A-Z]$/;

    if (!dni) {
      setErrors((prev) => ({ ...prev, dni: t("errors.required") }));
      return;
    } else if (!dniRegex.test(dni)) {
      setErrors((prev) => ({ ...prev, dni: t("errors.invalidDni") }));
      return;
    }
    setErrors((prev) => ({ ...prev, dni: "" }));
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{9}$/; // Ejemplo: 9 dígitos
    if (!phone) {
      setErrors((prev) => ({ ...prev, phone: t("errors.required") }));
    } else if (!phoneRegex.test(phone)) {
      setErrors((prev) => ({ ...prev, phone: t("errors.invalidPhone") }));
    } else {
      setErrors((prev) => ({ ...prev, phone: "" }));
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      setErrors((prev) => ({ ...prev, email: t("errors.required") }));
    } else if (!emailRegex.test(email)) {
      setErrors((prev) => ({ ...prev, email: t("errors.invalidEmail") }));
    } else {
      setErrors((prev) => ({ ...prev, email: "" }));
    }
  };

  const validateAge = (birthDate) => {
    const birthDateObj = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    const dayDiff = today.getDate() - birthDateObj.getDate();

    if (
      age < 18 ||
      (age === 18 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)))
    ) {
      setErrors((prev) => ({
        ...prev,
        birthDate: t("errors.ageRestriction"),
      }));
    } else {
      setErrors((prev) => ({ ...prev, birthDate: "" }));
    }
  };

  const onDateChange = (event, selectedDate) => {
    // Always hide picker after interaction (except on iOS where 'spinner' display persists)
    if (Platform.OS !== "ios") {
      setShowDatePicker(false);
    }

    if (event.type === "set" && selectedDate) {
      // Check if a date was selected ('set')
      const formattedDate = format(selectedDate, "yyyy-MM-dd"); // Format as YYYY-MM-DD
      setBirthDate(selectedDate); // Update the Date object state for the picker
      handleInputChange("birthDate", formattedDate); // Update form state with formatted string
      validateAge(formattedDate); // Validate the newly selected date string
      // For iOS 'spinner' display, explicitly hide after selection
      if (Platform.OS === "ios") {
        setShowDatePicker(false);
      }
    } else {
      // User dismissed the picker (on Android) or iOS spinner was closed
      setShowDatePicker(false);
    }
  };

  const handleToggleTerms = () => {
    setTermsAccepted(!termsAccepted);
  };

  const handleShowTerms = () => {
    setIsTermsModalVisible(true);
  };
  const handleHideTerms = () => {
    setIsTermsModalVisible(false);
  };

  const handleRegister = async () => {
    const {
      firstName,
      lastName,
      dni,
      phone,
      birthDate: formBirthDate,
      email,
      password,
      confirmPassword,
    } = form;

    // --- Validaciones previas (sin cambios) ---
    if (!termsAccepted) {
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("register.errors.acceptTerms"),
        visibilityTime: 3000,
      });
      return;
    }
    if (
      !firstName ||
      !lastName ||
      !dni ||
      !phone ||
      !formBirthDate ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("errors.fillAllFields"),
        visibilityTime: 3000,
      });
      return;
    }
    if (password !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("errors.passwordsMismatch"),
        visibilityTime: 3000,
      });
      return;
    }
    const hasErrors = Object.values(errors).some((error) => error !== "");
    if (hasErrors) {
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("errors.fixValidationErrors"),
        visibilityTime: 3000,
      });
      return;
    }
    // --- Fin Validaciones previas ---

    setLoading(true);
    // const firestore = getFirestore(app); // Obtener instancia si 'db' no está disponible
    const firestore = db; // Usar 'db' si ya está importado y configurado

    try {
      // ---- PASO 1: Buscar ID de "No Company" ----
      const companiesColRef = collection(firestore, "companies");
      const noCompanyQuery = query(
        companiesColRef,
        where("Name", "==", "No Company"),
      );
      const noCompanySnapshot = await getDocs(noCompanyQuery);

      let noCompanyId = null;
      if (!noCompanySnapshot.empty) {
        noCompanyId = noCompanySnapshot.docs[0].id;
        console.log("Found 'No Company' ID for registration:", noCompanyId);
      } else {
        // Error crítico: la compañía inicial no existe
        console.error(
          "Critical Setup Error: The 'No Company' document was not found during registration.",
        );
        throw new Error(
          t(
            "register.errors.noCompanySetupMissing",
            "Registration cannot proceed: Initial company setup missing. Please contact support.",
          ),
        );
      }
      // ---- FIN PASO 1 ----

      // ---- PASO 2: Crear usuario en Auth ----
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;
      // ---- FIN PASO 2 ----

      // ---- PASO 3: Enviar email de verificación (sin cambios) ----
      await sendEmailVerification(user);
      // ---- FIN PASO 3 ----

      // ---- PASO 4: Guardar datos en Firestore (RUTA MODIFICADA) ----
      const employeeDocRef = doc(
        firestore,
        "companies",
        noCompanyId,
        "employees",
        user.uid,
      );

      await setDoc(employeeDocRef, {
        firstName,
        lastName,
        role: "employee", // Rol por defecto
        dni,
        phone,
        birthDate: formBirthDate, // Guardar la fecha formateada
        email: user.email, // Usar el email verificado de Auth
        companyId: noCompanyId, // Guardamos el ID de 'No Company' aquí también por si acaso o para referencias futuras
        // Originalmente puse "", pero guardar el ID real de "No Company" puede ser más útil
        createdAt: new Date(), // O usar serverTimestamp() de Firestore
        // Puedes añadir más campos por defecto aquí si es necesario
      });
      console.log(
        `Employee ${user.uid} data saved under company ${noCompanyId}`,
      );
      // ---- FIN PASO 4 ----

      Toast.show({
        type: "success",
        text1: t("register.successTitle"),
        text2: t("register.successMessage"),
        visibilityTime: 4000,
      });

      router.replace("auth/emailConfirmation");
    } catch (error) {
      let errorMessage = t("errors.genericError");
      let errorTitle = t("errors.errorTitle");
      console.error("Registration Error Raw:", error); // Log completo del error

      // Mapeo de errores específicos (incluido el nuevo)
      if (error.message === t("register.errors.noCompanySetupMissing")) {
        errorMessage = error.message; // Usar el mensaje ya traducido
        errorTitle = t("errors.setupErrorTitle", "Configuration Error"); // Título específico
      } else if (error.code === "auth/email-already-in-use") {
        errorMessage = t("errors.emailExists");
        setErrors((prev) => ({ ...prev, email: errorMessage }));
      } else if (error.code === "auth/invalid-email") {
        errorMessage = t("errors.invalidEmail");
        setErrors((prev) => ({ ...prev, email: errorMessage }));
      } else if (error.code === "auth/operation-not-allowed") {
        errorMessage = t("errors.authOperationNotAllowed");
      } else if (error.code === "auth/weak-password") {
        errorMessage = t("errors.weakPassword");
        setErrors((prev) => ({ ...prev, password: errorMessage }));
      } else {
        console.error(
          "Unexpected Registration Error:",
          error.code,
          error.message,
        );
        // Para errores inesperados de Firestore u otros, muestra un mensaje genérico
        // Si error.message tiene algo útil, podrías mostrarlo, pero con cuidado
        errorMessage = t(
          "errors.genericRegistrationError",
          "Could not complete registration. Please try again later.",
        );
      }

      Toast.show({
        type: "error",
        text1: errorTitle,
        text2: errorMessage,
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = () => {
    const newLang = i18n.language === "en" ? "es" : "en";
    i18n.changeLanguage(newLang);
  };

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        <View
          style={{
            backgroundColor: "#FF9300",
            paddingHorizontal: 16,
            paddingTop: Platform.OS === "android" ? 20 : 50, // Espacio para status bar, ajusta según sea necesario
            paddingBottom: 20, // Espacio inferior en el header
            borderBottomStartRadius: 35, // Curvatura más suave
            borderBottomEndRadius: 35, // Curvatura más suave
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2, // Sombra más sutil
            shadowRadius: 5,
            elevation: 7,
          }}
        >
          {/* Header with Back and Language Buttons */}
          <View style={styles.headerIcons}>
            {/* Back Button */}
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={28} color="black" />
            </TouchableOpacity>

            {/* Language Selector */}
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

          <Text
            style={{
              marginTop: 20,
              paddingTop: 60,
              fontSize: 30,
              fontWeight: "bold",
              textAlign: "center",
              color: "#FFFFFF",
              textShadowColor: "black",
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 2,
            }}
          >
            {t("register.title")}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ alignItems: "center", paddingVertical: 20 }}
          style={{ flex: 1 }}
        >
          {/* First Name */}
          <View style={{ width: "90%", marginBottom: 15 }}>
            <Text style={styles.label}>{t("register.firstName")}</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                placeholder={t("register.firstName")}
                placeholderTextColor={"gray"}
                value={form.firstName}
                onChangeText={(text) => handleInputChange("firstName", text)}
                style={styles.input}
              />
              {form.firstName.length > 0 && (
                <TouchableOpacity
                  onPress={() => handleInputChange("firstName", "")}
                  style={styles.clearIcon}
                >
                  <Ionicons name="close-circle" size={24} color="gray" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Last Name */}
          <View style={{ width: "90%", marginBottom: 15 }}>
            <Text style={styles.label}>{t("register.lastName")}</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                placeholder={t("register.lastName")}
                placeholderTextColor={"gray"}
                value={form.lastName}
                onChangeText={(text) => handleInputChange("lastName", text)}
                style={styles.input}
              />
              {form.lastName.length > 0 && (
                <TouchableOpacity
                  onPress={() => handleInputChange("lastName", "")}
                  style={styles.clearIcon}
                >
                  <Ionicons name="close-circle" size={24} color="gray" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* DNI */}
          <View style={{ width: "90%", marginBottom: 15 }}>
            <Text style={styles.label}>{t("register.dni")}</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                placeholder={t("register.dni")}
                placeholderTextColor={"gray"}
                value={form.dni}
                onChangeText={(text) => handleInputChange("dni", text)}
                onBlur={() => validateDni(form.dni)} // <-- Solo se ejecuta al salir del campo
                style={styles.input}
              />

              {form.dni.length > 0 && (
                <TouchableOpacity
                  onPress={() => handleInputChange("dni", "")}
                  style={styles.clearIcon}
                >
                  <Ionicons name="close-circle" size={24} color="gray" />
                </TouchableOpacity>
              )}
            </View>
            {errors.dni ? (
              <Text style={styles.errorText}>{errors.dni}</Text>
            ) : null}
          </View>

          {/* Phone */}
          <View style={{ width: "90%", marginBottom: 15 }}>
            <Text style={styles.label}>{t("register.phone")}</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                placeholder={t("register.phone")}
                placeholderTextColor={"gray"}
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={(text) => handleInputChange("phone", text)}
                style={styles.input}
              />
              {form.phone.length > 0 && (
                <TouchableOpacity
                  onPress={() => handleInputChange("phone", "")}
                  style={styles.clearIcon}
                >
                  <Ionicons name="close-circle" size={24} color="gray" />
                </TouchableOpacity>
              )}
            </View>
            {errors.phone ? (
              <Text style={styles.errorText}>{errors.phone}</Text>
            ) : null}
          </View>

          {/* Birth Date */}
          <View style={{ width: "90%", marginBottom: 15 }}>
            <Text style={styles.label}>{t("register.birthDate")}</Text>
            {/* Pressable to show current date and open picker */}
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={styles.pickerButton} // Use a dedicated style
            >
              <Text
                style={[
                  styles.pickerButtonText, // Base text style
                  !form.birthDate && styles.pickerButtonPlaceholder, // Placeholder style
                ]}
              >
                {form.birthDate || t("register.selectBirthDate")}
              </Text>
              {/* Optional: Add an icon */}
              <Ionicons name="calendar-outline" size={24} color="gray" />
            </Pressable>

            {/* Conditionally render the DateTimePicker */}
            {showDatePicker && (
              <DateTimePicker
                value={birthDate} // Use the Date object state
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"} // Recommended display modes
                onChange={onDateChange}
                maximumDate={
                  new Date(
                    new Date().setFullYear(new Date().getFullYear() - 18),
                  )
                } // Example: Ensure user is at least 18
                // minimumDate={new Date(1920, 0, 1)} // Optional: Set a minimum date
              />
            )}
            {/* Display validation error */}
            {errors.birthDate ? (
              <Text style={styles.errorText}>{errors.birthDate}</Text>
            ) : null}
          </View>

          {/* Email */}
          <View style={{ width: "90%", marginBottom: 15 }}>
            <Text style={styles.label}>{t("register.email")}</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                placeholder={t("register.email")}
                placeholderTextColor={"gray"}
                keyboardType="email-address"
                value={form.email}
                onChangeText={(text) => handleInputChange("email", text)}
                onBlur={() => validateEmail(form.email)} // <-- Solo se ejecuta al salir del campo
                style={styles.input}
              />

              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}

              {form.email.length > 0 && (
                <TouchableOpacity
                  onPress={() => handleInputChange("email", "")}
                  style={styles.clearIcon}
                >
                  <Ionicons name="close-circle" size={24} color="gray" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Password */}
          <View style={{ width: "90%", marginBottom: 15 }}>
            <Text style={styles.label}>{t("register.password")}</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                placeholder={t("register.password")}
                placeholderTextColor={"gray"}
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={(text) => {
                  handleInputChange("password", text);
                  validatePassword(text); // Validación en vivo
                }}
                style={styles.input}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: 10, top: 15 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={24}
                  color="gray"
                />
              </TouchableOpacity>
            </View>
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>

          {/* Confirm Password */}
          <View style={{ width: "90%", marginBottom: 15 }}>
            <Text style={styles.label}>{t("register.confirmPassword")}</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                placeholder={t("register.confirmPassword")}
                placeholderTextColor={"gray"}
                secureTextEntry={!showConfirmPassword}
                value={form.confirmPassword}
                onChangeText={(text) =>
                  handleInputChange("confirmPassword", text)
                }
                style={styles.input}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ position: "absolute", right: 10, top: 15 }}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={24}
                  color="gray"
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            ) : null}
          </View>

          {/* Terms and Conditions */}
          <View style={styles.termsContainer}>
            <TouchableOpacity
              onPress={handleToggleTerms} // Al presionar el icono/área, se marca/desmarca
              style={styles.checkbox}
            >
              <Ionicons
                name={termsAccepted ? "checkbox-outline" : "square-outline"}
                size={24}
                color={termsAccepted ? "#006892" : "gray"}
              />
            </TouchableOpacity>
            <Text style={styles.termsText}>
              {t("register.terms.accept")}
              <Text style={styles.termsLink} onPress={handleShowTerms}>
                {t("register.terms.linkText")}
                {/* Ej: "términos y condiciones" */}
              </Text>
            </Text>
            {/* Si tienes estado de error para los términos, muéstralo aquí */}
          </View>

          {/* Register Button */}
          <Pressable
            onPress={handleRegister}
            style={({ pressed }) => [
              // Add pressed state
              styles.button,
              loading && styles.buttonLoading, // Style when loading
              pressed && !loading && styles.buttonPressed, // Style when pressed
            ]}
            disabled={loading} // Disable when loading
          >
            {/* Conditionally render ActivityIndicator */}
            {loading ? (
              <ActivityIndicator
                size="small"
                color="#fff"
                style={styles.spinner}
              />
            ) : null}
            {/* Conditionally change Text */}
            <Text style={styles.buttonText}>
              {
                loading
                  ? t("register.registeringButton") // Text when loading
                  : t("register.button") // Text when not loading
              }
            </Text>
          </Pressable>
        </ScrollView>

        {/* Footer */}
        <View
          style={{
            backgroundColor: "#006892",
            padding: 40,
            alignItems: "flex-end",
            borderTopEndRadius: 40,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 10,
          }}
        ></View>
      </View>
      <Modal
        animationType="slide" // O "fade"
        transparent={true} // Si quieres que el fondo sea semitransparente
        visible={isTermsModalVisible} // Controlado por el estado
        onRequestClose={handleHideTerms} // Para cerrar con el botón atrás de Android
      >
        <View style={styles.modalOverlay}>
          {/* Fondo oscuro semi-transparente */}
          <View style={styles.termsModalContentContainer}>
            {/* Contenedor del contenido del modal */}
            <Text style={styles.modalTitle}>
              {t("register.terms.linkText")}
            </Text>
            {/* Título del modal */}
            {/* >>> AÑADIR: ScrollView para el texto de los términos <<< */}
            <ScrollView style={styles.termsScrollView}>
              {/* >>>>>> REEMPLAZAR ESTO CON TUS TÉRMINOS Y CONDICIONES REALES <<<<<<< */}
              <Text style={styles.termsModalText}>
                {/* !!! TEXTO DE TÉRMINOS Y CONDICIONES REALES VA AQUÍ !!! */}
                {/* !!! DEBES OBTENER ESTE TEXTO DE UN PROFESIONAL LEGAL O SERVICIO ESPECIALIZADO !!! */}
                {/* !!! ESTE ES SOLO TEXTO DE EJEMPLO Y NO ES LEGALMENTE VÁLIDO !!! */}
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris
                nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor
                in reprehenderit in voluptate velit esse cillum dolore eu fugiat
                nulla pariatur. Excepteur sint occaecat cupidatat non proident,
                sunt in culpa qui officia deserunt mollit anim id est laborum.
                (Continúa con todo el texto de tus términos y condiciones
                reales) Section 1. Acceptance of Terms By creating an account,
                you agree to be bound by these Terms and Conditions. Section 2.
                Privacy Policy Your use of the service is also governed by our
                Privacy Policy. Section 3. User Responsibilities You agree to
                use the service responsibly and not for any illegal or
                prohibited activities. Section 4. Limitation of Liability The
                service is provided "as is" without any warranties. The company
                is not liable for any damages. Section 5. Governing Law These
                Terms shall be governed by the laws of [Your Jurisdiction].
                {/* ... Mucho más texto legal aquí ... */}
              </Text>
            </ScrollView>
            {/* >>> FIN ScrollView <<< */}
            {/* Botón para cerrar el modal */}
            <Pressable
              onPress={handleHideTerms}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseButtonText}>
                {t("register.terms.closeButton")}
              </Text>
              {/* Texto del botón de cerrar */}
            </Pressable>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Use StyleSheet.create
  // ... (keep existing styles: headerIcons, languageSelector, flagImage, languageText, label, input, clearIcon, eyeIcon, errorText, button, buttonLoading, buttonPressed, spinner, buttonText, footer)
  headerIcons: {
    position: "absolute",
    top: Platform.OS === "android" ? 50 : 55, // Adjust based on your header style
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  languageSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  flagImage: { width: 28, height: 28, borderRadius: 14 },
  languageText: { marginLeft: 8, fontSize: 16, color: "#333" },
  label: {
    fontSize: 16, // Slightly smaller label
    marginBottom: 8, // Increased space
    color: "#444B59", // Consistent label color
    fontWeight: "500",
  },
  input: {
    width: "100%",
    height: 55,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 18,
    backgroundColor: "white",
    // Removed justifyContent as it's not needed for TextInput itself
    paddingRight: 50, // Space for clear/eye icon
    color: "black",
  },
  clearIcon: {
    position: "absolute",
    right: 10,
    top: 0,
    height: "100%",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  eyeIcon: {
    position: "absolute",
    right: 10,
    top: 0,
    height: "100%",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  errorText: {
    color: "red",
    fontSize: 14,
    marginTop: 5, // Space between input and error text
  },

  // --- Add/Update Picker Button Styles ---
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    height: 55,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: "white",
    justifyContent: "space-between", // Space between text and icon
    width: "100%", // Ensure it takes full width like input
    // marginBottom: 10, // Remove margin if field wrapper handles it
  },
  pickerButtonText: {
    fontSize: 18,
    color: "black", // Color when a date is selected
  },
  pickerButtonPlaceholder: {
    color: "gray", // Color for the placeholder text
  },
  // --- End Picker Button Styles ---

  button: {
    // Base button style
    width: "90%", // Match input width
    height: 55,
    backgroundColor: "#006892",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginTop: 20, // Space above button
    marginBottom: 20, // Space below button before footer
    flexDirection: "row", // Align spinner and text
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  buttonLoading: {
    // Style when loading
    backgroundColor: "#a0a0a0",
  },
  buttonPressed: {
    // Style when pressed
    opacity: 0.8,
  },
  spinner: {
    // Style for the spinner
    marginRight: 10,
  },
  buttonText: {
    // Style for button text
    color: "#fff",
    fontSize: 19,
    fontWeight: "bold",
  },
  footer: {
    // Style for the footer view
    backgroundColor: "#006892",
    padding: 40, // Or adjust as needed
    alignItems: "flex-end", // If you need content alignment
    borderTopEndRadius: 40, // Or borderTopLeftRadius / borderTopRightRadius
    borderTopStartRadius: 40, // If you want both top corners rounded
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 }, // Adjusted for top shadow
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10, // Use a consistent elevation
  },

  termsContainer: {
    flexDirection: "row", // Alinea el checkbox y el texto horizontalmente
    alignItems: "flex-start", // Alinea al inicio si el texto es largo
    width: "90%", // Ancho similar a los inputs
    marginBottom: 20, // Espacio debajo del checkbox y antes del botón
    paddingHorizontal: 5, // Pequeño padding si es necesario
  },
  checkbox: {
    padding: 5, // Área táctil alrededor del icono
    marginRight: 8, // Espacio entre el checkbox y el texto
    // Asegúrate de que el tamaño del icono coincida (size={24})
  },
  termsText: {
    flex: 1, // Permite que el texto ocupe el espacio restante y se envuelva
    fontSize: 15, // Tamaño de fuente
    color: "#444B59", // Color del texto
    lineHeight: 20, // Espaciado entre líneas para texto largo
  },
  termsLink: {
    color: "#006892", // Color para el enlace (azul típico)
    textDecorationLine: "underline", // Subrayado
    fontWeight: "bold", // Opcional: negrita para el enlace
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)", // Fondo oscuro semi-transparente
    justifyContent: "center",
    alignItems: "center",
  },
  termsModalContentContainer: {
    width: "90%", // Ancho del modal
    height: "80%", // Altura para dejar espacio para el fondo
    backgroundColor: "#FFFFFF", // Fondo blanco para el contenido del modal
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333", // Color del título
  },
  termsScrollView: {
    flex: 1, // Permite que el ScrollView ocupe el espacio disponible
    width: "100%", // Asegura que el ScrollView use el ancho completo del contenedor padre
    // paddingHorizontal: 5, // Opcional: padding dentro del ScrollView
  },
  termsModalText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#555", // Color del texto de los términos
    textAlign: "justify", // Opcional: justificar el texto
  },
  modalCloseButton: {
    marginTop: 20, // Espacio encima del botón
    backgroundColor: "#006892", // Color del botón de cerrar
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    // width: '50%', // O un ancho fijo
    alignSelf: "center", // Centrar el botón
    alignItems: "center",
  },
  modalCloseButtonText: {
    color: "#FFFFFF", // Texto blanco en el botón
    fontSize: 16,
    fontWeight: "600",
  },
}); // End StyleSheet.create
