import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EstadoListaRemota from "./EstadoListaRemota";
import type { EstadoCargaLista } from "../hooks/useListaRemota";
import type { TrabajoRealizadoItem } from "../services/trabajos";
import type { PostulanteBD } from "../services/postulaciones";
import type { ResenaItem } from "../services/resenas";
import { colors } from "../theme/colors";
import { styles } from "../styles/PerfilStyles";

interface DetallePostulanteProps {
  postulante: PostulanteBD;
  tab: "resenas" | "historial";
  resenas: { datos: ResenaItem[]; estado: EstadoCargaLista; error: string | null };
  historial: { datos: TrabajoRealizadoItem[]; estado: EstadoCargaLista; error: string | null };
  onCerrar: () => void;
  onCambiarTab: (tab: "resenas" | "historial") => void;
  onReintentar: () => void;
}

export default function DetallePostulante({
  postulante: postulanteDetalle, tab: tabPostulante, resenas, historial,
  onCerrar, onCambiarTab: setTabPostulante, onReintentar,
}: DetallePostulanteProps) {
  const { datos: resenasPostulante, estado: estadoResenasPostulante, error: errorResenasPostulante } = resenas;
  const { datos: historialPostulante, estado: estadoHistorialPostulante, error: errorHistorialPostulante } = historial;

  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.subModalOverlay}>
        <TouchableOpacity
          style={styles.subModalBackdropTouch}
          activeOpacity={1}
          onPress={onCerrar}
        />
        <View style={styles.applicantProfileBox}>
          {postulanteDetalle && (
            <>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  Perfil del Postulante
                </Text>
                <TouchableOpacity
                  onPress={onCerrar}
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
                  onReintentar={onReintentar}
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
  );
}
