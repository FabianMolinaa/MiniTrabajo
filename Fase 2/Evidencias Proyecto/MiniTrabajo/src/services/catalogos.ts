import { supabase } from "./supabase";

export interface CategoriaFiltro {
  id: number;
  nombre: string;
  icono?: string;
}

export interface ComunaFiltro {
  id: number;
  nombre: string;
}

export const fetchCategoriasFiltro = async (): Promise<CategoriaFiltro[]> => {
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nombre, icono")
    .order("id")
    .overrideTypes<CategoriaFiltro[], { merge: false }>();
  if (error || data === null) {
    console.warn("Error al consultar categorías:", { code: error?.code });
    throw new Error("No pudimos cargar las categorías. Inténtalo nuevamente.");
  }
  return data;
};

export const fetchComunasFiltro = async (): Promise<ComunaFiltro[]> => {
  const { data, error } = await supabase
    .from("comunas")
    .select("id, nombre")
    .order("nombre")
    .overrideTypes<ComunaFiltro[], { merge: false }>();
  if (error || data === null) {
    console.warn("Error al consultar comunas:", { code: error?.code });
    throw new Error("No pudimos cargar las comunas. Inténtalo nuevamente.");
  }
  return data;
};
