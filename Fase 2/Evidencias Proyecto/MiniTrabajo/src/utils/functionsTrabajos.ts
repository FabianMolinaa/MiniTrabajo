import { supabase } from "../services/supabase";

export type EstadoTrabajo =
  | "disponible"
  | "postulado"
  | "aceptado"
  | "completado"
  | "rechazado";

export interface TrabajoUI {
  id: string;
  titulo: string;
  descripcion: string;
  monto: string;
  montoRaw: number;
  categoria: string;
  categoriaId: number;
  comuna: string;
  comunaId: number;
  solicitante: string;
  solicitanteId: string;
  avatarUrl?: string;
  destacado: boolean;
  estado: EstadoTrabajo;
  estadoPublicacionOriginal?: string;
  tieneAceptado?: boolean;
  miPostulacionId?: string;
  imagenes: string[];
  fechaPublicacion: string;
  totalPostulantes: number;
  latitud?: number | null;
  longitud?: number | null;
  lat?: number | null;
  lng?: number | null;
  distanciaKm?: number | null;
}

export interface CategoriaFiltro {
  id: number;
  nombre: string;
  icono?: string;
}

export interface ComunaFiltro {
  id: number;
  nombre: string;
}

export interface SolicitanteDetalle {
  id: string;
  nombre: string;
  avatarUrl?: string;
  comuna: string;
  sobreMi: string;
  calificacion: number;
  totalResenas: number;
  resenas: Array<{
    id: string;
    autor: string;
    calificacion: number;
    comentario: string;
  }>;
}

export const calcularDistanciaKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const formatearDistancia = (km: number | null | undefined): string => {
  if (km === null || km === undefined) return "Ubicación comunal";
  if (km < 1) return `A ${Math.round(km * 1000)} m`;
  return `A ${km.toFixed(1)} km`;
};

export const formatearMonedaCLP = (monto: number): string => {
  return `$${monto.toLocaleString("es-CL")}`;
};

export const fetchCategoriasFiltro = async (): Promise<CategoriaFiltro[]> => {
  const { data } = await supabase
    .from("categorias")
    .select("id, nombre, icono")
    .order("id");
  return data || [];
};

export const fetchComunasFiltro = async (): Promise<ComunaFiltro[]> => {
  const { data } = await supabase
    .from("comunas")
    .select("id, nombre")
    .order("nombre");
  return data || [];
};

export const fetchTrabajosMuro = async (
  usuarioId: string | null,
  coordsUsuario?: { latitude: number; longitude: number } | null,
): Promise<TrabajoUI[]> => {
  let trabajosData: any[] = [];

  const { data: dataJoin, error: errorJoin } = await supabase
    .from("trabajos")
    .select(
      `
      id,
      user_id,
      titulo,
      descripcion,
      monto,
      destacado,
      estado,
      imagenes,
      created_at,
      latitud,
      longitud,
      categoria_id,
      comuna_id,
      categorias ( id, nombre ),
      comunas ( id, nombre )
    `,
    )
    .neq("estado", "completado")
    .order("destacado", { ascending: false })
    .order("created_at", { ascending: false });

  if (errorJoin) {
    const { data: dataSimple } = await supabase
      .from("trabajos")
      .select("*")
      .neq("estado", "completado")
      .order("destacado", { ascending: false })
      .order("created_at", { ascending: false });
    trabajosData = dataSimple || [];
  } else {
    trabajosData = dataJoin || [];
  }

  trabajosData = trabajosData.filter(
    (t) => String(t.estado || "").toLowerCase() !== "completado",
  );

  const trabajoIds = trabajosData.map((t) => t.id);
  let trabajosConAceptado = new Set<string>();

  if (trabajoIds.length > 0) {
    const { data: postulacionesData } = await supabase
      .from("postulaciones")
      .select("trabajo_id, estado")
      .in("trabajo_id", trabajoIds)
      .eq("estado", "aceptado");

    if (postulacionesData) {
      postulacionesData.forEach((p) => trabajosConAceptado.add(p.trabajo_id));
    }
  }

  const userIds = Array.from(
    new Set(trabajosData.map((t) => t.user_id).filter(Boolean)),
  );
  const perfilesMap: Record<string, any> = {};

  if (userIds.length > 0) {
    const { data: perfilesData, error: errorPerfiles } = await supabase
      .from("perfiles_publicos")
      .select("id, nombre, nombre_completo, avatar_url")
      .in("id", userIds);

    if (errorPerfiles) {
      console.warn("Error al consultar perfiles públicos:", {
        code: errorPerfiles.code,
        message: errorPerfiles.message,
      });

      throw new Error(
        "No se pudieron cargar los perfiles de los publicadores.",
      );
    }
  }

  let misPostulaciones: Record<string, { id: string; estado: string }> = {};
  if (usuarioId) {
    const { data: postData } = await supabase
      .from("postulaciones")
      .select("id, trabajo_id, estado")
      .eq("postulante_id", usuarioId);

    if (postData) {
      postData.forEach((p: any) => {
        misPostulaciones[p.trabajo_id] = { id: p.id, estado: p.estado };
      });
    }
  }

  return trabajosData.map((t: any) => {
    const perfil = perfilesMap[t.user_id] || {};
    const latFinal = t.latitud ?? t.lat ?? null;
    const lngFinal = t.longitud ?? t.lng ?? null;
    const tieneCoords = latFinal != null && lngFinal != null;
    let distKm: number | null = null;

    if (coordsUsuario && tieneCoords) {
      distKm = calcularDistanciaKm(
        coordsUsuario.latitude,
        coordsUsuario.longitude,
        Number(latFinal),
        Number(lngFinal),
      );
    }

    const postulacion = misPostulaciones[t.id];
    let estadoFinal: EstadoTrabajo = "disponible";
    if (postulacion) {
      if (postulacion.estado === "aceptado") {
        estadoFinal = "aceptado";
      } else if (postulacion.estado === "rechazado") {
        estadoFinal = "rechazado";
      } else {
        estadoFinal = "postulado";
      }
    }

    const estaAceptado =
      trabajosConAceptado.has(t.id) ||
      String(t.estado || "").toLowerCase() === "aceptado";

    return {
      id: String(t.id),
      titulo: t.titulo || "Sin título",
      descripcion: t.descripcion || "",
      monto: formatearMonedaCLP(Number(t.monto) || 0),
      montoRaw: Number(t.monto) || 0,
      categoria: t.categorias?.nombre || "General",
      categoriaId: t.categoria_id || t.categorias?.id || 0,
      comuna: t.comunas?.nombre || "Santiago",
      comunaId: t.comuna_id || t.comunas?.id || 0,
      solicitante: perfil.nombre_completo || "Usuario",
      solicitanteId: t.user_id || "",
      avatarUrl: perfil.avatar_url,
      destacado: Boolean(t.destacado),
      estado: estadoFinal,
      estadoPublicacionOriginal: t.estado || "disponible",
      tieneAceptado: estaAceptado,
      miPostulacionId: postulacion?.id,
      imagenes: Array.isArray(t.imagenes) ? t.imagenes : [],
      fechaPublicacion: t.created_at
        ? new Date(t.created_at).toLocaleDateString("es-CL")
        : "Hoy",
      totalPostulantes: 0,
      latitud: latFinal,
      longitud: lngFinal,
      lat: latFinal,
      lng: lngFinal,
      distanciaKm: distKm,
    };
  });
};

export const fetchDetalleSolicitante = async (
  solicitanteId: string
): Promise<SolicitanteDetalle | null> => {
  try {
    const { data: perfil, error } = await supabase
      .from('perfiles_publicos')
      .select(`
        id,
        nombre,
        nombre_completo,
        avatar_url,
        sobre_mi,
        calificacion,
        total_resenas,
        comunas(nombre)
      `)
      .eq('id', solicitanteId)
      .single();

    if (error) {
      console.warn('Error al consultar perfil del publicador:', {
        code: error.code,
        message: error.message,
      });
      return null;
    }

    if (!perfil) return null;

    const {
      data: resenasData,
      error: errorResenas,
    } = await supabase
      .from('resenas')
      .select(`
        id,
        calificacion,
        comentario,
        created_at,
        perfiles:perfiles_publicos!resenas_autor_id_fkey (
          nombre,
          nombre_completo
        )
      `)
      .or(
        `usuario_evaluado_id.eq.${solicitanteId},evaluado_id.eq.${solicitanteId}`
      )
      .order('created_at', { ascending: false })
      .limit(10);

    if (errorResenas) {
      console.warn('Error al consultar reseñas del publicador:', {
        code: errorResenas.code,
        message: errorResenas.message,
      });
      return null;
    }

    const resenasMapeadas = (resenasData || []).map((r: any) => {
      const autor = Array.isArray(r.perfiles)
        ? r.perfiles[0]
        : r.perfiles;

      return {
        id: String(r.id),
        autor: autor?.nombre || autor?.nombre_completo || 'Usuario',
        calificacion: Number(r.calificacion) || 5,
        comentario: r.comentario || '',
      };
    });

    const comuna = Array.isArray(perfil.comunas)
      ? perfil.comunas[0]
      : perfil.comunas;

    return {
      id: perfil.id,
      nombre: perfil.nombre || perfil.nombre_completo || 'Usuario',
      avatarUrl: perfil.avatar_url,
      comuna: comuna?.nombre || 'Sin comuna',
      sobreMi: perfil.sobre_mi || 'Sin descripción disponible.',
      calificacion: Number(perfil.calificacion) || 0,
      totalResenas:
        Number(perfil.total_resenas) || resenasMapeadas.length,
      resenas: resenasMapeadas,
    };
  } catch (error) {
    console.error('Error al cargar detalle del publicador:', error);
    return null;
  }
};

export const postularATrabajo = async (
  trabajoId: string,
  postulanteId: string,
) => {
  // Comprobación de integridad: verificar si el trabajo ya fue tomado o cerrado
  const { data: trabajo } = await supabase
    .from("trabajos")
    .select("estado")
    .eq("id", trabajoId)
    .single();

  if (
    trabajo &&
    (trabajo.estado === "aceptado" || trabajo.estado === "completado")
  ) {
    throw new Error(
      "Esta tarea ya fue asignada y no acepta nuevas postulaciones.",
    );
  }

  const { data: postulacionAceptada } = await supabase
    .from("postulaciones")
    .select("id")
    .eq("trabajo_id", trabajoId)
    .eq("estado", "aceptado");

  if (postulacionAceptada && postulacionAceptada.length > 0) {
    throw new Error("Esta tarea ya cuenta con un trabajador seleccionado.");
  }

  return await supabase
    .from("postulaciones")
    .insert({
      trabajo_id: trabajoId,
      postulante_id: postulanteId,
      mensaje: "Me postulo para realizar este trabajo.",
      estado: "pendiente",
    })
    .select("id")
    .single();
};

export const retirarPostulacion = async (
  trabajoId: string,
  _postulanteId?: string
) => {
  const { error } = await supabase.rpc(
    'retirar_postulacion',
    {
      p_trabajo_id: trabajoId,
    }
  );

  if (error) {
    console.warn('Error al retirar postulación:', {
      code: error.code,
      message: error.message,
    });

    if (error.code === '42501') {
      throw new Error(
        'Debes iniciar sesión para retirar tu postulación.'
      );
    }

    if (error.code === '55000') {
      throw new Error(
        'No puedes retirar esta postulación. Si ya estás asignado, comunícate con el publicador para cancelar el acuerdo.'
      );
    }

    throw new Error(
      'No pudimos retirar la postulación. Actualiza la tarea y comprueba su estado.'
    );
  }

  // Mantener la respuesta que espera TrabajosScreen.
  return { error: null };
};

export const eliminarTrabajoPropio = async (
  trabajoId: string
) => {
  const { error } = await supabase.rpc(
    'eliminar_trabajo',
    {
      p_trabajo_id: trabajoId,
    }
  );

  if (error) {
    console.warn('Error al eliminar trabajo:', {
      code: error.code,
      message: error.message,
    });

    if (error.code === '42501') {
      throw new Error(
        'No tienes autorización para eliminar este trabajo o ya no existe.'
      );
    }

    if (error.code === '55000') {
      throw new Error(
        'Solo puedes eliminar trabajos disponibles, sin acuerdos activos ni reseñas. Actualiza la publicación antes de continuar.'
      );
    }

    throw new Error(
      'No pudimos eliminar el trabajo. Actualiza la lista y comprueba si todavía aparece.'
    );
  }

  return { error: null };
};

export const editarTrabajoPropio = async (
  trabajoId: string,
  datos: { titulo: string; descripcion: string; monto: number },
) => {
  const { data: aceptadas } = await supabase
    .from("postulaciones")
    .select("id")
    .eq("trabajo_id", trabajoId)
    .eq("estado", "aceptado");

  if (aceptadas && aceptadas.length > 0) {
    throw new Error(
      "La tarea ya fue asignada a un trabajador y no puede ser modificada.",
    );
  }

  const { data, error } = await supabase
    .from("trabajos")
    .update({
      titulo: datos.titulo.trim(),
      descripcion: datos.descripcion.trim(),
      monto: datos.monto,
    })
    .eq("id", trabajoId)
    .select();

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("No se pudo guardar la edición.");
  }

  return { data, error: null };
};
