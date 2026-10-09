import { decode } from 'base64-arraybuffer';
import { supabase } from '../services/supabase';

export const COSTO_DESTACAR = 5;
export const MONTO_MINIMO_CLP = 5000;

export function limpiarMontoChileno(montoStr: string): number {
  const limpio = parseInt(montoStr.replace(/[^0-9]/g, ''), 10);
  return isNaN(limpio) ? 0 : limpio;
}

export function formatearMonedaCLP(monto: number): string {
  return `$${monto.toLocaleString('es-CL')}`;
}

export function validarFormularioPublicar(
  titulo: string,
  monto: string,
  descripcion: string,
  categoriaId?: number,
  comunaId?: number,
  destacar?: boolean,
  creditosDisponibles: number = 0
): { valido: boolean; error?: string } {
  const titLimpio = titulo.trim();
  const descLimpia = descripcion.trim();
  const montoNumerico = limpiarMontoChileno(monto);

  if (!titLimpio) return { valido: false, error: 'El título del trabajo es obligatorio.' };
  if (titLimpio.length < 6) return { valido: false, error: 'El título debe tener al menos 6 caracteres.' };
  if (titLimpio.length > 80) return { valido: false, error: 'El título no puede superar los 80 caracteres.' };
  if (!categoriaId) return { valido: false, error: 'Debes seleccionar una categoría.' };
  if (!monto.trim() || montoNumerico <= 0) return { valido: false, error: 'Debes indicar el pago ofrecido.' };
  if (montoNumerico < MONTO_MINIMO_CLP) {
    return { valido: false, error: `El monto mínimo permitido es de ${formatearMonedaCLP(MONTO_MINIMO_CLP)}.` };
  }
  if (!comunaId) return { valido: false, error: 'Debes seleccionar una comuna.' };
  if (!descLimpia) return { valido: false, error: 'La descripción es obligatoria.' };
  if (descLimpia.length < 20) return { valido: false, error: 'Detalla la tarea con al menos 20 caracteres.' };

  if (destacar && creditosDisponibles < COSTO_DESTACAR) {
    return {
      valido: false,
      error: `Saldo insuficiente: requieres ${COSTO_DESTACAR} créditos y cuentas con ${creditosDisponibles}.`,
    };
  }

  return { valido: true };
}

export async function subirImagenTrabajoStorage(base64Data: string, userId: string): Promise<string | null> {
  try {
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('trabajos')
      .upload(fileName, decode(base64Data), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error al subir imagen al bucket trabajos:', uploadError);
      return null;
    }

    const { data } = supabase.storage.from('trabajos').getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    console.error('Error procesando imagen para upload:', err);
    return null;
  }
}