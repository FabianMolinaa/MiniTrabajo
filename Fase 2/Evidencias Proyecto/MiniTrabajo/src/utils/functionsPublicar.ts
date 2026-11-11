import { decode } from "base64-arraybuffer";
import { supabase } from "../services/supabase";
import { esUbicacionEnRM } from "./ubicacion";
export { LIMITES_RM, esUbicacionEnRM } from "./ubicacion";

export const COSTO_DESTACAR = 2;

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

export const limpiarMontoChileno = (montoTexto: string): number => {
  const limpio = montoTexto.replace(/[^0-9]/g, "");
  return parseInt(limpio, 10) || 0;
};

export const formatearMonedaCLP = (monto: number): string => {
  return `$${monto.toLocaleString("es-CL")}`;
};

export const validarFormularioPublicar = (
  titulo: string,
  monto: string,
  descripcion: string,
  categoriaId?: number,
  comunaId?: number,
  destacar: boolean = false,
  creditosDisponibles: number = 0,
  coordenadas?: { latitude: number; longitude: number } | null,
): { valido: boolean; error?: string } => {
  if (titulo.trim().length < 6 || titulo.trim().length > 80) {
    return {
      valido: false,
      error: "El título debe tener entre 6 y 80 caracteres.",
    };
  }

  if (!categoriaId) {
    return { valido: false, error: "Debes seleccionar una categoría." };
  }

  const montoNum = limpiarMontoChileno(monto);
  if (!montoNum || montoNum < 5000) {
    return {
      valido: false,
      error: "El pago mínimo ofrecido debe ser de al menos $5.000 CLP.",
    };
  }

  if (!comunaId) {
    return {
      valido: false,
      error: "Debes seleccionar una comuna dentro de la Región Metropolitana.",
    };
  }

  // Validación de zona si se adjuntaron coordenadas
  if (
    coordenadas &&
    !esUbicacionEnRM(coordenadas.latitude, coordenadas.longitude)
  ) {
    return {
      valido: false,
      error:
        "La ubicación detectada no pertenece a la Región Metropolitana (Santiago).",
    };
  }

  if (descripcion.trim().length < 20 || descripcion.trim().length > 2000) {
    return {
      valido: false,
      error: "La descripción debe tener entre 20 y 2.000 caracteres.",
    };
  }

  if (destacar && creditosDisponibles < COSTO_DESTACAR) {
    return {
      valido: false,
      error: `No tienes suficientes créditos (${creditosDisponibles}/${COSTO_DESTACAR}).`,
    };
  }

  return { valido: true };
};

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
