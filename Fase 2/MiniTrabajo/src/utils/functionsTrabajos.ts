import { supabase } from '../services/supabase';

export type EstadoTrabajo = 'disponible' | 'postulado' | 'aceptado' | 'completado';

export interface TrabajoUI {
  id: string;
  titulo: string;
  categoria: string;
  categoriaId: number;
  monto: string;
  montoRaw: number;
  solicitante: string;
  solicitanteId: string;
  avatarUrl: string | null;
  comuna: string;
  comunaId: number;
  telefono: string;
  descripcion: string;
  destacado: boolean;
  estado: EstadoTrabajo;
  imagenes: string[];
  fechaPublicacion: string;
  urgencia?: string;
  miPostulacionId?: string;
  totalPostulantes: number;
}

export interface SolicitanteDetalle {
  id: string;
  nombre: string;
  avatarUrl: string | null;
  comuna: string;
  sobreMi: string;
  calificacion: string;
  totalResenas: number;
  resenas: {
    id: string;
    autor: string;
    calificacion: number;
    comentario: string;
    fecha: string;
  }[];
}

export interface CategoriaFiltro {
  id: number;
  nombre: string;
}

export interface ComunaFiltro {
  id: number;
  nombre: string;
}

// 1. Obtener listado de categorías para filtros
export async function fetchCategoriasFiltro(): Promise<CategoriaFiltro[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('id, nombre')
    .order('id', { ascending: true });

  if (error || !data) return [];
  return data;
}

// 2. Obtener listado de comunas para filtros
export async function fetchComunasFiltro(): Promise<ComunaFiltro[]> {
  const { data, error } = await supabase
    .from('comunas')
    .select('id, nombre')
    .order('nombre', { ascending: true });

  if (error || !data) return [];
  return data;
}

// 3. Obtener muro de publicaciones con relaciones completas
export async function fetchTrabajosMuro(userId?: string | null): Promise<TrabajoUI[]> {
  const { data, error } = await supabase
    .from('trabajos')
    .select(`
      id,
      titulo,
      monto,
      descripcion,
      destacado,
      estado,
      imagenes,
      created_at,
      categoria_id,
      comuna_id,
      user_id,
      categorias ( id, nombre ),
      comunas ( id, nombre ),
      perfiles:user_id ( id, nombre, telefono, avatar_url ),
      postulaciones ( id, postulante_id, estado )
    `)
    .order('destacado', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((t: any) => {
    const postulaciones = t.postulaciones || [];
    const miPostulacion = userId
      ? postulaciones.find((p: any) => p.postulante_id === userId)
      : null;

    let estadoFinal: EstadoTrabajo = t.estado;
    if (miPostulacion) {
      estadoFinal = miPostulacion.estado === 'aceptado' ? 'aceptado' : 'postulado';
    }

    const fechaFormateada = new Date(t.created_at).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return {
      id: t.id,
      titulo: t.titulo,
      categoria: t.categorias?.nombre || 'General',
      categoriaId: t.categoria_id,
      monto: `$${Number(t.monto).toLocaleString('es-CL')}`,
      montoRaw: t.monto,
      solicitante: t.perfiles?.nombre || 'Usuario',
      solicitanteId: t.user_id,
      avatarUrl: t.perfiles?.avatar_url || null,
      comuna: t.comunas?.nombre || 'Santiago Centro',
      comunaId: t.comuna_id,
      telefono: t.perfiles?.telefono || '',
      descripcion: t.descripcion,
      destacado: Boolean(t.destacado),
      estado: estadoFinal,
      imagenes: t.imagenes || [],
      fechaPublicacion: fechaFormateada,
      miPostulacionId: miPostulacion?.id,
      totalPostulantes: postulaciones.length,
    };
  });
}

// 4. Obtener información y reseñas del solicitante
export async function fetchDetalleSolicitante(solicitanteId: string): Promise<SolicitanteDetalle | null> {
  const { data: perfilData, error: perfilErr } = await supabase
    .from('perfiles')
    .select(`
      id,
      nombre,
      avatar_url,
      sobre_mi,
      calificacion,
      total_resenas,
      comunas ( nombre )
    `)
    .eq('id', solicitanteId)
    .single();

  if (perfilErr || !perfilData) return null;

  const { data: resenasData } = await supabase
    .from('resenas')
    .select(`
      id,
      calificacion,
      comentario,
      created_at,
      perfiles!resenas_autor_id_fkey ( nombre )
    `)
    .eq('evaluado_id', solicitanteId)
    .order('created_at', { ascending: false })
    .limit(5);

  const resenasMapeadas = (resenasData || []).map((r: any) => ({
    id: r.id,
    autor: r.perfiles?.nombre || 'Usuario',
    calificacion: r.calificacion,
    comentario: r.comentario,
    fecha: new Date(r.created_at).toLocaleDateString('es-CL'),
  }));

  return {
    id: perfilData.id,
    nombre: perfilData.nombre || 'Usuario',
    avatarUrl: perfilData.avatar_url || null,
    comuna: (perfilData.comunas as any)?.nombre || 'Santiago',
    sobreMi: perfilData.sobre_mi || 'Sin descripción disponible.',
    calificacion: perfilData.calificacion ? Number(perfilData.calificacion).toFixed(1) : '0.0',
    totalResenas: perfilData.total_resenas || 0,
    resenas: resenasMapeadas,
  };
}

// 5. Postular a un trabajo
export async function postularATrabajo(trabajoId: string, userId: string, mensaje: string = 'Interesado en realizar esta tarea.') {
  return supabase.from('postulaciones').insert({
    trabajo_id: trabajoId,
    postulante_id: userId,
    mensaje,
    estado: 'pendiente',
  });
}

// 6. Retirar postulación
export async function retirarPostulacion(postulacionId: string) {
  return supabase.from('postulaciones').delete().eq('id', postulacionId);
}

// 7. Eliminar publicación propia (si aún no tiene trabajador asignado)
export async function eliminarTrabajoPropio(trabajoId: string) {
  return supabase.from('trabajos').delete().eq('id', trabajoId);
}