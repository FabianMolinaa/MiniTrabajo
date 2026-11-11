import React from "react";
import { View } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { colors } from "./src/theme/colors";
import { styles } from "./src/styles/AppStyles";
import { useSesion } from "./src/hooks/useSesion";
import EstadoListaRemota from "./src/components/EstadoListaRemota";
import NavegacionPrincipal from "./src/navigation/NavegacionPrincipal";
import AuthScreen from "./src/screens/AuthScreen";
import { FiltrosProvider } from "./src/context/FiltrosContext";

const MyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.navBarBackground,
    text: colors.textPrimary,
  },
};

export default function App() {
  const { session, cargandoSesion, errorSesion, cargarSesion } = useSesion();

  if (cargandoSesion || errorSesion) {
    return (
      <View style={styles.loadingContainer}>
        <EstadoListaRemota
          estado={cargandoSesion ? "cargando" : "error"}
          error={errorSesion}
          onReintentar={() => void cargarSesion()}
        >
          {null}
        </EstadoListaRemota>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <FiltrosProvider key={session?.user?.id ?? "sin-sesion"}>
        <NavigationContainer theme={MyDarkTheme}>
        {session && session.user ? <NavegacionPrincipal /> : <AuthScreen />}
        </NavigationContainer>
      </FiltrosProvider>
    </SafeAreaProvider>
  );
}
