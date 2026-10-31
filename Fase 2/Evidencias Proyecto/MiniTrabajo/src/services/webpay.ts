import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';

const BANCO_ORIGIN = 'https://webpay3gint.transbank.cl';

export const CONFIRMACION_URL =
  'https://ajbgivxwszqbxoottewb.supabase.co/functions/v1/webpay-confirmar';

export interface CompraCreditos {
  id: string;
  paquete_id: string;
  monto_clp: number;
  creditos: number;
  estado: string;
  acreditado_en: string | null;
}

export interface PagoWebpay {
  compra: CompraCreditos;
  token: string | null;
  url: string | null;
  reanudado: boolean;
}

interface Intento {
  solicitudId: string;
  paqueteId: string;
  compraId?: string;
}

const clave = (usuarioId: string) =>
  `minitrabajo:webpay:intento:${usuarioId}`;

const campos =
  'id, paquete_id, monto_clp, creditos, estado, acreditado_en';

const esFinal = (estado: string) =>
  ['aprobado', 'rechazado', 'anulado', 'expirado', 'error'].includes(estado);

async function sesionActual() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    throw new Error('Inicia sesión para comprar créditos.');
  }

  return data.session;
}

async function detalleError(
  error: unknown
): Promise<{ mensaje: string; compraId?: string }> {
  const e = error as {
    message?: string;
    context?: Response;
  };

  try {
    if (e.context && typeof e.context.clone === 'function') {
      const texto = await e.context.clone().text();

      try {
        const body = JSON.parse(texto);

        return {
          mensaje:
            typeof body.error === 'string'
              ? body.error
              : 'No se pudo procesar el pago.',
          compraId:
            typeof body.compra_id === 'string'
              ? body.compra_id
              : undefined,
        };
      } catch {
        if (texto.trim()) {
          return { mensaje: texto.slice(0, 500) };
        }
      }
    }
  } catch {
    // Conservamos el intento si no se pudo leer la respuesta.
  }

  return {
    mensaje:
      e.message || 'No se pudo conectar con el backend de pagos.',
  };
}

export async function consultarCompra(
  compraId: string
): Promise<CompraCreditos> {
  const { data, error } = await supabase
    .from('compras_creditos')
    .select(campos)
    .eq('id', compraId)
    .single();

  if (error || !data) {
    throw new Error(
      'No se pudo consultar la compra. Vuelve a verificarla.'
    );
  }

  return data as CompraCreditos;
}

export async function crearORecuperarPago(
  paqueteId: string | null,
  nuevaCompra = false
): Promise<PagoWebpay> {
  const sesion = await sesionActual();
  const storageKey = clave(sesion.user.id);
  const guardado = await AsyncStorage.getItem(storageKey);

  let intento: Intento | null = null;

  if (guardado && !(nuevaCompra && paqueteId !== null)) {
    try {
      const valor = JSON.parse(guardado);

      if (
        !valor ||
        typeof valor.solicitudId !== 'string' ||
        typeof valor.paqueteId !== 'string' ||
        (
          valor.compraId !== undefined &&
          typeof valor.compraId !== 'string'
        )
      ) {
        throw new Error();
      }

      intento = valor;
    } catch {
      throw new Error(
        'El intento guardado no se pudo leer. Puedes cerrar este intento desde esta pantalla.'
      );
    }
  }

  if (intento?.compraId) {
    const compra = await consultarCompra(intento.compraId);

    if (esFinal(compra.estado)) {
      if (!nuevaCompra || paqueteId === null) {
        return {
          compra,
          token: null,
          url: null,
          reanudado: true,
        };
      }

      intento = null;
    }
  }

  const reanudado = intento !== null;

  if (!intento) {
    if (paqueteId === null) {
      throw new Error(
        'No hay una compra guardada para retomar. Vuelve al perfil y elige un paquete.'
      );
    }

    intento = {
      solicitudId: Crypto.randomUUID(),
      paqueteId,
    };

    // Guardamos antes de llamar al servidor para reutilizar la solicitud.
    await AsyncStorage.setItem(
      storageKey,
      JSON.stringify(intento)
    );
  }

  const { data, error } = await supabase.functions.invoke(
    'webpay-crear',
    {
      headers: {
        Authorization: `Bearer ${sesion.access_token}`,
      },
      body: {
        paquete_id: intento.paqueteId,
        solicitud_id: intento.solicitudId,
      },
    }
  );

  if (error) {
    const detalle = await detalleError(error);

    if (detalle.compraId) {
      intento.compraId = detalle.compraId;

      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify(intento)
      );
    }

    throw new Error(detalle.mensaje);
  }

  if (!data || typeof data.compra_id !== 'string') {
    throw new Error('El backend devolvió una respuesta inválida.');
  }

  intento.compraId = data.compra_id;

  await AsyncStorage.setItem(
    storageKey,
    JSON.stringify(intento)
  );

  const compra = await consultarCompra(data.compra_id);

  if (esFinal(compra.estado)) {
    return {
      compra,
      token: null,
      url: null,
      reanudado,
    };
  }

  if (
    typeof data.token !== 'string' ||
    !/^[A-Za-z0-9_-]{1,64}$/.test(data.token) ||
    typeof data.url !== 'string'
  ) {
    throw new Error(
      'No se recibió una dirección de pago válida. Retoma el intento para verificarlo.'
    );
  }

  const destino = new URL(data.url);

  if (
    destino.origin !== BANCO_ORIGIN ||
    destino.username ||
    destino.password
  ) {
    throw new Error(
      'La dirección recibida no corresponde a Webpay de pruebas.'
    );
  }

  return {
    compra,
    token: data.token,
    url: data.url,
    reanudado,
  };
}

export async function verificarPago(
  pago: PagoWebpay
): Promise<CompraCreditos> {
  if (!pago.token) {
    return consultarCompra(pago.compra.id);
  }

  const { error } = await supabase.functions.invoke(
    'webpay-confirmar',
    {
      body: {
        token_ws: pago.token,
      },
    }
  );

  // Consultamos el registro aunque haya fallado recibir la respuesta.
  const compra = await consultarCompra(pago.compra.id);

  if (esFinal(compra.estado)) {
    return compra;
  }

  if (error) {
    throw new Error((await detalleError(error)).mensaje);
  }

  return compra;
}

export async function olvidarIntento(): Promise<void> {
  const sesion = await sesionActual();

  await AsyncStorage.removeItem(
    clave(sesion.user.id)
  );
}

export function esRetornoWebpay(direccion: string): boolean {
  try {
    const actual = new URL(direccion);
    const esperado = new URL(CONFIRMACION_URL);

    return (
      actual.origin === esperado.origin &&
      actual.pathname === esperado.pathname
    );
  } catch {
    return false;
  }
}
export async function hayIntentoPendiente(): Promise<boolean> {
  const sesion = await sesionActual();
  const guardado = await AsyncStorage.getItem(
    clave(sesion.user.id)
  );

  if (!guardado) return false;

  let intento: Intento;

  try {
    const valor = JSON.parse(guardado);

    if (
      !valor ||
      typeof valor.solicitudId !== 'string' ||
      typeof valor.paqueteId !== 'string' ||
      (
        valor.compraId !== undefined &&
        typeof valor.compraId !== 'string'
      )
    ) {
      throw new Error();
    }

    intento = valor;
  } catch {
    throw new Error(
      'No se pudo leer el intento guardado. Puedes cerrarlo desde esta pantalla.'
    );
  }

  if (!intento.compraId) return true;

  const compra = await consultarCompra(intento.compraId);

  return !esFinal(compra.estado);
}