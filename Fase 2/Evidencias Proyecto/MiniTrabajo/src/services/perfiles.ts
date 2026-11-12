import { supabase } from "./supabase";

export interface PerfilData {
  nombre: string;
  sobre_mi: string;
  avatar_url: string | null;
  calificacion: string;
  total_resenas: number;
  trabajos_realizados: number;
  creditos: number;
  comuna_id: number | null;
  comuna_nombre: string;
}

interface PerfilUsuarioFila {
  nombre: string;
  nombre_completo: string | null;
  sobre_mi: string | null;
  avatar_url: string | null;
  calificacion: number | string | null;
  total_resenas: number | null;
  trabajos_realizados: number | null;
  creditos: number | null;
  comuna_id: number | null;
  comunas: { nombre: string } | { nombre: string }[] | null;
}

function leerCantidadPerfil(valor: number | null): number {
  if (valor === null || !Number.isSafeInteger(valor) || valor < 0) {
    throw new Error('No pudimos cargar los datos de tu perfil. Inténtalo nuevamente.');
  }
  return valor;
}

export const fetchPerfilUsuario = async (userId: string): Promise<PerfilData> => {
  const mensajeError = 'No pudimos cargar tu perfil. Inténtalo nuevamente.';
  const { data: perfil, error } = await supabase
    .from('perfiles')
    .select(`
      nombre, nombre_completo, sobre_mi, avatar_url,
      calificacion, total_resenas, trabajos_realizados, creditos,
      comuna_id, comunas(nombre)
    `)
    .eq('id', userId)
    .maybeSingle()
    .overrideTypes<PerfilUsuarioFila, { merge: false }>();

  if (error) {
    console.warn('Error al consultar el perfil propio:', { code: error.code });
    throw new Error(mensajeError);
  }
  if (perfil === null || perfil.calificacion === null) throw new Error(mensajeError);
  const calificacion = Number(perfil.calificacion);
  if (!Number.isFinite(calificacion) || calificacion < 0 || calificacion > 5) {
    throw new Error(mensajeError);
  }
  const comuna = Array.isArray(perfil.comunas)
    ? perfil.comunas[0] ?? null
    : perfil.comunas;

  return {
    nombre: perfil.nombre || perfil.nombre_completo || 'Usuario',
    sobre_mi: perfil.sobre_mi || 'Sin descripción aún.',
    avatar_url: perfil.avatar_url,
    calificacion: calificacion.toFixed(1),
    total_resenas: leerCantidadPerfil(perfil.total_resenas),
    trabajos_realizados: leerCantidadPerfil(perfil.trabajos_realizados),
    creditos: leerCantidadPerfil(perfil.creditos),
    comuna_id: perfil.comuna_id,
    comuna_nombre: comuna?.nombre || 'Sin comuna',
  };
};

export const fetchCreditosPublicar = async (userId: string): Promise<number> => {
  const { data, error } = await supabase.from('perfiles')
    .select('creditos').eq('id', userId).maybeSingle()
    .overrideTypes<{ creditos: number | null }, { merge: false }>();
  if (error || data === null || data.creditos === null
      || !Number.isSafeInteger(data.creditos) || data.creditos < 0) {
    console.warn('Error al consultar saldo para publicar:', { code: error?.code });
    throw new Error('No pudimos cargar tu saldo. Inténtalo nuevamente.');
  }
  return data.creditos;
};

export interface DatosEdicionPerfil {
  nombre: string;
  nombre_completo: string;
  sobre_mi: string;
  avatar_url: string | null;
  comuna_id: number | null;
}

export const actualizarPerfilPropio = async (
  usuarioId: string,
  cambios: DatosEdicionPerfil,
) => {
  return await supabase
    .from("perfiles")
    .update({
      nombre: cambios.nombre,
      nombre_completo: cambios.nombre_completo,
      sobre_mi: cambios.sobre_mi,
      avatar_url: cambios.avatar_url,
      comuna_id: cambios.comuna_id,
    })
    .eq("id", usuarioId);
};
