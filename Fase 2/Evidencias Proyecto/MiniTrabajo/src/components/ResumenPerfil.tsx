import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EstadoListaRemota from "./EstadoListaRemota";
import type { EstadoCargaLista } from "../hooks/useListaRemota";
import type { PerfilData } from "../services/perfiles";
import { colors } from "../theme/colors";
import { styles } from "../styles/PerfilStyles";

interface ResumenPerfilProps {
  perfil: PerfilData;
  correo: string;
  textoSaldo: string;
  cargandoPerfil: boolean;
  errorPerfil: string | null;
  refrescando: boolean;
  cerrandoSesion: boolean;
  estadoPublicaciones: EstadoCargaLista;
  totalPublicaciones: number;
  onRefresh: () => void;
  onAbrirCreditos: () => void;
  onEditar: () => void;
  onAbrirResenas: () => void;
  onAbrirHistorial: () => void;
  onAbrirPublicaciones: () => void;
  onCerrarSesion: () => void;
  onReintentar: () => void;
}

export default function ResumenPerfil({
  perfil, correo, textoSaldo, cargandoPerfil, errorPerfil, refrescando,
  cerrandoSesion, estadoPublicaciones, totalPublicaciones, onRefresh,
  onAbrirCreditos,
  onEditar,
  onAbrirResenas,
  onAbrirHistorial,
  onAbrirPublicaciones,
  onCerrarSesion,
  onReintentar,
}: ResumenPerfilProps) {

  return (
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
          onReintentar={onReintentar}
        >
          {null}
        </EstadoListaRemota>
      )}

      {/* TARJETA USUARIO */}
      <View style={styles.userCard}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.creditsPillTop}
          onPress={onAbrirCreditos}
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
                onPress={onEditar}
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
          onPress={onAbrirResenas}
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
          onPress={onAbrirHistorial}
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
          onPress={onAbrirPublicaciones}
        >
          <Text style={[styles.statValue, { color: colors.accentBlue }]}>
            {estadoPublicaciones === "lista" ? totalPublicaciones : "…"}
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
        onPress={onCerrarSesion}
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
  );
}
