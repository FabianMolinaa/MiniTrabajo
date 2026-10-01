// Estandariza cualquier formato chileno al estándar oficial: +569XXXXXXXX
export function estandarizarTelefonoChileno(tel: string): string {
  const digitos = tel.replace(/[^0-9]/g, '');

  // Si ingresó los 8 dígitos directos (ej: 12345678)
  if (digitos.length === 8) {
    return `+569${digitos}`;
  }

  // Si ingresó con el 9 inicial (ej: 912345678)
  if (digitos.length === 9 && digitos.startsWith('9')) {
    return `+56${digitos}`;
  }

  // Si ingresó código sin el signo + (ej: 56912345678)
  if (digitos.length === 11 && digitos.startsWith('569')) {
    return `+${digitos}`;
  }

  // Si ingresó más de 8 dígitos de forma irregular, extrae los últimos 8
  if (digitos.length > 8) {
    return `+569${digitos.slice(-8)}`;
  }

  return digitos;
}

// Valida que el campo tenga exactamente los 8 dígitos requeridos tras el prefijo '+56 9'
export function validarTelefonoChileno(tel: string): boolean {
  const digitos = tel.replace(/[^0-9]/g, '');
  return digitos.length === 8;
}