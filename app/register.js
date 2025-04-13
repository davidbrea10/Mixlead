import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Platform,
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

  const validatePassword = (password) => {
    // Expresión regular: al menos 8 caracteres, una letra y un número
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

    if (!password) {
      setErrors((prev) => ({ ...prev, password: "Password is required." }));
    } else if (!passwordRegex.test(password)) {
      setErrors((prev) => ({
        ...prev,
        password:
          "Password must be at least 8 characters long and include at least one letter and one number.",
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
        confirmPassword: "Passwords do not match.",
      }));
    } else {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  };

  const validateDni = async (dni) => {
    const dniRegex = /^[0-9]{8}[A-Z]$/;

    if (!dni) {
      setErrors((prev) => ({ ...prev, dni: "DNI is required." }));
      return;
    } else if (!dniRegex.test(dni)) {
      setErrors((prev) => ({ ...prev, dni: "DNI format is invalid." }));
      return;
    }

    try {
      const dniQuery = query(
        collection(db, "employees"),
        where("dni", "==", dni),
      );
      const dniSnapshot = await getDocs(dniQuery);

      if (!dniSnapshot.empty) {
        setErrors((prev) => ({ ...prev, dni: "DNI is already registered." }));
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
      setErrors((prev) => ({ ...prev, phone: "Phone number is required." }));
    } else if (!phoneRegex.test(phone)) {
      setErrors((prev) => ({ ...prev, phone: "Invalid phone number format." }));
    } else {
      setErrors((prev) => ({ ...prev, phone: "" }));
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      setErrors((prev) => ({ ...prev, email: "Email is required." }));
    } else if (!emailRegex.test(email)) {
      setErrors((prev) => ({ ...prev, email: "Invalid email format." }));
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
        birthDate: "You must be at least 18 years old.",
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
      alert("Please fix the errors before submitting.");
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
      alert("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
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
      alert("You must be at least 18 years old to register.");
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
        alert("The DNI is already registered.");
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

      alert("Registration Successful");

      // ✅ Redirigir a la pantalla de inicio
      router.replace("/employee/home"); // Asegúrate de que esta ruta exista en tu app
    } catch (error) {
      alert(error.message);
    }
  };

  const handleLanguageChange = () => {
    alert("Change Language");
  };

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        {/* Header with Back and Language Buttons */}
        <View style={styles.headerIcons}>
          {/* Back Button */}
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="black" />
          </TouchableOpacity>

          {/* Language Selector */}
          <TouchableOpacity onPress={handleLanguageChange}>
            <Ionicons name="globe-outline" size={28} color="black" />
          </TouchableOpacity>
        </View>

        <Text
          style={{
            fontSize: 32,
            fontWeight: "bold",
            textAlign: "center",
            paddingTop: 80,
            color: "#444B59",
          }}
        >
          USER REGISTER
        </Text>

        <ScrollView
          contentContainerStyle={{ alignItems: "center", paddingVertical: 20 }}
          style={{ flex: 1 }}
        >
          {/* First Name */}
          <View style={{ width: 366, marginBottom: 15 }}>
            <Text style={styles.label}>First Name</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                placeholder="First Name"
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
            <Text style={styles.label}>Last Name</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                placeholder="Last Name"
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
            <Text style={styles.label}>DNI</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                placeholder="DNI"
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
            <Text style={styles.label}>Phone</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                placeholder="Phone"
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
            <Text style={styles.label}>Birth Date</Text>
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
                  {form.birthDate || "Select Birth Date"}
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
            <Text style={styles.label}>Email</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                placeholder="Email"
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
            <Text style={styles.label}>Password</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                placeholder="Password"
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
            <Text style={styles.label}>Confirm Password</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                placeholder="Confirm Password"
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
            <Text style={{ color: "#fff", fontSize: 19 }}>Register</Text>
          </Pressable>
        </ScrollView>
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
