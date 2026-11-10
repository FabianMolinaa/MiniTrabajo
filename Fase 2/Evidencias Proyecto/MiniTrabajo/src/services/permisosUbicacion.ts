import { PermissionsAndroid, Platform } from 'react-native';
import * as Location from 'expo-location';

interface PermisoUbicacion {
  granted: boolean;
  status: 'granted' | 'denied';
}

export async function solicitarPermisoUbicacionAproximada(): Promise<PermisoUbicacion> {
  let granted: boolean;

  if (Platform.OS === 'android') {
    const permiso =
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

    granted = await PermissionsAndroid.check(permiso);

    if (!granted) {
      const resultado = await PermissionsAndroid.request(permiso);

      granted = resultado === PermissionsAndroid.RESULTS.GRANTED;
    }
  } else {
    const permiso = await Location.requestForegroundPermissionsAsync();
    granted = permiso.granted;
  }

  return {
    granted,
    status: granted ? 'granted' : 'denied',
  };
}