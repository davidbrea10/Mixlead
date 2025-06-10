// __tests__/Home.test.js

// Mock para expo-router
// __tests__/Home.test.js
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import Home from "../app/employee/myAgenda"; // Asegúrate de que la ruta sea correcta
import { auth } from "../firebase/config"; // Importamos el mock
import * as firestore from "firebase/firestore";

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock para i18next (traducciones)
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key, // Devuelve la clave de traducción como valor
  }),
}));

// Mock para react-native-toast-message
jest.mock("react-native-toast-message", () => ({
  show: jest.fn(),
}));

// Mock para Firebase
jest.mock("../firebase/config", () => ({
  auth: {
    currentUser: {
      uid: "test-user-uid-123",
      email: "test@example.com",
    },
  },
  db: {}, // Objeto vacío por ahora, lo detallaremos en las pruebas
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  collectionGroup: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn(() => "mock-timestamp"), // Devuelve un valor simple
}));

// Mock para @react-native-community/datetimepicker
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  // Un componente falso que no hace nada
  return (props) => <View testID="mock-datetimepicker" {...props} />;
}); // Importamos todo firestore para mockear sus funciones

// ... (aquí van los mocks del paso 1) ...

describe("Componente Home - Guardar Dosis", () => {
  // Mock de las funciones de Firestore
  const mockAddDoc = jest.fn();
  const mockGetDocs = jest.fn();

  beforeEach(() => {
    // Limpiamos los mocks antes de cada prueba para que no interfieran entre sí
    mockAddDoc.mockClear();
    mockGetDocs.mockClear();

    // Sobrescribimos el mock de firestore para esta prueba
    jest.spyOn(firestore, "collection").mockReturnValue({}); // No importa lo que devuelva
    jest.spyOn(firestore, "collectionGroup").mockReturnValue({});
    jest.spyOn(firestore, "query").mockReturnValue({});
    jest.spyOn(firestore, "where").mockReturnValue({});
    jest.spyOn(firestore, "serverTimestamp").mockReturnValue("mock-timestamp");

    // Lo más importante: mockeamos addDoc y getDocs
    jest.spyOn(firestore, "addDoc").mockImplementation(mockAddDoc);
    jest.spyOn(firestore, "getDocs").mockImplementation(mockGetDocs);
  });

  it("debe guardar una dosis cuando los datos son válidos", async () => {
    // 1. Simular la respuesta de Firebase para obtener el companyId del usuario
    mockGetDocs
      .mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            data: () => ({ companyId: "company-abc-123" }),
          },
        ],
      })
      // 2. Simular la respuesta de la validación de límite de dosis (menos de 15)
      .mockResolvedValueOnce({
        size: 5, // Ya hay 5 dosis guardadas hoy, se permite guardar más
      });

    render(<Home />);

    // El modal no es visible al inicio. Hay que abrirlo.
    // Buscamos el botón "Añadir Datos Manualmente" y lo presionamos
    const addButton = screen.getByText("home.addDataManually");
    fireEvent.press(addButton);

    // Verificamos que el modal ahora es visible
    expect(screen.getByText("home.modal.dose")).toBeOnTheScreen();

    // 3. Simular que el usuario rellena el formulario del modal
    const doseInput = screen.getByPlaceholderText("home.modal.enterDose");
    const exposuresInput = screen.getByPlaceholderText(
      "home.modal.enterNumberOfExposures",
    );
    const hoursInput = screen.getByPlaceholderText("HH");
    const minutesInput = screen.getByPlaceholderText("MM");
    const secondsInput = screen.getByPlaceholderText("SS");

    fireEvent.changeText(doseInput, "1.23");
    fireEvent.changeText(exposuresInput, "10");
    fireEvent.changeText(hoursInput, "0");
    fireEvent.changeText(minutesInput, "5");
    fireEvent.changeText(secondsInput, "30");

    // 4. Presionar el botón de guardar
    const saveButton = screen.getByText("home.modal.save");
    fireEvent.press(saveButton);

    // 5. Verificar que la función addDoc de Firestore fue llamada
    await waitFor(() => {
      // Verificamos que se llamó a addDoc
      expect(mockAddDoc).toHaveBeenCalledTimes(1);

      // Verificamos que los datos enviados a Firestore son correctos
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(), // No nos importa el primer argumento (la referencia de la colección)
        {
          dose: 1.23,
          totalExposures: 10,
          totalTime: 330, // 5 minutos * 60 + 30 segundos
          day: new Date().getDate(),
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          startTime: null, // No se seleccionó hora en este test
          timestamp: "mock-timestamp",
          entryMethod: "manual",
        },
      );
    });
  });

  // Puedes añadir más tests aquí, por ejemplo para el caso de error
  it("debe mostrar un error si se alcanza el límite de dosis diarias", async () => {
    // 1. Simular respuesta de companyId
    mockGetDocs
      .mockResolvedValueOnce({
        empty: false,
        docs: [{ data: () => ({ companyId: "company-abc-123" }) }],
      })
      // 2. Simular que ya hay 15 dosis guardadas
      .mockResolvedValueOnce({
        size: 15,
      });

    const { getByText, getByPlaceholderText } = render(<Home />);

    // Abrir modal y rellenar datos
    fireEvent.press(getByText("home.addDataManually"));
    fireEvent.changeText(getByPlaceholderText("home.modal.enterDose"), "1.5");
    fireEvent.changeText(
      getByPlaceholderText("home.modal.enterNumberOfExposures"),
      "5",
    );
    fireEvent.changeText(getByPlaceholderText("HH"), "1");

    // Presionar guardar
    fireEvent.press(getByText("home.modal.save"));

    // Verificar
    await waitFor(() => {
      // La función de guardar en BBDD NO debe ser llamada
      expect(mockAddDoc).not.toHaveBeenCalled();

      // La notificación de error SÍ debe mostrarse
      const Toast = require("react-native-toast-message");
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          text2: "home.alerts.error.dailyDoseLimitReached",
        }),
      );
    });
  });
});
