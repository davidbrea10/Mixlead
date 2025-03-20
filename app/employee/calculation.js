import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { db } from "../../firebase/config";
import { collection, addDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

const OPTIONS = {
  isotopes: ["192Ir", "75Se"],
  collimator: ["Yes", "No"],
  materials: [
    "Mixlead",
    "Steel",
    "Concrete",
    "Aluminum",
    "Lead",
    "Tungsten",
    "Other",
  ],
  limits: ["1.1µSv/h", "0.5µSv/h"],
};

export default function Calculation() {
  const router = useRouter();
  const [form, setForm] = useState({
    isotope: "Select Isotope",
    collimator: "Select use of Collimator",
    thicknessOrDistance: "Thickness",
    value: "",
    activity: "",
    material: "Select Material",
    attenuation: "",
    limit: "Set Limit dose rate",
  });

  const [modal, setModal] = useState({ open: false, field: "", options: [] });

  const openModal = (field, options) =>
    setModal({ open: true, field, options });
  const closeModal = () => setModal({ ...modal, open: false });

  const handleSelect = (field, value) => {
    setForm({ ...form, [field]: value });
    closeModal();
  };

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
    router.replace("/employee/home");
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
      router.replace("/employee/companies");
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
            alignItems: "center",
            padding: 16,
            borderBottomStartRadius: 40,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 10,
            marginBottom: 20,
          }}
        >
          <Pressable onPress={handleBack}>
            <Image
              source={require("../../assets/go-back.png")}
              style={{ width: 50, height: 50 }}
            />
          </Pressable>

          {/* Contenedor centrado */}
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "white",
                textAlign: "center",
                letterSpacing: 2,
                textShadowColor: "black",
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 1,
              }}
            >
              Radiography Shielding Calculator
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
          {/* Isotope */}
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Text style={styles.label}>Isotope:</Text>
            <Pressable
              onPress={() => openModal("isotope", OPTIONS.isotopes)}
              style={styles.inputContainer}
            >
              <Text style={styles.input}>{form.isotope}</Text>
            </Pressable>
          </View>

          {/* Collimator */}
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Text style={styles.label}>Collimator:</Text>
            <Pressable
              onPress={() => openModal("collimator", OPTIONS.collimator)}
              style={styles.inputContainer}
            >
              <Text style={styles.input}>{form.collimator}</Text>
            </Pressable>
          </View>

          {/* Thickness / Distance Switch */}
          <View
            style={{
              width: "93%",
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            <Pressable
              onPress={() =>
                setForm({
                  ...form,
                  thicknessOrDistance:
                    form.thicknessOrDistance === "Thickness"
                      ? "Distance"
                      : "Thickness",
                })
              }
              style={styles.switchButton}
            >
              <Text style={styles.label}>{form.thicknessOrDistance}</Text>
            </Pressable>

            {/* Value Input */}
            <TextInput
              style={[styles.inputContainer, styles.input]}
              placeholder={`Value in ${form.thicknessOrDistance === "Thickness" ? "mm" : "m"}`}
              keyboardType="numeric"
              value={form.value}
              onChangeText={(text) => setForm({ ...form, value: text })}
            />
          </View>

          {/* Activity */}
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Text style={styles.label}>Activity:</Text>
            <TextInput
              style={[styles.inputContainer, styles.input]}
              placeholder="Value of Ci"
              keyboardType="numeric"
              value={form.activity}
              onChangeText={(text) => setForm({ ...form, activity: text })}
            />
          </View>

          {/* Material */}
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Text style={styles.label}>Material:</Text>
            <Pressable
              onPress={() => openModal("material", OPTIONS.materials)}
              style={styles.inputContainer}
            >
              <Text style={styles.input}>{form.material}</Text>
            </Pressable>
          </View>

          {/* Attenuation Coefficient (if 'Other' is selected) */}
          {form.material === "Other" && (
            <TextInput
              style={[styles.inputContainer, styles.input]}
              placeholder="µ in m^-1"
              keyboardType="numeric"
              value={form.attenuation}
              onChangeText={(text) => setForm({ ...form, attenuation: text })}
            />
          )}

          {/* T Limit For */}
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Text style={styles.label}>T Limit For:</Text>
            <Pressable
              onPress={() => openModal("limit", OPTIONS.limits)}
              style={styles.inputContainer}
            >
              <Text style={styles.input}>{form.limit}</Text>
            </Pressable>
          </View>

          {/* Submit Button */}
          <Pressable style={styles.button}>
            <Text style={{ color: "#FFF", fontSize: 18 }}>
              {form.thicknessOrDistance === "Thickness"
                ? "Calculate Distance"
                : "Calculate Thickness"}
            </Text>
          </Pressable>

          {/* Modal */}
          <Modal visible={modal.open} transparent animationType="slide">
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <FlatList
                  data={modal.options}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => handleSelect(modal.field, item)}
                      style={styles.modalItem}
                    >
                      <Text>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>
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
    marginRight: 10,
    textTransform: "capitalize",
    fontWeight: "bold",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 55,
    flex: 0.9,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: "white",
    marginBottom: 30,
  },
  input: {
    fontSize: 18,
  },
  button: {
    flex: 0.9,
    width: "90%",
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
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    margin: 20,
    padding: 20,
    borderRadius: 10,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  switchButton: {
    flexDirection: "row",
    alignItems: "center",
    height: 55,
    flex: 0.4,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: "white",
    marginRight: 10,
  },
  closeButton: {
    backgroundColor: "#006892",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: "center",
  },
};
