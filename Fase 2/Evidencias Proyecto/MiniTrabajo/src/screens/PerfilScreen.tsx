import React, { useState, useCallback, useRef, useEffect } from "react";
import PagoWebpay from "../components/PagoWebpay";
import { abrirWhatsAppTrabajo } from "../services/contactos";
import {
  editarTrabajoPropio,
  eliminarTrabajoPropio,
  cancelarAcuerdoTrabajador,
  fetchPublicacionesUsuario,
  fetchHistorialTrabajosHechos,
  type MiPublicacion,
  type TrabajoRealizadoItem,
} from "../services/trabajos";
import {
  fetchPostulantesDeTarea,
  aceptarPostulante,
  rechazarPostulacion,
  type PostulanteBD,
} from "../services/postulaciones";
import {
  enviarCalificacionMutua,
  fetchResenasUsuario,
  type ResenaItem,
} from "../services/resenas";
import {
  fetchPerfilUsuario,
  actualizarPerfilPropio,
  type PerfilData,
} from "../services/perfiles";
import { subirAvatarStorage } from "../services/imagenes";
import HistorialCompras from "../components/HistorialCompras";
import EstadoListaRemota from "../components/EstadoListaRemota";
import AlertaPerfil, { type AlertaPersonalizada } from "../components/AlertaPerfil";
import { useListaRemota } from "../hooks/useListaRemota";
import { fetchComunasFiltro } from "../services/catalogos";
import { useFocusEffect } from "@react-navigation/native";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors } from "../theme/colors";
import { supabase } from "../services/supabase";
import { styles } from "../styles/PerfilStyles";

const CAPA_COMPLETA = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

export interface CalificacionTarget {
  trabajoId: string;
  evaluadoId: string;
  nombreContraparte: string;
  rolContraparte: "trabajador" | "empleador";
  esFinalizacion?: boolean;
}

interface ComunaItem {
  id: number;
  nombre: string;
}

const PAQUETES_CREDITOS = [
  {
    id: "1",
    creditos: 10,
    precio: "$2.990",
    destacado: false,
    desc: "Ideal para destacar 2 publicaciones",
  },
  {
    id: "2",
    creditos: 25,
    precio: "$5.990",
    destacado: true,
    desc: "El más popular (ahorras 20%)",
  },
  {
    id: "3",
    creditos: 50,
    precio: "$9.990",
    destacado: false,
    desc: "Para usuarios frecuentes",
  },
];

export default function PerfilScreen() {
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [correo, setCorreo] = useState("");
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);
  const solicitudPerfilRef = useRef(0);
  const usuarioPerfilRef = useRef<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const cierreEnCursoRef = useRef(false);
  const solicitudCierreRef = useRef(0);

  useEffect(() => () => {
    solicitudPerfilRef.current += 1;
    solicitudCierreRef.current += 1;
    cierreEnCursoRef.current = false;
  }, []);

  const [pagoVisible, setPagoVisible] = useState<{
    paqueteId: string | null;
  } | null>(null);
  const [historialComprasVisible, setHistorialComprasVisible] = useState(false);
  // Perfil
  const [perfil, setPerfil] = useState<PerfilData | null>(null);

  // Listas
  const {
    datos: misPublicaciones, estado: estadoPublicaciones,
    error: errorPublicaciones, cargar: cargarPublicaciones,
  } = useListaRemota<MiPublicacion>(
    fetchPublicacionesUsuario,
    "No pudimos cargar tus publicaciones. Revisa tu conexión e inténtalo nuevamente.",
  );
  const {
    datos: resenasRecibidas, estado: estadoResenasRecibidas,
    error: errorResenasRecibidas, cargar: cargarResenasRecibidas,
  } = useListaRemota<ResenaItem>(
    fetchResenasUsuario,
    "No pudimos cargar tus reseñas. Revisa tu conexión e inténtalo nuevamente.",
  );
  const {
    datos: historialTrabajos, estado: estadoHistorialTrabajos,
    error: errorHistorialTrabajos, cargar: cargarHistorialTrabajos,
  } = useListaRemota<TrabajoRealizadoItem>(
    fetchHistorialTrabajosHechos,
    "No pudimos cargar tu historial de trabajos. Revisa tu conexión e inténtalo nuevamente.",
  );
  const {
    datos: comunasDisponibles, estado: estadoComunasPerfil,
    error: errorComunasPerfil, cargar: cargarComunasPerfil,
  } = useListaRemota<ComunaItem>(
    fetchComunasFiltro,
    "No pudimos cargar las comunas. Revisa tu conexión e inténtalo nuevamente.",
  );

  // Tarea y Postulantes
  const [tareaSeleccionada, setTareaSeleccionada] =
    useState<MiPublicacion | null>(null);
  const [postulantesDeTarea, setPostulantesDeTarea] = useState<PostulanteBD[]>(
    [],
  );
  const [cargandoPostulantes, setCargandoPostulantes] = useState(false);
  const [errorPostulantes, setErrorPostulantes] = useState<string | null>(null);
  const solicitudPostulantesRef = useRef(0);
  const [postulanteDetalle, setPostulanteDetalle] =
    useState<PostulanteBD | null>(null);
  const {
    datos: resenasPostulante, estado: estadoResenasPostulante,
    error: errorResenasPostulante, cargar: cargarResenasPostulante,
  } = useListaRemota<ResenaItem>(
    fetchResenasUsuario,
    "No pudimos cargar las reseñas del postulante. Inténtalo nuevamente.",
  );
  const {
    datos: historialPostulante, estado: estadoHistorialPostulante,
    error: errorHistorialPostulante, cargar: cargarHistorialPostulante,
  } = useListaRemota<TrabajoRealizadoItem>(
    fetchHistorialTrabajosHechos,
    "No pudimos cargar el historial del postulante. Inténtalo nuevamente.",
  );
  const [tabPostulante, setTabPostulante] = useState<"resenas" | "historial">(
    "resenas",
  );

  // Calificación Mutua
  const [targetCalificar, setTargetCalificar] =
    useState<CalificacionTarget | null>(null);
  const [estrellasCalificacion, setEstrellasCalificacion] = useState(5);
  const [comentarioCalificacion, setComentarioCalificacion] = useState("");
  const [guardandoCalificacion, setGuardandoCalificacion] = useState(false);

  // Menú de opciones (3 puntos)
  const [tareaOpciones, setTareaOpciones] = useState<MiPublicacion | null>(
    null,
  );
  const [modalEditarTareaVisible, setModalEditarTareaVisible] = useState(false);
  const [editTituloTarea, setEditTituloTarea] = useState("");
  const [editDescripcionTarea, setEditDescripcionTarea] = useState("");
  const [editMontoTarea, setEditMontoTarea] = useState("");
  const [guardandoEdicionTarea, setGuardandoEdicionTarea] = useState(false);

  // Modales generales
  const [tabPublicaciones, setTabPublicaciones] = useState<
    "activas" | "completadas"
  >("activas");
  const [modalVisible, setModalVisible] = useState<
    "ninguno" | "resenas" | "historial" | "publicaciones" | "creditos"
  >("ninguno");
  const [modalAnterior, setModalAnterior] = useState<
    "ninguno" | "resenas" | "historial" | "publicaciones" | "creditos"
  >("ninguno");
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [modalComunasVisible, setModalComunasVisible] = useState(false);
  const [guardandoCambios, setGuardandoCambios] = useState(false);

  // Form edición perfil
  const [tempNombre, setTempNombre] = useState("");
  const [tempSobreMi, setTempSobreMi] = useState("");
  const [tempAvatarUri, setTempAvatarUri] = useState<string | null>(null);
  const [tempAvatarBase64, setTempAvatarBase64] = useState<string | null>(null);
  const [tempComunaId, setTempComunaId] = useState<number | null>(null);
  const [tempComunaNombre, setTempComunaNombre] = useState("Santiago");

  // Alerta Personalizada (Dark Theme)
  const [alerta, setAlerta] = useState<AlertaPersonalizada>({
    visible: false,
    titulo: "",
    mensaje: "",
    tipo: "info",
  });

  const dispararAlerta = (
    titulo: string,
    mensaje: string,
    tipo: "exito" | "error" | "confirmar" | "info" = "info",
    onConfirmar?: () => void,
    textoConfirmar: string = "Entendido",
    textoCancelar?: string,
    onCancelar?: () => void,
  ) => {
    setAlerta({
      visible: true,
      titulo,
      mensaje,
      tipo,
      textoConfirmar,
      textoCancelar,
      onConfirmar,
      onCancelar,
    });
  };

  const cerrarAlerta = () => {
    setAlerta((prev) => ({ ...prev, visible: false }));
  };

  const handleCerrarSesion = async () => {
    // Bloquear también pulsaciones que lleguen antes del siguiente render.
    if (cierreEnCursoRef.current) return;
    cierreEnCursoRef.current = true;
    const solicitud = ++solicitudCierreRef.current;
    const vigente = () => solicitud === solicitudCierreRef.current;
    setCerrandoSesion(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // App responde a SIGNED_OUT y desmonta las pantallas de la cuenta.
    } catch {
      if (vigente()) {
        dispararAlerta(
          "No pudimos cerrar la sesión",
          "Inténtalo nuevamente. Revisa tu conexión si el problema continúa.",
          "error",
        );
      }
    } finally {
      if (vigente()) {
        cierreEnCursoRef.current = false;
        setCerrandoSesion(false);
      }
    }
  };

  const cargarDatos = useCallback(async () => {
    const solicitud = ++solicitudPerfilRef.current;
    const vigente = () => solicitud === solicitudPerfilRef.current;
    setCargandoPerfil(true);
    setErrorPerfil(null);
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (!vigente()) return;
      if (error || !user) throw new Error("No se pudo verificar la sesión.");

      if (usuarioPerfilRef.current !== user.id) {
        usuarioPerfilRef.current = user.id;
        setPerfil(null);
      }

      setUsuarioId(user.id);
      setCorreo(user.email || "");

      const perfilPendiente = (async () => {
        try {
          const datos = await fetchPerfilUsuario(user.id);
          if (vigente()) setPerfil(datos);
        } catch {
          if (vigente()) {
            setErrorPerfil("No pudimos cargar tu perfil. Revisa tu conexión e inténtalo nuevamente.");
          }
        } finally {
          if (vigente()) setCargandoPerfil(false);
        }
      })();

      await Promise.allSettled([
        perfilPendiente,
        cargarPublicaciones(user.id),
        cargarResenasRecibidas(user.id),
        cargarHistorialTrabajos(user.id),
        cargarComunasPerfil('catalogo'),
      ]);
    } catch {
      if (vigente()) {
        setPerfil(null);
        setErrorPerfil("No pudimos cargar tu perfil. Revisa tu conexión e inténtalo nuevamente.");
        setCargandoPerfil(false);
      }
    } finally {
      if (vigente()) setRefrescando(false);
    }
  }, [cargarPublicaciones, cargarResenasRecibidas, cargarHistorialTrabajos, cargarComunasPerfil]);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos]),
  );

  const onRefresh = useCallback(() => {
    setRefrescando(true);
    cargarDatos();
  }, [cargarDatos]);

  const recargarResenasPropias = () => usuarioId
    ? cargarResenasRecibidas(usuarioId)
    : cargarDatos();

  const recargarHistorialPropio = () => usuarioId
    ? cargarHistorialTrabajos(usuarioId)
    : cargarDatos();

  const recargarPublicacionesPropias = () => usuarioId
    ? cargarPublicaciones(usuarioId)
    : cargarDatos();

  const handleSeleccionarTarea = async (tarea: MiPublicacion) => {
    const solicitudActual = ++solicitudPostulantesRef.current;
    setTareaSeleccionada(tarea);
    setPostulantesDeTarea([]);
    setErrorPostulantes(null);
    setCargandoPostulantes(true);
    try {
      const postulantes = await fetchPostulantesDeTarea(tarea.id);
      if (solicitudActual === solicitudPostulantesRef.current) {
        setPostulantesDeTarea(postulantes);
      }
    } catch {
      if (solicitudActual === solicitudPostulantesRef.current) {
        setErrorPostulantes(
          "No pudimos cargar los postulantes. Revisa tu conexión e inténtalo nuevamente.",
        );
      }
    } finally {
      if (solicitudActual === solicitudPostulantesRef.current) {
        setCargandoPostulantes(false);
      }
    }
  };

  const handleVerPerfilPostulante = async (postulante: PostulanteBD) => {
    setPostulanteDetalle(postulante);
    setTabPostulante("resenas");
    await Promise.all([
      cargarResenasPostulante(postulante.postulante_id),
      cargarHistorialPostulante(postulante.postulante_id),
    ]);
  };

  const handleAceptar = async (postulante: PostulanteBD) => {
    if (!tareaSeleccionada || !usuarioId) return;
    try {
      await aceptarPostulante(
        tareaSeleccionada.id,
        postulante.id,
        postulante.postulante_id,
      );
      await cargarDatos();
      await handleSeleccionarTarea({
        ...tareaSeleccionada,
        estado: "aceptado",
        trabajador_id: postulante.postulante_id,
      });
      if (postulanteDetalle)
        setPostulanteDetalle({ ...postulanteDetalle, estado: "aceptado" });
      dispararAlerta(
        "¡Postulante Aceptado!",
        "El trabajo quedó asignado. Ya puedes coordinar los detalles por WhatsApp.",
        "exito",
      );
    } catch (err: any) {
      dispararAlerta(
        "Error",
        err.message || "No se pudo aceptar al postulante.",
        "error",
      );
    }
  };

  const handleRechazar = async (postulacionId: string) => {
    try {
      await rechazarPostulacion(postulacionId);

      setPostulantesDeTarea((prev) =>
        prev.map((p) =>
          p.id === postulacionId ? { ...p, estado: "rechazado" } : p,
        ),
      );

      if (postulanteDetalle?.id === postulacionId) {
        setPostulanteDetalle(null);
      }
    } catch (error: unknown) {
      dispararAlerta(
        "Error al rechazar",
        error instanceof Error
          ? error.message
          : "No se pudo rechazar la postulación.",
        "error",
      );
    }
  };

  const handleCancelarAcuerdo = () => {
    if (!tareaSeleccionada) return;

    dispararAlerta(
      "Cancelar acuerdo",
      "¿No lograron coordinar por WhatsApp? Si cancelas el acuerdo, la tarea volverá a estar disponible para recibir solicitudes o aceptar a otro postulante.",
      "confirmar",
      async () => {
        try {
          await cancelarAcuerdoTrabajador(
            tareaSeleccionada.id,
            tareaSeleccionada.trabajador_id,
          );
          await cargarDatos();
          setTareaSeleccionada(null);
          dispararAlerta(
            "Acuerdo cancelado",
            "La tarea volvió a quedar libre y disponible en el muro de búsqueda.",
            "exito",
          );
        } catch (err: any) {
          dispararAlerta(
            "Error",
            err.message || "No se pudo cancelar el acuerdo.",
            "error",
          );
        }
      },
      "Sí, cancelar acuerdo",
      "Volver",
    );
  };

  const handleAbrirOpcionesTarea = (tarea: MiPublicacion) => {
    if (tarea.estado === "aceptado") {
      dispararAlerta(
        "Tarea en progreso",
        "Esta publicación tiene un trabajador aceptado. Si no lograron coordinar, primero debes cancelar el acuerdo abriendo la tarjeta.",
        "info",
      );
      return;
    }
    setTareaOpciones(tarea);
  };

  const handleIniciarEdicionTarea = () => {
    if (!tareaOpciones) return;
    setEditTituloTarea(tareaOpciones.titulo);
    setEditDescripcionTarea(tareaOpciones.descripcion);
    setEditMontoTarea(tareaOpciones.montoRaw.toString());
    setModalEditarTareaVisible(true);
  };

  const handleGuardarEdicionTarea = async () => {
    if (!tareaOpciones) return;
    const montoNum = parseInt(editMontoTarea.replace(/[^0-9]/g, ""), 10) || 0;

    if (
      editTituloTarea.trim().length < 6 ||
      editTituloTarea.trim().length > 80
    ) {
      dispararAlerta(
        "Validación",
        "El título debe tener entre 6 y 80 caracteres.",
        "error",
      );
      return;
    }

    if (
      editDescripcionTarea.trim().length < 20 ||
      editDescripcionTarea.trim().length > 2000
    ) {
      dispararAlerta(
        "Validación",
        "La descripción debe tener entre 20 y 2.000 caracteres.",
        "error",
      );
      return;
    }
    if (montoNum < 5000) {
      dispararAlerta(
        "Validación",
        "El pago mínimo ofrecido debe ser de $5.000 CLP.",
        "error",
      );
      return;
    }

    setGuardandoEdicionTarea(true);
    try {
      await editarTrabajoPropio(tareaOpciones.id, {
        titulo: editTituloTarea,
        descripcion: editDescripcionTarea,
        monto: montoNum,
      });

      setModalEditarTareaVisible(false);
      setTareaOpciones(null);
      await cargarDatos();
      dispararAlerta(
        "¡Publicación actualizada!",
        "Los cambios se guardaron con éxito.",
        "exito",
      );
    } catch (err: any) {
      dispararAlerta(
        "Error",
        err.message || "No se pudo actualizar la tarea.",
        "error",
      );
    } finally {
      setGuardandoEdicionTarea(false);
    }
  };

  const handleEliminarTareaOpciones = () => {
    if (!tareaOpciones) return;

    dispararAlerta(
      "Eliminar publicación",
      "¿Seguro que deseas eliminar esta tarea de forma definitiva? Esta acción no se puede deshacer.",
      "confirmar",
      async () => {
        try {
          await eliminarTrabajoPropio(tareaOpciones.id);
          setTareaOpciones(null);
          await cargarDatos();
          dispararAlerta(
            "Publicación eliminada",
            "La tarea ha sido dada de baja.",
            "exito",
          );
        } catch (err: any) {
          dispararAlerta("No se pudo eliminar", err.message, "error");
        }
      },
      "Sí, eliminar",
      "Cancelar",
    );
  };

  const handleAbrirCalificar = (
    target: CalificacionTarget,
    origen:
      | "ninguno"
      | "resenas"
      | "historial"
      | "publicaciones"
      | "creditos" = "ninguno",
  ) => {
    // En iOS evitamos apilar 2 modales nativos activos simultáneamente:
    // guardamos el origen y cerramos el modal previo
    if (origen !== "ninguno") {
      setModalAnterior(origen);
      setModalVisible("ninguno");
    } else if (modalVisible !== "ninguno") {
      setModalAnterior(modalVisible);
      setModalVisible("ninguno");
    }
    setTareaSeleccionada(null);
    setTargetCalificar(target);
    setEstrellasCalificacion(5);
    setComentarioCalificacion("");
  };

  const handleCerrarCalificar = () => {
    setTargetCalificar(null);
    setComentarioCalificacion("");
    setEstrellasCalificacion(5);
    // Restaurar modal anterior si existía
    if (modalAnterior !== "ninguno") {
      setModalVisible(modalAnterior);
      setModalAnterior("ninguno");
    }
  };

  const getTextoEstrellas = (estrellas: number) => {
    switch (estrellas) {
      case 1:
        return "1/5 - Muy mala experiencia";
      case 2:
        return "2/5 - Regular / Desacuerdos";
      case 3:
        return "3/5 - Aceptable / Correcto";
      case 4:
        return "4/5 - Muy buena labor y trato";
      case 5:
        return "5/5 - ¡Excelente experiencia!";
      default:
        return `${estrellas}/5`;
    }
  };

  const handleConfirmarCalificacion = async () => {
    if (!targetCalificar || !usuarioId) return;
    setGuardandoCalificacion(true);
    const anteriorModal = modalAnterior;
    try {
      await enviarCalificacionMutua({
        trabajoId: targetCalificar.trabajoId,
        autorId: usuarioId,
        evaluadoId: targetCalificar.evaluadoId,
        calificacion: estrellasCalificacion,
        comentario: comentarioCalificacion,
        esFinalizacion: targetCalificar.esFinalizacion,
      });

      setTargetCalificar(null);
      setModalAnterior("ninguno");
      setTareaSeleccionada(null);
      setComentarioCalificacion("");
      setEstrellasCalificacion(5);
      await cargarDatos();

      // Si venía de historial o mis publicaciones, reabrir para ver el estado actualizado
      if (anteriorModal !== "ninguno") {
        setModalVisible(anteriorModal);
      }

      dispararAlerta(
        "¡Calificación Registrada!",
        "La reseña se ha guardado y el perfil de la contraparte fue actualizado.",
        "exito",
      );
    } catch (err: any) {
      dispararAlerta(
        "Error al calificar",
        err.message || "No se pudo registrar la calificación.",
        "error",
      );
    } finally {
      setGuardandoCalificacion(false);
    }
  };

  const handlePickFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      dispararAlerta(
        "Permiso denegado",
        "Se requiere acceso a la galería para cambiar la foto.",
        "error",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setTempAvatarUri(result.assets[0].uri);
      if (result.assets[0].base64) {
        setTempAvatarBase64(result.assets[0].base64);
      }
    }
  };

  const handleGuardarPerfil = async () => {
    if (!perfil || !usuarioId) {
      dispararAlerta("Atención", "Vuelve a cargar tu perfil antes de guardar los cambios.", "error");
      return;
    }
    if (!tempNombre.trim()) {
      dispararAlerta("Atención", "El nombre no puede estar vacío.", "error");
      return;
    }
    if (tempNombre.trim().length > 80) {
      dispararAlerta(
        "Atención",
        "El nombre puede tener como máximo 80 caracteres.",
        "error",
      );
      return;
    }

    if (tempSobreMi.trim().length > 1000) {
      dispararAlerta(
        "Atención",
        "La descripción puede tener como máximo 1.000 caracteres.",
        "error",
      );
      return;
    }
    setGuardandoCambios(true);
    try {
      let finalAvatarUrl = perfil.avatar_url;

      if (tempAvatarBase64) {
        const urlPublica = await subirAvatarStorage(
          tempAvatarBase64,
          usuarioId,
        );
        if (urlPublica) {
          finalAvatarUrl = urlPublica;
        }
      }

      // Actualizamos 'nombre' y 'nombre_completo'
      const { error } = await actualizarPerfilPropio(usuarioId, {
        nombre: tempNombre.trim(),
        nombre_completo: tempNombre.trim(),
        sobre_mi: tempSobreMi.trim(),
        avatar_url: finalAvatarUrl,
        comuna_id: tempComunaId,
      });

      if (error) throw error;
      setModalEditarVisible(false);
      setTempAvatarBase64(null);
      await cargarDatos();
      dispararAlerta("¡Éxito!", "Perfil actualizado con éxito.", "exito");
    } catch (err: any) {
      dispararAlerta(
        "Error",
        err.message || "No se pudieron guardar los cambios.",
        "error",
      );
    } finally {
      setGuardandoCambios(false);
    }
  };

  const handleAbrirWhatsApp = async (
    trabajoId: string,
    tituloTarea: string,
  ) => {
    try {
      await abrirWhatsAppTrabajo(
        trabajoId,
        `¡Hola! Te contacto por tu postulación a "${tituloTarea}".`,
      );
    } catch (error: unknown) {
      dispararAlerta(
        "No se pudo abrir el contacto",
        error instanceof Error ? error.message : "Inténtalo nuevamente.",
        "error",
      );
    }
  };

  const publicacionesActivas = misPublicaciones.filter(
    (p) => p.estado !== "completado",
  );
  const publicacionesCompletadas = misPublicaciones.filter(
    (p) => p.estado === "completado",
  );

  // Estado combinado de capas (ventanas) y cierre de la capa superior (botón atrás Android)
  const hayCapaAbierta =
    modalVisible !== "ninguno" ||
    tareaOpciones !== null ||
    modalEditarTareaVisible ||
    tareaSeleccionada !== null ||
    postulanteDetalle !== null ||
    targetCalificar !== null ||
    modalEditarVisible ||
    modalComunasVisible ||
    alerta.visible;

  const cerrarCapaSuperior = () => {
    if (alerta.visible) return cerrarAlerta();
    if (modalComunasVisible) return setModalComunasVisible(false);
    if (modalEditarVisible) return setModalEditarVisible(false);
    if (targetCalificar !== null) return handleCerrarCalificar();
    if (postulanteDetalle !== null) return setPostulanteDetalle(null);
    if (tareaSeleccionada !== null) return setTareaSeleccionada(null);
    if (modalEditarTareaVisible) return setModalEditarTareaVisible(false);
    if (tareaOpciones !== null) return setTareaOpciones(null);
    setModalVisible("ninguno");
  };

  // Mostrar el historial de compras.
  if (historialComprasVisible) {
    return (
      <HistorialCompras
        onRetomar={() => {
          setHistorialComprasVisible(false);
          setPagoVisible({ paqueteId: null });
        }}
        onCerrar={async () => {
          setHistorialComprasVisible(false);
          setModalVisible("creditos");
          await cargarDatos();
        }}
      />
    );
  }

  // Mostrar Webpay o el resultado de una compra.
  if (pagoVisible !== null) {
    return (
      <PagoWebpay
        paqueteId={pagoVisible.paqueteId}
        onVerHistorial={() => {
          setPagoVisible(null);
          setHistorialComprasVisible(true);
        }}
        onCerrar={async () => {
          setPagoVisible(null);
          setModalVisible("creditos");
          await cargarDatos();
        }}
      />
    );
  }
  if (!perfil) {
    return (
      <View style={styles.screenWrapper}>
        <EstadoListaRemota
          estado={cargandoPerfil ? "cargando" : "error"}
          error={errorPerfil}
          onReintentar={() => void cargarDatos()}
        >
          {null}
        </EstadoListaRemota>
      </View>
    );
  }

  const textoSaldo = cargandoPerfil
    ? "Actualizando saldo…"
    : errorPerfil ? "Saldo sin actualizar" : `${perfil.creditos} créditos`;

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={onRefresh}
            colors={[colors.accentBlue]}
            tintColor={colors.accentBlue}
          />
        }
      >
        {errorPerfil && (
          <EstadoListaRemota
            estado="error"
            error={errorPerfil}
            onReintentar={() => void cargarDatos()}
          >
            {null}
          </EstadoListaRemota>
        )}

        {/* TARJETA USUARIO */}
        <View style={styles.userCard}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.creditsPillTop}
            onPress={() => setModalVisible("creditos")}
          >
            <Ionicons name="sparkles" size={13} color="#eab308" />
            <Text style={styles.creditsPillText}>
              {textoSaldo}
            </Text>
          </TouchableOpacity>

          <View style={styles.avatarWrap}>
            {perfil.avatar_url ? (
              <Image
                source={{ uri: perfil.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons name="person" size={38} color={colors.textPrimary} />
            )}
            <View style={styles.verifiedBadge}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={colors.accentBlue}
              />
            </View>
          </View>

          <View style={styles.nameRow}>
            {cargandoPerfil ? (
              <ActivityIndicator size="small" color={colors.accentBlue} />
            ) : (
              <>
                <Text style={styles.userName}>{perfil.nombre}</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.editNameButton}
                  onPress={() => {
                    setTempNombre(perfil.nombre);
                    setTempSobreMi(
                      perfil.sobre_mi === "Sin descripción aún."
                        ? ""
                        : perfil.sobre_mi,
                    );
                    setTempAvatarUri(perfil.avatar_url);
                    setTempAvatarBase64(null);
                    setTempComunaId(perfil.comuna_id);
                    setTempComunaNombre(perfil.comuna_nombre);
                    setModalEditarVisible(true);
                  }}
                >
                  <Ionicons
                    name="pencil"
                    size={14}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
          <Text style={styles.userEmail}>{correo}</Text>
          <View style={styles.locationRow}>
            <Ionicons
              name="location-sharp"
              size={13}
              color={colors.textSecondary}
            />
            <Text style={styles.locationText}>{perfil.comuna_nombre}</Text>
          </View>
        </View>

        {/* MÉTRICAS */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statBox}
            activeOpacity={0.7}
            onPress={() => {
              setModalVisible("resenas");
              void recargarResenasPropias();
            }}
          >
            <View style={styles.ratingRow}>
              <Ionicons
                name="star"
                size={16}
                color={
                  Number(perfil.calificacion) > 0 ? "#eab308" : colors.textMuted
                }
              />
              <Text style={styles.statValue}>
                {Number(perfil.calificacion) > 0
                  ? perfil.calificacion
                  : "Nuevo"}
              </Text>
            </View>
            <Text style={styles.statLabel}>{perfil.total_resenas} reseñas</Text>
            <Ionicons
              name="chevron-forward"
              size={12}
              color={colors.textMuted}
              style={styles.statChevron}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statBox, styles.statBorderHorizontal]}
            activeOpacity={0.7}
            onPress={() => {
              setModalVisible("historial");
              void recargarHistorialPropio();
            }}
          >
            <Text style={styles.statValue}>{perfil.trabajos_realizados}</Text>
            <Text style={styles.statLabel}>Trabajos hechos</Text>
            <Ionicons
              name="chevron-forward"
              size={12}
              color={colors.textMuted}
              style={styles.statChevron}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statBox}
            activeOpacity={0.7}
            onPress={() => {
              setModalVisible("publicaciones");
              void recargarPublicacionesPropias();
            }}
          >
            <Text style={[styles.statValue, { color: colors.accentBlue }]}>
              {estadoPublicaciones === "lista" ? misPublicaciones.length : "…"}
            </Text>
            <Text style={styles.statLabel}>Publicaciones</Text>
            <Ionicons
              name="chevron-forward"
              size={12}
              color={colors.textMuted}
              style={styles.statChevron}
            />
          </TouchableOpacity>
        </View>

        {/* SOBRE MÍ */}
        <View style={styles.aboutCard}>
          <View style={styles.aboutHeader}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={colors.accentBlue}
            />
            <Text style={styles.aboutTitle}>Sobre mí</Text>
          </View>
          <Text style={styles.aboutText}>{perfil.sobre_mi}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.logoutButton, cerrandoSesion && { opacity: 0.6 }]}
          onPress={() => void handleCerrarSesion()}
          disabled={cerrandoSesion}
          accessibilityRole="button"
          accessibilityLabel={cerrandoSesion ? "Cerrando sesión" : "Cerrar sesión"}
          accessibilityState={{ disabled: cerrandoSesion, busy: cerrandoSesion }}
        >
          {cerrandoSesion ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          )}
          <Text style={styles.logoutText}>
            {cerrandoSesion ? "Cerrando sesión…" : "Cerrar sesión"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL_HOST_PERFIL: un único Modal nativo; las ventanas se apilan como capas internas
          para evitar presentar un Modal sobre otro (causa bloqueos de toques en iOS). */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={hayCapaAbierta}
        onRequestClose={cerrarCapaSuperior}
      >
        <View style={{ flex: 1 }}>
          {/* MODAL 1: RESEÑAS */}
          {modalVisible === "resenas" && (
            <View style={CAPA_COMPLETA}>
              <View style={styles.modalOverlay}>
                <TouchableOpacity
                  style={styles.modalBackdropTouch}
                  activeOpacity={1}
                  onPress={() => setModalVisible("ninguno")}
                />
                <View style={styles.modalSheet}>
                  <View style={styles.sheetHeader}>
                    <View style={styles.sheetTitleRow}>
                      <Ionicons name="star" size={18} color="#eab308" />
                      <Text style={styles.sheetTitle}>
                        Reseñas Recibidas ({estadoResenasRecibidas === "lista" ? resenasRecibidas.length : "…"})
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setModalVisible("ninguno")}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name="close"
                        size={24}
                        color={colors.textPrimary}
                      />
                    </TouchableOpacity>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <EstadoListaRemota
                      estado={estadoResenasRecibidas}
                      error={errorResenasRecibidas}
                      onReintentar={() => void recargarResenasPropias()}
                    >
                      {resenasRecibidas.length === 0 ? (
                        <Text style={styles.emptyTabText}>
                          Aún no has recibido reseñas.
                        </Text>
                      ) : (
                        resenasRecibidas.map((r) => (
                          <View key={r.id} style={styles.reviewCard}>
                            <View style={styles.reviewHeader}>
                              <View style={styles.reviewAuthorRow}>
                                <View style={styles.reviewAuthorAvatar}>
                                  {r.avatarUrl ? (
                                    <Image
                                      source={{ uri: r.avatarUrl }}
                                      style={{ width: "100%", height: "100%" }}
                                    />
                                  ) : (
                                    <Ionicons
                                      name="person"
                                      size={12}
                                      color={colors.textSecondary}
                                    />
                                  )}
                                </View>
                                <Text style={styles.reviewAuthor}>{r.autor}</Text>
                              </View>
                              <View style={styles.starsRow}>
                                {[...Array(r.calificacion)].map((_, i) => (
                                  <Ionicons
                                    key={i}
                                    name="star"
                                    size={12}
                                    color="#eab308"
                                  />
                                ))}
                              </View>
                            </View>
                            <Text style={styles.reviewComment}>
                              {r.comentario}
                            </Text>
                            <Text style={styles.reviewDate}>{r.fecha}</Text>
                          </View>
                        ))
                      )}
                    </EstadoListaRemota>
                  </ScrollView>
                </View>
              </View>
            </View>
          )}

          {/* MODAL 2: HISTORIAL DE TRABAJOS HECHOS */}
          {modalVisible === "historial" && (
            <View style={CAPA_COMPLETA}>
              <View style={styles.modalOverlay}>
                <TouchableOpacity
                  style={styles.modalBackdropTouch}
                  activeOpacity={1}
                  onPress={() => setModalVisible("ninguno")}
                />
                <View style={styles.modalSheet}>
                  <View style={styles.sheetHeader}>
                    <View style={styles.sheetTitleRow}>
                      <Ionicons
                        name="briefcase"
                        size={18}
                        color={colors.accentBlue}
                      />
                      <Text style={styles.sheetTitle}>
                        Trabajos Completados ({estadoHistorialTrabajos === "lista" ? historialTrabajos.length : "…"})
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setModalVisible("ninguno")}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name="close"
                        size={24}
                        color={colors.textPrimary}
                      />
                    </TouchableOpacity>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <EstadoListaRemota
                      estado={estadoHistorialTrabajos}
                      error={errorHistorialTrabajos}
                      onReintentar={() => void recargarHistorialPropio()}
                    >
                      {historialTrabajos.length === 0 ? (
                        <View style={styles.emptyApplicantsBox}>
                          <Ionicons
                            name="hammer-outline"
                            size={36}
                            color={colors.textMuted}
                          />
                          <Text style={styles.emptyApplicantsTitle}>
                            Aún no has completado trabajos
                          </Text>
                        </View>
                      ) : (
                        historialTrabajos.map((item) => (
                          <View key={item.id} style={styles.taskCard}>
                            <View style={styles.taskHeader}>
                              <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                  {item.categoria}
                                </Text>
                              </View>
                              <Text style={styles.taskMonto}>{item.monto}</Text>
                            </View>
                            <Text style={styles.taskTitle}>{item.titulo}</Text>

                            {item.solicitanteNombre ? (
                              <View style={styles.taskContraparteRow}>
                                <View style={styles.taskContraparteAvatar}>
                                  {item.solicitanteAvatar ? (
                                    <Image
                                      source={{ uri: item.solicitanteAvatar }}
                                      style={{ width: "100%", height: "100%" }}
                                    />
                                  ) : (
                                    <Ionicons
                                      name="person"
                                      size={12}
                                      color={colors.textSecondary}
                                    />
                                  )}
                                </View>
                                <Text style={styles.taskContraparteText}>
                                  Publicado por: {item.solicitanteNombre}
                                </Text>
                              </View>
                            ) : null}

                            <View style={styles.taskFooter}>
                              <Text style={styles.taskDate}>{item.fecha}</Text>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                {item.calificadoPorMi ? (
                                  <View style={styles.badgeReviewedTag}>
                                    <Ionicons
                                      name="star"
                                      size={12}
                                      color="#eab308"
                                    />
                                    <Text style={styles.badgeReviewedText}>
                                      Calificaste (
                                      {item.miCalificacion?.calificacion || 5}★)
                                    </Text>
                                  </View>
                                ) : item.solicitanteId ? (
                                  <TouchableOpacity
                                    style={styles.btnReviewAction}
                                    activeOpacity={0.7}
                                    hitSlop={{
                                      top: 12,
                                      bottom: 12,
                                      left: 12,
                                      right: 12,
                                    }}
                                    onPress={() => {
                                      handleAbrirCalificar(
                                        {
                                          trabajoId: item.id,
                                          evaluadoId: item.solicitanteId,
                                          nombreContraparte:
                                            item.solicitanteNombre || "Empleador",
                                          rolContraparte: "empleador",
                                          esFinalizacion: false,
                                        },
                                        "historial",
                                      );
                                    }}
                                  >
                                    <Ionicons
                                      name="star"
                                      size={13}
                                      color="#eab308"
                                    />
                                    <Text style={styles.btnReviewActionText}>
                                      Calificar empleador
                                    </Text>
                                  </TouchableOpacity>
                                ) : null}
                                <View style={styles.badgeAcceptedTag}>
                                  <Ionicons
                                    name="checkmark-done"
                                    size={12}
                                    color={colors.accentGreen}
                                  />
                                  <Text style={styles.badgeAcceptedText}>
                                    Completado
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        ))
                      )}
                    </EstadoListaRemota>
                  </ScrollView>
                </View>
              </View>
            </View>
          )}

          {/* MODAL 3: MIS PUBLICACIONES */}
          {modalVisible === "publicaciones" && (
            <View style={CAPA_COMPLETA}>
              <View style={styles.modalOverlay}>
                <TouchableOpacity
                  style={styles.modalBackdropTouch}
                  activeOpacity={1}
                  onPress={() => setModalVisible("ninguno")}
                />
                <View style={styles.modalSheet}>
                  <View style={styles.sheetHeader}>
                    <View style={styles.sheetTitleRow}>
                      <Ionicons
                        name="document-text"
                        size={18}
                        color={colors.accentBlue}
                      />
                      <Text style={styles.sheetTitle}>Mis Publicaciones</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setModalVisible("ninguno")}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name="close"
                        size={24}
                        color={colors.textPrimary}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.pubTabBar}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.pubTabButton}
                      onPress={() => setTabPublicaciones("activas")}
                    >
                      <Text
                        style={[
                          styles.pubTabText,
                          tabPublicaciones === "activas" &&
                            styles.pubTabTextActive,
                        ]}
                      >
                        Activas ({estadoPublicaciones === "lista" ? publicacionesActivas.length : "…"})
                      </Text>
                      {tabPublicaciones === "activas" && (
                        <View style={styles.pubActiveIndicator} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.pubTabButton}
                      onPress={() => setTabPublicaciones("completadas")}
                    >
                      <Text
                        style={[
                          styles.pubTabText,
                          tabPublicaciones === "completadas" &&
                            styles.pubTabTextActive,
                        ]}
                      >
                        Completadas ({estadoPublicaciones === "lista" ? publicacionesCompletadas.length : "…"})
                      </Text>
                      {tabPublicaciones === "completadas" && (
                        <View style={styles.pubActiveIndicator} />
                      )}
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false}>
                    <EstadoListaRemota
                      estado={estadoPublicaciones}
                      error={errorPublicaciones}
                      onReintentar={() => void recargarPublicacionesPropias()}
                    >
                      {(tabPublicaciones === "activas"
                        ? publicacionesActivas
                        : publicacionesCompletadas
                      ).map((tarea) => (
                        <View key={tarea.id} style={styles.taskCard}>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => handleSeleccionarTarea(tarea)}
                          >
                            <View style={styles.taskHeader}>
                              <View style={styles.headerLeftRow}>
                                <View style={styles.badge}>
                                  <Text style={styles.badgeText}>
                                    {tarea.categoria}
                                  </Text>
                                </View>
                                {tarea.imagenes && tarea.imagenes.length > 0 && (
                                  <View style={styles.photosBadgeTag}>
                                    <Ionicons
                                      name="image-outline"
                                      size={11}
                                      color={colors.accentBlue}
                                    />
                                    <Text style={styles.photosBadgeText}>
                                      {tarea.imagenes.length}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                }}
                              >
                                <Text style={styles.taskMonto}>
                                  {tarea.monto}
                                </Text>
                                {tabPublicaciones === "activas" && (
                                  <TouchableOpacity
                                    style={styles.btnOptionsTask}
                                    hitSlop={{
                                      top: 10,
                                      bottom: 10,
                                      left: 10,
                                      right: 10,
                                    }}
                                    onPress={() => {
                                      handleAbrirOpcionesTarea(tarea);
                                    }}
                                  >
                                    <Ionicons
                                      name="ellipsis-vertical"
                                      size={18}
                                      color={colors.textSecondary}
                                    />
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>

                            <Text style={styles.taskTitle}>{tarea.titulo}</Text>

                            {tarea.estado === "completado" &&
                            tarea.trabajador_nombre ? (
                              <View style={styles.taskContraparteRow}>
                                <View style={styles.taskContraparteAvatar}>
                                  {tarea.trabajador_avatar ? (
                                    <Image
                                      source={{ uri: tarea.trabajador_avatar }}
                                      style={{ width: "100%", height: "100%" }}
                                    />
                                  ) : (
                                    <Ionicons
                                      name="person"
                                      size={12}
                                      color={colors.textSecondary}
                                    />
                                  )}
                                </View>
                                <Text style={styles.taskContraparteText}>
                                  Realizado por: {tarea.trabajador_nombre}
                                </Text>
                              </View>
                            ) : null}
                          </TouchableOpacity>

                          <View style={styles.taskFooter}>
                            <Text style={styles.taskDate}>{tarea.fecha}</Text>
                            {tarea.estado === "completado" ? (
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                {tarea.calificadoPorMi ? (
                                  <View style={styles.badgeReviewedTag}>
                                    <Ionicons
                                      name="star"
                                      size={12}
                                      color="#eab308"
                                    />
                                    <Text style={styles.badgeReviewedText}>
                                      Calificaste (
                                      {tarea.miCalificacion?.calificacion || 5}★)
                                    </Text>
                                  </View>
                                ) : tarea.trabajador_id ? (
                                  <TouchableOpacity
                                    style={styles.btnReviewAction}
                                    activeOpacity={0.7}
                                    hitSlop={{
                                      top: 12,
                                      bottom: 12,
                                      left: 12,
                                      right: 12,
                                    }}
                                    onPress={() => {
                                      handleAbrirCalificar(
                                        {
                                          trabajoId: tarea.id,
                                          evaluadoId: tarea.trabajador_id!,
                                          nombreContraparte:
                                            tarea.trabajador_nombre ||
                                            "Trabajador",
                                          rolContraparte: "trabajador",
                                          esFinalizacion: false,
                                        },
                                        "publicaciones",
                                      );
                                    }}
                                  >
                                    <Ionicons
                                      name="star"
                                      size={13}
                                      color="#eab308"
                                    />
                                    <Text style={styles.btnReviewActionText}>
                                      Calificar trabajador
                                    </Text>
                                  </TouchableOpacity>
                                ) : null}
                                <View style={styles.badgeCompletedTag}>
                                  <Ionicons
                                    name="checkmark-done"
                                    size={12}
                                    color={colors.textMuted}
                                  />
                                  <Text style={styles.badgeCompletedText}>
                                    Completada
                                  </Text>
                                </View>
                              </View>
                            ) : tarea.estado === "aceptado" ? (
                              <View style={styles.badgeAcceptedTag}>
                                <Ionicons
                                  name="play"
                                  size={11}
                                  color={colors.accentGreen}
                                />
                                <Text style={styles.badgeAcceptedText}>
                                  En curso
                                </Text>
                              </View>
                            ) : (tarea.total_postulantes || 0) > 0 ? (
                              <View style={styles.badgeApplicantsTag}>
                                <Ionicons
                                  name="people"
                                  size={12}
                                  color={colors.accentBlue}
                                />
                                <Text style={styles.badgeApplicantsText}>
                                  {tarea.total_postulantes} postulante(s)
                                </Text>
                              </View>
                            ) : (
                              <Text style={styles.noApplicantsText}>
                                Sin postulantes
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                      {(tabPublicaciones === "activas" ? publicacionesActivas : publicacionesCompletadas).length === 0 && (
                        <Text style={styles.emptyTabText}>
                          {tabPublicaciones === "activas"
                            ? "Aún no tienes publicaciones activas."
                            : "Aún no tienes publicaciones completadas."}
                        </Text>
                      )}
                    </EstadoListaRemota>
                  </ScrollView>
                </View>
              </View>
            </View>
          )}

          {/* MENÚ DE OPCIONES 3 PUNTOS: EDITAR / ELIMINAR */}
          {tareaOpciones !== null && (
            <View style={CAPA_COMPLETA}>
              <View style={styles.subModalOverlay}>
                <TouchableOpacity
                  style={styles.subModalBackdropTouch}
                  activeOpacity={1}
                  onPress={() => setTareaOpciones(null)}
                />
                <View style={styles.optionsModalBox}>
                  <Text style={styles.optionsModalTitle} numberOfLines={1}>
                    {tareaOpciones?.titulo}
                  </Text>

                  <TouchableOpacity
                    style={styles.optionRowItem}
                    activeOpacity={0.7}
                    onPress={handleIniciarEdicionTarea}
                  >
                    <Ionicons
                      name="pencil"
                      size={18}
                      color={colors.accentBlue}
                    />
                    <Text style={styles.optionRowItemText}>
                      Editar publicación
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionRowItem}
                    activeOpacity={0.7}
                    onPress={handleEliminarTareaOpciones}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    <Text
                      style={[styles.optionRowItemText, { color: "#ef4444" }]}
                    >
                      Eliminar publicación
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cancelBtn, { marginTop: 14 }]}
                    onPress={() => setTareaOpciones(null)}
                  >
                    <Text style={styles.cancelBtnText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* MODAL DE EDICIÓN DE PUBLICACIÓN */}
          {modalEditarTareaVisible && (
            <View style={CAPA_COMPLETA}>
              <View style={styles.subModalOverlay}>
                <TouchableOpacity
                  style={styles.subModalBackdropTouch}
                  activeOpacity={1}
                  onPress={() => setModalEditarTareaVisible(false)}
                />
                <View style={styles.subModalBox}>
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Editar Publicación</Text>
                    <TouchableOpacity
                      onPress={() => setModalEditarTareaVisible(false)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={22}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={styles.editTaskLabel}>Título del trabajo</Text>
                    <View style={styles.editTaskInputWrap}>
                      <TextInput
                        style={styles.editTaskInputField}
                        value={editTituloTarea}
                        onChangeText={setEditTituloTarea}
                        maxLength={80}
                        placeholder="Título..."
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>

                    <Text style={styles.editTaskLabel}>
                      Pago ofrecido (CLP)
                    </Text>
                    <View style={styles.editTaskInputWrap}>
                      <TextInput
                        style={styles.editTaskInputField}
                        value={editMontoTarea}
                        onChangeText={setEditMontoTarea}
                        keyboardType="numeric"
                        placeholder="Ej: 15000"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>

                    <Text style={styles.editTaskLabel}>
                      Descripción y requerimientos
                    </Text>
                    <View
                      style={[
                        styles.editTaskInputWrap,
                        styles.editTaskTextAreaWrap,
                      ]}
                    >
                      <TextInput
                        style={[styles.editTaskInputField, { height: "100%" }]}
                        value={editDescripcionTarea}
                        maxLength={2000}
                        onChangeText={setEditDescripcionTarea}
                        multiline
                        numberOfLines={4}
                        placeholder="Descripción detallada..."
                        placeholderTextColor={colors.textMuted}
                        textAlignVertical="top"
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.saveBtn, { height: 44, marginTop: 10 }]}
                      activeOpacity={0.85}
                      onPress={handleGuardarEdicionTarea}
                      disabled={guardandoEdicionTarea}
                    >
                      {guardandoEdicionTarea ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.saveBtnText}>Guardar Cambios</Text>
                      )}
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </View>
            </View>
          )}

          {/* SUB-MODAL: GESTIÓN DE POSTULANTES DE LA TAREA */}
          {tareaSeleccionada !== null && (
            <View style={CAPA_COMPLETA}>
              <View style={styles.subModalOverlay}>
                <TouchableOpacity
                  style={styles.subModalBackdropTouch}
                  activeOpacity={1}
                  onPress={() => setTareaSeleccionada(null)}
                />
                <View style={styles.subModalBox}>
                  {tareaSeleccionada && (
                    <>
                      <View style={styles.sheetHeader}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.sheetSub} numberOfLines={1}>
                            {tareaSeleccionada.titulo}
                          </Text>
                          <Text style={styles.sheetTitle}>
                            {tareaSeleccionada.estado === "completado"
                              ? "Tarea completada"
                              : tareaSeleccionada.estado === "aceptado"
                                ? "Trabajo en progreso"
                                : "Postulantes"}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setTareaSeleccionada(null)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons
                            name="close"
                            size={24}
                            color={colors.textPrimary}
                          />
                        </TouchableOpacity>
                      </View>

                      {/* ACCIONES DEL CONTRATADOR CUANDO LA TAREA ESTÁ EN PROGRESO O COMPLETADA */}
                      {tareaSeleccionada.estado === "aceptado" && (
                        <View style={styles.managementActionsRow}>
                          <TouchableOpacity
                            style={styles.btnFinalizarTarea}
                            activeOpacity={0.85}
                            onPress={() => {
                              handleAbrirCalificar(
                                {
                                  trabajoId: tareaSeleccionada.id,
                                  evaluadoId:
                                    tareaSeleccionada.trabajador_id || "",
                                  nombreContraparte:
                                    tareaSeleccionada.trabajador_nombre ||
                                    "Trabajador",
                                  rolContraparte: "trabajador",
                                  esFinalizacion: true,
                                },
                                "publicaciones",
                              );
                            }}
                          >
                            <Ionicons
                              name="checkmark-circle"
                              size={17}
                              color="#ffffff"
                            />
                            <Text style={styles.btnFinalizarTareaText}>
                              Finalizar y Calificar
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.btnCancelarAcuerdo}
                            activeOpacity={0.85}
                            onPress={handleCancelarAcuerdo}
                          >
                            <Ionicons
                              name="person-remove-outline"
                              size={16}
                              color="#ef4444"
                            />
                            <Text style={styles.btnCancelarAcuerdoText}>
                              Cancelar acuerdo con trabajador
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {tareaSeleccionada.estado === "completado" && (
                        <View
                          style={[
                            styles.managementActionsRow,
                            { marginBottom: 12 },
                          ]}
                        >
                          {tareaSeleccionada.calificadoPorMi ? (
                            <View style={styles.badgeReviewedTag}>
                              <Ionicons name="star" size={13} color="#eab308" />
                              <Text style={styles.badgeReviewedText}>
                                Ya calificaste a este trabajador (
                                {tareaSeleccionada.miCalificacion
                                  ?.calificacion || 5}
                                ★)
                              </Text>
                            </View>
                          ) : tareaSeleccionada.trabajador_id ? (
                            <TouchableOpacity
                              style={styles.btnReviewAction}
                              activeOpacity={0.7}
                              hitSlop={{
                                top: 12,
                                bottom: 12,
                                left: 12,
                                right: 12,
                              }}
                              onPress={() => {
                                handleAbrirCalificar(
                                  {
                                    trabajoId: tareaSeleccionada.id,
                                    evaluadoId:
                                      tareaSeleccionada.trabajador_id!,
                                    nombreContraparte:
                                      tareaSeleccionada.trabajador_nombre ||
                                      "Trabajador",
                                    rolContraparte: "trabajador",
                                    esFinalizacion: false,
                                  },
                                  "publicaciones",
                                );
                              }}
                            >
                              <Ionicons name="star" size={14} color="#eab308" />
                              <Text style={styles.btnReviewActionText}>
                                Calificar al trabajador asignado
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      )}

                      <ScrollView showsVerticalScrollIndicator={false}>
                        {cargandoPostulantes ? (
                          <ActivityIndicator
                            size="small"
                            color={colors.accentBlue}
                            style={{ marginTop: 20 }}
                          />
                        ) : errorPostulantes ? (
                          <View style={styles.emptyApplicantsBox}>
                            <Ionicons
                              name="alert-circle-outline"
                              size={36}
                              color={colors.textMuted}
                            />
                            <Text
                              style={[styles.emptyApplicantsTitle, { textAlign: "center" }]}
                            >
                              {errorPostulantes}
                            </Text>
                            <TouchableOpacity
                              style={[styles.btnAccept, { flex: 0, paddingHorizontal: 18 }]}
                              accessibilityRole="button"
                              accessibilityLabel="Reintentar la carga de postulantes"
                              onPress={() => void handleSeleccionarTarea(tareaSeleccionada)}
                            >
                              <Ionicons name="refresh" size={15} color="#ffffff" />
                              <Text style={styles.btnAcceptText}>Reintentar</Text>
                            </TouchableOpacity>
                          </View>
                        ) : postulantesDeTarea.length === 0 ? (
                          <View style={styles.emptyApplicantsBox}>
                            <Ionicons
                              name="hourglass-outline"
                              size={36}
                              color={colors.textMuted}
                            />
                            <Text style={styles.emptyApplicantsTitle}>
                              Aún no hay postulaciones
                            </Text>
                          </View>
                        ) : (
                          postulantesDeTarea.map((post) => {
                            const esAceptado =
                              post.estado === "aceptado" ||
                              post.postulante_id ===
                                tareaSeleccionada.trabajador_id;

                            return (
                              <View key={post.id} style={styles.applicantCard}>
                                <TouchableOpacity
                                  activeOpacity={0.7}
                                  style={styles.applicantHeaderTouchable}
                                  onPress={() =>
                                    handleVerPerfilPostulante(post)
                                  }
                                >
                                  <View style={styles.applicantUserRow}>
                                    <View style={styles.applicantAvatar}>
                                      {post.avatar_url ? (
                                        <Image
                                          source={{ uri: post.avatar_url }}
                                          style={{
                                            width: "100%",
                                            height: "100%",
                                          }}
                                        />
                                      ) : (
                                        <Ionicons
                                          name="person"
                                          size={14}
                                          color={colors.textPrimary}
                                        />
                                      )}
                                    </View>
                                    <View>
                                      <View style={styles.applicantNameRow}>
                                        <Text style={styles.applicantName}>
                                          {post.nombre}
                                        </Text>
                                        <Ionicons
                                          name="chevron-forward-circle-outline"
                                          size={14}
                                          color={colors.accentBlue}
                                        />
                                      </View>
                                      <View style={styles.applicantRatingRow}>
                                        <Ionicons
                                          name="star"
                                          size={11}
                                          color="#eab308"
                                        />
                                        <Text
                                          style={styles.applicantRatingText}
                                        >
                                          {post.calificacion}
                                        </Text>
                                        <Text style={styles.applicantJobsText}>
                                          • {post.trabajos_realizados} tareas
                                        </Text>
                                      </View>
                                    </View>
                                  </View>
                                  {esAceptado && (
                                    <View style={styles.badgeAcceptedSmall}>
                                      <Text
                                        style={styles.badgeAcceptedSmallText}
                                      >
                                        Asignado
                                      </Text>
                                    </View>
                                  )}
                                </TouchableOpacity>

                                <Text style={styles.applicantMsg}>
                                  {post.mensaje}
                                </Text>

                                <View style={styles.applicantActionsRow}>
                                  {post.estado === "pendiente" &&
                                    tareaSeleccionada.estado ===
                                      "disponible" && (
                                      <>
                                        <TouchableOpacity
                                          style={styles.btnReject}
                                          activeOpacity={0.8}
                                          onPress={() =>
                                            handleRechazar(post.id)
                                          }
                                        >
                                          <Ionicons
                                            name="close"
                                            size={15}
                                            color="#ef4444"
                                          />
                                          <Text style={styles.btnRejectText}>
                                            Rechazar
                                          </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                          style={styles.btnAccept}
                                          activeOpacity={0.85}
                                          onPress={() => handleAceptar(post)}
                                        >
                                          <Ionicons
                                            name="checkmark"
                                            size={15}
                                            color="#ffffff"
                                          />
                                          <Text style={styles.btnAcceptText}>
                                            Aceptar
                                          </Text>
                                        </TouchableOpacity>
                                      </>
                                    )}

                                  {/* BOTÓN WHATSAPP PARA EL TRABAJADOR ASIGNADO */}
                                  {esAceptado && (
                                    <TouchableOpacity
                                      style={styles.btnWhatsAppApplicant}
                                      activeOpacity={0.85}
                                      onPress={() =>
                                        handleAbrirWhatsApp(
                                          tareaSeleccionada.id,
                                          tareaSeleccionada.titulo,
                                        )
                                      }
                                    >
                                      <Ionicons
                                        name="logo-whatsapp"
                                        size={16}
                                        color="#ffffff"
                                      />
                                      <Text
                                        style={styles.btnWhatsAppApplicantText}
                                      >
                                        Coordinar por WhatsApp
                                      </Text>
                                    </TouchableOpacity>
                                  )}
                                </View>
                              </View>
                            );
                          })
                        )}
                      </ScrollView>
                    </>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* SUB-MODAL: PERFIL POSTULANTE */}
          {postulanteDetalle !== null && (
            <View style={CAPA_COMPLETA}>
              <View style={styles.subModalOverlay}>
                <TouchableOpacity
                  style={styles.subModalBackdropTouch}
                  activeOpacity={1}
                  onPress={() => setPostulanteDetalle(null)}
                />
                <View style={styles.applicantProfileBox}>
                  {postulanteDetalle && (
                    <>
                      <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>
                          Perfil del Postulante
                        </Text>
                        <TouchableOpacity
                          onPress={() => setPostulanteDetalle(null)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons
                            name="close"
                            size={22}
                            color={colors.textPrimary}
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.applicantProfileHeader}>
                        <View style={styles.applicantProfileAvatar}>
                          {postulanteDetalle.avatar_url ? (
                            <Image
                              source={{ uri: postulanteDetalle.avatar_url }}
                              style={{ width: "100%", height: "100%" }}
                            />
                          ) : (
                            <Ionicons
                              name="person"
                              size={32}
                              color={colors.textPrimary}
                            />
                          )}
                        </View>
                        <Text style={styles.applicantProfileName}>
                          {postulanteDetalle.nombre}
                        </Text>
                        <Text style={styles.applicantProfileComuna}>
                          {postulanteDetalle.comuna}
                        </Text>
                      </View>

                      <View style={styles.applicantProfileAboutBox}>
                        <Text style={styles.applicantProfileAboutTitle}>
                          Sobre este postulante
                        </Text>
                        <Text style={styles.applicantProfileAboutText}>
                          {postulanteDetalle.sobre_mi}
                        </Text>
                      </View>

                      <View style={styles.miniTabBar}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          style={styles.miniTabButton}
                          onPress={() => setTabPostulante("resenas")}
                        >
                          <View style={styles.tabHeaderLabel}>
                            <Ionicons
                              name="star"
                              size={13}
                              color={
                                tabPostulante === "resenas"
                                  ? "#eab308"
                                  : colors.textMuted
                              }
                            />
                            <Text
                              style={[
                                styles.miniTabText,
                                tabPostulante === "resenas" &&
                                  styles.miniTabTextActive,
                              ]}
                            >
                              Reseñas ({estadoResenasPostulante === "lista" ? resenasPostulante.length : "…"})
                            </Text>
                          </View>
                          {tabPostulante === "resenas" && (
                            <View style={styles.miniActiveIndicator} />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          style={styles.miniTabButton}
                          onPress={() => setTabPostulante("historial")}
                        >
                          <View style={styles.tabHeaderLabel}>
                            <Ionicons
                              name="briefcase"
                              size={13}
                              color={
                                tabPostulante === "historial"
                                  ? colors.accentBlue
                                  : colors.textMuted
                              }
                            />
                            <Text
                              style={[
                                styles.miniTabText,
                                tabPostulante === "historial" &&
                                  styles.miniTabTextActive,
                              ]}
                            >
                              Historial ({estadoHistorialPostulante === "lista" ? historialPostulante.length : "…"})
                            </Text>
                          </View>
                          {tabPostulante === "historial" && (
                            <View style={styles.miniActiveIndicator} />
                          )}
                        </TouchableOpacity>
                      </View>

                      <ScrollView
                        style={styles.tabScrollBox}
                        showsVerticalScrollIndicator={false}
                      >
                        <EstadoListaRemota
                          estado={tabPostulante === "resenas" ? estadoResenasPostulante : estadoHistorialPostulante}
                          error={tabPostulante === "resenas" ? errorResenasPostulante : errorHistorialPostulante}
                          onReintentar={() => {
                            if (!postulanteDetalle) return;
                            if (tabPostulante === "resenas") {
                              void cargarResenasPostulante(postulanteDetalle.postulante_id);
                            } else {
                              void cargarHistorialPostulante(postulanteDetalle.postulante_id);
                            }
                          }}
                        >
                          {tabPostulante === "resenas" ? (
                            resenasPostulante.length > 0 ? (
                              resenasPostulante.map((r) => (
                                <View key={r.id} style={styles.reviewCard}>
                                  <View style={styles.reviewHeader}>
                                    <View style={styles.reviewAuthorRow}>
                                      <View style={styles.reviewAuthorAvatar}>
                                        {r.avatarUrl ? (
                                          <Image
                                            source={{ uri: r.avatarUrl }}
                                            style={{
                                              width: "100%",
                                              height: "100%",
                                            }}
                                          />
                                        ) : (
                                          <Ionicons
                                            name="person"
                                            size={12}
                                            color={colors.textSecondary}
                                          />
                                        )}
                                      </View>
                                      <Text style={styles.reviewAuthor}>
                                        {r.autor}
                                      </Text>
                                    </View>
                                    <View style={styles.starsRow}>
                                      {[...Array(r.calificacion)].map((_, i) => (
                                        <Ionicons
                                          key={i}
                                          name="star"
                                          size={11}
                                          color="#eab308"
                                        />
                                      ))}
                                    </View>
                                  </View>
                                  <Text style={styles.reviewComment}>
                                    {r.comentario}
                                  </Text>
                                  <Text style={styles.reviewDate}>{r.fecha}</Text>
                                </View>
                              ))
                            ) : (
                              <Text style={styles.emptyTabText}>
                                No cuenta con reseñas registradas.
                              </Text>
                            )
                          ) : historialPostulante.length > 0 ? (
                            historialPostulante.map((h) => (
                              <View key={h.id} style={styles.taskCard}>
                                <View style={styles.taskHeader}>
                                  <View style={styles.badge}>
                                    <Text style={styles.badgeText}>
                                      {h.categoria}
                                    </Text>
                                  </View>
                                  <Text style={styles.taskMonto}>{h.monto}</Text>
                                </View>
                                <Text style={styles.taskTitle}>{h.titulo}</Text>
                                <Text style={styles.taskDate}>{h.fecha}</Text>
                              </View>
                            ))
                          ) : (
                            <Text style={styles.emptyTabText}>
                              No registra trabajos previos aún.
                            </Text>
                          )}
                        </EstadoListaRemota>
                      </ScrollView>
                    </>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* SUB-MODAL: CALIFICACIÓN MUTUA */}
          {targetCalificar !== null && (
            <View style={CAPA_COMPLETA}>
              <View style={styles.subModalOverlay}>
                <TouchableOpacity
                  style={styles.subModalBackdropTouch}
                  activeOpacity={1}
                  onPress={handleCerrarCalificar}
                />
                <View style={styles.subModalBox}>
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>
                      {targetCalificar?.esFinalizacion
                        ? "Finalizar y Calificar"
                        : "Calificar Usuario"}
                    </Text>
                    <TouchableOpacity
                      onPress={handleCerrarCalificar}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name="close"
                        size={24}
                        color={colors.textPrimary}
                      />
                    </TouchableOpacity>
                  </View>

                  {targetCalificar && (
                    <>
                      <View style={styles.reviewModalTargetBadge}>
                        <Text style={styles.reviewModalTargetBadgeText}>
                          {targetCalificar.rolContraparte === "trabajador"
                            ? "🛠️ Calificando al trabajador: "
                            : "📋 Calificando al empleador: "}
                          {targetCalificar.nombreContraparte}
                        </Text>
                      </View>

                      <Text style={styles.reviewModalDesc}>
                        {targetCalificar.rolContraparte === "trabajador"
                          ? "¿Cómo fue el desempeño y cumplimiento del servicio?"
                          : "¿Cómo fue el trato, claridad y cumplimiento del pago?"}
                      </Text>

                      <View style={styles.starSelectRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity
                            key={star}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                            onPress={() => setEstrellasCalificacion(star)}
                          >
                            <Ionicons
                              name={
                                star <= estrellasCalificacion
                                  ? "star"
                                  : "star-outline"
                              }
                              size={32}
                              color="#eab308"
                            />
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={styles.starFeedbackText}>
                        {getTextoEstrellas(estrellasCalificacion)}
                      </Text>

                      <View style={styles.reviewInputBox}>
                        <TextInput
                          style={styles.reviewInputField}
                          placeholder="Escribe tu reseña o comentario..."
                          placeholderTextColor={colors.textMuted}
                          multiline
                          numberOfLines={3}
                          value={comentarioCalificacion}
                          onChangeText={setComentarioCalificacion}
                          textAlignVertical="top"
                        />
                      </View>

                      <TouchableOpacity
                        style={styles.btnConfirmarFinalizacion}
                        activeOpacity={0.8}
                        onPress={handleConfirmarCalificacion}
                        disabled={guardandoCalificacion}
                      >
                        {guardandoCalificacion ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons
                              name="checkmark-done"
                              size={18}
                              color="#ffffff"
                            />
                            <Text style={styles.btnConfirmarFinalizacionText}>
                              {targetCalificar.esFinalizacion
                                ? "Confirmar y Finalizar"
                                : "Publicar Reseña"}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* MODAL 4: EDICIÓN DE PERFIL */}
          {modalEditarVisible && (
            <View style={CAPA_COMPLETA}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.modalOverlay}
              >
                <View style={styles.modalOverlay}>
                  <TouchableOpacity
                    style={styles.modalBackdropTouch}
                    activeOpacity={1}
                    onPress={() => setModalEditarVisible(false)}
                  />
                  <View style={styles.modalSheet}>
                    <View style={styles.sheetHeader}>
                      <View style={styles.sheetTitleRow}>
                        <Ionicons
                          name="pencil"
                          size={18}
                          color={colors.accentBlue}
                        />
                        <Text style={styles.sheetTitle}>Editar Perfil</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setModalEditarVisible(false)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name="close"
                          size={24}
                          color={colors.textPrimary}
                        />
                      </TouchableOpacity>
                    </View>

                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ paddingBottom: 20 }}
                    >
                      <View style={styles.editAvatarSection}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={styles.editAvatarWrap}
                          onPress={handlePickFoto}
                        >
                          {tempAvatarUri ? (
                            <Image
                              source={{ uri: tempAvatarUri }}
                              style={styles.editAvatarImage}
                            />
                          ) : (
                            <Ionicons
                              name="person"
                              size={40}
                              color={colors.textMuted}
                            />
                          )}
                          <View style={styles.cameraIconBadge}>
                            <Ionicons name="camera" size={14} color="#ffffff" />
                          </View>
                        </TouchableOpacity>
                        <Text style={styles.editAvatarHint}>
                          Toca para cambiar foto
                        </Text>
                      </View>

                      <Text style={styles.inputLabel}>Nombre completo</Text>
                      <View style={styles.inputBox}>
                        <TextInput
                          style={styles.inputField}
                          value={tempNombre}
                          maxLength={80}
                          onChangeText={setTempNombre}
                          placeholder="Tu nombre"
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>

                      <Text style={styles.inputLabel}>Ubicación (Comuna)</Text>
                      <TouchableOpacity
                        style={styles.dropdownSelectorBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          setModalComunasVisible(true);
                          void cargarComunasPerfil('catalogo');
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Ionicons
                            name="location-outline"
                            size={18}
                            color={colors.accentBlue}
                          />
                          <Text style={styles.dropdownSelectorText}>
                            {tempComunaNombre}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-down"
                          size={18}
                          color={colors.textMuted}
                        />
                      </TouchableOpacity>

                      <Text style={styles.inputLabel}>Sobre mí</Text>
                      <View style={[styles.inputBox, styles.inputBoxArea]}>
                        <TextInput
                          style={[styles.inputField, styles.inputFieldArea]}
                          multiline
                          numberOfLines={4}
                          value={tempSobreMi}
                          maxLength={1000}
                          onChangeText={setTempSobreMi}
                          placeholder="Describe tus habilidades..."
                          placeholderTextColor={colors.textMuted}
                          textAlignVertical="top"
                        />
                      </View>

                      <View style={styles.editButtonsRow}>
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={() => setModalEditarVisible(false)}
                        >
                          <Text style={styles.cancelBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.saveBtn}
                          onPress={handleGuardarPerfil}
                          disabled={guardandoCambios}
                        >
                          {guardandoCambios ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text style={styles.saveBtnText}>Guardar</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </ScrollView>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          )}

          {/* SUB-MODAL COMUNAS */}
          {modalComunasVisible && (
            <View style={CAPA_COMPLETA}>
              <View style={styles.subModalOverlay}>
                <TouchableOpacity
                  style={styles.subModalBackdropTouch}
                  activeOpacity={1}
                  onPress={() => setModalComunasVisible(false)}
                />
                <View style={styles.dropdownModalBox}>
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Selecciona tu Comuna</Text>
                    <TouchableOpacity
                      onPress={() => setModalComunasVisible(false)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name="close"
                        size={22}
                        color={colors.textPrimary}
                      />
                    </TouchableOpacity>
                  </View>
                  <EstadoListaRemota estado={estadoComunasPerfil === 'lista' && comunasDisponibles.length === 0 ? 'error' : estadoComunasPerfil} error={errorComunasPerfil ?? 'No hay comunas disponibles.'} onReintentar={() => void cargarComunasPerfil('catalogo')}>
                    <FlatList
                      data={comunasDisponibles}
                      keyExtractor={(item) => item.id.toString()}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.comunaItem,
                            tempComunaId === item.id && styles.comunaItemActive,
                          ]}
                          onPress={() => {
                            setTempComunaId(item.id);
                            setTempComunaNombre(item.nombre);
                            setModalComunasVisible(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.comunaItemText,
                              tempComunaId === item.id &&
                              styles.comunaItemTextActive,
                            ]}
                          >
                            {item.nombre}
                          </Text>
                          {tempComunaId === item.id && (
                            <Ionicons
                              name="checkmark"
                              size={18}
                              color={colors.accentBlue}
                            />
                          )}
                        </TouchableOpacity>
                      )}
                    />
                  </EstadoListaRemota>
                </View>
              </View>
            </View>
          )}

          {/* MODAL 5: CRÉDITOS */}
          {modalVisible === "creditos" && (
            <View style={CAPA_COMPLETA}>
              <View style={styles.modalOverlay}>
                <TouchableOpacity
                  style={styles.modalBackdropTouch}
                  activeOpacity={1}
                  onPress={() => setModalVisible("ninguno")}
                />
                <View style={styles.modalSheet}>
                  <View style={styles.sheetHeader}>
                    <View style={styles.sheetTitleRow}>
                      <Ionicons name="sparkles" size={20} color="#eab308" />
                      <Text style={styles.sheetTitle}>Tus Créditos</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setModalVisible("ninguno")}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name="close"
                        size={24}
                        color={colors.textPrimary}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Saldo disponible</Text>
                    <Text style={styles.balanceNumber}>
                      {textoSaldo}
                    </Text>
                    <Text style={styles.balanceSubtext}>
                      Usa créditos para destacar tus ofertas en la comunidad.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={{ paddingVertical: 12 }}
                    onPress={() => {
                      setModalVisible("ninguno");
                      setHistorialComprasVisible(true);
                    }}
                  >
                    <Text
                      style={{
                        color: colors.accentBlue,
                        textAlign: "center",
                      }}
                    >
                      Historial de compras
                    </Text>
                  </TouchableOpacity>
                  {PAQUETES_CREDITOS.map((pack) => (
                    <TouchableOpacity
                      key={pack.id}
                      activeOpacity={0.8}
                      style={[
                        styles.packageCard,
                        pack.destacado && styles.packageCardPopular,
                      ]}
                      onPress={() => {
                        setModalVisible("ninguno");
                        setPagoVisible({ paqueteId: pack.id });
                      }}
                    >
                      <View style={styles.packageInfo}>
                        <View style={styles.packageCreditsRow}>
                          <Ionicons name="flash" size={16} color="#eab308" />
                          <Text style={styles.packageCredits}>
                            {pack.creditos} Créditos
                          </Text>
                        </View>
                        <Text style={styles.packageDesc}>{pack.desc}</Text>
                      </View>
                      <View style={styles.buyButtonWrap}>
                        <Text style={styles.packagePrice}>{pack.precio}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* MODAL DE ALERTA PERSONALIZADO (DARK THEME) */}
          {alerta.visible && (
            <AlertaPerfil alerta={alerta} onCerrar={cerrarAlerta} />
          )}
        </View>
      </Modal>
    </View>
  );
}
