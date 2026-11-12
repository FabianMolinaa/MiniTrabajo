import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EstadoListaRemota from "./EstadoListaRemota";
import type { EstadoCargaLista } from "../hooks/useListaRemota";
import type { TrabajoRealizadoItem } from "../services/trabajos";
import type { ResenaItem } from "../services/resenas";
import { colors } from "../theme/colors";
import { styles } from "../styles/PerfilStyles";

interface ActividadPerfilProps {
  visible: "resenas" | "historial" | null;
  resenas: { datos: ResenaItem[]; estado: EstadoCargaLista; error: string | null };
  historial: { datos: TrabajoRealizadoItem[]; estado: EstadoCargaLista; error: string | null };
  onCerrar: () => void;
  onReintentarResenas: () => void;
  onReintentarHistorial: () => void;
  onCalificarEmpleador: (item: TrabajoRealizadoItem) => void;
}

export default function ActividadPerfil({
  visible: modalVisible, resenas, historial,
  onCerrar, onReintentarResenas, onReintentarHistorial, onCalificarEmpleador,
}: ActividadPerfilProps) {
  const { datos: resenasRecibidas, estado: estadoResenasRecibidas, error: errorResenasRecibidas } = resenas;
  const { datos: historialTrabajos, estado: estadoHistorialTrabajos, error: errorHistorialTrabajos } = historial;

  return (
    <>
      {modalVisible === "resenas" && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdropTouch}
              activeOpacity={1}
              onPress={onCerrar}
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
              <ScrollView showsVerticalScrollIndicator={false}>
                <EstadoListaRemota
                  estado={estadoResenasRecibidas}
                  error={errorResenasRecibidas}
                  onReintentar={onReintentarResenas}
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
      {modalVisible === "historial" && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdropTouch}
              activeOpacity={1}
              onPress={onCerrar}
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
              <ScrollView showsVerticalScrollIndicator={false}>
                <EstadoListaRemota
                  estado={estadoHistorialTrabajos}
                  error={errorHistorialTrabajos}
                  onReintentar={onReintentarHistorial}
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
                                onPress={() => onCalificarEmpleador(item)}
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
    </>
  );
}
