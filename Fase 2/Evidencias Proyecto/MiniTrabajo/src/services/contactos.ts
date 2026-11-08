import { Linking } from 'react-native';
import { supabase } from './supabase';

export async function abrirWhatsAppTrabajo(
  trabajoId: string,
  mensaje: string
): Promise<void> {
  const { data, error } = await supabase.rpc(
    'obtener_contacto_trabajo',
    {
      p_trabajo_id: trabajoId,
    }
  );

  if (error) {
    console.warn('Error al consultar contacto autorizado:', {
      code: error.code,
      message: error.message,
    });

    throw new Error(
      'No pudimos consultar el contacto. Inténtalo nuevamente.'
    );
  }

  const contacto =
    Array.isArray(data) && data.length === 1
      ? data[0]
      : null;

  if (!contacto) {
    throw new Error(
      'El contacto solo está disponible para las partes de un acuerdo aceptado.'
    );
  }

  if (
    typeof contacto.telefono !== 'string' ||
    !contacto.telefono.trim()
  ) {
    throw new Error(
      'La otra persona no tiene un teléfono registrado.'
    );
  }

  const telefono = contacto.telefono.replace(/\D/g, '');

  // Número móvil chileno con código de país.
  if (!/^569\d{8}$/.test(telefono)) {
    throw new Error(
      'El teléfono registrado no tiene un formato móvil chileno válido.'
    );
  }

  const url =
    `https://wa.me/${telefono}` +
    `?text=${encodeURIComponent(mensaje)}`;

  try {
    await Linking.openURL(url);
  } catch {
    throw new Error(
      'No pudimos abrir WhatsApp. Comprueba que esté instalado.'
    );
  }
}