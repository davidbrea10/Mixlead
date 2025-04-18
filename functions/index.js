/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Inicializa Firebase Admin
admin.initializeApp();

exports.validateDNI = functions.https.onCall(async (data, context) => {
  // Validar que el DNI fue proporcionado
  const { dni } = data;
  if (!dni) {
    throw new functions.https.HttpsError("invalid-argument", "DNI is required.");
  }

  try {
    // Consultar Firestore para verificar si el DNI ya existe
    const employeesRef = admin.firestore().collection("employees");
    const querySnapshot = await employeesRef.where("dni", "==", dni).get();

    if (!querySnapshot.empty) {
      // Si el DNI ya existe, devolver true
      return { exists: true, message: "DNI already exists." };
    } else {
      // Si el DNI no existe, devolver false
      return { exists: false, message: "DNI is available." };
    }
  } catch (error) {
    console.error("Error validating DNI:", error);
    throw new functions.https.HttpsError("internal", "Error validating DNI.");
  }
});