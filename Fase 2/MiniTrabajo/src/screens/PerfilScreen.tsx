import React, { useState, useCallback } from "react";
import { useFocusEffect } from '@react-navigation/native';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Linking,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { colors } from "../theme/colors";
import { supabase } from "../services/supabase";
import { styles } from "../styles/PerfilStyles";
import {
  ResenaItem,
  TrabajoRealizadoItem,
  PostulanteBD,
  MiPublicacion,
  PerfilData,
  fetchPerfilUsuario,
  fetchPublicacionesUsuario,
  fetchPostulantesDeTarea,
  fetchResenasUsuario,
  fetchHistorialTrabajosHechos,
  aceptarPostulante,
  finalizarYCalificarTarea,
} from "../utils/functionsPerfil";

interface ComunaItem {
  id: number;
  nombre: string;
}

const PAQUETES_CREDITOS = [
  { id: "1", creditos: 10, precio: "$2.990", destacado: false, desc: "Ideal para destacar 2 publicaciones" },
  { id: "2", creditos: 25, precio: "$5.990", destacado: true, desc: "El más popular (ahorras 20%)" },
  { id: "3", creditos: 50, precio: "$9.990", destacado: false, desc: "Para usuarios frecuentes" },
];

export default function PerfilScreen() {
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [correo, setCorreo] = useState("");
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Perfil
  const [perfil, setPerfil] = useState<PerfilData>({
    nombre: "Cargando...",
    sobre_mi: "Sin descripción aún.",
    avatar_url: null,
    calificacion: "0.0",
    total_resenas: 0,
    trabajos_realizados: 0,
    creditos: 10,
    comuna_id: 1,
    comuna_nombre: "Santiago Centro",
  });

  // Listas
  const [misPublicaciones, setMisPublicaciones] = useState<MiPublicacion[]>([]);
  const [resenasRecibidas, setResenasRecibidas] = useState<ResenaItem[]>([]);
  const [historialTrabajos, setHistorialTrabajos] = useState<TrabajoRealizadoItem[]>([]);
  const [comunasDisponibles, setComunasDisponibles] = useState<ComunaItem[]>([]);

  // Tarea y Postulantes
  const [tareaSeleccionada, setTareaSeleccionada] = useState<MiPublicacion | null>(null);
  const [postulantesDeTarea, setPostulantesDeTarea] = useState<PostulanteBD[]>([]);
  const [cargandoPostulantes, setCargandoPostulantes] = useState(false);
  const [postulanteDetalle, setPostulanteDetalle] = useState<PostulanteBD | null>(null);
  const [resenasPostulante, setResenasPostulante] = useState<ResenaItem[]>([]);
  const [historialPostulante, setHistorialPostulante] = useState<TrabajoRealizadoItem[]>([]);
  const [tabPostulante, setTabPostulante] = useState<"resenas" | "historial">("resenas");

  // Calificación
  const [tareaAFinalizar, setTareaAFinalizar] = useState<MiPublicacion | null>(null);
  const [estrellasCalificacion, setEstrellasCalificacion] = useState(5);
  const [comentarioCalificacion, setComentarioCalificacion] = useState("");
  const [guardandoFinalizacion, setGuardandoFinalizacion] = useState(false);

  // Modales
  const [tabPublicaciones, setTabPublicaciones] = useState<"activas" | "completadas">("activas");
  const [modalVisible, setModalVisible] = useState<"ninguno" | "resenas" | "historial" | "publicaciones" | "creditos">("ninguno");
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [modalComunasVisible, setModalComunasVisible] = useState(false);
  const [guardandoCambios, setGuardandoCambios] = useState(false);

  // Form edición
  const [tempNombre, setTempNombre] = useState("");
  const [tempSobreMi, setTempSobreMi] = useState("");
  const [tempAvatarUri, setTempAvatarUri] = useState<string | null>(null);
  const [tempAvatarBase64, setTempAvatarBase64] = useState<string | null>(null);
  const [tempComunaId, setTempComunaId] = useState<number>(1);
  const [tempComunaNombre, setTempComunaNombre] = useState("Santiago Centro");

  const cargarDatos = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUsuarioId(user.id);
      setCorreo(user.email || "");

      const [perfilRes, pubsRes, resenasRes, histRes, comunasRes] = await Promise.all([
        fetchPerfilUsuario(user.id),
        fetchPublicacionesUsuario(user.id),
        fetchResenasUsuario(user.id),
        fetchHistorialTrabajosHechos(user.id),
        supabase.from("comunas").select("id, nombre").order("nombre", { ascending: true }),
      ]);

      if (perfilRes) setPerfil(perfilRes);
      setMisPublicaciones(pubsRes);
      setResenasRecibidas(resenasRes);
      setHistorialTrabajos(histRes);
      if (comunasRes.data) setComunasDisponibles(comunasRes.data);
    } catch (e) {
      console.error("Error al cargar perfil:", e);
    } finally {
      setCargandoPerfil(false);
      setRefrescando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos])
  );

  const onRefresh = useCallback(() => {
    setRefrescando(true);
    cargarDatos();
  }, [cargarDatos]);

  const handleSeleccionarTarea = async (tarea: MiPublicacion) => {
    setTareaSeleccionada(tarea);
    setCargandoPostulantes(true);
    const postulantes = await fetchPostulantesDeTarea(tarea.id);
    setPostulantesDeTarea(postulantes);
    setCargandoPostulantes(false);
  };

  const handleVerPerfilPostulante = async (postulante: PostulanteBD) => {
    setPostulanteDetalle(postulante);
    setTabPostulante("resenas");
    const [resenas, historial] = await Promise.all([
      fetchResenasUsuario(postulante.postulante_id),
      fetchHistorialTrabajosHechos(postulante.postulante_id),
    ]);
    setResenasPostulante(resenas);
    setHistorialPostulante(historial);
  };

  const handleAceptar = async (postulante: PostulanteBD) => {
    if (!tareaSeleccionada || !usuarioId) return;
    try {
      await aceptarPostulante(tareaSeleccionada.id, postulante.id, postulante.postulante_id);
      Alert.alert("¡Postulante Aceptado!", "El trabajo quedó asignado. Ya puedes coordinar por WhatsApp.");
      await cargarDatos();
      await handleSeleccionarTarea({ ...tareaSeleccionada, estado: "aceptado", trabajador_id: postulante.postulante_id });
      if (postulanteDetalle) setPostulanteDetalle({ ...postulanteDetalle, estado: "aceptado" });
    } catch (err: any) {
      Alert.alert("Error", err.message || "No se pudo aceptar al postulante.");
    }
  };

  const handleRechazar = async (postulanteId: string) => {
    try {
      await supabase.from("postulaciones").update({ estado: "rechazado" }).eq("id", postulanteId);
      setPostulantesDeTarea((prev) => prev.map((p) => (p.id === postulanteId ? { ...p, estado: "rechazado" } : p)));
      if (postulanteDetalle?.id === postulanteId) setPostulanteDetalle(null);
    } catch (err: any) {
      Alert.alert("Error", err.message || "No se pudo rechazar al postulante.");
    }
  };

  const handleConfirmarFinalizacion = async () => {
    if (!tareaAFinalizar || !usuarioId || !tareaAFinalizar.trabajador_id) return;
    setGuardandoFinalizacion(true);
    try {
      await finalizarYCalificarTarea(
        tareaAFinalizar.id,
        usuarioId,
        tareaAFinalizar.trabajador_id,
        estrellasCalificacion,
        comentarioCalificacion
      );
      Alert.alert("¡Tarea Finalizada!", "Se registró el cierre y la calificación con éxito.");
      setTareaAFinalizar(null);
      setTareaSeleccionada(null);
      setComentarioCalificacion("");
      setEstrellasCalificacion(5);
      await cargarDatos();
    } catch (err: any) {
      Alert.alert("Error", err.message || "No se pudo cerrar la tarea.");
    } finally {
      setGuardandoFinalizacion(false);
    }
  };

  const handlePickFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso denegado", "Se requiere acceso a la galería.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true, // <-- Base64 directo de la galería sin usar expo-file-system
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setTempAvatarUri(result.assets[0].uri);
      if (result.assets[0].base64) {
        setTempAvatarBase64(result.assets[0].base64);
      }
    }
  };

  const subirAvatarStorage = async (base64Data: string, uid: string): Promise<string | null> => {
    try {
      const fileName = `${uid}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, decode(base64Data), {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error("Error al subir avatar:", uploadError);
        return null;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      console.error("Error subiendo avatar:", err);
      return null;
    }
  };

  const handleGuardarPerfil = async () => {
    if (!tempNombre.trim() || !usuarioId) {
      Alert.alert("Atención", "El nombre no puede estar vacío.");
      return;
    }
    setGuardandoCambios(true);
    try {
      let finalAvatarUrl = perfil.avatar_url;

      if (tempAvatarBase64) {
        const urlPublica = await subirAvatarStorage(tempAvatarBase64, usuarioId);
        if (urlPublica) {
          finalAvatarUrl = urlPublica;
        }
      }

      const { error } = await supabase
        .from("perfiles")
        .update({
          nombre: tempNombre.trim(),
          sobre_mi: tempSobreMi.trim(),
          avatar_url: finalAvatarUrl,
          comuna_id: tempComunaId,
        })
        .eq("id", usuarioId);

      if (error) throw error;
      setModalEditarVisible(false);
      setTempAvatarBase64(null);
      await cargarDatos();
      Alert.alert("¡Éxito!", "Perfil actualizado.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "No se pudieron guardar los cambios.");
    } finally {
      setGuardandoCambios(false);
    }
  };

  const handleAbrirWhatsApp = (telefono: string, tituloTarea: string) => {
    if (!telefono) {
      Alert.alert("Sin teléfono", "Este usuario no tiene teléfono registrado.");
      return;
    }
    const cleanTel = telefono.replace(/[^0-9]/g, "");
    Linking.openURL(`https://wa.me/${cleanTel}?text=${encodeURIComponent(`¡Hola! Te contacto por tu postulación a "${tituloTarea}".`)}`);
  };

  const publicacionesActivas = misPublicaciones.filter((p) => p.estado !== "completado");
  const publicacionesCompletadas = misPublicaciones.filter((p) => p.estado === "completado");

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
        {/* TARJETA USUARIO */}
        <View style={styles.userCard}>
          <TouchableOpacity activeOpacity={0.8} style={styles.creditsPillTop} onPress={() => setModalVisible("creditos")}>
            <Ionicons name="sparkles" size={13} color="#eab308" />
            <Text style={styles.creditsPillText}>{perfil.creditos} créditos</Text>
          </TouchableOpacity>

          <View style={styles.avatarWrap}>
            {perfil.avatar_url ? (
              <Image source={{ uri: perfil.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={38} color={colors.textPrimary} />
            )}
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={colors.accentBlue} />
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
                    setTempSobreMi(perfil.sobre_mi === "Sin descripción aún." ? "" : perfil.sobre_mi);
                    setTempAvatarUri(perfil.avatar_url);
                    setTempAvatarBase64(null);
                    setTempComunaId(perfil.comuna_id);
                    setTempComunaNombre(perfil.comuna_nombre);
                    setModalEditarVisible(true);
                  }}
                >
                  <Ionicons name="pencil" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </>
            )}
          </View>
          <Text style={styles.userEmail}>{correo}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={13} color={colors.textSecondary} />
            <Text style={styles.locationText}>{perfil.comuna_nombre}</Text>
          </View>
        </View>

        {/* MÉTRICAS */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statBox} activeOpacity={0.7} onPress={() => setModalVisible("resenas")}>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color={Number(perfil.calificacion) > 0 ? "#eab308" : colors.textMuted} />
              <Text style={styles.statValue}>{Number(perfil.calificacion) > 0 ? perfil.calificacion : "Nuevo"}</Text>
            </View>
            <Text style={styles.statLabel}>{perfil.total_resenas} reseñas</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.textMuted} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.statBox, styles.statBorderHorizontal]} activeOpacity={0.7} onPress={() => setModalVisible("historial")}>
            <Text style={styles.statValue}>{perfil.trabajos_realizados}</Text>
            <Text style={styles.statLabel}>Trabajos hechos</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.textMuted} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.statBox} activeOpacity={0.7} onPress={() => setModalVisible("publicaciones")}>
            <Text style={[styles.statValue, { color: colors.accentBlue }]}>{misPublicaciones.length}</Text>
            <Text style={styles.statLabel}>Publicaciones</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.textMuted} style={styles.statChevron} />
          </TouchableOpacity>
        </View>

        {/* SOBRE MÍ */}
        <View style={styles.aboutCard}>
          <View style={styles.aboutHeader}>
            <Ionicons name="information-circle-outline" size={16} color={colors.accentBlue} />
            <Text style={styles.aboutTitle}>Sobre mí</Text>
          </View>
          <Text style={styles.aboutText}>{perfil.sobre_mi}</Text>
        </View>

        <TouchableOpacity activeOpacity={0.8} style={styles.logoutButton} onPress={() => supabase.auth.signOut()}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL 1: RESEÑAS */}
      <Modal animationType="slide" transparent={true} visible={modalVisible === "resenas"} onRequestClose={() => setModalVisible("ninguno")}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible("ninguno")}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleRow}>
                <Ionicons name="star" size={18} color="#eab308" />
                <Text style={styles.sheetTitle}>Reseñas Recibidas ({resenasRecibidas.length})</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible("ninguno")}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {resenasRecibidas.length === 0 ? (
                <Text style={styles.emptyTabText}>Aún no has recibido reseñas.</Text>
              ) : (
                resenasRecibidas.map((r) => (
                  <View key={r.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewAuthor}>{r.autor}</Text>
                      <View style={styles.starsRow}>
                        {[...Array(r.calificacion)].map((_, i) => (
                          <Ionicons key={i} name="star" size={12} color="#eab308" />
                        ))}
                      </View>
                    </View>
                    <Text style={styles.reviewComment}>{r.comentario}</Text>
                    <Text style={styles.reviewDate}>{r.fecha}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL 2: HISTORIAL DE TRABAJOS HECHOS */}
      <Modal animationType="slide" transparent={true} visible={modalVisible === "historial"} onRequestClose={() => setModalVisible("ninguno")}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible("ninguno")}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleRow}>
                <Ionicons name="briefcase" size={18} color={colors.accentBlue} />
                <Text style={styles.sheetTitle}>Trabajos Completados ({historialTrabajos.length})</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible("ninguno")}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {historialTrabajos.length === 0 ? (
                <View style={styles.emptyApplicantsBox}>
                  <Ionicons name="hammer-outline" size={36} color={colors.textMuted} />
                  <Text style={styles.emptyApplicantsTitle}>Aún no has completado trabajos</Text>
                </View>
              ) : (
                historialTrabajos.map((item) => (
                  <View key={item.id} style={styles.taskCard}>
                    <View style={styles.taskHeader}>
                      <View style={styles.badge}><Text style={styles.badgeText}>{item.categoria}</Text></View>
                      <Text style={styles.taskMonto}>{item.monto}</Text>
                    </View>
                    <Text style={styles.taskTitle}>{item.titulo}</Text>
                    <View style={styles.taskFooter}>
                      <Text style={styles.taskDate}>{item.fecha}</Text>
                      <View style={styles.badgeAcceptedTag}>
                        <Ionicons name="checkmark-done" size={12} color={colors.accentGreen} />
                        <Text style={styles.badgeAcceptedText}>Completado</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL 3: MIS PUBLICACIONES */}
      <Modal animationType="slide" transparent={true} visible={modalVisible === "publicaciones"} onRequestClose={() => setModalVisible("ninguno")}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible("ninguno")}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleRow}>
                <Ionicons name="document-text" size={18} color={colors.accentBlue} />
                <Text style={styles.sheetTitle}>Mis Publicaciones</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible("ninguno")}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.pubTabBar}>
              <TouchableOpacity activeOpacity={0.7} style={styles.pubTabButton} onPress={() => setTabPublicaciones("activas")}>
                <Text style={[styles.pubTabText, tabPublicaciones === "activas" && styles.pubTabTextActive]}>
                  Activas ({publicacionesActivas.length})
                </Text>
                {tabPublicaciones === "activas" && <View style={styles.pubActiveIndicator} />}
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} style={styles.pubTabButton} onPress={() => setTabPublicaciones("completadas")}>
                <Text style={[styles.pubTabText, tabPublicaciones === "completadas" && styles.pubTabTextActive]}>
                  Completadas ({publicacionesCompletadas.length})
                </Text>
                {tabPublicaciones === "completadas" && <View style={styles.pubActiveIndicator} />}
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {(tabPublicaciones === "activas" ? publicacionesActivas : publicacionesCompletadas).map((tarea) => (
                <TouchableOpacity key={tarea.id} activeOpacity={0.8} style={styles.taskCard} onPress={() => handleSeleccionarTarea(tarea)}>
                  <View style={styles.taskHeader}>
                    <View style={styles.headerLeftRow}>
                      <View style={styles.badge}><Text style={styles.badgeText}>{tarea.categoria}</Text></View>
                      {tarea.imagenes && tarea.imagenes.length > 0 && (
                        <View style={styles.photosBadgeTag}>
                          <Ionicons name="image-outline" size={11} color={colors.accentBlue} />
                          <Text style={styles.photosBadgeText}>{tarea.imagenes.length}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.taskMonto}>{tarea.monto}</Text>
                  </View>
                  <Text style={styles.taskTitle}>{tarea.titulo}</Text>
                  <View style={styles.taskFooter}>
                    <Text style={styles.taskDate}>{tarea.fecha}</Text>
                    {tarea.estado === "completado" ? (
                      <View style={styles.badgeCompletedTag}>
                        <Ionicons name="checkmark-done" size={12} color={colors.textMuted} />
                        <Text style={styles.badgeCompletedText}>Completada</Text>
                      </View>
                    ) : tarea.estado === "aceptado" ? (
                      <View style={styles.badgeAcceptedTag}>
                        <Ionicons name="play" size={11} color={colors.accentGreen} />
                        <Text style={styles.badgeAcceptedText}>En curso</Text>
                      </View>
                    ) : (tarea.total_postulantes || 0) > 0 ? (
                      <View style={styles.badgeApplicantsTag}>
                        <Ionicons name="people" size={12} color={colors.accentBlue} />
                        <Text style={styles.badgeApplicantsText}>{tarea.total_postulantes} postulante(s)</Text>
                      </View>
                    ) : (
                      <Text style={styles.noApplicantsText}>Sin postulantes</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* SUB-MODAL: GESTIÓN DE POSTULANTES DE LA TAREA */}
      <Modal animationType="fade" transparent={true} visible={tareaSeleccionada !== null} onRequestClose={() => setTareaSeleccionada(null)}>
        <Pressable style={styles.subModalOverlay} onPress={() => setTareaSeleccionada(null)}>
          <Pressable style={styles.subModalBox} onPress={(e) => e.stopPropagation()}>
            {tareaSeleccionada && (
              <>
                <View style={styles.sheetHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.sheetSub} numberOfLines={1}>{tareaSeleccionada.titulo}</Text>
                    <Text style={styles.sheetTitle}>
                      {tareaSeleccionada.estado === "completado"
                        ? "Tarea completada"
                        : tareaSeleccionada.estado === "aceptado"
                        ? "Trabajo en progreso"
                        : "Postulantes"}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setTareaSeleccionada(null)}>
                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {tareaSeleccionada.estado === "aceptado" && (
                  <View style={styles.managementActionsRow}>
                    <TouchableOpacity style={styles.btnFinalizarTarea} activeOpacity={0.85} onPress={() => setTareaAFinalizar(tareaSeleccionada)}>
                      <Ionicons name="checkmark-circle" size={17} color="#ffffff" />
                      <Text style={styles.btnFinalizarTareaText}>Finalizar y Calificar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <ScrollView showsVerticalScrollIndicator={false}>
                  {cargandoPostulantes ? (
                    <ActivityIndicator size="small" color={colors.accentBlue} style={{ marginTop: 20 }} />
                  ) : postulantesDeTarea.length === 0 ? (
                    <View style={styles.emptyApplicantsBox}>
                      <Ionicons name="hourglass-outline" size={36} color={colors.textMuted} />
                      <Text style={styles.emptyApplicantsTitle}>Aún no hay postulaciones</Text>
                    </View>
                  ) : (
                    postulantesDeTarea.map((post) => (
                      <View key={post.id} style={styles.applicantCard}>
                        <TouchableOpacity activeOpacity={0.7} style={styles.applicantHeaderTouchable} onPress={() => handleVerPerfilPostulante(post)}>
                          <View style={styles.applicantUserRow}>
                            <View style={styles.applicantAvatar}>
                              {post.avatar_url ? (
                                <Image source={{ uri: post.avatar_url }} style={{ width: "100%", height: "100%" }} />
                              ) : (
                                <Ionicons name="person" size={14} color={colors.textPrimary} />
                              )}
                            </View>
                            <View>
                              <View style={styles.applicantNameRow}>
                                <Text style={styles.applicantName}>{post.nombre}</Text>
                                <Ionicons name="chevron-forward-circle-outline" size={14} color={colors.accentBlue} />
                              </View>
                              <View style={styles.applicantRatingRow}>
                                <Ionicons name="star" size={11} color="#eab308" />
                                <Text style={styles.applicantRatingText}>{post.calificacion}</Text>
                                <Text style={styles.applicantJobsText}>• {post.trabajos_realizados} tareas</Text>
                              </View>
                            </View>
                          </View>
                          {post.estado === "aceptado" && (
                            <View style={styles.badgeAcceptedSmall}><Text style={styles.badgeAcceptedSmallText}>Asignado</Text></View>
                          )}
                        </TouchableOpacity>

                        <Text style={styles.applicantMsg}>{post.mensaje}</Text>

                        <View style={styles.applicantActionsRow}>
                          {post.estado === "pendiente" && tareaSeleccionada.estado === "disponible" && (
                            <>
                              <TouchableOpacity style={styles.btnReject} activeOpacity={0.8} onPress={() => handleRechazar(post.id)}>
                                <Ionicons name="close" size={15} color="#ef4444" />
                                <Text style={styles.btnRejectText}>Rechazar</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.btnAccept} activeOpacity={0.85} onPress={() => handleAceptar(post)}>
                                <Ionicons name="checkmark" size={15} color="#ffffff" />
                                <Text style={styles.btnAcceptText}>Aceptar</Text>
                              </TouchableOpacity>
                            </>
                          )}
                          {post.estado === "aceptado" && (
                            <TouchableOpacity style={styles.btnWhatsAppApplicant} activeOpacity={0.85} onPress={() => handleAbrirWhatsApp(post.telefono, tareaSeleccionada.titulo)}>
                              <Ionicons name="logo-whatsapp" size={16} color="#ffffff" />
                              <Text style={styles.btnWhatsAppApplicantText}>Coordinar por WhatsApp</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* SUB-MODAL: PERFIL POSTULANTE */}
      <Modal animationType="fade" transparent={true} visible={postulanteDetalle !== null} onRequestClose={() => setPostulanteDetalle(null)}>
        <Pressable style={styles.subModalOverlay} onPress={() => setPostulanteDetalle(null)}>
          <Pressable style={styles.applicantProfileBox} onPress={(e) => e.stopPropagation()}>
            {postulanteDetalle && (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Perfil del Postulante</Text>
                  <TouchableOpacity onPress={() => setPostulanteDetalle(null)}>
                    <Ionicons name="close" size={22} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.applicantProfileHeader}>
                  <View style={styles.applicantProfileAvatar}>
                    {postulanteDetalle.avatar_url ? (
                      <Image source={{ uri: postulanteDetalle.avatar_url }} style={{ width: "100%", height: "100%" }} />
                    ) : (
                      <Ionicons name="person" size={32} color={colors.textPrimary} />
                    )}
                  </View>
                  <Text style={styles.applicantProfileName}>{postulanteDetalle.nombre}</Text>
                  <Text style={styles.applicantProfileComuna}>{postulanteDetalle.comuna}</Text>
                </View>

                <View style={styles.applicantProfileAboutBox}>
                  <Text style={styles.applicantProfileAboutTitle}>Sobre este postulante</Text>
                  <Text style={styles.applicantProfileAboutText}>{postulanteDetalle.sobre_mi}</Text>
                </View>

                <View style={styles.miniTabBar}>
                  <TouchableOpacity activeOpacity={0.7} style={styles.miniTabButton} onPress={() => setTabPostulante("resenas")}>
                    <View style={styles.tabHeaderLabel}>
                      <Ionicons name="star" size={13} color={tabPostulante === "resenas" ? "#eab308" : colors.textMuted} />
                      <Text style={[styles.miniTabText, tabPostulante === "resenas" && styles.miniTabTextActive]}>
                        Reseñas ({resenasPostulante.length})
                      </Text>
                    </View>
                    {tabPostulante === "resenas" && <View style={styles.miniActiveIndicator} />}
                  </TouchableOpacity>
                  <TouchableOpacity activeOpacity={0.7} style={styles.miniTabButton} onPress={() => setTabPostulante("historial")}>
                    <View style={styles.tabHeaderLabel}>
                      <Ionicons name="briefcase" size={13} color={tabPostulante === "historial" ? colors.accentBlue : colors.textMuted} />
                      <Text style={[styles.miniTabText, tabPostulante === "historial" && styles.miniTabTextActive]}>
                        Historial ({historialPostulante.length})
                      </Text>
                    </View>
                    {tabPostulante === "historial" && <View style={styles.miniActiveIndicator} />}
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.tabScrollBox} showsVerticalScrollIndicator={false}>
                  {tabPostulante === "resenas" ? (
                    resenasPostulante.length > 0 ? (
                      resenasPostulante.map((r) => (
                        <View key={r.id} style={styles.reviewCard}>
                          <View style={styles.reviewHeader}>
                            <Text style={styles.reviewAuthor}>{r.autor}</Text>
                            <View style={styles.starsRow}>
                              {[...Array(r.calificacion)].map((_, i) => (
                                <Ionicons key={i} name="star" size={11} color="#eab308" />
                              ))}
                            </View>
                          </View>
                          <Text style={styles.reviewComment}>{r.comentario}</Text>
                          <Text style={styles.reviewDate}>{r.fecha}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyTabText}>No cuenta con reseñas registradas.</Text>
                    )
                  ) : historialPostulante.length > 0 ? (
                    historialPostulante.map((h) => (
                      <View key={h.id} style={styles.taskCard}>
                        <View style={styles.taskHeader}>
                          <View style={styles.badge}><Text style={styles.badgeText}>{h.categoria}</Text></View>
                          <Text style={styles.taskMonto}>{h.monto}</Text>
                        </View>
                        <Text style={styles.taskTitle}>{h.titulo}</Text>
                        <Text style={styles.taskDate}>{h.fecha}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyTabText}>No registra trabajos previos aún.</Text>
                  )}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* SUB-MODAL: CALIFICACIÓN */}
      <Modal animationType="fade" transparent={true} visible={tareaAFinalizar !== null} onRequestClose={() => setTareaAFinalizar(null)}>
        <Pressable style={styles.subModalOverlay} onPress={() => setTareaAFinalizar(null)}>
          <Pressable style={styles.subModalBox} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Finalizar Tarea</Text>
              <TouchableOpacity onPress={() => setTareaAFinalizar(null)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.reviewModalDesc}>Califica la labor realizada por el trabajador:</Text>
            <View style={styles.starSelectRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} activeOpacity={0.7} onPress={() => setEstrellasCalificacion(star)}>
                  <Ionicons name={star <= estrellasCalificacion ? "star" : "star-outline"} size={32} color="#eab308" />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.reviewInputBox}>
              <TextInput
                style={styles.reviewInputField}
                placeholder="Escribe tu reseña..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={comentarioCalificacion}
                onChangeText={setComentarioCalificacion}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity style={styles.btnConfirmarFinalizacion} activeOpacity={0.85} onPress={handleConfirmarFinalizacion} disabled={guardandoFinalizacion}>
              {guardandoFinalizacion ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={18} color="#ffffff" />
                  <Text style={styles.btnConfirmarFinalizacionText}>Confirmar y Calificar</Text>
                </>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL 4: EDICIÓN DE PERFIL */}
      <Modal animationType="slide" transparent={true} visible={modalEditarVisible} onRequestClose={() => setModalEditarVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalOverlay} onPress={() => setModalEditarVisible(false)}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHeader}>
                <View style={styles.sheetTitleRow}>
                  <Ionicons name="pencil" size={18} color={colors.accentBlue} />
                  <Text style={styles.sheetTitle}>Editar Perfil</Text>
                </View>
                <TouchableOpacity onPress={() => setModalEditarVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.editAvatarSection}>
                  <TouchableOpacity activeOpacity={0.8} style={styles.editAvatarWrap} onPress={handlePickFoto}>
                    {tempAvatarUri ? (
                      <Image source={{ uri: tempAvatarUri }} style={styles.editAvatarImage} />
                    ) : (
                      <Ionicons name="person" size={40} color={colors.textMuted} />
                    )}
                    <View style={styles.cameraIconBadge}><Ionicons name="camera" size={14} color="#ffffff" /></View>
                  </TouchableOpacity>
                  <Text style={styles.editAvatarHint}>Toca para cambiar foto</Text>
                </View>

                <Text style={styles.inputLabel}>Nombre completo</Text>
                <View style={styles.inputBox}>
                  <TextInput style={styles.inputField} value={tempNombre} onChangeText={setTempNombre} placeholder="Tu nombre" placeholderTextColor={colors.textMuted} />
                </View>

                <Text style={styles.inputLabel}>Ubicación (Comuna)</Text>
                <TouchableOpacity style={styles.dropdownSelectorBtn} activeOpacity={0.8} onPress={() => setModalComunasVisible(true)}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="location-outline" size={18} color={colors.accentBlue} />
                    <Text style={styles.dropdownSelectorText}>{tempComunaNombre}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                <Text style={styles.inputLabel}>Sobre mí</Text>
                <View style={[styles.inputBox, styles.inputBoxArea]}>
                  <TextInput style={[styles.inputField, styles.inputFieldArea]} multiline numberOfLines={4} value={tempSobreMi} onChangeText={setTempSobreMi} placeholder="Describe tus habilidades..." placeholderTextColor={colors.textMuted} textAlignVertical="top" />
                </View>

                <View style={styles.editButtonsRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalEditarVisible(false)}><Text style={styles.cancelBtnText}>Cancelar</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleGuardarPerfil} disabled={guardandoCambios}>
                    {guardandoCambios ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* SUB-MODAL COMUNAS */}
      <Modal animationType="fade" transparent={true} visible={modalComunasVisible} onRequestClose={() => setModalComunasVisible(false)}>
        <Pressable style={styles.subModalOverlay} onPress={() => setModalComunasVisible(false)}>
          <Pressable style={styles.dropdownModalBox} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Selecciona tu Comuna</Text>
              <TouchableOpacity onPress={() => setModalComunasVisible(false)}><Ionicons name="close" size={22} color={colors.textPrimary} /></TouchableOpacity>
            </View>
            <FlatList
              data={comunasDisponibles}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.comunaItem, tempComunaId === item.id && styles.comunaItemActive]}
                  onPress={() => {
                    setTempComunaId(item.id);
                    setTempComunaNombre(item.nombre);
                    setModalComunasVisible(false);
                  }}
                >
                  <Text style={[styles.comunaItemText, tempComunaId === item.id && styles.comunaItemTextActive]}>{item.nombre}</Text>
                  {tempComunaId === item.id && <Ionicons name="checkmark" size={18} color={colors.accentBlue} />}
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL 5: CRÉDITOS */}
      <Modal animationType="slide" transparent={true} visible={modalVisible === "creditos"} onRequestClose={() => setModalVisible("ninguno")}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible("ninguno")}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleRow}>
                <Ionicons name="sparkles" size={20} color="#eab308" />
                <Text style={styles.sheetTitle}>Tus Créditos</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible("ninguno")}><Ionicons name="close" size={24} color={colors.textPrimary} /></TouchableOpacity>
            </View>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Saldo disponible</Text>
              <Text style={styles.balanceNumber}>{perfil.creditos} créditos</Text>
              <Text style={styles.balanceSubtext}>Usa créditos para destacar tus ofertas en la comunidad.</Text>
            </View>
            {PAQUETES_CREDITOS.map((pack) => (
              <TouchableOpacity
                key={pack.id}
                activeOpacity={0.8}
                style={[styles.packageCard, pack.destacado && styles.packageCardPopular]}
                onPress={() => {
                  setPerfil((prev) => ({ ...prev, creditos: prev.creditos + pack.creditos }));
                  setModalVisible("ninguno");
                  Alert.alert("¡Compra simulada!", `Añadiste ${pack.creditos} créditos.`);
                }}
              >
                <View style={styles.packageInfo}>
                  <View style={styles.packageCreditsRow}>
                    <Ionicons name="flash" size={16} color="#eab308" />
                    <Text style={styles.packageCredits}>{pack.creditos} Créditos</Text>
                  </View>
                  <Text style={styles.packageDesc}>{pack.desc}</Text>
                </View>
                <View style={styles.buyButtonWrap}><Text style={styles.packagePrice}>{pack.precio}</Text></View>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}