import React, { useState, useCallback, useRef } from 'react';
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { styles } from '../styles/PublicarStyles';
import { supabase } from '../services/supabase';
import {
  COSTO_DESTACAR,
  limpiarMontoChileno,
  formatearMonedaCLP,
  validarFormularioPublicar,
  subirImagenTrabajoStorage,
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
}

const URGENCIAS = ['Hoy mismo', 'Mañana', 'Este fin de semana', 'A coordinar'];

export default function PublicarScreen() {
  const scrollRef = useRef<ScrollView>(null);

  const [refrescando, setRefrescando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [urgencia, setUrgencia] = useState('Hoy mismo');
  const [imagenes, setImagenes] = useState<ImagenLocal[]>([]);

  const [listaCategorias, setListaCategorias] = useState<CategoriaItem[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<CategoriaItem | null>(null);

  const [listaComunas, setListaComunas] = useState<ComunaItem[]>([]);
  const [comunaSeleccionada, setComunaSeleccionada] = useState<ComunaItem | null>(null);

  const [creditosDisponibles, setCreditosDisponibles] = useState(10);
  const [destacarConCreditos, setDestacarConCreditos] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);

  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState<'ninguno' | 'categoria' | 'comuna'>('ninguno');
  const [resumenExito, setResumenExito] = useState<ResumenPublicacion | null>(null);

  const cargarCatalogosYCreditos = useCallback(async () => {
    try {
      const { data: catData, error: errCat } = await supabase
        .from('categorias')
        .select('id, nombre, icono')
        .order('id', { ascending: true });

      if (!errCat && catData && catData.length > 0) {
        setListaCategorias(catData);
        setCategoriaSeleccionada((prev) => prev ?? catData[0]);
      }

      const { data: comData, error: errCom } = await supabase
        .from('comunas')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (!errCom && comData && comData.length > 0) {
        setListaComunas(comData);
        setComunaSeleccionada((prev) => prev ?? comData[0]);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: perfilData } = await supabase
          .from('perfiles')
          .select('creditos')
          .eq('id', user.id)
          .single();

        if (perfilData?.creditos !== undefined) {
          setCreditosDisponibles(perfilData.creditos);
        }
      }
    } catch {
      setMensajeError('No se pudo conectar con el catálogo de datos.');
    } finally {
      setCargandoCatalogos(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefrescando(true);
    setTitulo('');
    setMonto('');
    setDescripcion('');
    setImagenes([]);
    setUrgencia('Hoy mismo');
    setDestacarConCreditos(false);
    setMensajeError(null);

    await cargarCatalogosYCreditos();
    setRefrescando(false);
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
      base64: true, // <-- Entrega el Base64 como se hizo en Perfil
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

  const handleToggleDestacar = (value: boolean) => {
    if (value && creditosDisponibles < COSTO_DESTACAR) {
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

    const validacion = validarFormularioPublicar(
      titulo,
      monto,
      descripcion,
      categoriaSeleccionada?.id,
      comunaSeleccionada?.id,
      destacarConCreditos,
      creditosDisponibles
    );

    if (!validacion.valido) {
      setMensajeError(validacion.error!);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setPublicando(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMensajeError('Tu sesión ha expirado. Vuelve a iniciar sesión.');
        setPublicando(false);
        return;
      }

      // Sube a Supabase Storage con decodificación Base64 directa
      const uploadPromises = imagenes.map((img) => subirImagenTrabajoStorage(img.base64, user.id));
      const urlsPublicas = (await Promise.all(uploadPromises)).filter(Boolean) as string[];

      const montoNumerico = limpiarMontoChileno(monto);

      const { error: insertError } = await supabase.from('trabajos').insert({
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
      });

      if (insertError) {
        setMensajeError(`Error en el servidor: ${insertError.message}`);
        setPublicando(false);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        return;
      }

      if (destacarConCreditos) {
        const nuevoSaldo = creditosDisponibles - COSTO_DESTACAR;
        const { error: creditosError } = await supabase
          .from('perfiles')
          .update({ creditos: nuevoSaldo })
          .eq('id', user.id);

        if (!creditosError) {
          setCreditosDisponibles(nuevoSaldo);
        }
      }

      setResumenExito({
        titulo: titulo.trim(),
        categoria: categoriaSeleccionada!.nombre,
        monto: montoNumerico,
        comuna: comunaSeleccionada!.nombre,
        destacado: destacarConCreditos,
      });

      setTitulo('');
      setMonto('');
      setDescripcion('');
      setImagenes([]);
      setDestacarConCreditos(false);
      setMensajeError(null);
    } catch (e: any) {
      setMensajeError(e?.message || 'Error inesperado al publicar.');
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
            <Text style={styles.creditsText}>{creditosDisponibles} créditos</Text>
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
          disabled={cargandoCatalogos}
        >
          <View style={styles.dropdownInner}>
            <Ionicons
              name={(categoriaSeleccionada?.icono as any) || 'briefcase-outline'}
              size={18}
              color={colors.accentBlue}
            />
            <Text style={styles.dropdownText}>
              {categoriaSeleccionada?.nombre || 'Cargando categorías...'}
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
          Comuna <Text style={styles.requiredAsterisk}>*</Text>
        </Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          activeOpacity={0.7}
          onPress={() => setModalVisible('comuna')}
          disabled={cargandoCatalogos}
        >
          <View style={styles.dropdownInner}>
            <Ionicons name="navigate-outline" size={18} color={colors.accentBlue} />
            <Text style={styles.dropdownText}>
              {comunaSeleccionada?.nombre || 'Cargando comunas...'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </TouchableOpacity>

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
          disabled={publicando || cargandoCatalogos}
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

      {/* MODAL SELECTORES */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible !== 'ninguno'}
        onRequestClose={() => setModalVisible('ninguno')}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible('ninguno')}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalVisible === 'categoria' ? 'Seleccionar Categoría' : 'Seleccionar Comuna'}
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