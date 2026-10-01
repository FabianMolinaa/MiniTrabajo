import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { colors } from '../theme/colors';
import { limpiarRut, validarRutChileno, formatearRutFinal } from '../utils/validarRut';
import { estandarizarTelefonoChileno, validarTelefonoChileno } from '../utils/validarTelefono';

interface ErroresCampos {
  nombre?: string;
  rut?: string;
  telefono?: string;
  email?: string;
  password?: string;
}

export default function AuthScreen() {
  const [esRegistro, setEsRegistro] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [telefono, setTelefono] = useState(''); // Guarda los 8 dígitos ingresados
  const [cargando, setCargando] = useState(false);
  const [tecladoVisible, setTecladoVisible] = useState(false);

  const [errores, setErrores] = useState<ErroresCampos>({});
  const [campoEnfocado, setCampoEnfocado] = useState<string | null>(null);

  const [modalFeedback, setModalFeedback] = useState<{
    visible: boolean;
    tipo: 'error' | 'exito';
    titulo: string;
    mensaje: string;
  }>({
    visible: false,
    tipo: 'error',
    titulo: '',
    mensaje: '',
  });

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setTecladoVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setTecladoVisible(false)
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleCambiarTab = (registro: boolean) => {
    setEsRegistro(registro);
    setErrores({});
  };

  const handleRutChange = (text: string) => {
    setErrores((prev) => ({ ...prev, rut: undefined }));
    const soloDigitosYk = text.replace(/[^0-9kK]/g, '').toUpperCase();
    if (soloDigitosYk.length <= 9) {
      setRut(soloDigitosYk);
    }
  };

  const handleBlurRut = () => {
    setCampoEnfocado(null);
    if (rut.length >= 8) {
      setRut(formatearRutFinal(rut));
    }
  };

  const handleTelefonoChange = (text: string) => {
    setErrores((prev) => ({ ...prev, telefono: undefined }));
    // Solo permitir números y máximo 8 dígitos
    const soloNum = text.replace(/[^0-9]/g, '');
    if (soloNum.length <= 8) {
      setTelefono(soloNum);
    }
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    const nuevosErrores: ErroresCampos = {};

    if (!email.trim()) nuevosErrores.email = 'Ingresa tu correo';
    if (!password.trim()) nuevosErrores.password = 'Ingresa tu contraseña';

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });
    setCargando(false);

    if (error) {
      setModalFeedback({
        visible: true,
        tipo: 'error',
        titulo: 'Datos incorrectos',
        mensaje: 'El correo o la contraseña no coinciden con ninguna cuenta activa.',
      });
    }
  };

  const handleRegistro = async () => {
    Keyboard.dismiss();
    const nuevosErrores: ErroresCampos = {};

    const rutLimpio = limpiarRut(rut);
    const emailNormalizado = email.trim().toLowerCase();

    if (!nombre.trim()) nuevosErrores.nombre = 'El nombre es obligatorio';
    
    if (!rutLimpio) {
      nuevosErrores.rut = 'Ingresa tu RUT';
    } else if (!validarRutChileno(rutLimpio)) {
      nuevosErrores.rut = 'RUT inválido (revisa dígito verificador)';
    }

    if (!telefono.trim()) {
      nuevosErrores.telefono = 'Ingresa tu número telefónico';
    } else if (!validarTelefonoChileno(telefono)) {
      nuevosErrores.telefono = 'Deben ser 8 dígitos (ej: 1234 5678)';
    }

    if (!emailNormalizado) {
      nuevosErrores.email = 'Ingresa tu correo electrónico';
    } else if (!/\S+@\S+\.\S+/.test(emailNormalizado)) {
      nuevosErrores.email = 'Formato de correo no válido';
    }

    if (!password.trim()) {
      nuevosErrores.password = 'Ingresa una contraseña';
    } else if (password.length < 6) {
      nuevosErrores.password = 'Mínimo 6 caracteres requeridos';
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    // Teléfono siempre estandarizado en formato oficial: +569XXXXXXXX
    const telefonoEstandarizado = estandarizarTelefonoChileno(telefono);
    const rutFormateado = formatearRutFinal(rutLimpio);

    setCargando(true);

    try {
      const { data: existencia, error: rpcError } = await supabase.rpc('check_user_exists', {
        p_rut: rutFormateado,
        p_telefono: telefonoEstandarizado,
        p_email: emailNormalizado,
      });

      if (!rpcError && existencia) {
        const erroresDup: ErroresCampos = {};
        if (existencia.rut) erroresDup.rut = 'Este RUT ya tiene una cuenta asociada';
        if (existencia.telefono) erroresDup.telefono = 'Este teléfono ya está registrado';
        if (existencia.email) erroresDup.email = 'Este correo ya está en uso';

        if (Object.keys(erroresDup).length > 0) {
          setCargando(false);
          setErrores(erroresDup);
          setModalFeedback({
            visible: true,
            tipo: 'error',
            titulo: 'Datos en uso',
            mensaje: 'Algunos datos ya pertenecen a otra cuenta de Mini-Trabajo.',
          });
          return;
        }
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: emailNormalizado,
        password: password,
        options: {
          data: {
            nombre: nombre.trim(),
            rut: rutFormateado,
            telefono: telefonoEstandarizado,
            comuna: 'Santiago Centro',
          },
        },
      });

      setCargando(false);

      if (signUpError) {
        setModalFeedback({
          visible: true,
          tipo: 'error',
          titulo: 'No se pudo crear la cuenta',
          mensaje: signUpError.message.includes('Database error')
            ? 'Ya existe un usuario con este correo, RUT o teléfono.'
            : signUpError.message,
        });
      } else {
        setModalFeedback({
          visible: true,
          tipo: 'exito',
          titulo: '¡Bienvenido a Mini-Trabajo!',
          mensaje: 'Tu cuenta ha sido creada exitosamente.',
        });
      }
    } catch {
      setCargando(false);
      setModalFeedback({
        visible: true,
        tipo: 'error',
        titulo: 'Error de conexión',
        mensaje: 'No pudimos conectar con los servidores. Intenta nuevamente.',
      });
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: tecladoVisible ? 240 : 40 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.logoBadge}>
                <Ionicons name="flash" size={28} color={colors.accentBlue} />
              </View>
              <Text style={styles.title}>Mini-Trabajo</Text>
              <Text style={styles.subtitle}>
                {esRegistro ? 'Crea tu perfil laboral y empieza hoy' : 'Conecta con oportunidades y servicios'}
              </Text>
            </View>

            <View style={styles.segmentContainer}>
              <TouchableOpacity
                style={[styles.segmentBtn, !esRegistro && styles.segmentBtnActive]}
                onPress={() => handleCambiarTab(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, !esRegistro && styles.segmentTextActive]}>
                  Iniciar Sesión
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, esRegistro && styles.segmentBtnActive]}
                onPress={() => handleCambiarTab(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, esRegistro && styles.segmentTextActive]}>
                  Registrarse
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formCard}>
              {esRegistro && (
                <>
                  {/* Nombre */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nombre completo *</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        campoEnfocado === 'nombre' && styles.inputWrapperFocused,
                        errores.nombre ? styles.inputWrapperError : null,
                      ]}
                    >
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color={errores.nombre ? '#ef4444' : campoEnfocado === 'nombre' ? colors.accentBlue : colors.textMuted}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Ej: Fabián Molina"
                        placeholderTextColor={colors.textMuted}
                        value={nombre}
                        onChangeText={(t) => {
                          setErrores((p) => ({ ...p, nombre: undefined }));
                          setNombre(t);
                        }}
                        onFocus={() => setCampoEnfocado('nombre')}
                        onBlur={() => setCampoEnfocado(null)}
                      />
                    </View>
                    {errores.nombre && <Text style={styles.fieldErrorText}>{errores.nombre}</Text>}
                  </View>

                  {/* RUT */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>RUT chileno *</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        campoEnfocado === 'rut' && styles.inputWrapperFocused,
                        errores.rut ? styles.inputWrapperError : null,
                      ]}
                    >
                      <Ionicons
                        name="card-outline"
                        size={18}
                        color={errores.rut ? '#ef4444' : campoEnfocado === 'rut' ? colors.accentBlue : colors.textMuted}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="19876543K"
                        placeholderTextColor={colors.textMuted}
                        value={rut}
                        onChangeText={handleRutChange}
                        onFocus={() => setCampoEnfocado('rut')}
                        onBlur={handleBlurRut}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        maxLength={10}
                      />
                    </View>
                    {errores.rut && <Text style={styles.fieldErrorText}>{errores.rut}</Text>}
                  </View>

                  {/* Teléfono con prefijo fijo +56 9 */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Teléfono de contacto / WhatsApp *</Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        campoEnfocado === 'telefono' && styles.inputWrapperFocused,
                        errores.telefono ? styles.inputWrapperError : null,
                      ]}
                    >
                      <Ionicons
                        name="call-outline"
                        size={18}
                        color={errores.telefono ? '#ef4444' : campoEnfocado === 'telefono' ? colors.accentBlue : colors.textMuted}
                        style={styles.inputIcon}
                      />
                      {/* Prefijo Chileno Inmutable */}
                      <View style={styles.phonePrefixBadge}>
                        <Text style={styles.phonePrefixText}>+56 9</Text>
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="1234 5678"
                        placeholderTextColor={colors.textMuted}
                        value={telefono}
                        onChangeText={handleTelefonoChange}
                        onFocus={() => setCampoEnfocado('telefono')}
                        onBlur={() => setCampoEnfocado(null)}
                        keyboardType="number-pad"
                        maxLength={8}
                        autoCorrect={false}
                      />
                    </View>
                    {errores.telefono && <Text style={styles.fieldErrorText}>{errores.telefono}</Text>}
                  </View>
                </>
              )}

              {/* Correo */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Correo electrónico *</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    campoEnfocado === 'email' && styles.inputWrapperFocused,
                    errores.email ? styles.inputWrapperError : null,
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={errores.email ? '#ef4444' : campoEnfocado === 'email' ? colors.accentBlue : colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="tu@correo.cl"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={(t) => {
                      setErrores((p) => ({ ...p, email: undefined }));
                      setEmail(t);
                    }}
                    onFocus={() => setCampoEnfocado('email')}
                    onBlur={() => setCampoEnfocado(null)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                </View>
                {errores.email && <Text style={styles.fieldErrorText}>{errores.email}</Text>}
              </View>

              {/* Contraseña */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contraseña *</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    campoEnfocado === 'password' && styles.inputWrapperFocused,
                    errores.password ? styles.inputWrapperError : null,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={errores.password ? '#ef4444' : campoEnfocado === 'password' ? colors.accentBlue : colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={(t) => {
                      setErrores((p) => ({ ...p, password: undefined }));
                      setPassword(t);
                    }}
                    onFocus={() => setCampoEnfocado('password')}
                    onBlur={() => setCampoEnfocado(null)}
                    secureTextEntry={!mostrarPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setMostrarPassword(!mostrarPassword)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={mostrarPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                {errores.password && <Text style={styles.fieldErrorText}>{errores.password}</Text>}
              </View>

              <TouchableOpacity
                style={styles.btnSubmit}
                onPress={esRegistro ? handleRegistro : handleLogin}
                disabled={cargando}
                activeOpacity={0.85}
              >
                {cargando ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <View style={styles.btnContent}>
                    <Text style={styles.btnSubmitText}>
                      {esRegistro ? 'Crear mi cuenta' : 'Entrar a la app'}
                    </Text>
                    <Ionicons
                      name={esRegistro ? 'arrow-forward' : 'log-in-outline'}
                      size={18}
                      color="#ffffff"
                    />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footerNote}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
              <Text style={styles.footerNoteText}>Tus datos están protegidos y encriptados</Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalFeedback.visible}
        onRequestClose={() => setModalFeedback((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.feedbackCard}>
            <View
              style={[
                styles.feedbackIconWrap,
                modalFeedback.tipo === 'error'
                  ? styles.feedbackIconError
                  : styles.feedbackIconExito,
              ]}
            >
              <Ionicons
                name={modalFeedback.tipo === 'error' ? 'alert-circle' : 'checkmark-circle'}
                size={34}
                color={modalFeedback.tipo === 'error' ? '#ef4444' : '#22c55e'}
              />
            </View>

            <Text style={styles.feedbackTitle}>{modalFeedback.titulo}</Text>
            <Text style={styles.feedbackMsg}>{modalFeedback.mensaje}</Text>

            <TouchableOpacity
              style={[
                styles.btnModalOk,
                modalFeedback.tipo === 'error'
                  ? styles.btnModalOkError
                  : styles.btnModalOkExito,
              ]}
              activeOpacity={0.85}
              onPress={() => setModalFeedback((prev) => ({ ...prev, visible: false }))}
            >
              <Text style={styles.btnModalOkText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingTop: 36,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.textPrimary,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  inputWrapperFocused: {
    borderColor: colors.accentBlue,
    backgroundColor: '#161d26',
  },
  inputWrapperError: {
    borderColor: '#ef4444',
    backgroundColor: '#1f1315',
  },
  inputIcon: {
    marginRight: 8,
  },
  phonePrefixBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phonePrefixText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 14,
  },
  eyeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  fieldErrorText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 4,
  },
  btnSubmit: {
    backgroundColor: colors.accentBlue,
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnSubmitText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  footerNoteText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  feedbackCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  feedbackIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  feedbackIconError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  feedbackIconExito: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  feedbackMsg: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  btnModalOk: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnModalOkError: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnModalOkExito: {
    backgroundColor: colors.accentBlue,
  },
  btnModalOkText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});