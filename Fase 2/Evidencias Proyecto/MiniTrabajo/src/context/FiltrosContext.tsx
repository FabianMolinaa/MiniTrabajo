import React, { createContext, useContext, useState, useMemo } from 'react';

export const MONTO_MIN_BASE = 0;
export const MONTO_MAX_BASE = 150000;
export const RADIOS_OPCIONES = [
  { label: '3 km', valor: 3 },
  { label: '5 km', valor: 5 },
  { label: '10 km', valor: 10 },
  { label: '25 km', valor: 25 },
  { label: 'Todos', valor: null },
];

export interface FiltrosContextType {
  busqueda: string;
  setBusqueda: (val: string) => void;
  categoriaSelId: number | 'todas';
  setCategoriaSelId: (val: number | 'todas') => void;
  comunaSelId: number | 'todas';
  setComunaSelId: (val: number | 'todas') => void;
  radioDistanciaKm: number | null;
  setRadioDistanciaKm: (val: number | null) => void;
  montoMinimo: number;
  setMontoMinimo: (val: number) => void;
  montoMaximo: number;
  setMontoMaximo: (val: number) => void;
  hayFiltrosActivos: boolean;
  limpiarFiltros: () => void;
}

const FiltrosContext = createContext<FiltrosContextType | undefined>(undefined);

export function FiltrosProvider({ children }: { children: React.ReactNode }) {
  const [busqueda, setBusqueda] = useState<string>('');
  const [categoriaSelId, setCategoriaSelId] = useState<number | 'todas'>('todas');
  const [comunaSelId, setComunaSelId] = useState<number | 'todas'>('todas');
  const [radioDistanciaKm, setRadioDistanciaKm] = useState<number | null>(null);
  const [montoMinimo, setMontoMinimo] = useState<number>(MONTO_MIN_BASE);
  const [montoMaximo, setMontoMaximo] = useState<number>(MONTO_MAX_BASE);

  const hayFiltrosActivos = useMemo(() => {
    return (
      categoriaSelId !== 'todas' ||
      comunaSelId !== 'todas' ||
      radioDistanciaKm !== null ||
      montoMinimo > MONTO_MIN_BASE ||
      montoMaximo < MONTO_MAX_BASE
    );
  }, [categoriaSelId, comunaSelId, radioDistanciaKm, montoMinimo, montoMaximo]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setCategoriaSelId('todas');
    setComunaSelId('todas');
    setRadioDistanciaKm(null);
    setMontoMinimo(MONTO_MIN_BASE);
    setMontoMaximo(MONTO_MAX_BASE);
  };

  return (
    <FiltrosContext.Provider
      value={{
        busqueda,
        setBusqueda,
        categoriaSelId,
        setCategoriaSelId,
        comunaSelId,
        setComunaSelId,
        radioDistanciaKm,
        setRadioDistanciaKm,
        montoMinimo,
        setMontoMinimo,
        montoMaximo,
        setMontoMaximo,
        hayFiltrosActivos,
        limpiarFiltros,
      }}
    >
      {children}
    </FiltrosContext.Provider>
  );
}

export function useFiltros(): FiltrosContextType {
  const context = useContext(FiltrosContext);
  if (!context) {
    throw new Error('useFiltros debe usarse dentro de un FiltrosProvider');
  }
  return context;
}

