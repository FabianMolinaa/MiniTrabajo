import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import ResultadoCompra from './ResultadoCompra';

import {
  crearORecuperarPago,
  esRetornoWebpay,
  verificarPago,
  type PagoWebpay as DatosPago,
} from '../services/webpay';

interface Props {
  paqueteId: string | null;
  onCerrar: () => void | Promise<void>;
  onVerHistorial: () => void;
}

export default function PagoWebpay({
  paqueteId,
  onCerrar,
  onVerHistorial,
}: Props) {
  const [pago, setPago] = useState<DatosPago | null>(null);
  const [cargando, setCargando] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [retornando, setRetornando] = useState(false);

  const ocupado = useRef(false);
  const montado = useRef(false);
  const primeraApertura = useRef(true);

  const iniciar = useCallback(async () => {
    if (ocupado.current || !montado.current) return;

    ocupado.current = true;
    setCargando(true);
    setMensaje(null);

    const nuevaCompra =
      paqueteId !== null && primeraApertura.current;

    primeraApertura.current = false;

    try {
      let resultado = await crearORecuperarPago(
        paqueteId,
        nuevaCompra
      );

      // Revisar un pago comprueba el resultado sin abrir Webpay.
      if (
        paqueteId === null &&
        resultado.token &&
        resultado.compra.estado === 'pendiente'
      ) {
        const compra = await verificarPago(resultado);
        resultado = { ...resultado, compra };
      }

      if (montado.current) {
        setPago(resultado);
      }
    } catch (error) {
      if (montado.current) {
        setMensaje(
          error instanceof Error
            ? error.message
            : 'No se pudo iniciar el pago.'
        );
      }
    } finally {
      ocupado.current = false;

      if (montado.current) {
        setCargando(false);
      }
    }
  }, [paqueteId]);

  useEffect(() => {
    montado.current = true;
    void iniciar();

    return () => {
      montado.current = false;
    };
  }, [iniciar]);

  useEffect(() => {
    const sub = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        void onCerrar();
        return true;
      }
    );

    return () => sub.remove();
  }, [onCerrar]);

  const verificar = useCallback(async () => {
    if (!pago || ocupado.current) return;

    ocupado.current = true;
    setRetornando(true);
    setVerificando(true);
    setMensaje(null);

    try {
      const compra = await verificarPago(pago);

      if (montado.current) {
        setPago(actual =>
          actual ? { ...actual, compra } : actual
        );

        if (compra.estado === 'pendiente') {
          setMensaje(
            'El pago aún no está confirmado. Si ya completaste Webpay, vuelve a verificar en unos segundos.'
          );
        }
      }
    } catch (error) {
      if (montado.current) {
        setMensaje(
          error instanceof Error
            ? error.message
            : 'No se pudo verificar el pago.'
        );
      }
    } finally {
      ocupado.current = false;

      if (montado.current) {
        setVerificando(false);
      }
    }
  }, [pago]);

  // Mantenerlo estable evita reenviar el POST al cambiar mensajes.
  const source = useMemo(
    () =>
      pago?.url && pago.token
        ? {
            uri: pago.url,
            method: 'POST' as const,
            headers: {
              'Content-Type':
                'application/x-www-form-urlencoded',
            },
            body: `token_ws=${encodeURIComponent(pago.token)}`,
          }
        : undefined,
    [pago?.url, pago?.token]
  );

  const pendiente = pago?.compra.estado === 'pendiente';

  return (
    <SafeAreaView
      style={s.pantalla}
      edges={['top', 'left', 'right']}
    >
      <View style={s.cabecera}>
        <Text style={s.titulo}>Webpay · Pruebas</Text>

        <TouchableOpacity
          onPress={() => void onCerrar()}
          style={s.boton}
        >
          <Text style={s.botonTexto}>Mis créditos</Text>
        </TouchableOpacity>
      </View>

      {pago && (
        <View style={s.resumen}>
          <Text style={s.texto}>
            {pago.reanudado ? 'Pago guardado: ' : ''}
            {pago.compra.creditos} créditos · $
            {pago.compra.monto_clp.toLocaleString('es-CL')} CLP
          </Text>

          {pendiente && (
            <Text style={s.secundario}>
              Usa solo los datos de prueba de Transbank.
            </Text>
          )}
        </View>
      )}

      {mensaje && (
        <Text accessibilityRole="alert" style={s.aviso}>
          {mensaje}
        </Text>
      )}

      {cargando ? (
        <View style={s.centro}>
          <ActivityIndicator color="#38bdf8" />
          <Text style={s.texto}>Preparando tu compra…</Text>
        </View>
      ) : pendiente && source && paqueteId !== null ? (
        <WebView
          style={retornando ? s.webOculta : s.web}
          source={source}
          originWhitelist={['https://*', 'about:blank']}
          onShouldStartLoadWithRequest={request =>
            request.url.startsWith('https://') ||
            request.url === 'about:blank'
          }
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          mixedContentMode="never"
          setSupportMultipleWindows={false}
          startInLoadingState
          renderLoading={() => (
            <ActivityIndicator
              style={s.cargandoWeb}
              color="#38bdf8"
            />
          )}
          onLoadStart={event => {
            if (esRetornoWebpay(event.nativeEvent.url)) {
              setRetornando(true);
            }
          }}
          onLoadEnd={event => {
            if (esRetornoWebpay(event.nativeEvent.url)) {
              void verificar();
            }
          }}
          onError={() =>
            setMensaje(
              'No se pudo cargar la página. Si ya pagaste, usa el botón de verificación.'
            )
          }
          onHttpError={() =>
            setMensaje(
              'La página devolvió un error. Si ya pagaste, verifica el resultado antes de repetir la compra.'
            )
          }
        />
      ) : pago ? null : (
        <View style={s.centro}>
          <TouchableOpacity
            style={s.botonPrincipal}
            onPress={() => void iniciar()}
          >
            <Text style={s.botonTexto}>
              Reintentar conexión
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!cargando &&
        pago &&
        (!pendiente ||
          !source ||
          paqueteId === null ||
          retornando) && (
          <ScrollView contentContainerStyle={s.resultado}>
            {verificando && (
              <ActivityIndicator
                color="#38bdf8"
                accessibilityLabel="Verificando compra"
              />
            )}

            <ResultadoCompra compra={pago.compra} />

            <TouchableOpacity
              accessibilityRole="button"
              style={s.botonPrincipal}
              onPress={() => void onCerrar()}
            >
              <Text style={s.botonTexto}>
                Volver a mis créditos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              style={s.boton}
              onPress={onVerHistorial}
            >
              <Text style={s.botonTexto}>
                Ver historial de compras
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

      {!cargando && pendiente && pago?.token && (
        <TouchableOpacity
          style={s.botonPrincipal}
          disabled={verificando}
          onPress={() => void verificar()}
        >
          <Text style={s.botonTexto}>
            {verificando
              ? 'Verificando…'
              : 'Ya pagué: verificar resultado'}
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: '#0d1117',
    paddingBottom: 110,
  },
  cabecera: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titulo: {
    color: '#f0f6fc',
    fontSize: 18,
    fontWeight: '700',
  },
  texto: {
    color: '#f0f6fc',
    textAlign: 'center',
    marginVertical: 8,
  },
  secundario: {
    color: '#a7b3c2',
    textAlign: 'center',
    fontSize: 12,
  },
  resumen: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  aviso: {
    padding: 12,
    color: '#fbbf24',
    backgroundColor: '#161b22',
  },
  boton: {
    backgroundColor: '#21262d',
    padding: 10,
    borderRadius: 8,
  },
  botonPrincipal: {
    backgroundColor: '#0369a1',
    margin: 10,
    padding: 14,
    borderRadius: 10,
  },
  botonTexto: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  resultado: {
    padding: 20,
    gap: 16,
    flexGrow: 1,
    justifyContent: 'center',
  },
  webOculta: {
    height: 0,
    flex: 0,
    opacity: 0,
  },
  web: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centro: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cargandoWeb: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
  },
});