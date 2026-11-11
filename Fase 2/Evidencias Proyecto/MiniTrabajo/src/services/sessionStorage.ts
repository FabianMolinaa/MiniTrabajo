import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  AESEncryptionKey,
  AESKeySize,
  AESSealedData,
  CryptoDigestAlgorithm,
  aesDecryptAsync,
  aesEncryptAsync,
  digestStringAsync,
} from 'expo-crypto';

const PREFIJO = 'minitrabajo.secure.v1:';
const OPCIONES = {
  // Permite terminar una renovación ya iniciada aunque el teléfono se bloquee.
  // La clave no se transfiere a otro dispositivo con una copia de seguridad.
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

// Serializar también la migración y el borrado para no restaurar una sesión
// después de que otra operación de la app haya solicitado eliminarla.
let pendiente: Promise<void> = Promise.resolve();

function enOrden<T>(operacion: () => Promise<T>): Promise<T> {
  const resultado = pendiente.then(operacion);
  pendiente = resultado.then(() => undefined, () => undefined);
  return resultado;
}

async function nombreClave(key: string): Promise<string> {
  const hash = await digestStringAsync(CryptoDigestAlgorithm.SHA256, key);
  return `minitrabajo.auth.${hash}`;
}

function contexto(key: string): Uint8Array {
  return new TextEncoder().encode(`${PREFIJO}${key}`);
}

async function eliminar(key: string, nombre: string): Promise<void> {
  // Eliminar primero la clave vuelve ilegible cualquier copia del cifrado.
  await SecureStore.deleteItemAsync(nombre, OPCIONES);
  await AsyncStorage.removeItem(key);
}

async function guardar(key: string, value: string): Promise<void> {
  const nombre = await nombreClave(key);
  const claveGuardada = await SecureStore.getItemAsync(nombre, OPCIONES);
  const clave = claveGuardada
    ? await AESEncryptionKey.import(claveGuardada, 'base64')
    : await AESEncryptionKey.generate(AESKeySize.AES256);

  if (!claveGuardada) {
    await SecureStore.setItemAsync(nombre, await clave.encoded('base64'), OPCIONES);
  }

  const cifrado = await aesEncryptAsync(new TextEncoder().encode(value), clave, {
    nonce: { length: 12 },
    tagLength: 16,
    additionalData: contexto(key),
  });
  // Sustituir la entrada original evita conservar otra copia sin cifrar.
  await AsyncStorage.setItem(key, PREFIJO + await cifrado.combined('base64'));
}

const almacenamientoCifrado = {
  getItem(key: string): Promise<string | null> {
    return enOrden(async () => {
      const guardado = await AsyncStorage.getItem(key);
      if (guardado === null) return null;

      if (!guardado.startsWith(PREFIJO)) {
        if (guardado.startsWith('minitrabajo.secure.')) {
          throw new Error('La versión de la sesión guardada no es compatible.');
        }
        // Migrar sesiones de la versión anterior antes de entregarlas al SDK.
        // Si falla el cifrado, el error se propaga; no usar texto sin proteger.
        await guardar(key, guardado);
        return guardado;
      }

      const nombre = await nombreClave(key);
      // Un fallo de acceso a SecureStore se puede reintentar sin borrar datos.
      const claveGuardada = await SecureStore.getItemAsync(nombre, OPCIONES);
      if (claveGuardada === null) {
        // Por ejemplo, una copia restaurada sin la clave de este dispositivo.
        await AsyncStorage.removeItem(key);
        return null;
      }

      try {
        const clave = await AESEncryptionKey.import(claveGuardada, 'base64');
        const cifrado = AESSealedData.fromCombined(guardado.slice(PREFIJO.length), {
          ivLength: 12,
          tagLength: 16,
        });
        const bytes = await aesDecryptAsync(cifrado, clave, {
          additionalData: contexto(key),
        });
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch {
        // No aceptar una sesión que ya no se puede descifrar o autenticar.
        await eliminar(key, nombre);
        return null;
      }
    });
  },

  setItem(key: string, value: string): Promise<void> {
    return enOrden(() => guardar(key, value));
  },

  removeItem(key: string): Promise<void> {
    return enOrden(async () => eliminar(key, await nombreClave(key)));
  },
};

interface EstadoLectura {
  fallos: number;
  error: boolean;
}

const lecturas = new Map<string, EstadoLectura>();

export function estadoLecturaSesion(key: string): Readonly<EstadoLectura> {
  return lecturas.get(key) ?? { fallos: 0, error: false };
}

export const sessionStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const value = await almacenamientoCifrado.getItem(key);
      lecturas.set(key, { fallos: estadoLecturaSesion(key).fallos, error: false });
      return value;
    } catch {
      // El SDK también lee al registrar sus listeners internos. Evitar un
      // rechazo sin manejar allí; recuperarSesion consulta este estado y
      // presenta Reintentar, conservando los datos para un nuevo intento.
      lecturas.set(key, { fallos: estadoLecturaSesion(key).fallos + 1, error: true });
      return null;
    }
  },
  setItem: almacenamientoCifrado.setItem,
  removeItem: almacenamientoCifrado.removeItem,
};
