import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { styles } from "../styles/AppStyles";
import { notifStyles } from "../styles/NotificacionesStyles";
import type { Notificacion, TipoNotificacion } from "../services/notificaciones";

const ICONOS: Record<TipoNotificacion, keyof typeof Ionicons.glyphMap> = {
  nueva_postulacion: "person-add-outline",
  postulacion_aceptada: "checkmark-circle-outline",
  postulacion_rechazada: "close-circle-outline",
  acuerdo_cancelado: "alert-circle-outline",
  calificacion_recibida: "star-outline",
  compra_aprobada: "wallet-outline",
};

function tiempoRelativo(fechaIso: string): string {
  const segundos = Math.max(0, (Date.now() - new Date(fechaIso).getTime()) / 1000);
  if (segundos < 60) return "Recién";
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} ${horas === 1 ? "hora" : "horas"}`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "Ayer";
  if (dias < 7) return `Hace ${dias} días`;
  return new Date(fechaIso).toLocaleDateString("es-CL");
}

interface ModalNotificacionesProps {
  visible: boolean;
  onCerrar: () => void;
  notificaciones: Notificacion[];
  noLeidas: number;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  onMarcarLeida: (id: string) => void;
  onMarcarTodas: () => void;
}

export default function ModalNotificaciones({
  visible,
  onCerrar,
  notificaciones,
  noLeidas,
  cargando,
  error,
  onReintentar,
  onMarcarLeida,
  onMarcarTodas,
}: ModalNotificacionesProps) {
  const renderVacio = () => {
    if (cargando) {
      return (
        <View style={notifStyles.estadoVacio}>
          <ActivityIndicator color={colors.accentBlue} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={notifStyles.estadoVacio}>
          <Ionicons name="cloud-offline-outline" size={28} color={colors.textMuted} />
          <Text style={notifStyles.estadoTexto}>{error}</Text>
          <TouchableOpacity style={notifStyles.botonReintentar} onPress={onReintentar}>
            <Text style={notifStyles.botonReintentarTexto}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={notifStyles.estadoVacio}>
        <Ionicons name="notifications-off-outline" size={28} color={colors.textMuted} />
        <Text style={notifStyles.estadoTexto}>
          No tienes notificaciones por ahora.
        </Text>
      </View>
    );
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCerrar}
    >
      <Pressable style={styles.modalOverlay} onPress={onCerrar}>
        <Pressable
          style={styles.modalContent}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Ionicons name="notifications" size={20} color={colors.accentBlue} />
              <Text style={styles.modalTitle}>Notificaciones</Text>
            </View>
            <View style={notifStyles.accionesCabecera}>
              {noLeidas > 0 && (
                <TouchableOpacity onPress={onMarcarTodas}>
                  <Text style={notifStyles.marcarTodas}>Marcar leídas</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onCerrar}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={notificaciones}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderVacio}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.notifItem, !item.leida && notifStyles.itemNoLeido]}
                onPress={() => !item.leida && onMarcarLeida(item.id)}
              >
                <View style={styles.notifIconWrap}>
                  <Ionicons
                    name={ICONOS[item.tipo] ?? "notifications-outline"}
                    size={18}
                    color={colors.accentBlue}
                  />
                </View>
                <View style={styles.notifTextWrap}>
                  <Text style={styles.notifItemTitle}>{item.titulo}</Text>
                  <Text style={styles.notifItemMsg}>{item.mensaje}</Text>
                  <Text style={styles.notifTime}>{tiempoRelativo(item.created_at)}</Text>
                </View>
                {!item.leida && <View style={notifStyles.puntoNoLeido} />}
              </TouchableOpacity>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
