import { supabase } from "../services/supabase";

export interface ResenaItem {
  id: string;
  autor: string;
  calificacion: number;
  fecha: string;
  comentario: string;
}

export interface TrabajoRealizadoItem {
  id: string;
  titulo: string;
  categoria: string;
  monto: string;
  fecha: string;
}

export interface PostulanteBD {
  id: string;
  postulante_id: string;
  nombre: string;
  telefono: string;
  avatar_url: string | null;
  calificacion: string;
  total_resenas: number;
  trabajos_realizados: number;
  sobre_mi: string;
  comuna: string;
  mensaje: string;
  estado: "pendiente" | "aceptado" | "rechazado";
}

export interface MiPublicacion {
  id: string;
  titulo: string;
  categoria: string;
  monto: string;
  monto_raw: number;
  fecha: string;
  estado: "disponible" | "aceptado" | "completado";
  trabajador_id?: string | null;
  imagenes?: string[];
  total_postulantes?: number;
}

export interface PerfilData {
  nombre: string;
  sobre_mi: string;
  avatar_url: string | null;
  calificacion: string;
  total_resenas: number;
  trabajos_realizados: number;
  creditos: number;
  comuna_id: number;
  comuna_nombre: string;
}

// Obtener datos del perfil actual
export async function fetchPerfilUsuario(userId: string): Promise<PerfilData | null> {
  const { data, error } = await supabase
    .from("perfiles")
    .select(`
      nombre,
      sobre_mi,
      avatar_url,
      calificacion,
      total_resenas,
      trabajos_realizados,
      creditos,
      comuna_id,
      comunas ( id, nombre )
    `)
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  return {
    nombre: data.nombre || "Usuario",
    sobre_mi: data.sobre_mi || "Sin descripción aún.",
    avatar_url: data.avatar_url || null,
    calificacion: data.calificacion ? Number(data.calificacion).toFixed(1) : "0.0",
    total_resenas: data.total_resenas || 0,
    trabajos_realizados: data.trabajos_realizados || 0,
    creditos: data.creditos || 0,
    comuna_id: (data.comunas as any)?.id || data.comuna_id || 1,
    comuna_nombre: (data.comunas as any)?.nombre || "Santiago Centro",
  };
}

// Obtener publicaciones del usuario
export async function fetchPublicacionesUsuario(userId: string): Promise<MiPublicacion[]> {
  const { data, error } = await supabase
    .from("trabajos")
    .select(`
      id,
      titulo,
      monto,
      estado,
      trabajador_id,
      imagenes,
      created_at,
      categorias ( nombre ),
      postulaciones ( id )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((t: any) => ({
    id: t.id,
    titulo: t.titulo,
    categoria: t.categorias?.nombre || "General",
    monto: `$${Number(t.monto).toLocaleString("es-CL")}`,
    monto_raw: t.monto,
    fecha: new Date(t.created_at).toLocaleDateString("es-CL"),
    estado: t.estado,
    trabajador_id: t.trabajador_id,
    imagenes: t.imagenes || [],
    total_postulantes: (t.postulaciones || []).length,
  }));
}

// Obtener postulantes reales de una publicación
export async function fetchPostulantesDeTarea(tareaId: string): Promise<PostulanteBD[]> {
  const { data, error } = await supabase
    .from("postulaciones")
    .select(`
      id,
      mensaje,
      estado,
      postulante_id,
      perfiles:postulante_id (
        id,
        nombre,
        telefono,
        avatar_url,
        calificacion,
        total_resenas,
        trabajos_realizados,
        sobre_mi,
        comunas ( nombre )
      )
    `)
    .eq("trabajo_id", tareaId);

  if (error || !data) return [];

  return data.map((p: any) => ({
    id: p.id,
    postulante_id: p.postulante_id,
    nombre: p.perfiles?.nombre || "Usuario",
    telefono: p.perfiles?.telefono || "",
    avatar_url: p.perfiles?.avatar_url || null,
    calificacion: p.perfiles?.calificacion ? Number(p.perfiles.calificacion).toFixed(1) : "0.0",
    total_resenas: p.perfiles?.total_resenas || 0,
    trabajos_realizados: p.perfiles?.trabajos_realizados || 0,
    sobre_mi: p.perfiles?.sobre_mi || "Sin descripción aún.",
    comuna: p.perfiles?.comunas?.nombre || "Santiago",
    mensaje: p.mensaje,
    estado: p.estado,
  }));
}

// Obtener reseñas recibidas por un usuario
export async function fetchResenasUsuario(userId: string): Promise<ResenaItem[]> {
  const { data, error } = await supabase
    .from("resenas")
    .select(`
      id,
      calificacion,
      comentario,
      created_at,
      perfiles!resenas_autor_id_fkey ( nombre )
    `)
    .eq("evaluado_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((r: any) => ({
    id: r.id,
    autor: r.perfiles?.nombre || "Usuario",
    calificacion: r.calificacion,
    comentario: r.comentario,
    fecha: new Date(r.created_at).toLocaleDateString("es-CL"),
  }));
}

// Obtener historial de tareas realizadas por un usuario
export async function fetchHistorialTrabajosHechos(userId: string): Promise<TrabajoRealizadoItem[]> {
  const { data, error } = await supabase
    .from("trabajos")
    .select(`
      id,
      titulo,
      monto,
      created_at,
      categorias ( nombre )
    `)
    .eq("trabajador_id", userId)
    .eq("estado", "completado")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((t: any) => ({
    id: t.id,
    titulo: t.titulo,
    categoria: t.categorias?.nombre || "General",
    monto: `$${Number(t.monto).toLocaleString("es-CL")}`,
    fecha: new Date(t.created_at).toLocaleDateString("es-CL"),
  }));
}

// Aceptar postulante y actualizar trabajo
export async function aceptarPostulante(tareaId: string, postulacionId: string, postulanteId: string) {
  // 1. Aceptar postulante
  await supabase.from("postulaciones").update({ estado: "aceptado" }).eq("id", postulacionId);
  // 2. Rechazar los demás
  await supabase.from("postulaciones").update({ estado: "rechazado" }).eq("trabajo_id", tareaId).neq("id", postulacionId);
  // 3. Asignar en trabajo
  return supabase.from("trabajos").update({ estado: "aceptado", trabajador_id: postulanteId }).eq("id", tareaId);
}

// Finalizar tarea y calificar
export async function finalizarYCalificarTarea(
  tareaId: string,
  autorId: string,
  trabajadorId: string,
  calificacion: number,
  comentario: string
) {
  // Cerrar trabajo
  const { error: errTrabajo } = await supabase.from("trabajos").update({ estado: "completado" }).eq("id", tareaId);
  if (errTrabajo) throw errTrabajo;

  // Insertar reseña
  return supabase.from("resenas").insert({
    trabajo_id: tareaId,
    autor_id: autorId,
    evaluado_id: trabajadorId,
    calificacion,
    comentario: comentario.trim() || "Trabajo completado con éxito.",
  });
}