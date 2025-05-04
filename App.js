import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import ToastManager from 'react-native-toast-message';

// Importa tu Stack de autenticación
import AuthStack from './navigation/AuthStack';

function App() {
  // Por ahora, simplemente renderizamos el NavigationContainer envolviendo el AuthStack
  // La lógica de autenticación para cambiar de stack se añadirá después
  return (
    <NavigationContainer>
      {/* Renderizamos directamente el AuthStack */}
      <AuthStack />
      {/* ToastManager fuera del navegador */}
      <ToastManager />
    </NavigationContainer>
  );
}

export default App; // Asegúrate de que este componente sea el que se exporta como raíz