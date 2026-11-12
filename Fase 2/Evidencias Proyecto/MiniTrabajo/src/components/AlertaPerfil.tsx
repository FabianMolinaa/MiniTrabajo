import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { styles } from "../styles/PerfilStyles";

export interface AlertaPersonalizada {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: "exito" | "error" | "confirmar" | "info";
  textoConfirmar?: string;
  textoCancelar?: string;
  onConfirmar?: () => void;
  onCancelar?: () => void;
}

interface AlertaPerfilProps {
  alerta: AlertaPersonalizada;
  onCerrar: () => void;
}

export default function AlertaPerfil({
  alerta,
  onCerrar: cerrarAlerta,
}: AlertaPerfilProps) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.subModalOverlay}>
        <TouchableOpacity
          style={styles.subModalBackdropTouch}
          activeOpacity={1}
          onPress={cerrarAlerta}
        />
        <View style={styles.customAlertBox}>
          <View
            style={[
              styles.customAlertIconWrap,
              {
                backgroundColor:
                  alerta.tipo === "exito"
                    ? "rgba(34, 197, 94, 0.15)"
                    : alerta.tipo === "error"
                      ? "rgba(239, 68, 68, 0.15)"
                      : alerta.tipo === "confirmar"
                        ? "rgba(234, 179, 8, 0.15)"
                        : "rgba(59, 130, 246, 0.15)",
              },
            ]}
          >
            <Ionicons
              name={
                alerta.tipo === "exito"
                  ? "checkmark-circle"
                  : alerta.tipo === "error"
                    ? "alert-circle"
                    : alerta.tipo === "confirmar"
                      ? "help-circle"
                      : "information-circle"
              }
              size={32}
              color={
                alerta.tipo === "exito"
                  ? colors.accentGreen
                  : alerta.tipo === "error"
                    ? "#ef4444"
                    : alerta.tipo === "confirmar"
                      ? "#eab308"
                      : colors.accentBlue
              }
            />
          </View>

          <Text style={styles.customAlertTitle}>{alerta.titulo}</Text>
          <Text style={styles.customAlertMessage}>
            {alerta.mensaje}
          </Text>

          <View style={styles.customAlertButtonsRow}>
            {alerta.tipo === "confirmar" && (
              <TouchableOpacity
                style={styles.btnCustomAlertCancel}
                onPress={() => {
                  cerrarAlerta();
                  if (alerta.onCancelar) alerta.onCancelar();
                }}
              >
                <Text style={styles.btnCustomAlertCancelText}>
                  {alerta.textoCancelar || "Cancelar"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.btnCustomAlertConfirm,
                alerta.tipo === "error" && {
                  backgroundColor: "#ef4444",
                },
              ]}
              onPress={() => {
                cerrarAlerta();
                if (alerta.onConfirmar) alerta.onConfirmar();
              }}
            >
              <Text style={styles.btnCustomAlertConfirmText}>
                {alerta.textoConfirmar || "Entendido"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
