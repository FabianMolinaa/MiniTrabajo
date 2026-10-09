import React, { useState, useCallback } from 'react';
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { styles } from '../styles/TrabajosStyles';
import { supabase } from '../services/supabase';
import {
  TrabajoUI,
  EstadoTrabajo,
  CategoriaFiltro,
  ComunaFiltro,
  SolicitanteDetalle,
  fetchTrabajosMuro,
  fetchCategoriasFiltro,
  fetchComunasFiltro,
  fetchDetalleSolicitante,
  postularATrabajo,
  retirarPostulacion,
  eliminarTrabajoPropio,
} from '../utils/functionsTrabajos';

export default function TrabajosScreen() {
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [trabajos, setTrabajos] = useState<TrabajoUI[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const [vista, setVista] = useState<'lista' | 'mapa'>('lista');
  const [modalFiltrosVisible, setModalFiltrosVisible] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState<'ninguno' | 'categoria' | 'comuna'>('ninguno');
  const [busqueda, setBusqueda] = useState('');

  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState<TrabajoUI | null>(null);

  // Perfil del solicitante para el modal
  const [solicitanteModal, setSolicitanteModal] = useState<SolicitanteDetalle | null>(null);
  const [cargandoSolicitante, setCargandoSolicitante] = useState(false);

  // Filtros dinámicos
  const [categorias, setCategorias] = useState<CategoriaFiltro[]>([]);
  const [comunas, setComunas] = useState<ComunaFiltro[]>([]);
  const [categoriaSelId, setCategoriaSelId] = useState<number | 'todas'>('todas');
  const [comunaSelId, setComunaSelId] = useState<number | 'todas'>('todas');
  const [presupuestoMin, setPresupuestoMin] = useState(0);

  const insets = useSafeAreaInsets();
  const buttonBottom = (insets.bottom > 0 ? insets.bottom : 12) + 80;

  const cargarDatos = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user ? user.id : null;
      setUsuarioId(uid);

      const [listaTrabajos, listaCats, listaComs] = await Promise.all([
        fetchTrabajosMuro(uid),
        fetchCategoriasFiltro(),
        fetchComunasFiltro(),
      ]);

      setTrabajos(listaTrabajos);
      setCategorias(listaCats);
      setComunas(listaComs);
    } catch (err) {
      console.error('Error al cargar muro de trabajos:', err);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos])
  );

  const onRefresh = useCallback(() => {
    setRefrescando(true);
    cargarDatos();
  }, [cargarDatos]);

  // Abrir perfil del solicitante
  const handleVerSolicitante = async (solicitanteId: string) => {
    setCargandoSolicitante(true);
    const detalle = await fetchDetalleSolicitante(solicitanteId);
    setSolicitanteModal(detalle);
    setCargandoSolicitante(false);
  };

  // Postulación
  const handlePostular = async (trabajo: TrabajoUI) => {
    if (!usuarioId) {
      Alert.alert('Inicia sesión', 'Debes tener una cuenta activa para postular.');
      return;
    }

    try {
      const { error } = await postularATrabajo(trabajo.id, usuarioId);
      if (error) throw error;

      Alert.alert(
        '¡Postulación enviada!',
        'El solicitante revisará tu perfil en la app. Si te acepta, podrás contactarlo directamente.'
      );
      await cargarDatos();
      setTrabajoSeleccionado((prev) => (prev ? { ...prev, estado: 'postulado' } : null));
    } catch (err: any) {
      Alert.alert('Error al postular', err.message || 'No se pudo registrar la postulación.');
    }
  };

  // Retirar postulación
  const handleRetirar = async (trabajo: TrabajoUI) => {
    if (!trabajo.miPostulacionId) return;

    Alert.alert('Retirar postulación', '¿Deseas retirar tu postulación a esta tarea?', [
      { text: 'No, volver', style: 'cancel' },
      {
        text: 'Sí, retirar',
        style: 'destructive',
        onPress: async () => {
          try {
            await retirarPostulacion(trabajo.miPostulacionId!);
            Alert.alert('Postulación retirada', 'Puedes volver a postular cuando gustes.');
            await cargarDatos();
            setTrabajoSeleccionado((prev) => (prev ? { ...prev, estado: 'disponible' } : null));
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  // Eliminar tarea propia
  const handleEliminarPropia = async (trabajoId: string) => {
    Alert.alert('Eliminar publicación', '¿Seguro que deseas dar de baja este trabajo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await eliminarTrabajoPropio(trabajoId);
            if (error) throw error;
            setTrabajoSeleccionado(null);
            await cargarDatos();
            Alert.alert('Publicación eliminada', 'La tarea ha sido dada de baja del muro.');
          } catch (err: any) {
            Alert.alert('Error al eliminar', err.message);
          }
        },
      },
    ]);
  };

  const handleAbrirWhatsApp = (trabajo: TrabajoUI) => {
    if (!trabajo.telefono) {
      Alert.alert('Sin contacto', 'El solicitante no tiene un número registrado.');
      return;
    }
    const cleanTel = trabajo.telefono.replace(/[^0-9]/g, '');
    const mensaje = encodeURIComponent(
      `¡Hola ${trabajo.solicitante}! Aceptaste mi postulación para "${trabajo.titulo}". Te escribo para coordinar los detalles.`
    );
    Linking.openURL(`https://wa.me/${cleanTel}?text=${mensaje}`).catch(() => {
      Alert.alert('Error', 'No se pudo abrir WhatsApp en tu dispositivo.');
    });
  };

  // Filtrado reactivo en memoria
  const trabajosFiltrados = trabajos.filter((t) => {
    const coincideBusqueda =
      t.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.categoria.toLowerCase().includes(busqueda.toLowerCase());

    const coincideCategoria = categoriaSelId === 'todas' || t.categoriaId === categoriaSelId;
    const coincideComuna = comunaSelId === 'todas' || t.comunaId === comunaSelId;
    const coincideMonto = t.montoRaw >= presupuestoMin;

    return coincideBusqueda && coincideCategoria && coincideComuna && coincideMonto;
  });

  const hayFiltrosActivos =
    categoriaSelId !== 'todas' || comunaSelId !== 'todas' || presupuestoMin > 0;

  const categoriaNombreActual =
    categoriaSelId === 'todas'
      ? 'Todas las categorías'
      : categorias.find((c) => c.id === categoriaSelId)?.nombre || 'Categoría';

  const comunaNombreActual =
    comunaSelId === 'todas'
      ? 'Todas las comunas'
      : comunas.find((c) => c.id === comunaSelId)?.nombre || 'Comuna';

  const renderStatusTag = (estado: EstadoTrabajo, esCreador: boolean) => {
    if (esCreador) {
      return (
        <View style={[styles.statusTag, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
          <Text style={{ color: colors.accentBlue, fontSize: 10, fontWeight: '700' }}>Mi publicación</Text>
        </View>
      );
    }
    if (estado === 'postulado') {
      return (
        <View style={[styles.statusTag, styles.statusTagPending]}>
          <Text style={styles.statusTagPendingText}>Postulado</Text>
        </View>
      );
    }
    if (estado === 'aceptado') {
      return (
        <View style={[styles.statusTag, styles.statusTagAccepted]}>
          <Text style={styles.statusTagAcceptedText}>¡Aceptado!</Text>
        </View>
      );
    }
    if (estado === 'completado') {
      return (
        <View style={[styles.statusTag, styles.statusTagCompleted]}>
          <Text style={styles.statusTagCompletedText}>Completado</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      {/* 1. BUSCADOR Y FILTROS */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar mini-trabajos..."
            placeholderTextColor={colors.textSecondary}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.filterButton, hayFiltrosActivos && styles.filterButtonActive]}
          onPress={() => setModalFiltrosVisible(true)}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={hayFiltrosActivos ? colors.accentBlue : colors.textPrimary}
          />
          {hayFiltrosActivos && <View style={styles.filterDotActive} />}
        </TouchableOpacity>
      </View>

      {/* 2. LISTADO DE TRABAJOS */}
      {vista === 'lista' ? (
        cargando && !refrescando ? (
          <ActivityIndicator size="large" color={colors.accentBlue} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={trabajosFiltrados}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: buttonBottom + 60 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refrescando}
                onRefresh={onRefresh}
                colors={[colors.accentBlue]}
                tintColor={colors.accentBlue}
              />
            }
            ListEmptyComponent={
              <View style={styles.mapContainer}>
                <Ionicons name="file-tray-outline" size={48} color={colors.textMuted} />
                <Text style={styles.mapTitle}>No hay trabajos disponibles</Text>
                <Text style={styles.mapSubtitle}>Intenta ajustar los filtros de búsqueda o desliza para recargar.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const esCreador = item.solicitanteId === usuarioId;

              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.card, item.destacado && styles.cardFeatured]}
                  onPress={() => setTrabajoSeleccionado(item)}
                >
                  {item.destacado && (
                    <View style={styles.featuredBadgeTop}>
                      <Ionicons name="flash" size={11} color="#000000" />
                      <Text style={styles.featuredBadgeText}>DESTACADO</Text>
                    </View>
                  )}

                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeftRow}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.categoria}</Text>
                      </View>
                      {renderStatusTag(item.estado, esCreador)}
                      {item.imagenes.length > 0 && (
                        <View style={styles.photosBadgeTag}>
                          <Ionicons name="image-outline" size={12} color={colors.accentBlue} />
                          <Text style={styles.photosBadgeText}>{item.imagenes.length}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardMonto}>{item.monto}</Text>
                  </View>

                  <Text style={styles.cardTitle}>{item.titulo}</Text>

                  <View style={styles.cardFooter}>
                    <View style={styles.footerItem}>
                      <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                      <Text style={styles.footerText}>{item.comuna}</Text>
                    </View>
                    <View style={styles.footerItem}>
                      <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
                      <Text style={styles.footerText}>{esCreador ? 'Tú' : item.solicitante}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )
      ) : (
        <View style={styles.mapContainer}>
          <Ionicons name="map-outline" size={54} color={colors.textMuted} />
          <Text style={styles.mapTitle}>Vista de Mapa</Text>
          <Text style={styles.mapSubtitle}>
            Mostrando tareas en {comunaNombreActual} ({categoriaNombreActual})
          </Text>
        </View>
      )}

      {/* 3. BOTÓN FLOTANTE */}
      <View style={[styles.floatingButtonContainer, { bottom: buttonBottom }]} pointerEvents="box-none">
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.pluxeeButton}
          onPress={() => setVista(vista === 'lista' ? 'mapa' : 'lista')}
        >
          <Ionicons
            name={vista === 'lista' ? 'location-sharp' : 'reorder-three'}
            size={18}
            color="#ffffff"
          />
          <Text style={styles.pluxeeButtonText}>
            {vista === 'lista' ? 'Mostrar en el mapa' : 'Volver al listado'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. MODAL DETALLE DE LA TAREA */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={trabajoSeleccionado !== null}
        onRequestClose={() => setTrabajoSeleccionado(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setTrabajoSeleccionado(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            {trabajoSeleccionado && (() => {
              const esMiPublicacion = trabajoSeleccionado.solicitanteId === usuarioId;

              return (
                <>
                  <View style={styles.sheetHeader}>
                    <View style={styles.detailCategoryRow}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{trabajoSeleccionado.categoria}</Text>
                      </View>
                      {renderStatusTag(trabajoSeleccionado.estado, esMiPublicacion)}
                    </View>
                    <TouchableOpacity onPress={() => setTrabajoSeleccionado(null)}>
                      <Ionicons name="close" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScrollContent}>
                    <Text style={styles.detailTitle}>{trabajoSeleccionado.titulo}</Text>

                    {/* Carrusel de fotos */}
                    {trabajoSeleccionado.imagenes && trabajoSeleccionado.imagenes.length > 0 && (
                    <View style={styles.detailImagesContainer}>
                        <Text style={styles.detailSectionTitle}>
                        Fotos adjuntas ({trabajoSeleccionado.imagenes.length})
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.detailImagesScroll}>
                        {trabajoSeleccionado.imagenes.map((imgUri, idx) => {
                            // Limpiar la URL en caso de que venga con comillas o llaves de PostgreSQL
                            const cleanUri = String(imgUri).replace(/[{}"']/g, '').trim();

                            return (
                            <View key={idx} style={styles.detailImageCard}>
                                <Image
                                source={{ uri: cleanUri }}
                                style={styles.detailImage}
                                resizeMode="cover"
                                onError={(e) => console.log('Error cargando imagen:', cleanUri, e.nativeEvent.error)}
                                />
                            </View>
                            );
                        })}
                        </ScrollView>
                    </View>
                    )}

                    {/* Metadatos: Pago, Comuna y Fecha */}
                    <View style={styles.detailMetaCard}>
                      <View style={styles.detailMetaItem}>
                        <Text style={styles.detailMetaLabel}>PAGO OFRECIDO</Text>
                        <Text style={styles.detailPrice}>{trabajoSeleccionado.monto}</Text>
                      </View>
                      <View style={styles.detailMetaDivider} />
                      <View style={styles.detailMetaItem}>
                        <Text style={styles.detailMetaLabel}>COMUNA</Text>
                        <Text style={styles.detailComuna}>{trabajoSeleccionado.comuna}</Text>
                      </View>
                      <View style={styles.detailMetaDivider} />
                      <View style={styles.detailMetaItem}>
                        <Text style={styles.detailMetaLabel}>FECHA</Text>
                        <Text style={styles.detailDate}>{trabajoSeleccionado.fechaPublicacion}</Text>
                      </View>
                    </View>

                    {/* Ficha táctil del solicitante */}
                    <Text style={styles.detailSectionTitle}>Publicado por</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.userRowDetail}
                      onPress={() => handleVerSolicitante(trabajoSeleccionado.solicitanteId)}
                    >
                      <View style={styles.userLeftInfo}>
                        <View style={styles.userAvatarDetail}>
                          {trabajoSeleccionado.avatarUrl ? (
                            <Image
                              source={{ uri: trabajoSeleccionado.avatarUrl }}
                              style={{ width: '100%', height: '100%' }}
                            />
                          ) : (
                            <Ionicons name="person" size={18} color={colors.textPrimary} />
                          )}
                        </View>
                        <View>
                          <Text style={styles.userNameDetail}>
                            {esMiPublicacion ? 'Tú (Publicación propia)' : trabajoSeleccionado.solicitante}
                          </Text>
                          <Text style={styles.userSubDetail}>Toca para ver reputación</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </TouchableOpacity>

                    {/* Descripción */}
                    <Text style={styles.detailSectionTitle}>Descripción</Text>
                    <Text style={styles.detailBodyText}>{trabajoSeleccionado.descripcion}</Text>
                  </ScrollView>

                  {/* Acciones: creador vs postulante */}
                  <View style={styles.detailActionContainer}>
                    {esMiPublicacion ? (
                      <View style={styles.ownerBox}>
                        <Text style={styles.ownerText}>
                          Esta tarea fue publicada desde tu cuenta ({trabajoSeleccionado.totalPostulantes} postulante(s)).
                        </Text>
                        {trabajoSeleccionado.estado === 'disponible' && (
                          <TouchableOpacity
                            style={styles.btnDeleteOwner}
                            activeOpacity={0.8}
                            onPress={() => handleEliminarPropia(trabajoSeleccionado.id)}
                          >
                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                            <Text style={styles.btnDeleteOwnerText}>Eliminar publicación</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <>
                        {trabajoSeleccionado.estado === 'disponible' && (
                          <TouchableOpacity
                            style={styles.btnPrimaryAction}
                            activeOpacity={0.85}
                            onPress={() => handlePostular(trabajoSeleccionado)}
                          >
                            <Ionicons name="hand-right-outline" size={18} color="#ffffff" />
                            <Text style={styles.btnActionText}>Postular a este trabajo</Text>
                          </TouchableOpacity>
                        )}

                        {trabajoSeleccionado.estado === 'postulado' && (
                          <View style={{ gap: 8 }}>
                            <View style={styles.pendingActionWrap}>
                              <Ionicons name="time-outline" size={20} color="#eab308" />
                              <Text style={styles.pendingActionText}>
                                Postulación enviada. Te avisaremos si eres aceptado.
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={styles.btnRetirarPostulacion}
                              onPress={() => handleRetirar(trabajoSeleccionado)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="close" size={14} color="#ef4444" />
                              <Text style={styles.btnRetirarPostulacionText}>Retirar postulación</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {trabajoSeleccionado.estado === 'aceptado' && (
                          <TouchableOpacity
                            style={styles.whatsappButton}
                            activeOpacity={0.85}
                            onPress={() => handleAbrirWhatsApp(trabajoSeleccionado)}
                          >
                            <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                            <Text style={styles.btnActionText}>Coordinar por WhatsApp</Text>
                          </TouchableOpacity>
                        )}

                        {trabajoSeleccionado.estado === 'completado' && (
                          <View style={styles.completedBadgeWrap}>
                            <Ionicons name="checkmark-done" size={18} color={colors.accentGreen} />
                            <Text style={styles.completedBadgeText}>Trabajo finalizado</Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* 5. MODAL PERFIL DEL SOLICITANTE */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={solicitanteModal !== null || cargandoSolicitante}
        onRequestClose={() => setSolicitanteModal(null)}
      >
        <Pressable style={styles.dropdownOverlay} onPress={() => setSolicitanteModal(null)}>
          <Pressable style={styles.solicitanteModalBox} onPress={(e) => e.stopPropagation()}>
            {cargandoSolicitante ? (
              <ActivityIndicator size="small" color={colors.accentBlue} style={{ padding: 30 }} />
            ) : solicitanteModal && (
              <>
                <View style={styles.dropdownHeader}>
                  <Text style={styles.dropdownTitle}>Perfil del Solicitante</Text>
                  <TouchableOpacity onPress={() => setSolicitanteModal(null)}>
                    <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.solicitanteHeader}>
                    <View style={styles.solicitanteAvatar}>
                      {solicitanteModal.avatarUrl ? (
                        <Image source={{ uri: solicitanteModal.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <Ionicons name="person" size={28} color={colors.textPrimary} />
                      )}
                    </View>
                    <Text style={styles.solicitanteName}>{solicitanteModal.nombre}</Text>
                    <Text style={styles.solicitanteComuna}>{solicitanteModal.comuna}</Text>

                    <View style={styles.solicitanteRatingRow}>
                      <Ionicons name="star" size={13} color="#eab308" />
                      <Text style={styles.solicitanteRatingText}>
                        {Number(solicitanteModal.calificacion) > 0
                          ? `${solicitanteModal.calificacion} (${solicitanteModal.totalResenas} reseñas)`
                          : 'Usuario nuevo'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.solicitanteAboutBox}>
                    <Text style={styles.solicitanteAboutTitle}>Sobre el usuario</Text>
                    <Text style={styles.solicitanteAboutText}>{solicitanteModal.sobreMi}</Text>
                  </View>

                  <Text style={styles.detailSectionTitle}>Reseñas recibidas</Text>
                  {solicitanteModal.resenas.length === 0 ? (
                    <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic', paddingVertical: 10 }}>
                      Aún no tiene reseñas públicas.
                    </Text>
                  ) : (
                    solicitanteModal.resenas.map((r) => (
                      <View key={r.id} style={styles.solicitanteReviewCard}>
                        <View style={styles.solicitanteReviewHeader}>
                          <Text style={styles.solicitanteReviewAuthor}>{r.autor}</Text>
                          <View style={{ flexDirection: 'row', gap: 2 }}>
                            {[...Array(r.calificacion)].map((_, i) => (
                              <Ionicons key={i} name="star" size={10} color="#eab308" />
                            ))}
                          </View>
                        </View>
                        <Text style={styles.solicitanteReviewComment}>{r.comentario}</Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* 6. MODAL DE FILTROS DINÁMICOS */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalFiltrosVisible}
        onRequestClose={() => setModalFiltrosVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalFiltrosVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filtrar búsqueda</Text>
              <TouchableOpacity onPress={() => setModalFiltrosVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
              <Text style={styles.filterSectionTitle}>Categoría</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                activeOpacity={0.7}
                onPress={() => setDropdownVisible('categoria')}
              >
                <View style={styles.dropdownInner}>
                  <Ionicons name="briefcase-outline" size={18} color={colors.accentBlue} />
                  <Text style={styles.dropdownButtonText}>{categoriaNombreActual}</Text>
                </View>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <Text style={styles.filterSectionTitle}>Comuna</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                activeOpacity={0.7}
                onPress={() => setDropdownVisible('comuna')}
              >
                <View style={styles.dropdownInner}>
                  <Ionicons name="navigate-outline" size={18} color={colors.accentBlue} />
                  <Text style={styles.dropdownButtonText}>{comunaNombreActual}</Text>
                </View>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.sliderHeaderRow}>
                <Text style={styles.filterSectionTitle}>Pago mínimo esperado</Text>
                <Text style={styles.sliderValueBadge}>${presupuestoMin.toLocaleString('es-CL')}</Text>
              </View>
              <View style={styles.sliderStepsRow}>
                {[0, 10000, 20000, 35000, 50000].map((monto) => (
                  <TouchableOpacity
                    key={monto}
                    style={[styles.stepItem, presupuestoMin === monto && styles.stepItemActive]}
                    onPress={() => setPresupuestoMin(monto)}
                  >
                    <Text style={[styles.stepText, presupuestoMin === monto && styles.stepTextActive]}>
                      {monto === 0 ? 'Todos' : `$${monto / 1000}k`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={styles.btnReset}
                onPress={() => {
                  setCategoriaSelId('todas');
                  setComunaSelId('todas');
                  setPresupuestoMin(0);
                }}
              >
                <Text style={styles.btnResetText}>Restablecer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnApply}
                onPress={() => setModalFiltrosVisible(false)}
              >
                <Text style={styles.btnApplyText}>Aplicar Filtros</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 7. SELECTORES CATEGORÍA / COMUNA */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={dropdownVisible !== 'ninguno'}
        onRequestClose={() => setDropdownVisible('ninguno')}
      >
        <Pressable style={styles.dropdownOverlay} onPress={() => setDropdownVisible('ninguno')}>
          <Pressable style={styles.dropdownModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>
                {dropdownVisible === 'categoria' ? 'Selecciona una Categoría' : 'Selecciona una Comuna'}
              </Text>
              <TouchableOpacity onPress={() => setDropdownVisible('ninguno')}>
                <Ionicons name="close-circle" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {dropdownVisible === 'categoria' ? (
              <FlatList
                data={[{ id: 'todas', nombre: 'Todas las categorías' }, ...categorias]}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = categoriaSelId === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                      onPress={() => {
                        setCategoriaSelId(item.id as any);
                        setDropdownVisible('ninguno');
                      }}
                    >
                      <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                        {item.nombre}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={18} color={colors.accentBlue} />}
                    </TouchableOpacity>
                  );
                }}
              />
            ) : (
              <FlatList
                data={[{ id: 'todas', nombre: 'Todas las comunas' }, ...comunas]}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = comunaSelId === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                      onPress={() => {
                        setComunaSelId(item.id as any);
                        setDropdownVisible('ninguno');
                      }}
                    >
                      <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                        {item.nombre}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={18} color={colors.accentBlue} />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}