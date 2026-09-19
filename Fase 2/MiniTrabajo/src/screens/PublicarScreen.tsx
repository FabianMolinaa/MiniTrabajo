import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';

const CATEGORIAS = [
  'Hogar',
  'Mascotas',
  'Flete',
  'Jardinería',
  'Tecnología',
  'Cuidado de personas',
];

const COMUNAS = [
  'Santiago Centro',
  'Providencia',
  'Las Condes',
  'Ñuñoa',
  'Estación Central',
  'Maipú',
  'La Florida',
  'San Miguel',
  'Macul',
];

const URGENCIAS = ['Hoy mismo', 'Mañana', 'Este fin de semana', 'A coordinar'];
const COSTO_DESTACAR = 5;

export default function PublicarScreen() {
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [monto, setMonto] = useState('');
  const [comuna, setComuna] = useState(COMUNAS[0]);
  const [descripcion, setDescripcion] = useState('');
  const [urgencia, setUrgencia] = useState('Hoy mismo');
  const [imagenes, setImagenes] = useState<string[]>([]);

  // Estado del sistema de monetización por créditos
  const [creditosDisponibles, setCreditosDisponibles] = useState(10);
  const [destacarConCreditos, setDestacarConCreditos] = useState(false);

  const [modalVisible, setModalVisible] = useState<'ninguno' | 'categoria' | 'comuna'>('ninguno');

  const handlePickImage = async () => {
    if (imagenes.length >= 3) {
      Alert.alert('Límite alcanzado', 'Puedes adjuntar un máximo de 3 imágenes por publicación.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para subir imágenes.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImagenes((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImagenes((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleToggleDestacar = (value: boolean) => {
    if (value && creditosDisponibles < COSTO_DESTACAR) {
      Alert.alert(
        'Créditos insuficientes',
        `Necesitas al menos ${COSTO_DESTACAR} créditos para destacar este trabajo. Tu saldo actual es ${creditosDisponibles}.`
      );
      return;
    }
    setDestacarConCreditos(value);
  };

  const handlePublicar = () => {
    if (!titulo.trim() || !monto.trim() || !descripcion.trim()) {
      Alert.alert('Campos requeridos', 'Por favor completa el título, el monto y la descripción.');
      return;
    }

    if (destacarConCreditos) {
      const nuevoSaldo = creditosDisponibles - COSTO_DESTACAR;
      setCreditosDisponibles(nuevoSaldo);
      Alert.alert(
        '¡Publicación destacada!',
        `Tu trabajo aparecerá en los primeros lugares con ${imagenes.length} imagen(es). Se descontaron ${COSTO_DESTACAR} créditos (Saldo restante: ${nuevoSaldo}).`
      );
    } else {
      Alert.alert(
        '¡Publicación lista!',
        `Tu tarea ha sido publicada con éxito (${imagenes.length} foto(s) adjunta(s)).`
      );
    }

    // Limpiar formulario
    setTitulo('');
    setMonto('');
    setDescripcion('');
    setImagenes([]);
    setDestacarConCreditos(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* CABECERA CON SALDO DE CRÉDITOS */}
        <View style={styles.headerRow}>
          <Text style={styles.sectionHeader}>Detalles del trabajo</Text>
          <View style={styles.creditsBadge}>
            <Ionicons name="sparkles" size={13} color="#eab308" />
            <Text style={styles.creditsText}>{creditosDisponibles} créditos</Text>
          </View>
        </View>

        {/* 1. TÍTULO */}
        <Text style={styles.label}>Título del trabajo</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Ej: Armado de cómoda Ikea"
            placeholderTextColor={colors.textSecondary}
            value={titulo}
            onChangeText={setTitulo}
          />
        </View>

        {/* 2. ADJUNTAR FOTOS */}
        <View style={styles.imageSectionHeader}>
          <Text style={styles.label}>Fotos del trabajo (Máx. 3)</Text>
          <Text style={styles.counterText}>{imagenes.length}/3</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          {imagenes.map((uri, idx) => (
            <View key={idx} style={styles.imageThumbnailWrap}>
              <Image source={{ uri }} style={styles.thumbnailImage} />
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

        {/* 3. CATEGORÍA (DROPDOWN) */}
        <Text style={styles.label}>Categoría</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          activeOpacity={0.7}
          onPress={() => setModalVisible('categoria')}
        >
          <View style={styles.dropdownInner}>
            <Ionicons name="briefcase-outline" size={18} color={colors.accentBlue} />
            <Text style={styles.dropdownText}>{categoria}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* 4. PAGO OFRECIDO */}
        <Text style={styles.label}>Pago de referencia ofrecido (CLP)</Text>
        <View style={styles.inputWrap}>
          <Text style={styles.currencyPrefix}>$</Text>
          <TextInput
            style={[styles.input, { paddingLeft: 4 }]}
            placeholder="Ej: 15000"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={monto}
            onChangeText={setMonto}
          />
        </View>
        <Text style={styles.helperText}>
          * El pago se realiza directamente a la persona (transferencia o efectivo) al finalizar la tarea.
        </Text>

        {/* 5. COMUNA / UBICACIÓN (DROPDOWN) */}
        <Text style={styles.label}>Comuna</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          activeOpacity={0.7}
          onPress={() => setModalVisible('comuna')}
        >
          <View style={styles.dropdownInner}>
            <Ionicons name="navigate-outline" size={18} color={colors.accentBlue} />
            <Text style={styles.dropdownText}>{comuna}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* 6. CUÁNDO SE NECESITA (CHIPS) */}
        <Text style={styles.label}>¿Cuándo se necesita?</Text>
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

        {/* 7. DESCRIPCIÓN Y REQUERIMIENTOS */}
        <Text style={styles.label}>Descripción y requisitos</Text>
        <View style={[styles.inputWrap, styles.textAreaWrap]}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe brevemente la tarea. ¿Debe traer herramientas? ¿Hay estacionamiento?"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            value={descripcion}
            onChangeText={setDescripcion}
            textAlignVertical="top"
          />
        </View>

        {/* 8. TARJETA DE PROMOCIÓN CON CRÉDITOS */}
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
            Aparece en los primeros resultados de búsqueda y resalta tu publicación para conseguir ayuda más rápido.
          </Text>
        </View>

        {/* BOTÓN PRINCIPAL */}
        <TouchableOpacity
          style={[styles.submitButton, destacarConCreditos && styles.submitButtonFeatured]}
          activeOpacity={0.85}
          onPress={handlePublicar}
        >
          <Ionicons
            name={destacarConCreditos ? 'sparkles' : 'paper-plane-outline'}
            size={19}
            color="#ffffff"
          />
          <Text style={styles.submitButtonText}>
            {destacarConCreditos ? 'Publicar como Destacado' : 'Publicar mini-trabajo'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL REUTILIZABLE PARA DROPDOWNS */}
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
                {modalVisible === 'categoria' ? 'Elige una Categoría' : 'Elige una Comuna'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible('ninguno')}>
                <Ionicons name="close-circle" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={modalVisible === 'categoria' ? CATEGORIAS : COMUNAS}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = modalVisible === 'categoria' ? categoria === item : comuna === item;

                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isSelected && styles.modalItemActive]}
                    onPress={() => {
                      if (modalVisible === 'categoria') setCategoria(item);
                      else setComuna(item);
                      setModalVisible('ninguno');
                    }}
                  >
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextActive]}>
                      {item}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color={colors.accentBlue} />}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 160,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  creditsText: {
    color: '#eab308',
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 10,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 48,
  },
  currencyPrefix: {
    color: colors.accentGreen,
    fontSize: 16,
    fontWeight: '700',
    marginRight: 4,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 0,
  },
  helperText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  imageSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  counterText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  imageScroll: {
    flexDirection: 'row',
    marginBottom: 6,
    marginTop: 4,
  },
  imageThumbnailWrap: {
    width: 76,
    height: 76,
    borderRadius: 12,
    marginRight: 10,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  btnRemoveImage: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAddImage: {
    width: 76,
    height: 76,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
    gap: 4,
  },
  btnAddImageText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.accentBlue,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceLight,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  dropdownInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  chip: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accentBlue,
    borderColor: colors.accentBlue,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  textAreaWrap: {
    height: 110,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  textArea: {
    height: '100%',
  },
  promoCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promoCardActive: {
    borderColor: '#eab308',
    backgroundColor: 'rgba(234, 179, 8, 0.04)',
  },
  promoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  promoTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  promoCostBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  promoCostText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  promoDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentBlue,
    height: 52,
    borderRadius: 16,
    marginTop: 20,
    gap: 8,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  submitButtonFeatured: {
    backgroundColor: '#0284c7',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    width: '100%',
    maxHeight: '65%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  modalItemActive: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  modalItemText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalItemTextActive: {
    color: colors.accentBlue,
    fontWeight: '700',
  },
});