import type { TrabajoUI } from '../services/trabajos';
import {
  aproximarUbicacion,
  esUbicacionEnRM,
  LIMITES_RM,
  type Coordenadas,
} from './ubicacion';

// Encuadre inicial del mapa y referencia de respaldo.
export const SANTIAGO_REGION_DEFAULT = {
  latitude: -33.4489,
  longitude: -70.6693,
  latitudeDelta: 0.09,
  longitudeDelta: 0.09,
};

function hashString(texto: string): number {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = Math.imul(31, hash) + texto.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

export function obtenerCoordenadasTrabajo(trabajo: TrabajoUI): Coordenadas {
  const lat = Number(trabajo.latitud);
  const lng = Number(trabajo.longitud);
  const comunaLat = Number(trabajo.comunaLatitud);
  const comunaLng = Number(trabajo.comunaLongitud);

  let base: Coordenadas;

  if (esUbicacionEnRM(lat, lng)) {
    base = aproximarUbicacion({ latitude: lat, longitude: lng });
  } else if (esUbicacionEnRM(comunaLat, comunaLng)) {
    base = { latitude: comunaLat, longitude: comunaLng };
  } else {
    base = SANTIAGO_REGION_DEFAULT;
  }

  // Separación visual estable, de hasta unos 85 m, para distinguir pines.
  // La protección del GPS proviene de la cuadrícula aproximada guardada.
  const semilla = hashString(trabajo.id || trabajo.titulo);
  const offsetLat = ((semilla % 101) - 50) * 0.000015;
  const offsetLng = ((Math.floor(semilla / 101) % 101) - 50) * 0.000018;

  return {
    latitude: Math.max(
      LIMITES_RM.LAT_MIN,
      Math.min(LIMITES_RM.LAT_MAX, base.latitude + offsetLat),
    ),
    longitude: Math.max(
      LIMITES_RM.LNG_MIN,
      Math.min(LIMITES_RM.LNG_MAX, base.longitude + offsetLng),
    ),
  };
}

export const darkMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#161b22' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#0d1117' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8b949e' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#c9d1d9' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6e7681' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#12231e' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3fb950' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#21262d' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#161b22' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8b949e' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2b313a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f242c' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#e6edf3' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#161b22' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#58a6ff' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#091522' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#388bfd' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#091522' }],
  },
];
