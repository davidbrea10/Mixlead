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
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next"; // Import i18n hook
import Toast from "react-native-toast-message";

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

const WITHOUT_MATERIAL_KEY = "None";

export default function Calculation() {
  const { t } = useTranslation(); // Initialize translation hook
  const router = useRouter();

  // Maps for internal values and translations
  const collimatorMap = useMemo(
    () => ({
      Yes: t("radiographyCalculator.options.collimator.Yes"),
      No: t("radiographyCalculator.options.collimator.No"),
    }),
    [t],
  );

  const materialMap = useMemo(
    () => ({
      [WITHOUT_MATERIAL_KEY]: t(
        "radiographyCalculator.options.materials.withoutMaterial",
        "Sin Material",
      ),
      Mixlead: t("radiographyCalculator.options.materials.Mixlead"),
      Steel: t("radiographyCalculator.options.materials.Steel"),
      Concrete: t("radiographyCalculator.options.materials.Concrete"),
      Aluminum: t("radiographyCalculator.options.materials.Aluminum"),
      Lead: t("radiographyCalculator.options.materials.Lead"),
      Tungsten: t("radiographyCalculator.options.materials.Tungsten"),
      Other: t("radiographyCalculator.options.materials.Other"),
    }),
    [t],
  );

  const OPTIONS = useMemo(
    () => ({
      isotopes: ["192Ir", "75Se"],
      collimator: Object.values(collimatorMap), // collimatorMap ya está memorizado
      materials: Object.values(materialMap), // materialMap ya está memorizado
      limits: ["11µSv/h", "0.5µSv/h"],
    }),
    [collimatorMap, materialMap],
  ); // Depende de los maps que a su vez dependen de 't'

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

  // NUEVA LÓGICA: Estado para saber si el input de valor debe estar editable
  const [isValueEditable, setIsValueEditable] = useState(true);

  // MODIFICADO: useEffect para actualizar la editabilidad del campo 'value'
  useEffect(() => {
    const materialInternalValue = Object.keys(materialMap).find(
      (key) => materialMap[key] === form.material,
    );
    const isCalculatingDistance =
      form.thicknessOrDistance ===
      t("radiographyCalculator.thicknessOrDistance");

    if (
      materialInternalValue === WITHOUT_MATERIAL_KEY &&
      isCalculatingDistance
    ) {
      setIsValueEditable(false);
      // setForm(prevForm => ({ ...prevForm, value: "" })); // Opcional: limpiar valor aquí también
    } else {
      setIsValueEditable(true);
    }
  }, [form.material, form.thicknessOrDistance, t, materialMap]);

  const calculateAndNavigate = () => {
    // MODIFICADO: Obtener materialInternalValue y calculationTypeForNav al inicio
    const materialInternalValue = Object.keys(materialMap).find(
      (key) => materialMap[key] === form.material,
    );
    const calculationTypeForNav =
      form.thicknessOrDistance ===
      t("radiographyCalculator.thicknessOrDistance")
        ? "distance" // Usuario seleccionó "Calcular Distancia"
        : "thickness"; // Usuario seleccionó "Calcular Espesor"

    // --- NUEVA LÓGICA: Comprobación para "Sin Material" ---
    if (materialInternalValue === WITHOUT_MATERIAL_KEY) {
      if (calculationTypeForNav === "thickness") {
        Toast.show({
          type: "error",
          text1: t("radiographyCalculator.alerts.errorTitle", "Error"),
          text2: t(
            "radiographyCalculator.alerts.materialNeededForThickness",
            "Debe existir un material al que calcularle el espesor",
          ),
          position: "bottom",
        });
        return; // No continuar
      }
      // Si es "distance" y "Sin Material", form.value no se usa, la fórmula cambiará más adelante.
      // El campo form.value ya debería estar vacío o deshabilitado por la lógica en handleSelect/useEffect.
    }
    // --- FIN NUEVA LÓGICA ---

    // Validaciones iniciales
    if (
      !form.isotope ||
      form.isotope === t("radiographyCalculator.modal.isotope") ||
      !form.activity ||
      !form.limit ||
      form.limit === t("radiographyCalculator.modal.limit") ||
      !form.material ||
      form.material === t("radiographyCalculator.modal.material")
    ) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle", "Error"),
        text2: t("radiographyCalculator.errorMessage"),
        position: "bottom",
      });
      return;
    }

    // Validación de atenuación si el material es "Other"
    if (materialInternalValue === "Other" && !form.attenuation) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle", "Error"),
        text2: t("radiographyCalculator.errorMessage"), // Podría ser un mensaje más específico
        position: "bottom",
      });
      return;
    }

    // Validación del campo 'value' (espesor/distancia)
    // Solo es requerido si hay material o si se calcula el espesor (aunque este último caso ya se filtró si no hay material)
    if (materialInternalValue !== WITHOUT_MATERIAL_KEY && !form.value) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle", "Error"),
        text2: t("radiographyCalculator.errorMessage"), // "Por favor, ingrese todos los campos requeridos."
        position: "bottom",
      });
      return;
    }

    // Conversión de comas a puntos y parseo
    const activityString = form.activity.replace(/,/g, ".");
    const A = parseFloat(activityString) * 37;
    const Γ = GAMMA_FACTOR[form.isotope];

    const collimatorKey = Object.keys(collimatorMap).find(
      (key) => collimatorMap[key] === form.collimator,
    );
    const Y =
      collimatorKey === "Yes"
        ? COLLIMATOR_EFFECT.Yes[form.isotope]
        : COLLIMATOR_EFFECT.No;

    const T = form.limit === "11µSv/h" ? 0.011 : 0.0005;

    // Validar valores parseados básicos
    if (isNaN(A) || Γ === undefined || Y === undefined || T === undefined) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle", "Error"),
        text2: t("radiographyCalculator.invalidInputMessage"),
        position: "bottom",
      });
      return;
    }

    let result;
    let µ;
    let inputValue; // Este es el valor del campo `form.value`

    if (materialInternalValue === WITHOUT_MATERIAL_KEY) {
      // --- NUEVA LÓGICA: Calcular DISTANCIA sin material ---
      if (calculationTypeForNav === "distance") {
        // El campo form.value (espesor) no se usa y debería estar vacío/deshabilitado.
        // Aquí, Y es el efecto del colimador que SÍ aplica.
        result = Math.sqrt((A * Γ) / (Math.pow(2, Y) * T)) * 1;
      }
      // El caso de calcular ESPESOR sin material ya fue manejado arriba con un Toast.
    } else {
      // --- LÓGICA EXISTENTE: Cálculos CON material ---
      const valueString = form.value.replace(/,/g, ".");
      inputValue = parseFloat(valueString);

      µ =
        materialInternalValue === "Other"
          ? parseFloat(form.attenuation.replace(/,/g, "."))
          : ATTENUATION_COEFFICIENT[materialInternalValue]?.[form.isotope];

      if (isNaN(inputValue) || µ === undefined || isNaN(µ)) {
        Toast.show({
          type: "error",
          text1: t("radiographyCalculator.alerts.errorTitle", "Error"),
          text2: t("radiographyCalculator.invalidInputMessage"),
          position: "bottom",
        });
        return;
      }

      // TU FÓRMULA ORIGINAL (cuando hay material)
      // Asumo que esta fórmula es la que quieres mantener cuando SÍ hay material.
      // La fórmula que tenías era la misma para ambos casos, lo que cambiaba era la interpretación de `inputValue`.
      // Si `calculationTypeForNav` es "distance", `inputValue` es espesor.
      // Si `calculationTypeForNav` es "thickness", `inputValue` es distancia.
      result =
        Math.sqrt((A * Γ) / (Math.pow(2, Y) * T)) *
        (Math.log(2) / µ) *
        (1 / inputValue);
    }

    if (isNaN(result) || !isFinite(result) || result < 0) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle", "Error"),
        text2: t("radiographyCalculator.calculationError"),
        position: "bottom",
      });
      return;
    }

    let distanceValueForSummary;
    if (calculationTypeForNav === "distance") {
      distanceValueForSummary = result.toFixed(3);
    } else {
      // Si se calculó el espesor, `form.value` era la distancia original.
      // Si no hubo material, este path no se debería alcanzar para "thickness".
      distanceValueForSummary =
        materialInternalValue === WITHOUT_MATERIAL_KEY ? "N/A" : form.value;
    }

    router.push({
      pathname: "employee/calculationSummary",
      params: {
        isotope: form.isotope,
        collimator: form.collimator,
        value:
          materialInternalValue === WITHOUT_MATERIAL_KEY &&
          calculationTypeForNav === "distance"
            ? t("radiographyCalculator.notApplicable", "N/A")
            : form.value,
        activity: form.activity,
        material: form.material,
        attenuation: form.attenuation,
        limit: form.limit,
        calculationType: calculationTypeForNav,
        result: result.toFixed(3),
        distanceValueForSummary: distanceValueForSummary,
      },
    });
  };

  const [modal, setModal] = useState({ open: false, field: "", options: [] });

  const openModal = (field, options) =>
    setModal({ open: true, field, options });
  const closeModal = () => setModal({ ...modal, open: false });

  const handleSelect = (field, value) => {
    const newFormValues = { ...form, [field]: value };

    if (field === "material") {
      const selectedMaterialKey = Object.keys(materialMap).find(
        (key) => materialMap[key] === value,
      );
      if (selectedMaterialKey === WITHOUT_MATERIAL_KEY) {
        newFormValues.value = ""; // Limpiar el campo de espesor/distancia
        newFormValues.attenuation = ""; // También limpiar atenuación por si acaso
      }
    }
    setForm(newFormValues);
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
            paddingTop: Platform.select({
              // Apply platform-specific padding
              ios: 60, // More padding on iOS (adjust value as needed, e.g., 55, 60)
              android: 40, // Base padding on Android (adjust value as needed)
            }),
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
              placeholderTextColor={"gray"}
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
            {Object.keys(materialMap).find(
              (key) => materialMap[key] === form.material,
            ) === "Other" && (
              <TextInput
                style={[
                  styles.inputContainer,
                  styles.input,
                  { flex: 0.4, marginLeft: 10 },
                ]}
                placeholder={t("radiographyCalculator.modal.attenuation")}
                placeholderTextColor={"gray"}
                keyboardType="numeric"
                value={form.attenuation}
                onChangeText={(text) => setForm({ ...form, attenuation: text })}
              />
            )}
          </View>

          {/* Descriptive text for Thickness/Distance input */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>
              {form.thicknessOrDistance ===
              t("radiographyCalculator.thicknessOrDistance")
                ? t("radiographyCalculator.descriptionForThicknessInput")
                : t("radiographyCalculator.descriptionForDistanceInput")}
            </Text>
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
                  // MODIFICADO: Limpiar 'value' si se cambia a calcular distancia y no hay material
                  value:
                    form.material === materialMap[WITHOUT_MATERIAL_KEY] &&
                    form.thicknessOrDistance !==
                      t("radiographyCalculator.thicknessOrDistance") // si ANTES NO era "Calcular Distancia"
                      ? ""
                      : form.value,
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
              style={[
                styles.inputContainer,
                styles.input,
                !isValueEditable && styles.inputDisabled, // NUEVO ESTILO
              ]}
              placeholder={t("radiographyCalculator.value", {
                unit:
                  form.thicknessOrDistance ===
                  t("radiographyCalculator.thicknessOrDistance")
                    ? "mm"
                    : "m",
              })}
              placeholderTextColor={"gray"}
              keyboardType="numeric"
              value={form.value}
              onChangeText={(text) => setForm({ ...form, value: text })}
              editable={isValueEditable} // MODIFICADO
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
    flex: 0.5,
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
  descriptionContainer: {
    width: "93%",
    alignItems: "flex-start", // Align text to the start of the container
    marginBottom: 8,
    marginTop: 5, // Added a little top margin
  },
  descriptionText: {
    fontSize: 13.5,
    color: "#424242", // Slightly darker gray
    fontStyle: "italic",
    lineHeight: 18, // Improved readability
  },
};
