import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Importa tus pantallas de autenticación
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import PasswordResetScreen from '../screens/Auth/PasswordResetScreen';
import EmailConfirmationScreen from '../screens/Auth/EmailConfirmationScreen';

const Stack = createStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
        <Stack.Screen name="EmailConfirmation" component={EmailConfirmationScreen} />
    </Stack.Navigator>
  );
}

export default AuthStack;