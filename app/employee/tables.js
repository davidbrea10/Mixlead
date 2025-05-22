// Archivo: employee/tables.js

import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useState, useMemo, useCallback } from "react";
import { collectionGroup, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import Toast from "react-native-toast-message";

const { width } = Dimensions.get("window");

const isTablet = width >= 700;

// --- Constantes ---
const GAMMA_FACTOR = { "192Ir": 0.13, "75Se": 0.054 };
const COLLIMATOR_EFFECT = {
  Yes: { "192Ir": 3, "75Se": 12.5 },
  No: { "192Ir": 0, "75Se": 0 },
};
const DISTANCES_M_FOR_DOSE_RATE_TABLE = [
  1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 40, 50, 100,
];
const SHIELDING_LAYERS_N = [0, 1, 2, 3, 4, 6, 8, 10];
const THICKNESS_PER_LAYER_M = 0.01;

// Nuevas constantes para la tabla de distancias (basadas en la imagen image_48af0c.png)
const TARGET_DOSE_RATES_uSv_h = [
  1000, 500, 250, 100, 50, 25, 20, 15, 10, 5, 1, 0.12, 0.01,
];

export default function Tables() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [currentView, setCurrentView] = useState("doseRate"); // 'doseRate' o 'distance'

  const collimatorMapForY = useMemo(
    () => ({
      [t("radiographyCalculator.options.collimator.Yes")]: "Yes",
      [t("radiographyCalculator.options.collimator.No")]: "No",
      Sí: "Yes",
      No: "No",
    }),
    [t],
  );

  // Memo para los parámetros base del cálculo
  const baseCalcParams = useMemo(() => {
    if (
      !params.isotope ||
      !params.activityCi ||
      !params.collimatorDisplayName ||
      !params.muUsedInCalculation
    ) {
      return null;
    }
    try {
      const activity_GBq =
        parseFloat(String(params.activityCi).replace(",", ".")) * 37;
      const G = GAMMA_FACTOR[params.isotope];
      const collimatorKey =
        collimatorMapForY[params.collimatorDisplayName] || "No";
      const Y = COLLIMATOR_EFFECT[collimatorKey]?.[params.isotope] ?? 0;
      const mu_cm_inv = parseFloat(
        String(params.muUsedInCalculation).replace(",", "."),
      );
      const mu_m_inv = mu_cm_inv * 100;

      if (
        isNaN(activity_GBq) ||
        G === undefined ||
        isNaN(Y) ||
        isNaN(mu_m_inv)
      ) {
        console.error("Error en parsing de parámetros base:", {
          activity_GBq,
          G,
          Y,
          mu_m_inv,
        });
        return null;
      }
      return {
        activity_GBq,
        G,
        Y,
        mu_m_inv,
        mu_m_inv_display: mu_m_inv.toFixed(1),
      };
    } catch (error) {
      console.error("Error procesando parámetros base:", error);
      return null;
    }
  }, [params, t, collimatorMapForY]);

  // --- Datos para la Tabla de Tasa de Dosis ---
  const doseRateTableData = useMemo(() => {
    if (!baseCalcParams) return null;
    const { activity_GBq, G, Y, mu_m_inv } = baseCalcParams;

    const S_eff_numerator = activity_GBq * G;
    const denominator_2_pow_Y = Math.pow(2, Y);

    return DISTANCES_M_FOR_DOSE_RATE_TABLE.map((distance_m) => {
      const doseRates = SHIELDING_LAYERS_N.map((num_layers) => {
        const total_shield_thickness_m = num_layers * THICKNESS_PER_LAYER_M;
        const dr_unshielded_at_d =
          S_eff_numerator / (Math.pow(distance_m, 2) * denominator_2_pow_Y);
        const attenuation_factor = Math.exp(
          -mu_m_inv * total_shield_thickness_m,
        );
        const doseRate = dr_unshielded_at_d * attenuation_factor;
        return doseRate.toFixed(2);
      });
      return { rowTitle: distance_m, values: doseRates }; // 'rowTitle' para generalizar
    });
  }, [baseCalcParams]);

  // --- Datos para la Tabla de Distancias ---
  const distanceTableData = useMemo(() => {
    if (!baseCalcParams) return null;
    const { activity_GBq, G, Y, mu_m_inv } = baseCalcParams;

    const S_eff_numerator = activity_GBq * G;
    const denominator_2_pow_Y = Math.pow(2, Y);

    return TARGET_DOSE_RATES_uSv_h.map((target_dose_rate_uSv_h) => {
      if (target_dose_rate_uSv_h <= 0) {
        // Evitar división por cero o log de no positivos
        return {
          rowTitle: target_dose_rate_uSv_h,
          values: SHIELDING_LAYERS_N.map(() => "N/A"),
        };
      }
      const distances_m = SHIELDING_LAYERS_N.map((num_layers) => {
        const total_shield_thickness_m = num_layers * THICKNESS_PER_LAYER_M;
        const term_A_Gamma_exp =
          S_eff_numerator * Math.exp(-mu_m_inv * total_shield_thickness_m);
        const term_T_2Y = target_dose_rate_uSv_h * denominator_2_pow_Y;

        if (term_T_2Y <= 0 || term_A_Gamma_exp < 0) return "Error"; // o Inf, N/A

        const distance_sq = term_A_Gamma_exp / term_T_2Y;
        if (distance_sq < 0) return "-"; // No es posible físicamente

        const distance = Math.sqrt(distance_sq);
        return distance.toFixed(2);
      });
      return { rowTitle: target_dose_rate_uSv_h, values: distances_m };
    });
  }, [baseCalcParams]);

  // Inside your Tables component:

  const _fetchActiveUserData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      console.log("No user authenticated for _fetchActiveUserData.");
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle", { defaultValue: "Error" }),
        text2: t("errors.userNotLoggedIn", {
          defaultValue: "User not logged in.",
        }),
        position: "bottom",
      });
      return null;
    }

    try {
      const employeesQueryRef = collectionGroup(db, "employees");
      // Assuming user's role and companyId are stored in a document
      // accessible via their email in an 'employees' collection group.
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
            `User (email: ${user.email}) document is missing companyId.`,
          );
        }

        // Assuming the role is stored under a field named 'role' in the user's document
        if (userData.role) {
          result.role = userData.role;
        } else {
          console.warn(`User (email: ${user.email}) document is missing role.`);
        }

        if (!result.companyId && !result.role) {
          console.warn(
            `User (email: ${user.email}) document is missing both companyId and role.`,
          );
        }
        return result; // Returns { companyId: '...', role: '...' } or with nulls
      } else {
        console.warn(
          `Could not find employee document for email ${user.email}.`,
        );
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle", { defaultValue: "Error" }),
          text2: t("errors.userDataNotFound", {
            defaultValue: "User data not found.",
          }), // Ensure this translation key exists
          position: "bottom",
        });
        return null;
      }
    } catch (error) {
      console.error("Error fetching active user data:", error);
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle", { defaultValue: "Error" }),
        text2: t("errors.fetchActiveUserDataError", {
          defaultValue: "Failed to fetch user data.",
        }), // Ensure this translation key exists
        position: "bottom",
      });
      return null;
    }
  }, [t]); // auth and db are stable module imports. t is from useTranslation.

  // Inside your Tables component:

  const handleHome = useCallback(async () => {
    const activeUserData = await _fetchActiveUserData(); // Fetch user data including role

    if (activeUserData && activeUserData.role) {
      const userRole = activeUserData.role.toLowerCase(); // Normalize role
      if (userRole === "coordinator") {
        router.replace("/coordinator/home");
      } else if (userRole === "employee") {
        router.replace("/employee/home");
      } else {
        // Fallback for unknown roles
        console.warn(
          `Unknown user role: '${activeUserData.role}'. Defaulting to employee home.`,
        );
        Toast.show({
          type: "warning",
          text1: t("warnings.roleUnknownTitle", {
            defaultValue: "Unknown Role",
          }),
          text2: t("warnings.defaultEmployeeNavigationUnknownRole", {
            defaultValue: `Role '${activeUserData.role}' is not recognized. Navigating to default home.`,
          }), // Ensure this translation key exists
          position: "bottom",
        });
        router.replace("/employee/home");
      }
    } else {
      // Fallback if role couldn't be determined
      console.warn(
        "Could not determine user role or user data incomplete. Defaulting to employee home.",
      );
      if (!auth.currentUser) {
        // _fetchActiveUserData would have shown a toast.
      } else if (!activeUserData) {
        // _fetchActiveUserData might have shown a toast.
      } else {
        Toast.show({
          type: "error",
          text1: t("errors.roleFetchErrorTitle", {
            defaultValue: "Role Error",
          }),
          text2: t("errors.defaultEmployeeNavigationRoleError", {
            defaultValue:
              "Failed to determine role. Navigating to default home.",
          }), // Ensure this translation key exists
          position: "bottom",
        });
      }
      router.replace("/employee/home"); // Default navigation
    }
  }, [_fetchActiveUserData, router, t]); // Dependencies

  // --- Funciones de Renderizado de Cabeceras y Filas ---
  const renderDoseRateTableHeader = () => (
    <View>
      {/* Primera fila visual de la cabecera */}
      <View style={styles.tableRow}>
        <Text // Celda placeholder para la columna de etiquetas de fila
          style={[
            styles.tableHeaderCell,
            styles.tableDistanceCell, // Ancho y fondo específicos para esta columna
            // Si SHIELDING_LAYERS_N está vacío, esta es la última celda de la fila
            SHIELDING_LAYERS_N.length === 0 && styles.lastHeaderCell,
          ]}
        />
        {/* Renderizar la etiqueta "Capas de 10 mm" solo si hay capas */}
        {SHIELDING_LAYERS_N.length > 0 && (
          <Text // Etiqueta única que abarca las columnas de capas
            style={[
              styles.tableHeaderCell, // Estilo base de celda de cabecera (texto, padding vertical, fondo por defecto)
              { flex: 1, textAlign: "center" }, // Ocupa el espacio restante y centra el texto
              styles.lastHeaderCell, // Elimina el borde derecho
            ]}
          >
            {t("tables.x_axis_layer_description_short")}
          </Text>
        )}
      </View>
      {/* Segunda fila visual de la cabecera: Etiquetas de eje Y y valores numéricos de eje X */}
      <View style={[styles.tableRow, styles.firstHeaderRow]}>
        <Text
          style={[
            styles.tableHeaderCell,
            styles.tableDistanceCell,
            SHIELDING_LAYERS_N.length === 0 && styles.lastHeaderCell,
          ]}
        >
          {t("tables.y_axis_distance_m")}
        </Text>
        {SHIELDING_LAYERS_N.map((num_layers, index) => (
          <Text
            key={`header-num-${num_layers}`}
            style={[
              styles.tableHeaderCell,
              styles.layerNumHeaderCell,
              index === SHIELDING_LAYERS_N.length - 1 && styles.lastHeaderCell,
            ]}
          >
            {`${num_layers}`}
          </Text>
        ))}
      </View>
    </View>
  );

  const renderDistanceTableHeader = () => (
    <View>
      {/* Primera fila visual de la cabecera */}
      <View style={styles.tableRow}>
        <Text // Celda placeholder para la columna de etiquetas de fila
          style={[
            styles.tableHeaderCell,
            styles.tableRateCell, // Ancho y fondo específicos para esta columna
            // Si SHIELDING_LAYERS_N está vacío, esta es la última celda de la fila
            SHIELDING_LAYERS_N.length === 0 && styles.lastHeaderCell,
          ]}
        />
        {/* Renderizar la etiqueta "Capas de 10 mm" solo si hay capas */}
        {SHIELDING_LAYERS_N.length > 0 && (
          <Text // Etiqueta única que abarca las columnas de capas
            style={[
              styles.tableHeaderCell, // Estilo base de celda de cabecera (texto, padding vertical, fondo por defecto)
              { flex: 1, textAlign: "center" }, // Ocupa el espacio restante y centra el texto
              styles.lastHeaderCell, // Elimina el borde derecho
            ]}
          >
            {t("tables.x_axis_layer_description_short")}
          </Text>
        )}
      </View>
      {/* Segunda fila visual de la cabecera: Etiquetas de eje Y y valores numéricos de eje X */}
      <View style={[styles.tableRow, styles.firstHeaderRow]}>
        <Text
          style={[
            styles.tableHeaderCell,
            styles.tableRateCell,
            SHIELDING_LAYERS_N.length === 0 && styles.lastHeaderCell,
          ]}
        >
          {t("tables.y_axis_target_dose_rate")}{" "}
        </Text>
        {SHIELDING_LAYERS_N.map((num_layers, index) => (
          <Text
            key={`header-num-dist-${num_layers}`}
            style={[
              styles.tableHeaderCell,
              styles.layerNumHeaderCell,
              index === SHIELDING_LAYERS_N.length - 1 && styles.lastHeaderCell,
            ]}
          >
            {`${num_layers}`}
          </Text>
        ))}
      </View>
    </View>
  );

  const renderTableRow = (rowData, rowIndex, isDistanceTable = false) => (
    <View
      key={`row-${rowIndex}`}
      style={[
        styles.tableRow,
        rowIndex % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
      ]}
    >
      <Text
        style={[
          styles.tableCell,
          isDistanceTable ? styles.tableRateCell : styles.tableDistanceCell, // Aplica el fondo y minWidth correctos a la primera celda de datos
          rowData.values.length === 0 && styles.lastDataCell, // Si no hay valores, es la última celda
        ]}
      >
        {rowData.rowTitle}
      </Text>
      {rowData.values.map((value, cellIndex) => (
        <Text
          key={`cell-${rowIndex}-${cellIndex}`}
          style={[
            styles.tableCell, // Estilo base para celdas de datos
            cellIndex === rowData.values.length - 1 && styles.lastDataCell, // Si es la última celda de datos
          ]}
        >
          {value}
        </Text>
      ))}
    </View>
  );

  if (!baseCalcParams) {
    return (
      <LinearGradient
        colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
        style={{ flex: 1 }}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>
            {t(
              "tables.loadingErrorParams",
              "Error cargando parámetros para la tabla.",
            )}
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Image
              source={require("../../assets/go-back.png")}
              style={styles.icon}
            />
          </Pressable>
          <Text style={styles.title}>
            {t("tables.header.titleTables", "Tablas de Cálculo")}
          </Text>
          <Pressable onPress={handleHome}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.icon}
            />
          </Pressable>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {t("tables.isotope", "Isótopo")}:
            </Text>
            <Text style={styles.summaryValue}>{params.isotope}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {t("tables.activity", "Actividad")}:
            </Text>
            <Text style={styles.summaryValue}>{params.activityCi} Ci</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {t("tables.material", "Material")}:
            </Text>
            <Text style={styles.summaryValue}>
              {params.materialDisplayName}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {t("tables.collimator", "Colimador")}:
            </Text>
            <Text style={styles.summaryValue}>
              {params.collimatorDisplayName}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              µ ({t("tables.used_mu_unit_m_inv", "m⁻¹")}):
            </Text>
            <Text style={styles.summaryValue}>
              {baseCalcParams.mu_m_inv_display}
            </Text>
          </View>
        </View>

        {/* Botones de cambio de tabla */}
        <View style={styles.toggleButtonContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              currentView === "doseRate" && styles.toggleButtonActive,
            ]}
            onPress={() => setCurrentView("doseRate")}
          >
            <Text
              style={[
                styles.toggleButtonText,
                currentView === "doseRate" && styles.toggleButtonTextActive,
              ]}
            >
              {t("tables.doseRateView", "Ver Tasa Dosis")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              currentView === "distance" && styles.toggleButtonActive,
            ]}
            onPress={() => setCurrentView("distance")}
          >
            <Text
              style={[
                styles.toggleButtonText,
                currentView === "distance" && styles.toggleButtonTextActive,
              ]}
            >
              {t("tables.distanceView", "Ver Distancias")}
            </Text>
          </TouchableOpacity>
        </View>

        {currentView === "doseRate" && !doseRateTableData && (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>
              {t(
                "tables.errorGeneratingDR",
                "Error generando tabla de Tasa de Dosis.",
              )}
            </Text>
          </View>
        )}
        {currentView === "distance" && !distanceTableData && (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>
              {t(
                "tables.errorGeneratingDist",
                "Error generando tabla de Distancias.",
              )}
            </Text>
          </View>
        )}

        {currentView === "doseRate" && doseRateTableData && (
          <>
            <Text style={styles.tableMainTitle}>
              {t("tables.main_title_dose_rate")}
            </Text>
            <ScrollView
              horizontal
              contentContainerStyle={styles.tableOuterContainer}
            >
              <ScrollView
                vertical
                contentContainerStyle={styles.tableInnerContainer}
              >
                {renderDoseRateTableHeader()}
                {doseRateTableData.map((rowData, index) =>
                  renderTableRow(rowData, index, false),
                )}
              </ScrollView>
            </ScrollView>
          </>
        )}

        {currentView === "distance" && distanceTableData && (
          <>
            <Text style={styles.tableMainTitle}>
              {t("tables.main_title_distance")}
            </Text>
            <ScrollView
              horizontal
              contentContainerStyle={styles.tableOuterContainer}
            >
              <ScrollView
                vertical
                contentContainerStyle={styles.tableInnerContainer}
              >
                {renderDistanceTableHeader()}
                {distanceTableData.map((rowData, index) =>
                  renderTableRow(rowData, index, true),
                )}
              </ScrollView>
            </ScrollView>
          </>
        )}

        <View style={styles.footer}></View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // ... (Estilos de header, icon, title, summary* que ya tenías y fueron mejorados) ...
  header: {
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
    paddingTop: Platform.select({
      ios: 60,
      android: 40,
    }),
  },
  icon: { width: isTablet ? 70 : 50, height: isTablet ? 70 : 50 },
  title: {
    fontSize: isTablet ? 32 : 24,
    fontWeight: "bold",
    color: "white",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
    letterSpacing: 2,
    textShadowColor: "black",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  summaryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    marginHorizontal: 12,
    marginTop: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 15,
    color: "#005A85",
    fontWeight: "600",
    marginRight: 8,
  },
  summaryValue: {
    fontSize: 15,
    color: "#333",
    flexShrink: 1,
    textAlign: "right",
  },
  toggleButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 15,
    marginHorizontal: 12,
    backgroundColor: "rgba(0, 92, 146, 0.1)",
    borderRadius: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: "#006892",
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#006892",
  },
  toggleButtonTextActive: {
    color: "white",
  },
  tableMainTitle: {
    fontSize: isTablet ? 20 : 17,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: isTablet ? 20 : 15,
    marginHorizontal: isTablet ? 20 : 10,
    color: "#333",
  },
  tableOuterContainer: {
    marginTop: 0,
    marginBottom: 20,
    borderColor: "#C8D1DC",
    borderWidth: 1,
    borderRadius: isTablet ? 12 : 8,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  tableInnerContainer: {
    // sin cambios
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#D8E0E8",
  },
  firstHeaderRow: {
    borderBottomWidth: isTablet ? 1.5 : 1,
    borderBottomColor: "#B0BCCD",
  },
  tableHeaderCell: {
    paddingVertical: isTablet ? 14 : 10,
    paddingHorizontal: isTablet ? 10 : 5,
    fontWeight: "bold",
    fontSize: isTablet ? 15 : 12,
    textAlign: "center",
    minWidth: isTablet ? 90 : 65, // Ancho base para columnas de números de capa
    borderRightWidth: 1,
    borderRightColor: "#D8E0E8",
    backgroundColor: "#F0F5FA", // Fondo por defecto para celdas de cabecera
    color: "#1C3D5D",
  },
  tableDistanceCell: {
    // Para la primera celda de cabecera (Distancia) y datos de la primera columna
    minWidth: isTablet ? 140 : 100, // Se mantiene este valor para la tabla de Tasa de Dosis
    backgroundColor: "#E4EBF3", // Fondo distintivo para la primera columna
    // Hereda otras propiedades de tableHeaderCell o tableCell
  },
  tableRateCell: {
    // Para la primera celda de cabecera (Tasa Objetivo) y datos de la primera columna
    minWidth: isTablet ? 180 : 140, // <<--- VALOR AUMENTADO AQUÍ
    backgroundColor: "#E4EBF3", // Fondo distintivo para la primera columna
    // fontSize: isTablet ? 15 : 12, // Esta propiedad la hereda de tableHeaderCell para la cabecera
    // o de tableCell para las celdas de datos si no se especifica aquí.
    // Si estaba definida explícitamente, asegurarse que sea la deseada.
    // En tu código original era: fontSize: isTablet ? 15 : 12,
    // Hereda otras propiedades de tableHeaderCell o tableCell
  },
  layerNumHeaderCell: {
    // Hereda de tableHeaderCell, minWidth se aplica desde allí
  },
  unitHeaderCellPlaceholder: {
    backgroundColor: "#E4EBF3",
    borderRightColor: "#D8E0E8",
  },
  unitHeaderCell: {
    // Este estilo ya no se usa activamente para "Capas de 10 mm" en la cabecera,
    // pero se deja por si tiene otros usos o por limpieza futura.
  },
  tableRowEven: {
    backgroundColor: "#FFFFFF",
  },
  tableRowOdd: {
    backgroundColor: "#F7F9FC",
  },
  tableCell: {
    // Para celdas de datos generales
    paddingVertical: isTablet ? 12 : 9,
    paddingHorizontal: isTablet ? 10 : 5,
    fontSize: isTablet ? 14 : 12,
    textAlign: "right",
    minWidth: isTablet ? 90 : 65, // Ancho base para columnas de datos (igual que cabecera de números)
    borderRightWidth: 1,
    borderRightColor: "#E8EEF3",
    color: "#212529",
  },
  lastHeaderCell: {
    borderRightWidth: 0,
  },
  lastDataCell: {
    borderRightWidth: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
  },
  footer: {
    backgroundColor: "#006892",
    paddingVertical: 15,
    borderTopEndRadius: 40,
    minHeight: 50,
    alignItems: "stretch",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
});
