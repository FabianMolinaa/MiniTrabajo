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
import {
  limpiarRut,
  validarRutChileno,
  formatearRutFinal,
  estandarizarTelefonoChileno,
  validarTelefonoChileno,
  validarPassword,
  ResultadoPassword,
} from '../utils/functionsAuth';

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
  const [telefono, setTelefono] = useState('');
  const [cargando, setCargando] = useState(false);
  const [tecladoVisible, setTecladoVisible] = useState(false);

  const [errores, setErrores] = useState<ErroresCampos>({});
  const [campoEnfocado, setCampoEnfocado] = useState<string | null>(null);

  // Validación de contraseña en tiempo real
  const [estadoPassword, setEstadoPassword] = useState<ResultadoPassword>(
    validarPassword('')
  );

  // Modal 2FA (PIN de 6 dígitos)
  const [modalPinVisible, setModalPinVisible] = useState(false);
  const [pinIngresado, setPinIngresado] = useState('');
  const [errorPin, setErrorPin] = useState<string | null>(null);
  const [cargandoPin, setCargandoPin] = useState(false);
  const [tipoOperacionPin, setTipoOperacionPin] = useState<'login' | 'registro' | null>(null);

  // Modal Recuperar Contraseña
  const [modalRecuperarVisible, setModalRecuperarVisible] = useState(false);
  const [emailRecuperar, setEmailRecuperar] = useState('');
  const [cargandoRecuperar, setCargandoRecuperar] = useState(false);

  // Modal Feedback General (Dark theme)
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

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setErrores((prev) => ({ ...prev, password: undefined }));
    if (esRegistro) {
      setEstadoPassword(validarPassword(text));
    }
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
    const soloNum = text.replace(/[^0-9]/g, '');
    if (soloNum.length <= 8) {
      setTelefono(soloNum);
    }
  };

  // 1. INICIAR SESIÓN: Primero comprueba credenciales contra Supabase
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

    // Verificamos credenciales con el endpoint REST de Supabase directamente
    // para NO disparar el onAuthStateChange de App.tsx antes del PIN
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password: password,
          }),
        }
      );

      const resData = await response.json();
      setCargando(false);

      if (!response.ok || resData.error) {
        // Credenciales incorrectas: Muestra error y NUNCA abre el PIN
        setModalFeedback({
          visible: true,
          tipo: 'error',
          titulo: 'Datos incorrectos',
          mensaje: 'El correo o la contraseña no coinciden con ninguna cuenta registrada.',
        });
        return;
      }

      // Credenciales correctas: Se abre el PIN y la pantalla NO parpadea ni te saca
      setTipoOperacionPin('login');
      setPinIngresado('');
      setErrorPin(null);
      setModalPinVisible(true);
    } catch {
      setCargando(false);
      setModalFeedback({
        visible: true,
        tipo: 'error',
        titulo: 'Error de conexión',
        mensaje: 'No se pudo verificar la cuenta. Revisa tu conexión a internet.',
      });
    }
  };

  // 2. REGISTRO
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

    const checkPass = validarPassword(password);
    if (!checkPass.esValida) {
      nuevosErrores.password = 'La contraseña no cumple con los requisitos';
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    const telefonoEstandarizado = estandarizarTelefonoChileno(telefono);
    const rutFormateado = formatearRutFinal(rutLimpio);

    setCargando(true);
    try {
      const { data: existencia, error: rpcError } = await supabase.rpc('check_user_exists', {
        p_rut: rutFormateado,
        p_telefono: telefonoEstandarizado,
        p_email: emailNormalizado,
      });

      setCargando(false);

      if (!rpcError && existencia) {
        const erroresDup: ErroresCampos = {};
        if (existencia.rut) erroresDup.rut = 'Este RUT ya tiene una cuenta asociada';
        if (existencia.telefono) erroresDup.telefono = 'Este teléfono ya está registrado';
        if (existencia.email) erroresDup.email = 'Este correo ya está en uso';

        if (Object.keys(erroresDup).length > 0) {
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

      setTipoOperacionPin('registro');
      setPinIngresado('');
      setErrorPin(null);
      setModalPinVisible(true);
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

  // 3. CONFIRMAR PIN (Autoriza el acceso definitivo)
  const handleConfirmarPin = async () => {
    if (pinIngresado.length !== 6) {
      setErrorPin('Debes ingresar los 6 dígitos del PIN.');
      return;
    }

    if (pinIngresado !== '123456') {
      setErrorPin('PIN incorrecto. Usa 123456 para la prueba.');
      return;
    }

    setCargandoPin(true);

    if (tipoOperacionPin === 'login') {
      // Ahora sí iniciamos sesión formal en Supabase para que App.tsx monte el Home
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      setCargandoPin(false);

      if (error) {
        setErrorPin('No se pudo autorizar la sesión.');
      } else {
        setModalPinVisible(false);
      }
    } else if (tipoOperacionPin === 'registro') {
      const rutFormateado = formatearRutFinal(limpiarRut(rut));
      const telefonoEstandarizado = estandarizarTelefonoChileno(telefono);

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
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

      setCargandoPin(false);

      if (signUpError) {
        setModalPinVisible(false);
        setModalFeedback({
          visible: true,
          tipo: 'error',
          titulo: 'No se pudo crear la cuenta',
          mensaje: signUpError.message.includes('Database error')
            ? 'Ya existe un usuario con este correo, RUT o teléfono.'
            : signUpError.message,
        });
      } else {
        setModalPinVisible(false);
      }
    }
  };

  const handleCancelarPin = () => {
    setModalPinVisible(false);
  };

  const handleRecuperarPassword = async () => {
    if (!emailRecuperar.trim()) {
      setModalFeedback({
        visible: true,
        tipo: 'error',
        titulo: 'Correo requerido',
        mensaje: 'Ingresa tu correo para enviarte el enlace de recuperación.',
      });
      return;
    }

    setCargandoRecuperar(true);
    const { error } = await supabase.auth.resetPasswordForEmail(emailRecuperar.trim());
    setCargandoRecuperar(false);

    setModalRecuperarVisible(false);

    if (error) {
      setModalFeedback({
        visible: true,
        tipo: 'error',
        titulo: 'Error al enviar',
        mensaje: error.message,
      });
    } else {
      setModalFeedback({
        visible: true,
        tipo: 'exito',
        titulo: 'Enlace enviado',
        mensaje: 'Revisa tu bandeja de entrada para restablecer tu contraseña.',
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {esRegistro ? 'Contraseña segura *' : 'Contraseña *'}
                </Text>
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
                    placeholder={esRegistro ? 'Crea tu contraseña' : 'Tu contraseña'}
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={handlePasswordChange}
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

                {esRegistro && password.length > 0 && (
                  <View style={styles.reqContainer}>
                    <View style={styles.reqRow}>
                      <Ionicons
                        name={estadoPassword.reglas.longitudMinima ? 'checkmark-circle' : 'ellipse-outline'}
                        size={14}
                        color={estadoPassword.reglas.longitudMinima ? '#22c55e' : colors.textMuted}
                      />
                      <Text style={[styles.reqText, estadoPassword.reglas.longitudMinima && styles.reqTextOk]}>
                        Mínimo 8 caracteres
                      </Text>
                    </View>
                    <View style={styles.reqRow}>
                      <Ionicons
                        name={estadoPassword.reglas.tieneMayuscula ? 'checkmark-circle' : 'ellipse-outline'}
                        size={14}
                        color={estadoPassword.reglas.tieneMayuscula ? '#22c55e' : colors.textMuted}
                      />
                      <Text style={[styles.reqText, estadoPassword.reglas.tieneMayuscula && styles.reqTextOk]}>
                        Al menos una mayúscula (A-Z)
                      </Text>
                    </View>
                    <View style={styles.reqRow}>
                      <Ionicons
                        name={estadoPassword.reglas.tieneMinuscula ? 'checkmark-circle' : 'ellipse-outline'}
                        size={14}
                        color={estadoPassword.reglas.tieneMinuscula ? '#22c55e' : colors.textMuted}
                      />
                      <Text style={[styles.reqText, estadoPassword.reglas.tieneMinuscula && styles.reqTextOk]}>
                        Al menos una minúscula (a-z)
                      </Text>
                    </View>
                    <View style={styles.reqRow}>
                      <Ionicons
                        name={estadoPassword.reglas.tieneNumero ? 'checkmark-circle' : 'ellipse-outline'}
                        size={14}
                        color={estadoPassword.reglas.tieneNumero ? '#22c55e' : colors.textMuted}
                      />
                      <Text style={[styles.reqText, estadoPassword.reglas.tieneNumero && styles.reqTextOk]}>
                        Al menos un número (0-9)
                      </Text>
                    </View>
                  </View>
                )}
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
                      {esRegistro ? 'Crear mi cuenta' : 'Iniciar Sesión'}
                    </Text>
                    <Ionicons
                      name={esRegistro ? 'arrow-forward' : 'log-in-outline'}
                      size={18}
                      color="#ffffff"
                    />
                  </View>
                )}
              </TouchableOpacity>

              {!esRegistro && (
                <TouchableOpacity
                  style={styles.forgotBtnCenter}
                  onPress={() => setModalRecuperarVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotBtnText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* MODAL 2FA: PIN de seguridad */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalPinVisible}
        onRequestClose={handleCancelarPin}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.feedbackCard}>
            <View style={[styles.feedbackIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
              <Ionicons name="key-outline" size={32} color={colors.accentBlue} />
            </View>

            <Text style={styles.feedbackTitle}>Verificación en 2 Pasos</Text>
            <Text style={styles.feedbackMsg}>
              {tipoOperacionPin === 'registro'
                ? 'Datos correctos. Ingresa tu código PIN de seguridad (6 dígitos) para confirmar la creación de tu cuenta.'
                : 'Credenciales correctas. Ingresa tu código PIN de seguridad (6 dígitos) para completar el inicio de sesión.'}
            </Text>

            <TextInput
              style={styles.pinInput}
              placeholder="123456"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              value={pinIngresado}
              onChangeText={(t) => {
                setErrorPin(null);
                setPinIngresado(t);
              }}
              textAlign="center"
              autoFocus={true}
            />

            {errorPin && <Text style={[styles.fieldErrorText, { marginBottom: 12 }]}>{errorPin}</Text>}

            <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.btnModalOkError, { flex: 1 }]}
                onPress={handleCancelarPin}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnModalOkExito, { flex: 2 }]}
                onPress={handleConfirmarPin}
                disabled={cargandoPin}
              >
                {cargandoPin ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.btnModalOkText}>Verificar y Entrar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

{/* MODAL RECUPERAR CONTRASEÑA */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalRecuperarVisible}
        onRequestClose={() => setModalRecuperarVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.feedbackCard}>
            <View style={[styles.feedbackIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
              <Ionicons name="mail-unread-outline" size={32} color={colors.accentBlue} />
            </View>

            <Text style={styles.feedbackTitle}>Recuperar Contraseña</Text>
            <Text style={styles.feedbackMsg}>
              Ingresa tu correo registrado para enviarte las instrucciones de restablecimiento.
            </Text>

            {/* Input corregido y visible */}
            <View style={styles.recuperarInputWrapper}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.recuperarInput}
                placeholder="tu@correo.cl"
                placeholderTextColor={colors.textMuted}
                value={emailRecuperar}
                onChangeText={setEmailRecuperar}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.btnModalOkError, { flex: 1 }]}
                onPress={() => setModalRecuperarVisible(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnModalOkExito, { flex: 2 }]}
                onPress={handleRecuperarPassword}
                disabled={cargandoRecuperar}
              >
                {cargandoRecuperar ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.btnModalOkText}>Enviar enlace</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL FEEDBACK GENERAL */}
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
  reqContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    gap: 4,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reqText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  reqTextOk: {
    color: '#22c55e',
    fontWeight: '600',
  },
  btnSubmit: {
    backgroundColor: colors.accentBlue,
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
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
  forgotBtnCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 4,
  },
  forgotBtnText: {
    fontSize: 12,
    color: colors.accentBlue,
    fontWeight: '600',
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
    marginBottom: 16,
  },
  pinInput: {
    width: '80%',
    height: 50,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.accentBlue,
    borderRadius: 14,
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8,
    marginBottom: 14,
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
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnModalOkExito: {
    backgroundColor: colors.accentBlue,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnModalOkText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  recuperarInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  recuperarInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
});