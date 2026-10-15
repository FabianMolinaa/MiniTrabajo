import { supabase } from '../services/supabase';

export type EstadoTrabajo = 'disponible' | 'postulado' | 'aceptado' | 'completado' | 'rechazado';

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
  telefono?: string;
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
  lon2: number
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
  if (km === null || km === undefined) return 'Ubicación comunal';
  if (km < 1) return `A ${Math.round(km * 1000)} m`;
  return `A ${km.toFixed(1)} km`;
};

export const formatearMonedaCLP = (monto: number): string => {
  return `$${monto.toLocaleString('es-CL')}`;
};

export const fetchCategoriasFiltro = async (): Promise<CategoriaFiltro[]> => {
  const { data } = await supabase.from('categorias').select('id, nombre, icono').order('id');
  return data || [];
};

export const fetchComunasFiltro = async (): Promise<ComunaFiltro[]> => {
  const { data } = await supabase.from('comunas').select('id, nombre').order('nombre');
  return data || [];
};

export const fetchTrabajosMuro = async (
  usuarioId: string | null,
  coordsUsuario?: { latitude: number; longitude: number } | null
): Promise<TrabajoUI[]> => {
  let trabajosData: any[] = [];

  const { data: dataJoin, error: errorJoin } = await supabase
    .from('trabajos')
    .select(`
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
    `)
    .neq('estado', 'completado')
    .order('destacado', { ascending: false })
    .order('created_at', { ascending: false });

  if (errorJoin) {
    const { data: dataSimple } = await supabase
      .from('trabajos')
      .select('*')
      .neq('estado', 'completado')
      .order('destacado', { ascending: false })
      .order('created_at', { ascending: false });
    trabajosData = dataSimple || [];
  } else {
    trabajosData = dataJoin || [];
  }

  trabajosData = trabajosData.filter(
    (t) => String(t.estado || '').toLowerCase() !== 'completado'
  );

  const trabajoIds = trabajosData.map((t) => t.id);
  let trabajosConAceptado = new Set<string>();

  if (trabajoIds.length > 0) {
    const { data: postulacionesData } = await supabase
      .from('postulaciones')
      .select('trabajo_id, estado')
      .in('trabajo_id', trabajoIds)
      .eq('estado', 'aceptado');

    if (postulacionesData) {
      postulacionesData.forEach((p) => trabajosConAceptado.add(p.trabajo_id));
    }
  }

  const userIds = Array.from(new Set(trabajosData.map((t) => t.user_id).filter(Boolean)));
  const perfilesMap: Record<string, any> = {};

  if (userIds.length > 0) {
    const { data: perfilesData } = await supabase
      .from('perfiles')
      .select('id, nombre_completo, avatar_url, telefono')
      .in('id', userIds);

    if (perfilesData) {
      perfilesData.forEach((p) => {
        perfilesMap[p.id] = p;
      });
    }
  }

  let misPostulaciones: Record<string, { id: string; estado: string }> = {};
  if (usuarioId) {
    const { data: postData } = await supabase
      .from('postulaciones')
      .select('id, trabajo_id, estado')
      .eq('postulante_id', usuarioId);

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
        Number(lngFinal)
      );
    }

    const postulacion = misPostulaciones[t.id];
    let estadoFinal: EstadoTrabajo = 'disponible';
    if (postulacion) {
      if (postulacion.estado === 'aceptado') {
        estadoFinal = 'aceptado';
      } else if (postulacion.estado === 'rechazado') {
        estadoFinal = 'rechazado';
      } else {
        estadoFinal = 'postulado';
      }
    }

    const estaAceptado =
      trabajosConAceptado.has(t.id) ||
      String(t.estado || '').toLowerCase() === 'en_progreso';

    return {
      id: String(t.id),
      titulo: t.titulo || 'Sin título',
      descripcion: t.descripcion || '',
      monto: formatearMonedaCLP(Number(t.monto) || 0),
      montoRaw: Number(t.monto) || 0,
      categoria: t.categorias?.nombre || 'General',
      categoriaId: t.categoria_id || t.categorias?.id || 0,
      comuna: t.comunas?.nombre || 'Santiago',
      comunaId: t.comuna_id || t.comunas?.id || 0,
      solicitante: perfil.nombre_completo || 'Usuario',
      solicitanteId: t.user_id || '',
      avatarUrl: perfil.avatar_url,
      telefono: perfil.telefono,
      destacado: Boolean(t.destacado),
      estado: estadoFinal,
      estadoPublicacionOriginal: t.estado || 'disponible',
      tieneAceptado: estaAceptado,
      miPostulacionId: postulacion?.id,
      imagenes: Array.isArray(t.imagenes) ? t.imagenes : [],
      fechaPublicacion: t.created_at ? new Date(t.created_at).toLocaleDateString('es-CL') : 'Hoy',
      totalPostulantes: 0,
      latitud: latFinal,
      longitud: lngFinal,
      lat: latFinal,
      lng: lngFinal,
      distanciaKm: distKm,
    };
  });
};

export const fetchDetalleSolicitante = async (solicitanteId: string): Promise<SolicitanteDetalle | null> => {
  try {
    const { data: perfil, error } = await supabase
      .from('perfiles')
      .select('id, nombre_completo, avatar_url, comuna, sobre_mi, calificacion, total_resenas')
      .eq('id', solicitanteId)
      .single();

    if (error || !perfil) {
      const { data: perfilFallback } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', solicitanteId)
        .single();

      if (!perfilFallback) return null;

      return {
        id: perfilFallback.id,
        nombre: perfilFallback.nombre_completo || perfilFallback.nombre || 'Usuario',
        avatarUrl: perfilFallback.avatar_url,
        comuna: perfilFallback.comuna || 'Santiago',
        sobreMi: perfilFallback.sobre_mi || 'Sin descripción disponible.',
        calificacion: Number(perfilFallback.calificacion) || 5,
        totalResenas: Number(perfilFallback.total_resenas) || 0,
        resenas: [],
      };
    }

    const { data: resenasData } = await supabase
      .from('resenas')
      .select(`
        id,
        calificacion,
        comentario,
        created_at,
        perfiles:autor_id ( nombre, nombre_completo )
      `)
      .or(`usuario_evaluado_id.eq.${solicitanteId},evaluado_id.eq.${solicitanteId}`)
      .order('created_at', { ascending: false })
      .limit(10);

    const resenasMapeadas = (resenasData || []).map((r: any) => ({
      id: String(r.id),
      autor: r.perfiles?.nombre || r.perfiles?.nombre_completo || 'Usuario',
      calificacion: Number(r.calificacion) || 5,
      comentario: r.comentario || '',
    }));

    return {
      id: perfil.id,
      nombre: perfil.nombre_completo || 'Usuario',
      avatarUrl: perfil.avatar_url,
      comuna: perfil.comuna || 'Santiago',
      sobreMi: perfil.sobre_mi || 'Sin descripción disponible.',
      calificacion: Number(perfil.calificacion) || 5,
      totalResenas: Number(perfil.total_resenas) || resenasMapeadas.length,
      resenas: resenasMapeadas,
    };
  } catch {
    return null;
  }
};

export const postularATrabajo = async (trabajoId: string, postulanteId: string) => {
  // Comprobación de integridad: verificar si el trabajo ya fue tomado o cerrado
  const { data: trabajo } = await supabase
    .from('trabajos')
    .select('estado')
    .eq('id', trabajoId)
    .single();

  if (
    trabajo &&
    (trabajo.estado === 'en_progreso' || trabajo.estado === 'completado')
  ) {
    throw new Error('Esta tarea ya fue asignada y no acepta nuevas postulaciones.');
  }

  const { data: postulacionAceptada } = await supabase
    .from('postulaciones')
    .select('id')
    .eq('trabajo_id', trabajoId)
    .eq('estado', 'aceptado');

  if (postulacionAceptada && postulacionAceptada.length > 0) {
    throw new Error('Esta tarea ya cuenta con un trabajador seleccionado.');
  }

  return await supabase
    .from('postulaciones')
    .insert({
      trabajo_id: trabajoId,
      postulante_id: postulanteId,
      mensaje: 'Me postulo para realizar este trabajo.',
      estado: 'pendiente',
    })
    .select('id')
    .single();
};

export const retirarPostulacion = async (trabajoId: string, postulanteId: string) => {
  return await supabase
    .from('postulaciones')
    .delete()
    .eq('trabajo_id', trabajoId)
    .eq('postulante_id', postulanteId);
};

export const eliminarTrabajoPropio = async (trabajoId: string) => {
  const { data: aceptadas } = await supabase
    .from('postulaciones')
    .select('id')
    .eq('trabajo_id', trabajoId)
    .eq('estado', 'aceptado');

  if (aceptadas && aceptadas.length > 0) {
    throw new Error('No puedes eliminar una tarea que ya cuenta con un trabajador aceptado.');
  }

  await supabase.from('postulaciones').delete().eq('trabajo_id', trabajoId);
  const { error } = await supabase.from('trabajos').delete().eq('id', trabajoId);
  if (error) throw error;
  return { error: null };
};

export const editarTrabajoPropio = async (
  trabajoId: string,
  datos: { titulo: string; descripcion: string; monto: number }
) => {
  const { data: aceptadas } = await supabase
    .from('postulaciones')
    .select('id')
    .eq('trabajo_id', trabajoId)
    .eq('estado', 'aceptado');

  if (aceptadas && aceptadas.length > 0) {
    throw new Error('La tarea ya fue asignada a un trabajador y no puede ser modificada.');
  }

  const { data, error } = await supabase
    .from('trabajos')
    .update({
      titulo: datos.titulo.trim(),
      descripcion: datos.descripcion.trim(),
      monto: datos.monto,
    })
    .eq('id', trabajoId)
    .select();

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('No se pudo guardar la edición.');
  }

  return { data, error: null };
};