import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { styles } from "../styles/PerfilStyles";

interface DestinatarioCalificacion {
  nombreContraparte: string;
  rolContraparte: "trabajador" | "empleador";
  esFinalizacion?: boolean;
}

interface FormularioCalificacionProps {
  destinatario: DestinatarioCalificacion;
  estrellas: number;
  comentario: string;
  guardando: boolean;
  onCambiarEstrellas: (estrellas: number) => void;
  onCambiarComentario: (comentario: string) => void;
  onCerrar: () => void;
  onConfirmar: () => void | Promise<void>;
}

const getTextoEstrellas = (estrellas: number) => {
  switch (estrellas) {
    case 1:
      return "1/5 - Muy mala experiencia";
    case 2:
      return "2/5 - Regular / Desacuerdos";
    case 3:
      return "3/5 - Aceptable / Correcto";
    case 4:
      return "4/5 - Muy buena labor y trato";
    case 5:
      return "5/5 - ¡Excelente experiencia!";
    default:
      return `${estrellas}/5`;
  }
};

export default function FormularioCalificacion({
  destinatario: targetCalificar,
  estrellas: estrellasCalificacion,
  comentario: comentarioCalificacion,
  guardando: guardandoCalificacion,
  onCambiarEstrellas: setEstrellasCalificacion,
  onCambiarComentario: setComentarioCalificacion,
  onCerrar: handleCerrarCalificar,
  onConfirmar: handleConfirmarCalificacion,
}: FormularioCalificacionProps) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.subModalOverlay}>
        <TouchableOpacity
          style={styles.subModalBackdropTouch}
          activeOpacity={1}
          onPress={handleCerrarCalificar}
        />
        <View style={styles.subModalBox}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {targetCalificar?.esFinalizacion
                ? "Finalizar y Calificar"
                : "Calificar Usuario"}
            </Text>
            <TouchableOpacity
              onPress={handleCerrarCalificar}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={24}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          {targetCalificar && (
            <>
              <View style={styles.reviewModalTargetBadge}>
                <Text style={styles.reviewModalTargetBadgeText}>
                  {targetCalificar.rolContraparte === "trabajador"
                    ? "🛠️ Calificando al trabajador: "
                    : "📋 Calificando al empleador: "}
                  {targetCalificar.nombreContraparte}
                </Text>
              </View>

              <Text style={styles.reviewModalDesc}>
                {targetCalificar.rolContraparte === "trabajador"
                  ? "¿Cómo fue el desempeño y cumplimiento del servicio?"
                  : "¿Cómo fue el trato, claridad y cumplimiento del pago?"}
              </Text>

              <View style={styles.starSelectRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    onPress={() => setEstrellasCalificacion(star)}
                  >
                    <Ionicons
                      name={
                        star <= estrellasCalificacion
                          ? "star"
                          : "star-outline"
                      }
                      size={32}
                      color="#eab308"
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.starFeedbackText}>
                {getTextoEstrellas(estrellasCalificacion)}
              </Text>

              <View style={styles.reviewInputBox}>
                <TextInput
                  style={styles.reviewInputField}
                  placeholder="Escribe tu reseña o comentario..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  value={comentarioCalificacion}
                  onChangeText={setComentarioCalificacion}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={styles.btnConfirmarFinalizacion}
                activeOpacity={0.8}
                onPress={handleConfirmarCalificacion}
                disabled={guardandoCalificacion}
              >
                {guardandoCalificacion ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-done"
                      size={18}
                      color="#ffffff"
                    />
                    <Text style={styles.btnConfirmarFinalizacionText}>
                      {targetCalificar.esFinalizacion
                        ? "Confirmar y Finalizar"
                        : "Publicar Reseña"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
