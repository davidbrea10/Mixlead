import { View, Text, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function CalculationSummary() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Determinar si el valor ingresado es distancia o espesor
  const isDistance = params.calculationType === "distance"; // Asumiendo que se pasa un tipo de cálculo

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>
        Calculation Summary
      </Text>
      <Text>Isotope: {params.isotope}</Text>
      <Text>Collimator: {params.collimator}</Text>
      <Text>
        {isDistance ? "Thickness" : "Distance"}: {params.value}{" "}
        {isDistance ? `mm` : `m`}
      </Text>
      <Text>Activity: {params.activity}</Text>
      <Text>Material: {params.material}</Text>
      {params.material === "Other" && (
        <Text>Attenuation: {params.attenuation}</Text>
      )}
      <Text>Limit: {params.limit}</Text>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginTop: 10 }}>
        {isDistance
          ? `DISTANCE: ${params.result} m`
          : `THICKNESS: ${params.result} mm`}
      </Text>

      <Pressable
        onPress={() => router.back()}
        style={{
          marginTop: 20,
          backgroundColor: "blue",
          padding: 10,
          borderRadius: 5,
        }}
      >
        <Text style={{ color: "white" }}>Go Back</Text>
      </Pressable>
    </View>
  );
}
