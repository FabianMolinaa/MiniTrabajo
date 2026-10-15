import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from '../components/NativeMaps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { colors } from '../theme/colors';
import { styles } from '../styles/MapaStyles';
import { supabase } from '../services/supabase';
import {
  TrabajoUI,
  CategoriaFiltro,
  fetchTrabajosMuro,
  fetchCategoriasFiltro,
  postularATrabajo,
  formatearDistancia,
} from '../utils/functionsTrabajos';
import {
  obtenerCoordenadasTrabajo,
  darkMapStyle,
  SANTIAGO_REGION_DEFAULT,
} from '../utils/mapUtils';

export default function MapaScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);

  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [trabajos, setTrabajos] = useState<TrabajoUI[]>([]);
  const [categorias, setCategorias] = useState<CategoriaFiltro[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [refrescando, setRefrescando] = useState<boolean>(false);

  // Ubicación del usuario
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [permisoUbicacion, setPermisoUbicacion] = useState<boolean>(false);
  const userLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const primeraCargaRef = useRef<boolean>(true);
  const ultimoToqueUIRef = useRef<number>(0);

  // Filtros
  const [busqueda, setBusqueda] = useState<string>('');
  const [categoriaSelId, setCategoriaSelId] = useState<number | 'todas'>('todas');

  // Marcador y Detalle seleccionado
  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState<TrabajoUI | null>(null);
  const [modalDetalleVisible, setModalDetalleVisible] = useState<boolean>(false);
  const [postulando, setPostulando] = useState<boolean>(false);

  // Animación para el bottom card
  const slideAnim = useRef(new Animated.Value(150)).current;

  // Distancia inferior para no solaparse con la barra de navegación flotante
  const bottomBarPadding = (insets.bottom > 0 ? insets.bottom : 12) + 76;

  // 1. Obtener ubicación del usuario
  const obtenerUbicacionUsuario = useCallback(async (centrarMapa: boolean = false) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermisoUbicacion(false);
        return null;
      }
      setPermisoUbicacion(true);

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      userLocationRef.current = coords;
      setUserLocation(coords);

      if (centrarMapa && mapRef.current) {
        mapRef.current.animateToRegion(
          {
            ...coords,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          800
        );
      }
      return coords;
    } catch {
      // Fallback si falla el GPS
      return null;
    }
  }, []);

  // 2. Cargar trabajos y categorías (callback estable: lee la ubicación desde un ref)
  const cargarDatos = useCallback(async (coordsOverride?: { latitude: number; longitude: number } | null) => {
    try {
      if (primeraCargaRef.current) setCargando(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uid = user ? user.id : null;
      setUsuarioId(uid);

      const [listaTrabajos, listaCats] = await Promise.all([
        fetchTrabajosMuro(uid, coordsOverride ?? userLocationRef.current),
        fetchCategoriasFiltro(),
      ]);

      setTrabajos(listaTrabajos);
      setCategorias(listaCats);
    } catch (err) {
      console.error('Error cargando datos de mapa:', err);
    } finally {
      primeraCargaRef.current = false;
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  // Una sola carga por cada vez que la pantalla gana foco
  useFocusEffect(
    useCallback(() => {
      let activo = true;
      (async () => {
        const coords = await obtenerUbicacionUsuario(false);
        if (activo) await cargarDatos(coords);
      })();
      return () => {
        activo = false;
      };
    }, [obtenerUbicacionUsuario, cargarDatos])
  );

  // Animación del Bottom Card cuando se selecciona un trabajo
  useEffect(() => {
    if (trabajoSeleccionado) {
      slideAnim.setValue(100);
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [trabajoSeleccionado]);

  // Manejar selección de marcador
  const handleMarkerPress = (trabajo: TrabajoUI) => {
    setTrabajoSeleccionado(trabajo);
    const coords = obtenerCoordenadasTrabajo(trabajo);
    mapRef.current?.animateToRegion(
      {
        latitude: coords.latitude - 0.005, // pequeño offset para que el bottom sheet no tape el pin
        longitude: coords.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      },
      400
    );
  };

  // Centrar en ubicación actual
  const handleCentrarMiUbicacion = async () => {
    if (!permisoUbicacion) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso de Ubicación',
          'Activa los permisos de ubicación para centrar el mapa en tu posición actual.'
        );
        return;
      }
      setPermisoUbicacion(true);
    }
    await obtenerUbicacionUsuario(true);
  };

  // Postulación desde el mapa
  const handlePostular = async (trabajo: TrabajoUI) => {
    if (!usuarioId) {
      Alert.alert('Inicia sesión', 'Debes tener una cuenta activa para postular.');
      return;
    }

    if (trabajo.tieneAceptado) {
      Alert.alert(
        'Labor no disponible',
        'Esta labor ya fue asignada a otro postulante.'
      );
      return;
    }

    setPostulando(true);
    try {
      const { error } = await postularATrabajo(trabajo.id, usuarioId);
      if (error) throw error;

      Alert.alert('¡Postulación enviada!', 'Tu interés fue notificado al solicitante.');
      await cargarDatos();
      setModalDetalleVisible(false);
      setTrabajoSeleccionado(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No pudimos registrar tu postulación.');
    } finally {
      setPostulando(false);
    }
  };

  // Filtrado de trabajos para mostrar en el mapa
  const trabajosFiltrados = trabajos.filter((t) => {
    if (t.estado === 'completado' || String(t.estadoPublicacionOriginal || '').toLowerCase() === 'completado') {
      return false;
    }
    const textoBusqueda = busqueda.trim().toLowerCase();
    const coincideBusqueda =
      textoBusqueda === '' ||
      t.titulo.toLowerCase().includes(textoBusqueda) ||
      t.descripcion.toLowerCase().includes(textoBusqueda) ||
      t.comuna.toLowerCase().includes(textoBusqueda) ||
      t.categoria.toLowerCase().includes(textoBusqueda);

    const coincideCategoria =
      categoriaSelId === 'todas' || t.categoriaId === categoriaSelId;

    return coincideBusqueda && coincideCategoria;
  });

  return (
    <View style={styles.container}>
      {/* 1. MAPA REACT-NATIVE-MAPS */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        customMapStyle={darkMapStyle}
        initialRegion={
          userLocation
            ? {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.08,
                longitudeDelta: 0.08,
              }
            : SANTIAGO_REGION_DEFAULT
        }
        showsUserLocation={permisoUbicacion}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onPress={(e) => {
          // Ignorar toques que en realidad son sobre un marcador o sobre la tarjeta flotante
          if (e.nativeEvent?.action === 'marker-press') return;
          if (Date.now() - ultimoToqueUIRef.current < 600) return;
          setTrabajoSeleccionado(null);
        }}
      >
        {/* Renderizado de pines de trabajos */}
        {trabajosFiltrados.map((item) => {
          const coords = obtenerCoordenadasTrabajo(item);
          const isSelected = trabajoSeleccionado?.id === item.id;
          const isDestacado = item.destacado;

          return (
            <Marker
              key={item.id}
              coordinate={coords}
              onPress={() => handleMarkerPress(item)}
              tracksViewChanges={false}
            >
              {/* Marcador Personalizado Moderno */}
              <View style={styles.markerWrapper}>
                <View
                  style={[
                    styles.markerBubble,
                    isDestacado && styles.markerBubbleDestacado,
                    isSelected && styles.markerBubbleSelected,
                  ]}
                >
                  {isDestacado && (
                    <Ionicons name="star" size={11} color="#eab308" />
                  )}
                  <Text
                    style={[
                      styles.markerPrice,
                      isSelected && styles.markerPriceSelected,
                    ]}
                  >
                    {item.monto}
                  </Text>
                </View>
                <View
                  style={[
                    styles.markerArrow,
                    isDestacado && styles.markerArrowDestacado,
                    isSelected && styles.markerArrowSelected,
                  ]}
                />
              </View>

              {/* Callout Nativo interactivo */}
              <Callout
                tooltip
                onPress={() => {
                  setTrabajoSeleccionado(item);
                  setModalDetalleVisible(true);
                }}
              >
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle} numberOfLines={2}>
                    {item.titulo}
                  </Text>
                  <Text style={styles.calloutPrice}>{item.monto}</Text>
                  <Text style={styles.calloutPrompt}>
                    📍 {item.comuna} • Ver detalle →
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* 2. BARRA DE BÚSQUEDA Y FILTROS FLOTANTE SUPERIOR */}
      <View style={styles.topControlsContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por tarea, comuna o categoría..."
            placeholderTextColor={colors.textMuted}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {busqueda.length > 0 && (
            <TouchableOpacity
              onPress={() => setBusqueda('')}
              style={styles.searchClearBtn}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros de Categoría horizontales */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesScrollContent}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.categoryPill,
              categoriaSelId === 'todas' && styles.categoryPillActive,
            ]}
            onPress={() => setCategoriaSelId('todas')}
          >
            <Ionicons
              name="apps-outline"
              size={14}
              color={categoriaSelId === 'todas' ? '#ffffff' : colors.textSecondary}
            />
            <Text
              style={[
                styles.categoryPillText,
                categoriaSelId === 'todas' && styles.categoryPillTextActive,
              ]}
            >
              Todas ({trabajos.length})
            </Text>
          </TouchableOpacity>

          {categorias.map((cat) => {
            const isActive = categoriaSelId === cat.id;
            const cantidad = trabajos.filter((t) => t.categoriaId === cat.id).length;
            return (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.8}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                onPress={() => setCategoriaSelId(isActive ? 'todas' : cat.id)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isActive && styles.categoryPillTextActive,
                  ]}
                >
                  {cat.nombre} {cantidad > 0 ? `(${cantidad})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Contador de pines mostrados */}
        <View style={styles.counterBadge}>
          <Ionicons name="location-sharp" size={12} color={colors.accentBlue} />
          <Text style={styles.counterText}>
            {trabajosFiltrados.length} {trabajosFiltrados.length === 1 ? 'pololito visible' : 'pololitos en el mapa'}
          </Text>
        </View>
      </View>

      {/* 3. BOTONES FLOTANTES LATERALES (Centrar GPS y Refrescar) */}
      <View style={styles.sideButtonsContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.iconButton, permisoUbicacion && styles.iconButtonActive]}
          onPress={handleCentrarMiUbicacion}
          accessibilityLabel="Mi ubicación"
        >
          <Ionicons
            name="locate"
            size={22}
            color={permisoUbicacion ? '#ffffff' : colors.textPrimary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.iconButton}
          onPress={() => {
            setRefrescando(true);
            cargarDatos();
          }}
          accessibilityLabel="Actualizar mapa"
        >
          {refrescando ? (
            <ActivityIndicator size="small" color={colors.accentBlue} />
          ) : (
            <Ionicons name="reload" size={18} color={colors.textPrimary} />
          )}
        </TouchableOpacity>
      </View>

      {/* 4. TARJETA FLOTANTE INFERIOR (BOTTOM SHEET DEL TRABAJO SELECCIONADO) */}
      {trabajoSeleccionado && (
        <Animated.View
          onTouchStart={() => {
            ultimoToqueUIRef.current = Date.now();
          }}
          style={[
            styles.bottomCardContainer,
            {
              bottom: bottomBarPadding,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header de la tarjeta */}
          <View style={styles.bottomCardHeader}>
            <View style={styles.bottomCardBadges}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {trabajoSeleccionado.categoria}
                </Text>
              </View>
              {trabajoSeleccionado.destacado && (
                <View style={styles.destacadoChip}>
                  <Ionicons name="sparkles" size={11} color="#eab308" />
                  <Text style={styles.destacadoChipText}>Destacado</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => setTrabajoSeleccionado(null)}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Título de la tarea */}
          <Text style={styles.bottomCardTitle} numberOfLines={2}>
            {trabajoSeleccionado.titulo}
          </Text>

          {/* Monto y Comuna / Distancia */}
          <View style={styles.bottomCardInfoRow}>
            <View style={styles.bottomCardPriceContainer}>
              <Text style={styles.bottomCardPriceLabel}>PAGO DIRECTO</Text>
              <Text style={styles.bottomCardPrice}>
                {trabajoSeleccionado.monto}
              </Text>
            </View>
            <View style={styles.bottomCardLocationContainer}>
              <Text style={styles.bottomCardComuna}>
                📍 {trabajoSeleccionado.comuna}
              </Text>
              <Text style={styles.bottomCardDistancia}>
                {formatearDistancia(trabajoSeleccionado.distanciaKm)}
              </Text>
            </View>
          </View>

          {/* Footer: Solicitante y Botón Ir al Detalle */}
          <View style={styles.bottomCardFooter}>
            <View style={styles.bottomCardSolicitante}>
              <View style={styles.solicitanteAvatarSmall}>
                {trabajoSeleccionado.avatarUrl ? (
                  <Image
                    source={{ uri: trabajoSeleccionado.avatarUrl }}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <Ionicons name="person" size={14} color={colors.textSecondary} />
                )}
              </View>
              <Text style={styles.solicitanteNameSmall} numberOfLines={1}>
                {trabajoSeleccionado.solicitante}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.detailActionBtn}
              onPress={() => {
                ultimoToqueUIRef.current = Date.now();
                setModalDetalleVisible(true);
              }}
            >
              <Text style={styles.detailActionBtnText}>Ver detalle</Text>
              <Ionicons name="arrow-forward" size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* 5. MODAL DE DETALLE COMPLETO DEL TRABAJO */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalDetalleVisible && trabajoSeleccionado !== null}
        onRequestClose={() => setModalDetalleVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {trabajoSeleccionado && (
              <>
                <View style={styles.sheetHeader}>
                  <View style={styles.detailCategoryRow}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>
                        {trabajoSeleccionado.categoria}
                      </Text>
                    </View>
                    {trabajoSeleccionado.destacado && (
                      <View style={styles.destacadoChip}>
                        <Ionicons name="sparkles" size={11} color="#eab308" />
                        <Text style={styles.destacadoChipText}>Destacado</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => setModalDetalleVisible(false)}>
                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.detailScrollContent}
                >
                  <Text style={styles.detailTitle}>
                    {trabajoSeleccionado.titulo}
                  </Text>

                  {/* Fotos adjuntas si existen */}
                  {trabajoSeleccionado.imagenes &&
                    trabajoSeleccionado.imagenes.length > 0 && (
                      <View style={styles.detailImagesContainer}>
                        <Text style={styles.detailSectionTitle}>
                          Fotos adjuntas ({trabajoSeleccionado.imagenes.length})
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.detailImagesScroll}
                        >
                          {trabajoSeleccionado.imagenes.map((imgUri, idx) => {
                            const cleanUri = String(imgUri)
                              .replace(/[{}"']/g, '')
                              .trim();
                            return (
                              <View key={idx} style={styles.detailImageCard}>
                                <Image
                                  source={{ uri: cleanUri }}
                                  style={styles.detailImage}
                                  resizeMode="cover"
                                />
                              </View>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}

                  {/* Meta Card con Pago, Comuna y Distancia */}
                  <View style={styles.detailMetaCard}>
                    <View style={styles.detailMetaItem}>
                      <Text style={styles.detailMetaLabel}>PAGO ACORDADO</Text>
                      <Text style={styles.detailPrice}>
                        {trabajoSeleccionado.monto}
                      </Text>
                    </View>
                    <View style={styles.detailMetaDivider} />
                    <View style={styles.detailMetaItem}>
                      <Text style={styles.detailMetaLabel}>COMUNA</Text>
                      <Text style={styles.detailComuna}>
                        {trabajoSeleccionado.comuna}
                      </Text>
                    </View>
                    <View style={styles.detailMetaDivider} />
                    <View style={styles.detailMetaItem}>
                      <Text style={styles.detailMetaLabel}>DISTANCIA</Text>
                      <Text style={styles.detailDate}>
                        {formatearDistancia(trabajoSeleccionado.distanciaKm)}
                      </Text>
                    </View>
                  </View>

                  {/* Solicitante */}
                  <Text style={styles.detailSectionTitle}>Publicado por</Text>
                  <View style={styles.userRowDetail}>
                    <View style={styles.userLeftInfo}>
                      <View style={styles.userAvatarDetail}>
                        {trabajoSeleccionado.avatarUrl ? (
                          <Image
                            source={{ uri: trabajoSeleccionado.avatarUrl }}
                            style={{ width: '100%', height: '100%' }}
                          />
                        ) : (
                          <Ionicons
                            name="person"
                            size={18}
                            color={colors.textPrimary}
                          />
                        )}
                      </View>
                      <View>
                        <Text style={styles.userNameDetail}>
                          {trabajoSeleccionado.solicitanteId === usuarioId
                            ? 'Tú (Publicación propia)'
                            : trabajoSeleccionado.solicitante}
                        </Text>
                        <Text style={styles.userSubDetail}>
                          Publicado el {trabajoSeleccionado.fechaPublicacion}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Descripción */}
                  <Text style={styles.detailSectionTitle}>Descripción de la tarea</Text>
                  <Text style={styles.detailBodyText}>
                    {trabajoSeleccionado.descripcion}
                  </Text>
                </ScrollView>

                {/* Botón de Postulación o Contacto */}
                <View style={styles.detailActionContainer}>
                  {trabajoSeleccionado.solicitanteId === usuarioId ? (
                    <View style={[styles.postularBtn, styles.postularBtnDisabled]}>
                      <Text style={styles.postularBtnTextDisabled}>
                        Esta es tu publicación
                      </Text>
                    </View>
                  ) : trabajoSeleccionado.estado === 'postulado' ? (
                    <View style={[styles.postularBtn, styles.postularBtnDisabled]}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={colors.accentGreen}
                      />
                      <Text style={[styles.postularBtnText, { color: colors.accentGreen }]}>
                        Ya te has postulado
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.postularBtn}
                      activeOpacity={0.8}
                      onPress={() => handlePostular(trabajoSeleccionado)}
                      disabled={postulando}
                    >
                      {postulando ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Ionicons name="hand-right" size={18} color="#ffffff" />
                          <Text style={styles.postularBtnText}>Postular a este trabajo</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Overlay de Carga inicial */}
      {cargando && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accentBlue} />
            <Text style={styles.loadingText}>Cargando mapa de pololitos...</Text>
          </View>
        </View>
      )}
    </View>
  );
}
