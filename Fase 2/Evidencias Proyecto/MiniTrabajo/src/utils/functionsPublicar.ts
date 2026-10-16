import { decode } from 'base64-arraybuffer';
import { supabase } from '../services/supabase';

export const COSTO_DESTACAR = 2;

// Límites geográficos aproximados de la Región Metropolitana
export const LIMITES_RM = {
  LAT_MIN: -34.30,
  LAT_MAX: -32.90,
  LNG_MIN: -71.80,
  LNG_MAX: -69.75,
};

/**
 * Comprueba si unas coordenadas dadas caen dentro de la Región Metropolitana
 */
export const esUbicacionEnRM = (lat: number, lng: number): boolean => {
  return (
    lat >= LIMITES_RM.LAT_MIN &&
    lat <= LIMITES_RM.LAT_MAX &&
    lng >= LIMITES_RM.LNG_MIN &&
    lng <= LIMITES_RM.LNG_MAX
  );
};

export const limpiarMontoChileno = (montoTexto: string): number => {
  const limpio = montoTexto.replace(/[^0-9]/g, '');
  return parseInt(limpio, 10) || 0;
};

export const formatearMonedaCLP = (monto: number): string => {
  return `$${monto.toLocaleString('es-CL')}`;
};

export const validarFormularioPublicar = (
  titulo: string,
  monto: string,
  descripcion: string,
  categoriaId?: number,
  comunaId?: number,
  destacar: boolean = false,
  creditosDisponibles: number = 0,
  coordenadas?: { latitude: number; longitude: number } | null
): { valido: boolean; error?: string } => {
  if (!titulo.trim() || titulo.trim().length < 6) {
    return { valido: false, error: 'El título debe tener al menos 6 caracteres.' };
  }

  if (!categoriaId) {
    return { valido: false, error: 'Debes seleccionar una categoría.' };
  }

  const montoNum = limpiarMontoChileno(monto);
  if (!montoNum || montoNum < 5000) {
    return { valido: false, error: 'El pago mínimo ofrecido debe ser de al menos $5.000 CLP.' };
  }

  if (!comunaId) {
    return { valido: false, error: 'Debes seleccionar una comuna dentro de la Región Metropolitana.' };
  }

  // Validación de zona si se adjuntaron coordenadas
  if (coordenadas && !esUbicacionEnRM(coordenadas.latitude, coordenadas.longitude)) {
    return {
      valido: false,
      error: 'La ubicación detectada no pertenece a la Región Metropolitana (Santiago).',
    };
  }

  if (!descripcion.trim() || descripcion.trim().length < 20) {
    return { valido: false, error: 'La descripción debe tener al menos 20 caracteres.' };
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
  userId: string
): Promise<string | null> => {
  try {
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    const arrayBuffer = decode(base64);

    const { error: uploadError } = await supabase.storage
      .from('trabajos')
      .upload(fileName, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) return null;

    const { data: urlData } = supabase.storage.from('trabajos').getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch {
    return null;
  }
};