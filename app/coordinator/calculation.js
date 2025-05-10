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
const OTHER_MATERIAL_KEY = "Other";

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
      [OTHER_MATERIAL_KEY]: t("radiographyCalculator.options.materials.Other"),
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
    // NUEVOS CAMPOS PARA MATERIAL "OTRO"
    otherMaterialName: "",
    attenuationIr: "", // Coeficiente para 192Ir
    attenuationSe: "", // Coeficiente para 75Se
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
      // Si se cambia a "Sin Material" Y se calcula distancia, limpiar valor.
      // Esto también se maneja en handleSelect y al cambiar thicknessOrDistance
      if (form.value !== "") {
        setForm((prev) => ({ ...prev, value: "" }));
      }
    } else {
      setIsValueEditable(true);
    }
  }, [form.material, form.thicknessOrDistance, t, materialMap, form.value]);

  const calculateAndNavigate = () => {
    const materialInternalValue = Object.keys(materialMap).find(
      (key) => materialMap[key] === form.material,
    );
    const calculationTypeForNav =
      form.thicknessOrDistance ===
      t("radiographyCalculator.thicknessOrDistance")
        ? "distance"
        : "thickness";

    if (
      materialInternalValue === WITHOUT_MATERIAL_KEY &&
      calculationTypeForNav === "thickness"
    ) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle", "Error"),
        text2: t("radiographyCalculator.alerts.materialNeededForThickness"),
        position: "bottom",
      });
      return;
    }

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
        /* Error campos incompletos */
      });
      return;
    }

    // NUEVA VALIDACIÓN: Nombre del material si es "Other"
    if (
      materialInternalValue === OTHER_MATERIAL_KEY &&
      !form.otherMaterialName.trim()
    ) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle", "Error"),
        text2: t(
          "radiographyCalculator.alerts.otherMaterialNameRequired",
          "Ingrese el nombre del material.",
        ),
        position: "bottom",
      });
      return;
    }

    if (
      materialInternalValue !== WITHOUT_MATERIAL_KEY &&
      calculationTypeForNav === "distance" &&
      !form.value &&
      materialInternalValue !== OTHER_MATERIAL_KEY
    ) {
      Toast.show({
        /* Error valor requerido */
      });
      return;
    }
    if (
      materialInternalValue !== WITHOUT_MATERIAL_KEY &&
      calculationTypeForNav === "thickness" &&
      !form.value
    ) {
      Toast.show({
        /* Error valor requerido */
      });
      return;
    }
    if (materialInternalValue === OTHER_MATERIAL_KEY && !form.value) {
      Toast.show({
        /* Error valor requerido */
      });
      return;
    }

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

    if (isNaN(A) || Γ === undefined || Y === undefined || T === undefined) {
      Toast.show({
        /* Error input inválido */
      });
      return;
    }

    let result;
    let µ;
    let inputValue = 0; // Inicializar por si no se usa (ej. Sin Material y distancia)

    if (
      materialInternalValue !== WITHOUT_MATERIAL_KEY ||
      (materialInternalValue === OTHER_MATERIAL_KEY && form.value)
    ) {
      if (form.value) {
        // Solo parsear si hay valor, especialmente para "Other"
        const valueString = form.value.replace(/,/g, ".");
        inputValue = parseFloat(valueString);
        if (isNaN(inputValue)) {
          Toast.show({
            type: "error",
            text1: t("radiographyCalculator.alerts.errorTitle", "Error"),
            text2: t(
              "radiographyCalculator.invalidInputMessage",
              "Valor de espesor/distancia inválido.",
            ),
            position: "bottom",
          });
          return;
        }
      }
    }

    if (materialInternalValue === WITHOUT_MATERIAL_KEY) {
      result = Math.sqrt((A * Γ) / (Math.pow(2, Y) * T)) * 1;
    } else if (materialInternalValue === OTHER_MATERIAL_KEY) {
      if (form.isotope === "192Ir") {
        µ = parseFloat(form.attenuationIr.replace(/,/g, ".")) || 0;
      } else if (form.isotope === "75Se") {
        µ = parseFloat(form.attenuationSe.replace(/,/g, ".")) || 0;
      } else {
        // Isótopo no seleccionado o no válido
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Seleccione un isótopo válido.",
        });
        return;
      }

      if (isNaN(µ)) µ = 0; // Seguridad adicional

      if (µ === 0) {
        // Si el coeficiente es 0, tratar como sin atenuación efectiva
        result = Math.sqrt((A * Γ) / (Math.pow(2, Y) * T)) * 1;
      } else {
        result =
          Math.sqrt((A * Γ) / (Math.pow(2, Y) * T)) *
          (Math.log(2) / µ) *
          (1 / inputValue);
      }
    } else {
      // Material predefinido
      µ = ATTENUATION_COEFFICIENT[materialInternalValue]?.[form.isotope];
      if (µ === undefined || isNaN(µ) || µ === 0) {
        // Si µ es 0 para predefinido, también usar fórmula sin atenuación
        Toast.show({
          type: "error",
          text1: "Error",
          text2: `Coeficiente de atenuación no encontrado para ${form.material} con ${form.isotope}.`,
        });
        // Opcionalmente, calcular como si no hubiera material si µ es 0 o no definido.
        // result = Math.sqrt((A * Γ) / (Math.pow(2, Y) * T)) * 1;
        return; // Es mejor detenerse si falta un coeficiente predefinido.
      }
      result =
        Math.sqrt((A * Γ) / (Math.pow(2, Y) * T)) *
        (Math.log(2) / µ) *
        (1 / inputValue);
    }

    if (isNaN(result) || !isFinite(result) || result < 0) {
      Toast.show({
        /* Error de cálculo */
      });
      return;
    }

    let distanceValueForSummary =
      calculationTypeForNav === "distance" ? result.toFixed(3) : form.value;
    if (
      materialInternalValue === WITHOUT_MATERIAL_KEY &&
      calculationTypeForNav === "thickness"
    ) {
      // Este caso no debería ocurrir debido al check inicial, pero por si acaso
      distanceValueForSummary = "N/A";
    }

    router.push({
      pathname: "coordinator/calculationSummary",
      params: {
        isotope: form.isotope,
        collimator: form.collimator,
        value:
          materialInternalValue === WITHOUT_MATERIAL_KEY &&
          calculationTypeForNav === "distance"
            ? t("radiographyCalculator.notApplicable", "N/A")
            : form.value,
        activity: form.activity,
        // Enviar el nombre correcto del material
        material:
          materialInternalValue === OTHER_MATERIAL_KEY
            ? form.otherMaterialName
            : form.material,
        // Enviar el coeficiente de atenuación usado si es "Otro"
        attenuationCoefficientUsed:
          materialInternalValue === OTHER_MATERIAL_KEY
            ? form.isotope === "192Ir"
              ? form.attenuationIr || "0"
              : form.attenuationSe || "0"
            : "N/A", // O el µ obtenido de ATTENUATION_COEFFICIENT
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
    setForm((prevForm) => {
      const newFormValues = { ...prevForm, [field]: value };
      if (field === "material") {
        const selectedMaterialKey = Object.keys(materialMap).find(
          (key) => materialMap[key] === value,
        );
        if (selectedMaterialKey !== OTHER_MATERIAL_KEY) {
          // Si NO es "Other"
          newFormValues.otherMaterialName = "";
          newFormValues.attenuationIr = "";
          newFormValues.attenuationSe = "";
        }
        if (selectedMaterialKey === WITHOUT_MATERIAL_KEY) {
          newFormValues.value = ""; // Limpiar el campo de espesor/distancia
        }
      }
      return newFormValues;
    });
    closeModal();
  };

  const showOtherMaterialFields = useMemo(() => {
    return (
      Object.keys(materialMap).find(
        (key) => materialMap[key] === form.material,
      ) === OTHER_MATERIAL_KEY
    );
  }, [form.material, materialMap]);

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
          {/* Material Selection */}
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
                { flex: 1 /* Ajustar si es necesario */ },
              ]}
            >
              <Text style={styles.input}>{form.material}</Text>
            </Pressable>
          </View>
          {/* NUEVOS CAMPOS PARA MATERIAL "OTRO" */}
          {showOtherMaterialFields && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  width: "93%",
                  marginTop: 5,
                }}
              >
                <Text style={styles.label}>
                  {t(
                    "radiographyCalculator.labels.otherMaterialName",
                    "Nombre Material",
                  )}
                </Text>
                <TextInput
                  style={[
                    styles.inputContainer,
                    styles.input,
                    {
                      flex: 1,
                      marginBottom: 15 /* Reducir marginBottom si es mucho */,
                    },
                  ]}
                  placeholder={t(
                    "radiographyCalculator.placeholders.otherMaterialName",
                    "Ej: Plomo Especial",
                  )}
                  placeholderTextColor="gray"
                  value={form.otherMaterialName}
                  onChangeText={(text) =>
                    setForm({ ...form, otherMaterialName: text })
                  }
                />
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    width: "93%",
                    textAlign: "left",
                    marginLeft: 15,
                    marginBottom: 10,
                  },
                ]}
              >
                {t(
                  "radiographyCalculator.labels.attenuationFor",
                  "Coeficiente de atenuación para:",
                )}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  width: "93%",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1, marginRight: 5, alignItems: "center" }}>
                  <Text
                    style={[styles.label, { marginBottom: 2, fontSize: 16 }]}
                  >
                    192Ir
                  </Text>
                  <TextInput
                    style={[
                      styles.inputContainer,
                      styles.input,
                      { flex: undefined, width: "100%", marginBottom: 20 },
                    ]} // Ajustar flex y width
                    placeholder="μ (Ir)"
                    placeholderTextColor="gray"
                    keyboardType="numeric"
                    value={form.attenuationIr}
                    onChangeText={(text) =>
                      setForm({ ...form, attenuationIr: text })
                    }
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 5, alignItems: "center" }}>
                  <Text
                    style={[styles.label, { marginBottom: 2, fontSize: 16 }]}
                  >
                    75Se
                  </Text>
                  <TextInput
                    style={[
                      styles.inputContainer,
                      styles.input,
                      { flex: undefined, width: "100%", marginBottom: 20 },
                    ]} // Ajustar flex y width
                    placeholder="μ (Se)"
                    placeholderTextColor="gray"
                    keyboardType="numeric"
                    value={form.attenuationSe}
                    onChangeText={(text) =>
                      setForm({ ...form, attenuationSe: text })
                    }
                  />
                </View>
              </View>
            </>
          )}
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
                setForm((prevForm) => {
                  const currentModeIsCalcDistance =
                    prevForm.thicknessOrDistance ===
                    t("radiographyCalculator.thicknessOrDistance");
                  const newModeWillBeCalcDistance = !currentModeIsCalcDistance; // Si NO es calcDistance, el nuevo SÍ lo será

                  let newValue = prevForm.value;
                  const materialIsNone =
                    Object.keys(materialMap).find(
                      (key) => materialMap[key] === prevForm.material,
                    ) === WITHOUT_MATERIAL_KEY;

                  if (newModeWillBeCalcDistance && materialIsNone) {
                    newValue = "";
                  }
                  return {
                    ...prevForm,
                    value: newValue,
                    thicknessOrDistance: newModeWillBeCalcDistance
                      ? t("radiographyCalculator.thicknessOrDistance")
                      : t("radiographyCalculator.distance"),
                  };
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
