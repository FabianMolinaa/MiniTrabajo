import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { colors } from "../theme/colors";
import { styles } from "../styles/AppStyles";

export default function BarraPestanas({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomMargin = (insets.bottom > 0 ? insets.bottom : 12) + 10;

  return (
    <View
      style={[styles.outerContainer, { bottom: bottomMargin }]}
      pointerEvents="box-none"
    >
      <View style={styles.pillContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          let iconName: keyof typeof Ionicons.glyphMap = "briefcase";
          if (route.name === "Trabajos") {
            iconName = isFocused ? "briefcase" : "briefcase-outline";
          } else if (route.name === "Mapa") {
            iconName = isFocused ? "map" : "map-outline";
          } else if (route.name === "Publicar") {
            iconName = isFocused ? "add-circle" : "add-circle-outline";
          } else if (route.name === "Perfil") {
            iconName = isFocused ? "person" : "person-outline";
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tabButton}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.iconWrapper,
                  isFocused && styles.iconWrapperActive,
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={20}
                  color={isFocused ? colors.textPrimary : colors.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isFocused ? colors.textPrimary : colors.textMuted },
                ]}
              >
                {route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
