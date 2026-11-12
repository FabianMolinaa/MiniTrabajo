import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { styles } from "../styles/PerfilStyles";

interface CreditosPerfilProps {
  textoSaldo: string;
  onCerrar: () => void;
  onVerHistorial: () => void;
  onComprar: (paquete: { id: string }) => void;
}

const PAQUETES_CREDITOS = [
  {
    id: "1",
    creditos: 10,
    precio: "$2.990",
    destacado: false,
    desc: "Ideal para destacar 2 publicaciones",
  },
  {
    id: "2",
    creditos: 25,
    precio: "$5.990",
    destacado: true,
    desc: "El más popular (ahorras 20%)",
  },
  {
    id: "3",
    creditos: 50,
    precio: "$9.990",
    destacado: false,
    desc: "Para usuarios frecuentes",
  },
];

export default function CreditosPerfil({
  textoSaldo, onCerrar, onVerHistorial, onComprar,
}: CreditosPerfilProps) {

  return (
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
              <Ionicons name="sparkles" size={20} color="#eab308" />
              <Text style={styles.sheetTitle}>Tus Créditos</Text>
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
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Saldo disponible</Text>
            <Text style={styles.balanceNumber}>
              {textoSaldo}
            </Text>
            <Text style={styles.balanceSubtext}>
              Usa créditos para destacar tus ofertas en la comunidad.
            </Text>
          </View>

          <TouchableOpacity
            style={{ paddingVertical: 12 }}
            onPress={onVerHistorial}
          >
            <Text
              style={{
                color: colors.accentBlue,
                textAlign: "center",
              }}
            >
              Historial de compras
            </Text>
          </TouchableOpacity>
          {PAQUETES_CREDITOS.map((pack) => (
            <TouchableOpacity
              key={pack.id}
              activeOpacity={0.8}
              style={[
                styles.packageCard,
                pack.destacado && styles.packageCardPopular,
              ]}
              onPress={() => onComprar(pack)}
            >
              <View style={styles.packageInfo}>
                <View style={styles.packageCreditsRow}>
                  <Ionicons name="flash" size={16} color="#eab308" />
                  <Text style={styles.packageCredits}>
                    {pack.creditos} Créditos
                  </Text>
                </View>
                <Text style={styles.packageDesc}>{pack.desc}</Text>
              </View>
              <View style={styles.buyButtonWrap}>
                <Text style={styles.packagePrice}>{pack.precio}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}
