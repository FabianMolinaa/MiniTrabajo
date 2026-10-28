import React, { useState, useCallback, useRef } from 'react';
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
  Image,
  RefreshControl,
  ActivityIndicator,
  PanResponder,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import {
  useFiltros,
  MONTO_MIN_BASE,
  MONTO_MAX_BASE,
  RADIOS_OPCIONES,
} from '../context/FiltrosContext';

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
  editarTrabajoPropio,
  formatearDistancia,
} from '../utils/functionsTrabajos';

const CAPA_COMPLETA = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };


interface AlertaPersonalizada {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'exito' | 'error' | 'confirmar' | 'info';
  textoConfirmar?: string;
  textoCancelar?: string;
  onConfirmar?: () => void;
  onCancelar?: () => void;
}

export default function TrabajosScreen() {
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [trabajos, setTrabajos] = useState<TrabajoUI[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [postulandoEnCurso, setPostulandoEnCurso] = useState(false);

  const {
    busqueda,
    setBusqueda,
    categoriaSelId,
    setCategoriaSelId,
    comunaSelId,
    setComunaSelId,
    radioDistanciaKm,
    setRadioDistanciaKm,
    montoMinimo,
    setMontoMinimo,
    montoMaximo,
    setMontoMaximo,
    hayFiltrosActivos,
    limpiarFiltros,
  } = useFiltros();

  const [modalFiltrosVisible, setModalFiltrosVisible] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState<'ninguno' | 'categoria' | 'comuna'>('ninguno');

  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState<TrabajoUI | null>(null);
  const [solicitanteModal, setSolicitanteModal] = useState<SolicitanteDetalle | null>(null);
  const [cargandoSolicitante, setCargandoSolicitante] = useState(false);

  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editMonto, setEditMonto] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const [alerta, setAlerta] = useState<AlertaPersonalizada>({
    visible: false,
    titulo: '',
    mensaje: '',
    tipo: 'info',
  });

  const [coordenadasUsuario, setCoordenadasUsuario] = useState<{ latitude: number; longitude: number } | null>(null);
  const coordenadasUsuarioRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const [categorias, setCategorias] = useState<CategoriaFiltro[]>([]);
  const [comunas, setComunas] = useState<ComunaFiltro[]>([]);


  const sliderWidthRef = useRef<number>(260);
  const minPosRef = useRef<number>(0);
  const maxPosRef = useRef<number>(260);

  const insets = useSafeAreaInsets();
  const buttonBottom = (insets.bottom > 0 ? insets.bottom : 12) + 80;

  const dispararAlerta = (
    titulo: string,
    mensaje: string,
    tipo: 'exito' | 'error' | 'confirmar' | 'info' = 'info',
    onConfirmar?: () => void,
    textoConfirmar: string = 'Entendido',
    textoCancelar?: string,
    onCancelar?: () => void
  ) => {
    setAlerta({
      visible: true,
      titulo,
      mensaje,
      tipo,
      textoConfirmar,
      textoCancelar,
      onConfirmar,
      onCancelar,
    });
  };

  const cerrarAlerta = () => {
    setAlerta((prev) => ({ ...prev, visible: false }));
  };

  const cargarDatos = useCallback(async (coordsOverride?: { latitude: number; longitude: number } | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user ? user.id : null;
      setUsuarioId(uid);

      const coords = coordsOverride !== undefined ? coordsOverride : coordenadasUsuarioRef.current;
      const [listaTrabajos, listaCats, listaComs] = await Promise.all([
        fetchTrabajosMuro(uid, coords),
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
      let activo = true;
      (async () => {
        let coords = coordenadasUsuarioRef.current;
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getLastKnownPositionAsync().catch(() => null);
            if (pos && activo) {
              coords = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              };
              coordenadasUsuarioRef.current = coords;
              setCoordenadasUsuario(coords);
            }
          }
        } catch {}
        if (activo) {
          await cargarDatos(coords);
        }
      })();
      return () => {
        activo = false;
      };
    }, [cargarDatos])
  );

  const onRefresh = useCallback(() => {
    setRefrescando(true);
    cargarDatos();
  }, [cargarDatos]);

  const montoMaximoRef = useRef(montoMaximo);
  montoMaximoRef.current = montoMaximo;
  const montoMinimoRef = useRef(montoMinimo);
  montoMinimoRef.current = montoMinimo;

  const panResponderMin = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const w = sliderWidthRef.current;
        const newX = Math.max(0, Math.min(gestureState.moveX - 40, maxPosRef.current - 24));
        minPosRef.current = newX;
        const porcentaje = newX / w;
        const valorCalculado = Math.round((porcentaje * MONTO_MAX_BASE) / 5000) * 5000;
        setMontoMinimo(Math.min(valorCalculado, montoMaximoRef.current - 5000));
      },
    })
  ).current;

  const panResponderMax = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const w = sliderWidthRef.current;
        const newX = Math.max(minPosRef.current + 24, Math.min(gestureState.moveX - 40, w));
        maxPosRef.current = newX;
        const porcentaje = newX / w;
        const valorCalculado = Math.round((porcentaje * MONTO_MAX_BASE) / 5000) * 5000;
        setMontoMaximo(Math.max(valorCalculado, montoMinimoRef.current + 5000));
      },
    })
  ).current;

  const trabajosFiltrados = trabajos.filter((t) => {
    // 1. Excluir tareas completadas
    if (
      t.estado === 'completado' ||
      String(t.estadoPublicacionOriginal || '').toLowerCase() === 'completado'
    ) {
      return false;
    }

    // 2. Excluir tareas asignadas, excepto para el trabajador aceptado o el rechazado que consulta
    const estaEnCurso =
      t.tieneAceptado ||
      String(t.estadoPublicacionOriginal || '').toLowerCase() === 'en_progreso';

    if (estaEnCurso && t.estado !== 'aceptado' && t.estado !== 'rechazado') {
      return false;
    }

    const textoBusqueda = busqueda.trim().toLowerCase();
    const coincideBusqueda =
      textoBusqueda === '' ||
      t.titulo.toLowerCase().includes(textoBusqueda) ||
      t.descripcion.toLowerCase().includes(textoBusqueda) ||
      t.categoria.toLowerCase().includes(textoBusqueda);

    const coincideCategoria = categoriaSelId === 'todas' || t.categoriaId === categoriaSelId;
    const coincideComuna = comunaSelId === 'todas' || t.comunaId === comunaSelId;

    const coincideMonto =
      (montoMinimo === MONTO_MIN_BASE || t.montoRaw >= montoMinimo) &&
      (montoMaximo >= MONTO_MAX_BASE || t.montoRaw <= montoMaximo);

    let coincideRadio = true;
    if (radioDistanciaKm !== null) {
      if (t.distanciaKm != null) {
        coincideRadio = t.distanciaKm <= radioDistanciaKm;
      } else {
        coincideRadio = comunaSelId !== 'todas' ? t.comunaId === comunaSelId : true;
      }
    }

    return coincideBusqueda && coincideCategoria && coincideComuna && coincideMonto && coincideRadio;
  });


  const categoriaNombreActual =
    categoriaSelId === 'todas'
      ? 'Todas las categorías'
      : categorias.find((c) => c.id === categoriaSelId)?.nombre || 'Categoría';

  const comunaNombreActual =
    comunaSelId === 'todas'
      ? 'Todas las comunas'
      : comunas.find((c) => c.id === comunaSelId)?.nombre || 'Comuna';

  const handleVerSolicitante = async (solicitanteId: string) => {
    setCargandoSolicitante(true);
    const detalle = await fetchDetalleSolicitante(solicitanteId);
    setSolicitanteModal(detalle);
    setCargandoSolicitante(false);
  };

  const handlePostular = async (trabajo: TrabajoUI) => {
    if (!usuarioId) {
      dispararAlerta('Inicia sesión', 'Debes tener una cuenta activa para postular.', 'info');
      return;
    }

    if (trabajo.tieneAceptado) {
      dispararAlerta(
        'Labor no disponible',
        'Esta tarea ya fue asignada a otro trabajador y no acepta nuevas solicitudes.',
        'error'
      );
      return;
    }

    setPostulandoEnCurso(true);
    try {
      const { data, error } = await postularATrabajo(trabajo.id, usuarioId);
      if (error) throw error;

      await cargarDatos();
      setTrabajoSeleccionado((prev) =>
        prev
          ? {
              ...prev,
              estado: 'postulado',
              miPostulacionId: data?.id,
            }
          : null
      );

      dispararAlerta(
        '¡Postulación enviada!',
        'Tu postulación quedó registrada. El creador podrá revisar tu perfil desde sus publicaciones.',
        'exito'
      );
    } catch (err: any) {
      dispararAlerta('Error al postular', err.message || 'No se pudo registrar la postulación.', 'error');
    } finally {
      setPostulandoEnCurso(false);
    }
  };

  const handleRetirar = async (trabajo: TrabajoUI) => {
    if (!usuarioId) return;

    dispararAlerta(
      'Retirar postulación',
      '¿Deseas dar de baja tu postulación a esta tarea?',
      'confirmar',
      async () => {
        try {
          const { error } = await retirarPostulacion(trabajo.id, usuarioId);
          if (error) throw error;

          await cargarDatos();
          setTrabajoSeleccionado((prev) =>
            prev
              ? {
                  ...prev,
                  estado: 'disponible',
                  miPostulacionId: undefined,
                }
              : null
          );
          dispararAlerta('Postulación retirada', 'Puedes volver a postular cuando gustes.', 'info');
        } catch (err: any) {
          dispararAlerta('Error', err.message || 'No se pudo retirar la postulación.', 'error');
        }
      },
      'Sí, retirar',
      'Cancelar'
    );
  };

  const handleEliminarPropia = async (trabajo: TrabajoUI) => {
    if (trabajo.tieneAceptado) {
      dispararAlerta(
        'Acción bloqueada',
        'No puedes eliminar esta publicación porque ya aceptaste a un trabajador.',
        'error'
      );
      return;
    }

    dispararAlerta(
      'Eliminar publicación',
      '¿Seguro que deseas eliminar esta tarea de forma definitiva?',
      'confirmar',
      async () => {
        try {
          const { error } = await eliminarTrabajoPropio(trabajo.id);
          if (error) throw error;
          setTrabajoSeleccionado(null);
          await cargarDatos();
          dispararAlerta('Publicación eliminada', 'La tarea ha sido dada de baja del muro.', 'exito');
        } catch (err: any) {
          dispararAlerta('No se pudo eliminar', err.message);
        }
      },
      'Sí, eliminar',
      'Cancelar'
    );
  };

  const handleAbrirEdicion = (trabajo: TrabajoUI) => {
    if (trabajo.tieneAceptado) {
      dispararAlerta(
        'Edición bloqueada',
        'Esta tarea ya cuenta con un trabajador aceptado. No se permite cambiar el monto ni las condiciones.',
        'error'
      );
      return;
    }
    setEditTitulo(trabajo.titulo);
    setEditDescripcion(trabajo.descripcion);
    setEditMonto(trabajo.montoRaw.toString());
    setModalEditarVisible(true);
  };

  const handleGuardarEdicion = async () => {
    if (!trabajoSeleccionado) return;

    const montoNum = parseInt(editMonto.replace(/[^0-9]/g, ''), 10) || 0;
    if (editTitulo.trim().length < 6) {
      dispararAlerta('Validación', 'El título debe tener al menos 6 caracteres.', 'error');
      return;
    }
    if (editDescripcion.trim().length < 20) {
      dispararAlerta('Validación', 'La descripción debe tener al menos 20 caracteres.', 'error');
      return;
    }
    if (montoNum < 5000) {
      dispararAlerta('Validación', 'El monto mínimo ofrecido debe ser de $5.000 CLP.', 'error');
      return;
    }

    setGuardandoEdicion(true);
    try {
      const { error } = await editarTrabajoPropio(trabajoSeleccionado.id, {
        titulo: editTitulo,
        descripcion: editDescripcion,
        monto: montoNum,
      });

      if (error) throw error;

      setModalEditarVisible(false);
      await cargarDatos();

      setTrabajoSeleccionado((prev) =>
        prev
          ? {
              ...prev,
              titulo: editTitulo.trim(),
              descripcion: editDescripcion.trim(),
              montoRaw: montoNum,
              monto: `$${montoNum.toLocaleString('es-CL')}`,
            }
          : null
      );

      dispararAlerta('¡Publicación actualizada!', 'Los cambios han sido guardados con éxito.', 'exito');
    } catch (err: any) {
      dispararAlerta('Error', err.message || 'No se pudo actualizar la tarea.', 'error');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleAbrirWhatsApp = (trabajo: TrabajoUI) => {
    if (!trabajo.telefono) {
      dispararAlerta('Sin contacto', 'El solicitante no tiene un número registrado.', 'error');
      return;
    }
    const cleanTel = trabajo.telefono.replace(/[^0-9]/g, '');
    const mensaje = encodeURIComponent(
      `¡Hola ${trabajo.solicitante}! Aceptaste mi postulación para "${trabajo.titulo}". Te escribo para coordinar los detalles.`
    );
    Linking.openURL(`https://wa.me/${cleanTel}?text=${mensaje}`).catch(() => {
      dispararAlerta('Error', 'No se pudo abrir WhatsApp en tu dispositivo.');
    });
  };

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
    if (estado === 'rechazado') {
      return (
        <View style={[styles.statusTag, styles.statusTagRejected]}>
          <Text style={styles.statusTagRejectedText}>No seleccionado</Text>
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

  const pctMin = (montoMinimo - MONTO_MIN_BASE) / (MONTO_MAX_BASE - MONTO_MIN_BASE);
  const pctMax = (montoMaximo - MONTO_MIN_BASE) / (MONTO_MAX_BASE - MONTO_MIN_BASE);
  const leftPx = pctMin * sliderWidthRef.current;
  const rightPx = pctMax * sliderWidthRef.current;
  const widthPx = Math.max(0, rightPx - leftPx);
  // Estado combinado para evitar presentar modales anidados en iOS
  const hayCapaAbierta =
    trabajoSeleccionado !== null ||
    modalEditarVisible ||
    solicitanteModal !== null ||
    cargandoSolicitante ||
    modalFiltrosVisible ||
    alerta.visible;

  const cerrarCapaSuperior = () => {
    if (alerta.visible) return cerrarAlerta();
    if (solicitanteModal !== null || cargandoSolicitante) return setSolicitanteModal(null);
    if (modalEditarVisible) return setModalEditarVisible(false);
    if (modalFiltrosVisible) return setModalFiltrosVisible(false);
    setTrabajoSeleccionado(null);
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
      {cargando && !refrescando ? (
          <ActivityIndicator size="large" color={colors.accentBlue} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={trabajosFiltrados}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: buttonBottom + 20 }]}
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
                <Text style={styles.mapSubtitle}>
                  Prueba restableciendo los filtros o desliza hacia abajo para recargar.
                </Text>
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
                      <Text style={styles.footerText}>
                        {item.distanciaKm != null
                          ? `${formatearDistancia(item.distanciaKm)} • ${item.comuna}`
                          : item.comuna}
                      </Text>
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
      )}
            {/* MODAL_HOST_TRABAJOS: Un único Modal nativo; las ventanas se apilan como capas internas
          para evitar que iOS congele la pantalla al abrir un modal sobre otro. */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={hayCapaAbierta}
        onRequestClose={cerrarCapaSuperior}
      >
        <View style={{ flex: 1 }}>
{/* 3. MODAL DETALLE DE LA TAREA */}
      {(trabajoSeleccionado !== null) && (
        <View style={CAPA_COMPLETA}>
        <Pressable style={styles.modalOverlay} onPress={() => setTrabajoSeleccionado(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            {trabajoSeleccionado && (() => {
              const esMiPublicacion = trabajoSeleccionado.solicitanteId === usuarioId;
              const estaBloqueadaPorAceptado = Boolean(trabajoSeleccionado.tieneAceptado);

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

                    {trabajoSeleccionado.imagenes && trabajoSeleccionado.imagenes.length > 0 && (
                      <View style={styles.detailImagesContainer}>
                        <Text style={styles.detailSectionTitle}>
                          Fotos adjuntas ({trabajoSeleccionado.imagenes.length})
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.detailImagesScroll}>
                          {trabajoSeleccionado.imagenes.map((imgUri, idx) => {
                            const cleanUri = String(imgUri).replace(/[{}"']/g, '').trim();
                            return (
                              <View key={idx} style={styles.detailImageCard}>
                                <Image source={{ uri: cleanUri }} style={styles.detailImage} resizeMode="cover" />
                              </View>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}

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
                        <Text style={styles.detailMetaLabel}>DISTANCIA</Text>
                        <Text style={styles.detailDate}>{formatearDistancia(trabajoSeleccionado.distanciaKm)}</Text>
                      </View>
                    </View>

                    <Text style={styles.detailSectionTitle}>Publicado por</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.userRowDetail}
                      onPress={() => handleVerSolicitante(trabajoSeleccionado.solicitanteId)}
                    >
                      <View style={styles.userLeftInfo}>
                        <View style={styles.userAvatarDetail}>
                          {trabajoSeleccionado.avatarUrl ? (
                            <Image source={{ uri: trabajoSeleccionado.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                          ) : (
                            <Ionicons name="person" size={18} color={colors.textPrimary} />
                          )}
                        </View>
                        <View>
                          <Text style={styles.userNameDetail}>
                            {esMiPublicacion ? 'Tú (Publicación propia)' : trabajoSeleccionado.solicitante}
                          </Text>
                          <Text style={styles.userSubDetail}>Toca para ver perfil y reputación</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </TouchableOpacity>

                    <Text style={styles.detailSectionTitle}>Descripción</Text>
                    <Text style={styles.detailBodyText}>{trabajoSeleccionado.descripcion}</Text>
                  </ScrollView>

                  <View style={styles.detailActionContainer}>
                    {esMiPublicacion ? (
                      <View style={styles.ownerBox}>
                        {estaBloqueadaPorAceptado ? (
                          <View style={styles.lockedWarningWrap}>
                            <Ionicons name="shield-checkmark" size={20} color="#eab308" />
                            <Text style={styles.lockedWarningText}>
                              🔒 Esta publicación tiene un trabajador aceptado. La edición y eliminación están bloqueadas para resguardar la labor acordada.
                            </Text>
                          </View>
                        ) : (
                          <>
                            <Text style={styles.ownerText}>
                              Eres el creador de esta publicación. Puedes gestionarla mientras no hayas aceptado a un postulante.
                            </Text>
                            <View style={styles.ownerButtonsRow}>
                              <TouchableOpacity
                                style={styles.btnEditOwner}
                                activeOpacity={0.8}
                                onPress={() => handleAbrirEdicion(trabajoSeleccionado)}
                              >
                                <Ionicons name="pencil" size={16} color={colors.accentBlue} />
                                <Text style={styles.btnEditOwnerText}>Editar tarea</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.btnDeleteOwner}
                                activeOpacity={0.8}
                                onPress={() => handleEliminarPropia(trabajoSeleccionado)}
                              >
                                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                <Text style={styles.btnDeleteOwnerText}>Eliminar</Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        )}
                      </View>
                    ) : (
                      <>
                        {/* Estado: Postulación Rechazada */}
                        {trabajoSeleccionado.estado === 'rechazado' && (
                          <View style={styles.rejectedActionWrap}>
                            <Ionicons name="close-circle" size={20} color="#ef4444" />
                            <Text style={styles.rejectedActionText}>
                              El solicitante ha seleccionado a otro postulante para esta tarea. Revisa otras labores disponibles en tu sector.
                            </Text>
                          </View>
                        )}

                        {/* Estado: Tarea ya asignada a otro usuario */}
                        {trabajoSeleccionado.estado === 'disponible' && estaBloqueadaPorAceptado && (
                          <View style={styles.lockedWarningWrap}>
                            <Ionicons name="lock-closed" size={18} color="#eab308" />
                            <Text style={styles.lockedWarningText}>
                              Esta labor ya cuenta con un postulante aceptado y no recibe nuevas solicitudes.
                            </Text>
                          </View>
                        )}

                        {/* Estado: Disponible para postular */}
                        {trabajoSeleccionado.estado === 'disponible' && !estaBloqueadaPorAceptado && (
                          <TouchableOpacity
                            style={styles.btnPrimaryAction}
                            activeOpacity={0.85}
                            onPress={() => handlePostular(trabajoSeleccionado)}
                            disabled={postulandoEnCurso}
                          >
                            {postulandoEnCurso ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <>
                                <Ionicons name="hand-right-outline" size={18} color="#ffffff" />
                                <Text style={styles.btnActionText}>Postular a este trabajo</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}

                        {/* Estado: En espera de respuesta */}
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

                        {/* Estado: Aceptado */}
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
                      </>
                    )}
                  </View>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </View>
      )}

      {/* 5. MODAL DE EDICIÓN PARA EL CREADOR */}
      {(modalEditarVisible) && (
        <View style={CAPA_COMPLETA}>
        <Pressable style={styles.dropdownOverlay} onPress={() => setModalEditarVisible(false)}>
          <Pressable style={styles.dropdownModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Editar Publicación</Text>
              <TouchableOpacity onPress={() => setModalEditarVisible(false)}>
                <Ionicons name="close-circle" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.editLabel}>Título del trabajo</Text>
              <View style={styles.editInputWrap}>
                <TextInput
                  style={styles.editInputField}
                  value={editTitulo}
                  onChangeText={setEditTitulo}
                  maxLength={80}
                  placeholder="Título..."
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <Text style={styles.editLabel}>Pago ofrecido (CLP)</Text>
              <View style={styles.editInputWrap}>
                <TextInput
                  style={styles.editInputField}
                  value={editMonto}
                  onChangeText={setEditMonto}
                  keyboardType="numeric"
                  placeholder="Ej: 15000"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <Text style={styles.editLabel}>Descripción y requerimientos</Text>
              <View style={[styles.editInputWrap, styles.editTextAreaWrap]}>
                <TextInput
                  style={[styles.editInputField, { height: '100%' }]}
                  value={editDescripcion}
                  onChangeText={setEditDescripcion}
                  multiline
                  numberOfLines={4}
                  placeholder="Descripción detallada..."
                  placeholderTextColor={colors.textMuted}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.btnApply, { height: 44, marginTop: 10 }]}
                activeOpacity={0.85}
                onPress={handleGuardarEdicion}
                disabled={guardandoEdicion}
              >
                {guardandoEdicion ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.btnApplyText}>Guardar Cambios</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </View>
      )}

      {/* 6. MODAL PERFIL DEL SOLICITANTE */}
      {(solicitanteModal !== null || cargandoSolicitante) && (
        <View style={CAPA_COMPLETA}>
        <Pressable style={styles.dropdownOverlay} onPress={() => setSolicitanteModal(null)}>
          <Pressable style={styles.solicitanteModalBox} onPress={(e) => e.stopPropagation()}>
            {cargandoSolicitante ? (
              <ActivityIndicator size="small" color={colors.accentBlue} style={{ padding: 30 }} />
            ) : (
              solicitanteModal && (
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
                                <Ionicons key={i} name="star" size={11} color="#eab308" />
                              ))}
                            </View>
                          </View>
                          <Text style={styles.solicitanteReviewComment}>{r.comentario}</Text>
                        </View>
                      ))
                    )}
                  </ScrollView>
                </>
              )
            )}
          </Pressable>
        </Pressable>
      </View>
      )}

      {/* 7. MODAL DE FILTROS DINÁMICOS */}
      {(modalFiltrosVisible) && (
        <View style={CAPA_COMPLETA}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalFiltrosVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filtrar búsqueda</Text>
              <TouchableOpacity onPress={() => setModalFiltrosVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
              <Text style={styles.filterSectionTitle}>Tipo de tarea</Text>
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
                <Text style={styles.filterSectionTitle}>Radio de distancia</Text>
                <Text style={styles.sliderValueBadge}>
                  {radioDistanciaKm ? `Hasta ${radioDistanciaKm} km` : 'Sin límite'}
                </Text>
              </View>
              <View style={styles.sliderStepsRow}>
                {RADIOS_OPCIONES.map((opt) => {
                  const isActive = radioDistanciaKm === opt.valor;
                  return (
                    <TouchableOpacity
                      key={opt.label}
                      style={[styles.stepItem, isActive && styles.stepItemActive]}
                      onPress={() => setRadioDistanciaKm(opt.valor)}
                    >
                      <Text style={[styles.stepText, isActive && styles.stepTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.filterSectionTitle}>Rango de pago (CLP)</Text>
              <View style={styles.rangeSliderContainer}>
                <View style={styles.rangeValuesRow}>
                  <View style={styles.rangeValueBox}>
                    <Text style={styles.rangeValueLabel}>MÍNIMO</Text>
                    <Text style={styles.rangeValueText}>${montoMinimo.toLocaleString('es-CL')}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
                  <View style={styles.rangeValueBox}>
                    <Text style={styles.rangeValueLabel}>MÁXIMO</Text>
                    <Text style={styles.rangeValueText}>
                      {montoMaximo >= MONTO_MAX_BASE ? 'Sin límite' : `$${montoMaximo.toLocaleString('es-CL')}`}
                    </Text>
                  </View>
                </View>

                <View
                  style={styles.rangeTrackWrap}
                  onLayout={(e) => {
                    const w = e.nativeEvent.layout.width;
                    if (w > 0) {
                      sliderWidthRef.current = w;
                      maxPosRef.current = w;
                    }
                  }}
                >
                  <View style={styles.rangeTrackBackground} />
                  <View style={[styles.rangeTrackFill, { left: leftPx, width: widthPx }]} />

                  <View
                    style={[styles.thumbTouchZone, { left: leftPx }]}
                    {...panResponderMin.panHandlers}
                  >
                    <View style={styles.thumbKnob} />
                  </View>

                  <View
                    style={[styles.thumbTouchZone, { left: rightPx }]}
                    {...panResponderMax.panHandlers}
                  >
                    <View style={styles.thumbKnob} />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={styles.btnReset}
                onPress={limpiarFiltros}
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
      {dropdownVisible !== 'ninguno' && (
<View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
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
      </View>
)}
      </View>
      )}

      {/* 9. MODAL DE ALERTA PERSONALIZADO */}
      {(alerta.visible) && (
        <View style={CAPA_COMPLETA}>
        <Pressable style={styles.dropdownOverlay} onPress={cerrarAlerta}>
          <Pressable style={styles.customAlertBox} onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.customAlertIconWrap,
                {
                  backgroundColor:
                    alerta.tipo === 'exito'
                      ? 'rgba(34, 197, 94, 0.15)'
                      : alerta.tipo === 'error'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : alerta.tipo === 'confirmar'
                      ? 'rgba(234, 179, 8, 0.15)'
                      : 'rgba(59, 130, 246, 0.15)',
                },
              ]}
            >
              <Ionicons
                name={
                  alerta.tipo === 'exito'
                    ? 'checkmark-circle'
                    : alerta.tipo === 'error'
                    ? 'alert-circle'
                    : alerta.tipo === 'confirmar'
                    ? 'help-circle'
                    : 'information-circle'
                }
                size={32}
                color={
                  alerta.tipo === 'exito'
                    ? colors.accentGreen
                    : alerta.tipo === 'error'
                    ? '#ef4444'
                    : alerta.tipo === 'confirmar'
                    ? '#eab308'
                    : colors.accentBlue
                }
              />
            </View>

            <Text style={styles.customAlertTitle}>{alerta.titulo}</Text>
            <Text style={styles.customAlertMessage}>{alerta.mensaje}</Text>

            <View style={styles.customAlertButtonsRow}>
              {alerta.tipo === 'confirmar' && (
                <TouchableOpacity
                  style={styles.btnCustomAlertCancel}
                  onPress={() => {
                    cerrarAlerta();
                    if (alerta.onCancelar) alerta.onCancelar();
                  }}
                >
                  <Text style={styles.btnCustomAlertCancelText}>
                    {alerta.textoCancelar || 'Cancelar'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.btnCustomAlertConfirm,
                  alerta.tipo === 'error' && { backgroundColor: '#ef4444' },
                ]}
                onPress={() => {
                  cerrarAlerta();
                  if (alerta.onConfirmar) alerta.onConfirmar();
                }}
              >
                <Text style={styles.btnCustomAlertConfirmText}>
                  {alerta.textoConfirmar || 'Entendido'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </View>
      )}
        </View>
      </Modal>
    </View>
  );
}