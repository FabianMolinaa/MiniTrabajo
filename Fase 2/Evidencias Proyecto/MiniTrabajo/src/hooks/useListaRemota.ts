import { useCallback, useEffect, useRef, useState } from 'react';

export type EstadoCargaLista = 'sin_cargar' | 'cargando' | 'lista' | 'error';

interface CargaLista<T> {
  datos: T[];
  estado: EstadoCargaLista;
  error: string | null;
}

export function useListaRemota<T>(
  consultar: (id: string) => Promise<T[]>,
  mensajeError: string,
) {
  const [carga, setCarga] = useState<CargaLista<T>>({
    datos: [],
    estado: 'sin_cargar',
    error: null,
  });
  const solicitudRef = useRef(0);

  useEffect(() => () => { solicitudRef.current += 1; }, []);

  const cargar = useCallback(async (id: string): Promise<void> => {
    const solicitud = ++solicitudRef.current;
    setCarga({ datos: [], estado: 'cargando', error: null });
    try {
      const datos = await consultar(id);
      if (solicitud === solicitudRef.current) {
        setCarga({ datos, estado: 'lista', error: null });
      }
    } catch {
      if (solicitud === solicitudRef.current) {
        setCarga({ datos: [], estado: 'error', error: mensajeError });
      }
    }
  }, [consultar, mensajeError]);

  return { ...carga, cargar };
}