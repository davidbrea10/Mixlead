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
import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next"; // Import i18n hook
import Toast from "react-native-toast-message";
import { db, auth } from "../../firebase/config"; // Asegúrate que la ruta sea correcta
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

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

  const [customMaterialsFromDB, setCustomMaterialsFromDB] = useState({});
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
    showCancel: true,
  });

  const getCurrentEmployeeId = useCallback(() => {
    return auth.currentUser?.uid;
  }, []);

  const fetchCustomMaterials = useCallback(async () => {
    const employeeId = getCurrentEmployeeId();
    if (!employeeId) {
      // console.log("No employee logged in to fetch materials.");
      setCustomMaterialsFromDB({}); // Clear if no user
      return;
    }
    try {
      const materialsColRef = collection(
        db,
        "employees",
        employeeId,
        "materials",
      );
      const materialSnapshot = await getDocs(materialsColRef);
      const fetchedMaterials = {};
      materialSnapshot.forEach((doc) => {
        fetchedMaterials[doc.id] = doc.data(); // { attenuationIr: "...", attenuationSe: "..." }
      });
      setCustomMaterialsFromDB(fetchedMaterials);
    } catch (error) {
      console.error("Error fetching custom materials:", error);
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.errorFetchingCustomMaterials"),
        position: "bottom",
      });
      setCustomMaterialsFromDB({}); // Clear on error
    }
  }, [t, getCurrentEmployeeId]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchCustomMaterials();
      } else {
        setCustomMaterialsFromDB({}); // Clear materials if user logs out
      }
    });
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [fetchCustomMaterials]);

  // Maps for internal values and translations
  const collimatorMap = useMemo(
    () => ({
      Yes: t("radiographyCalculator.options.collimator.Yes"),
      No: t("radiographyCalculator.options.collimator.No"),
    }),
    [t],
  );

  const combinedMaterialMap = useMemo(() => {
    const predefinedMaterials = {
      [WITHOUT_MATERIAL_KEY]: t(
        "radiographyCalculator.options.materials.withoutMaterial",
      ),
      Mixlead: t("radiographyCalculator.options.materials.Mixlead"),
      Steel: t("radiographyCalculator.options.materials.Steel"),
      Concrete: t("radiographyCalculator.options.materials.Concrete"),
      Aluminum: t("radiographyCalculator.options.materials.Aluminum"),
      Lead: t("radiographyCalculator.options.materials.Lead"),
      Tungsten: t("radiographyCalculator.options.materials.Tungsten"),
    };
    const customMaterialEntries = {};
    for (const name in customMaterialsFromDB) {
      customMaterialEntries[name] = name; // Display name is the key itself
    }
    return {
      ...predefinedMaterials,
      ...customMaterialEntries,
      [OTHER_MATERIAL_KEY]: t("radiographyCalculator.options.materials.Other"),
    };
  }, [t, customMaterialsFromDB]);

  const OPTIONS = useMemo(
    () => ({
      isotopes: ["192Ir", "75Se"],
      collimator: Object.values(collimatorMap),
      materials: Object.values(combinedMaterialMap),
      limits: ["11µSv/h", "0.5µSv/h"],
    }),
    [collimatorMap, combinedMaterialMap],
  );

  const [form, setForm] = useState({
    isotope: t("radiographyCalculator.modal.isotope"),
    collimator: t("radiographyCalculator.modal.collimator"),
    thicknessOrDistance: t("radiographyCalculator.thicknessOrDistance"),
    value: "",
    activity: "",
    material: t("radiographyCalculator.modal.material"),
    otherMaterialName: "",
    attenuationIr: "",
    attenuationSe: "",
    limit: t("radiographyCalculator.modal.limit"),
  });

  // NUEVA LÓGICA: Estado para saber si el input de valor debe estar editable
  const [isValueEditable, setIsValueEditable] = useState(true);

  // MODIFICADO: useEffect para actualizar la editabilidad del campo 'value'
  useEffect(() => {
    const materialInternalValue = Object.keys(combinedMaterialMap).find(
      (key) => combinedMaterialMap[key] === form.material,
    );
    const isCalculatingDistance =
      form.thicknessOrDistance ===
      t("radiographyCalculator.thicknessOrDistance");

    if (
      materialInternalValue === WITHOUT_MATERIAL_KEY &&
      isCalculatingDistance
    ) {
      setIsValueEditable(false);
      if (form.value !== "") {
        setForm((prev) => ({ ...prev, value: "" }));
      }
    } else {
      setIsValueEditable(true);
    }
  }, [
    form.material,
    form.thicknessOrDistance,
    t,
    combinedMaterialMap,
    form.value,
  ]);

  const showConfirmationModal = (
    title,
    message,
    onConfirmAction,
    showCancel = true,
  ) => {
    setConfirmModalConfig({
      title,
      message,
      onConfirm: onConfirmAction,
      showCancel,
    });
    setConfirmModalVisible(true);
  };

  // --- Lógica para determinar los placeholders dinámicos ---
  const currentMaterialKey = useMemo(() => {
    return Object.keys(combinedMaterialMap).find(
      (key) => combinedMaterialMap[key] === form.material,
    );
  }, [combinedMaterialMap, form.material]);

  const isCustomMaterialSelected = useMemo(() => {
    return !!(currentMaterialKey && customMaterialsFromDB[currentMaterialKey]);
  }, [currentMaterialKey, customMaterialsFromDB]);

  const handleAddOrUpdateCustomMaterial = async () => {
    const { otherMaterialName, attenuationIr, attenuationSe } = form;
    const employeeId = getCurrentEmployeeId();

    if (!employeeId) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.userNotLoggedIn"),
        position: "bottom",
      });
      return;
    }
    const materialNameClean = otherMaterialName.trim();
    if (!materialNameClean) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.materialNameRequired"),
        position: "bottom",
      });
      return;
    }

    // --- Procesamiento y validación de coeficientes de atenuación ---
    let numericIrValue;
    const cleanedIrInput = attenuationIr.replace(",", ".").trim(); // Limpia la entrada del formulario
    if (cleanedIrInput === "") {
      numericIrValue = 0; // Si está vacío, el valor numérico es 0
    } else {
      numericIrValue = parseFloat(cleanedIrInput);
    }

    let numericSeValue;
    const cleanedSeInput = attenuationSe.replace(",", ".").trim(); // Limpia la entrada del formulario
    if (cleanedSeInput === "") {
      numericSeValue = 0; // Si está vacío, el valor numérico es 0
    } else {
      numericSeValue = parseFloat(cleanedSeInput);
    }

    // Validar si los valores numéricos resultantes son realmente números
    // (atrapa casos como "abc" que resultarían en NaN)
    if (isNaN(numericIrValue) || isNaN(numericSeValue)) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.validCoefficientsRequired"),
        position: "bottom",
      });
      return;
    }

    // Validar que los valores numéricos no sean negativos
    if (numericIrValue < 0 || numericSeValue < 0) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.coefficientsCannotBeNegative"),
        position: "bottom",
      });
      return;
    }
    // --- Fin del procesamiento y validación ---

    try {
      const materialDocRef = doc(
        db,
        "employees",
        employeeId,
        "materials",
        materialNameClean,
      );
      const docSnap = await getDoc(materialDocRef);

      const dataToSave = {
        attenuationIr: numericIrValue, // Guardar como número
        attenuationSe: numericSeValue, // Guardar como número
      };

      if (docSnap.exists()) {
        showConfirmationModal(
          t("radiographyCalculator.modals.replaceMaterial.title"),
          t("radiographyCalculator.modals.replaceMaterial.message", {
            materialName: materialNameClean,
          }),
          async () => {
            await setDoc(materialDocRef, dataToSave, { merge: true });
            Toast.show({
              type: "success",
              text1: t("radiographyCalculator.alerts.successTitle"),
              text2: t("radiographyCalculator.alerts.materialUpdated", {
                materialName: materialNameClean,
              }),
              position: "bottom",
            });
            await fetchCustomMaterials();
            setForm((prev) => ({
              ...prev,
              material: materialNameClean,
              // Considerar si los campos del formulario attenuationIr/Se deben actualizarse aquí
              // a String(numericIrValue) y String(numericSeValue) para reflejar el "0" si estaban vacíos.
              attenuationIr: String(numericIrValue), // Actualiza el form para reflejar el 0 si estaba vacío
              attenuationSe: String(numericSeValue), // Actualiza el form para reflejar el 0 si estaba vacío
            }));
          },
        );
      } else {
        showConfirmationModal(
          t("radiographyCalculator.modals.addMaterial.title"),
          t("radiographyCalculator.modals.addMaterial.message", {
            materialName: materialNameClean,
          }),
          async () => {
            await setDoc(materialDocRef, dataToSave);
            Toast.show({
              type: "success",
              text1: t("radiographyCalculator.alerts.successTitle"),
              text2: t("radiographyCalculator.alerts.materialAdded", {
                materialName: materialNameClean,
              }),
              position: "bottom",
            });
            await fetchCustomMaterials();
            setForm((prev) => ({
              ...prev,
              material: materialNameClean,
              attenuationIr: String(numericIrValue), // Actualiza el form para reflejar el 0 si estaba vacío
              attenuationSe: String(numericSeValue), // Actualiza el form para reflejar el 0 si estaba vacío
            }));
          },
        );
      }
    } catch (error) {
      console.error("Error saving custom material:", error);
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.errorSavingMaterial"),
        position: "bottom",
      });
    }
  };

  const handleDeleteCustomMaterial = async (materialName) => {
    const employeeId = getCurrentEmployeeId();
    if (!employeeId) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.userNotLoggedIn"),
        position: "bottom",
      });
      return;
    }

    if (!materialName) {
      console.error("Material name to delete is undefined.");
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.errorDeletingMaterial"),
        position: "bottom",
      });
      return;
    }

    try {
      const materialDocRef = doc(
        db,
        "employees",
        employeeId,
        "materials",
        materialName,
      );
      await deleteDoc(materialDocRef);

      Toast.show({
        type: "success",
        text1: t("radiographyCalculator.alerts.successTitle"),
        text2: t("radiographyCalculator.alerts.materialDeleted", {
          materialName: materialName,
        }),
        position: "bottom",
      });

      await fetchCustomMaterials();

      setForm((prevForm) => ({
        ...prevForm,
        material: t("radiographyCalculator.modal.material"),
        otherMaterialName: "",
        attenuationIr: "",
        attenuationSe: "",
      }));
    } catch (error) {
      console.error("Error deleting custom material:", error);
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.errorDeletingMaterial"),
        position: "bottom",
      });
    }
  };

  const onPressDeleteButton = () => {
    if (!isCustomMaterialSelected || !currentMaterialKey) {
      console.warn(
        "Delete button pressed without a valid custom material selected.",
      );
      return;
    }

    const materialNameToDelete = currentMaterialKey;

    showConfirmationModal(
      t("radiographyCalculator.modals.deleteMaterial.title"),
      t("radiographyCalculator.modals.deleteMaterial.message", {
        materialName: materialNameToDelete,
      }),
      () => handleDeleteCustomMaterial(materialNameToDelete), // Correctly calls the separate handleDeleteCustomMaterial
      true,
    );
  };

  const calculateAndNavigate = () => {
    // Usar combinedMaterialMap que incluye materiales predefinidos y personalizados
    const materialInternalKey = Object.keys(combinedMaterialMap).find(
      (key) => combinedMaterialMap[key] === form.material,
    );

    const calculationTypeForNav =
      form.thicknessOrDistance ===
      t("radiographyCalculator.thicknessOrDistance")
        ? "distance"
        : "thickness";

    // --- Validaciones (mantenidas de tu versión "correcta" y las mejoras) ---
    if (
      materialInternalKey === WITHOUT_MATERIAL_KEY &&
      calculationTypeForNav === "thickness"
    ) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.materialNeededForThickness"),
        position: "bottom",
      });
      return;
    }

    // Validación de campos generales (mejorada para usar los textos de placeholder)
    const placeholderValues = [
      t("radiographyCalculator.modal.isotope"),
      t("radiographyCalculator.modal.collimator"),
      t("radiographyCalculator.modal.material"),
      t("radiographyCalculator.modal.limit"),
    ];
    if (
      !form.isotope ||
      placeholderValues.includes(form.isotope) ||
      !form.activity.trim() || // Asegurar que actividad no esté vacía
      !form.limit ||
      placeholderValues.includes(form.limit) ||
      !form.material ||
      placeholderValues.includes(form.material) ||
      !form.collimator ||
      placeholderValues.includes(form.collimator) // Añadida validación de colimador
    ) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.allFieldsRequired"), // Usar el mensaje general
        position: "bottom",
      });
      return;
    }

    if (
      materialInternalKey === OTHER_MATERIAL_KEY &&
      !form.otherMaterialName.trim()
    ) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.otherMaterialNameRequired"),
        position: "bottom",
      });
      return;
    }

    // Validaciones para form.value (espesor/distancia) de tu versión "correcta"
    // Nota: Los Toasts estaban comentados en tu snippet, aquí los activo con un mensaje genérico.
    // Deberías tener traducciones para "radiographyCalculator.alerts.valueRequired".
    if (
      materialInternalKey !== WITHOUT_MATERIAL_KEY &&
      calculationTypeForNav === "distance" &&
      !form.value.trim() && // trim() para asegurar que no sean solo espacios
      materialInternalKey !== OTHER_MATERIAL_KEY &&
      materialInternalKey !== WITHOUT_MATERIAL_KEY // Condición redundante, ya cubierta
    ) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.valueRequired", {
          fieldName: t("radiographyCalculator.labels.thickness"),
        }),
        position: "bottom",
      });
      return;
    }
    if (
      materialInternalKey !== WITHOUT_MATERIAL_KEY &&
      calculationTypeForNav === "thickness" &&
      !form.value.trim()
    ) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.valueRequired", {
          fieldName: t("radiographyCalculator.labels.distance"),
        }),
        position: "bottom",
      });
      return;
    }
    if (materialInternalKey === OTHER_MATERIAL_KEY && !form.value.trim()) {
      // Para "Other", el valor (espesor o distancia) también es requerido si la fórmula lo usa.
      // La fórmula D0 * HVL * (1/inputValue) siempre usa inputValue.
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.valueRequired", {
          fieldName:
            calculationTypeForNav === "distance"
              ? t("radiographyCalculator.labels.thickness")
              : t("radiographyCalculator.labels.distance"),
        }),
        position: "bottom",
      });
      return;
    }
    // --- Fin Validaciones ---

    const activityString = form.activity.replace(/,/g, ".");
    const A = parseFloat(activityString) * 37;
    const Γ = GAMMA_FACTOR[form.isotope];

    // Usar collimatorMap que ya está definido en el componente
    const collimatorKeyValue = Object.keys(collimatorMap).find(
      (key) => collimatorMap[key] === form.collimator,
    );
    const Y =
      collimatorKeyValue === "Yes"
        ? COLLIMATOR_EFFECT.Yes[form.isotope]
        : COLLIMATOR_EFFECT.No;
    const T = form.limit === "11µSv/h" ? 0.011 : 0.0005;

    if (isNaN(A) || Γ === undefined || Y === undefined || T === undefined) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.invalidInputBase"), // Mensaje genérico para datos base
        position: "bottom",
      });
      return;
    }

    let result;
    let µ = 0; // Inicializar µ por si acaso
    let inputValue = 0;

    // Lógica de parseo de inputValue de tu versión "correcta"
    // Esta condición asegura que inputValue solo se parsea si es relevante.
    // Para 'Sin Material' calculando distancia, inputValue no se usa en la fórmula D_0.
    // Para otros materiales, inputValue es necesario.
    if (materialInternalKey !== WITHOUT_MATERIAL_KEY) {
      if (form.value.trim()) {
        // Solo parsear si hay valor y el material no es "None"
        const valueString = form.value.replace(/,/g, ".");
        inputValue = parseFloat(valueString);
        if (isNaN(inputValue) || inputValue < 0) {
          // Añadido chequeo de < 0
          Toast.show({
            type: "error",
            text1: t("radiographyCalculator.alerts.errorTitle"),
            text2: t("radiographyCalculator.invalidInputMessage"),
            position: "bottom",
          });
          return;
        }
        if (inputValue === 0) {
          // La fórmula original (1/inputValue) dará Infinity si inputValue es 0.
          // Esto será capturado por el chequeo !isFinite(result) más adelante.
          // Esto replica el comportamiento de tu fórmula anterior.
        }
      } else {
        // Si form.value está vacío aquí pero es requerido (material !== None),
        // las validaciones anteriores ya deberían haber mostrado un error.
        // Por si acaso, si se llega aquí y inputValue es 0 (por defecto) y se usa en 1/0:
        // el chequeo de !isFinite(result) lo capturará.
      }
    }

    const D_0 = Math.sqrt((A * Γ) / (Math.pow(2, Y) * T)); // Distancia sin blindaje (D_0)

    if (materialInternalKey === WITHOUT_MATERIAL_KEY) {
      result = D_0; // El * 1 es innecesario
    } else if (materialInternalKey === OTHER_MATERIAL_KEY) {
      // Obtener µ para "Other"
      if (form.isotope === "192Ir") {
        µ = parseFloat(form.attenuationIr.replace(/,/g, ".")) || 0;
      } else if (form.isotope === "75Se") {
        µ = parseFloat(form.attenuationSe.replace(/,/g, ".")) || 0;
      } else {
        // Este caso debería estar cubierto por la validación general de form.isotope
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Seleccione un isótopo válido para 'Otro'.",
        });
        return;
      }

      // La línea `if (isNaN(µ)) µ = 0;` de tu código original ya está cubierta por `|| 0` en parseFloat.
      // Pero para ser explícito y cubrir cualquier NaN no esperado:
      if (isNaN(µ)) µ = 0;

      if (µ <= 0) {
        // Si µ es 0 o negativo (por si acaso), se trata como sin atenuación
        result = D_0;
      } else {
        // Tu fórmula original
        result = D_0 * (Math.log(2) / µ) * (1 / inputValue);
      }
    } else {
      // Material predefinido o personalizado guardado
      if (customMaterialsFromDB[materialInternalKey]) {
        // Material personalizado guardado
        const customMatData = customMaterialsFromDB[materialInternalKey];
        let attValueStr;
        if (form.isotope === "192Ir") {
          attValueStr = customMatData.attenuationIr;
        } else if (form.isotope === "75Se") {
          attValueStr = customMatData.attenuationSe;
        } else {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "Isótopo no configurado para material personalizado.",
          });
          return;
        }
        µ = parseFloat(String(attValueStr).replace(/,/g, ".")) || 0;
        if (isNaN(µ)) µ = 0; // Seguridad
      } else {
        // Material predefinido
        µ = ATTENUATION_COEFFICIENT[materialInternalKey]?.[form.isotope];
      }

      // Validación de µ para predefinidos/personalizados (tu lógica original era estricta aquí)
      if (µ === undefined || isNaN(µ) || µ <= 0) {
        // Cambiado a µ <= 0
        Toast.show({
          type: "error",
          text1: t("radiographyCalculator.alerts.errorTitle"),
          text2: t("radiographyCalculator.alerts.coefficientNotFound", {
            material: form.material,
            isotope: form.isotope,
          }),
        });
        return;
      }
      // Tu fórmula original
      result = D_0 * (Math.log(2) / µ) * (1 / inputValue);
    }

    // Validación final del resultado (de tu versión "correcta")
    if (isNaN(result) || !isFinite(result) || result < 0) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.calculationError"), // Mensaje de error de cálculo genérico
        position: "bottom",
      });
      return;
    }

    // --- Preparación de parámetros para la pantalla de resumen ---
    let materialNameForSummary = form.material; // Nombre para mostrar en el resumen
    if (materialInternalKey === OTHER_MATERIAL_KEY) {
      materialNameForSummary =
        form.otherMaterialName.trim() ||
        t("radiographyCalculator.options.materials.Other");
    } else if (customMaterialsFromDB[materialInternalKey]) {
      materialNameForSummary = materialInternalKey; // El nombre real del material personalizado
    }

    let attCoefUsedDisplay = "N/A";
    if (materialInternalKey !== WITHOUT_MATERIAL_KEY && µ >= 0) {
      attCoefUsedDisplay = µ.toFixed(3);
    }

    // El parámetro 'value' para el resumen es el valor de entrada del formulario (espesor o distancia)
    let valueForSummary = form.value.replace(/,/g, ".");
    if (
      materialInternalKey === WITHOUT_MATERIAL_KEY &&
      calculationTypeForNav === "distance"
    ) {
      valueForSummary = t("radiographyCalculator.notApplicable");
    } else if (!form.value.trim()) {
      // Si el valor original estaba vacío pero se usó 0 implícitamente (y no dio error antes),
      // podría representarse como "0" o "N/A" si no aplica.
      // Dado que las validaciones anteriores deberían haber exigido un valor si era necesario,
      // si está vacío aquí, es probable que sea el caso de "Sin Material" y distancia.
      // O un caso donde inputValue se convirtió en 0 y el resultado fue Infinity (ya manejado por isFinite).
      // Para consistencia, si form.value está vacío, no debería llegar aquí si era requerido.
      // Si es N/A para "Sin material" y distancia, lo usamos. Sino, el valor del form (o "0" por defecto).
      valueForSummary = valueForSummary || "0";
    }

    let distanceValueForSummary;

    if (calculationTypeForNav === "distance") {
      // Si se calculó la distancia, 'result' es la distancia calculada.
      distanceValueForSummary = result.toFixed(3);
    } else {
      // calculationTypeForNav === "thickness" (se calculó el espesor)
      // Si se calculó el espesor, 'valueForSummary' contiene la distancia que el usuario introdujo.
      distanceValueForSummary = valueForSummary;
    }

    router.push({
      pathname: "coordinator/calculationSummary",
      params: {
        isotope: form.isotope,
        collimator: form.collimator,
        value: valueForSummary,
        activity: form.activity,
        material: materialNameForSummary,
        attenuationCoefficientUsed: attCoefUsedDisplay,
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
        const selectedMaterialKey = Object.keys(combinedMaterialMap).find(
          (key) => combinedMaterialMap[key] === value,
        );

        // Reset "Other" material fields by default
        newFormValues.otherMaterialName = "";
        newFormValues.attenuationIr = "";
        newFormValues.attenuationSe = "";

        if (selectedMaterialKey === OTHER_MATERIAL_KEY) {
          // User explicitly selected "Other", fields are already cleared, ready for input
        } else if (customMaterialsFromDB[selectedMaterialKey]) {
          // User selected a SAVED custom material
          const customMatData = customMaterialsFromDB[selectedMaterialKey];
          newFormValues.otherMaterialName = selectedMaterialKey; // Show its name
          newFormValues.attenuationIr =
            customMatData.attenuationIr != null
              ? String(customMatData.attenuationIr)
              : "";
          newFormValues.attenuationSe =
            customMatData.attenuationSe != null
              ? String(customMatData.attenuationSe)
              : "";
        } else if (selectedMaterialKey === WITHOUT_MATERIAL_KEY) {
          newFormValues.value = ""; // Clear thickness/distance for "Sin Material"
        }
        // For predefined materials, "Other" fields remain cleared
      }
      return newFormValues;
    });
    closeModal();
  };

  const showMaterialDetailFields = useMemo(() => {
    return (
      currentMaterialKey === OTHER_MATERIAL_KEY ||
      !!(currentMaterialKey && customMaterialsFromDB[currentMaterialKey]) // Simplified using currentMaterialKey directly
    );
    // Or, more simply, using isCustomMaterialSelected:
    // return currentMaterialKey === OTHER_MATERIAL_KEY || isCustomMaterialSelected;
  }, [currentMaterialKey, customMaterialsFromDB]); // isCustomMaterialSelected if used

  // "+" button is active only if "Other" is selected and a name is typed
  const showAddMaterialButton = useMemo(() => {
    return (
      currentMaterialKey === OTHER_MATERIAL_KEY &&
      form.otherMaterialName.trim() !== ""
    );
  }, [currentMaterialKey, form.otherMaterialName]);

  let placeholderIrText = "0 μ (Ir)"; // Placeholder por defecto inicial
  if (
    form.attenuationIr === "" &&
    currentMaterialKey &&
    customMaterialsFromDB[currentMaterialKey] &&
    currentMaterialKey !== OTHER_MATERIAL_KEY
  ) {
    // Check added for OTHER_MATERIAL_KEY
    const dbValueIr = String(
      customMaterialsFromDB[currentMaterialKey]?.attenuationIr ?? "0",
    );
    placeholderIrText = `${dbValueIr} μ (Ir)`;
  } else if (
    form.attenuationIr === "" &&
    currentMaterialKey === OTHER_MATERIAL_KEY
  ) {
    placeholderIrText = "0 μ (Ir)";
  } else if (form.attenuationIr === "") {
    placeholderIrText = "μ (Ir)";
  }

  let placeholderSeText = "0 μ (Se)"; // Placeholder por defecto inicial
  if (form.attenuationSe === "" && customMaterialsFromDB[currentMaterialKey]) {
    // Si el input está vacío y es un material personalizado existente:
    const dbValueSe = String(
      customMaterialsFromDB[currentMaterialKey].attenuationSe ?? "0",
    );
    placeholderSeText = `${dbValueSe} μ (Se)`;
  } else if (
    form.attenuationSe === "" &&
    currentMaterialKey === OTHER_MATERIAL_KEY
  ) {
    placeholderSeText = "0 μ (Se)"; // Placeholder para "Otro" si está vacío
  } else if (form.attenuationSe === "") {
    placeholderSeText = "μ (Se)"; // Placeholder genérico para otros casos si está vacío
  }
  // --- Fin de la lógica para placeholders ---

  const handleBack = () => router.back();
  const handleHome = () => router.replace("/coordinator/home");

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
          {showMaterialDetailFields && (
            <>
              {/* Fila para el nombre del material */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  width: "93%", // Manteniendo la consistencia
                  marginTop: 5,
                  // marginBottom: 10, // Ajusta si es necesario antes de los coeficientes
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
                    { flex: 1 }, // Allow TextInput to take available space
                    currentMaterialKey !== OTHER_MATERIAL_KEY &&
                      styles.inputDisabled,
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
                  editable={currentMaterialKey === OTHER_MATERIAL_KEY}
                />
              </View>

              {/* Etiqueta para coeficientes de atenuación */}
              <Text
                style={[
                  styles.label, // Reutilizando tu estilo de label
                  {
                    width: "93%",
                    textAlign: "left",
                    marginTop: 15,
                    marginBottom: 10,
                    fontSize: 16,
                    fontWeight: "600",
                  },
                ]}
              >
                {t(
                  "radiographyCalculator.labels.attenuationFor",
                  "Coeficiente de atenuación para:",
                )}
              </Text>

              {/* Fila para los inputs de coeficientes de atenuación */}
              <View
                style={{
                  flexDirection: "row",
                  width: "93%",
                  justifyContent: "space-between",
                  alignItems: "center",
                  // marginBottom: 15, // Espacio antes del botón +/- si va después
                }}
              >
                {/* Input para 192Ir */}
                <View style={{ flex: 1, marginRight: 5, alignItems: "center" }}>
                  <Text
                    style={[
                      styles.label,
                      { marginBottom: 2, fontSize: 16, minWidth: "auto" },
                    ]}
                  >
                    192Ir
                  </Text>
                  <TextInput
                    style={[
                      styles.inputContainer,
                      styles.input,
                      { flex: undefined, width: "100%" }, // Quita marginBottom: 20 de aquí si el botón +/- va después de esta fila
                      currentMaterialKey !== OTHER_MATERIAL_KEY &&
                        styles.inputDisabled,
                    ]}
                    placeholder={placeholderIrText} // Usando tu lógica de placeholder
                    placeholderTextColor="gray"
                    keyboardType="numeric"
                    value={form.attenuationIr}
                    onChangeText={(text) =>
                      setForm({ ...form, attenuationIr: text })
                    }
                    editable={currentMaterialKey === OTHER_MATERIAL_KEY}
                  />
                  <Text style={styles.attenuationUnitText}>μ (Ir)</Text>
                </View>

                {/* Input para 75Se */}
                <View style={{ flex: 1, marginLeft: 5, alignItems: "center" }}>
                  <Text
                    style={[
                      styles.label,
                      { marginBottom: 2, fontSize: 16, minWidth: "auto" },
                    ]}
                  >
                    75Se
                  </Text>
                  <TextInput
                    style={[
                      styles.inputContainer,
                      styles.input,
                      { flex: undefined, width: "100%" }, // Quita marginBottom: 20
                      currentMaterialKey !== OTHER_MATERIAL_KEY &&
                        styles.inputDisabled,
                    ]}
                    placeholder={placeholderSeText} // Usando tu lógica de placeholder
                    placeholderTextColor="gray"
                    keyboardType="numeric"
                    value={form.attenuationSe}
                    onChangeText={(text) =>
                      setForm({ ...form, attenuationSe: text })
                    }
                    editable={currentMaterialKey === OTHER_MATERIAL_KEY}
                  />
                  <Text style={styles.attenuationUnitText}>μ (Se)</Text>
                </View>
              </View>

              {/* ÁREA PARA LOS BOTONES DE AGREGAR (+) O ELIMINAR (-) */}
              {/* El contenedor addMaterialButtonContainer se usa para ambos para la misma ubicación/estilo */}
              {showAddMaterialButton ? (
                <View style={styles.addMaterialButtonContainer}>
                  <Pressable
                    onPress={handleAddOrUpdateCustomMaterial}
                    style={styles.addMaterialButton} // Tu estilo existente para el botón "+"
                  >
                    <Text style={styles.addMaterialButtonText}>+</Text>
                  </Pressable>
                </View>
              ) : isCustomMaterialSelected ? (
                <View style={styles.addMaterialButtonContainer}>
                  <Pressable
                    onPress={onPressDeleteButton}
                    style={[
                      styles.addMaterialButton,
                      styles.deleteActionButton,
                    ]} // Reutiliza estilo base y aplica color de borrado
                  >
                    <Text style={styles.addMaterialButtonText}>-</Text>
                  </Pressable>
                </View>
              ) : null}
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
                  const newModeWillBeCalcDistance = !currentModeIsCalcDistance;

                  let newValue = prevForm.value;
                  const materialIsNone =
                    Object.keys(combinedMaterialMap).find(
                      (key) => combinedMaterialMap[key] === prevForm.material,
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
                !isValueEditable && styles.inputDisabled,
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
              editable={isValueEditable}
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
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <FlatList
                  data={modal.options}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => handleSelect(modal.field, item)}
                      style={styles.modalItem}
                    >
                      <Text style={styles.modalItemText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
                <Pressable onPress={closeModal} style={styles.modalCloseButton}>
                  <Text style={styles.modalCloseButtonText}>
                    {t("radiographyCalculator.buttons.close")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Modal>

          {/* Confirmation Modal for Add/Replace Material */}
          <Modal
            visible={confirmModalVisible}
            transparent
            animationType="slide"
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.confirmModalTitle}>
                  {confirmModalConfig.title}
                </Text>
                <Text style={styles.confirmModalMessage}>
                  {confirmModalConfig.message}
                </Text>
                <View style={styles.confirmModalButtons}>
                  {confirmModalConfig.showCancel && (
                    <Pressable
                      style={[
                        styles.confirmModalButton,
                        styles.confirmModalCancelButton,
                      ]}
                      onPress={() => setConfirmModalVisible(false)}
                    >
                      <Text style={styles.confirmModalButtonText}>
                        {t("radiographyCalculator.buttons.cancel")}
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={[
                      styles.confirmModalButton,
                      styles.confirmModalActionButton,
                    ]}
                    onPress={() => {
                      confirmModalConfig.onConfirm();
                      setConfirmModalVisible(false);
                    }}
                  >
                    <Text style={styles.confirmModalButtonText}>
                      {t("radiographyCalculator.buttons.confirm")}
                    </Text>
                  </Pressable>
                </View>
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
  inputDisabled: {
    backgroundColor: "#e0e0e0", // Gray out disabled inputs
    color: "#757575",
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 20,
    width: "85%",
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalItemText: {
    fontSize: 18,
    color: "#333",
    textAlign: "center",
  },
  modalCloseButton: {
    marginTop: 15,
    backgroundColor: "#FF9300",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalCloseButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  confirmModalMessage: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  confirmModalButtons: {
    flexDirection: "row",
    justifyContent: "space-around", // Or 'flex-end' and add margin to buttons
  },
  confirmModalButton: {
    flex: 1, // Make buttons take equal width if space allows
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5, // Space between buttons
  },
  confirmModalCancelButton: {
    backgroundColor: "#AAA", // Grey for cancel
  },
  confirmModalActionButton: {
    backgroundColor: "#007AFF", // Blue for confirm/action
  },
  confirmModalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
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
    marginTop: 25, // Added a little top margin
  },
  descriptionText: {
    fontSize: 13.5,
    color: "#424242", // Slightly darker gray
    fontStyle: "italic",
    lineHeight: 18, // Improved readability
  },
  addMaterialButtonContainer: {
    width: "93%", // Para que se alinee con el resto de los campos del formulario
    flexDirection: "row",
    justifyContent: "flex-end", // Esto empujará el botón a la derecha
    marginTop: 0, // O un valor pequeño si los inputs de atenuación ya tienen marginBottom
    marginBottom: 20, // Espacio después del botón
  },

  // Estilo para el botón "+" (ajustado)
  addMaterialButton: {
    // marginLeft: 10, // Ya no es necesario porque está en su propio contenedor alineado
    backgroundColor: "#4CAF50", // Verde
    paddingHorizontal: 15, // Un poco más de padding para un mejor tacto
    paddingVertical: 10,
    borderRadius: 25, // Más redondeado, tipo píldora o círculo si es cuadrado
    justifyContent: "center",
    alignItems: "center",
    minWidth: 50, // Ancho mínimo
    height: 50, // Altura fija para hacerlo más parecido a un botón de acción
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  addMaterialButtonText: {
    color: "white",
    fontSize: 24, // Un "+" más grande
    fontWeight: "bold",
    lineHeight: 28, // Ajustar para centrado vertical si es necesario
  },
  attenuationUnitText: {
    // Estilo para el texto "μ (Ir)" o "μ (Se)"
    fontSize: 18, // Mismo tamaño que el valor del input
    color: "grey", // Un color un poco más tenue para la unidad
    marginLeft: 8, // Espacio entre el valor numérico y la unidad
  },
  deleteActionButton: {
    backgroundColor: "#DC3545", // Simplemente cambia el color de fondo
  },
};
