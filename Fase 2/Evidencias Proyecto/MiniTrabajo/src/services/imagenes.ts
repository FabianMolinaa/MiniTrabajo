import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";

export const subirImagenTrabajoStorage = async (
  base64: string,
  userId: string,
): Promise<string> => {
  try {
    const fileName =
      `${userId}/${Date.now()}-` +
      `${Math.random().toString(36).substring(7)}.jpg`;

    const arrayBuffer = decode(base64);

    const { error: uploadError } = await supabase.storage
      .from("trabajos")
      .upload(fileName, arrayBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("trabajos").getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error: unknown) {
    console.warn(
      "Error al subir imagen de trabajo:",
      error instanceof Error ? error.message : "Error de almacenamiento",
    );

    throw new Error(
      "No pudimos subir una imagen del trabajo. Prueba con otra imagen o una de menor tamaño.",
    );
  }
};

export const subirAvatarStorage = async (
  base64Data: string,
  uid: string,
): Promise<string> => {
  try {
    const fileName = `${uid}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, decode(base64Data), {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error: unknown) {
    console.warn(
      "Error al subir foto de perfil:",
      error instanceof Error ? error.message : "Error de almacenamiento",
    );

    throw new Error(
      "No pudimos subir tu foto de perfil. Prueba con otra imagen o una de menor tamaño.",
    );
  }
};
