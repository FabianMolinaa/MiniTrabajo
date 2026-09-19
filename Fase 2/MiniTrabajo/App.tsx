import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  Animated,
} from "react-native";
import {
  NavigationContainer,
  DarkTheme,
  useIsFocused,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import { colors } from "./src/theme/colors";

import TrabajosScreen from "./src/screens/TrabajosScreen";
import PublicarScreen from "./src/screens/PublicarScreen";
import PerfilScreen from "./src/screens/PerfilScreen";

const Tab = createBottomTabNavigator();

const NOTIFICACIONES_MOCK = [
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

const MyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.navBarBackground,
    text: colors.textPrimary,
  },
};

// Envoltorio para animar el cambio entre pestañas del Navbar
function AnimatedScreenWrapper({ children }: { children: React.ReactNode }) {
  const isFocused = useIsFocused();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isFocused) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isFocused]);

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: fadeAnim,
        transform: [
          {
            scale: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.985, 1],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomMargin = (insets.bottom > 0 ? insets.bottom : 12) + 10;

  return (
    <View
      style={[styles.outerContainer, { bottom: bottomMargin }]}
      pointerEvents="box-none"
    >
      <View style={styles.pillContainer}>
        {state.routes.map((route: any, index: number) => {
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

function Navigation() {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={({ route }) => ({
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            height: 56 + insets.top,
          },
          headerTitleAlign: "left",
          headerTitle: () => (
            <View style={styles.headerLeftContainer}>
              <View style={styles.logoPlaceholder}>
                <Ionicons name="flash" size={18} color={colors.accentBlue} />
              </View>
              <Text style={styles.topBarTitle}>{route.name}</Text>
            </View>
          ),
          headerRight: () => (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.notifButton}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={colors.textPrimary}
              />
              <View style={styles.notifBadge} />
            </TouchableOpacity>
          ),
        })}
      >
        <Tab.Screen name="Trabajos">
          {() => (
            <AnimatedScreenWrapper>
              <TrabajosScreen />
            </AnimatedScreenWrapper>
          )}
        </Tab.Screen>

        <Tab.Screen name="Publicar">
          {() => (
            <AnimatedScreenWrapper>
              <PublicarScreen />
            </AnimatedScreenWrapper>
          )}
        </Tab.Screen>

        <Tab.Screen name="Perfil">
          {() => (
            <AnimatedScreenWrapper>
              <PerfilScreen />
            </AnimatedScreenWrapper>
          )}
        </Tab.Screen>
      </Tab.Navigator>

      {/* Modal emergente de Notificaciones */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
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
              <TouchableOpacity onPress={() => setModalVisible(false)}>
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
                      name={item.icono as any}
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
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={MyDarkTheme}>
        <Navigation />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  headerLeftContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
  },
  logoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  notifButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifBadge: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  outerContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  pillContainer: {
    flexDirection: "row",
    width: "74%",
    maxWidth: 290,
    height: 62,
    backgroundColor: colors.navBarBackground,
    borderRadius: 31,
    borderWidth: 1,
    borderColor: colors.navBarBorder,
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  iconWrapper: {
    width: 38,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapperActive: {
    backgroundColor: colors.navBarPillActive,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    width: "100%",
    maxHeight: "60%",
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  notifItem: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notifIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  notifTextWrap: {
    flex: 1,
  },
  notifItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  notifItemMsg: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  notifTime: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
});
