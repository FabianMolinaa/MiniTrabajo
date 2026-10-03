import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors } from "../theme/colors";
import { supabase } from "../services/supabase";
import { styles } from "../styles/PerfilStyles";

interface ResenaItem {
  id: string;
  autor: string;
  calificacion: number;
  fecha: string;
  comentario: string;
}

interface MiPublicacion {
  id: string;
  titulo: string;
  categoria: string;
  monto: string;
  fecha: string;
  estado: "disponible" | "aceptado" | "completado";
  imagenes?: string[];
}

interface TrabajoRealizadoItem {
  id: string;
  titulo: string;
  categoria: string;
  monto: string;
  fecha: string;
}

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
  const [creditosActuales, setCreditosActuales] = useState(10);
  const [calificacion, setCalificacion] = useState("0.0");
  const [totalResenas, setTotalResenas] = useState(0);
  const [trabajosRealizados, setTrabajosRealizados] = useState(0);

  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("Cargando...");
  const [correo, setCorreo] = useState("");
  const [comunaNombre, setComunaNombre] = useState("Santiago Centro");
  const [comunaId, setComunaId] = useState<number>(1);
  const [sobreMi, setSobreMi] = useState("Sin descripción aún.");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);

  // Listas de datos
  const [misPublicaciones, setMisPublicaciones] = useState<MiPublicacion[]>([]);
  const [resenasRecibidas, setResenasRecibidas] = useState<ResenaItem[]>([]);
  const [historialTrabajosHechos, setHistorialTrabajosHechos] = useState<TrabajoRealizadoItem[]>([]);
  const [comunasDisponibles, setComunasDisponibles] = useState<ComunaItem[]>([]);

  // Estados de modales
  const [tabPublicaciones, setTabPublicaciones] = useState<"activas" | "completadas">("activas");
  const [modalVisible, setModalVisible] = useState<
    "ninguno" | "resenas" | "historial" | "publicaciones" | "creditos"
  >("ninguno");

  // Edición del perfil
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [modalComunasVisible, setModalComunasVisible] = useState(false);
  const [guardandoCambios, setGuardandoCambios] = useState(false);
  const [tempNombre, setTempNombre] = useState("");
  const [tempSobreMi, setTempSobreMi] = useState("");
  const [tempAvatarUri, setTempAvatarUri] = useState<string | null>(null);
  const [tempComunaId, setTempComunaId] = useState<number>(1);
  const [tempComunaNombre, setTempComunaNombre] = useState("Santiago Centro");

  // Cargar lista oficial de comunas desde Supabase
  const cargarComunas = async () => {
    const { data, error } = await supabase
      .from("comunas")
      .select("id, nombre")
      .order("nombre", { ascending: true });

    if (!error && data) {
      setComunasDisponibles(data);
    }
  };

  const cargarPerfil = async () => {
    try {
      setCargandoPerfil(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUsuarioId(user.id);
      setCorreo(user.email || "");

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
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setNombre(data.nombre || "Usuario");
        setSobreMi(data.sobre_mi || "Sin descripción aún.");
        setAvatarUrl(data.avatar_url || null);
        setCalificacion(data.calificacion ? Number(data.calificacion).toFixed(1) : "0.0");
        setTotalResenas(data.total_resenas || 0);
        setTrabajosRealizados(data.trabajos_realizados || 0);
        setCreditosActuales(data.creditos || 0);

        if (data.comunas && typeof data.comunas === "object") {
          // @ts-ignore
          setComunaNombre(data.comunas.nombre || "Santiago Centro");
          // @ts-ignore
          setComunaId(data.comunas.id || 1);
        }
      }

      await cargarPublicaciones(user.id);
      await cargarResenas(user.id);
      await cargarHistorialTrabajosHechos(user.id);
    } catch (e) {
      console.log("Error al cargar perfil:", e);
    } finally {
      setCargandoPerfil(false);
    }
  };

  const cargarPublicaciones = async (uid: string) => {
    const { data, error } = await supabase
      .from("trabajos")
      .select(`
        id,
        titulo,
        monto,
        estado,
        imagenes,
        created_at,
        categorias ( nombre )
      `)
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const mapeadas: MiPublicacion[] = data.map((t: any) => ({
        id: t.id,
        titulo: t.titulo,
        categoria: t.categorias?.nombre || "General",
        monto: `$${Number(t.monto).toLocaleString("es-CL")}`,
        fecha: new Date(t.created_at).toLocaleDateString("es-CL"),
        estado: t.estado,
        imagenes: t.imagenes || [],
      }));
      setMisPublicaciones(mapeadas);
    }
  };

  const cargarResenas = async (uid: string) => {
    const { data, error } = await supabase
      .from("resenas")
      .select(`
        id,
        calificacion,
        comentario,
        created_at,
        perfiles!resenas_autor_id_fkey ( nombre )
      `)
      .eq("evaluado_id", uid)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const res: ResenaItem[] = data.map((r: any) => ({
        id: r.id,
        autor: r.perfiles?.nombre || "Usuario",
        calificacion: r.calificacion,
        comentario: r.comentario,
        fecha: new Date(r.created_at).toLocaleDateString("es-CL"),
      }));
      setResenasRecibidas(res);
    }
  };

  const cargarHistorialTrabajosHechos = async (uid: string) => {
    const { data, error } = await supabase
      .from("trabajos")
      .select(`
        id,
        titulo,
        monto,
        created_at,
        categorias ( nombre )
      `)
      .eq("trabajador_id", uid)
      .eq("estado", "completado")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const mapeados: TrabajoRealizadoItem[] = data.map((t: any) => ({
        id: t.id,
        titulo: t.titulo,
        categoria: t.categorias?.nombre || "General",
        monto: `$${Number(t.monto).toLocaleString("es-CL")}`,
        fecha: new Date(t.created_at).toLocaleDateString("es-CL"),
      }));
      setHistorialTrabajosHechos(mapeados);
    }
  };

  useEffect(() => {
    cargarPerfil();
    cargarComunas();
  }, []);

  const handleAbrirEditar = () => {
    setTempNombre(nombre);
    setTempSobreMi(sobreMi === "Sin descripción aún." ? "" : sobreMi);
    setTempAvatarUri(avatarUrl);
    setTempComunaId(comunaId);
    setTempComunaNombre(comunaNombre);
    setModalEditarVisible(true);
  };

  const handleSeleccionarFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso denegado", "Se requiere acceso a la galería para cambiar tu foto.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      setTempAvatarUri(result.assets[0].uri);
    }
  };

  const handleGuardarPerfil = async () => {
    if (!tempNombre.trim()) {
      Alert.alert("Atención", "El nombre no puede estar vacío.");
      return;
    }
    if (!usuarioId) return;

    setGuardandoCambios(true);
    try {
      const { error } = await supabase
        .from("perfiles")
        .update({
          nombre: tempNombre.trim(),
          sobre_mi: tempSobreMi.trim(),
          avatar_url: tempAvatarUri,
          comuna_id: tempComunaId,
        })
        .eq("id", usuarioId);

      if (error) throw error;

      setNombre(tempNombre.trim());
      setSobreMi(tempSobreMi.trim() || "Sin descripción aún.");
      setAvatarUrl(tempAvatarUri);
      setComunaId(tempComunaId);
      setComunaNombre(tempComunaNombre);
      setModalEditarVisible(false);
      Alert.alert("¡Éxito!", "Perfil y ubicación actualizados correctamente.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "No se pudieron guardar los cambios.");
    } finally {
      setGuardandoCambios(false);
    }
  };

  const handleCerrarSesion = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Error", error.message);
  };

  const handleComprarPaquete = (pack: (typeof PAQUETES_CREDITOS)[0]) => {
    const nuevoTotal = creditosActuales + pack.creditos;
    setCreditosActuales(nuevoTotal);
    setModalVisible("ninguno");
    Alert.alert("¡Compra simulada!", `Añadiste ${pack.creditos} créditos.`);
  };

  const publicacionesActivas = misPublicaciones.filter((p) => p.estado !== "completado");
  const publicacionesCompletadas = misPublicaciones.filter((p) => p.estado === "completado");

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.userCard}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.creditsPillTop}
            onPress={() => setModalVisible("creditos")}
          >
            <Ionicons name="sparkles" size={13} color="#eab308" />
            <Text style={styles.creditsPillText}>{creditosActuales} créditos</Text>
          </TouchableOpacity>

          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
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
                <Text style={styles.userName}>{nombre}</Text>
                <TouchableOpacity activeOpacity={0.7} style={styles.editNameButton} onPress={handleAbrirEditar}>
                  <Ionicons name="pencil" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={styles.userEmail}>{correo}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={13} color={colors.textSecondary} />
            <Text style={styles.locationText}>{comunaNombre}</Text>
          </View>
        </View>

        {/* MÉTRICAS TÁCTILES */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statBox} activeOpacity={0.7} onPress={() => setModalVisible("resenas")}>
            <View style={styles.ratingRow}>
              <Ionicons
                name="star"
                size={16}
                color={Number(calificacion) > 0 ? "#eab308" : colors.textMuted}
              />
              <Text style={styles.statValue}>
                {Number(calificacion) > 0 ? calificacion : "Nuevo"}
              </Text>
            </View>
            <Text style={styles.statLabel}>{totalResenas} reseñas</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.textMuted} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statBox, styles.statBorderHorizontal]}
            activeOpacity={0.7}
            onPress={() => setModalVisible("historial")}
          >
            <Text style={styles.statValue}>{trabajosRealizados}</Text>
            <Text style={styles.statLabel}>Trabajos hechos</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.textMuted} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statBox}
            activeOpacity={0.7}
            onPress={() => setModalVisible("publicaciones")}
          >
            <Text style={[styles.statValue, { color: colors.accentBlue }]}>{misPublicaciones.length}</Text>
            <Text style={styles.statLabel}>Publicaciones</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.textMuted} style={styles.statChevron} />
          </TouchableOpacity>
        </View>

        <View style={styles.aboutCard}>
          <View style={styles.aboutHeader}>
            <Ionicons name="information-circle-outline" size={16} color={colors.accentBlue} />
            <Text style={styles.aboutTitle}>Sobre mí</Text>
          </View>
          <Text style={styles.aboutText}>{sobreMi}</Text>
        </View>

        <TouchableOpacity activeOpacity={0.8} style={styles.logoutButton} onPress={handleCerrarSesion}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL: EDITAR PERFIL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalEditarVisible}
        onRequestClose={() => setModalEditarVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
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
                {/* Selector de Foto */}
                <View style={styles.editAvatarSection}>
                  <TouchableOpacity activeOpacity={0.8} style={styles.editAvatarWrap} onPress={handleSeleccionarFoto}>
                    {tempAvatarUri ? (
                      <Image source={{ uri: tempAvatarUri }} style={styles.editAvatarImage} />
                    ) : (
                      <Ionicons name="person" size={40} color={colors.textMuted} />
                    )}
                    <View style={styles.cameraIconBadge}>
                      <Ionicons name="camera" size={14} color="#ffffff" />
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.editAvatarHint}>Toca para cambiar tu foto</Text>
                </View>

                {/* Nombre */}
                <Text style={styles.inputLabel}>Nombre completo</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.inputField}
                    value={tempNombre}
                    onChangeText={setTempNombre}
                    placeholder="Tu nombre"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                {/* Ubicación General Normalizada (Comuna) */}
                <Text style={styles.inputLabel}>Ubicación general (Comuna)</Text>
                <TouchableOpacity
                  style={styles.dropdownSelectorBtn}
                  activeOpacity={0.8}
                  onPress={() => setModalComunasVisible(true)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="location-outline" size={18} color={colors.accentBlue} />
                    <Text style={styles.dropdownSelectorText}>{tempComunaNombre}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Descripción / Sobre Mí */}
                <Text style={styles.inputLabel}>Descripción (Sobre mí)</Text>
                <View style={[styles.inputBox, styles.inputBoxArea]}>
                  <TextInput
                    style={[styles.inputField, styles.inputFieldArea]}
                    multiline
                    numberOfLines={4}
                    value={tempSobreMi}
                    onChangeText={setTempSobreMi}
                    placeholder="Cuéntale a la comunidad tus habilidades y herramientas..."
                    placeholderTextColor={colors.textMuted}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.editButtonsRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalEditarVisible(false)}>
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.saveBtn} onPress={handleGuardarPerfil} disabled={guardandoCambios}>
                    {guardandoCambios ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.saveBtnText}>Guardar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* SUB-MODAL SELECTOR DE COMUNA (NORMALIZADO) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalComunasVisible}
        onRequestClose={() => setModalComunasVisible(false)}
      >
        <Pressable style={styles.subModalOverlay} onPress={() => setModalComunasVisible(false)}>
          <Pressable style={styles.dropdownModalBox} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Selecciona tu Comuna</Text>
              <TouchableOpacity onPress={() => setModalComunasVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={comunasDisponibles}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = tempComunaId === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.comunaItem, isSelected && styles.comunaItemActive]}
                    onPress={() => {
                      setTempComunaId(item.id);
                      setTempComunaNombre(item.nombre);
                      setModalComunasVisible(false);
                    }}
                  >
                    <Text style={[styles.comunaItemText, isSelected && styles.comunaItemTextActive]}>
                      {item.nombre}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color={colors.accentBlue} />}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL: RESEÑAS */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible === "resenas"}
        onRequestClose={() => setModalVisible("ninguno")}
      >
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

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
              {resenasRecibidas.length === 0 ? (
                <Text style={styles.emptyTabText}>Aún no has recibido reseñas en tus trabajos.</Text>
              ) : (
                resenasRecibidas.map((resena) => (
                  <View key={resena.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewAuthor}>{resena.autor}</Text>
                      <View style={styles.starsRow}>
                        {[...Array(resena.calificacion)].map((_, i) => (
                          <Ionicons key={i} name="star" size={13} color="#eab308" />
                        ))}
                      </View>
                    </View>
                    <Text style={styles.reviewComment}>{resena.comentario}</Text>
                    <Text style={styles.reviewDate}>{resena.fecha}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL: HISTORIAL DE TRABAJOS HECHOS */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible === "historial"}
        onRequestClose={() => setModalVisible("ninguno")}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible("ninguno")}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleRow}>
                <Ionicons name="briefcase" size={18} color={colors.accentBlue} />
                <Text style={styles.sheetTitle}>Trabajos Completados ({historialTrabajosHechos.length})</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible("ninguno")}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
              {historialTrabajosHechos.length === 0 ? (
                <View style={styles.emptyApplicantsBox}>
                  <Ionicons name="hammer-outline" size={36} color={colors.textMuted} />
                  <Text style={styles.emptyApplicantsTitle}>Aún no has completado trabajos</Text>
                  <Text style={styles.emptyTabText}>
                    Postula a tareas en el muro principal y cuando el solicitante marque la labor como finalizada, figurará aquí.
                  </Text>
                </View>
              ) : (
                historialTrabajosHechos.map((item) => (
                  <View key={item.id} style={styles.taskCard}>
                    <View style={styles.taskHeader}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.categoria}</Text>
                      </View>
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

      {/* MODAL: MIS PUBLICACIONES */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible === "publicaciones"}
        onRequestClose={() => setModalVisible("ninguno")}
      >
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
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.pubTabButton}
                onPress={() => setTabPublicaciones("activas")}
              >
                <Text style={[styles.pubTabText, tabPublicaciones === "activas" && styles.pubTabTextActive]}>
                  Activas ({publicacionesActivas.length})
                </Text>
                {tabPublicaciones === "activas" && <View style={styles.pubActiveIndicator} />}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.pubTabButton}
                onPress={() => setTabPublicaciones("completadas")}
              >
                <Text style={[styles.pubTabText, tabPublicaciones === "completadas" && styles.pubTabTextActive]}>
                  Completadas ({publicacionesCompletadas.length})
                </Text>
                {tabPublicaciones === "completadas" && <View style={styles.pubActiveIndicator} />}
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
              {(tabPublicaciones === "activas" ? publicacionesActivas : publicacionesCompletadas).length === 0 ? (
                <View style={styles.emptyApplicantsBox}>
                  <Ionicons name="file-tray-outline" size={36} color={colors.textMuted} />
                  <Text style={styles.emptyApplicantsTitle}>No hay publicaciones en esta sección</Text>
                </View>
              ) : (
                (tabPublicaciones === "activas" ? publicacionesActivas : publicacionesCompletadas).map((tarea) => (
                  <View key={tarea.id} style={styles.taskCard}>
                    <View style={styles.taskHeader}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{tarea.categoria}</Text>
                      </View>
                      <Text style={styles.taskMonto}>{tarea.monto}</Text>
                    </View>
                    <Text style={styles.taskTitle}>{tarea.titulo}</Text>
                    <View style={styles.taskFooter}>
                      <Text style={styles.taskDate}>{tarea.fecha}</Text>
                      <View style={tarea.estado === "completado" ? styles.badgeCompletedTag : styles.badgeAcceptedTag}>
                        <Text style={tarea.estado === "completado" ? styles.badgeCompletedText : styles.badgeAcceptedText}>
                          {tarea.estado.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL: COMPRA DE CRÉDITOS */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible === "creditos"}
        onRequestClose={() => setModalVisible("ninguno")}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible("ninguno")}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleRow}>
                <Ionicons name="sparkles" size={20} color="#eab308" />
                <Text style={styles.sheetTitle}>Tus Créditos</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible("ninguno")}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Saldo disponible</Text>
              <Text style={styles.balanceNumber}>{creditosActuales} créditos</Text>
              <Text style={styles.balanceSubtext}>
                Usa tus créditos para destacar publicaciones en el inicio y aparecer con prioridad en el mapa.
              </Text>
            </View>

            {PAQUETES_CREDITOS.map((pack) => (
              <TouchableOpacity
                key={pack.id}
                activeOpacity={0.8}
                style={[styles.packageCard, pack.destacado && styles.packageCardPopular]}
                onPress={() => handleComprarPaquete(pack)}
              >
                <View style={styles.packageInfo}>
                  <View style={styles.packageCreditsRow}>
                    <Ionicons name="flash" size={16} color="#eab308" />
                    <Text style={styles.packageCredits}>{pack.creditos} Créditos</Text>
                  </View>
                  <Text style={styles.packageDesc}>{pack.desc}</Text>
                </View>
                <View style={styles.buyButtonWrap}>
                  <Text style={styles.packagePrice}>{pack.precio}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}