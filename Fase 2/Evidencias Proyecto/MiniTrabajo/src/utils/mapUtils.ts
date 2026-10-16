import { TrabajoUI } from './functionsTrabajos';

// Coordenadas aproximadas del centro de comunas de la Región Metropolitana (Santiago)
export const COMUNAS_SANTIAGO_COORDS: Record<string, { latitude: number; longitude: number }> = {
  'santiago': { latitude: -33.4489, longitude: -70.6693 },
  'santiago centro': { latitude: -33.4489, longitude: -70.6693 },
  'providencia': { latitude: -33.4314, longitude: -70.6093 },
  'las condes': { latitude: -33.4117, longitude: -70.5666 },
  'ñuñoa': { latitude: -33.4569, longitude: -70.5980 },
  'nunoa': { latitude: -33.4569, longitude: -70.5980 },
  'la florida': { latitude: -33.5227, longitude: -70.5983 },
  'maipú': { latitude: -33.5111, longitude: -70.7581 },
  'maipu': { latitude: -33.5111, longitude: -70.7581 },
  'puente alto': { latitude: -33.6117, longitude: -70.5758 },
  'san miguel': { latitude: -33.4939, longitude: -70.6558 },
  'la reina': { latitude: -33.4439, longitude: -70.5369 },
  'macul': { latitude: -33.4917, longitude: -70.6028 },
  'estación central': { latitude: -33.4611, longitude: -70.6972 },
  'estacion central': { latitude: -33.4611, longitude: -70.6972 },
  'recoleta': { latitude: -33.4069, longitude: -70.6389 },
  'independencia': { latitude: -33.4194, longitude: -70.6556 },
  'quilicura': { latitude: -33.3644, longitude: -70.7303 },
  'pudahuel': { latitude: -33.4417, longitude: -70.7667 },
  'vitacura': { latitude: -33.3833, longitude: -70.5833 },
  'lo barnechea': { latitude: -33.3533, longitude: -70.5167 },
  'san bernardo': { latitude: -33.5928, longitude: -70.7028 },
  'peñalolén': { latitude: -33.4833, longitude: -70.5333 },
  'penalolen': { latitude: -33.4833, longitude: -70.5333 },
  'cerrillos': { latitude: -33.5000, longitude: -70.7167 },
  'huechuraba': { latitude: -33.3750, longitude: -70.6361 },
  'quinta normal': { latitude: -33.4333, longitude: -70.6944 },
  'conchalí': { latitude: -33.3833, longitude: -70.6778 },
  'conchali': { latitude: -33.3833, longitude: -70.6778 },
  'renca': { latitude: -33.4056, longitude: -70.7278 },
  'lo prado': { latitude: -33.4444, longitude: -70.7222 },
  'cerro navia': { latitude: -33.4222, longitude: -70.7389 },
  'san joaquín': { latitude: -33.4944, longitude: -70.6278 },
  'san joaquin': { latitude: -33.4944, longitude: -70.6278 },
  'la cisterna': { latitude: -33.5278, longitude: -70.6611 },
  'la granja': { latitude: -33.5333, longitude: -70.6194 },
  'la pintana': { latitude: -33.5833, longitude: -70.6333 },
  'el bosque': { latitude: -33.5639, longitude: -70.6694 },
  'pedro aguirre cerda': { latitude: -33.4861, longitude: -70.6778 },
  'lo espejo': { latitude: -33.5222, longitude: -70.6889 },
  'colina': { latitude: -33.2000, longitude: -70.6750 },
  'lampa': { latitude: -33.2833, longitude: -70.8667 },
  'til til': { latitude: -33.0833, longitude: -70.9333 },
  'pirque': { latitude: -33.6333, longitude: -70.5667 },
  'san josé de maipo': { latitude: -33.6389, longitude: -70.3500 },
  'san jose de maipo': { latitude: -33.6389, longitude: -70.3500 },
  'buin': { latitude: -33.7333, longitude: -70.7333 },
  'paine': { latitude: -33.8167, longitude: -70.7500 },
  'melipilla': { latitude: -33.7000, longitude: -71.2167 },
  'talagante': { latitude: -33.6667, longitude: -70.9333 },
  'peñaflor': { latitude: -33.6000, longitude: -70.8833 },
  'penaflor': { latitude: -33.6000, longitude: -70.8833 },
  'isla de maipo': { latitude: -33.7500, longitude: -70.9000 },
  'el monte': { latitude: -33.6833, longitude: -71.0167 },
  'padre hurtado': { latitude: -33.5667, longitude: -70.8167 },
};

export const SANTIAGO_REGION_DEFAULT = {
  latitude: -33.4489,
  longitude: -70.6693,
  latitudeDelta: 0.09,
  longitudeDelta: 0.09,
};

/**
 * Función pseudoaleatoria determinista para evitar superposición exacta
 * de pines cuando varios trabajos pertenecen a una misma comuna y no tienen GPS exacto.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Obtiene o calcula las coordenadas para un trabajo en el mapa.
 * 1. Prioriza coordenadas reales (latitud / lat y longitud / lng).
 * 2. Si no tiene, busca el centro de la comuna con una pequeña variación estética.
 * 3. Si tampoco coincide, retorna centro de Santiago con pequeña dispersión.
 */
export function obtenerCoordenadasTrabajo(
  trabajo: TrabajoUI & { lat?: number | null; lng?: number | null }
): { latitude: number; longitude: number } {
  const lat = trabajo.latitud ?? trabajo.lat;
  const lng = trabajo.longitud ?? trabajo.lng;

  if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    // Verificar que no sea 0,0
    if (latNum !== 0 || lngNum !== 0) {
      return { latitude: latNum, longitude: lngNum };
    }
  }

  // Fallback a comuna
  const comunaNormalizada = (trabajo.comuna || '').toLowerCase().trim();
  const centroComuna = COMUNAS_SANTIAGO_COORDS[comunaNormalizada];

  const seed = hashString(trabajo.id || trabajo.titulo);
  const offsetLat = ((seed % 100) - 50) * 0.00018;
  const offsetLng = (((seed >> 3) % 100) - 50) * 0.00018;

  if (centroComuna) {
    return {
      latitude: centroComuna.latitude + offsetLat,
      longitude: centroComuna.longitude + offsetLng,
    };
  }

  // Fallback general centro de Santiago
  return {
    latitude: SANTIAGO_REGION_DEFAULT.latitude + offsetLat * 2,
    longitude: SANTIAGO_REGION_DEFAULT.longitude + offsetLng * 2,
  };
}

/**
 * Estilo visual oscuro (Dark Theme) para Google Maps en react-native-maps.
 * Se alinea armoniosamente con la paleta '#0d0f12', '#141820', '#242a35' de MiniTrabajo.
 */
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
