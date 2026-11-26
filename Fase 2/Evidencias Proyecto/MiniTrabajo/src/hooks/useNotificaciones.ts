import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  fetchNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  suscribirNotificaciones,
  type Notificacion,
} from "../services/notificaciones";
import {
  activarPushParaUsuario,
  escucharToquesNotificacion,
} from "../services/pushNotificaciones";

export function useNotificaciones(
  usuarioId: string,
  alTocarPush?: () => void,
) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const solicitudRef = useRef(0);
  const alTocarPushRef = useRef(alTocarPush);
  alTocarPushRef.current = alTocarPush;

  const cargar = useCallback(async () => {
    const solicitud = ++solicitudRef.current;
    setError(null);
    try {
      const datos = await fetchNotificaciones(usuarioId);
      if (solicitud === solicitudRef.current) setNotificaciones(datos);
    } catch (e) {
      if (solicitud === solicitudRef.current) {
        setError(e instanceof Error ? e.message : "Error desconocido");
      }
    } finally {
      if (solicitud === solicitudRef.current) setCargando(false);
    }
  }, [usuarioId]);

  // Carga inicial + tiempo real + recarga al volver a primer plano.
  useEffect(() => {
    void cargar();

    const desuscribir = suscribirNotificaciones(usuarioId, (n, evento) => {
      setNotificaciones((prev) => {
        if (evento === "INSERT") {
          return prev.some((p) => p.id === n.id) ? prev : [n, ...prev];
        }
        return prev.map((p) => (p.id === n.id ? { ...p, ...n } : p));
      });
    });

    const listener = AppState.addEventListener("change", (estado) => {
      if (estado === "active") void cargar();
    });

    return () => {
      solicitudRef.current += 1;
      desuscribir();
      listener.remove();
    };
  }, [usuarioId, cargar]);

  // Registro del dispositivo para push y manejo de toques.
  useEffect(() => {
    void activarPushParaUsuario();
    return escucharToquesNotificacion(() => {
      void cargar();
      alTocarPushRef.current?.();
    });
  }, [usuarioId, cargar]);

  const noLeidas = useMemo(
    () => notificaciones.filter((n) => !n.leida).length,
    [notificaciones],
  );

  const marcarLeida = useCallback(async (id: string) => {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n)),
    );
    try {
      await marcarNotificacionLeida(id);
    } catch {
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: false } : n)),
      );
    }
  }, []);

  const marcarTodas = useCallback(async () => {
    const anteriores = notificaciones;
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    try {
      await marcarTodasLeidas(usuarioId);
    } catch {
      setNotificaciones(anteriores);
    }
  }, [notificaciones, usuarioId]);

  return {
    notificaciones,
    noLeidas,
    cargando,
    error,
    recargar: cargar,
    marcarLeida,
    marcarTodas,
  };
}
