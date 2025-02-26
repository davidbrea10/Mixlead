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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [birthDate, setBirthDate] = useState(new Date());

  const handleInputChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleRegister = () => {
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
      firstName &&
      lastName &&
      dni &&
      phone &&
      birthDate &&
      email &&
      password &&
      confirmPassword
    ) {
      if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
      }
      alert("Registration Successful");
      router.replace("/home");
    } else {
      alert("Please fill in all fields");
    }
  };

  const handleLanguageChange = () => {
    alert("Change Language");
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || birthDate;
    setShowDatePicker(Platform.OS === "ios");
    setBirthDate(currentDate);
    handleInputChange("birthDate", currentDate.toISOString().split("T")[0]);
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
                style={styles.input}
              />
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
                onChangeText={(text) => handleInputChange("password", text)}
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
