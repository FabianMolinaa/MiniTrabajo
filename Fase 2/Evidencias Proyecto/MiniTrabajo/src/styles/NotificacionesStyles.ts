import { StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export const notifStyles = StyleSheet.create({
  badgeContador: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  badgeTexto: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
  },
  accionesCabecera: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  marcarTodas: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accentBlue,
  },
  itemNoLeido: {
    backgroundColor: colors.accentBlueBg,
    borderRadius: 12,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  puntoNoLeido: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentBlue,
    marginTop: 6,
  },
  estadoVacio: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 8,
  },
  estadoTexto: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
  botonReintentar: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  botonReintentarTexto: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
});
