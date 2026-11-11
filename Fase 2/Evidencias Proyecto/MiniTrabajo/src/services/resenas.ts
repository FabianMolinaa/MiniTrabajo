import { supabase } from "./supabase";
import { leerCalificacionResena } from "../utils/calificaciones";

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

export interface ResenaItem {
  id: string;
  autor: string;
  avatarUrl?: string | null;
  calificacion: number;
  fecha: string;
  comentario: string;
}

interface AutorResenaFila {
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
  perfiles: AutorResenaFila | AutorResenaFila[] | null;
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
    const autor = Array.isArray(resena.perfiles)
      ? resena.perfiles[0] ?? null
      : resena.perfiles;
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
