import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import ToastManager from 'react-native-toast-message';
import { ActivityIndicator, View } from 'react-native'; // Para una pantalla de carga inicial

// Importa tus configuraciones de navegadores
import AuthStack from './navigation/AuthStack';
import EmployeeStack from './navigation/EmployeeStack';
import CoordinatorStack from './navigation/CoordinatorStack';
import AdminStack from './navigation/AdminStack';

// Importa auth de tu archivo de configuración de Firebase y onAuthStateChanged
import { auth, db } from './firebase/config'; // Asegúrate de la ruta correcta e importa db también
import { onAuthStateChanged } from 'firebase/auth';
// Importa doc y getDoc de firestore para obtener el rol
import { doc, getDoc } from 'firebase/firestore';


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'employee', 'coordinator', 'admin', o null
  const [loading, setLoading] = useState(true); // Estado para saber si estamos comprobando auth

  useEffect(() => {
    // Suscribirse a los cambios en el estado de autenticación de Firebase
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Usuario autenticado
        setIsAuthenticated(true);

        // Obtener el rol del usuario desde Firestore
        try {
          const userDocRef = doc(db, "employees", user.uid); // Asegúrate de que la colección sea correcta
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role); // Guarda el rol en el estado
          } else {
            // Usuario autenticado pero sin documento de rol? Manejar este caso si es posible
            console.warn("Authenticated user has no role document!");
            setUserRole('employee'); // Asigna un rol por defecto o maneja el error
          }
        } catch (error) {
           console.error("Error fetching user role:", error);
           // Manejar errores al obtener el rol
           setUserRole('employee'); // Asigna un rol por defecto en caso de error
        }


      } else {
        // Usuario no autenticado
        setIsAuthenticated(false);
        setUserRole(null); // Limpia el rol
      }
      setLoading(false); // Terminamos la comprobación inicial o el cambio de estado
    });

    // Limpiar la suscripción al desmontar el componente
    return () => unsubscribe();
  }, []); // El array vacío asegura que este efecto se ejecute solo una vez al montar la App


  if (loading) {
    // Muestra una pantalla de carga mientras verificas el estado de autenticación inicial
    // Esto evita que se muestre brevemente el AuthStack antes de saber si el usuario ya está logueado
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Renderiza el navegador adecuado basado en el estado de autenticación y el rol
  return (
    <NavigationContainer>
      {/* Si no está autenticado, muestra el stack de autenticación */}
      {!isAuthenticated ? (
        <AuthStack />
      ) : (
        // Si está autenticado, muestra el stack basado en el rol
        userRole === 'admin' ? <AdminStack /> :
        userRole === 'coordinator' ? <CoordinatorStack /> :
        // Por defecto (si el rol es 'employee', es null después de logout, o si hay un rol inesperado)
        <EmployeeStack />
      )}
      {/* ToastManager fuera de los navegadores */}
      <ToastManager />
    </NavigationContainer>
  );
}

export default App;