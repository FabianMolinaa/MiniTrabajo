import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EstadoListaRemota from "./EstadoListaRemota";
import type { EstadoCargaLista } from "../hooks/useListaRemota";
import type { MiPublicacion } from "../services/trabajos";
import { colors } from "../theme/colors";
import { styles } from "../styles/PerfilStyles";

type TabPublicaciones = "activas" | "completadas";

interface ListadoPublicaciones {
  publicaciones: MiPublicacion[];
  estado: EstadoCargaLista;
  error: string | null;
  tab: TabPublicaciones;
}

interface EdicionPublicacion {
  visible: boolean;
  titulo: string;
  descripcion: string;
  monto: string;
  guardando: boolean;
}

interface PublicacionesPerfilProps {
  visible: boolean;
  listado: ListadoPublicaciones;
  opciones: MiPublicacion | null;
  edicion: EdicionPublicacion;
  onCerrar: () => void;
  onCambiarTab: (tab: TabPublicaciones) => void;
  onReintentar: () => void;
  onAbrirPostulantes: (tarea: MiPublicacion) => void | Promise<void>;
  onAbrirOpciones: (tarea: MiPublicacion) => void;
  onCalificarTrabajador: (tarea: MiPublicacion) => void;
  onCerrarOpciones: () => void;
  onEditar: () => void;
  onEliminar: () => void;
  onCerrarEdicion: () => void;
  onCambiarTitulo: (titulo: string) => void;
  onCambiarDescripcion: (descripcion: string) => void;
  onCambiarMonto: (monto: string) => void;
  onGuardarEdicion: () => void | Promise<void>;
}

export default function PublicacionesPerfil({
  visible,
  listado,
  opciones: tareaOpciones,
  edicion,
  onCerrar,
  onCambiarTab: setTabPublicaciones,
  onReintentar,
  onAbrirPostulantes: handleSeleccionarTarea,
  onAbrirOpciones: handleAbrirOpcionesTarea,
  onCalificarTrabajador,
  onCerrarOpciones,
  onEditar: handleIniciarEdicionTarea,
  onEliminar: handleEliminarTareaOpciones,
  onCerrarEdicion,
  onCambiarTitulo: setEditTituloTarea,
  onCambiarDescripcion: setEditDescripcionTarea,
  onCambiarMonto: setEditMontoTarea,
  onGuardarEdicion: handleGuardarEdicionTarea,
}: PublicacionesPerfilProps) {
  const {
    publicaciones: misPublicaciones,
    estado: estadoPublicaciones,
    error: errorPublicaciones,
    tab: tabPublicaciones,
  } = listado;
  const {
    visible: modalEditarTareaVisible,
    titulo: editTituloTarea,
    descripcion: editDescripcionTarea,
    monto: editMontoTarea,
    guardando: guardandoEdicionTarea,
  } = edicion;

  const publicacionesActivas = misPublicaciones.filter(
    (p) => p.estado !== "completado",
  );
  const publicacionesCompletadas = misPublicaciones.filter(
    (p) => p.estado === "completado",
  );

  return (
    <>
      {visible && (
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
                    name="document-text"
                    size={18}
                    color={colors.accentBlue}
                  />
                  <Text style={styles.sheetTitle}>Mis Publicaciones</Text>
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
                  onReintentar={onReintentar}
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
                                onPress={() => onCalificarTrabajador(tarea)}
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

      {tareaOpciones !== null && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.subModalOverlay}>
            <TouchableOpacity
              style={styles.subModalBackdropTouch}
              activeOpacity={1}
              onPress={onCerrarOpciones}
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
                onPress={onCerrarOpciones}
              >
                <Text style={styles.cancelBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {modalEditarTareaVisible && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.subModalOverlay}>
            <TouchableOpacity
              style={styles.subModalBackdropTouch}
              activeOpacity={1}
              onPress={onCerrarEdicion}
            />
            <View style={styles.subModalBox}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Editar Publicación</Text>
                <TouchableOpacity
                  onPress={onCerrarEdicion}
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
    </>
  );
}
