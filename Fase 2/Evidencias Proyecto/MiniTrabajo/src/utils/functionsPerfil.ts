import { supabase } from '../services/supabase';
import { leerCalificacionResena } from './calificaciones';

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

interface PerfilResumenFila {
  id: string;
  nombre: string | null;
  nombre_completo: string | null;
  avatar_url: string | null;
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
