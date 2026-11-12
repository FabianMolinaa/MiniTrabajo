import { useState, useCallback, useRef, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../services/supabase";
import { abrirWhatsAppTrabajo } from "../services/contactos";
import { editarTrabajoPropio, eliminarTrabajoPropio, cancelarAcuerdoTrabajador, fetchPublicacionesUsuario, fetchHistorialTrabajosHechos, type MiPublicacion, type TrabajoRealizadoItem } from "../services/trabajos";
import { fetchPostulantesDeTarea, aceptarPostulante, rechazarPostulacion, type PostulanteBD } from "../services/postulaciones";
import { enviarCalificacionMutua, fetchResenasUsuario, type ResenaItem } from "../services/resenas";
import { fetchPerfilUsuario, actualizarPerfilPropio, type PerfilData } from "../services/perfiles";
import { subirAvatarStorage } from "../services/imagenes";
import { fetchComunasFiltro } from "../services/catalogos";
import type { AlertaPersonalizada } from "../components/AlertaPerfil";
import type { ComunaItem } from "../components/FormularioEdicionPerfil";
import { useListaRemota } from "./useListaRemota";

interface CalificacionTarget {
  trabajoId: string;
  evaluadoId: string;
  nombreContraparte: string;
  rolContraparte: "trabajador" | "empleador";
  esFinalizacion?: boolean;
}

export function usePerfil() {
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

  return {
    correo,
    cargandoPerfil,
    errorPerfil,
    refrescando,
    cerrandoSesion,
    pagoVisible,
    setPagoVisible,
    historialComprasVisible,
    setHistorialComprasVisible,
    perfil,
    misPublicaciones,
    estadoPublicaciones,
    errorPublicaciones,
    resenasRecibidas,
    estadoResenasRecibidas,
    errorResenasRecibidas,
    historialTrabajos,
    estadoHistorialTrabajos,
    errorHistorialTrabajos,
    comunasDisponibles,
    estadoComunasPerfil,
    errorComunasPerfil,
    cargarComunasPerfil,
    tareaSeleccionada,
    setTareaSeleccionada,
    postulantesDeTarea,
    cargandoPostulantes,
    errorPostulantes,
    postulanteDetalle,
    setPostulanteDetalle,
    resenasPostulante,
    estadoResenasPostulante,
    errorResenasPostulante,
    cargarResenasPostulante,
    historialPostulante,
    estadoHistorialPostulante,
    errorHistorialPostulante,
    cargarHistorialPostulante,
    tabPostulante,
    setTabPostulante,
    targetCalificar,
    estrellasCalificacion,
    setEstrellasCalificacion,
    comentarioCalificacion,
    setComentarioCalificacion,
    guardandoCalificacion,
    tareaOpciones,
    setTareaOpciones,
    modalEditarTareaVisible,
    setModalEditarTareaVisible,
    editTituloTarea,
    setEditTituloTarea,
    editDescripcionTarea,
    setEditDescripcionTarea,
    editMontoTarea,
    setEditMontoTarea,
    guardandoEdicionTarea,
    tabPublicaciones,
    setTabPublicaciones,
    modalVisible,
    setModalVisible,
    modalEditarVisible,
    setModalEditarVisible,
    modalComunasVisible,
    setModalComunasVisible,
    guardandoCambios,
    tempNombre,
    setTempNombre,
    tempSobreMi,
    setTempSobreMi,
    tempAvatarUri,
    setTempAvatarUri,
    setTempAvatarBase64,
    tempComunaId,
    setTempComunaId,
    tempComunaNombre,
    setTempComunaNombre,
    alerta,
    cerrarAlerta,
    handleCerrarSesion,
    cargarDatos,
    onRefresh,
    recargarResenasPropias,
    recargarHistorialPropio,
    recargarPublicacionesPropias,
    handleSeleccionarTarea,
    handleVerPerfilPostulante,
    handleAceptar,
    handleRechazar,
    handleCancelarAcuerdo,
    handleAbrirOpcionesTarea,
    handleIniciarEdicionTarea,
    handleGuardarEdicionTarea,
    handleEliminarTareaOpciones,
    handleAbrirCalificar,
    handleCerrarCalificar,
    handleConfirmarCalificacion,
    handlePickFoto,
    handleGuardarPerfil,
    handleAbrirWhatsApp,
    hayCapaAbierta,
    cerrarCapaSuperior,
  };
}
