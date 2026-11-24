import { supabase } from "./supabase";

export interface RespuestaEnvio2FA {
  ok: boolean;
  mensaje?: string;
  error?: string;
}

export interface RespuestaVerificacion2FA {
  valido: boolean;
  error?: string;
}

/**
 * Solicita a Supabase que genere un código OTP de 6 dígitos y lo envíe
 * al correo del usuario a través de la API transaccional de Brevo.
 */
export async function solicitarCodigo2FA(
  email: string,
  tipo: "login" | "registro" = "login",
): Promise<RespuestaEnvio2FA> {
  try {
    const { data, error } = await supabase.rpc("enviar_codigo_2fa", {
      p_email: email.trim().toLowerCase(),
      p_tipo: tipo,
    });

    if (error) {
      console.warn("Error al llamar a enviar_codigo_2fa:", error);
      return {
        ok: false,
        error: "No pudimos enviar el código de verificación por correo.",
      };
    }

    return (data as RespuestaEnvio2FA) ?? {
      ok: false,
      error: "Respuesta inesperada del servidor.",
    };
  } catch (e) {
    console.warn("Excepción en solicitarCodigo2FA:", e);
    return {
      ok: false,
      error: "Ocurrió un error al conectar con el servicio de autenticación.",
    };
  }
}

/**
 * Valida si el código de 6 dígitos ingresado por el usuario coincide con
 * el último código activo enviado por Brevo y no ha expirado.
 */
export async function verificarCodigo2FA(
  email: string,
  codigo: string,
  tipo: "login" | "registro" = "login",
): Promise<RespuestaVerificacion2FA> {
  try {
    const { data, error } = await supabase.rpc("verificar_codigo_2fa", {
      p_email: email.trim().toLowerCase(),
      p_codigo: codigo.trim(),
      p_tipo: tipo,
    });

    if (error) {
      console.warn("Error al llamar a verificar_codigo_2fa:", error);
      return {
        valido: false,
        error: "No pudimos validar tu código de seguridad.",
      };
    }

    return (data as RespuestaVerificacion2FA) ?? {
      valido: false,
      error: "Respuesta inesperada del servidor.",
    };
  } catch (e) {
    console.warn("Excepción en verificarCodigo2FA:", e);
    return {
      valido: false,
      error: "Error de red al verificar el código.",
    };
  }
}
