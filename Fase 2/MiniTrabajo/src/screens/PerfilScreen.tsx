import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Alert,
  Linking,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

interface Resena {
  id: string;
  autor: string;
  calificacion: number;
  fecha: string;
  comentario: string;
}

interface TrabajoHistorial {
  id: string;
  titulo: string;
  categoria: string;
  fecha: string;
  monto: string;
}

interface Postulante {
  id: string;
  nombre: string;
  calificacion: string;
  trabajosHechos: number;
  telefono: string;
  mensaje: string;
  estado: "pendiente" | "aceptado" | "rechazado";
  comuna?: string;
  sobreMi?: string;
  resenas?: Resena[];
  historial?: TrabajoHistorial[];
}

interface MiPublicacion {
  id: string;
  titulo: string;
  categoria: string;
  monto: string;
  fecha: string;
  estado: "abierta" | "en_progreso" | "completada";
  postulantes: Postulante[];
  imagenes?: string[];
}

const USUARIO_MOCK = {
  nombre: "Carlos Mendoza",
  correo: "carlos.mendoza@email.cl",
  comuna: "Santiago Centro",
  calificacion: "4.9",
  totalResenas: 28,
  trabajosRealizados: 34,
  creditos: 10,
  verificado: true,
  sobreMi:
    "Especialista en armado y reparación de muebles de hogar. Cuento con herramientas propias y disponibilidad tardes y fines de semana.",
};

const PAQUETES_CREDITOS = [
  { id: "1", creditos: 10, precio: "$2.990", destacado: false, desc: "Ideal para destacar 2 publicaciones" },
  { id: "2", creditos: 25, precio: "$5.990", destacado: true, desc: "El más popular (ahorras 20%)" },
  { id: "3", creditos: 50, precio: "$9.990", destacado: false, desc: "Para usuarios frecuentes" },
];

const HISTORIAL_TRABAJOS: TrabajoHistorial[] = [
  { id: "t1", titulo: "Armado de clóset 4 puertas", categoria: "Hogar", fecha: "12 Sep 2026", monto: "$22.000" },
  { id: "t2", titulo: 'Instalación de soporte TV 65"', categoria: "Hogar", fecha: "05 Sep 2026", monto: "$15.000" },
];

const RESENAS_RECIBIDAS: Resena[] = [
  {
    id: "r1",
    autor: "Valeria G.",
    calificacion: 5,
    fecha: "Hace 4 días",
    comentario: "Llegó puntual, trajo herramientas y armó el mueble rapidísimo. Muy recomendado.",
  },
  {
    id: "r2",
    autor: "Matías P.",
    calificacion: 5,
    fecha: "Hace 2 semanas",
    comentario: "Excelente trato y disposición para la tarea. Todo en orden con el pago acordado.",
  },
];

const MIS_PUBLICACIONES_INICIALES: MiPublicacion[] = [
  {
    id: "pub1",
    titulo: "Armado de mueble dormitorio",
    categoria: "Hogar",
    monto: "$15.000",
    fecha: "Hoy, 14:30",
    estado: "abierta",
    imagenes: [
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600",
    ],
    postulantes: [
      {
        id: "p1",
        nombre: "Matías Pinto",
        calificacion: "4.8",
        trabajosHechos: 19,
        telefono: "56911223344",
        mensaje: "Tengo atornillador eléctrico propio y vivo cerca. Puedo ir hoy mismo.",
        estado: "pendiente",
        comuna: "Santiago Centro",
        sobreMi: "Técnico en carpintería básica y armado de muebles de retail. Responsable y puntual.",
        resenas: [
          { id: "mp1", autor: "Lorena V.", calificacion: 5, fecha: "Ayer", comentario: "Excelente servicio, dejó el mueble impecable." },
          { id: "mp2", autor: "Felipe T.", calificacion: 5, fecha: "Hace 1 semana", comentario: "Trajo sus herramientas y terminó muy rápido." },
        ],
        historial: [
          { id: "h1", titulo: "Ensamble de rack TV", categoria: "Hogar", fecha: "10 Sep 2026", monto: "$12.000" },
          { id: "h2", titulo: "Reparación de bisagras", categoria: "Hogar", fecha: "02 Sep 2026", monto: "$8.000" },
        ],
      },
      {
        id: "p2",
        nombre: "Andrés Vera",
        calificacion: "4.5",
        trabajosHechos: 8,
        telefono: "56955667788",
        mensaje: "Tengo experiencia armando muebles de retail. Cuento con herramientas.",
        estado: "pendiente",
        comuna: "Providencia",
        sobreMi: "Estudiante universitario con experiencia en ensambles y arreglos de hogar.",
        resenas: [
          { id: "av1", autor: "Camila B.", calificacion: 4, fecha: "Hace 3 días", comentario: "Buen trabajo, muy amable y ordenado." },
        ],
        historial: [
          { id: "h3", titulo: "Armado de estante modular", categoria: "Hogar", fecha: "08 Sep 2026", monto: "$10.000" },
        ],
      },
    ],
  },
  {
    id: "pub2",
    titulo: "Paseo de perro (Pastor Alemán)",
    categoria: "Mascotas",
    monto: "$8.000",
    fecha: "Ayer",
    estado: "abierta",
    imagenes: [
      "https://images.unsplash.com/photo-1589941013453-ec89f33b5455?w=600",
    ],
    postulantes: [],
  },
  {
    id: "pub3",
    titulo: "Instalación de cortinas roller",
    categoria: "Hogar",
    monto: "$12.000",
    fecha: "10 Sep 2026",
    estado: "completada",
    imagenes: [],
    postulantes: [
      {
        id: "p3",
        nombre: "Esteban Morales",
        calificacion: "5.0",
        trabajosHechos: 14,
        telefono: "56944332211",
        mensaje: "Tengo taladro percutor y tarugos especiales.",
        estado: "aceptado",
      },
    ],
  },
];

export default function PerfilScreen() {
  const [creditosActuales, setCreditosActuales] = useState(10);
  const [misPublicaciones, setMisPublicaciones] = useState<MiPublicacion[]>(MIS_PUBLICACIONES_INICIALES);

  const [modalVisible, setModalVisible] = useState<
    "ninguno" | "resenas" | "historial" | "publicaciones" | "creditos"
  >("ninguno");
  const [tareaPostulantes, setTareaPostulantes] = useState<MiPublicacion | null>(null);
  const [tabPublicaciones, setTabPublicaciones] = useState<"activas" | "completadas">("activas");

  const [postulanteSeleccionado, setPostulanteSeleccionado] = useState<Postulante | null>(null);
  const [tabPostulante, setTabPostulante] = useState<"resenas" | "historial">("resenas");

  const [tareaAFinalizar, setTareaAFinalizar] = useState<MiPublicacion | null>(null);
  const [estrellasCalificacion, setEstrellasCalificacion] = useState(5);
  const [comentarioCalificacion, setComentarioCalificacion] = useState("");

  const handleEditarPerfil = () => {
    Alert.alert("Editar Perfil", "Próximamente: formulario para actualizar foto, datos y biografía.");
  };

  const handleComprarPaquete = (pack: (typeof PAQUETES_CREDITOS)[0]) => {
    const nuevoTotal = creditosActuales + pack.creditos;
    setCreditosActuales(nuevoTotal);
    setModalVisible("ninguno");
    Alert.alert("¡Compra simulada!", `Añadiste ${pack.creditos} créditos. Tu nuevo saldo es ${nuevoTotal}.`);
  };

  const handleAceptarPostulante = (tareaId: string, postulanteId: string) => {
    setMisPublicaciones((prev) =>
      prev.map((t) =>
        t.id !== tareaId
          ? t
          : {
              ...t,
              estado: "en_progreso",
              postulantes: t.postulantes.map((p) =>
                p.id === postulanteId
                  ? { ...p, estado: "aceptado" as const }
                  : { ...p, estado: "rechazado" as const }
              ),
            }
      )
    );

    if (tareaPostulantes && tareaPostulantes.id === tareaId) {
      setTareaPostulantes({
        ...tareaPostulantes,
        estado: "en_progreso",
        postulantes: tareaPostulantes.postulantes.map((p) =>
          p.id === postulanteId ? { ...p, estado: "aceptado" } : { ...p, estado: "rechazado" }
        ),
      });
    }

    if (postulanteSeleccionado && postulanteSeleccionado.id === postulanteId) {
      setPostulanteSeleccionado({
        ...postulanteSeleccionado,
        estado: "aceptado",
      });
    }

    Alert.alert("¡Postulante Aceptado!", "La tarea ahora está en progreso. Ya puedes coordinar por WhatsApp.");
  };

  const handleRechazarPostulante = (tareaId: string, postulanteId: string) => {
    const actualizar = (list: MiPublicacion[]) =>
      list.map((t) =>
        t.id !== tareaId
          ? t
          : {
              ...t,
              postulantes: t.postulantes.map((p) =>
                p.id === postulanteId ? { ...p, estado: "rechazado" as const } : p
              ),
            }
      );

    setMisPublicaciones(actualizar);
    if (tareaPostulantes && tareaPostulantes.id === tareaId) {
      setTareaPostulantes({
        ...tareaPostulantes,
        postulantes: tareaPostulantes.postulantes.map((p) =>
          p.id === postulanteId ? { ...p, estado: "rechazado" } : p
        ),
      });
    }

    if (postulanteSeleccionado && postulanteSeleccionado.id === postulanteId) {
      setPostulanteSeleccionado(null);
    }
  };

  // 1. Cancelar asignación actual (revierte la tarea a abierta)
  const handleCancelarAcuerdo = (tareaId: string) => {
    Alert.alert(
      "Cancelar asignación",
      "¿Seguro que deseas cancelar el acuerdo con este trabajador? La tarea volverá a quedar abierta para nuevos postulantes.",
      [
        { text: "No, volver", style: "cancel" },
        {
          text: "Sí, cancelar",
          style: "destructive",
          onPress: () => {
            setMisPublicaciones((prev) =>
              prev.map((t) =>
                t.id !== tareaId
                  ? t
                  : {
                      ...t,
                      estado: "abierta",
                      postulantes: t.postulantes.map((p) =>
                        p.estado === "aceptado" ? { ...p, estado: "pendiente" as const } : p
                      ),
                    }
              )
            );
            setTareaPostulantes(null);
            Alert.alert("Asignación cancelada", "Tu tarea vuelve a estar abierta a postulaciones.");
          },
        },
      ]
    );
  };

  // 2. Cancelar/Eliminar publicación completa
  const handleEliminarPublicacion = (tareaId: string) => {
    Alert.alert(
      "Eliminar publicación",
      "¿Deseas dar de baja esta publicación? Se removerá de la lista de trabajos activos.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            setMisPublicaciones((prev) => prev.filter((t) => t.id !== tareaId));
            setTareaPostulantes(null);
            Alert.alert("Publicación eliminada", "La tarea ha sido cancelada.");
          },
        },
      ]
    );
  };

  const handleAbrirWhatsApp = (postulante: Postulante, tituloTarea: string) => {
    const mensaje = encodeURIComponent(
      `¡Hola ${postulante.nombre}! Acepté tu postulación para "${tituloTarea}". Te escribo para coordinar los detalles.`
    );
    const url = `https://wa.me/${postulante.telefono}?text=${mensaje}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "No se pudo abrir WhatsApp en tu dispositivo.");
    });
  };

  const handleConfirmarFinalizacion = () => {
    if (!tareaAFinalizar) return;

    setMisPublicaciones((prev) =>
      prev.map((t) => (t.id === tareaAFinalizar.id ? { ...t, estado: "completada" } : t))
    );

    const trabajadorAceptado = tareaAFinalizar.postulantes.find((p) => p.estado === "aceptado");
    const nombreTrabajador = trabajadorAceptado ? trabajadorAceptado.nombre : "el trabajador";

    setTareaAFinalizar(null);
    setTareaPostulantes(null);
    setComentarioCalificacion("");
    setEstrellasCalificacion(5);

    Alert.alert(
      "¡Tarea finalizada!",
      `Has calificado a ${nombreTrabajador} con ${estrellasCalificacion} estrellas. La reseña fue registrada con éxito.`
    );
  };

  const publicacionesActivas = misPublicaciones.filter(
    (p) => p.estado === "abierta" || p.estado === "en_progreso"
  );
  const publicacionesCompletadas = misPublicaciones.filter((p) => p.estado === "completada");

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* CABECERA PRINCIPAL */}
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
            <Ionicons name="person" size={38} color={colors.textPrimary} />
            {USUARIO_MOCK.verificado && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={18} color={colors.accentBlue} />
              </View>
            )}
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.userName}>{USUARIO_MOCK.nombre}</Text>
            <TouchableOpacity activeOpacity={0.7} style={styles.editNameButton} onPress={handleEditarPerfil}>
              <Ionicons name="pencil" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.userEmail}>{USUARIO_MOCK.correo}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={13} color={colors.textSecondary} />
            <Text style={styles.locationText}>{USUARIO_MOCK.comuna}</Text>
          </View>
        </View>

        {/* TARJETAS TÁCTILES */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statBox} activeOpacity={0.7} onPress={() => setModalVisible("resenas")}>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#eab308" />
              <Text style={styles.statValue}>{USUARIO_MOCK.calificacion}</Text>
            </View>
            <Text style={styles.statLabel}>{USUARIO_MOCK.totalResenas} reseñas</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.textMuted} style={styles.statChevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statBox, styles.statBorderHorizontal]}
            activeOpacity={0.7}
            onPress={() => setModalVisible("historial")}
          >
            <Text style={styles.statValue}>{USUARIO_MOCK.trabajosRealizados}</Text>
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

        {/* SOBRE MÍ */}
        <View style={styles.aboutCard}>
          <View style={styles.aboutHeader}>
            <Ionicons name="information-circle-outline" size={16} color={colors.accentBlue} />
            <Text style={styles.aboutTitle}>Sobre mí</Text>
          </View>
          <Text style={styles.aboutText}>{USUARIO_MOCK.sobreMi}</Text>
        </View>

        {/* CERRAR SESIÓN */}
        <TouchableOpacity activeOpacity={0.8} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>

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
                <Text style={styles.sheetTitle}>Reseñas Recibidas ({RESENAS_RECIBIDAS.length})</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible("ninguno")}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
              {RESENAS_RECIBIDAS.map((resena) => (
                <View key={resena.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewUserRow}>
                      <View style={styles.reviewAvatar}>
                        <Ionicons name="person" size={14} color={colors.textPrimary} />
                      </View>
                      <Text style={styles.reviewAuthor}>{resena.autor}</Text>
                    </View>
                    <View style={styles.starsRow}>
                      {[...Array(resena.calificacion)].map((_, i) => (
                        <Ionicons key={i} name="star" size={13} color="#eab308" />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{resena.comentario}</Text>
                  <Text style={styles.reviewDate}>{resena.fecha}</Text>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL: HISTORIAL */}
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
                <Text style={styles.sheetTitle}>Trabajos Completados ({HISTORIAL_TRABAJOS.length})</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible("ninguno")}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
              {HISTORIAL_TRABAJOS.map((item) => (
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
              ))}
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
                <Text
                  style={[
                    styles.pubTabText,
                    tabPublicaciones === "activas" && styles.pubTabTextActive,
                  ]}
                >
                  Activas ({publicacionesActivas.length})
                </Text>
                {tabPublicaciones === "activas" && <View style={styles.pubActiveIndicator} />}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.pubTabButton}
                onPress={() => setTabPublicaciones("completadas")}
              >
                <Text
                  style={[
                    styles.pubTabText,
                    tabPublicaciones === "completadas" && styles.pubTabTextActive,
                  ]}
                >
                  Completadas ({publicacionesCompletadas.length})
                </Text>
                {tabPublicaciones === "completadas" && <View style={styles.pubActiveIndicator} />}
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
              {(tabPublicaciones === "activas" ? publicacionesActivas : publicacionesCompletadas).length === 0 ? (
                <View style={styles.emptyApplicantsBox}>
                  <Ionicons name="file-tray-outline" size={36} color={colors.textMuted} />
                  <Text style={styles.emptyApplicantsTitle}>
                    No hay publicaciones {tabPublicaciones === "activas" ? "activas" : "completadas"}
                  </Text>
                </View>
              ) : (
                (tabPublicaciones === "activas" ? publicacionesActivas : publicacionesCompletadas).map((tarea) => {
                  const cantidadPendientes = tarea.postulantes.filter((p) => p.estado === "pendiente").length;

                  return (
                    <TouchableOpacity
                      key={tarea.id}
                      activeOpacity={0.8}
                      style={styles.taskCard}
                      onPress={() => setTareaPostulantes(tarea)}
                    >
                      <View style={styles.taskHeader}>
                        <View style={styles.headerLeftRow}>
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{tarea.categoria}</Text>
                          </View>
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

                        {tarea.estado === "completada" ? (
                          <View style={styles.badgeCompletedTag}>
                            <Ionicons name="checkmark-done" size={13} color={colors.textMuted} />
                            <Text style={styles.badgeCompletedText}>Completada</Text>
                          </View>
                        ) : tarea.estado === "en_progreso" ? (
                          <View style={styles.badgeAcceptedTag}>
                            <Ionicons name="play" size={11} color={colors.accentGreen} />
                            <Text style={styles.badgeAcceptedText}>En curso</Text>
                          </View>
                        ) : cantidadPendientes > 0 ? (
                          <View style={styles.badgeApplicantsTag}>
                            <Ionicons name="people" size={13} color={colors.accentBlue} />
                            <Text style={styles.badgeApplicantsText}>
                              {cantidadPendientes} postulante{cantidadPendientes > 1 ? "s" : ""}
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.noApplicantsText}>Sin postulantes</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* SUB-MODAL: REVISAR CANDIDATOS Y GESTIONAR TAREA */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={tareaPostulantes !== null}
        onRequestClose={() => setTareaPostulantes(null)}
      >
        <Pressable style={styles.subModalOverlay} onPress={() => setTareaPostulantes(null)}>
          <Pressable style={styles.subModalBox} onPress={(e) => e.stopPropagation()}>
            {tareaPostulantes && (
              <>
                <View style={styles.sheetHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.sheetSub} numberOfLines={1}>
                      {tareaPostulantes.titulo}
                    </Text>
                    <Text style={styles.sheetTitle}>
                      {tareaPostulantes.estado === "completada"
                        ? "Tarea completada"
                        : tareaPostulantes.estado === "en_progreso"
                        ? "Trabajo en progreso"
                        : "Candidatos"}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setTareaPostulantes(null)}>
                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Miniaturas de fotos si la tarea las tiene */}
                {tareaPostulantes.imagenes && tareaPostulantes.imagenes.length > 0 && (
                  <View style={styles.postulantesImagesContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.miniPhotoRow}>
                      {tareaPostulantes.imagenes.map((uri, idx) => (
                        <View key={idx} style={styles.postulantesThumbWrap}>
                          <Image source={{ uri }} style={styles.postulantesThumb} />
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* BOTONES DE GESTIÓN SEGÚN EL ESTADO */}
                {tareaPostulantes.estado === "en_progreso" && (
                  <View style={styles.managementActionsRow}>
                    <TouchableOpacity
                      style={styles.btnFinalizarTarea}
                      activeOpacity={0.85}
                      onPress={() => setTareaAFinalizar(tareaPostulantes)}
                    >
                      <Ionicons name="checkmark-circle" size={17} color="#ffffff" />
                      <Text style={styles.btnFinalizarTareaText}>Finalizar y Calificar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnCancelarAcuerdo}
                      activeOpacity={0.85}
                      onPress={() => handleCancelarAcuerdo(tareaPostulantes.id)}
                    >
                      <Ionicons name="close-circle-outline" size={17} color="#ef4444" />
                      <Text style={styles.btnCancelarAcuerdoText}>Cancelar acuerdo</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {tareaPostulantes.estado === "abierta" && (
                  <TouchableOpacity
                    style={styles.btnDarDeBajaTarea}
                    activeOpacity={0.85}
                    onPress={() => handleEliminarPublicacion(tareaPostulantes.id)}
                  >
                    <Ionicons name="trash-outline" size={15} color="#ef4444" />
                    <Text style={styles.btnDarDeBajaTareaText}>Dar de baja esta publicación</Text>
                  </TouchableOpacity>
                )}

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
                  {tareaPostulantes.postulantes.length === 0 ? (
                    <View style={styles.emptyApplicantsBox}>
                      <Ionicons name="hourglass-outline" size={36} color={colors.textMuted} />
                      <Text style={styles.emptyApplicantsTitle}>Aún no hay postulantes</Text>
                    </View>
                  ) : (
                    tareaPostulantes.postulantes.map((post) => (
                      <View key={post.id} style={styles.applicantCard}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          style={styles.applicantHeaderTouchable}
                          onPress={() => {
                            setTabPostulante("resenas");
                            setPostulanteSeleccionado(post);
                          }}
                        >
                          <View style={styles.applicantUserRow}>
                            <View style={styles.applicantAvatar}>
                              <Ionicons name="person" size={14} color={colors.textPrimary} />
                            </View>
                            <View>
                              <View style={styles.applicantNameRow}>
                                <Text style={styles.applicantName}>{post.nombre}</Text>
                                <Ionicons name="chevron-forward-circle-outline" size={14} color={colors.accentBlue} />
                              </View>
                              <View style={styles.applicantRatingRow}>
                                <Ionicons name="star" size={11} color="#eab308" />
                                <Text style={styles.applicantRatingText}>{post.calificacion}</Text>
                                <Text style={styles.applicantJobsText}>• {post.trabajosHechos} tareas</Text>
                              </View>
                            </View>
                          </View>
                          {post.estado === "aceptado" && (
                            <View style={styles.badgeAcceptedSmall}>
                              <Text style={styles.badgeAcceptedSmallText}>
                                {tareaPostulantes.estado === "completada" ? "Completó la tarea" : "Asignado"}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>

                        <Text style={styles.applicantMsg}>{post.mensaje}</Text>

                        <View style={styles.applicantActionsRow}>
                          {post.estado === "pendiente" && (
                            <>
                              <TouchableOpacity
                                style={styles.btnReject}
                                activeOpacity={0.8}
                                onPress={() => handleRechazarPostulante(tareaPostulantes.id, post.id)}
                              >
                                <Ionicons name="close" size={15} color="#ef4444" />
                                <Text style={styles.btnRejectText}>Rechazar</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.btnAccept}
                                activeOpacity={0.85}
                                onPress={() => handleAceptarPostulante(tareaPostulantes.id, post.id)}
                              >
                                <Ionicons name="checkmark" size={15} color="#ffffff" />
                                <Text style={styles.btnAcceptText}>Aceptar</Text>
                              </TouchableOpacity>
                            </>
                          )}

                          {post.estado === "aceptado" && (
                            <TouchableOpacity
                              style={styles.btnWhatsAppApplicant}
                              activeOpacity={0.85}
                              onPress={() => handleAbrirWhatsApp(post, tareaPostulantes.titulo)}
                            >
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

      {/* MODAL: PERFIL DEL POSTULANTE CON TABS */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={postulanteSeleccionado !== null}
        onRequestClose={() => setPostulanteSeleccionado(null)}
      >
        <Pressable style={styles.subModalOverlay} onPress={() => setPostulanteSeleccionado(null)}>
          <Pressable style={styles.applicantProfileBox} onPress={(e) => e.stopPropagation()}>
            {postulanteSeleccionado && (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Perfil del Postulante</Text>
                  <TouchableOpacity onPress={() => setPostulanteSeleccionado(null)}>
                    <Ionicons name="close" size={22} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.applicantProfileHeader}>
                  <View style={styles.applicantProfileAvatar}>
                    <Ionicons name="person" size={32} color={colors.textPrimary} />
                  </View>
                  <Text style={styles.applicantProfileName}>{postulanteSeleccionado.nombre}</Text>
                  <Text style={styles.applicantProfileComuna}>{postulanteSeleccionado.comuna || "Santiago"}</Text>
                </View>

                <View style={styles.applicantProfileAboutBox}>
                  <Text style={styles.applicantProfileAboutTitle}>Sobre este postulante</Text>
                  <Text style={styles.applicantProfileAboutText}>
                    {postulanteSeleccionado.sobreMi ||
                      "Usuario activo disponible para realizar pololitos y tareas puntuales."}
                  </Text>
                </View>

                {/* TABS DENTRO DEL POSTULANTE */}
                <View style={styles.miniTabBar}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.miniTabButton}
                    onPress={() => setTabPostulante("resenas")}
                  >
                    <View style={styles.tabHeaderLabel}>
                      <Ionicons
                        name="star"
                        size={14}
                        color={tabPostulante === "resenas" ? "#eab308" : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.miniTabText,
                          tabPostulante === "resenas" && styles.miniTabTextActive,
                        ]}
                      >
                        Reseñas ({postulanteSeleccionado.resenas?.length || 0})
                      </Text>
                    </View>
                    {tabPostulante === "resenas" && <View style={styles.miniActiveIndicator} />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.miniTabButton}
                    onPress={() => setTabPostulante("historial")}
                  >
                    <View style={styles.tabHeaderLabel}>
                      <Ionicons
                        name="briefcase"
                        size={14}
                        color={tabPostulante === "historial" ? colors.accentBlue : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.miniTabText,
                          tabPostulante === "historial" && styles.miniTabTextActive,
                        ]}
                      >
                        Historial ({postulanteSeleccionado.historial?.length || 0})
                      </Text>
                    </View>
                    {tabPostulante === "historial" && <View style={styles.miniActiveIndicator} />}
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.tabScrollBox} showsVerticalScrollIndicator={false}>
                  {tabPostulante === "resenas" ? (
                    postulanteSeleccionado.resenas && postulanteSeleccionado.resenas.length > 0 ? (
                      postulanteSeleccionado.resenas.map((r) => (
                        <View key={r.id} style={styles.miniReviewCard}>
                          <View style={styles.miniReviewHeader}>
                            <Text style={styles.miniReviewAuthor}>{r.autor}</Text>
                            <View style={styles.starsRow}>
                              {[...Array(r.calificacion)].map((_, i) => (
                                <Ionicons key={i} name="star" size={11} color="#eab308" />
                              ))}
                            </View>
                          </View>
                          <Text style={styles.miniReviewComment}>{r.comentario}</Text>
                          <Text style={styles.miniReviewDate}>{r.fecha}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyTabText}>No cuenta con reseñas previas.</Text>
                    )
                  ) : postulanteSeleccionado.historial && postulanteSeleccionado.historial.length > 0 ? (
                    postulanteSeleccionado.historial.map((h) => (
                      <View key={h.id} style={styles.miniHistoryCard}>
                        <View style={styles.miniHistoryHeader}>
                          <Text style={styles.miniHistoryTitle}>{h.titulo}</Text>
                          <Text style={styles.miniHistoryMonto}>{h.monto}</Text>
                        </View>
                        <Text style={styles.miniHistoryDate}>{h.categoria} • {h.fecha}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyTabText}>No registra trabajos previos aún.</Text>
                  )}
                </ScrollView>

                <View style={styles.applicantProfileActionsRow}>
                  {postulanteSeleccionado.estado === "pendiente" && tareaPostulantes && (
                    <TouchableOpacity
                      style={styles.btnAccept}
                      activeOpacity={0.85}
                      onPress={() => handleAceptarPostulante(tareaPostulantes.id, postulanteSeleccionado.id)}
                    >
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                      <Text style={styles.btnAcceptText}>Aceptar para esta tarea</Text>
                    </TouchableOpacity>
                  )}

                  {postulanteSeleccionado.estado === "aceptado" && tareaPostulantes && (
                    <TouchableOpacity
                      style={styles.btnWhatsAppApplicant}
                      activeOpacity={0.85}
                      onPress={() => handleAbrirWhatsApp(postulanteSeleccionado, tareaPostulantes.titulo)}
                    >
                      <Ionicons name="logo-whatsapp" size={16} color="#ffffff" />
                      <Text style={styles.btnWhatsAppApplicantText}>Contactar WhatsApp</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL: CALIFICAR Y FINALIZAR TAREA */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={tareaAFinalizar !== null}
        onRequestClose={() => setTareaAFinalizar(null)}
      >
        <Pressable style={styles.subModalOverlay} onPress={() => setTareaAFinalizar(null)}>
          <Pressable style={styles.subModalBox} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Finalizar Tarea</Text>
              <TouchableOpacity onPress={() => setTareaAFinalizar(null)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.reviewModalDesc}>
              ¿Cómo fue el trabajo de{" "}
              <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>
                {tareaAFinalizar?.postulantes.find((p) => p.estado === "aceptado")?.nombre || "el trabajador"}
              </Text>
              ?
            </Text>

            <View style={styles.starSelectRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  activeOpacity={0.7}
                  onPress={() => setEstrellasCalificacion(star)}
                >
                  <Ionicons
                    name={star <= estrellasCalificacion ? "star" : "star-outline"}
                    size={32}
                    color="#eab308"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.reviewInputBox}>
              <TextInput
                style={styles.reviewInputField}
                placeholder="Escribe un comentario breve sobre su puntualidad y calidad..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={comentarioCalificacion}
                onChangeText={setComentarioCalificacion}
                textAlignVertical="top"
              />
            </View>

            <Text style={styles.reviewModalNotice}>
              * Confirmo que el trabajo fue concluido satisfactoriamente y el pago acordado fue realizado.
            </Text>

            <TouchableOpacity
              style={styles.btnConfirmarFinalizacion}
              activeOpacity={0.85}
              onPress={handleConfirmarFinalizacion}
            >
              <Ionicons name="checkmark-done" size={18} color="#ffffff" />
              <Text style={styles.btnConfirmarFinalizacionText}>Confirmar y Enviar Calificación</Text>
            </TouchableOpacity>
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
                Cada crédito te permite posicionar y destacar tus publicaciones en los primeros lugares.
              </Text>
            </View>

            <Text style={styles.packagesTitle}>Obtener más créditos</Text>

            {PAQUETES_CREDITOS.map((pack) => (
              <TouchableOpacity
                key={pack.id}
                activeOpacity={0.8}
                style={[styles.packageCard, pack.destacado && styles.packageCardPopular]}
                onPress={() => handleComprarPaquete(pack)}
              >
                {pack.destacado && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>MÁS POPULAR</Text>
                  </View>
                )}

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

const styles = StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140 },
  userCard: {
    position: "relative",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  creditsPillTop: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(234, 179, 8, 0.12)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.3)",
  },
  creditsPillText: { color: "#eab308", fontSize: 11, fontWeight: "700" },
  avatarWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    marginTop: 4,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: colors.surface,
    borderRadius: 10,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  userName: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  editNameButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  userEmail: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  locationText: { fontSize: 12, color: colors.textSecondary },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingVertical: 4,
  },
  statBorderHorizontal: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statValue: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  statChevron: { marginTop: 3 },
  aboutCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aboutHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  aboutTitle: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  aboutText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#3f1d24",
  },
  logoutText: { color: "#ef4444", fontSize: 14, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
    maxHeight: "85%",
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  sheetSub: { fontSize: 12, color: colors.textSecondary },

  pubTabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 10,
  },
  pubTabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    position: "relative",
  },
  pubTabText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
  },
  pubTabTextActive: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  pubActiveIndicator: {
    position: "absolute",
    bottom: -1,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: colors.accentBlue,
    borderRadius: 1,
  },

  reviewCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  reviewUserRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  reviewAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAuthor: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  starsRow: { flexDirection: "row", gap: 2 },
  reviewComment: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 4,
  },
  reviewDate: { fontSize: 10, color: colors.textMuted },
  taskCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  headerLeftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    backgroundColor: colors.accentBlueBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { color: colors.accentBlue, fontSize: 11, fontWeight: "600" },
  photosBadgeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photosBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accentBlue,
  },
  taskMonto: { color: colors.accentGreen, fontSize: 14, fontWeight: "700" },
  taskTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  taskFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  taskDate: { fontSize: 11, color: colors.textSecondary },
  badgeAcceptedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeAcceptedText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accentGreen,
  },
  badgeCompletedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeCompletedText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
  },
  badgeApplicantsTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accentBlueBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeApplicantsText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accentBlue,
  },
  noApplicantsText: { fontSize: 11, color: colors.textMuted },
  subModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  subModalBox: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    maxHeight: "75%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  postulantesImagesContainer: {
    marginBottom: 10,
  },
  miniPhotoRow: {
    flexDirection: "row",
  },
  postulantesThumbWrap: {
    width: 64,
    height: 64,
    borderRadius: 10,
    marginRight: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  postulantesThumb: {
    width: "100%",
    height: "100%",
  },

  // Fila de acciones de gestión en progreso
  managementActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  btnFinalizarTarea: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentGreen,
    height: 42,
    borderRadius: 12,
    gap: 6,
  },
  btnFinalizarTareaText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  btnCancelarAcuerdo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceLight,
    height: 42,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: "#7f1d1d",
  },
  btnCancelarAcuerdoText: { color: "#ef4444", fontSize: 12, fontWeight: "600" },

  btnDarDeBajaTarea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceLight,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    marginBottom: 10,
  },
  btnDarDeBajaTareaText: { color: "#ef4444", fontSize: 12, fontWeight: "600" },

  emptyApplicantsBox: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyApplicantsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  applicantCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  applicantHeaderTouchable: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  applicantUserRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  applicantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  applicantNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  applicantName: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  applicantRatingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  applicantRatingText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  applicantJobsText: { fontSize: 11, color: colors.textSecondary },
  badgeAcceptedSmall: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeAcceptedSmallText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accentGreen,
  },
  applicantMsg: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  applicantActionsRow: { flexDirection: "row", gap: 8 },
  btnReject: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  btnRejectText: { fontSize: 12, fontWeight: "600", color: "#ef4444" },
  btnAccept: {
    flex: 1.6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentBlue,
    gap: 4,
  },
  btnAcceptText: { fontSize: 12, fontWeight: "700", color: "#ffffff" },
  btnWhatsAppApplicant: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: 10,
    backgroundColor: "#22c55e",
    gap: 6,
  },
  btnWhatsAppApplicantText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },

  // Modal Postulante
  applicantProfileBox: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: "80%",
  },
  applicantProfileHeader: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 8,
  },
  applicantProfileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  applicantProfileName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  applicantProfileComuna: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  applicantProfileAboutBox: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  applicantProfileAboutTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 3,
  },
  applicantProfileAboutText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  // Mini Tabs Postulante
  miniTabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 8,
  },
  miniTabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    position: "relative",
  },
  tabHeaderLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  miniTabText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
  },
  miniTabTextActive: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  miniActiveIndicator: {
    position: "absolute",
    bottom: -1,
    left: 14,
    right: 14,
    height: 2,
    backgroundColor: colors.accentBlue,
    borderRadius: 1,
  },
  tabScrollBox: {
    maxHeight: 140,
    marginBottom: 10,
  },
  miniReviewCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniReviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  miniReviewAuthor: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  miniReviewComment: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  miniReviewDate: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  miniHistoryCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniHistoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  miniHistoryTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  miniHistoryMonto: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accentGreen,
  },
  miniHistoryDate: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyTabText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 14,
  },
  applicantProfileActionsRow: {
    flexDirection: "row",
    marginTop: 4,
  },

  // Modal Calificar Tarea
  reviewModalDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  starSelectRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  reviewInputBox: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 12,
    height: 80,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  reviewInputField: {
    color: colors.textPrimary,
    fontSize: 13,
    paddingVertical: 0,
    height: "100%",
  },
  reviewModalNotice: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 15,
    marginBottom: 16,
  },
  btnConfirmarFinalizacion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentBlue,
    height: 46,
    borderRadius: 12,
    gap: 8,
  },
  btnConfirmarFinalizacionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Modal Créditos
  balanceCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  balanceNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#eab308",
    marginVertical: 4,
  },
  balanceSubtext: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 15,
  },
  packagesTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 10,
  },
  packageCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceLight,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
  },
  packageCardPopular: {
    borderColor: "#eab308",
    backgroundColor: "rgba(234, 179, 8, 0.05)",
  },
  popularBadge: {
    position: "absolute",
    top: -9,
    right: 14,
    backgroundColor: "#eab308",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  popularBadgeText: { fontSize: 9, fontWeight: "800", color: "#000000" },
  packageInfo: { flex: 1 },
  packageCreditsRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  packageCredits: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  packageDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  buyButtonWrap: {
    backgroundColor: colors.accentBlue,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  packagePrice: { fontSize: 13, fontWeight: "700", color: "#ffffff" },
});