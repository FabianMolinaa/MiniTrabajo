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
      .from('perfiles_publicos')
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
      estadoCalculado = postAceptada || t.estado === 'aceptado' ? 'aceptado' : 'disponible';
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

interface PostulacionFila {
  id: string;
  postulante_id: string;
  mensaje: string;
  estado: PostulanteBD['estado'] | null;
}

interface PerfilPostulanteFila {
  id: string;
  nombre: string | null;
  nombre_completo: string | null;
  avatar_url: string | null;
  comunas: { nombre: string } | { nombre: string }[] | null;
  sobre_mi: string | null;
  calificacion: number | string | null;
  trabajos_realizados: number | null;
}

export const fetchPostulantesDeTarea = async (
  trabajoId: string
): Promise<PostulanteBD[]> => {
  const mensajeError = 'No pudimos cargar los postulantes. Inténtalo nuevamente.';

  const { data: posts, error } = await supabase
    .from('postulaciones')
    .select('id, postulante_id, mensaje, estado')
    .eq('trabajo_id', trabajoId)
    .order('created_at', { ascending: false })
    .overrideTypes<PostulacionFila[], { merge: false }>();

  if (error) {
    console.warn('Error al consultar postulaciones:', { code: error.code });
    throw new Error(mensajeError);
  }
  if (posts === null) throw new Error(mensajeError);
  if (posts.length === 0) return [];

  const postulantesIds = Array.from(new Set(posts.map(p => p.postulante_id)));
  const { data: perfilesData, error: errorPerfiles } = await supabase
    .from('perfiles_publicos')
    .select(`
      id,
      nombre,
      nombre_completo,
      avatar_url,
      comunas(nombre),
      sobre_mi,
      calificacion,
      trabajos_realizados
    `)
    .in('id', postulantesIds)
    .overrideTypes<PerfilPostulanteFila[], { merge: false }>();

  if (errorPerfiles) {
    console.warn('Error al consultar perfiles públicos de postulantes:', {
      code: errorPerfiles.code,
    });
    throw new Error(mensajeError);
  }
  if (perfilesData === null) throw new Error(mensajeError);

  const perfilesMap = new Map<string, PerfilPostulanteFila>();
  perfilesData.forEach(perfil => perfilesMap.set(perfil.id, perfil));

  return posts.map(post => {
    const estado = post.estado;
    if (estado !== 'pendiente' && estado !== 'aceptado' && estado !== 'rechazado') {
      throw new Error(mensajeError);
    }

    const perfil = perfilesMap.get(post.postulante_id);
    const comuna = Array.isArray(perfil?.comunas)
      ? perfil.comunas[0]
      : perfil?.comunas;
    const calificacion = Number(perfil?.calificacion ?? 0);
    const calificacionValida = Number.isFinite(calificacion)
      && calificacion >= 0 && calificacion <= 5;

    return {
      id: post.id,
      postulante_id: post.postulante_id,
      nombre: perfil?.nombre || perfil?.nombre_completo || 'Postulante',
      avatar_url: perfil?.avatar_url || null,
      comuna: comuna?.nombre || 'Sin comuna',
      sobre_mi: perfil?.sobre_mi || 'Sin descripción',
      calificacion: (calificacionValida ? calificacion : 0).toFixed(1),
      trabajos_realizados: perfil?.trabajos_realizados ?? 0,
      mensaje: post.mensaje,
      estado,
    };
  });
};

interface PerfilResumenFila {
  id: string;
  nombre: string | null;
  nombre_completo: string | null;
  avatar_url: string | null;
}

interface ResenaRecibidaFila {
  id: string;
  calificacion: number | string;
  comentario: string;
  created_at: string;
  perfiles: PerfilResumenFila | PerfilResumenFila[] | null;
}

interface TrabajoCompletadoFila {
  id: string;
  titulo: string;
  monto: number;
  created_at: string;
  user_id: string;
  categorias: { nombre: string } | { nombre: string }[] | null;
}

interface ResenaEnviadaFila {
  trabajo_id: string | null;
  calificacion: number | string;
  comentario: string;
}

function relacionUnica<T>(relacion: T | T[] | null): T | null {
  return Array.isArray(relacion) ? relacion[0] ?? null : relacion;
}

function leerCalificacionResena(valor: number | string): number {
  const calificacion = Number(valor);
  if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
    throw new Error('No pudimos cargar las calificaciones. Inténtalo nuevamente.');
  }
  return calificacion;
}

export const fetchResenasUsuario = async (userId: string): Promise<ResenaItem[]> => {
  const { data, error } = await supabase
    .from('resenas')
    .select(`
      id, calificacion, comentario, created_at,
      perfiles:perfiles_publicos!resenas_autor_id_fkey (
        id, nombre, nombre_completo, avatar_url
      )
    `)
    .or(`usuario_evaluado_id.eq.${userId},evaluado_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .overrideTypes<ResenaRecibidaFila[], { merge: false }>();

  if (error) {
    console.warn('Error al consultar reseñas:', { code: error.code });
    throw new Error('No pudimos cargar las reseñas. Inténtalo nuevamente.');
  }
  if (data === null) {
    throw new Error('No pudimos cargar las reseñas. Inténtalo nuevamente.');
  }

  return data.map(resena => {
    const autor = relacionUnica(resena.perfiles);
    return {
      id: resena.id,
      autor: autor?.nombre || autor?.nombre_completo || 'Usuario',
      avatarUrl: autor?.avatar_url || null,
      calificacion: leerCalificacionResena(resena.calificacion),
      fecha: new Date(resena.created_at).toLocaleDateString('es-CL'),
      comentario: resena.comentario,
    };
  });
};

export const fetchHistorialTrabajosHechos = async (
  userId: string
): Promise<TrabajoRealizadoItem[]> => {
  const mensajeError = 'No pudimos cargar el historial de trabajos. Inténtalo nuevamente.';
  const { data: trabajos, error } = await supabase
    .from('trabajos')
    .select('id, titulo, monto, created_at, user_id, categorias(nombre)')
    .eq('trabajador_id', userId)
    .eq('estado', 'completado')
    .order('created_at', { ascending: false })
    .overrideTypes<TrabajoCompletadoFila[], { merge: false }>();

  if (error) {
    console.warn('Error al consultar trabajos completados:', { code: error.code });
    throw new Error(mensajeError);
  }
  if (trabajos === null) throw new Error(mensajeError);
  if (trabajos.length === 0) return [];

  const solicitantesIds = Array.from(new Set(trabajos.map(trabajo => trabajo.user_id)));
  const trabajoIds = trabajos.map(trabajo => trabajo.id);
  const [perfilesRes, resenasRes] = await Promise.all([
    supabase
      .from('perfiles_publicos')
      .select('id, nombre, nombre_completo, avatar_url')
      .in('id', solicitantesIds)
      .overrideTypes<PerfilResumenFila[], { merge: false }>(),
    supabase
      .from('resenas')
      .select('trabajo_id, calificacion, comentario')
      .eq('autor_id', userId)
      .in('trabajo_id', trabajoIds)
      .overrideTypes<ResenaEnviadaFila[], { merge: false }>(),
  ]);

  if (perfilesRes.error || resenasRes.error) {
    console.warn('Error al completar el historial de trabajos:', {
      code: perfilesRes.error?.code ?? resenasRes.error?.code,
    });
    throw new Error(mensajeError);
  }
  if (perfilesRes.data === null || resenasRes.data === null) {
    throw new Error(mensajeError);
  }

  const perfilesMap = new Map<string, PerfilResumenFila>();
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
    const perfil = perfilesMap.get(trabajo.user_id);
    const categoria = relacionUnica(trabajo.categorias);
    const resena = resenasMap.get(trabajo.id);
    return {
      id: trabajo.id,
      titulo: trabajo.titulo,
      categoria: categoria?.nombre || 'General',
      fecha: new Date(trabajo.created_at).toLocaleDateString('es-CL'),
      monto: `$${Number(trabajo.monto).toLocaleString('es-CL')}`,
      solicitanteId: trabajo.user_id,
      solicitanteNombre: perfil?.nombre || perfil?.nombre_completo || 'Solicitante',
      solicitanteAvatar: perfil?.avatar_url || null,
      calificadoPorMi: Boolean(resena),
      miCalificacion: resena ?? null,
    };
  });
};

export const aceptarPostulante = async (
  trabajoId: string,
  postulacionId: string,
  _postulanteId?: string
) => {
  const { error } = await supabase.rpc(
    'aceptar_postulante',
    {
      p_trabajo_id: trabajoId,
      p_postulacion_id: postulacionId,
    }
  );

  if (error) {
    console.warn('Error al aceptar postulante:', {
      code: error.code,
      message: error.message,
    });

    if (error.code === '42501') {
      throw new Error(
        'No tienes autorización para aceptar esta postulación.'
      );
    }

    if (error.code === '55000') {
      throw new Error(
        'El acuerdo cambió o requiere revisión. Actualiza la tarea antes de continuar.'
      );
    }

    if (error.code === '22023') {
      throw new Error(
        'No puedes aceptarte como trabajador de tu propio trabajo.'
      );
    }

    throw new Error(
      'No pudimos aceptar la postulación. Actualiza la tarea y comprueba su estado.'
    );
  }
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

export { eliminarTrabajoPropio as eliminarMiPublicacion } from './functionsTrabajos';

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
  const { data, error } = await supabase.rpc(
    'calificar_trabajo',
    {
      p_trabajo_id: trabajoId,
      p_calificacion: calificacion,
      p_comentario: comentario,
      p_finalizar: esFinalizacion,
    }
  );

  if (error) {
    console.warn('Error al registrar la calificación:', {
      code: error.code,
      message: error.message,
    });

    if (error.code === '42501') {
      throw new Error(
        'No tienes autorización para calificar o finalizar este trabajo.'
      );
    }

    if (error.code === '22023') {
      throw new Error(
        'Selecciona entre 1 y 5 estrellas y escribe un comentario de hasta 2000 caracteres.'
      );
    }

    if (error.code === '55000') {
      throw new Error(
        'No se pudo registrar la calificación. Actualiza la tarea y comprueba el estado del acuerdo. Si el problema continúa, revisaremos el mensaje de la terminal.'
      );
    }

    throw new Error(
      'No pudimos guardar la calificación. Comprueba tu conexión y actualiza la tarea antes de volver a intentarlo.'
    );
  }

  return data;
};

/** Mantiene compatibilidad con llamadas existentes para finalizar tareas */
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
