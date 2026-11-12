import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EstadoListaRemota from "./EstadoListaRemota";
import type { EstadoCargaLista } from "../hooks/useListaRemota";
import { colors } from "../theme/colors";
import { styles } from "../styles/PerfilStyles";

export interface ComunaItem {
  id: number;
  nombre: string;
}

interface ValoresEdicionPerfil {
  nombre: string;
  sobreMi: string;
  avatarUri: string | null;
  comunaId: number | null;
  comunaNombre: string;
}

interface SelectorComunasPerfil {
  visible: boolean;
  opciones: ComunaItem[];
  estado: EstadoCargaLista;
  error: string | null;
}

interface FormularioEdicionPerfilProps {
  visible: boolean;
  valores: ValoresEdicionPerfil;
  selectorComunas: SelectorComunasPerfil;
  guardando: boolean;
  onCambiarNombre: (nombre: string) => void;
  onCambiarSobreMi: (sobreMi: string) => void;
  onElegirFoto: () => void | Promise<void>;
  onGuardar: () => void | Promise<void>;
  onCerrar: () => void;
  onAbrirComunas: () => void;
  onCerrarComunas: () => void;
  onSeleccionarComuna: (comuna: ComunaItem) => void;
  onReintentarComunas: () => void;
}

export default function FormularioEdicionPerfil({
  visible: modalEditarVisible,
  valores,
  selectorComunas,
  guardando: guardandoCambios,
  onCambiarNombre: setTempNombre,
  onCambiarSobreMi: setTempSobreMi,
  onElegirFoto: handlePickFoto,
  onGuardar: handleGuardarPerfil,
  onCerrar,
  onAbrirComunas,
  onCerrarComunas,
  onSeleccionarComuna,
  onReintentarComunas,
}: FormularioEdicionPerfilProps) {
  const { nombre: tempNombre, sobreMi: tempSobreMi, avatarUri: tempAvatarUri, comunaId: tempComunaId, comunaNombre: tempComunaNombre } = valores;
  const { visible: modalComunasVisible, opciones: comunasDisponibles, estado: estadoComunasPerfil, error: errorComunasPerfil } = selectorComunas;

  return (
    <>
      {modalEditarVisible && (
        <View style={StyleSheet.absoluteFill}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalOverlay}
          >
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
                      name="pencil"
                      size={18}
                      color={colors.accentBlue}
                    />
                    <Text style={styles.sheetTitle}>Editar Perfil</Text>
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
                    onPress={onAbrirComunas}
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
                      onPress={onCerrar}
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
      {modalComunasVisible && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.subModalOverlay}>
            <TouchableOpacity
              style={styles.subModalBackdropTouch}
              activeOpacity={1}
              onPress={onCerrarComunas}
            />
            <View style={styles.dropdownModalBox}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Selecciona tu Comuna</Text>
                <TouchableOpacity
                  onPress={onCerrarComunas}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={colors.textPrimary}
                  />
                </TouchableOpacity>
              </View>
              <EstadoListaRemota estado={estadoComunasPerfil === 'lista' && comunasDisponibles.length === 0 ? 'error' : estadoComunasPerfil} error={errorComunasPerfil ?? 'No hay comunas disponibles.'} onReintentar={onReintentarComunas}>
                <FlatList
                  data={comunasDisponibles}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.comunaItem,
                        tempComunaId === item.id && styles.comunaItemActive,
                      ]}
                      onPress={() => onSeleccionarComuna(item)}
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
    </>
  );
}
