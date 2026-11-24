import { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BarraPestanas from "../components/BarraPestanas";
import { TituloCabecera, BotonNotificaciones } from "../components/CabeceraApp";
import ModalNotificaciones from "../components/ModalNotificaciones";
import TransicionPantalla from "../components/TransicionPantalla";
import TrabajosScreen from "../screens/TrabajosScreen";
import MapaScreen from "../screens/MapaScreen";
import PublicarScreen from "../screens/PublicarScreen";
import PerfilScreen from "../screens/PerfilScreen";
import { colors } from "../theme/colors";
import { useNotificaciones } from "../hooks/useNotificaciones";

type PestanasPrincipales = {
  Trabajos: undefined;
  Mapa: undefined;
  Publicar: undefined;
  Perfil: undefined;
};

const Tab = createBottomTabNavigator<PestanasPrincipales>();

export default function NavegacionPrincipal({ usuarioId }: { usuarioId: string }) {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const notif = useNotificaciones(usuarioId, () => setModalVisible(true));

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => <BarraPestanas {...props} />}
        screenOptions={({ route }) => ({
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            height: 56 + insets.top,
          },
          headerTitleAlign: "left",
          headerTitle: () => (
            <TituloCabecera titulo={route.name} />
          ),
          headerRight: () => (
            <BotonNotificaciones
              noLeidas={notif.noLeidas}
              onPress={() => setModalVisible(true)}
            />
          ),
        })}
      >
        <Tab.Screen name="Trabajos">
          {() => (
            <TransicionPantalla>
              <TrabajosScreen />
            </TransicionPantalla>
          )}
        </Tab.Screen>

        <Tab.Screen name="Mapa">
          {() => (
            <TransicionPantalla>
              <MapaScreen />
            </TransicionPantalla>
          )}
        </Tab.Screen>

        <Tab.Screen name="Publicar">
          {() => (
            <TransicionPantalla>
              <PublicarScreen />
            </TransicionPantalla>
          )}
        </Tab.Screen>

        <Tab.Screen name="Perfil">
          {() => (
            <TransicionPantalla>
              <PerfilScreen />
            </TransicionPantalla>
          )}
        </Tab.Screen>
      </Tab.Navigator>

      {/* Modal emergente de Notificaciones */}
      <ModalNotificaciones
        visible={modalVisible}
        onCerrar={() => setModalVisible(false)}
        notificaciones={notif.notificaciones}
        noLeidas={notif.noLeidas}
        cargando={notif.cargando}
        error={notif.error}
        onReintentar={() => void notif.recargar()}
        onMarcarLeida={(id) => void notif.marcarLeida(id)}
        onMarcarTodas={() => void notif.marcarTodas()}
      />
    </>
  );
}
