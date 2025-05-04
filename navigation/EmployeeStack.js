import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Importa las pantallas del empleado
import EmployeeHomeScreen from '../screens/Employee/EmployeeHomeScreen';
// import OtraPantallaEmpleado from '../screens/Employee/OtraPantallaEmpleado';

const Stack = createStackNavigator();

function EmployeeStack() {
  return (
    <Stack.Navigator initialRouteName="EmployeeHome">
      <Stack.Screen name="EmployeeHome" component={EmployeeHomeScreen} options={{ title: 'Inicio Empleado' }} />
      {/* Añade aquí otras pantallas de empleado */}
      {/* <Stack.Screen name="EmployeeDetails" component={OtraPantallaEmpleado} /> */}
    </Stack.Navigator>
  );
}

export default EmployeeStack;