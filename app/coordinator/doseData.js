import {
  View,
  Text,
  Pressable,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  StyleSheet, // <-- Import StyleSheet
  ActivityIndicator, // <-- Import ActivityIndicator (opcional, para mostrar mientras carga años)
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { db, auth } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useTranslation } from "react-i18next"; // Import i18n hook
import RNPickerSelect from "react-native-picker-select";

export default function Home() {
  const { t } = useTranslation(); // Initialize translation hook
  const router = useRouter();

  const [monthlyDoses, setMonthlyDoses] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null); // <-- Iniciar en null para usar placeholder
  const [availableYears, setAvailableYears] = useState([]); // Contiene los números de año
  const [totalAnnualDose, setTotalAnnualDose] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // <-- Añadir estado de carga

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.replace("/employee/home");
  };

  useEffect(() => {
    loadMonthlyDoses();
  }, []);

  useEffect(() => {
    if (selectedYear !== null) {
      // Calcular solo si hay un año seleccionado
      calculateTotalAnnualDose();
    } else {
      setTotalAnnualDose(0); // Resetear si no hay año seleccionado
    }
  }, [monthlyDoses, selectedYear]);

  const loadMonthlyDoses = async () => {
    setIsLoading(true); // Iniciar carga
    setMonthlyDoses([]);
    setAvailableYears([]);
    setSelectedYear(null); // Resetear selección

    const user = auth.currentUser;
    if (!user) {
      setIsLoading(false);
      // Alert.alert(t("errors.notLoggedIn")); // Opcional: Alerta si no está logueado
      return;
    }

    try {
      const dosesRef = collection(db, "employees", user.uid, "doses");
      const snapshot = await getDocs(dosesRef);

      let doseData = {};
      let yearsSet = new Set();
      let hasData = false; // Flag para ver si se encontró alguna dosis

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Validar que los datos necesarios existan y sean números
        const doseValue =
          typeof data.dose === "number"
            ? data.dose
            : parseFloat(data.dose || 0);
        const monthValue =
          typeof data.month === "number"
            ? data.month
            : parseInt(data.month, 10);
        const yearValue =
          typeof data.year === "number" ? data.year : parseInt(data.year, 10);

        if (
          !isNaN(doseValue) &&
          !isNaN(monthValue) &&
          !isNaN(yearValue) &&
          monthValue >= 1 &&
          monthValue <= 12
        ) {
          hasData = true; // Se encontró al menos una dosis válida
          yearsSet.add(yearValue);
          const key = `${yearValue}-${monthValue}`;
          if (!doseData[key]) {
            doseData[key] = {
              totalDose: 0,
              month: monthValue,
              year: yearValue,
            };
          }
          // Sumar solo si la dosis es un número válido
          if (!isNaN(doseValue)) {
            doseData[key].totalDose += doseValue;
          }
        }
      });

      // Ordenar años disponibles (descendente es más común para años)
      const sortedYears = [...yearsSet].sort((a, b) => b - a);
      setAvailableYears(sortedYears);

      // Seleccionar automáticamente el año más reciente si hay datos
      if (hasData && sortedYears.length > 0) {
        setSelectedYear(sortedYears[0]);
      } else if (!hasData) {
        // Si no hay datos, añadir el año actual como opción y seleccionarlo
        const currentYear = new Date().getFullYear();
        setAvailableYears([currentYear]);
        setSelectedYear(currentYear);
      }

      setMonthlyDoses(Object.values(doseData));
    } catch (error) {
      console.error("Error loading monthly doses:", error);
      // Alert.alert(t("errors.loadDosesFailed")); // Opcional: Alerta de error
      // Fallback: añadir año actual si falla la carga
      const currentYear = new Date().getFullYear();
      setAvailableYears([currentYear]);
      setSelectedYear(currentYear);
    } finally {
      setIsLoading(false); // Finalizar carga
    }
  };

  const calculateTotalAnnualDose = () => {
    const total = monthlyDoses
      .filter((item) => item.year === selectedYear) // Filtra por el año seleccionado
      .reduce((sum, item) => sum + (item.totalDose || 0), 0); // Suma las dosis
    setTotalAnnualDose(total);
  };

  const handleViewDetails = (month, year) => {
    router.push({
      pathname: "/employee/doseDetails/[doseDetails]",
      params: { month: month.toString(), year: year.toString() },
    });
  };

  const monthNames = Array.from({ length: 12 }, (_, i) =>
    t(`home.months.${i + 1}`),
  );

  // Formatear años para RNPickerSelect
  const yearItems = availableYears.map((year) => ({
    label: year.toString(),
    value: year,
  }));

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      <View
        style={{
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
            {t("home.header.title")}
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
            {t("home.header.subtitle")}
          </Text>
        </View>
        <Pressable onPress={handleHome}>
          <Image
            source={require("../../assets/icon.png")}
            style={{ width: 50, height: 50 }}
          />
        </Pressable>
      </View>

      {/* Selector de Año con RNPickerSelect */}
      <View style={styles.selectorOuterContainer}>
        <View style={styles.pickerWrapper}>
          <Text style={styles.pickerLabel}>{t("home.selectYear")}</Text>
          {isLoading ? (
            <ActivityIndicator
              size="small"
              color="#FF9300"
              style={{ flex: 1 }}
            />
          ) : (
            <View style={styles.pickerInnerWrapper}>
              <RNPickerSelect
                onValueChange={(value) => setSelectedYear(value)}
                items={yearItems}
                value={selectedYear}
                placeholder={{
                  label: t("home.yearPlaceholder", "Selecciona un año..."), // Añadir key de traducción
                  value: null,
                }}
                style={pickerSelectStyles} // Usar estilos definidos abajo
                useNativeAndroidPickerStyle={false} // Para estilo consistente
                Icon={() => {
                  // Añadir icono de flecha si se desea
                  return (
                    <Ionicons name="chevron-down" size={20} color="gray" />
                  );
                }}
                disabled={isLoading || yearItems.length === 0} // Deshabilitar si carga o no hay años
              />
            </View>
          )}
        </View>
      </View>

      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.headerCell, styles.cellBorder, { flex: 1 }]}>
          {t("home.table.dose")}
        </Text>
        <Text style={[styles.headerCell, styles.cellBorder, { flex: 1 }]}>
          {t("home.table.month")}
        </Text>
        <Text style={[styles.headerCell, { flex: 0.5 }]}>
          {t("home.table.view")}
        </Text>
      </View>

      <ScrollView style={{ minWidth: "100%" }}>
        {monthlyDoses
          .filter((item) => item.year === selectedYear)
          .sort((a, b) => a.month - b.month).length === 0 ? (
          <Text style={{ textAlign: "center", fontSize: 16, color: "#666" }}>
            {t("home.table.noData", { year: selectedYear })}
          </Text>
        ) : (
          monthlyDoses
            .filter((item) => item.year === selectedYear)
            .sort((a, b) => a.month - b.month)
            .map((item, index) => (
              <View
                key={index}
                style={[
                  styles.row,
                  { backgroundColor: index % 2 === 0 ? "#fff" : "#f9f9f9" },
                ]}
              >
                <Text style={[styles.cell, styles.cellBorder, { flex: 1 }]}>
                  {item.totalDose.toFixed(2)} μSv
                </Text>
                <Text style={[styles.cell, styles.cellBorder, { flex: 1 }]}>
                  {item.month ? monthNames[item.month - 1] : "Unknown"}
                </Text>
                <TouchableOpacity
                  style={[styles.cell, styles.eyeButton, { flex: 0.5 }]}
                  onPress={() => handleViewDetails(item.month, item.year)}
                >
                  <Ionicons name="eye" size={22} color="#007AFF" />
                </TouchableOpacity>
              </View>
            ))
        )}
      </ScrollView>

      <View
        style={{
          flexDirection: "column",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <View style={styles.annualDoseContainer}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.annualDoseText}>
              {t("home.annualDose.title")}
            </Text>
          </View>
          <View style={styles.annualDoseContainerText}>
            <Text style={styles.annualDoseValue}>
              {totalAnnualDose.toFixed(2)} μSv
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.downloadButton} onPress={() => {}}>
          <Text style={styles.downloadButtonText}>
            {t("home.annualDose.download")}
          </Text>
        </TouchableOpacity>
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
  // Estilos del Selector
  selectorOuterContainer: {
    padding: 16,
  },
  pickerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 25, // Más redondeado
    paddingHorizontal: 15, // Más padding
    minHeight: 55, // Altura mínima consistente
    // Sombras sutiles opcionales
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pickerLabel: {
    fontSize: 16, // Tamaño adecuado para etiqueta
    fontWeight: "600", // Semi-bold
    color: "#555",
    marginRight: 10,
  },
  pickerInnerWrapper: {
    flex: 1, // Ocupa el espacio restante
    justifyContent: "center", // Centra el RNPickerSelect verticalmente
  },

  // Estilos de Tabla
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1, // Línea más fina
    borderColor: "#eee", // Color más suave
  },
  headerRow: {
    backgroundColor: "#f8f8f8", // Fondo ligero para cabecera
    borderBottomWidth: 2,
    borderColor: "#ddd",
  },
  headerCell: {
    fontSize: 16, // Tamaño de cabecera
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
    paddingVertical: 14, // Más padding vertical
  },
  cell: {
    fontSize: 15, // Tamaño de celda de datos
    textAlign: "center",
    paddingVertical: 14,
    color: "#444",
  },
  cellBorder: {
    borderRightWidth: 1,
    borderColor: "#eee", // Color más suave
  },
  eyeButton: {
    alignItems: "center",
  },
  noDataText: {
    textAlign: "center",
    fontSize: 16, // Tamaño adecuado para mensaje
    color: "#888", // Gris más oscuro
    marginTop: 40, // Más espacio superior
    paddingHorizontal: 20,
  },

  annualDoseContainer: {
    flexDirection: "row", // Cambiado de "row" a "column"
    justifyContent: "center", // Cambiado de "space-between" a "center"
    alignItems: "center", // Añadido para centrar el contenido
    padding: 16,
  },
  annualDoseContainerText: {
    justifyContent: "center", // Cambiado de "space-between" a "center"
    alignItems: "center", // Añadido para centrar el contenido
    padding: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
  },
  annualDoseText: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center", // Añadido para centrar el texto
  },
  annualDoseValue: {
    fontSize: 18,
    color: "#000000",
    textAlign: "center", // Añadido para centrar el texto
    backgroundColor: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
  },
  input: {
    width: "100%",
    height: 40,
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 5,
    paddingHorizontal: 10,
    marginTop: 5,
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 20,
    width: "100%",
  },
  cancelButton: {
    backgroundColor: "gray",
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  modalButton: {
    backgroundColor: "#006892",
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
  },
  // Estilos Botón Descarga
  downloadButton: {
    width: "80%", // Un poco más ancho
    backgroundColor: "#C32427", // Rojo
    paddingVertical: 14, // Padding vertical
    borderRadius: 25, // Muy redondeado
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  downloadButtonText: {
    color: "white",
    fontSize: 16, // Tamaño de texto
    fontWeight: "bold",
    textAlign: "center",
  },
};
const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: "black",
    paddingRight: 30, // para asegurar que el texto no se solape con el icono (si se añade)
    // Quitar bordes/fondo si pickerWrapper ya los tiene
    // borderWidth: 1,
    // borderColor: 'gray',
    // borderRadius: 4,
    // backgroundColor: 'white',
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "black",
    paddingRight: 30, // para asegurar que el texto no se solape con el icono (si se añade)
    // Quitar bordes/fondo si pickerWrapper ya los tiene
    // borderWidth: 0.5,
    // borderColor: 'purple',
    // borderRadius: 8,
    // backgroundColor: 'white',
  },
  placeholder: {
    color: "#9EA0A4", // Color estándar de placeholder
    fontSize: 16,
  },
  iconContainer: {
    // Estilo para el contenedor del icono (la flecha)
    top: "50%",
    marginTop: -10, // Ajustar para centrar el icono verticalmente (aprox. la mitad de su tamaño)
    right: 15, // Posición a la derecha
  },
});
