import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase, recuperarSesion } from '../services/supabase';

interface EstadoSesion {
  session: Session | null;
  cargandoSesion: boolean;
  errorSesion: string | null;
}

// Compartir la cola entre montajes evita que una limpieza anterior detenga
// la renovación de un nuevo montaje (por ejemplo, durante un reload).
let renovacionPendiente: Promise<void> = Promise.resolve();
let ultimaTransicion = 0;

function programarRenovacion(activa: boolean): void {
  const transicion = ++ultimaTransicion;
  renovacionPendiente = renovacionPendiente.then(async () => {
    await supabase.auth.initialize();
    if (transicion !== ultimaTransicion) return;
    if (activa) await supabase.auth.startAutoRefresh();
    else await supabase.auth.stopAutoRefresh();
  }).catch(() => {
    console.warn('No pudimos actualizar la renovación automática de la sesión.');
  });
}

export function useSesion() {
  const [estado, setEstado] = useState<EstadoSesion>({
    session: null,
    cargandoSesion: true,
    errorSesion: null,
  });
  const solicitudRef = useRef(0);

  const cargarSesion = useCallback(async () => {
    const solicitud = ++solicitudRef.current;
    setEstado(prev => ({ ...prev, cargandoSesion: true, errorSesion: null }));
    try {
      const { data, error } = await recuperarSesion();
      if (error) throw error;
      if (solicitud === solicitudRef.current) {
        setEstado({ session: data.session, cargandoSesion: false, errorSesion: null });
      }
    } catch {
      if (solicitud === solicitudRef.current) {
        setEstado({
          session: null,
          cargandoSesion: false,
          errorSesion: 'No pudimos recuperar tu sesión. Inténtalo nuevamente.',
        });
      }
    }
  }, []);

  useEffect(() => {
    let activo = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, session) => {
      // La restauración explícita maneja INITIAL_SESSION y sus posibles errores.
      if (!activo || evento === 'INITIAL_SESSION') return;
      solicitudRef.current += 1;
      setEstado({ session, cargandoSesion: false, errorSesion: null });
    });
    void cargarSesion();
    return () => {
      activo = false;
      solicitudRef.current += 1;
      subscription.unsubscribe();
    };
  }, [cargarSesion]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let activo = true;
    const aplicarEstado = (estadoApp: string | null | undefined) => {
      if (activo) programarRenovacion(estadoApp === 'active');
    };
    const listener = AppState.addEventListener('change', aplicarEstado);
    aplicarEstado(AppState.currentState);
    return () => {
      activo = false;
      listener.remove();
      programarRenovacion(false);
    };
  }, []);

  return { ...estado, cargarSesion };
}
