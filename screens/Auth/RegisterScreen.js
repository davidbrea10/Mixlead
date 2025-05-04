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
  } from "react-native";
  import { LinearGradient } from "expo-linear-gradient";
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
    collection,
    query,
    where,
    getDocs,
  } from "firebase/firestore";
  import { useTranslation } from "react-i18next";
  import i18n from "../locales/i18n"; // Importa la configuración de i18next
  import { format } from "date-fns"; // Importamos date-fns para formatear la fecha
  import Toast from "react-native-toast-message";
  import { useNavigation } from '@react-navigation/native';
  
  export default function Register() {
    const navigation = useNavigation();
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
  
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [birthDate, setBirthDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
  
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
  
      try {
        const dniQuery = query(
          collection(db, "employees"),
          where("dni", "==", dni),
        );
        const dniSnapshot = await getDocs(dniQuery);
  
        if (!dniSnapshot.empty) {
          setErrors((prev) => ({ ...prev, dni: t("errors.dniExists") }));
        } else {
          setErrors((prev) => ({ ...prev, dni: "" }));
        }
      } catch (error) {
        console.error("Error validating DNI:", error);
      }
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
          text1: t("errors.errorTitle", "Error"), // Add a generic title translation
          text2: t("errors.fillAllFields"),
          visibilityTime: 3000,
        });
        return;
      }
  
      if (password !== confirmPassword) {
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle", "Error"),
          text2: t("errors.passwordsMismatch"),
          visibilityTime: 3000,
        });
        return;
      }
  
      // Check if there are any existing validation errors displayed
      const hasErrors = Object.values(errors).some((error) => error !== "");
      if (hasErrors) {
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle", "Error"),
          text2: t(
            "errors.fixValidationErrors",
            "Please fix the errors before submitting.",
          ), // Add this translation
          visibilityTime: 3000,
        });
        return;
      }
  
      setLoading(true); // Set loading true
      try {
        // Crear usuario en Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        const user = userCredential.user;
  
        // Enviar correo de verificación
        await sendEmailVerification(user);
  
        // Guardar datos adicionales del usuario en Firestore
        await setDoc(doc(db, "employees", user.uid), {
          firstName,
          lastName,
          role: "employee", // Default role
          dni,
          phone,
          birthDate: formBirthDate, // Save formatted date string
          email,
          companyId: "", // Initially empty
          createdAt: new Date(), // Use Firestore server timestamp if preferred
        });
  
        Toast.show({
          type: "success",
          text1: t("register.successTitle", "Success"), // Add this translation
          text2: t(
            "register.successMessage",
            "Registration successful! Please check your email to verify your account.",
          ), // Add this translation
          visibilityTime: 4000,
        });
  
        // Redirigir a la pantalla de confirmación de correo
        navigation.replace('EmailConfirmation');
      } catch (error) {
        // Replace alert with error toast, map common errors
        let errorMessage = t(
          "errors.genericError",
          "An unexpected error occurred. Please try again.",
        ); // Default message
        let errorTitle = t("errors.errorTitle", "Error");
  
        if (error.code === "auth/email-already-in-use") {
          errorMessage = t(
            "errors.emailExists",
            "This email address is already registered.",
          ); // Add translation
          setErrors((prev) => ({ ...prev, email: errorMessage })); // Also show error under the field
        } else if (error.code === "auth/invalid-email") {
          errorMessage = t(
            "errors.invalidEmail",
            "The email address is not valid.",
          );
          setErrors((prev) => ({ ...prev, email: errorMessage }));
        } else if (error.code === "auth/operation-not-allowed") {
          errorMessage = t(
            "errors.authOperationNotAllowed",
            "Email/password accounts are not enabled.",
          );
        } else if (error.code === "auth/weak-password") {
          errorMessage = t("errors.weakPassword", "The password is too weak."); // Add translation
          setErrors((prev) => ({ ...prev, password: errorMessage }));
        } else {
          // Log unexpected errors for debugging
          console.error("Registration Error:", error.code, error.message);
        }
  
        Toast.show({
          type: "error",
          text1: errorTitle,
          text2: errorMessage,
          visibilityTime: 4000,
        });
      } finally {
        setLoading(false); // Set loading false
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
              padding: 16,
              borderBottomStartRadius: 40,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 10,
            }}
          >
            {/* Header with Back and Language Buttons */}
            <View style={styles.headerIcons}>
              {/* Back Button */}
              <TouchableOpacity onPress={() => navigation.goBack()}>
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
                fontSize: 32,
                fontWeight: "bold",
                textAlign: "center",
                paddingTop: 60,
                color: "#000000",
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
      </LinearGradient>
    );
  }
  
  const styles = StyleSheet.create({
    // Use StyleSheet.create
    // ... (keep existing styles: headerIcons, languageSelector, flagImage, languageText, label, input, clearIcon, eyeIcon, errorText, button, buttonLoading, buttonPressed, spinner, buttonText, footer)
    headerIcons: {
      position: "absolute",
      top: Platform.OS === "android" ? 20 : 55, // Adjust based on your header style
      left: 20,
      right: 20,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      zIndex: 10,
      marginTop: Platform.OS === "android" ? 30 : 0,
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
  }); // End StyleSheet.create
  