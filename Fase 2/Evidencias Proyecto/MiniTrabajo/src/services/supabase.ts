import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { sessionStorage, estadoLecturaSesion } from './sessionStorage';

// Leemos las variables desde el entorno local (.env)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables de entorno de Supabase. Revisa tu archivo .env'
  );
}

// Mantener la misma clave predeterminada que usaba Supabase permite migrar
// la sesión ya guardada, sin crear otra entrada con tokens sin cifrar.
const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey,
    storage: Platform.OS === 'web' ? AsyncStorage : sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function recuperarSesion() {
  const fallosAntes = estadoLecturaSesion(storageKey).fallos;
  const resultado = await supabase.auth.getSession();
  const lectura = estadoLecturaSesion(storageKey);
  if (Platform.OS !== 'web' && (lectura.error || lectura.fallos !== fallosAntes)) {
    throw new Error('No pudimos leer la sesión guardada. Inténtalo nuevamente.');
  }
  return resultado;
}
