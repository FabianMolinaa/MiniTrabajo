import { supabase } from "./supabase";

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
