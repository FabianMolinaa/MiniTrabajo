import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { styles } from "../styles/AppStyles";

export function TituloCabecera({ titulo }: { titulo: string }) {
  return (
    <View style={styles.headerLeftContainer}>
      <View style={styles.logoPlaceholder}>
        <Ionicons name="flash" size={18} color={colors.accentBlue} />
      </View>
      <Text style={styles.topBarTitle}>{titulo}</Text>
    </View>
  );
}

export function BotonNotificaciones({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.notifButton}
      onPress={onPress}
    >
      <Ionicons
        name="notifications-outline"
        size={20}
        color={colors.textPrimary}
      />
      <View style={styles.notifBadge} />
    </TouchableOpacity>
  );
}
