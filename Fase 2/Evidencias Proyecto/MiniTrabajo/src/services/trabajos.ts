import { supabase } from "./supabase";

export const eliminarTrabajoPropio = async (trabajoId: string) => {
  const { error } = await supabase.rpc("eliminar_trabajo", {
    p_trabajo_id: trabajoId,
  });

  if (error) {
    console.warn("Error al eliminar trabajo:", {
      code: error.code,
      message: error.message,
    });

    if (error.code === "42501") {
      throw new Error(
        "No tienes autorización para eliminar este trabajo o ya no existe.",
      );
    }

    if (error.code === "55000") {
      throw new Error(
        "Solo puedes eliminar trabajos disponibles, sin acuerdos activos ni reseñas. Actualiza la publicación antes de continuar.",
      );
    }

    throw new Error(
      "No pudimos eliminar el trabajo. Actualiza la lista y comprueba si todavía aparece.",
    );
  }

  return { error: null };
};

export const editarTrabajoPropio = async (
  trabajoId: string,
  datos: { titulo: string; descripcion: string; monto: number },
) => {
  const { data: aceptadas } = await supabase
    .from("postulaciones")
    .select("id")
    .eq("trabajo_id", trabajoId)
    .eq("estado", "aceptado");

  if (aceptadas && aceptadas.length > 0) {
    throw new Error(
      "La tarea ya fue asignada a un trabajador y no puede ser modificada.",
    );
  }

  const { data, error } = await supabase
    .from("trabajos")
    .update({
      titulo: datos.titulo.trim(),
      descripcion: datos.descripcion.trim(),
      monto: datos.monto,
    })
    .eq("id", trabajoId)
    .select();

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("No se pudo guardar la edición.");
  }

  return { data, error: null };
};
