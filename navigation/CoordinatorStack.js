import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Importa las pantallas del empleado
import CoordinatorHomeScreen from '../screens/Coordinator/CoordinatorHomeScreen';
// import OtraPantallaEmpleado from '../screens/Coordinator/OtraPantallaEmpleado';

const Stack = createStackNavigator();

function CoordinatorStack() {
  return (
    <Stack.Navigator initialRouteName="CoordinatorHome">
      <Stack.Screen name="CoordinatorHome" component={CoordinatorHomeScreen} options={{ title: 'Inicio Coordinador' }} />
      {/* Añade aquí otras pantallas de empleado */}
      {/* <Stack.Screen name="CoordinatorDetails" component={OtraPantallaEmpleado} /> */}
    </Stack.Navigator>
  );
}

export default CoordinatorStack;