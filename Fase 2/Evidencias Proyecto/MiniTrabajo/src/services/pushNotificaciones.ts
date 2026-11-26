import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { eliminarTokenPush, registrarTokenPush } from "./notificaciones";
import { colors } from "../theme/colors";

const esWeb = Platform.OS === "web";
// Desde SDK 53, Expo Go en Android no soporta push remotas (requiere development build).
const esExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let tokenActual: string | null = null;

if (!esWeb) {
  // Mostrar la notificación aunque la app esté abierta.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function configurarCanalAndroid() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "General",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: colors.accentBlue,
  });
}

async function obtenerTokenPush(): Promise<string | null> {
  if (esWeb || !Device.isDevice) return null;

  await configurarCanalAndroid();

  if (esExpoGo && Platform.OS === "android") {
    console.info(
      "Push remotas no disponibles en Expo Go (Android). Usa un development build.",
    );
    return null;
  }

  const permisos = await Notifications.getPermissionsAsync();
  let concedido = permisos.granted;
  if (!concedido && permisos.canAskAgain) {
    concedido = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!concedido) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn(
      "Falta el projectId de EAS (ejecuta `npx eas init`). No se activarán push remotas.",
    );
    return null;
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

/** Pide permiso, obtiene el token del dispositivo y lo asocia al usuario en Supabase. */
export async function activarPushParaUsuario(): Promise<void> {
  try {
    const token = await obtenerTokenPush();
    if (!token) return;
    await registrarTokenPush(token, Platform.OS);
    tokenActual = token;
  } catch (e) {
    console.warn("No pudimos activar las notificaciones push:", e);
  }
}

/** Desvincula el dispositivo del usuario. Llamar ANTES de cerrar sesión. */
export async function desactivarPushDelDispositivo(): Promise<void> {
  if (!tokenActual) return;
  const token = tokenActual;
  tokenActual = null;
  // No bloquear el cierre de sesión si la red tarda.
  await Promise.race([
    eliminarTokenPush(token).catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
}

/** Ejecuta `alAbrir` cuando el usuario toca una notificación push. */
export function escucharToquesNotificacion(alAbrir: () => void): () => void {
  if (esWeb) return () => undefined;

  let activo = true;
  void Notifications.getLastNotificationResponseAsync().then((respuesta) => {
    if (activo && respuesta) {
      alAbrir();
      void Notifications.clearLastNotificationResponseAsync?.();
    }
  });

  const suscripcion = Notifications.addNotificationResponseReceivedListener(
    () => alAbrir(),
  );
  return () => {
    activo = false;
    suscripcion.remove();
  };
}
