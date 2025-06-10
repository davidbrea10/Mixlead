import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
  ScrollView,
  Platform,
  StyleSheet, // Import StyleSheet
  Modal,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message"; // 1. Import Toast
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const isTablet = width >= 700;

export default function CompanyDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const insets = useSafeAreaInsets();

  const [company, setCompany] = useState({
    Name: "",
    Cif: "",
    Telephone: "",
    ContactPerson: "",
    SecurityNumber: "",
    CompanyId: "",
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // Loading state for Save button
  const [isDeleting, setIsDeleting] = useState(false); // Loading state for Delete button (within Alert)
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const { t } = useTranslation(); // Initialize i18n

  // Define fields including the read-only CompanyId
  const fields = [
    { key: "Name", label: "company_details.fields.Name", editable: true },
    {
      key: "CompanyId",
      label: "company_details.fields.CompanyId",
      editable: false,
    }, // Mark as not editable
    { key: "Cif", label: "company_details.fields.Cif", editable: true },
    {
      key: "Telephone",
      label: "company_details.fields.Telephone",
      editable: true,
    },
    {
      key: "ContactPerson",
      label: "company_details.fields.ContactPerson",
      editable: true,
    },
    {
      key: "SecurityNumber",
      label: "company_details.fields.SecurityNumber",
      editable: true,
    },
  ];

  useEffect(() => {
    const fetchCompany = async () => {
      if (!id) {
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle", "Error"),
          text2: t("company_details.alert.invalid_id", "Invalid company ID."), // Add translation
        });
        router.back();
        return;
      }
      setLoading(true); // Ensure loading is true at the start
      try {
        const docRef = doc(db, "companies", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setCompany({
            ...data,
            CompanyId: data.CompanyId || id, // Use Firestore ID if CompanyId field doesn't exist
          });
        } else {
          // Replace alert with error toast
          Toast.show({
            type: "error",
            text1: t("errors.errorTitle", "Error"),
            text2: t("company_details.alert.not_found"),
          });
          router.back();
        }
      } catch (error) {
        console.error("Fetch Company Error: ", error);
        // Replace alert with error toast
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle", "Error"),
          text2: t("company_details.alert.fetch_error"),
        });
        router.back(); // Go back on fetch error too
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
  }, [id, t, router]); // Add t and router to dependency array

  const handleInputChange = (field, value) => {
    setCompany({ ...company, [field]: value });
  };

  const handleSave = async () => {
    setIsSaving(true); // Start loading
    try {
      const docRef = doc(db, "companies", id);
      // Create object excluding CompanyId for update, as it shouldn't be changed here
      const { CompanyId, ...updateData } = company;
      await updateDoc(docRef, updateData);

      // Replace alert with success toast
      Toast.show({
        type: "success",
        text1: t("success.title"), // Generic success title
        text2: t("company_details.alert.update_success"),
      });
      // Navigate back or refresh list
      router.replace({
        pathname: "/admin/companies",
        params: { refresh: Date.now() },
      }); // Use replace and timestamp for refresh trigger
    } catch (error) {
      console.error("Update Company Error: ", error);
      // Replace alert with error toast
      Toast.show({
        type: "error",
        text1: t("error.title"),
        text2: t("company_details.alert.update_error"),
      });
    } finally {
      setIsSaving(false); // Stop loading
    }
  };

  const handleDelete = async () => {
    // Keep Alert.alert for confirmation dialog
    setIsDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleteModalVisible(false); // Cierra el modal primero

    // Opcional: Indicador de carga si la eliminación es larga
    // setLoading(true); // Podrías reutilizar el loading general o uno específico

    try {
      const docRef = doc(db, "companies", id);
      await deleteDoc(docRef);
      Toast.show({
        type: "success",
        text1: t("success.title"),
        text2: t("company_details.alert.delete_success"),
      });
      router.replace({
        pathname: "/admin/companies",
        params: { refresh: Date.now() },
      });
    } catch (error) {
      console.error("Delete Company Error: ", error);
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle"),
        text2: t("company_details.alert.delete_error"),
      });
    } finally {
      // setLoading(false); // Desactiva el indicador de carga si lo usaste
    }
  };

  // --- Copy to Clipboard Function ---
  const copyToClipboard = async (text) => {
    await Clipboard.setStringAsync(text);
    Toast.show({
      type: "info", // Use 'info' or 'success' type
      text1: t("company_details.clipboard.copied_title", "Copied"), // Add translation
      text2: t(
        "company_details.clipboard.copied_message",
        "Company ID copied to clipboard.",
      ), // Add translation
      visibilityTime: 1500,
    });
  };

  if (loading) {
    return (
      // Centered Loading Indicator
      <LinearGradient
        colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#FF8C00" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={styles.gradient}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 15 }]}>
        <Pressable onPress={() => router.replace("/admin/companies")}>
          <Image
            source={require("../../../assets/go-back.png")}
            style={styles.headerIcon}
          />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleMain}>
            {t("company_details.title")}
          </Text>
          <Text style={styles.headerTitleSub}>
            {company?.Name || t("company_details.subtitle")}
          </Text>
        </View>
        {/* Optional: Keep icon if needed, otherwise remove Pressable */}
        <Pressable
          onPress={() => router.push("/admin/home")}
          style={{ width: 50 }}
        >
          {/* Keep icon or empty view for spacing */}
          {/* <Image source={require("../../../assets/icon.png")} style={styles.headerIcon} /> */}
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          {fields.map(({ key, label, editable }) => (
            <View key={key} style={styles.fieldContainer}>
              <Text style={styles.label}>{t(label)}</Text>
              {editable ? (
                <TextInput
                  value={company[key]}
                  onChangeText={(text) => handleInputChange(key, text)}
                  style={styles.input}
                  // Add keyboardType for specific fields if needed
                  keyboardType={key === "Telephone" ? "phone-pad" : "default"}
                />
              ) : (
                // Read-only field (CompanyId)
                <Pressable
                  onPress={() => copyToClipboard(company[key])}
                  style={styles.readOnlyInputContainer}
                >
                  <Text style={styles.readOnlyInputText}>{company[key]}</Text>
                  <Text style={styles.copyTextHint}>
                    {t("company_details.tap_to_copy")}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleSave}
              disabled={isSaving || isDeleting} // Disable while saving or deleting
              style={[
                styles.button,
                styles.saveButton,
                (isSaving || isDeleting) && styles.buttonDisabled,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator
                  size="small"
                  color="#fff"
                  style={styles.buttonSpinner}
                />
              ) : (
                <Text style={styles.buttonText}>
                  {t("company_details.save")}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleDelete}
              disabled={isSaving || isDeleting} // Disable while saving or deleting
              style={[
                styles.button,
                styles.deleteButton,
                (isSaving || isDeleting) && styles.buttonDisabled,
              ]}
            >
              {/* No spinner needed here as loading happens after Alert */}
              <Text style={styles.buttonText}>
                {t("company_details.delete")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Custom Delete Confirmation Modal */}
      <Modal
        transparent // Fondo transparente para ver el overlay
        visible={isDeleteModalVisible}
        animationType="fade" // Animación como el ejemplo
        onRequestClose={() => setIsDeleteModalVisible(false)} // Permite cerrar con botón atrás (Android)
      >
        <View style={styles.modalOverlay}>
          {/* Contenido del modal */}
          <View style={styles.modalContent}>
            {/* Título o Mensaje Principal */}
            <Text style={styles.modalMessageText}>
              {/* Usa la traducción existente del mensaje de confirmación */}
              {t("company_details.alert.delete_confirm")}
            </Text>

            {/* Fila de Botones */}
            <View style={styles.modalButtonRow}>
              {/* Botón Cancelar */}
              <Pressable
                onPress={() => setIsDeleteModalVisible(false)}
                style={[styles.modalButton, styles.modalCancelButton]}
              >
                <Text style={styles.modalButtonText}>
                  {/* Usa la traducción existente */}
                  {t("company_details.confirm.cancel")}
                </Text>
              </Pressable>

              {/* Botón Confirmar Eliminar */}
              <Pressable
                onPress={handleConfirmDelete} // Llama a la nueva función
                style={[styles.modalButton, styles.modalConfirmButton]}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    styles.modalConfirmButtonText,
                  ]}
                >
                  {/* Usa la traducción existente */}
                  {t("company_details.confirm.delete")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Footer (Optional - can be removed if not needed) */}
      <View style={[styles.footer, { paddingTop: insets.bottom + 40 }]}></View>
    </LinearGradient>
  );
}

// --- StyleSheet ---
const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    // Style for loading state
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
    marginBottom: 20,
  },
  headerIcon: {
    width: isTablet ? 70 : 50,
    height: isTablet ? 70 : 50,
  },
  headerTitleContainer: {
    flex: 1, // Allow container to take available space
    alignItems: "center", // Center titles horizontally
    marginHorizontal: 10, // Add space between icons and title block
  },
  headerTitleMain: {
    fontSize: isTablet ? 32 : 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginHorizontal: 10,
    letterSpacing: 2,
    textShadowColor: "black",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  headerTitleSub: {
    fontSize: 24,
    fontWeight: "light",
    color: "white",
    textAlign: "center",
    letterSpacing: 2,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  scrollContainer: {
    flexGrow: 1, // Ensure content can grow
    paddingBottom: 20, // Padding at the bottom of the scroll view
  },
  content: {
    flex: 1,
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 20, // Increased spacing between fields
  },
  label: {
    fontSize: 16, // Adjusted label size
    fontWeight: "500",
    color: "#333",
    marginBottom: 8, // Space between label and input
  },
  input: {
    height: 55,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: "white",
    fontSize: 18,
    color: "#333", // Ensure text color is readable
  },
  readOnlyInputContainer: {
    // Style for the read-only field container
    height: 55,
    borderWidth: 1,
    borderColor: "#e0e0e0", // Lighter border for read-only
    borderRadius: 10,
    paddingHorizontal: 15,
    justifyContent: "center", // Center text vertically
    backgroundColor: "#f5f5f5", // Slightly different background
  },
  readOnlyInputText: {
    fontSize: 18,
    color: "#555", // Darker grey text
  },
  copyTextHint: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20, // Space above buttons
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 10, // Adjust horizontal padding if needed
    borderRadius: 10,
    alignItems: "center",
    flex: 1, // Make buttons share space equally
    flexDirection: "row", // For spinner alignment
    justifyContent: "center", // Center content (text/spinner)

    // Shadow/Elevation
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  saveButton: {
    backgroundColor: "#006892",
    marginRight: 10, // Space between buttons
  },
  deleteButton: {
    backgroundColor: "#D32F2F",
    marginLeft: 10, // Space between buttons
  },
  buttonDisabled: {
    backgroundColor: "#a0a0a0", // Grey out when disabled
    elevation: 0, // Remove shadow when disabled
    shadowOpacity: 0,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  buttonSpinner: {
    // No extra style needed if centered by button's justifyContent
    // marginRight: 5 // Optional: if you want space between spinner and potential text
  },
  footer: {
    // Optional Footer style (can be empty if not used)
    backgroundColor: "#006892",
    borderTopEndRadius: 40,
    borderTopStartRadius: 40,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)", // Overlay semitransparente oscuro
  },
  modalContent: {
    backgroundColor: "#1F1F1F", // Fondo oscuro como el ejemplo
    padding: 24,
    borderRadius: 20, // Bordes redondeados
    width: "85%", // Ancho relativo
    maxWidth: 340, // Ancho máximo
    alignItems: "center", // Centra el contenido
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  // Opcional: Si quieres un título separado del mensaje
  // modalTitleText: {
  //   color: "white",
  //   fontSize: 18,
  //   fontWeight: 'bold',
  //   textAlign: "center",
  //   marginBottom: 10,
  // },
  modalMessageText: {
    // Estilo para el texto de confirmación
    color: "white",
    fontSize: 17, // Ligeramente más grande
    textAlign: "center",
    marginBottom: 24, // Espacio antes de los botones
    lineHeight: 24, // Mejor legibilidad
  },
  modalButtonRow: {
    // Contenedor para los botones
    flexDirection: "row",
    justifyContent: "space-around", // Espaciado entre botones
    width: "100%", // Ocupa todo el ancho del modalContent
    marginTop: 10,
  },
  modalButton: {
    // Estilo base para ambos botones
    flex: 1, // Para que ocupen espacio similar si es necesario
    paddingVertical: 12,
    paddingHorizontal: 20, // Más padding horizontal
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 8, // Espacio entre botones
    minWidth: 100, // Ancho mínimo para que no queden muy pequeños
  },
  modalCancelButton: {
    // Estilo específico para el botón "No" / "Cancelar"
    backgroundColor: "#4A4A4A", // Un gris oscuro diferente
  },
  modalConfirmButton: {
    // Estilo específico para el botón "Sí" / "Eliminar"
    backgroundColor: "#D32F2F", // Rojo destructivo (como el botón principal)
  },
  modalButtonText: {
    // Estilo del texto de los botones
    color: "white",
    fontSize: 16,
    fontWeight: "600", // Semi-negrita
  },
  modalConfirmButtonText: {
    // Puedes añadir estilos específicos si quieres diferenciar el texto del botón de confirmación
  },
});
