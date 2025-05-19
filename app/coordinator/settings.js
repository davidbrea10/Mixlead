import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  Platform,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { getAuth, deleteUser } from "firebase/auth";
import { db } from "../../firebase/config";
import {
  doc,
  deleteDoc,
  collection,
  collectionGroup, // Added for querying employees
  getDocs,
  writeBatch,
} from "firebase/firestore";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";

export default function Settings() {
  const router = useRouter();
  const { t } = useTranslation();
  const auth = getAuth();

  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(true);
  const [currentUserDetails, setCurrentUserDetails] = useState(null); // { userId: string, companyId: string | null }

  const fetchUserCompanyDetails = useCallback(async () => {
    setIsLoadingUserDetails(true);
    const user = auth.currentUser;
    if (user) {
      const currentUserId = user.uid;
      try {
        const employeesGroupRef = collectionGroup(db, "employees");
        const querySnapshot = await getDocs(employeesGroupRef);
        let foundCompanyId = null;
        let employeeDocPath = null;

        for (const empDoc of querySnapshot.docs) {
          if (empDoc.id === currentUserId) {
            const pathSegments = empDoc.ref.path.split("/");
            // Expected path: companies/{companyId}/employees/{userId}
            if (
              pathSegments.length >= 4 &&
              pathSegments[0] === "companies" &&
              pathSegments[2] === "employees"
            ) {
              foundCompanyId = pathSegments[1];
              employeeDocPath = empDoc.ref.path; // Store the path for reference
              break;
            }
          }
        }

        if (foundCompanyId) {
          setCurrentUserDetails({
            userId: currentUserId,
            companyId: foundCompanyId,
            employeeDocPath: employeeDocPath,
          });
          console.log(
            `User ${currentUserId} found in company ${foundCompanyId} via path ${employeeDocPath}`,
          );
        } else {
          console.warn(
            `Could not find companyId for user ${currentUserId}. Employee document not found or path mismatch.`,
          );
          Toast.show({
            type: "error",
            text1: t("errors.errorTitle", "Error"),
            text2: t(
              "settings.errors.companyDataMissing",
              "Could not retrieve company information for your account.",
            ),
            visibilityTime: 4000,
          });
          setCurrentUserDetails({
            userId: currentUserId,
            companyId: null,
            employeeDocPath: null,
          });
        }
      } catch (error) {
        console.error("Error fetching user's company details:", error);
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle", "Error"),
          text2: t(
            "settings.errors.fetchCompanyError",
            "Failed to fetch company details.",
          ),
          visibilityTime: 4000,
        });
        setCurrentUserDetails({
          userId: currentUserId,
          companyId: null,
          employeeDocPath: null,
        });
      } finally {
        setIsLoadingUserDetails(false);
      }
    } else {
      setCurrentUserDetails(null); // No user
      setIsLoadingUserDetails(false);
    }
  }, [auth, t]); // t is a dependency for Toast messages

  useEffect(() => {
    fetchUserCompanyDetails();
  }, [fetchUserCompanyDetails]);

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.replace("/coordinator/home");
  };

  const handleProfile = () => {
    router.push("/coordinator/settings-profile");
  };

  const handleDeleteAccountPress = () => {
    if (isLoadingUserDetails) return; // Don't do anything if details are still loading

    if (
      !currentUserDetails ||
      !currentUserDetails.userId ||
      !currentUserDetails.companyId
    ) {
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle", "Error"),
        text2: t(
          "settings.errors.userDataMissing",
          "User data not available for deletion. Please try again later.",
        ),
      });
      return;
    }
    setDeleteModalVisible(true);
  };

  const handleConfirmDeleteAccount = async () => {
    if (
      !currentUserDetails ||
      !currentUserDetails.userId ||
      !currentUserDetails.companyId
    ) {
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle", "Error"),
        text2: t("settings.errors.userDataMissing", "User data not available."),
      });
      setDeleteModalVisible(false);
      return;
    }

    setIsDeleting(true);
    const user = auth.currentUser; // Get fresh instance
    const { userId, companyId } = currentUserDetails;

    if (user && user.uid === userId) {
      try {
        const employeeDocRef = doc(
          db,
          "companies",
          companyId,
          "employees",
          userId,
        );

        // Specified subcollection names
        const subcollectionNamesToDelete = [
          "materials",
          "doses",
          "applications",
        ];

        const firestoreDeleteBatch = writeBatch(db);

        for (const subName of subcollectionNamesToDelete) {
          // No need for _example check now as these are actual names
          if (subName && subName.trim() !== "") {
            const subCollectionRef = collection(employeeDocRef, subName);
            const snapshot = await getDocs(subCollectionRef);
            snapshot.forEach((docSnapshot) => {
              firestoreDeleteBatch.delete(docSnapshot.ref);
            });
            console.log(`Prepared deletion for subcollection: ${subName}`);
          }
        }

        firestoreDeleteBatch.delete(employeeDocRef);
        await firestoreDeleteBatch.commit();
        console.log("Firestore data for employee deleted successfully.");

        await deleteUser(user);
        console.log("Firebase Auth user deleted successfully.");

        Toast.show({
          type: "success",
          text1: t("settings.deleteAccount.successTitle", "Account Deleted"),
          text2: t(
            "settings.deleteAccount.successMessage",
            "Your account has been successfully deleted.",
          ),
        });

        router.replace("/auth/login"); // Adjust to your app's login route
      } catch (error) {
        console.error("Error deleting account:", error);
        let errorMsg = t(
          "settings.errors.deleteFailed",
          "Failed to delete account. Please try again or contact support.",
        );
        if (error.code === "auth/requires-recent-login") {
          errorMsg = t(
            "settings.errors.reLoginMessage",
            "This operation is sensitive and requires recent authentication. Please log out and log back in to delete your account.",
          );
        } else if (error.code === "firestore/permission-denied") {
          errorMsg = t(
            "settings.errors.permissionDenied",
            "You do not have permission to delete this data. Contact support.",
          );
        }
        Toast.show({
          type: "error",
          text1: t("errors.errorTitle", "Error"),
          text2: errorMsg,
          visibilityTime: 5000,
        });
      } finally {
        setIsDeleting(false);
        setDeleteModalVisible(false);
      }
    } else {
      Toast.show({
        type: "error",
        text1: t("errors.errorTitle", "Error"),
        text2: t(
          "settings.errors.userMismatch",
          "User mismatch or not signed in. Please re-login.",
        ),
      });
      setIsDeleting(false);
      setDeleteModalVisible(false);
    }
  };

  const isDeleteButtonDisabled =
    isLoadingUserDetails || !currentUserDetails?.companyId;

  return (
    <LinearGradient
      colors={["rgba(35, 117, 249, 0.1)", "rgba(255, 176, 7, 0.1)"]}
      style={styles.flexOne}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack}>
          <Image
            source={require("../../assets/go-back.png")}
            style={styles.headerIcon}
          />
        </Pressable>
        <Text style={styles.headerTitle}>{t("adminSettings.title")}</Text>
        <Pressable onPress={handleHome}>
          <Image
            source={require("../../assets/icon.png")}
            style={styles.headerIcon}
          />
        </Pressable>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <Pressable onPress={handleProfile} style={styles.optionRow}>
          <Image
            source={require("../../assets/profile.png")}
            style={styles.optionIcon}
          />
          <Text style={styles.optionText}>{t("adminSettings.profile")}</Text>
        </Pressable>
        <View style={styles.separator} />

        <Pressable style={styles.optionRow}>
          <Image
            source={require("../../assets/help.png")}
            style={styles.optionIcon}
          />
          <Text style={styles.optionText}>{t("adminSettings.helpFaq")}</Text>
        </Pressable>
        <View style={styles.separator} />

        <Pressable
          onPress={handleDeleteAccountPress}
          style={[
            styles.optionRow,
            isDeleteButtonDisabled && styles.optionDisabled,
          ]}
          disabled={isDeleteButtonDisabled}
        >
          <Ionicons
            name="trash-outline"
            size={38}
            color={isDeleteButtonDisabled ? "#AAAAAA" : "#D32F2F"}
            style={styles.optionIconDelete}
          />
          <Text
            style={[
              styles.optionText,
              styles.deleteText,
              isDeleteButtonDisabled && styles.disabledText,
            ]}
          >
            {isLoadingUserDetails
              ? t("settings.loadingDetails", "Loading details...")
              : t("settings.deleteAccount.button", "Delete Account")}
          </Text>
        </Pressable>
        <View style={styles.separator} />
      </View>

      {/* Footer */}
      <View style={styles.footer}></View>

      {/* Delete Confirmation Modal */}
      <Modal
        transparent
        visible={isDeleteModalVisible}
        animationType="fade"
        onRequestClose={() => !isDeleting && setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons
              name="alert-circle-outline"
              size={60}
              color="#FF9300"
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>
              {t("settings.deleteAccount.confirmTitle", "Confirm Deletion")}
            </Text>
            <Text style={styles.modalMessage}>
              {t(
                "settings.deleteAccount.confirmMessage",
                "Are you sure you want to delete your account? All your personal data, including materials, doses, and applications records, will be permanently removed. This action cannot be undone.",
              )}
            </Text>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                onPress={() => setDeleteModalVisible(false)}
                style={[styles.modalButton, styles.modalCancelButton]}
                disabled={isDeleting}
              >
                <Text style={styles.modalButtonText}>
                  {t("common.cancel", "Cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmDeleteAccount}
                style={[styles.modalButton, styles.modalConfirmDeleteButton]}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.modalButtonText,
                      styles.modalConfirmDeleteButtonText,
                    ]}
                  >
                    {t("common.delete", "Delete")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  header: {
    backgroundColor: "#FF9300",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomStartRadius: 40,
    borderBottomEndRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    paddingTop: Platform.select({ ios: 60, android: 40 }),
  },
  headerIcon: { width: 50, height: 50 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    letterSpacing: 2,
    textShadowColor: "black",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  mainContent: { flex: 1, padding: 20 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
  },
  optionIcon: { width: 40, height: 40, marginRight: 10 },
  optionIconDelete: {
    width: 40,
    height: 40,
    marginRight: 10,
    textAlign: "center",
  },
  optionText: {
    fontSize: 20,
    fontWeight: "500",
    marginLeft: 20,
    color: "#333",
  },
  deleteText: { color: "#D32F2F" },
  disabledText: { color: "#AAAAAA" },
  optionDisabled: { opacity: 0.6 },
  separator: { height: 1, backgroundColor: "#ccc" },
  footer: {
    backgroundColor: "#006892",
    padding: 40,
    alignItems: "flex-end",
    borderTopEndRadius: 40,
    borderTopStartRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 15,
    width: "90%",
    maxWidth: 380,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalIcon: { marginBottom: 15 },
  modalTitle: {
    color: "#333",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  modalMessage: {
    color: "#555",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 8,
  },
  modalCancelButton: { backgroundColor: "#6c757d" },
  modalConfirmDeleteButton: { backgroundColor: "#D32F2F" },
  modalButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  modalConfirmDeleteButtonText: {},
});
