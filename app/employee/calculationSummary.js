import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next"; // Importar el hook de traducción

export default function CalculationSummary() {
  const router = useRouter();
  const { t } = useTranslation(); // Inicializar traducción
  const params = useLocalSearchParams();

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.replace("/employee/home");
  };

  const handleGraph = () => {
    // Pasar el resultado y también indicar la unidad (metros)
    router.push({
      pathname: "/employee/graph", // O la ruta correcta a tu pantalla Graph
      params: {
        latitude: null, // Aún no tenemos lat/lon aquí, se marcarán en Graph
        longitude: null,
        radius: params.result, // El resultado del cálculo (asumimos que está en metros)
        radiusUnit: "m", // Especificar la unidad
      },
    });
  };

  const handleTable = () => {
    router.push("/employee/table");
  };

  // Determinar si el valor ingresado es distancia o espesor
  const isDistance = params.calculationType === "distance"; // Asumiendo que se pasa un tipo de cálculo

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        {/* Header */}
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
                marginHorizontal: 10,
              }}
            >
              {t("calculationSummary.title", {
                type: isDistance
                  ? t("calculationSummary.distance")
                  : t("calculationSummary.thickness"),
              })}
            </Text>
          </View>

          <Pressable onPress={handleHome}>
            <Image
              source={require("../../assets/icon.png")}
              style={{ width: 50, height: 50 }}
            />
          </Pressable>
        </View>

        {/* Main Content */}
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={{ fontSize: 18, fontWeight: "bold", margin: 15 }}>
            {t("calculationSummary.resultsFor")}
          </Text>
          <View style={{ flexDirection: "row" }}>
            <Text style={styles.label}>{t("calculationSummary.isotope")}</Text>
            <Text style={styles.textLabel}>{params.isotope?.toString()}</Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={styles.label}>
              {t("calculationSummary.collimator")}
            </Text>
            <Text style={styles.textLabel}>
              {params.collimator?.toString()}
            </Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={styles.label}>
              {isDistance
                ? t("calculationSummary.thickness")
                : t("calculationSummary.distance")}
            </Text>
            <Text style={styles.textLabel}>
              {params.value?.toString()} {isDistance ? "mm" : "m"}
            </Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={styles.label}>{t("calculationSummary.activity")}</Text>
            <Text style={styles.textLabel}>
              {params.activity?.toString()} {t("calculationSummary.ci")}
            </Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={styles.label}>{t("calculationSummary.material")}</Text>
            <Text style={styles.textLabel}>{params.material?.toString()}</Text>
          </View>
          {params.material === "Other" && (
            <View style={{ flexDirection: "row" }}>
              <Text style={styles.label}>
                {t("calculationSummary.attenuation")}
              </Text>
              <Text style={styles.textLabel}>
                {params.attenuation?.toString()}
              </Text>
            </View>
          )}
          <View style={{ flexDirection: "row" }}>
            <Text style={styles.label}>{t("calculationSummary.limit")}</Text>
            <Text style={styles.textLabel}>{params.limit?.toString()}</Text>
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginTop: 10,
              textAlign: "center",
            }}
          >
            {isDistance
              ? t("calculationSummary.resultDistance", {
                  result: params.result?.toString(),
                })
              : t("calculationSummary.resultThickness", {
                  result: params.result?.toString(),
                })}
          </Text>

          {/* Buttons */}
          <View
            style={{
              flexDirection: "column",
              alignItems: "center",
              marginTop: 40,
            }}
          >
            <Pressable onPress={handleGraph} style={styles.button}>
              <Text style={{ color: "#fff", fontSize: 19 }}>
                {t("calculationSummary.graph")}
              </Text>
            </Pressable>
            <Pressable onPress={handleTable} style={styles.button}>
              <Text style={{ color: "#fff", fontSize: 19 }}>
                {t("calculationSummary.table")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      {/* Footer */}
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
    paddingVertical: 20,
  },

  label: {
    fontSize: 18,
    marginBottom: 10,
    fontWeight: "bold",
    marginLeft: 80,
  },

  textLabel: {
    fontSize: 18,
    marginBottom: 10,
    marginLeft: 10,
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
  inspectionButton: {
    width: 366,
    height: 55,
    backgroundColor: "#169200",
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
