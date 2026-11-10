export interface Coordenadas {
  latitude: number;
  longitude: number;
}

export const LIMITES_RM = {
  LAT_MIN: -34.3,
  LAT_MAX: -32.9,
  LNG_MIN: -71.8,
  LNG_MAX: -69.75,
};

export function esUbicacionEnRM(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= LIMITES_RM.LAT_MIN &&
    lat <= LIMITES_RM.LAT_MAX &&
    lng >= LIMITES_RM.LNG_MIN &&
    lng <= LIMITES_RM.LNG_MAX
  );
}

export function aproximarUbicacion(punto: Coordenadas): Coordenadas {
  if (!esUbicacionEnRM(punto.latitude, punto.longitude)) {
    throw new Error('La ubicación no pertenece a la zona habilitada.');
  }

  return {
    latitude: Number(punto.latitude.toFixed(2)),
    longitude: Number(punto.longitude.toFixed(2)),
  };
}