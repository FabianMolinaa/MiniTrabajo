import { esUbicacionEnRM } from "./ubicacion";

export const COSTO_DESTACAR = 2;

export const limpiarMontoChileno = (montoTexto: string): number => {
  const limpio = montoTexto.replace(/[^0-9]/g, "");
  return parseInt(limpio, 10) || 0;
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
