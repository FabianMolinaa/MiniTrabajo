import { supabase } from "./supabase";
import type { PostulanteBD } from "./postulaciones";
import { leerCalificacionResena } from "../utils/calificaciones";
import { aproximarUbicacion, esUbicacionEnRM } from "../utils/ubicacion";
import { calcularDistanciaKm, formatearMonedaCLP } from "../utils/functionsTrabajos";

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
  comunaLatitud?: number | null;
  comunaLongitud?: number | null;
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
  distanciaKm?: number | null;
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

type RelacionMuro<T> = T | T[] | null;

interface PerfilMuroFila {
  id: string;
  nombre: string | null;
  nombre_completo: string | null;
  avatar_url: string | null;
}

interface TrabajoMuroFila {
  id: string;
  user_id: string;
  titulo: string;
  descripcion: string;
  monto: number;
  destacado: boolean | null;
  estado: "disponible" | "aceptado" | "completado";
  imagenes: string[] | null;
  created_at: string;
  latitud: number | string | null;
  longitud: number | string | null;
  categoria_id: number;
  comuna_id: number;
  categorias: RelacionMuro<{ id: number; nombre: string }>;
  comunas: RelacionMuro<{
    id: number;
    nombre: string;
    latitud: number | null;
    longitud: number | null;
  }>;
}

interface PostulacionMuroFila {
  id: string;
  trabajo_id: string;
  estado: "pendiente" | "aceptado" | "rechazado" | null;
}

interface PerfilSolicitanteFila extends PerfilMuroFila {
  sobre_mi: string | null;
  calificacion: number | string | null;
  total_resenas: number | null;
  comunas: RelacionMuro<{ nombre: string }>;
}

interface ResenaSolicitanteFila {
  id: string;
  calificacion: number;
  comentario: string;
  perfiles: RelacionMuro<{
    nombre: string | null;
    nombre_completo: string | null;
  }>;
}

export const fetchTrabajosMuro = async (
  usuarioId: string | null,
  coordsUsuario?: { latitude: number; longitude: number } | null,
): Promise<TrabajoUI[]> => {
  const mensajeError = "No pudimos cargar los trabajos. Inténtalo nuevamente.";
  const { data: trabajos, error } = await supabase
    .from("trabajos")
    .select(
      `
      id, user_id, titulo, descripcion, monto, destacado, estado,
      imagenes, created_at, latitud, longitud, categoria_id, comuna_id,
      categorias (id, nombre), comunas (id, nombre, latitud, longitud)
    `,
    )
    .neq("estado", "completado")
    .order("destacado", { ascending: false })
    .order("created_at", { ascending: false })
    .overrideTypes<TrabajoMuroFila[], { merge: false }>();
  if (error || trabajos === null) {
    console.warn("Error al consultar el muro:", { code: error?.code });
    throw new Error(mensajeError);
  }
  if (trabajos.length === 0) return [];

  const userIds = Array.from(new Set(trabajos.map((t) => t.user_id)));
  const { data: perfiles, error: errorPerfiles } = await supabase
    .from("perfiles_publicos")
    .select("id, nombre, nombre_completo, avatar_url")
    .in("id", userIds)
    .overrideTypes<PerfilMuroFila[], { merge: false }>();
  if (errorPerfiles || perfiles === null) {
    console.warn("Error al consultar publicadores:", {
      code: errorPerfiles?.code,
    });
    throw new Error(mensajeError);
  }
  const perfilesMap = new Map<string, PerfilMuroFila>();
  perfiles.forEach((perfil) => perfilesMap.set(perfil.id, perfil));
  const misPostulaciones = new Map<string, { id: string; estado: string }>();
  if (usuarioId) {
    const { data: posts, error: errorPosts } = await supabase
      .from("postulaciones")
      .select("id, trabajo_id, estado")
      .eq("postulante_id", usuarioId)
      .in(
        "trabajo_id",
        trabajos.map((t) => t.id),
      )
      .overrideTypes<PostulacionMuroFila[], { merge: false }>();
    if (errorPosts || posts === null) {
      console.warn("Error al consultar postulaciones propias:", {
        code: errorPosts?.code,
      });
      throw new Error(mensajeError);
    }
    posts.forEach((post) => {
      if (
        post.estado !== "pendiente" &&
        post.estado !== "aceptado" &&
        post.estado !== "rechazado"
      ) {
        throw new Error(mensajeError);
      }
      misPostulaciones.set(post.trabajo_id, {
        id: post.id,
        estado: post.estado,
      });
    });
  }
  return trabajos.map((t) => {
    const perfil = perfilesMap.get(t.user_id);
    const comuna = Array.isArray(t.comunas) ? t.comunas[0] : t.comunas;
    const categoria = Array.isArray(t.categorias)
      ? t.categorias[0]
      : t.categorias;

    const lat = Number(t.latitud);
    const lng = Number(t.longitud);
    const gps = esUbicacionEnRM(lat, lng)
      ? aproximarUbicacion({ latitude: lat, longitude: lng })
      : null;

    const comunaLat = Number(comuna?.latitud);
    const comunaLng = Number(comuna?.longitud);
    const comunaValida = esUbicacionEnRM(comunaLat, comunaLng);

    let distanciaKm: number | null = null;
    if (
      gps &&
      coordsUsuario &&
      Number.isFinite(coordsUsuario.latitude) &&
      Number.isFinite(coordsUsuario.longitude)
    ) {
      distanciaKm = calcularDistanciaKm(
        coordsUsuario.latitude,
        coordsUsuario.longitude,
        gps.latitude,
        gps.longitude,
      );
    }

    const postulacion = misPostulaciones.get(t.id);
    let estado: EstadoTrabajo = "disponible";

    if (postulacion) {
      estado =
        postulacion.estado === "aceptado"
          ? "aceptado"
          : postulacion.estado === "rechazado"
            ? "rechazado"
            : "postulado";
    }

    return {
      id: String(t.id),
      titulo: t.titulo || "Sin título",
      descripcion: t.descripcion || "",
      monto: formatearMonedaCLP(Number(t.monto) || 0),
      montoRaw: Number(t.monto) || 0,
      categoria: categoria?.nombre || "General",
      categoriaId: t.categoria_id || categoria?.id || 0,
      comuna: comuna?.nombre || "Sin comuna",
      comunaId: t.comuna_id || comuna?.id || 0,
      comunaLatitud: comunaValida ? comunaLat : null,
      comunaLongitud: comunaValida ? comunaLng : null,
      solicitante: perfil?.nombre || perfil?.nombre_completo || "Usuario",
      solicitanteId: t.user_id || "",
      avatarUrl: perfil?.avatar_url || undefined,
      destacado: Boolean(t.destacado),
      estado,
      estadoPublicacionOriginal: t.estado || "disponible",
      tieneAceptado: t.estado === "aceptado",
      miPostulacionId: postulacion?.id,
      imagenes: Array.isArray(t.imagenes) ? t.imagenes : [],
      fechaPublicacion: t.created_at
        ? new Date(t.created_at).toLocaleDateString("es-CL")
        : "Hoy",
      totalPostulantes: 0,
      latitud: gps?.latitude ?? null,
      longitud: gps?.longitude ?? null,
      distanciaKm,
    };
  });
};

export const fetchDetalleSolicitante = async (
  solicitanteId: string,
): Promise<SolicitanteDetalle | null> => {
  const mensajeError =
    "No pudimos cargar el perfil del publicador. Inténtalo nuevamente.";
  const { data: perfil, error } = await supabase
    .from("perfiles_publicos")
    .select(
      "id, nombre, nombre_completo, avatar_url, sobre_mi, calificacion, total_resenas, comunas(nombre)",
    )
    .eq("id", solicitanteId)
    .maybeSingle()
    .overrideTypes<PerfilSolicitanteFila, { merge: false }>();
  if (error) {
    console.warn("Error al consultar el publicador:", { code: error.code });
    throw new Error(mensajeError);
  }
  if (perfil === null) return null;
  const { data: resenas, error: errorResenas } = await supabase
    .from("resenas")
    .select(
      `id, calificacion, comentario,
      perfiles:perfiles_publicos!resenas_autor_id_fkey (nombre, nombre_completo)`,
    )
    .or(
      `usuario_evaluado_id.eq.${solicitanteId},evaluado_id.eq.${solicitanteId}`,
    )
    .order("created_at", { ascending: false })
    .limit(10)
    .overrideTypes<ResenaSolicitanteFila[], { merge: false }>();
  if (errorResenas || resenas === null) {
    console.warn("Error al consultar reseñas del publicador:", {
      code: errorResenas?.code,
    });
    throw new Error(mensajeError);
  }
  const calificacion = Number(perfil.calificacion ?? 0);
  const total = perfil.total_resenas ?? 0;
  if (
    !Number.isFinite(calificacion) ||
    calificacion < 0 ||
    calificacion > 5 ||
    !Number.isSafeInteger(total) ||
    total < 0
  ) {
    throw new Error(mensajeError);
  }
  const comuna = Array.isArray(perfil.comunas)
    ? perfil.comunas[0]
    : perfil.comunas;
  return {
    id: perfil.id,
    nombre: perfil.nombre || perfil.nombre_completo || "Usuario",
    avatarUrl: perfil.avatar_url ?? undefined,
    comuna: comuna?.nombre || "Sin comuna",
    sobreMi: perfil.sobre_mi || "Sin descripción disponible.",
    calificacion,
    totalResenas: total,
    resenas: resenas.map((resena) => {
      const autor = Array.isArray(resena.perfiles)
        ? resena.perfiles[0]
        : resena.perfiles;
      const nota = Number(resena.calificacion);
      if (!Number.isInteger(nota) || nota < 1 || nota > 5)
        throw new Error(mensajeError);
      return {
        id: resena.id,
        autor: autor?.nombre || autor?.nombre_completo || "Usuario",
        calificacion: nota,
        comentario: resena.comentario,
      };
    }),
  };
};

export const eliminarTrabajoPropio = async (trabajoId: string) => {
  const { error } = await supabase.rpc("eliminar_trabajo", {
    p_trabajo_id: trabajoId,
  });

  if (error) {
    console.warn("Error al eliminar trabajo:", {
      code: error.code,
      message: error.message,
    });

    if (error.code === "42501") {
      throw new Error(
        "No tienes autorización para eliminar este trabajo o ya no existe.",
      );
    }

    if (error.code === "55000") {
      throw new Error(
        "Solo puedes eliminar trabajos disponibles, sin acuerdos activos ni reseñas. Actualiza la publicación antes de continuar.",
      );
    }

    throw new Error(
      "No pudimos eliminar el trabajo. Actualiza la lista y comprueba si todavía aparece.",
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

export const cancelarAcuerdoTrabajador = async (
  trabajoId: string,
  trabajadorId?: string | null
) => {
  if (!trabajadorId) {
    throw new Error(
      'No se identificó al trabajador asignado. Actualiza la tarea antes de cancelar.'
    );
  }

  const { error } = await supabase.rpc(
    'cancelar_acuerdo',
    {
      p_trabajo_id: trabajoId,
      p_trabajador_id: trabajadorId,
    }
  );

  if (error) {
    console.warn('Error al cancelar acuerdo:', {
      code: error.code,
      message: error.message,
    });

    if (error.code === '42501') {
      throw new Error(
        'No tienes autorización para cancelar este acuerdo.'
      );
    }

    if (error.code === '55000') {
      throw new Error(
        'El acuerdo cambió o requiere revisión. Actualiza la tarea antes de continuar.'
      );
    }

    if (error.code === '22023') {
      throw new Error(
        'No se identificó correctamente el acuerdo que deseas cancelar.'
      );
    }

    throw new Error(
      'No pudimos cancelar el acuerdo. Actualiza la tarea y comprueba su estado.'
    );
  }
};

export interface MiPublicacion {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  monto: string;
  montoRaw: number;
  fecha: string;
  estado: string;
  trabajador_id?: string | null;
  trabajador_nombre?: string | null;
  trabajador_avatar?: string | null;
  imagenes?: string[];
  total_postulantes?: number;
  calificadoPorMi?: boolean;
  miCalificacion?: {
    calificacion: number;
    comentario: string;
  } | null;
}

interface PublicacionFila {
  id: string;
  titulo: string;
  descripcion: string;
  monto: number;
  estado: 'disponible' | 'aceptado' | 'completado';
  trabajador_id: string | null;
  imagenes: string[] | null;
  created_at: string;
  categorias: { nombre: string } | { nombre: string }[] | null;
  postulaciones: { id: string; estado: PostulanteBD['estado'] | null; postulante_id: string }[];
}

export const fetchPublicacionesUsuario = async (userId: string): Promise<MiPublicacion[]> => {
  const mensajeError = 'No pudimos cargar tus publicaciones. Inténtalo nuevamente.';
  const { data: trabajos, error } = await supabase
    .from('trabajos')
    .select(`
      id, titulo, descripcion, monto, estado, trabajador_id,
      imagenes, created_at, categorias(nombre),
      postulaciones(id, estado, postulante_id)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .overrideTypes<PublicacionFila[], { merge: false }>();

  if (error) {
    console.warn('Error al consultar publicaciones propias:', { code: error.code });
    throw new Error(mensajeError);
  }
  if (trabajos === null) throw new Error(mensajeError);
  if (trabajos.length === 0) return [];

  for (const trabajo of trabajos) {
    if (
      !['disponible', 'aceptado', 'completado'].includes(trabajo.estado)
      || (trabajo.estado === 'disponible') !== (trabajo.trabajador_id === null)
    ) {
      throw new Error(mensajeError);
    }
  }

  const trabajadorIds = Array.from(new Set(
    trabajos.map(trabajo => trabajo.trabajador_id).filter((id): id is string => id !== null)
  ));
  const [perfilesRes, resenasRes] = await Promise.all([
    trabajadorIds.length > 0
      ? supabase.from('perfiles_publicos')
        .select('id, nombre, nombre_completo, avatar_url')
        .in('id', trabajadorIds)
        .overrideTypes<PerfilMuroFila[], { merge: false }>()
      : Promise.resolve({ data: [], error: null }),
    supabase.from('resenas')
      .select('trabajo_id, calificacion, comentario')
      .eq('autor_id', userId)
      .in('trabajo_id', trabajos.map(trabajo => trabajo.id))
      .overrideTypes<{
          trabajo_id: string | null;
          calificacion: number | string;
          comentario: string;
        }[], { merge: false }>(),
  ]);

  if (perfilesRes.error || resenasRes.error) {
    console.warn('Error al completar las publicaciones propias:', {
      code: perfilesRes.error?.code ?? resenasRes.error?.code,
    });
    throw new Error(mensajeError);
  }
  if (perfilesRes.data === null || resenasRes.data === null) throw new Error(mensajeError);

  const perfilesMap = new Map<string, PerfilMuroFila>();
  perfilesRes.data.forEach(perfil => perfilesMap.set(perfil.id, perfil));
  const resenasMap = new Map<string, { calificacion: number; comentario: string }>();
  resenasRes.data.forEach(resena => {
    if (resena.trabajo_id === null) throw new Error(mensajeError);
    resenasMap.set(resena.trabajo_id, {
      calificacion: leerCalificacionResena(resena.calificacion),
      comentario: resena.comentario,
    });
  });

  return trabajos.map(trabajo => {
    const categoria = Array.isArray(trabajo.categorias)
      ? trabajo.categorias[0] ?? null
      : trabajo.categorias;
    const trabajador = trabajo.trabajador_id ? perfilesMap.get(trabajo.trabajador_id) : null;
    const resena = resenasMap.get(trabajo.id);
    return {
      id: trabajo.id,
      titulo: trabajo.titulo,
      descripcion: trabajo.descripcion,
      categoria: categoria?.nombre || 'General',
      monto: `$${Number(trabajo.monto).toLocaleString('es-CL')}`,
      montoRaw: trabajo.monto,
      fecha: new Date(trabajo.created_at).toLocaleDateString('es-CL'),
      estado: trabajo.estado,
      trabajador_id: trabajo.trabajador_id,
      trabajador_nombre: trabajador?.nombre || trabajador?.nombre_completo || null,
      trabajador_avatar: trabajador?.avatar_url || null,
      imagenes: trabajo.imagenes ?? [],
      total_postulantes: trabajo.postulaciones.length,
      calificadoPorMi: Boolean(resena),
      miCalificacion: resena ?? null,
    };
  });
};
