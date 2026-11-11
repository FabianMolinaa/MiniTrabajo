export function leerCalificacionResena(valor: number | string): number {
  const calificacion = Number(valor);
  if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
    throw new Error('No pudimos cargar las calificaciones. Inténtalo nuevamente.');
  }
  return calificacion;
}
