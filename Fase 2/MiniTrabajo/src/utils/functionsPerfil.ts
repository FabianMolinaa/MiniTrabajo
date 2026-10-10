import { supabase } from '../services/supabase';

export interface ResenaItem {
  id: string;
  autor: string;
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
  imagenes?: string[];
  total_postulantes?: number;
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

  return {
    nombre: perfil.nombre || perfil.nombre_completo || 'Usuario',
    sobre_mi: perfil.sobre_mi || 'Sin descripción aún.',
    avatar_url: perfil.avatar_url,
    calificacion: Number(perfil.calificacion || 0).toFixed(1),
    total_resenas: perfil.total_resenas || 0,
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

  return trabajos.map((t: any) => {
    const postAceptada = (t.postulaciones || []).find((p: any) => p.estado === 'aceptado');
    let estadoCalculado = t.estado;
    let trabajadorId = t.trabajador_id || postAceptada?.postulante_id || null;

    if (t.estado !== 'completado') {
      estadoCalculado = postAceptada || t.estado === 'en_progreso' ? 'aceptado' : 'disponible';
    }

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
      imagenes: Array.isArray(t.imagenes) ? t.imagenes : [],
      total_postulantes: (t.postulaciones || []).length,
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

    // Consulta adaptada a tu esquema exacto (usando 'nombre')
    const { data: perfilesData } = await supabase
      .from('perfiles')
      .select('id, nombre, nombre_completo, avatar_url, telefono, sobre_mi, calificacion, trabajos_realizados, comunas(nombre)')
      .in('id', postulantesIds);

    const perfilesMap: Record<string, any> = {};
    if (perfilesData) {
      perfilesData.forEach((p: any) => {
        perfilesMap[p.id] = p;
      });
    }

    return posts.map((p: any) => {
      const perfil = perfilesMap[p.postulante_id] || {};

      return {
        id: String(p.id),
        postulante_id: p.postulante_id,
        nombre: perfil.nombre || perfil.nombre_completo || 'Usuario',
        avatar_url: perfil.avatar_url,
        comuna: perfil.comunas?.nombre || 'Santiago',
        sobre_mi: perfil.sobre_mi || 'Sin descripción disponible.',
        calificacion: Number(perfil.calificacion || 5).toFixed(1),
        trabajos_realizados: perfil.trabajos_realizados || 0,
        telefono: perfil.telefono || '',
        mensaje: p.mensaje || 'Me postulo para realizar este trabajo.',
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
    .select('id, calificacion, comentario, created_at, perfiles:autor_id(nombre, nombre_completo)')
    .or(`usuario_evaluado_id.eq.${userId},evaluado_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (!data) return [];

  return data.map((r: any) => ({
    id: String(r.id),
    autor: r.perfiles?.nombre || r.perfiles?.nombre_completo || 'Usuario',
    calificacion: r.calificacion || 5,
    fecha: new Date(r.created_at).toLocaleDateString('es-CL'),
    comentario: r.comentario || '',
  }));
};

export const fetchHistorialTrabajosHechos = async (userId: string): Promise<TrabajoRealizadoItem[]> => {
  const { data } = await supabase
    .from('trabajos')
    .select('id, titulo, monto, created_at, categorias(nombre)')
    .eq('trabajador_id', userId)
    .eq('estado', 'completado')
    .order('created_at', { ascending: false });

  if (!data) return [];

  return data.map((t: any) => ({
    id: String(t.id),
    titulo: t.titulo,
    categoria: t.categorias?.nombre || 'General',
    fecha: new Date(t.created_at).toLocaleDateString('es-CL'),
    monto: `$${Number(t.monto || 0).toLocaleString('es-CL')}`,
  }));
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

  // 1. Marcar trabajo como completado
  const { error: errTrabajo } = await supabase
    .from('trabajos')
    .update({ estado: 'completado' })
    .eq('id', trabajoId);

  if (errTrabajo) throw errTrabajo;

  // 2. Guardar en reseñas actualizando tanto evaluado_id como usuario_evaluado_id
  const resenaObj: any = {
    trabajo_id: trabajoId,
    autor_id: solicitanteId,
    evaluado_id: targetTrabajadorId,
    usuario_evaluado_id: targetTrabajadorId,
    calificacion,
    comentario: comentario.trim() || 'Trabajo concluido satisfactoriamente.',
  };

  const { error: errResena } = await supabase.from('resenas').insert([resenaObj]);
  if (errResena) throw errResena;

  // 3. Incrementar contador de trabajos realizados
  const { data: perf } = await supabase
    .from('perfiles')
    .select('trabajos_realizados')
    .eq('id', targetTrabajadorId)
    .single();

  await supabase
    .from('perfiles')
    .update({ trabajos_realizados: (perf?.trabajos_realizados || 0) + 1 })
    .eq('id', targetTrabajadorId);
};