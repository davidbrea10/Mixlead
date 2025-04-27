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
import { useTranslation } from "react-i18next"; // Import i18n hook

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
  limits: ["11µSv/h", "0.5µSv/h"],
};

const GAMMA_FACTOR = { "192Ir": 0.13, "75Se": 0.054 };
const COLLIMATOR_EFFECT = { Yes: { "192Ir": 3, "75Se": 12.5 }, No: 0 };
const ATTENUATION_COEFFICIENT = {
  Mixlead: { "192Ir": 0.292, "75Se": 4.0 },
  Steel: { "192Ir": 0.659, "75Se": 0.864 },
  Concrete: { "192Ir": 0.16, "75Se": 0.198 },
  Aluminum: { "192Ir": 0.227, "75Se": 0.281 },
  Lead: { "192Ir": 0.826, "75Se": 4.57 },
  Tungsten: { "192Ir": 2.657, "75Se": 6.237 },
};

export default function Calculation() {
  const { t } = useTranslation(); // Initialize translation hook
  const router = useRouter();

  // Maps for internal values and translations
  const collimatorMap = {
    Yes: t("radiographyCalculator.options.collimator.Yes"),
    No: t("radiographyCalculator.options.collimator.No"),
  };

  const materialMap = {
    Mixlead: t("radiographyCalculator.options.materials.Mixlead"),
    Steel: t("radiographyCalculator.options.materials.Steel"),
    Concrete: t("radiographyCalculator.options.materials.Concrete"),
    Aluminum: t("radiographyCalculator.options.materials.Aluminum"),
    Lead: t("radiographyCalculator.options.materials.Lead"),
    Tungsten: t("radiographyCalculator.options.materials.Tungsten"),
    Other: t("radiographyCalculator.options.materials.Other"),
  };

  const OPTIONS = {
    isotopes: ["192Ir", "75Se"],
    collimator: Object.values(collimatorMap),
    materials: Object.values(materialMap),
    limits: ["11µSv/h", "0.5µSv/h"],
  };

  const [form, setForm] = useState({
    isotope: t("radiographyCalculator.modal.isotope"),
    collimator: t("radiographyCalculator.modal.collimator"),
    thicknessOrDistance: t("radiographyCalculator.thicknessOrDistance"),
    value: "",
    activity: "",
    material: t("radiographyCalculator.modal.material"),
    attenuation: "",
    limit: t("radiographyCalculator.modal.limit"),
  });

  const calculateAndNavigate = () => {
    // Initial checks (remain the same)
    if (!form.isotope || !form.activity || !form.material || !form.value) {
      Alert.alert("Error", t("radiographyCalculator.errorMessage"));
      return;
    }

    // Retrieve internal values (remain the same)
    const collimatorInternalValue = Object.keys(collimatorMap).find(
      (key) => collimatorMap[key] === form.collimator,
    );

    const materialInternalValue = Object.keys(materialMap).find(
      (key) => materialMap[key] === form.material,
    );

    // --- Comma to Period Conversion and Parsing ---
    // Convert commas to periods before parsing numerical inputs
    const activityString = form.activity.replace(/,/g, ".");
    const valueString = form.value.replace(/,/g, ".");
    const attenuationString =
      materialInternalValue === "Other" && form.attenuation
        ? form.attenuation.replace(/,/g, ".")
        : null; // Handle attenuation only if needed

    const A = parseFloat(activityString) * 37; // Parse converted string
    const Γ = GAMMA_FACTOR[form.isotope]; // No conversion needed
    const Y = // Logic remains the same
      collimatorInternalValue === "Yes"
        ? COLLIMATOR_EFFECT.Yes[form.isotope]
        : COLLIMATOR_EFFECT.No;
    const T = form.limit === "11µSv/h" ? 0.011 : 0.0005; // No conversion needed

    // Parse attenuation only if needed, using the converted string
    const µ =
      materialInternalValue === "Other"
        ? parseFloat(attenuationString) // Parse converted string
        : ATTENUATION_COEFFICIENT[materialInternalValue]?.[form.isotope]; // Added optional chaining for safety

    const inputValue = parseFloat(valueString); // Parse converted string
    // --- End of Conversion and Parsing ---

    // NaN checks (remain the same, now check results of parsing converted strings)
    if (
      isNaN(A) ||
      isNaN(Γ) ||
      isNaN(Y) ||
      isNaN(T) ||
      isNaN(µ) || // This will be NaN if material wasn't 'Other' and lookup failed, or if parsing failed
      isNaN(inputValue)
    ) {
      // Add a more detailed log for debugging NaN issues
      console.error("NaN check failed. Values:", {
        A,
        Γ,
        Y,
        T,
        µ_parsed:
          materialInternalValue === "Other" ? parseFloat(attenuationString) : µ,
        inputValue,
      });
      Alert.alert("Error", t("radiographyCalculator.invalidInputMessage"));
      return;
    }

    // Extra check specifically for µ's validity after potential parsing/lookup
    if (materialInternalValue === "Other" && isNaN(µ)) {
      console.error(
        "Attenuation (µ) is NaN for 'Other' material. Input was:",
        form.attenuation,
      );
      Alert.alert("Error", t("radiographyCalculator.invalidInputMessage"));
      return;
    }
    if (materialInternalValue !== "Other" && (µ === undefined || isNaN(µ))) {
      console.error(
        "Attenuation coefficient lookup failed. Material:",
        materialInternalValue,
        "Isotope:",
        form.isotope,
      );
      Alert.alert("Error", t("radiographyCalculator.invalidInputMessage"));
      return;
    }

    // Calculation logic (remains the same as provided)
    let result;
    if (
      form.thicknessOrDistance ===
      t("radiographyCalculator.thicknessOrDistance")
    ) {
      // Note: This formula might need review based on physics principles.
      result =
        Math.sqrt((A * Γ) / (Math.pow(2, Y) * T)) *
        (Math.log(2) / µ) *
        (1 / inputValue); // inputValue is thickness here? Units need checking.
    } else {
      // Note: This formula might need review based on physics principles.
      result =
        Math.sqrt((A * Γ) / (Math.pow(2, Y) * T)) *
        (Math.log(2) / µ) *
        (1 / inputValue); // inputValue is distance here? Units need checking.
    }

    // Final NaN check for result (remains the same)
    if (isNaN(result)) {
      Alert.alert("Error", t("radiographyCalculator.calculationError"));
      return;
    }

    // Navigation (remains the same, passing original form values)
    router.push({
      pathname: "coordinator/calculationSummary", // Make sure this path is correct
      params: {
        isotope: form.isotope,
        collimator: form.collimator,
        value: form.value, // Pass original value (with comma if any)
        activity: form.activity, // Pass original activity (with comma if any)
        material: form.material,
        attenuation: form.attenuation, // Pass original attenuation
        limit: form.limit,
        calculationType:
          form.thicknessOrDistance ===
          t("radiographyCalculator.thicknessOrDistance")
            ? "distance"
            : "thickness",
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
    router.replace("/coordinator/home");
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
                marginHorizontal: 5,
              }}
            >
              {t("radiographyCalculator.title")}
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
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Text style={styles.label}>
              {t("radiographyCalculator.isotope")}
            </Text>
            <Pressable
              onPress={() => openModal("isotope", OPTIONS.isotopes)}
              style={styles.inputContainer}
            >
              <Text style={styles.input}>{form.isotope}</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Text style={styles.label}>
              {t("radiographyCalculator.activity")}
            </Text>
            <TextInput
              style={[styles.inputContainer, styles.input]}
              placeholder={t("radiographyCalculator.valueCi")}
              keyboardType="numeric"
              value={form.activity}
              onChangeText={(text) => setForm({ ...form, activity: text })}
            />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Text style={styles.label}>
              {t("radiographyCalculator.collimator")}
            </Text>
            <Pressable
              onPress={() => openModal("collimator", OPTIONS.collimator)}
              style={styles.inputContainer}
            >
              <Text style={styles.input}>{form.collimator}</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Text style={styles.label}>
              {t("radiographyCalculator.tLimitFor")}
            </Text>
            <Pressable
              onPress={() => openModal("limit", OPTIONS.limits)}
              style={styles.inputContainer}
            >
              <Text style={styles.input}>{form.limit}</Text>
            </Pressable>
          </View>

          <View
            style={{ flexDirection: "row", alignItems: "center", width: "93%" }}
          >
            <Text style={styles.label}>
              {t("radiographyCalculator.material")}
            </Text>
            <Pressable
              onPress={() => openModal("material", OPTIONS.materials)}
              style={[
                styles.inputContainer,
                { flex: form.material === "Other" ? 0.6 : 1 },
              ]}
            >
              <Text style={styles.input}>{form.material}</Text>
            </Pressable>
            {form.material === "Other" && (
              <TextInput
                style={[
                  styles.inputContainer,
                  styles.input,
                  { flex: 0.4, marginLeft: 10 },
                ]}
                placeholder={t("radiographyCalculator.modal.attenuation")}
                keyboardType="numeric"
                value={form.attenuation}
                onChangeText={(text) => setForm({ ...form, attenuation: text })}
              />
            )}
          </View>

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
                    form.thicknessOrDistance ===
                    t("radiographyCalculator.thicknessOrDistance")
                      ? t("radiographyCalculator.distance")
                      : t("radiographyCalculator.thicknessOrDistance"),
                })
              }
              style={styles.switchButton}
            >
              <Text style={styles.label}>{form.thicknessOrDistance}</Text>
            </Pressable>

            <TextInput
              style={[styles.inputContainer, styles.input]}
              placeholder={t("radiographyCalculator.value", {
                unit:
                  form.thicknessOrDistance ===
                  t("radiographyCalculator.thicknessOrDistance")
                    ? "cm"
                    : "m",
              })}
              keyboardType="numeric"
              value={form.value}
              onChangeText={(text) => setForm({ ...form, value: text })}
            />
          </View>

          <Pressable style={styles.button} onPress={calculateAndNavigate}>
            <Text style={{ color: "#FFF", fontSize: 18 }}>
              {form.thicknessOrDistance ===
              t("radiographyCalculator.thicknessOrDistance")
                ? t("radiographyCalculator.calculateDistance")
                : t("radiographyCalculator.calculateThickness")}
            </Text>
          </Pressable>

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
