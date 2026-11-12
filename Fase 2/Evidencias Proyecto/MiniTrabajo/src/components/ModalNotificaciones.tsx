import { View, Text, TouchableOpacity, Modal, FlatList, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { styles } from "../styles/AppStyles";

interface NotificacionDemostracion {
  id: string;
  titulo: string;
  mensaje: string;
  tiempo: string;
  icono: keyof typeof Ionicons.glyphMap;
}

// Datos de demostración que ya se mostraban en App.
const NOTIFICACIONES_MOCK: NotificacionDemostracion[] = [
  {
    id: "1",
    titulo: "Postulación en contacto",
    mensaje: 'Carlos M. abrió tus datos de contacto para "Armado de mueble".',
    tiempo: "Hace 5 min",
    icono: "chatbubble-ellipses-outline",
  },
  {
    id: "2",
    titulo: "Nuevo trabajo cerca",
    mensaje: 'Hay una nueva tarea de "Mascotas" a 500 metros.',
    tiempo: "Hace 1 hora",
    icono: "location-outline",
  },
  {
    id: "3",
    titulo: "Calificación recibida",
    mensaje: "Sofía R. te calificó con 5 estrellas.",
    tiempo: "Ayer",
    icono: "star-outline",
  },
];

interface ModalNotificacionesProps {
  visible: boolean;
  onCerrar: () => void;
}

export default function ModalNotificaciones({
  visible: modalVisible,
  onCerrar,
}: ModalNotificacionesProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={modalVisible}
      onRequestClose={onCerrar}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={onCerrar}
      >
        <Pressable
          style={styles.modalContent}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Ionicons
                name="notifications"
                size={20}
                color={colors.accentBlue}
              />
              <Text style={styles.modalTitle}>Notificaciones</Text>
            </View>
            <TouchableOpacity onPress={onCerrar}>
              <Ionicons
                name="close-circle"
                size={24}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <FlatList
            data={NOTIFICACIONES_MOCK}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.notifItem}>
                <View style={styles.notifIconWrap}>
                  <Ionicons
                    name={item.icono}
                    size={18}
                    color={colors.accentBlue}
                  />
                </View>
                <View style={styles.notifTextWrap}>
                  <Text style={styles.notifItemTitle}>{item.titulo}</Text>
                  <Text style={styles.notifItemMsg}>{item.mensaje}</Text>
                  <Text style={styles.notifTime}>{item.tiempo}</Text>
                </View>
              </View>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
