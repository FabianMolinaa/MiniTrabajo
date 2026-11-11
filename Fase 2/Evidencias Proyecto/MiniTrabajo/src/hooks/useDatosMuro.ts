import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import {
  fetchCategoriasFiltro, fetchComunasFiltro,
  type CategoriaFiltro, type ComunaFiltro,
} from '../services/catalogos';
import { fetchTrabajosMuro, type TrabajoUI } from '../utils/functionsTrabajos';
import type { EstadoCargaLista } from './useListaRemota';

interface Coordenadas { latitude: number; longitude: number; }

export function useDatosMuro(coordenadasRef: { current: Coordenadas | null }) {
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [trabajos, setTrabajos] = useState<TrabajoUI[]>([]);
  const [categorias, setCategorias] = useState<CategoriaFiltro[]>([]);
  const [comunas, setComunas] = useState<ComunaFiltro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [errorTrabajos, setErrorTrabajos] = useState<string | null>(null);
  const [estadoFiltros, setEstadoFiltros] = useState<EstadoCargaLista>('cargando');
  const [errorFiltros, setErrorFiltros] = useState<string | null>(null);
  const solicitudRef = useRef(0);
  useEffect(() => () => { solicitudRef.current += 1; }, []);

  const cargarDatos = useCallback(async (coordsOverride?: Coordenadas | null) => {
    const solicitud = ++solicitudRef.current;
    const vigente = () => solicitud === solicitudRef.current;
    setCargando(true);
    setTrabajos([]);
    setCategorias([]);
    setComunas([]);
    setErrorTrabajos(null);
    setErrorFiltros(null);
    setEstadoFiltros('cargando');
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!vigente()) return;
      if (error || !user) throw new Error('No se pudo verificar la sesión.');
      setUsuarioId(user.id);
      const coords = coordsOverride !== undefined ? coordsOverride : coordenadasRef.current;
      await Promise.allSettled([
        (async () => {
          try {
            const lista = await fetchTrabajosMuro(user.id, coords);
            if (vigente()) {
              // Es el estado de la postulación de esta cuenta, no el del trabajo.
              setTrabajos(lista.filter(trabajo => trabajo.estado !== 'rechazado'));
            }
          } catch {
            if (vigente()) setErrorTrabajos('No pudimos cargar los trabajos. Revisa tu conexión e inténtalo nuevamente.');
          } finally {
            if (vigente()) setCargando(false);
          }
        })(),
        (async () => {
          try {
            const [cats, coms] = await Promise.all([fetchCategoriasFiltro(), fetchComunasFiltro()]);
            if (vigente()) {
              setCategorias(cats);
              setComunas(coms);
              setEstadoFiltros('lista');
            }
          } catch {
            if (vigente()) {
              setErrorFiltros('No pudimos cargar los filtros. Revisa tu conexión e inténtalo nuevamente.');
              setEstadoFiltros('error');
            }
          }
        })(),
      ]);
    } catch {
      if (vigente()) {
        setUsuarioId(null);
        setErrorTrabajos('No pudimos cargar los trabajos. Revisa tu conexión e inténtalo nuevamente.');
        setErrorFiltros('No pudimos cargar los filtros. Inténtalo nuevamente.');
        setEstadoFiltros('error');
        setCargando(false);
      }
    } finally {
      if (vigente()) setRefrescando(false);
    }
  }, [coordenadasRef]);

  return { usuarioId, trabajos, categorias, comunas, cargando, refrescando,
    setRefrescando, errorTrabajos, estadoFiltros, errorFiltros, cargarDatos };
}
