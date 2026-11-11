import { supabase } from "./supabase";

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
