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
  Dimensions,
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
  collectionGroup,
  query,
  where,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const isTablet = width >= 700;

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

  const insets = useSafeAreaInsets();

  const [customMaterialsFromDB, setCustomMaterialsFromDB] = useState({});
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
    showCancel: true,
  });
  const [formulasModalVisible, setFormulasModalVisible] = useState(false);
  const openFormulasModal = () => setFormulasModalVisible(true);
  const closeFormulasModal = () => setFormulasModalVisible(false);

  const getCurrentEmployeeId = useCallback(() => {
    return auth.currentUser?.uid; // USA 'auth' importado
  }, []); // auth podría ser una dependencia si cambia, pero usualmente es estable

  // Inside your Calculation component

  const _fetchActiveUserData = useCallback(
    async (employeeId) => {
      if (!employeeId) {
        console.log("No employeeId provided to _fetchActiveUserData.");
        return null;
      }
      const user = auth.currentUser;
      if (!user || user.uid !== employeeId) {
        console.error(
          "User mismatch or not authenticated for fetching active user data.",
        );
        return null;
      }

      try {
        const employeesQueryRef = collectionGroup(db, "employees");
        // Assuming user's role and companyId are stored in a document
        // accessible via their email in an 'employees' collection group.
        // Adjust the query if your Firestore structure is different (e.g., querying by UID).
        const q = query(employeesQueryRef, where("email", "==", user.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDocSnap = querySnapshot.docs[0];
          const userData = userDocSnap.data();
          const result = { companyId: null, role: null };

          if (userData.companyId) {
            result.companyId = userData.companyId;
          } else {
            console.warn(
              `User ${employeeId} (email: ${user.email}) document is missing companyId.`,
            );
          }

          // Assuming the role is stored under a field named 'role' in the user's document
          if (userData.role) {
            result.role = userData.role;
          } else {
            console.warn(
              `User ${employeeId} (email: ${user.email}) document is missing role.`,
            );
          }

          if (!result.companyId && !result.role) {
            console.warn(
              `User ${employeeId} (email: ${user.email}) document is missing both companyId and role.`,
            );
          }
          return result;
        } else {
          console.warn(
            `Could not find employee document for email ${user.email} to retrieve active user data.`,
          );
          return null;
        }
      } catch (error) {
        console.error("Error fetching active user data:", error);
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("errors.fetchActiveUserDataError", {
            defaultValue: "Failed to fetch user data.",
          }), // Ensure this translation key exists or provide a default
          position: "bottom",
        });
        return null;
      }
    },
    [t],
  ); // Dependencies: t. db and auth are module imports.

  const fetchCustomMaterials = useCallback(async () => {
    const employeeId = getCurrentEmployeeId();
    if (!employeeId) {
      setCustomMaterialsFromDB({});
      return;
    }

    // Use the new _fetchActiveUserData function
    const activeUserData = await _fetchActiveUserData(employeeId);

    // Check if activeUserData and companyId are available
    if (!activeUserData || !activeUserData.companyId) {
      console.log(
        "Cannot fetch custom materials: companyId not found for employee:",
        employeeId,
      );
      setCustomMaterialsFromDB({});
      return;
    }
    const companyId = activeUserData.companyId; // Get companyId from the result

    try {
      const materialsColRef = collection(
        db,
        "companies",
        companyId,
        "employees",
        employeeId,
        "materials",
      );
      const materialSnapshot = await getDocs(materialsColRef);
      const fetchedMaterials = {};
      materialSnapshot.forEach((doc) => {
        fetchedMaterials[doc.id] = doc.data();
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
      setCustomMaterialsFromDB({});
    }
    // Add _fetchActiveUserData to the dependency array
  }, [t, getCurrentEmployeeId, _fetchActiveUserData]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      // USA 'auth' importado
      if (user) {
        fetchCustomMaterials();
      } else {
        setCustomMaterialsFromDB({});
      }
    });
    return () => unsubscribe();
  }, [fetchCustomMaterials]); // auth no suele cambiar, por lo que no es estrictamente necesario aquí si es estable

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
    const activeUserData = await _fetchActiveUserData(employeeId);
    if (!activeUserData || !activeUserData.companyId) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.companyDataMissing", {
          defaultValue: "User company data not found.",
        }), // New or existing translation
        position: "bottom",
      });
      return;
    }
    const companyId = activeUserData.companyId;

    if (!companyId) {
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
        db, // USA 'db' importado
        "companies",
        companyId,
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

    const activeUserData = await _fetchActiveUserData(employeeId);
    if (!activeUserData || !activeUserData.companyId) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.companyDataMissing", {
          defaultValue: "User company data not found.",
        }), // New or existing translation
        position: "bottom",
      });
      return;
    }
    const companyId = activeUserData.companyId;
    if (!companyId) {
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
        db, // USA 'db' importado
        "companies",
        companyId,
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
    const materialInternalKey = Object.keys(combinedMaterialMap).find(
      (key) => combinedMaterialMap[key] === form.material,
    );

    const calculationType =
      form.thicknessOrDistance ===
      t("radiographyCalculator.thicknessOrDistance")
        ? "distance" // User wants to calculate distance
        : "thickness"; // User wants to calculate thickness

    // --- Validations (largely kept from your existing logic) ---
    if (
      materialInternalKey === WITHOUT_MATERIAL_KEY &&
      calculationType === "thickness"
    ) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.materialNeededForThickness"),
        position: "bottom",
      });
      return;
    }

    const placeholderValues = [
      t("radiographyCalculator.modal.isotope"),
      t("radiographyCalculator.modal.collimator"),
      t("radiographyCalculator.modal.material"),
      t("radiographyCalculator.modal.limit"),
    ];
    if (
      !form.isotope ||
      placeholderValues.includes(form.isotope) ||
      !form.activity.trim() ||
      !form.limit ||
      placeholderValues.includes(form.limit) ||
      !form.material ||
      placeholderValues.includes(form.material) ||
      !form.collimator ||
      placeholderValues.includes(form.collimator)
    ) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.allFieldsRequired"),
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
    // Value (thickness/distance) validation
    // It's required unless calculating distance with "Sin Material"
    if (
      !(
        materialInternalKey === WITHOUT_MATERIAL_KEY &&
        calculationType === "distance"
      ) &&
      !form.value.trim()
    ) {
      Toast.show({
        type: "error",
        text1: t("radiographyCalculator.alerts.errorTitle"),
        text2: t("radiographyCalculator.alerts.valueRequired", {
          fieldName:
            calculationType === "distance"
              ? t("radiographyCalculator.labels.thickness") // Inputting thickness
              : t("radiographyCalculator.labels.distance"), // Inputting distance
        }),
        position: "bottom",
      });
      return;
    }

    // --- Parse Base Parameters ---
    const activityString = form.activity.replace(/,/g, ".");
    const A_Ci = parseFloat(activityString);
    if (isNaN(A_Ci) || A_Ci <= 0) {
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("radiographyCalculator.alerts.invalidActivity", {
          defaultValue: "Invalid activity value.",
        }),
        position: "bottom",
      });
      return;
    }
    const A_GBq = A_Ci * 37; // Convert Ci to GBq

    const Gamma = GAMMA_FACTOR[form.isotope];

    const collimatorKey = Object.keys(collimatorMap).find(
      (key) => collimatorMap[key] === form.collimator,
    );
    const Y_effect =
      collimatorKey === "Yes"
        ? COLLIMATOR_EFFECT.Yes[form.isotope]
        : COLLIMATOR_EFFECT.No || 0; // Assuming COLLIMATOR_EFFECT.No might be 0

    const T_mSv_h = form.limit === "11µSv/h" ? 0.011 : 0.0005; // Target dose rate in mSv/h

    if (Gamma === undefined || Y_effect === undefined) {
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("radiographyCalculator.alerts.invalidInputBase"),
        position: "bottom",
      });
      return;
    }

    // --- Parse Input Value (Thickness X or Distance d) ---
    let inputValueNumeric = 0;
    // Only parse if material is not "None" OR if it is "None" but we are calculating thickness (which is an invalid path caught earlier)
    // More directly: parse if form.value is supposed to have a value.
    if (
      !(
        materialInternalKey === WITHOUT_MATERIAL_KEY &&
        calculationType === "distance"
      )
    ) {
      const valueString = form.value.replace(/,/g, ".");
      inputValueNumeric = parseFloat(valueString);
      if (isNaN(inputValueNumeric) || inputValueNumeric < 0) {
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("radiographyCalculator.invalidInputMessage"),
          position: "bottom",
        });
        return;
      }
    }

    // --- Get Attenuation Coefficient (µ) ---
    let mu_cm_inv = 0; // Attenuation coefficient in cm^-1
    if (materialInternalKey !== WITHOUT_MATERIAL_KEY) {
      if (materialInternalKey === OTHER_MATERIAL_KEY) {
        const attString =
          form.isotope === "192Ir" ? form.attenuationIr : form.attenuationSe;
        mu_cm_inv = parseFloat(attString.replace(/,/g, ".")) || 0;
      } else if (customMaterialsFromDB[materialInternalKey]) {
        const customMatData = customMaterialsFromDB[materialInternalKey];
        const attValueStr =
          form.isotope === "192Ir"
            ? customMatData.attenuationIr
            : customMatData.attenuationSe;
        mu_cm_inv = parseFloat(String(attValueStr).replace(/,/g, ".")) || 0;
      } else {
        mu_cm_inv =
          ATTENUATION_COEFFICIENT[materialInternalKey]?.[form.isotope] || 0;
      }

      if (isNaN(mu_cm_inv) || mu_cm_inv < 0) {
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle"),
          text2: t("radiographyCalculator.alerts.invalidCoefficient", {
            defaultValue: "Invalid attenuation coefficient.",
          }),
          position: "bottom",
        });
        return;
      }
    }
    const mu_m_inv = mu_cm_inv * 100; // Convert µ from cm^-1 to m^-1

    // --- Perform Calculation ---
    let finalCalculatedValue; // Will be distance in meters or thickness in mm
    let calculatedDistance_m; // Primary calculated distance
    let calculatedThickness_mm; // Primary calculated thickness

    // Helper function to calculate distance (d) for given parameters
    const calculateDistanceInternal = (
      targetRate_mSv_h,
      thickness_m,
      current_mu_m_inv,
    ) => {
      const numerator =
        Gamma * A_GBq * 1000 * Math.exp(-current_mu_m_inv * thickness_m);
      const denominator = targetRate_mSv_h * Math.pow(2, Y_effect);
      if (denominator === 0) return NaN;
      const d_sq = numerator / denominator;
      return d_sq >= 0 ? Math.sqrt(d_sq) : NaN;
    };

    // Helper function to calculate unshielded distance (d0)
    const calculateUnshieldedDistanceInternal = (targetRate_mSv_h) => {
      return calculateDistanceInternal(targetRate_mSv_h, 0, 0);
    };

    if (calculationType === "distance") {
      const X_input_mm =
        materialInternalKey === WITHOUT_MATERIAL_KEY ? 0 : inputValueNumeric;
      const X_m = X_input_mm / 1000.0; // Convert thickness from mm to m
      const effective_mu_m_inv =
        materialInternalKey === WITHOUT_MATERIAL_KEY ? 0 : mu_m_inv;

      calculatedDistance_m = calculateDistanceInternal(
        T_mSv_h,
        X_m,
        effective_mu_m_inv,
      );
      finalCalculatedValue = calculatedDistance_m; // Result is in meters
    } else {
      // calculationType === "thickness"
      const d_input_m = inputValueNumeric; // Distance is input in meters

      if (mu_m_inv <= 0) {
        // Material like "Sin Material" or µ=0 defined
        // Calculate unshielded dose rate at d_input_m
        const T0_at_d_input =
          (Gamma * A_GBq * 1000) /
          (Math.pow(d_input_m, 2) * Math.pow(2, Y_effect));
        if (T0_at_d_input <= T_mSv_h) {
          calculatedThickness_mm = 0.0; // No shielding needed
        } else {
          calculatedThickness_mm = Infinity; // Cannot achieve target with µ=0 if T0 > T
        }
      } else {
        const term_in_ln_numerator = Gamma * A_GBq * 1000;
        const term_in_ln_denominator =
          T_mSv_h * Math.pow(d_input_m, 2) * Math.pow(2, Y_effect);

        if (term_in_ln_denominator === 0) {
          calculatedThickness_mm = Infinity; // Avoid division by zero
        } else {
          const term_in_ln = term_in_ln_numerator / term_in_ln_denominator;
          if (term_in_ln <= 1) {
            // Unshielded dose at d_input_m is already <= T_mSv_h
            calculatedThickness_mm = 0.0;
          } else {
            const X_m = Math.log(term_in_ln) / mu_m_inv;
            calculatedThickness_mm = X_m * 1000.0; // Convert thickness to mm
          }
        }
      }
      finalCalculatedValue = calculatedThickness_mm; // Result is in mm
    }

    // --- Calculate Zone Distances ---
    // If calculating distance, zone distances are with the given shielding.
    // If calculating thickness, zone distances are unshielded (D0 for those limits).
    let finalDistanceForControlled,
      finalDistanceForLimited,
      finalDistanceForProhibited;

    if (calculationType === "distance") {
      const X_m =
        (materialInternalKey === WITHOUT_MATERIAL_KEY ? 0 : inputValueNumeric) /
        1000.0;
      const effective_mu_m_inv =
        materialInternalKey === WITHOUT_MATERIAL_KEY ? 0 : mu_m_inv;
      finalDistanceForControlled = calculateDistanceInternal(
        0.0005,
        X_m,
        effective_mu_m_inv,
      );
      finalDistanceForLimited = calculateDistanceInternal(
        0.011,
        X_m,
        effective_mu_m_inv,
      );
      finalDistanceForProhibited = calculateDistanceInternal(
        0.25,
        X_m,
        effective_mu_m_inv,
      );
    } else {
      // calculationType === "thickness"
      finalDistanceForControlled = calculateUnshieldedDistanceInternal(0.0005);
      finalDistanceForLimited = calculateUnshieldedDistanceInternal(0.011);
      finalDistanceForProhibited = calculateUnshieldedDistanceInternal(0.25);
    }

    // --- Validate Final Calculated Value ---
    if (
      isNaN(finalCalculatedValue) ||
      !isFinite(finalCalculatedValue) ||
      finalCalculatedValue < 0
    ) {
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("radiographyCalculator.alerts.calculationError"),
        position: "bottom",
      });
      return;
    }
    // Also validate zone distances if they are essential for proceeding
    if (
      isNaN(finalDistanceForControlled) ||
      isNaN(finalDistanceForLimited) ||
      isNaN(finalDistanceForProhibited)
    ) {
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("radiographyCalculator.alerts.zoneCalculationError", {
          defaultValue: "Error calculating zone distances.",
        }),
        position: "bottom",
      });
      return;
    }

    // --- Prepare Parameters for Summary Screen ---
    let materialNameForSummary = form.material;
    if (materialInternalKey === OTHER_MATERIAL_KEY) {
      materialNameForSummary =
        form.otherMaterialName.trim() ||
        t("radiographyCalculator.options.materials.Other");
    } else if (customMaterialsFromDB[materialInternalKey]) {
      materialNameForSummary = materialInternalKey;
    }

    const attCoefUsedDisplayCm =
      materialInternalKey === WITHOUT_MATERIAL_KEY || mu_cm_inv < 0
        ? "N/A"
        : mu_cm_inv.toFixed(3);

    // `formValueForSummary` is the original user input for thickness (mm) or distance (m)
    let formValueForSummary = form.value.replace(/,/g, ".");
    if (
      materialInternalKey === WITHOUT_MATERIAL_KEY &&
      calculationType === "distance"
    ) {
      formValueForSummary = t("radiographyCalculator.notApplicableShort", {
        defaultValue: "N/A",
      }); // If it was thickness input for "Sin Material"
    }

    // `distanceValueForSummaryNav` is always a distance in meters, relevant to the primary calculation context
    let distanceValueForSummaryNav;
    if (calculationType === "distance") {
      distanceValueForSummaryNav = finalCalculatedValue; // The calculated distance in meters
    } else {
      // calculationType === "thickness"
      distanceValueForSummaryNav = inputValueNumeric; // The input distance in meters
    }

    router.push({
      pathname: "employee/calculationSummary",
      params: {
        isotope: form.isotope,
        collimator: form.collimator, // Display name
        value: formValueForSummary, // User's original input value string for X or d
        activity: form.activity, // Original activity string
        material: materialNameForSummary, // Display name
        attenuationCoefficientUsed: attCoefUsedDisplayCm, // µ in cm^-1
        limit: form.limit, // Display name
        calculationType: calculationType, // "distance" or "thickness"
        result: finalCalculatedValue.toFixed(3), // Calculated distance (m) or thickness (mm)

        // This is the distance (m) to be prominently displayed or used in summary
        distanceValueForSummary: distanceValueForSummaryNav.toFixed(3),

        distanceForControlled: finalDistanceForControlled.toFixed(3),
        distanceForLimited: finalDistanceForLimited.toFixed(3),
        distanceForProhibited: finalDistanceForProhibited.toFixed(3),
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

  // Inside your Calculation component

  const handleHome = useCallback(async () => {
    const employeeId = getCurrentEmployeeId(); // This gets auth.currentUser.uid
    if (!employeeId) {
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle", { defaultValue: "Error" }),
        text2: t("errors.userNotLoggedIn", {
          defaultValue: "User not logged in.",
        }),
        position: "bottom",
      });
      router.replace("/login"); // Fallback to login or a generic home page
      return;
    }

    const userData = await _fetchActiveUserData(employeeId);

    if (userData && userData.role) {
      const userRole = userData.role.toLowerCase(); // Normalize role to lowercase for comparison
      if (userRole === "coordinator") {
        router.replace("/coordinator/home");
      } else if (userRole === "employee") {
        router.replace("/employee/home");
      } else {
        // Handle unknown roles, perhaps default to employee home or show an error
        console.warn(
          `Unknown user role: '${userData.role}'. Defaulting to employee home.`,
        );
        Toast.show({
          type: "warning",
          text1: t("warnings.roleUnknownTitle", {
            defaultValue: "Unknown Role",
          }),
          text2: t("warnings.defaultEmployeeNavigationUnknownRole", {
            defaultValue: `Role '${userData.role}' is not recognized. Navigating to default home.`,
          }),
          position: "bottom",
        });
        router.replace("/employee/home"); // Or a more generic fallback
      }
    } else {
      // Handle cases where userData or role is not found
      console.warn(
        "Could not determine user role or user data is incomplete. Defaulting to employee home.",
      );
      Toast.show({
        type: "error",
        text1: t("errors.roleFetchErrorTitle", { defaultValue: "Role Error" }),
        text2: t("errors.defaultEmployeeNavigationRoleError", {
          defaultValue:
            "Failed to determine user role. Navigating to default home.",
        }),
        position: "bottom",
      });
      router.replace("/employee/home"); // Fallback navigation
    }
  }, [getCurrentEmployeeId, _fetchActiveUserData, router, t]); // Dependencies for useCallback

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
            paddingTop: insets.top + 15,
          }}
        >
          <Pressable onPress={handleBack}>
            <Image
              source={require("../../assets/go-back.png")}
              style={{ width: isTablet ? 70 : 50, height: isTablet ? 70 : 50 }}
            />
          </Pressable>

          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                fontSize: isTablet ? 32 : 24,
                fontWeight: "bold",
                color: "white",
                textAlign: "center",
                marginHorizontal: 10,
                letterSpacing: 2,
                textShadowColor: "black",
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 1,
              }}
            >
              {t("radiographyCalculator.title")}
            </Text>
          </View>

          <Pressable onPress={handleHome}>
            <Image
              source={require("../../assets/icon.png")}
              style={{ width: isTablet ? 70 : 50, height: isTablet ? 70 : 50 }}
            />
          </Pressable>
        </View>

        <View style={{ flex: 1, position: "relative" }}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <Text
                style={[
                  styles.label,
                  {
                    fontSize: isTablet ? 20 : 18,
                    marginRight: isTablet ? 15 : 10,
                  },
                ]}
              >
                {t("radiographyCalculator.isotope")}
              </Text>
              <Pressable
                onPress={() => openModal("isotope", OPTIONS.isotopes)}
                style={[
                  styles.inputContainer,
                  {
                    height: isTablet ? 65 : 55,
                    paddingHorizontal: isTablet ? 15 : 10,
                    marginBottom: isTablet ? 35 : 30,
                  },
                ]}
              >
                <Text style={styles.input}>{form.isotope}</Text>
              </Pressable>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <Text
                style={[
                  styles.label,
                  {
                    fontSize: isTablet ? 20 : 18,
                    marginRight: isTablet ? 15 : 10,
                  },
                ]}
              >
                {t("radiographyCalculator.activity")}
              </Text>
              <TextInput
                style={[
                  styles.inputContainer,
                  {
                    height: isTablet ? 65 : 55,
                    paddingHorizontal: isTablet ? 15 : 10,
                    marginBottom: isTablet ? 35 : 30,
                  },
                  styles.input,
                ]}
                placeholder={t("radiographyCalculator.valueCi")}
                placeholderTextColor={"gray"}
                keyboardType="numeric"
                value={form.activity}
                onChangeText={(text) => setForm({ ...form, activity: text })}
              />
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <Text
                style={[
                  styles.label,
                  {
                    fontSize: isTablet ? 20 : 18,
                    marginRight: isTablet ? 15 : 10,
                  },
                ]}
              >
                {t("radiographyCalculator.collimator")}
              </Text>
              <Pressable
                onPress={() => openModal("collimator", OPTIONS.collimator)}
                style={[
                  styles.inputContainer,
                  {
                    height: isTablet ? 65 : 55,
                    paddingHorizontal: isTablet ? 15 : 10,
                    marginBottom: isTablet ? 35 : 30,
                  },
                ]}
              >
                <Text style={styles.input}>{form.collimator}</Text>
              </Pressable>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <Text
                style={[
                  styles.label,
                  {
                    fontSize: isTablet ? 20 : 18,
                    marginRight: isTablet ? 15 : 10,
                  },
                ]}
              >
                {t("radiographyCalculator.tLimitFor")}
              </Text>
              <Pressable
                onPress={() => openModal("limit", OPTIONS.limits)}
                style={[
                  styles.inputContainer,
                  {
                    height: isTablet ? 65 : 55,
                    paddingHorizontal: isTablet ? 15 : 10,
                    marginBottom: isTablet ? 35 : 30,
                  },
                ]}
              >
                <Text style={styles.input}>{form.limit}</Text>
              </Pressable>
            </View>
            {/* Material Selection */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
              }}
            >
              <Text
                style={[
                  styles.label,
                  {
                    fontSize: isTablet ? 20 : 18,
                    marginRight: isTablet ? 15 : 10,
                  },
                ]}
              >
                {t("radiographyCalculator.material")}
              </Text>
              <Pressable
                onPress={() => openModal("material", OPTIONS.materials)}
                style={[
                  styles.inputContainer,
                  {
                    height: isTablet ? 65 : 55,
                    paddingHorizontal: isTablet ? 15 : 10,
                    marginBottom: isTablet ? 35 : 30,
                  },
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
                  <Text
                    style={[
                      styles.label,
                      {
                        fontSize: isTablet ? 20 : 18,
                        marginRight: isTablet ? 15 : 10,
                      },
                    ]}
                  >
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
                  <View
                    style={{ flex: 1, marginRight: 5, alignItems: "center" }}
                  >
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
                  <View
                    style={{ flex: 1, marginLeft: 5, alignItems: "center" }}
                  >
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
                    const newModeWillBeCalcDistance =
                      !currentModeIsCalcDistance;

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
                style={[
                  styles.switchButton,
                  {
                    height: isTablet ? 65 : 55,
                    paddingHorizontal: isTablet ? 15 : 10,
                    marginBottom: isTablet ? 35 : 30,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.label,
                    {
                      fontSize: isTablet ? 20 : 18,
                      marginRight: isTablet ? 15 : 10,
                    },
                  ]}
                >
                  {form.thicknessOrDistance}
                </Text>
              </Pressable>
              <TextInput
                style={[
                  styles.inputContainer,
                  {
                    height: isTablet ? 65 : 55,
                    paddingHorizontal: isTablet ? 15 : 10,
                    marginBottom: isTablet ? 35 : 30,
                  },
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

            <Pressable
              style={[
                styles.button,
                { height: isTablet ? 70 : 55, width: isTablet ? "85%" : "90%" },
              ]}
              onPress={calculateAndNavigate}
            >
              <Text
                style={{
                  color: "#FFF",
                  fontSize: isTablet ? 22 : 18,
                  fontWeight: "bold",
                }}
              >
                {form.thicknessOrDistance ===
                t("radiographyCalculator.thicknessOrDistance")
                  ? t("radiographyCalculator.calculateDistance")
                  : t("radiographyCalculator.calculateThickness")}
              </Text>
            </Pressable>

            {/* Modal para Mostrar Fórmulas */}
            <Modal
              visible={formulasModalVisible}
              transparent
              animationType="slide"
              onRequestClose={closeFormulasModal}
            >
              <View style={styles.modalOverlay}>
                <View
                  style={[styles.modalContent, styles.formulasModalContent]}
                >
                  <ScrollView>
                    <Text style={styles.formulasModalTitle}>
                      {t(
                        "radiographyCalculator.formulas.title",
                        "Fórmulas Utilizadas en los Cálculos",
                      )}
                    </Text>

                    {/* Fórmula de Tasa de Dosis (NUEVA SECCIÓN) */}
                    <Text style={styles.formulaSectionTitle}>
                      {t(
                        "radiographyCalculator.formulas.doseRateTitle", // Nueva traducción
                        "1. Cálculo de Tasa de Dosis (T):",
                      )}
                    </Text>
                    <Image
                      source={require("../../assets/formula-rate.png")} // <-- NECESITAS ESTA IMAGEN
                      style={styles.formulaImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.variableExplanationTitle}>
                      {t("radiographyCalculator.formulas.variables", "Donde:")}
                    </Text>
                    <Text style={styles.variableExplanation}>
                      • <Text style={styles.variableSymbol}>T</Text>:{" "}
                      {t(
                        "radiographyCalculator.formulas.T_desc_doseRate", // Nueva traducción
                        "Tasa de Dosis resultante (mSv/h).",
                      )}{" "}
                      {"\n"}• <Text style={styles.variableSymbol}>Γ</Text>{" "}
                      (Gamma): {t("radiographyCalculator.formulas.Gamma_desc")}{" "}
                      {"\n"}• <Text style={styles.variableSymbol}>A</Text>:{" "}
                      {t("radiographyCalculator.formulas.A_desc")} {"\n"}•{" "}
                      <Text style={styles.variableSymbol}>d</Text>:{" "}
                      {t(
                        // Reutilizamos d_desc pero podría ser específico si el contexto cambia mucho
                        "radiographyCalculator.formulas.d_desc_doseRate",
                        "Distancia desde la fuente (metros).",
                      )}{" "}
                      {"\n"}• <Text style={styles.variableSymbol}>1000</Text>:{" "}
                      {t("radiographyCalculator.formulas.factor1000_desc")}{" "}
                      {"\n"}• <Text style={styles.variableSymbol}>e</Text>:{" "}
                      {t("radiographyCalculator.formulas.e_desc")} {"\n"}•{" "}
                      <Text style={styles.variableSymbol}>μ</Text> (mu):{" "}
                      {t("radiographyCalculator.formulas.mu_desc")} {"\n"}•{" "}
                      <Text style={styles.variableSymbol}>X</Text>:{" "}
                      {t(
                        // Reutilizamos X_desc_distance pero podría ser específico
                        "radiographyCalculator.formulas.X_desc_doseRate",
                        "Espesor del blindaje (metros).",
                      )}{" "}
                      {"\n"}• <Text style={styles.variableSymbol}>Y</Text>:{" "}
                      {t("radiographyCalculator.formulas.Y_desc")}
                    </Text>

                    {/* Fórmula de Distancia (Ahora #2) */}
                    <Text style={styles.formulaSectionTitle}>
                      {t(
                        "radiographyCalculator.formulas.distanceTitle", // Actualizar el número en la traducción si es necesario
                        "2. Cálculo de Distancia (d):",
                      )}
                    </Text>
                    <Image
                      source={require("../../assets/formula-distance.png")}
                      style={styles.formulaImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.variableExplanationTitle}>
                      {t("radiographyCalculator.formulas.variables", "Donde:")}
                    </Text>
                    <Text style={styles.variableExplanation}>
                      • <Text style={styles.variableSymbol}>d</Text>:{" "}
                      {t("radiographyCalculator.formulas.d_desc")} {"\n"}•{" "}
                      <Text style={styles.variableSymbol}>Γ</Text> (Gamma):{" "}
                      {t("radiographyCalculator.formulas.Gamma_desc")} {"\n"}•{" "}
                      <Text style={styles.variableSymbol}>A</Text>:{" "}
                      {t("radiographyCalculator.formulas.A_desc")} {"\n"}•{" "}
                      <Text style={styles.variableSymbol}>1000</Text>:{" "}
                      {t("radiographyCalculator.formulas.factor1000_desc")}{" "}
                      {"\n"}• <Text style={styles.variableSymbol}>e</Text>:{" "}
                      {t("radiographyCalculator.formulas.e_desc")} {"\n"}•{" "}
                      <Text style={styles.variableSymbol}>μ</Text> (mu):{" "}
                      {t("radiographyCalculator.formulas.mu_desc")} {"\n"}•{" "}
                      <Text style={styles.variableSymbol}>X</Text>:{" "}
                      {t("radiographyCalculator.formulas.X_desc_distance")}{" "}
                      {"\n"}• <Text style={styles.variableSymbol}>T</Text>:{" "}
                      {t("radiographyCalculator.formulas.T_desc")} {"\n"}•{" "}
                      <Text style={styles.variableSymbol}>Y</Text>:{" "}
                      {t("radiographyCalculator.formulas.Y_desc")}
                    </Text>

                    {/* Fórmula de Espesor (Ahora #3) */}
                    <Text style={styles.formulaSectionTitle}>
                      {t(
                        "radiographyCalculator.formulas.thicknessTitle", // Actualizar el número en la traducción si es necesario
                        "3. Cálculo de Espesor (Xm):",
                      )}
                    </Text>
                    <Image
                      source={require("../../assets/formula-thickness.png")}
                      style={styles.formulaImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.variableExplanationTitle}>
                      {t("radiographyCalculator.formulas.variables", "Donde:")}
                    </Text>
                    <Text style={styles.variableExplanation}>
                      • <Text style={styles.variableSymbol}>Xm</Text>:{" "}
                      {t("radiographyCalculator.formulas.Xm_desc")} {"\n"}•{" "}
                      <Text style={styles.variableSymbol}>μ</Text> (mu):{" "}
                      {t("radiographyCalculator.formulas.mu_desc")} {"\n"}•{" "}
                      <Text style={styles.variableSymbol}>ln</Text>:{" "}
                      {t("radiographyCalculator.formulas.ln_desc")} {"\n"}•{" "}
                      <Text style={styles.variableSymbol}>
                        Γ, A, 1000, T, Y
                      </Text>
                      : {t("radiographyCalculator.formulas.sameAsAbove")} {"\n"}
                      • <Text style={styles.variableSymbol}>d</Text>:{" "}
                      {t("radiographyCalculator.formulas.d_desc_thickness")}
                    </Text>
                    <Text style={styles.noteText}>
                      {t(
                        "radiographyCalculator.formulas.noteUnits",
                        "Nota: Las unidades se convierten internamente para consistencia en los cálculos. (ej. Ci a GBq, cm⁻¹ a m⁻¹, mm a m).",
                      )}
                    </Text>
                  </ScrollView>
                  <Pressable
                    onPress={closeFormulasModal}
                    style={styles.modalCloseButton}
                  >
                    <Text style={styles.modalCloseButtonText}>
                      {t("radiographyCalculator.buttons.close", "Cerrar")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Modal>

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
                  <Pressable
                    onPress={closeModal}
                    style={styles.modalCloseButton}
                  >
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
          <TouchableOpacity
            style={styles.fixedTopRightHelpButton} // Un nuevo estilo para este botón
            onPress={() => setFormulasModalVisible(true)} // Asumo que este es el modal que quieres abrir
          >
            <Ionicons
              name="help-circle-outline"
              size={isTablet ? 30 : 28} // Puedes ajustar el tamaño
              color="#006892"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={{
          backgroundColor: "#006892",
          paddingTop: insets.bottom + 40,
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

  formulasModalContent: {
    // Para hacer el modal de fórmulas un poco más grande
    width: "90%",
    maxHeight: "85%",
  },
  formulasModalTitle: {
    fontSize: isTablet ? 22 : 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
  },
  formulaSectionTitle: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: "600", // Un poco menos que 'bold'
    color: "#005A85",
    marginTop: 15,
    marginBottom: 8,
  },
  formulaImage: {
    width: "100%",
    height: isTablet ? 80 : 60, // Ajusta según el tamaño de tus imágenes
    marginBottom: 10,
    alignSelf: "center",
  },
  variableExplanationTitle: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 5,
    marginBottom: 5,
  },
  variableExplanation: {
    fontSize: isTablet ? 15 : 13,
    color: "#454545",
    lineHeight: isTablet ? 22 : 18,
    marginBottom: 15,
  },
  variableSymbol: {
    fontWeight: "bold",
    fontStyle: "italic", // Para que se parezcan más a variables
  },
  noteText: {
    fontSize: isTablet ? 13 : 11,
    fontStyle: "italic",
    color: "#6c757d",
    marginTop: 10,
    textAlign: "center",
  },
  fixedTopRightHelpButton: {
    position: "absolute", // Clave para el posicionamiento flotante
    top: 15, // Distancia desde la parte superior del contenedor padre
    right: 15, // Distancia desde la parte derecha del contenedor padre
    backgroundColor: "rgba(255, 255, 255, 0.8)", // Fondo semi-transparente para legibilidad
    padding: 8,
    borderRadius: 50, // Para hacerlo circular
    zIndex: 10, // Para asegurar que esté por encima del contenido del ScrollView
    // Sombras (opcional pero recomendado para botones flotantes)
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // Para Android
  },
};
