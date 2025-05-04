import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Importa las pantallas del empleado
import AdminHomeScreen from '../screens/Admin/AdminHomeScreen';
// import OtraPantallaEmpleado from '../screens/Admin/OtraPantallaEmpleado';

const Stack = createStackNavigator();

function AdminStack() {
  return (
    <Stack.Navigator initialRouteName="AdminHome">
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} options={{ title: 'Inicio Administrador' }} />
      {/* Añade aquí otras pantallas de empleado */}
      {/* <Stack.Screen name="AdminDetails" component={OtraPantallaEmpleado} /> */}
    </Stack.Navigator>
  );
}

export default AdminStack;