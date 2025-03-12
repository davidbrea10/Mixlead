import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { db } from "../../firebase/config";
import { collection, addDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

export default function AddCompany() {
  const router = useRouter();
  const [form, setForm] = useState({
    Name: "",
    Cif: "",
    Telephone: "",
    ContactPerson: "",
    SecurityNumber: "",
  });

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
    router.replace("/admin/home");
  };

  const handleRegisterCompany = async () => {
    const { Name, Cif, Telephone, ContactPerson, SecurityNumber } = form;

    if (!Name || !Cif || !Telephone || !ContactPerson || !SecurityNumber) {
      alert("Please fill in all fields");
      return;
    }

    try {
      await addDoc(collection(db, "companies"), {
        Name,
        Cif,
        Telephone,
        ContactPerson,
        SecurityNumber,
        createdAt: new Date(),
      });

      alert("Company Registered Successfully");
      router.replace("/admin/companies");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        <View
          style={{
            paddingTop: 40,
            backgroundColor: "#FF9300",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 16,
            borderBottomStartRadius: 40,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 10,
          }}
        >
          <Pressable onPress={handleBack}>
            <Image
              source={require("../../assets/go-back.png")}
              style={{ width: 50, height: 50 }}
            />
          </Pressable>
          <View style={{ flexDirection: "column", alignItems: "center" }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "white",
                letterSpacing: 2,
                textShadowColor: "black",
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 1,
              }}
            >
              Companies
            </Text>

            <Text
              style={{
                fontSize: 24,
                fontWeight: "light",
                color: "white",
                letterSpacing: 2,
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 1,
              }}
            >
              Add Company
            </Text>
          </View>

          <Pressable onPress={handleHome}>
            <Image
              source={require("../../assets/icon.png")}
              style={{ width: 50, height: 50 }}
            />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {Object.keys(form).map((key) => (
            <View key={key} style={{ width: 366, marginBottom: 15 }}>
              <Text style={styles.label}>
                {key.replace(/([A-Z])/g, " $1").trim()}
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  placeholder={key.replace(/([A-Z])/g, " $1").trim()}
                  value={form[key]}
                  onChangeText={(text) => handleInputChange(key, text)}
                  style={styles.input}
                />
                {form[key] ? (
                  <Pressable onPress={() => handleClearField(key)}>
                    <Ionicons name="close-circle" size={24} color="gray" />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}

          <Pressable onPress={handleRegisterCompany} style={styles.button}>
            <Text style={{ color: "#fff", fontSize: 19 }}>Add Company</Text>
          </Pressable>
        </ScrollView>
      </View>

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
    </LinearGradient>
  );
}

const styles = {
  scrollContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  label: {
    fontSize: 18,
    marginBottom: 5,
    textTransform: "none",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 55,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: "white",
    marginBottom: 10,
  },
  input: {
    flex: 1,
    fontSize: 18,
  },
  button: {
    width: 366,
    height: 55,
    backgroundColor: "#006892",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginTop: 20,

    // Sombra para iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,

    // Elevación para Android
    elevation: 5,
  },
};
