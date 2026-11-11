import React, { useState, useCallback, useRef, useEffect } from 'react';
import EstadoListaRemota from '../components/EstadoListaRemota';
import { useListaRemota } from '../hooks/useListaRemota';
import { fetchCategoriasFiltro, fetchComunasFiltro } from '../services/catalogos';
import { fetchCreditosPublicar } from '../services/perfiles';
import {
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { styles } from '../styles/PublicarStyles';
import { supabase } from '../services/supabase';
import { solicitarPermisoUbicacionAproximada } from '../services/permisosUbicacion';
import { aproximarUbicacion } from '../utils/ubicacion';
import {
  COSTO_DESTACAR,
  limpiarMontoChileno,
  formatearMonedaCLP,
  validarFormularioPublicar,
  subirImagenTrabajoStorage,
  esUbicacionEnRM,
} from '../utils/functionsPublicar';

interface CategoriaItem {
  id: number;
  nombre: string;
  icono?: string;
}

interface ComunaItem {
  id: number;
  nombre: string;
}

interface ImagenLocal {
  uri: string;
  base64: string;
}

interface ResumenPublicacion {
  titulo: string;
  categoria: string;
  monto: number;
  comuna: string;
  destacado: boolean;
  coordenadas?: { latitude: number; longitude: number } | null;
}

interface TrabajoNuevo {
  user_id: string; titulo: string; descripcion: string; requisitos: string;
  categoria_id: number; comuna_id: number; monto: number; destacado: boolean;
  estado: 'disponible'; imagenes: string[]; latitud?: number; longitud?: number;
}

const URGENCIAS = ['Hoy mismo', 'Mañana', 'Este fin de semana', 'A coordinar'];

export default function PublicarScreen() {
  const scrollRef=
    useRef<React.ComponentRef<typeof ScrollView>>(null);

  const [refrescando, setRefrescando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [urgencia, setUrgencia] = useState('Hoy mismo');
  const [imagenes, setImagenes] = useState<ImagenLocal[]>([]);

  const {
    datos: listaCategorias, estado: estadoCategorias,
    error: errorCategorias, cargar: cargarCategorias,
  } = useListaRemota<CategoriaItem>(fetchCategoriasFiltro, 'No pudimos cargar las categorías. Revisa tu conexión e inténtalo nuevamente.');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<CategoriaItem | null>(null);

  const {
    datos: listaComunas, estado: estadoComunas,
    error: errorComunas, cargar: cargarComunas,
  } = useListaRemota<ComunaItem>(fetchComunasFiltro, 'No pudimos cargar las comunas. Revisa tu conexión e inténtalo nuevamente.');
  const [comunaSeleccionada, setComunaSeleccionada] = useState<ComunaItem | null>(null);

  // Estados de GPS
  const [coordenadas, setCoordenadas] = useState<{ latitude: number; longitude: number } | null>(null);
  const [obteniendoGPS, setObteniendoGPS] = useState(false);
  const [infoGPS, setInfoGPS] = useState<string | null>(null);

  const [creditosDisponibles, setCreditosDisponibles] = useState<number | null>(null);
  const [cargandoSaldo, setCargandoSaldo] = useState(true);
  const [errorSaldo, setErrorSaldo] = useState<string | null>(null);
  const solicitudSaldoRef = useRef(0);
  useEffect(() => () => { solicitudSaldoRef.current += 1; }, []);
  const [destacarConCreditos, setDestacarConCreditos] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const categoriasDisponibles = estadoCategorias === 'lista' && listaCategorias.length > 0;
  const comunasDisponibles = estadoComunas === 'lista' && listaComunas.length > 0;
  const erroresCarga = [
    estadoCategorias === 'error' ? errorCategorias : null,
    estadoComunas === 'error' ? errorComunas : null,
    estadoCategorias === 'lista' && listaCategorias.length === 0
      ? 'No hay categorías disponibles para publicar.' : null,
    estadoComunas === 'lista' && listaComunas.length === 0
      ? 'No hay comunas disponibles para publicar.' : null,
    errorSaldo,
  ].filter((mensaje): mensaje is string => mensaje !== null);
  const errorCarga = erroresCarga.length > 1
    ? 'No pudimos cargar todos los datos para publicar. Revisa tu conexión e inténtalo nuevamente.'
    : erroresCarga[0] ?? null;
  const catalogosListos = estadoCategorias === 'lista' && estadoComunas === 'lista'
    && listaCategorias.some(c => c.id === categoriaSeleccionada?.id)
    && listaComunas.some(c => c.id === comunaSeleccionada?.id);
  const estadoFormulario = errorCarga
    ? 'error'
    : cargandoSaldo || !catalogosListos ? 'cargando' : 'lista';

  useEffect(() => {
    if (estadoCategorias === 'lista') {
      setCategoriaSeleccionada(prev => listaCategorias.find(c => c.id === prev?.id) ?? listaCategorias[0] ?? null);
    }
  }, [listaCategorias, estadoCategorias]);

  useEffect(() => {
    if (estadoComunas === 'lista') {
      setComunaSeleccionada(prev => listaComunas.find(c => c.id === prev?.id) ?? listaComunas[0] ?? null);
    }
  }, [listaComunas, estadoComunas]);

  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState<'ninguno' | 'categoria' | 'comuna'>('ninguno');
  const [resumenExito, setResumenExito] = useState<ResumenPublicacion | null>(null);

  const cargarCreditos = useCallback(async () => {
    const solicitud = ++solicitudSaldoRef.current;
    setCargandoSaldo(true);
    setCreditosDisponibles(null);
    setErrorSaldo(null);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw new Error('No se pudo verificar la sesión.');
      const saldo = await fetchCreditosPublicar(user.id);
      if (solicitud === solicitudSaldoRef.current) {
        setCreditosDisponibles(saldo);
      }
    } catch {
      if (solicitud === solicitudSaldoRef.current) {
        setErrorSaldo('No pudimos cargar tu saldo. Revisa tu conexión e inténtalo nuevamente.');
        setDestacarConCreditos(false);
      }
    } finally {
      if (solicitud === solicitudSaldoRef.current) setCargandoSaldo(false);
    }
  }, []);

  const cargarCatalogosYCreditos = useCallback(async () => {
    setModalVisible('ninguno');
    await Promise.all([cargarCategorias('catalogo'), cargarComunas('catalogo'), cargarCreditos()]);
  }, [cargarCategorias, cargarComunas, cargarCreditos]);

  const onRefresh = useCallback(async () => {
    setRefrescando(true);
    try { await cargarCatalogosYCreditos(); }
    finally { setRefrescando(false); }
  }, [cargarCatalogosYCreditos]);

  useFocusEffect(
    useCallback(() => {
      cargarCatalogosYCreditos();
    }, [cargarCatalogosYCreditos])
  );

  const handlePickImage = async () => {
    if (imagenes.length >= 3) {
      setMensajeError('Límite alcanzado: máximo 3 imágenes por trabajo.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setMensajeError('Se requiere permiso para acceder a la galería de fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets[0]?.uri && result.assets[0]?.base64) {
      setMensajeError(null);
      setImagenes((prev) => [
        ...prev,
        { uri: result.assets[0].uri, base64: result.assets[0].base64! },
      ]);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImagenes((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleObtenerUbicacionGPS = async () => {
    if (obteniendoGPS) return;

    setMensajeError(null);
    setCoordenadas(null);
    setInfoGPS(null);
    setObteniendoGPS(true);

    try {
      const permiso = await solicitarPermisoUbicacionAproximada();
      if (!permiso.granted) {
        Alert.alert(
          'Ubicación opcional',
          'Puedes permitir la ubicación aproximada o publicar seleccionando únicamente la comuna.'
        );
        return;
      }

      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });

      if (!esUbicacionEnRM(
        posicion.coords.latitude,
        posicion.coords.longitude
      )) {
        Alert.alert(
          'Zona no habilitada',
          'La ubicación recibida está fuera de la zona habilitada. Selecciona la comuna para publicar sin GPS.'
        );
        return;
      }

      const zona = aproximarUbicacion({
        latitude: posicion.coords.latitude,
        longitude: posicion.coords.longitude,
      });

      // Conservar y consultar únicamente la zona aproximada.
      setCoordenadas(zona);
      setInfoGPS('Zona aproximada. Revisa la comuna seleccionada.');

      try {
        const geocodigos = await Location.reverseGeocodeAsync(zona);
        const normalizar = (nombre: string) => {
          const valor = nombre.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, '');
          return valor === 'santiago' ? 'santiagocentro' : valor;
        };

        for (const direccion of geocodigos) {
          const nombres = [
            direccion.district,
            direccion.city,
            direccion.subregion,
          ];

          for (const nombre of nombres) {
            if (!nombre) continue;
            const comuna = listaComunas.find(c =>
              normalizar(c.nombre) === normalizar(nombre)
            );

            if (comuna) {
              setComunaSeleccionada(comuna);
              setInfoGPS(`Zona aproximada de ${comuna.nombre}.`);
              return;
            }
          }
        }
      } catch {
        // La zona sigue disponible si no se pudo identificar la comuna.
      }
    } catch {
      Alert.alert(
        'Ubicación no disponible',
        'No pudimos obtener tu ubicación aproximada. Puedes seleccionar la comuna y publicar sin GPS.'
      );
    } finally {
      setObteniendoGPS(false);
    }
  };


  const handleToggleDestacar = (value: boolean) => {
    if (value && (cargandoSaldo || creditosDisponibles === null)) {
      setMensajeError('Carga tu saldo antes de destacar la publicación.');
      return;
    }
    if (value && (creditosDisponibles ?? 0) < COSTO_DESTACAR) {
      setMensajeError(
        `Créditos insuficientes: necesitas ${COSTO_DESTACAR} créditos y tu saldo es ${creditosDisponibles}.`
      );
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setMensajeError(null);
    setDestacarConCreditos(value);
  };

  const handlePublicar = async () => {
    setMensajeError(null);

    if (estadoFormulario !== 'lista') {
      setMensajeError('Carga los datos necesarios antes de publicar.');
      return;
    }

    const validacion = validarFormularioPublicar(
      titulo,
      monto,
      descripcion,
      categoriaSeleccionada?.id,
      comunaSeleccionada?.id,
      destacarConCreditos,
      creditosDisponibles ?? 0,
      coordenadas
    );

    if (!validacion.valido) {
      setMensajeError(validacion.error!);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setPublicando(true);

    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        setMensajeError('No pudimos verificar tu sesión para publicar. Revisa tu conexión e inténtalo nuevamente.');
        setPublicando(false);
        return;
      }

      const uploadPromises = imagenes.map((img) => subirImagenTrabajoStorage(img.base64, user.id));
      const urlsPublicas = (await Promise.all(uploadPromises)).filter(Boolean);

      const montoNumerico = limpiarMontoChileno(monto);

      const nuevoTrabajo: TrabajoNuevo = {
        user_id: user.id,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        requisitos: descripcion.trim(),
        categoria_id: categoriaSeleccionada!.id,
        comuna_id: comunaSeleccionada!.id,
        monto: montoNumerico,
        destacado: destacarConCreditos,
        estado: 'disponible',
        imagenes: urlsPublicas,
      };

      const zonaPublicada = coordenadas
        ? aproximarUbicacion(coordenadas)
        : null;

      if (zonaPublicada) {
        nuevoTrabajo.latitud = zonaPublicada.latitude;
        nuevoTrabajo.longitud = zonaPublicada.longitude;
      }

      const { error: insertError } = await supabase.from('trabajos').insert(nuevoTrabajo);

      if (insertError) {
        setMensajeError(`Error en el servidor: ${insertError.message}`);
        setPublicando(false);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        return;
      }

      // La tarea ya está guardada; un fallo al leer el saldo se muestra aparte.
      await cargarCreditos();

      setResumenExito({
        titulo: titulo.trim(),
        categoria: categoriaSeleccionada!.nombre,
        monto: montoNumerico,
        comuna: comunaSeleccionada!.nombre,
        destacado: destacarConCreditos,
        coordenadas: zonaPublicada,
      });

      setTitulo('');
      setMonto('');
      setDescripcion('');
      setImagenes([]);
      setCoordenadas(null);
      setInfoGPS(null);
      setDestacarConCreditos(false);
      setMensajeError(null);
    } catch (error: unknown) {
      setMensajeError(error instanceof Error ? error.message : 'Error inesperado al publicar.');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } finally {
      setPublicando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
    >
      <EstadoListaRemota
        estado={estadoFormulario}
        error={errorCarga}
        onReintentar={() => void cargarCatalogosYCreditos()}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={onRefresh}
              colors={[colors.accentBlue]}
              tintColor={colors.accentBlue}
            />
          }
        >
          <View style={styles.headerRow}>
            <Text style={styles.sectionHeader}>Detalles del trabajo</Text>
            <View style={styles.creditsBadge}>
              <Ionicons name="sparkles" size={13} color="#eab308" />
              <Text style={styles.creditsText}>
                {cargandoSaldo ? 'Actualizando saldo…' : creditosDisponibles === null ? 'Saldo sin actualizar' : `${creditosDisponibles} créditos`}
              </Text>
            </View>
          </View>

          {mensajeError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.errorBannerText}>{mensajeError}</Text>
              <TouchableOpacity onPress={() => setMensajeError(null)}>
                <Ionicons name="close" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.label}>
            Título del trabajo <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Ej: Armado de mueble de dos puertas (Mín. 6 letras)"
              placeholderTextColor={colors.textSecondary}
              value={titulo}
              maxLength={80}
              onChangeText={(txt) => {
                setTitulo(txt);
                if (mensajeError) setMensajeError(null);
              }}
            />
          </View>

          <View style={styles.imageSectionHeader}>
            <Text style={styles.label}>Fotos referenciales (Opcional, máx. 3)</Text>
            <Text style={styles.counterText}>{imagenes.length}/3</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {imagenes.map((img, idx) => (
              <View key={idx} style={styles.imageThumbnailWrap}>
                <Image source={{ uri: img.uri }} style={styles.thumbnailImage} />
                <TouchableOpacity
                  style={styles.btnRemoveImage}
                  onPress={() => handleRemoveImage(idx)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={14} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}

            {imagenes.length < 3 && (
              <TouchableOpacity
                style={styles.btnAddImage}
                onPress={handlePickImage}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-outline" size={22} color={colors.accentBlue} />
                <Text style={styles.btnAddImageText}>Agregar foto</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <Text style={styles.label}>
            Categoría <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            activeOpacity={0.7}
            onPress={() => setModalVisible('categoria')}
            disabled={!categoriasDisponibles || publicando}
          >
            <View style={styles.dropdownInner}>
              <Ionicons
                name={(categoriaSeleccionada?.icono as any) || 'briefcase-outline'}
                size={18}
                color={colors.accentBlue}
              />
              <Text style={styles.dropdownText}>
                {categoriasDisponibles
                  ? categoriaSeleccionada?.nombre ?? 'Seleccionar categoría'
                  : estadoCategorias === 'error' || estadoCategorias === 'lista'
                    ? 'Categorías no disponibles'
                    : 'Cargando categorías...'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <Text style={styles.label}>
            Pago ofrecido (CLP) <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={styles.inputWrap}>
            <Text style={styles.currencyPrefix}>$</Text>
            <TextInput
              style={[styles.input, { paddingLeft: 4 }]}
              placeholder="Mínimo 5000 (Ej: 15000)"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              value={monto}
              maxLength={9}
              onChangeText={(txt) => {
                setMonto(txt);
                if (mensajeError) setMensajeError(null);
              }}
            />
          </View>
          <Text style={styles.helperText}>
            * El pago se efectúa directamente al ejecutor una vez terminada la labor.
          </Text>

          <Text style={styles.label}>
            Ubicación del trabajo (Región Metropolitana) <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={styles.locationRow}>
            <View style={styles.dropdownButtonFlex}>
              <TouchableOpacity
                style={styles.dropdownButton}
                activeOpacity={0.7}
                onPress={() => setModalVisible('comuna')}
                disabled={!comunasDisponibles || publicando}
              >
                <View style={styles.dropdownInner}>
                  <Ionicons name="navigate-outline" size={18} color={colors.accentBlue} />
                  <Text style={styles.dropdownText}>
                    {comunasDisponibles
                      ? comunaSeleccionada?.nombre ?? 'Seleccionar comuna'
                      : estadoComunas === 'error' || estadoComunas === 'lista'
                        ? 'Comunas no disponibles'
                        : 'Cargando comunas...'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.gpsButton, coordenadas && styles.gpsButtonActive]}
              activeOpacity={0.8}
              onPress={handleObtenerUbicacionGPS}
              accessibilityLabel="Usar ubicación aproximada"
              disabled={obteniendoGPS || estadoComunas !== 'lista' || listaComunas.length === 0}
            >
              {obteniendoGPS ? (
                <ActivityIndicator size="small" color={colors.accentBlue} />
              ) : (
                <Ionicons
                  name={coordenadas ? 'locate' : 'locate-outline'}
                  size={22}
                  color={coordenadas ? colors.accentBlue : colors.textPrimary}
                />
              )}
            </TouchableOpacity>
          </View>

          {coordenadas && (
            <View style={styles.gpsBadge}>
              <View style={styles.gpsBadgeContent}>
                <Ionicons name="location" size={14} color={colors.accentBlue} />
                <Text style={styles.gpsBadgeText} numberOfLines={1}>
                  {infoGPS || 'Zona aproximada seleccionada'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setCoordenadas(null); setInfoGPS(null); }}>
                <Ionicons name="close-circle" size={16} color={colors.accentBlue} />
              </TouchableOpacity>
            </View>
          )}

          {coordenadas && (
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 12 }}>
              Publicaremos un sector aproximado. Confirma que la comuna seleccionada sea la del trabajo.
            </Text>
          )}

          <Text style={styles.label}>¿Para cuándo lo necesitas?</Text>
          <View style={styles.chipsRow}>
            {URGENCIAS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.chip, urgencia === item && styles.chipActive]}
                onPress={() => setUrgencia(item)}
              >
                <Text style={[styles.chipText, urgencia === item && styles.chipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>
            Descripción y requerimientos <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={[styles.inputWrap, styles.textAreaWrap]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Indica qué hay que hacer, si se requiere traer herramientas o consideraciones de acceso (Mín. 20 caracteres)..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              value={descripcion}
              maxLength={2000}
              onChangeText={(txt) => {
                setDescripcion(txt);
                if (mensajeError) setMensajeError(null);
              }}
              textAlignVertical="top"
            />
          </View>

          <View style={[styles.promoCard, destacarConCreditos && styles.promoCardActive]}>
            <View style={styles.promoHeader}>
              <View style={styles.promoTitleWrap}>
                <Ionicons
                  name={destacarConCreditos ? 'flash' : 'flash-outline'}
                  size={18}
                  color={destacarConCreditos ? '#eab308' : colors.textSecondary}
                />
                <Text style={styles.promoTitle}>Destacar publicación</Text>
                <View style={styles.promoCostBadge}>
                  <Text style={styles.promoCostText}>{COSTO_DESTACAR} créditos</Text>
                </View>
              </View>

              <Switch
                value={destacarConCreditos}
                disabled={publicando || cargandoSaldo || creditosDisponibles === null}
                onValueChange={handleToggleDestacar}
                trackColor={{ false: colors.surfaceLight, true: colors.accentBlueBg }}
                thumbColor={destacarConCreditos ? colors.accentBlue : colors.textMuted}
              />
            </View>
            <Text style={styles.promoDescription}>
              Fija este trabajo al inicio de la lista de búsquedas para encontrar postulantes de forma prioritaria.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              destacarConCreditos && styles.submitButtonFeatured,
              publicando && styles.submitButtonDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handlePublicar}
            disabled={publicando || !catalogosListos || (destacarConCreditos && (cargandoSaldo || creditosDisponibles === null))}
          >
            {publicando ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons
                  name={destacarConCreditos ? 'sparkles' : 'paper-plane-outline'}
                  size={19}
                  color="#ffffff"
                />
                <Text style={styles.submitButtonText}>
                  {destacarConCreditos ? 'Publicar como Destacado' : 'Publicar mini-trabajo'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </EstadoListaRemota>

      {/* MODAL SELECTORES */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={estadoFormulario === 'lista' && modalVisible !== 'ninguno'}
        onRequestClose={() => setModalVisible('ninguno')}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible('ninguno')}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalVisible === 'categoria' ? 'Seleccionar Categoría' : 'Seleccionar Comuna (RM)'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible('ninguno')}>
                <Ionicons name="close-circle" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {modalVisible === 'categoria' ? (
              <FlatList
                data={listaCategorias}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = categoriaSeleccionada?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.modalItem, isSelected && styles.modalItemActive]}
                      onPress={() => {
                        setCategoriaSeleccionada(item);
                        setModalVisible('ninguno');
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons
                          name={(item.icono as any) || 'briefcase-outline'}
                          size={18}
                          color={isSelected ? colors.accentBlue : colors.textSecondary}
                        />
                        <Text style={[styles.modalItemText, isSelected && styles.modalItemTextActive]}>
                          {item.nombre}
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark" size={18} color={colors.accentBlue} />}
                    </TouchableOpacity>
                  );
                }}
              />
            ) : (
              <FlatList
                data={listaComunas}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = comunaSeleccionada?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.modalItem, isSelected && styles.modalItemActive]}
                      onPress={() => {
                        setComunaSeleccionada(item);
                        setModalVisible('ninguno');
                      }}
                    >
                      <Text style={[styles.modalItemText, isSelected && styles.modalItemTextActive]}>
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

      {/* MODAL ÉXITO */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={resumenExito !== null}
        onRequestClose={() => setResumenExito(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setResumenExito(null)}>
          <Pressable style={styles.successModalBox} onPress={(e) => e.stopPropagation()}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark" size={32} color={colors.accentGreen} />
            </View>

            <Text style={styles.successTitle}>¡Publicación Creada!</Text>
            <Text style={styles.successSubtitle}>
              {resumenExito?.destacado
                ? 'Tu trabajo se publicó con éxito y quedó en los primeros lugares de búsqueda.'
                : 'Tu oferta ya es visible para los postulantes en la comunidad.'}
            </Text>

            {resumenExito && (
              <View style={styles.successSummaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Título:</Text>
                  <Text style={styles.summaryVal} numberOfLines={1}>{resumenExito.titulo}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Categoría:</Text>
                  <Text style={styles.summaryVal}>{resumenExito.categoria}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Comuna:</Text>
                  <Text style={styles.summaryVal}>{resumenExito.comuna}</Text>
                </View>
                {resumenExito.coordenadas && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Ubicación:</Text>
                    <Text style={[styles.summaryVal, { color: colors.accentBlue }]}>
                      Zona aproximada
                    </Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Pago referencial:</Text>
                  <Text style={[styles.summaryVal, { color: colors.accentGreen }]}>
                    {formatearMonedaCLP(resumenExito.monto)}
                  </Text>
                </View>
                {resumenExito.destacado && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Créditos usados:</Text>
                    <Text style={[styles.summaryVal, { color: '#eab308' }]}>
                      -{COSTO_DESTACAR} créditos
                    </Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.btnSuccessDone}
              activeOpacity={0.85}
              onPress={() => setResumenExito(null)}
            >
              <Text style={styles.btnSuccessDoneText}>Entendido</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}
