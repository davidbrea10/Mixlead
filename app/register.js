import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
// Add a second document with a generated ID.
import { auth, db } from "../firebase/config"; // Asegúrate de la ruta correcta
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";
import i18n from "./locales/i18n"; // Importa la configuración de i18next

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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [birthDate, setBirthDate] = useState(new Date());

  const flag =
    i18n.language === "es"
      ? require("../assets/es.png")
      : require("../assets/en.png");

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
    const currentDate = selectedDate || birthDate;
    setShowDatePicker(Platform.OS === "ios");
    setBirthDate(currentDate);
    handleInputChange("birthDate", currentDate.toISOString().split("T")[0]);
  };

  const handleRegister = async () => {
    // Validar que no haya errores antes de registrar
    if (errors.dni || errors.phone || errors.birthDate) {
      alert(t("errors.fixBeforeSubmit"));
      return;
    }
    const {
      firstName,
      lastName,
      dni,
      phone,
      birthDate,
      email,
      password,
      confirmPassword,
    } = form;

    if (
      !firstName ||
      !lastName ||
      !dni ||
      !phone ||
      !birthDate ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      alert(t("errors.fillAllFields"));
      return;
    }

    if (password !== confirmPassword) {
      alert(t("errors.passwordsMismatch"));
      return;
    }

    // Validar que el usuario sea mayor de 18 años
    const birthDateObj = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    const dayDiff = today.getDate() - birthDateObj.getDate();

    if (
      age < 18 ||
      (age === 18 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)))
    ) {
      alert(t("errors.ageRestriction"));
      return;
    }

    try {
      // Validar que el DNI sea único
      const dniQuery = query(
        collection(db, "employees"),
        where("dni", "==", dni),
      );
      const dniSnapshot = await getDocs(dniQuery);

      if (!dniSnapshot.empty) {
        alert(t("errors.dniExists"));
        return;
      }

      // ✅ Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // ✅ Guardar datos adicionales en Firestore
      await setDoc(doc(db, "employees", user.uid), {
        firstName,
        lastName,
        role: "employee",
        dni,
        phone,
        birthDate,
        email,
        companyId: "", // Añade el ID de la empresa si es necesario
        createdAt: new Date(),
      });

      alert(t("register.registration"));

      // ✅ Redirigir a la pantalla de inicio
      router.replace("/employee/home"); // Asegúrate de que esta ruta exista en tu app
    } catch (error) {
      alert(error.message);
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
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={28} color="black" />
            </TouchableOpacity>

            {/* Language Selector */}
            <TouchableOpacity
              onPress={handleLanguageChange}
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Image
                source={flag}
                style={{ width: 28, height: 28, borderRadius: 14 }}
                resizeMode="contain"
              />
              <Text style={{ marginLeft: 8, fontSize: 16 }}>
                {t("change_language")}
              </Text>
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
          <View style={{ width: 366, marginBottom: 15 }}>
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
          <View style={{ width: 366, marginBottom: 15 }}>
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
          <View style={{ width: 366, marginBottom: 15 }}>
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
          <View style={{ width: 366, marginBottom: 15 }}>
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
          <View style={{ width: 366, marginBottom: 15 }}>
            <Text style={styles.label}>{t("register.birthDate")}</Text>
            <View style={{ position: "relative" }}>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.input}
              >
                <Text
                  style={{
                    color: form.birthDate ? "black" : "gray",
                    fontSize: 18,
                  }}
                >
                  {form.birthDate || t("register.selectBirthDate")}
                </Text>
              </TouchableOpacity>
              {form.birthDate.length > 0 && (
                <TouchableOpacity
                  onPress={() => handleInputChange("birthDate", "")}
                  style={styles.clearIcon}
                >
                  <Ionicons name="close-circle" size={24} color="gray" />
                </TouchableOpacity>
              )}
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={birthDate}
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}
            {errors.birthDate ? (
              <Text style={styles.errorText}>{errors.birthDate}</Text>
            ) : null}
          </View>

          {/* Email */}
          <View style={{ width: 366, marginBottom: 15 }}>
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
          <View style={{ width: 366, marginBottom: 15 }}>
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
          <View style={{ width: 366, marginBottom: 15 }}>
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
          <Pressable onPress={handleRegister} style={styles.button}>
            <Text style={{ color: "#fff", fontSize: 19 }}>
              {t("register.button")}
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

const styles = {
  headerIcons: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  label: {
    fontSize: 18,
    marginBottom: 5,
  },

  errorText: {
    color: "red",
    fontSize: 14,
    marginTop: 5,
  },

  input: {
    width: "100%",
    height: 55,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 18,
    backgroundColor: "white",
    justifyContent: "center",
  },
  clearIcon: {
    position: "absolute",
    right: 10,
    top: 15,
  },
  button: {
    width: 366,
    height: 55,
    backgroundColor: "#006892",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginTop: 20,
  },
};
