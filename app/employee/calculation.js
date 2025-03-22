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
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";

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

const GAMMA_FACTOR = { "192Ir": 0.13, "75Se": 0.054 };
const COLLIMATOR_EFFECT = { "192Ir": 3, "75Se": 12.5, No: 0 };
const ATTENUATION_COEFFICIENT = {
  Mixlead: { "192Ir": 0.292, "75Se": 4.0 },
  Steel: { "192Ir": 0.659, "75Se": 0.864 },
  Concrete: { "192Ir": 0.16, "75Se": 0.198 },
  Aluminum: { "192Ir": 0.227, "75Se": 0.281 },
  Lead: { "192Ir": 0.826, "75Se": 4.57 },
  Tungsten: { "192Ir": 2.657, "75Se": 6.237 },
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

  const calculateAndNavigate = () => {
    if (!form.isotope || !form.activity || !form.material || !form.value) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    const A = parseFloat(form.activity) * 37; // Convertir Ci a GBq
    const Γ = GAMMA_FACTOR[form.isotope];
    const Y = form.collimator === "Yes" ? COLLIMATOR_EFFECT[form.isotope] : 0;
    const T = form.limit === "1.1µSv/h" ? 0.011 : 0.0005;
    const µ =
      form.material === "Other"
        ? parseFloat(form.attenuation)
        : ATTENUATION_COEFFICIENT[form.material][form.isotope];
    const inputValue = parseFloat(form.value);

    console.log("A:", A);
    console.log("Γ:", Γ);
    console.log("Y:", Y);
    console.log("T:", T);
    console.log("µ:", µ);
    console.log("inputValue:", inputValue);
    console.log("Type:", form.thicknessOrDistance);

    // Validar que ningún valor sea NaN o indefinido
    if (
      isNaN(A) ||
      isNaN(Γ) ||
      isNaN(Y) ||
      isNaN(T) ||
      isNaN(µ) ||
      isNaN(inputValue)
    ) {
      Alert.alert("Error", "Invalid input values. Please check your inputs.");
      return;
    }

    let result;

    if (form.thicknessOrDistance === "Thickness") {
      result =
        Math.sqrt((A * Γ) / (Math.pow(2, Y) * T)) *
        (Math.log(2) / µ) *
        (1 / inputValue);
    } else {
      result =
        Math.sqrt((A * Γ) / (Math.pow(2, Y) * T)) *
        (Math.log(2) / µ) *
        (1 / inputValue);
    }

    console.log("Result:", result);

    if (isNaN(result)) {
      Alert.alert("Error", "Calculation resulted in NaN. Please check inputs.");
      return;
    }

    router.push({
      pathname: "employee/calculationSummary",
      params: {
        isotope: form.isotope,
        collimator: form.collimator,
        value: form.value,
        activity: form.activity,
        material: form.material,
        attenuation: form.attenuation,
        limit: form.limit,
        calculationType:
          form.thicknessOrDistance === "Thickness" ? "distance" : "thickness",
        result: result.toFixed(3),
      },
    });
  };

  const [modal, setModal] = useState({ open: false, field: "", options: [] });

  const openModal = (field, options) =>
    setModal({ open: true, field, options });
  const closeModal = () => setModal({ ...modal, open: false });

  const handleSelect = (field, value) => {
    setForm({ ...form, [field]: value });
    closeModal();
  };

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.replace("/employee/home");
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

          {/* Material y Attenuation Coefficient en una misma fila */}
          <View
            style={{ flexDirection: "row", alignItems: "center", width: "93%" }}
          >
            <Text style={styles.label}>Material:</Text>

            {/* Selector de Material */}
            <Pressable
              onPress={() => openModal("material", OPTIONS.materials)}
              style={[
                styles.inputContainer,
                { flex: form.material === "Other" ? 0.6 : 1 },
              ]}
            >
              <Text style={styles.input}>{form.material}</Text>
            </Pressable>

            {/* Campo de atenuación si el material es "Other" */}
            {form.material === "Other" && (
              <TextInput
                style={[
                  styles.inputContainer,
                  styles.input,
                  { flex: 0.4, marginLeft: 10 }, // Espaciado a la derecha
                ]}
                placeholder="µ in m^-1"
                keyboardType="numeric"
                value={form.attenuation}
                onChangeText={(text) => setForm({ ...form, attenuation: text })}
              />
            )}
          </View>

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
          <Pressable style={styles.button} onPress={calculateAndNavigate}>
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
