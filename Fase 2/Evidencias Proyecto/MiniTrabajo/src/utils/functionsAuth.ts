// ==========================================
// 1. VALIDACIÓN DE CONTRASEÑA
// ==========================================

export interface ReglasPassword {
  longitudMinima: boolean;
  tieneMayuscula: boolean;
  tieneMinuscula: boolean;
  tieneNumero: boolean;
}

export interface ResultadoPassword {
  esValida: boolean;
  reglas: ReglasPassword;
}

/**
 * Valida la seguridad de la contraseña: mínimo 8 caracteres, mayúscula, minúscula y número.
 */
export function validarPassword(password: string): ResultadoPassword {
  const reglas: ReglasPassword = {
    longitudMinima: password.length >= 8,
    tieneMayuscula: /[A-Z]/.test(password),
    tieneMinuscula: /[a-z]/.test(password),
    tieneNumero: /[0-9]/.test(password),
  };

  const esValida =
    reglas.longitudMinima &&
    reglas.tieneMayuscula &&
    reglas.tieneMinuscula &&
    reglas.tieneNumero;

  return { esValida, reglas };
}


// ==========================================
// 2. VALIDACIÓN Y FORMATEO DE RUT CHILENO
// ==========================================

/**
 * Limpia cualquier carácter que no sea número o K (en mayúscula).
 */
export function limpiarRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

/**
 * Valida el RUT mediante el algoritmo oficial Módulo 11 del Registro Civil.
 */
export function validarRutChileno(rutRaw: string): boolean {
  const limpio = limpiarRut(rutRaw);
  if (limpio.length < 8 || limpio.length > 9) return false;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  let suma = 0;
  let multiplo = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }

  const resto = 11 - (suma % 11);
  let dvEsperado = '';

  if (resto === 11) dvEsperado = '0';
  else if (resto === 10) dvEsperado = 'K';
  else dvEsperado = resto.toString();

  return dv === dvEsperado;
}

/**
 * Aplica formato estándar con guion al RUT (ej: 19876543-K).
 */
export function formatearRutFinal(rutRaw: string): string {
  const limpio = limpiarRut(rutRaw);
  if (limpio.length <= 1) return limpio;
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}


// ==========================================
// 3. VALIDACIÓN Y ESTANDARIZACIÓN DE TELÉFONO
// ==========================================

/**
 * Estandariza cualquier formato nacional al estándar internacional chileno (+569XXXXXXXX).
 */
export function estandarizarTelefonoChileno(tel: string): string {
  const digitos = tel.replace(/[^0-9]/g, '');

  if (digitos.length === 8) {
    return `+569${digitos}`;
  }

  if (digitos.length === 9 && digitos.startsWith('9')) {
    return `+56${digitos}`;
  }

  if (digitos.length === 11 && digitos.startsWith('569')) {
    return `+${digitos}`;
  }

  if (digitos.length > 8) {
    return `+569${digitos.slice(-8)}`;
  }

  return digitos;
}

/**
 * Comprueba que el campo tenga exactamente los 8 dígitos requeridos tras el prefijo '+56 9'.
 */
export function validarTelefonoChileno(tel: string): boolean {
  const digitos = tel.replace(/[^0-9]/g, '');
  return digitos.length === 8;
}