// app/index.js

import LoginScreen from "./auth/login";

export default function AppEntry() {
  // Aquí puedes poner lógica inicial si la necesitas,
  // o simplemente renderizar tu pantalla de Login
  return <LoginScreen />;
}

// O simplemente exportar el componente de Login directamente
// export { default } from '../screens/Auth/LoginScreen';
