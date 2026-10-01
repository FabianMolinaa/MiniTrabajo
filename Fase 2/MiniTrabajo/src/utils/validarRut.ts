// Limpia cualquier carácter que no sea número o K
export function limpiarRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

// Algoritmo oficial Módulo 11 del Registro Civil
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

// Formato con guión al terminar (ej: 19876543-K)
export function formatearRutFinal(rutRaw: string): string {
  const limpio = limpiarRut(rutRaw);
  if (limpio.length <= 1) return limpio;
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}