import { supabase } from '../services/supabase';

export interface ResenaItem {
  id: string;
  autor: string;
  avatarUrl?: string | null;
  calificacion: number;
  fecha: string;
  comentario: string;
}

export interface TrabajoRealizadoItem {
  id: string;
  titulo: string;
  categoria: string;
  fecha: string;
  monto: string;
  solicitanteId: string;
  solicitanteNombre: string;
  solicitanteAvatar?: string | null;
  calificadoPorMi: boolean;
  miCalificacion?: {
    calificacion: number;
    comentario: string;
  } | null;
}

export interface PostulanteBD {
  id: string;
  postulante_id: string;
  nombre: string;
  avatar_url?: string | null;
  comuna: string;
  sobre_mi: string;
  calificacion: string;
  trabajos_realizados: number;
  telefono: string;
  mensaje: string;
  estado: 'pendiente' | 'aceptado' | 'rechazado';
}

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

export interface PerfilData {
  nombre: string;
  sobre_mi: string;
  avatar_url: string | null;
  calificacion: string;
  total_resenas: number;
  trabajos_realizados: number;
  creditos: number;
  comuna_id: number;
  comuna_nombre: string;
}

export const fetchPerfilUsuario = async (userId: string): Promise<PerfilData | null> => {
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('*, comunas(nombre)')
    .eq('id', userId)
    .single();

  if (!perfil) return null;

  // Calculamos el promedio y conteo real de reseñas para tener el dato más fresco
  const { data: resenas } = await supabase
    .from('resenas')
    .select('calificacion')
    .or(`usuario_evaluado_id.eq.${userId},evaluado_id.eq.${userId}`);

  let calificacionCalculada = '0.0';
  let totalResenas = 0;

  if (resenas && resenas.length > 0) {
    totalResenas = resenas.length;
    const suma = resenas.reduce((acc, r) => acc + (Number(r.calificacion) || 5), 0);
    calificacionCalculada = (suma / totalResenas).toFixed(1);
  } else if (perfil.calificacion != null && Number(perfil.calificacion) > 0) {
    calificacionCalculada = Number(perfil.calificacion).toFixed(1);
    totalResenas = Number(perfil.total_resenas) || 0;
  }

  return {
    nombre: perfil.nombre || perfil.nombre_completo || 'Usuario',
    sobre_mi: perfil.sobre_mi || 'Sin descripción aún.',
    avatar_url: perfil.avatar_url,
    calificacion: calificacionCalculada,
    total_resenas: totalResenas,
    trabajos_realizados: perfil.trabajos_realizados || 0,
    creditos: perfil.creditos ?? 10,
    comuna_id: perfil.comuna_id || 1,
    comuna_nombre: perfil.comunas?.nombre || 'Santiago',
  };
};

export const fetchPublicacionesUsuario = async (userId: string): Promise<MiPublicacion[]> => {
  const { data: trabajos } = await supabase
    .from('trabajos')
    .select(`
      id,
      titulo,
      descripcion,
      monto,
      estado,
      trabajador_id,
      imagenes,
      created_at,
      categorias(nombre),
      postulaciones(id, estado, postulante_id)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!trabajos) return [];

  // Obtener IDs de trabajadores asignados
  const trabajadorIds = Array.from(
    new Set(
      trabajos
        .map((t: any) => {
          const postAceptada = (t.postulaciones || []).find((p: any) => p.estado === 'aceptado');
          return t.trabajador_id || postAceptada?.postulante_id || null;
        })
        .filter(Boolean)
    )
  );

  const perfilesTrabajadores: Record<string, any> = {};
  if (trabajadorIds.length > 0) {
    const { data: perfilesData } = await supabase
      .from('perfiles')
      .select('id, nombre, nombre_completo, avatar_url')
      .in('id', trabajadorIds);

    if (perfilesData) {
      perfilesData.forEach((p) => {
        perfilesTrabajadores[p.id] = p;
      });
    }
  }

  // Obtener reseñas hechas por mí (empleador) para mis publicaciones completadas
  const trabajoIds = trabajos.map((t: any) => t.id);
  const { data: misResenas } = await supabase
    .from('resenas')
    .select('trabajo_id, calificacion, comentario')
    .eq('autor_id', userId)
    .in('trabajo_id', trabajoIds);

  const resenasMap: Record<string, { calificacion: number; comentario: string }> = {};
  if (misResenas) {
    misResenas.forEach((r: any) => {
      resenasMap[r.trabajo_id] = {
        calificacion: Number(r.calificacion) || 5,
        comentario: r.comentario || '',
      };
    });
  }

  return trabajos.map((t: any) => {
    const postAceptada = (t.postulaciones || []).find((p: any) => p.estado === 'aceptado');
    let estadoCalculado = t.estado;
    let trabajadorId = t.trabajador_id || postAceptada?.postulante_id || null;

    if (t.estado !== 'completado') {
      estadoCalculado = postAceptada || t.estado === 'en_progreso' ? 'aceptado' : 'disponible';
    }

    const perfTrabajador = trabajadorId ? perfilesTrabajadores[trabajadorId] : null;
    const resena = resenasMap[t.id];

    return {
      id: String(t.id),
      titulo: t.titulo,
      descripcion: t.descripcion || '',
      categoria: t.categorias?.nombre || 'General',
      monto: `$${Number(t.monto || 0).toLocaleString('es-CL')}`,
      montoRaw: Number(t.monto || 0),
      fecha: new Date(t.created_at).toLocaleDateString('es-CL'),
      estado: estadoCalculado,
      trabajador_id: trabajadorId,
      trabajador_nombre: perfTrabajador ? (perfTrabajador.nombre || perfTrabajador.nombre_completo) : null,
      trabajador_avatar: perfTrabajador ? perfTrabajador.avatar_url : null,
      imagenes: Array.isArray(t.imagenes) ? t.imagenes : [],
      total_postulantes: (t.postulaciones || []).length,
      calificadoPorMi: Boolean(resena),
      miCalificacion: resena || null,
    };
  });
};

export const fetchPostulantesDeTarea = async (trabajoId: string): Promise<PostulanteBD[]> => {
  try {
    const { data: posts, error } = await supabase
      .from('postulaciones')
      .select('id, postulante_id, mensaje, estado')
      .eq('trabajo_id', trabajoId)
      .order('created_at', { ascending: false });

    if (error || !posts || posts.length === 0) return [];

    const postulantesIds = Array.from(new Set(posts.map((p) => p.postulante_id)));

    const { data: perfilesData } = await supabase
      .from('perfiles')
      .select('id, nombre, nombre_completo, avatar_url, comuna, sobre_mi, calificacion, trabajos_realizados, telefono')
      .in('id', postulantesIds);

    const perfilesMap: Record<string, any> = {};
    if (perfilesData) {
      perfilesData.forEach((p) => {
        perfilesMap[p.id] = p;
      });
    }

    return posts.map((p: any) => {
      const perf = perfilesMap[p.postulante_id] || {};
      return {
        id: String(p.id),
        postulante_id: p.postulante_id,
        nombre: perf.nombre || perf.nombre_completo || 'Postulante',
        avatar_url: perf.avatar_url || null,
        comuna: perf.comuna || 'Santiago',
        sobre_mi: perf.sobre_mi || 'Sin descripción',
        calificacion: Number(perf.calificacion || 5).toFixed(1),
        trabajos_realizados: perf.trabajos_realizados || 0,
        telefono: perf.telefono || '',
        mensaje: p.mensaje || 'Hola, me interesa realizar esta tarea.',
        estado: p.estado,
      };
    });
  } catch (err) {
    console.error('Error cargando postulantes:', err);
    return [];
  }
};

export const fetchResenasUsuario = async (userId: string): Promise<ResenaItem[]> => {
  const { data } = await supabase
    .from('resenas')
    .select('id, calificacion, comentario, created_at, perfiles:autor_id(id, nombre, nombre_completo, avatar_url)')
    .or(`usuario_evaluado_id.eq.${userId},evaluado_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (!data) return [];

  return data.map((r: any) => ({
    id: String(r.id),
    autor: r.perfiles?.nombre || r.perfiles?.nombre_completo || 'Usuario',
    avatarUrl: r.perfiles?.avatar_url || null,
    calificacion: Number(r.calificacion) || 5,
    fecha: new Date(r.created_at).toLocaleDateString('es-CL'),
    comentario: r.comentario || '',
  }));
};

export const fetchHistorialTrabajosHechos = async (userId: string): Promise<TrabajoRealizadoItem[]> => {
  // 1. Trabajos completados asignados directamente
  const { data: trabajosDirectos } = await supabase
    .from('trabajos')
    .select('id, titulo, monto, created_at, user_id, categorias(nombre)')
    .eq('trabajador_id', userId)
    .eq('estado', 'completado')
    .order('created_at', { ascending: false });

  // 2. Trabajos completados con postulación aceptada
  const { data: postsAceptadas } = await supabase
    .from('postulaciones')
    .select(`
      trabajo_id,
      trabajos (
        id,
        titulo,
        monto,
        created_at,
        user_id,
        estado,
        categorias(nombre)
      )
    `)
    .eq('postulante_id', userId)
    .eq('estado', 'aceptado');

  const mapaTrabajos = new Map<string, any>();
  (trabajosDirectos || []).forEach((t: any) => mapaTrabajos.set(t.id, t));
  (postsAceptadas || []).forEach((p: any) => {
    if (p.trabajos && p.trabajos.estado === 'completado') {
      mapaTrabajos.set(p.trabajos.id, p.trabajos);
    }
  });

  const listaTrabajos = Array.from(mapaTrabajos.values());
  if (listaTrabajos.length === 0) return [];

  // Obtener datos de los solicitantes (quienes publicaron el trabajo)
  const solicitantesIds = Array.from(new Set(listaTrabajos.map((t) => t.user_id).filter(Boolean)));
  const perfilesMap: Record<string, any> = {};

  if (solicitantesIds.length > 0) {
    const { data: perfilesData } = await supabase
      .from('perfiles')
      .select('id, nombre, nombre_completo, avatar_url')
      .in('id', solicitantesIds);

    if (perfilesData) {
      perfilesData.forEach((p) => {
        perfilesMap[p.id] = p;
      });
    }
  }

  // Obtener reseñas que YO (trabajador) he enviado para estos trabajos
  const trabajoIds = listaTrabajos.map((t) => t.id);
  const { data: misResenas } = await supabase
    .from('resenas')
    .select('trabajo_id, calificacion, comentario')
    .eq('autor_id', userId)
    .in('trabajo_id', trabajoIds);

  const resenasMap: Record<string, { calificacion: number; comentario: string }> = {};
  if (misResenas) {
    misResenas.forEach((r: any) => {
      resenasMap[r.trabajo_id] = {
        calificacion: Number(r.calificacion) || 5,
        comentario: r.comentario || '',
      };
    });
  }

  return listaTrabajos.map((t: any) => {
    const perf = perfilesMap[t.user_id] || {};
    const res = resenasMap[t.id];

    return {
      id: String(t.id),
      titulo: t.titulo,
      categoria: t.categorias?.nombre || 'General',
      fecha: new Date(t.created_at).toLocaleDateString('es-CL'),
      monto: `$${Number(t.monto || 0).toLocaleString('es-CL')}`,
      solicitanteId: t.user_id || '',
      solicitanteNombre: perf.nombre || perf.nombre_completo || 'Solicitante',
      solicitanteAvatar: perf.avatar_url || null,
      calificadoPorMi: Boolean(res),
      miCalificacion: res || null,
    };
  });
};

export const aceptarPostulante = async (trabajoId: string, postulacionId: string, postulanteId: string) => {
  await supabase
    .from('trabajos')
    .update({ estado: 'en_progreso', trabajador_id: postulanteId })
    .eq('id', trabajoId);

  await supabase
    .from('postulaciones')
    .update({ estado: 'aceptado' })
    .eq('id', postulacionId);
};

export const cancelarAcuerdoTrabajador = async (trabajoId: string, postulanteId?: string | null) => {
  const { error: errTrabajo } = await supabase
    .from('trabajos')
    .update({ estado: 'disponible', trabajador_id: null })
    .eq('id', trabajoId);

  if (errTrabajo) throw errTrabajo;

  let query = supabase
    .from('postulaciones')
    .update({ estado: 'rechazado' })
    .eq('trabajo_id', trabajoId);

  if (postulanteId) {
    query = query.eq('postulante_id', postulanteId);
  } else {
    query = query.eq('estado', 'aceptado');
  }

  const { error: errPost } = await query;
  if (errPost) throw errPost;
};

export const eliminarMiPublicacion = async (trabajoId: string) => {
  const { data: aceptadas } = await supabase
    .from('postulaciones')
    .select('id')
    .eq('trabajo_id', trabajoId)
    .eq('estado', 'aceptado');

  if (aceptadas && aceptadas.length > 0) {
    throw new Error('No puedes eliminar una tarea que tiene a un trabajador aceptado.');
  }

  await supabase.from('postulaciones').delete().eq('trabajo_id', trabajoId);
  const { error } = await supabase.from('trabajos').delete().eq('id', trabajoId);
  if (error) throw error;
};

export const editarMiPublicacion = async (
  trabajoId: string,
  datos: { titulo: string; descripcion: string; monto: number }
) => {
  const { data: aceptadas } = await supabase
    .from('postulaciones')
    .select('id')
    .eq('trabajo_id', trabajoId)
    .eq('estado', 'aceptado');

  if (aceptadas && aceptadas.length > 0) {
    throw new Error('No puedes editar una tarea que ya cuenta con un trabajador aceptado.');
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
};

/**
 * Función universal para calificar a una contraparte (de empleador a trabajador, o de trabajador a empleador).
 * Recalcula el promedio del usuario evaluado e incrementa trabajos completados si aplica.
 */
export const enviarCalificacionMutua = async ({
  trabajoId,
  autorId,
  evaluadoId,
  calificacion,
  comentario,
  esFinalizacion = false,
}: {
  trabajoId: string;
  autorId: string;
  evaluadoId: string;
  calificacion: number;
  comentario: string;
  esFinalizacion?: boolean;
}) => {
  if (!evaluadoId) {
    throw new Error('No se encontró a la contraparte a calificar.');
  }

  // 1. Si es la finalización por parte del empleador, cambiar estado del trabajo a completado
  if (esFinalizacion) {
    try {
      const { error: errTrabajo } = await supabase
        .from('trabajos')
        .update({ estado: 'completado', trabajador_id: evaluadoId })
        .eq('id', trabajoId);

      if (errTrabajo) {
        console.warn('Advertencia al actualizar estado del trabajo:', errTrabajo.message);
      }
    } catch (e: any) {
      console.warn('Error capturado en update trabajo:', e.message);
    }

    try {
      const { data: perf } = await supabase
        .from('perfiles')
        .select('trabajos_realizados')
        .eq('id', evaluadoId)
        .single();

      if (perf) {
        await supabase
          .from('perfiles')
          .update({ trabajos_realizados: (perf.trabajos_realizados || 0) + 1 })
          .eq('id', evaluadoId);
      }
    } catch (e: any) {
      console.warn('Error capturado en update trabajos_realizados:', e.message);
    }
  }

  // 2. Guardar o actualizar la reseña en la tabla 'resenas'
  const { data: resenaExistente } = await supabase
    .from('resenas')
    .select('id')
    .eq('trabajo_id', trabajoId)
    .eq('autor_id', autorId)
    .maybeSingle();

  const resenaObj: any = {
    trabajo_id: trabajoId,
    autor_id: autorId,
    evaluado_id: evaluadoId,
    usuario_evaluado_id: evaluadoId,
    calificacion,
    comentario: comentario.trim() || 'Excelente labor y trato cordial.',
  };

  if (resenaExistente?.id) {
    let { error: errUpd } = await supabase
      .from('resenas')
      .update(resenaObj)
      .eq('id', resenaExistente.id);

    // Si falló por falta del campo 'estado' en el trigger de PostgreSQL, reintentar pasando 'estado'
    if (errUpd && errUpd.message?.toLowerCase().includes('estado')) {
      const { error: errRetry } = await supabase
        .from('resenas')
        .update({ ...resenaObj, estado: 'completado' })
        .eq('id', resenaExistente.id);
      errUpd = errRetry;
    }

    if (errUpd) throw errUpd;
  } else {
    let { error: errIns } = await supabase
      .from('resenas')
      .insert([resenaObj]);

    // Si falló por falta del campo 'estado' en el trigger de PostgreSQL, reintentar pasando 'estado'
    if (errIns && errIns.message?.toLowerCase().includes('estado')) {
      const { error: errRetry } = await supabase
        .from('resenas')
        .insert([{ ...resenaObj, estado: 'completado' }]);
      errIns = errRetry;
    }

    if (errIns) throw errIns;
  }

  // 3. Recalcular promedio y total de reseñas para el usuario evaluado
  try {
    const { data: todasLasResenas } = await supabase
      .from('resenas')
      .select('calificacion')
      .or(`evaluado_id.eq.${evaluadoId},usuario_evaluado_id.eq.${evaluadoId}`);

    if (todasLasResenas && todasLasResenas.length > 0) {
      const total = todasLasResenas.length;
      const suma = todasLasResenas.reduce((acc, r) => acc + (Number(r.calificacion) || 5), 0);
      const nuevoPromedio = Number((suma / total).toFixed(1));

      await supabase
        .from('perfiles')
        .update({
          calificacion: nuevoPromedio,
          total_resenas: total,
        })
        .eq('id', evaluadoId);
    }
  } catch (e: any) {
    console.warn('Advertencia al recalcular promedio en perfil:', e.message);
  }
};

/**
 * Mantiene compatibilidad con llamadas existentes para finalizar tareas
 */
export const finalizarYCalificarTarea = async (
  trabajoId: string,
  solicitanteId: string,
  trabajadorIdInput: string | null | undefined,
  calificacion: number,
  comentario: string
) => {
  let targetTrabajadorId = trabajadorIdInput;

  if (!targetTrabajadorId) {
    const { data: tData } = await supabase
      .from('trabajos')
      .select('trabajador_id')
      .eq('id', trabajoId)
      .single();

    targetTrabajadorId = tData?.trabajador_id;
  }

  if (!targetTrabajadorId) {
    const { data: pData } = await supabase
      .from('postulaciones')
      .select('postulante_id')
      .eq('trabajo_id', trabajoId)
      .eq('estado', 'aceptado')
      .single();

    targetTrabajadorId = pData?.postulante_id;
  }

  if (!targetTrabajadorId) {
    throw new Error('No se encontró al trabajador asignado a esta tarea.');
  }

  await enviarCalificacionMutua({
    trabajoId,
    autorId: solicitanteId,
    evaluadoId: targetTrabajadorId,
    calificacion,
    comentario,
    esFinalizacion: true,
  });
};