import { supabase } from "./supabase";

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

export const postularATrabajo = async (
  trabajoId: string,
  postulanteId: string,
) => {
  // Comprobación de integridad: verificar si el trabajo ya fue tomado o cerrado
  const { data: trabajo } = await supabase
    .from("trabajos")
    .select("estado")
    .eq("id", trabajoId)
    .single();

  if (
    trabajo &&
    (trabajo.estado === "aceptado" || trabajo.estado === "completado")
  ) {
    throw new Error(
      "Esta tarea ya fue asignada y no acepta nuevas postulaciones.",
    );
  }

  const { data: postulacionAceptada } = await supabase
    .from("postulaciones")
    .select("id")
    .eq("trabajo_id", trabajoId)
    .eq("estado", "aceptado");

  if (postulacionAceptada && postulacionAceptada.length > 0) {
    throw new Error("Esta tarea ya cuenta con un trabajador seleccionado.");
  }

  return await supabase
    .from("postulaciones")
    .insert({
      trabajo_id: trabajoId,
      postulante_id: postulanteId,
      mensaje: "Me postulo para realizar este trabajo.",
      estado: "pendiente",
    })
    .select("id")
    .single();
};

export const retirarPostulacion = async (
  trabajoId: string,
  _postulanteId?: string,
) => {
  const { error } = await supabase.rpc("retirar_postulacion", {
    p_trabajo_id: trabajoId,
  });

  if (error) {
    console.warn("Error al retirar postulación:", {
      code: error.code,
      message: error.message,
    });

    if (error.code === "42501") {
      throw new Error("Debes iniciar sesión para retirar tu postulación.");
    }

    if (error.code === "55000") {
      throw new Error(
        "No puedes retirar esta postulación. Si ya estás asignado, comunícate con el publicador para cancelar el acuerdo.",
      );
    }

    throw new Error(
      "No pudimos retirar la postulación. Actualiza la tarea y comprueba su estado.",
    );
  }

  // Mantener la respuesta que espera TrabajosScreen.
  return { error: null };
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

export const rechazarPostulacion = async (postulacionId: string) => {
  const { error } = await supabase.rpc("rechazar_postulacion", {
    p_postulacion_id: postulacionId,
  });

  if (error) {
    console.warn("Error al rechazar postulación:", {
      code: error.code,
      message: error.message,
    });

    if (error.code === "42501") {
      throw new Error(
        "No tienes autorización para rechazar esta postulación.",
      );
    }

    if (error.code === "55000") {
      throw new Error(
        "La postulación cambió o ya no permite el rechazo. Actualiza la tarea. Si el trabajador está aceptado, utiliza Cancelar acuerdo.",
      );
    }

    throw new Error(
      "No pudimos rechazar la postulación. Actualiza la tarea antes de volver a intentarlo.",
    );
  }
};
