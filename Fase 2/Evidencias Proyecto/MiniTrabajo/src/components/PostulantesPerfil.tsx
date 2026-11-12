import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MiPublicacion } from "../services/trabajos";
import type { PostulanteBD } from "../services/postulaciones";
import { colors } from "../theme/colors";
import { styles } from "../styles/PerfilStyles";

interface PostulantesPerfilProps {
  tarea: MiPublicacion;
  postulantes: PostulanteBD[];
  cargando: boolean;
  error: string | null;
  onCerrar: () => void;
  onFinalizar: () => void;
  onCalificar: () => void;
  onReintentar: () => void;
  onCancelarAcuerdo: () => void;
  onVerPerfil: (postulante: PostulanteBD) => void | Promise<void>;
  onRechazar: (id: string) => void | Promise<void>;
  onAceptar: (postulante: PostulanteBD) => void | Promise<void>;
  onAbrirWhatsApp: (trabajoId: string, titulo: string) => void | Promise<void>;
}

export default function PostulantesPerfil({
  tarea: tareaSeleccionada, postulantes: postulantesDeTarea,
  cargando: cargandoPostulantes, error: errorPostulantes,
  onCerrar, onFinalizar, onCalificar, onReintentar,
  onCancelarAcuerdo: handleCancelarAcuerdo, onVerPerfil: handleVerPerfilPostulante,
  onRechazar: handleRechazar, onAceptar: handleAceptar, onAbrirWhatsApp: handleAbrirWhatsApp,
}: PostulantesPerfilProps) {

  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.subModalOverlay}>
        <TouchableOpacity
          style={styles.subModalBackdropTouch}
          activeOpacity={1}
          onPress={onCerrar}
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
                  onPress={onCerrar}
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
                    onPress={onFinalizar}
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
                      onPress={onCalificar}
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
                      onPress={onReintentar}
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
  );
}
