import React, { useState } from "react"; // Import React explicitly
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  Platform,
  StyleSheet, // 1. Import StyleSheet
  ActivityIndicator, // 2. Import ActivityIndicator
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { db } from "../../firebase/config";
import { collection, addDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message"; // 3. Import Toast

export default function AddCompany() {
  const router = useRouter();
  const [form, setForm] = useState({
    // Use lowercase keys consistent with typical state naming
    Name: "", // Keep Uppercase to match Firestore field names if needed
    Cif: "",
    Telephone: "",
    ContactPerson: "",
    SecurityNumber: "",
  });
  const [isSaving, setIsSaving] = useState(false); // 4. Add saving state

  const { t } = useTranslation(); // Initialize i18n

  // Define fields using current state keys
  const fields = [
    {
      key: "Name",
      label: t("add_company.name"),
      placeholder: t("add_company.placeholder_name"),
    },
    {
      key: "Cif",
      label: t("add_company.cif"),
      placeholder: t("add_company.placeholder_cif"),
    },
    {
      key: "Telephone",
      label: t("add_company.telephone"),
      placeholder: t("add_company.placeholder_telephone"),
      keyboardType: "phone-pad",
    },
    {
      key: "ContactPerson",
      label: t("add_company.contactPerson"),
      placeholder: t("add_company.placeholder_contactPerson"),
    },
    {
      key: "SecurityNumber",
      label: t("add_company.securityNumber"),
      placeholder: t("add_company.placeholder_securityNumber"),
      keyboardType: "number-pad",
    },
  ];

  const handleInputChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleClearField = (field) => {
    setForm({ ...form, [field]: "" });
  };

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.replace("/admin/home"); // Use replace if going home shouldn't be in back stack
  };

  const handleRegisterCompany = async () => {
    // Destructure using the actual state keys
    const { Name, Cif, Telephone, ContactPerson, SecurityNumber } = form;

    // Validate using the correct keys
    if (!Name || !Cif || !Telephone || !ContactPerson || !SecurityNumber) {
      // 5. Replace alert with error toast
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle", "Error"), // Use generic error title
        text2: t("add_company.errorIncomplete"),
      });
      return;
    }

    setIsSaving(true); // Start loading indicator
    try {
      // Save using the correct keys (which match Firestore fields)
      await addDoc(collection(db, "companies"), {
        Name,
        Cif,
        Telephone,
        ContactPerson,
        SecurityNumber,
        createdAt: new Date(), // Add timestamp
      });

      // 5. Replace alert with success toast
      Toast.show({
        type: "success",
        text1: t("success.successTitle", "Success"), // Use generic success title
        text2: t("add_company.success"),
      });
      // Optionally clear form or navigate
      setForm({
        Name: "",
        Cif: "",
        Telephone: "",
        ContactPerson: "",
        SecurityNumber: "",
      }); // Clear form on success
      router.replace({
        pathname: "/admin/companies",
        params: { refresh: Date.now() },
      }); // Navigate and trigger refresh
    } catch (error) {
      console.error("Error adding company:", error);
      // 5. Replace alert with error toast (show generic message)
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle", "Error"),
        text2: t(
          "add_company.errorSave",
          "Could not save company. Please try again.",
        ), // Add generic error translation
      });
    } finally {
      setIsSaving(false); // Stop loading indicator
    }
  };

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={styles.gradient} // Use StyleSheet
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack}>
            <Image
              source={require("../../assets/go-back.png")}
              style={styles.headerIcon}
            />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitleMain}>
              {t("add_company.companiesTitle")}
            </Text>
            <Text style={styles.headerTitleSub}>{t("add_company.title")}</Text>
          </View>
          <Pressable onPress={handleHome} style={{ width: 50 }}>
            {/* Optional: Home Icon or empty view for spacing */}
            {/* <Image source={require("../../assets/icon.png")} style={styles.headerIcon} /> */}
          </Pressable>
        </View>

        {/* Form Content */}
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {fields.map(({ key, label, placeholder, keyboardType }) => (
            <View key={key} style={styles.fieldWrapper}>
              <Text style={styles.label}>{label}</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  placeholder={placeholder}
                  placeholderTextColor={"gray"}
                  value={form[key]}
                  onChangeText={(text) => handleInputChange(key, text)}
                  style={styles.input}
                  keyboardType={keyboardType || "default"} // Apply keyboard type
                />
                {/* Clear button */}
                {form[key] ? (
                  <Pressable
                    onPress={() => handleClearField(key)}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={24} color="gray" />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}

          {/* Register Button */}
          <Pressable
            onPress={handleRegisterCompany}
            disabled={isSaving} // Disable button while saving
            style={({ pressed }) => [
              styles.button,
              isSaving && styles.buttonLoading, // Apply loading style
              pressed && !isSaving && styles.buttonPressed, // Apply pressed style
            ]}
          >
            {isSaving ? (
              <ActivityIndicator
                size="small"
                color="#fff"
                style={styles.spinner}
              />
            ) : (
              <Text style={styles.buttonText}>
                {/* Consider a different text for the button vs the screen title */}
                {t("add_company.registerButton", "Register Company")}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </View>

      {/* Footer (Optional) */}
      <View style={styles.footer}></View>
    </LinearGradient>
  );
}

// 6. Create StyleSheet
const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1, // Ensure inner view takes flex
  },
  header: {
    backgroundColor: "#FF9300",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomStartRadius: 40,
    borderBottomEndRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    paddingTop: Platform.select({ ios: 60, android: 40 }),
  },
  headerIcon: {
    width: 50,
    height: 50,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 10,
  },
  headerTitleMain: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    letterSpacing: 1.5,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textAlign: "center",
  },
  headerTitleSub: {
    fontSize: 18,
    fontWeight: "300",
    color: "white",
    letterSpacing: 1,
    marginTop: 2,
    textAlign: "center",
  },
  scrollContainer: {
    alignItems: "center", // Center items horizontally in scroll view
    paddingVertical: 20,
    paddingHorizontal: "5%", // Add horizontal padding to the content area
  },
  fieldWrapper: {
    // Wrapper for label and input container
    width: "100%", // Take full width within the padded container
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
    textTransform: "none", // Ensure label case is as defined
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 55,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 15, // Padding inside the input container
    backgroundColor: "white",
  },
  input: {
    flex: 1, // Input takes available space
    fontSize: 18,
    height: "100%", // Ensure input takes full height for vertical alignment
    paddingRight: 10, // Space before the clear button
  },
  clearButton: {
    // Style for the clear button Pressable
    paddingLeft: 5, // Add some padding to make it easier to tap
  },
  button: {
    width: "100%", // Make button take full width within padded container
    height: 55,
    backgroundColor: "#006892",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginTop: 10, // Adjusted margin top
    marginBottom: 20, // Margin at the bottom
    flexDirection: "row", // For spinner alignment
    // Shadow/Elevation
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonLoading: {
    // Style when button is loading
    backgroundColor: "#a0a0a0",
  },
  buttonPressed: {
    // Style for button press feedback
    opacity: 0.8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "bold",
  },
  spinner: {
    // No specific style needed if centered by button's justify/align
    // marginRight: 10, // Optional: if you change text during loading
  },
  footer: {
    // Optional footer style
    backgroundColor: "#006892",
    padding: 30, // Adjust padding as needed
    borderTopEndRadius: 40,
    borderTopStartRadius: 40,
    // Removed shadow/elevation if purely decorative
  },
});
