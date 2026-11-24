import { supabase } from "./supabase";

export type TipoNotificacion =
  | "nueva_postulacion"
  | "postulacion_aceptada"
  | "postulacion_rechazada"
  | "acuerdo_cancelado"
  | "calificacion_recibida"
  | "compra_aprobada";

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  datos: Record<string, unknown>;
  leida: boolean;
  created_at: string;
}

const CAMPOS = "id, tipo, titulo, mensaje, datos, leida, created_at";

export const fetchNotificaciones = async (
  usuarioId: string,
  limite = 50,
): Promise<Notificacion[]> => {
  const { data, error } = await supabase
    .from("notificaciones")
    .select(CAMPOS)
    .eq("usuario_id", usuarioId)
    .order("created_at", { ascending: false })
    .limit(limite)
    .overrideTypes<Notificacion[], { merge: false }>();

  if (error || data === null) {
    console.warn("Error al consultar notificaciones:", {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
    });
    throw new Error("No pudimos cargar tus notificaciones.");
  }
  return data;
};

export const marcarNotificacionLeida = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("notificaciones")
    .update({ leida: true })
    .eq("id", id);
  if (error) {
    console.warn("Error al marcar notificación:", { code: error.code });
    throw new Error("No pudimos actualizar la notificación.");
  }
};

export const marcarTodasLeidas = async (usuarioId: string): Promise<void> => {
  const { error } = await supabase
    .from("notificaciones")
    .update({ leida: true })
    .eq("usuario_id", usuarioId)
    .eq("leida", false);
  if (error) {
    console.warn("Error al marcar notificaciones:", { code: error.code });
    throw new Error("No pudimos actualizar tus notificaciones.");
  }
};

/** Escucha en tiempo real las notificaciones nuevas o actualizadas del usuario. */
export const suscribirNotificaciones = (
  usuarioId: string,
  onCambio: (notificacion: Notificacion, evento: "INSERT" | "UPDATE") => void,
): (() => void) => {
  const canal = supabase
    .channel(`notificaciones:${usuarioId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notificaciones",
        filter: `usuario_id=eq.${usuarioId}`,
      },
      (payload) => onCambio(payload.new as Notificacion, "INSERT"),
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "notificaciones",
        filter: `usuario_id=eq.${usuarioId}`,
      },
      (payload) => onCambio(payload.new as Notificacion, "UPDATE"),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(canal);
  };
};

export const registrarTokenPush = async (
  token: string,
  plataforma: string,
): Promise<void> => {
  const { error } = await supabase.rpc("registrar_push_token", {
    p_token: token,
    p_plataforma: plataforma,
  });
  if (error) {
    console.warn("Error al registrar token push:", { code: error.code });
    throw new Error("No pudimos activar las notificaciones push.");
  }
};

export const eliminarTokenPush = async (token: string): Promise<void> => {
  const { error } = await supabase.rpc("eliminar_push_token", {
    p_token: token,
  });
  if (error) {
    console.warn("Error al eliminar token push:", { code: error.code });
  }
};
