import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  consultarHistorialCompras,
  type CompraCreditos,
} from '../services/webpay';

import { colors } from '../theme/colors';

interface Props {
  onCerrar: () => void | Promise<void>;

  // Permite conservar el uso actual en PerfilScreen.
  // El historial ya no muestra la opción de retomar pagos.
  onRetomar?: () => void;
}

function formatearFecha(valor: string | null) {
  if (!valor) return 'Fecha no disponible';

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return 'Fecha no disponible';
  }

  return fecha.toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistorialCompras({
  onCerrar,
}: Props) {
  const [compras, setCompras] = useState<CompraCreditos[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hayMas, setHayMas] = useState(false);

  const pagina = useRef(0);
  const ocupado = useRef(false);
  const montado = useRef(false);

  const cargar = useCallback(async (reiniciar: boolean) => {
    if (ocupado.current) return;

    ocupado.current = true;
    setCargando(true);
    setActualizando(reiniciar);
    setError(null);

    const siguiente = reiniciar ? 0 : pagina.current + 1;

    try {
      const datos = await consultarHistorialCompras(siguiente);

      if (!montado.current) return;

      setCompras(actual => {
        if (reiniciar) return datos;

        const nuevas = datos.filter(
          compra => !actual.some(item => item.id === compra.id)
        );

        return [...actual, ...nuevas];
      });

      pagina.current = siguiente;
      setHayMas(datos.length === 20);
    } catch (e) {
      if (montado.current) {
        setError(
          e instanceof Error
            ? e.message
            : 'No pudimos cargar tu historial.'
        );
      }
    } finally {
      ocupado.current = false;

      if (montado.current) {
        setCargando(false);
        setActualizando(false);
      }
    }
  }, []);

  useEffect(() => {
    montado.current = true;
    void cargar(true);

    return () => {
      montado.current = false;
    };
  }, [cargar]);

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

  return (
    <SafeAreaView
      style={s.pantalla}
      edges={['top', 'left', 'right']}
    >
      <View style={s.cabecera}>
        <TouchableOpacity
          accessibilityLabel="Volver a mis créditos"
          accessibilityRole="button"
          style={s.botonIcono}
          onPress={() => void onCerrar()}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={colors.textPrimary}
          />
        </TouchableOpacity>

        <View style={s.titulos}>
          <Text style={s.titulo}>Historial de compras</Text>
          <Text style={s.subtitulo}>
            Tus compras de créditos
          </Text>
        </View>

        <TouchableOpacity
          accessibilityLabel="Actualizar historial"
          accessibilityRole="button"
          style={s.botonIcono}
          disabled={cargando}
          onPress={() => void cargar(true)}
        >
          <Ionicons
            name="refresh"
            size={23}
            color={colors.accentBlue}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={compras}
        keyExtractor={item => item.id}
        contentContainerStyle={s.lista}
        showsVerticalScrollIndicator={false}
        refreshing={actualizando}
        onRefresh={() => void cargar(true)}
        onEndReachedThreshold={0.3}
        onEndReached={() => {
          if (hayMas && !cargando && !error) {
            void cargar(false);
          }
        }}
        ListHeaderComponent={
          error ? (
            <View style={s.aviso}>
              <Ionicons
                name="cloud-offline-outline"
                size={22}
                color={colors.textSecondary}
              />
              <Text
                accessibilityRole="alert"
                style={s.textoAviso}
              >
                {error}
              </Text>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          cargando ? (
            <View style={s.vacio}>
              <ActivityIndicator color={colors.accentBlue} />
              <Text style={s.textoSecundario}>
                Cargando tus compras…
              </Text>
            </View>
          ) : !error ? (
            <View style={s.vacio}>
              <View style={s.iconoVacio}>
                <Ionicons
                  name="receipt-outline"
                  size={38}
                  color={colors.accentBlue}
                />
              </View>

              <Text style={s.tituloVacio}>
                Aún no tienes compras
              </Text>

              <Text style={s.descripcionVacia}>
                Cuando completes una compra de créditos,
                aparecerá aquí.
              </Text>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <View style={s.tarjeta}>
            <View style={s.filaPrincipal}>
              <View style={s.iconoCompra}>
                <Ionicons
                  name="flash"
                  size={24}
                  color={colors.accentBlue}
                />
              </View>

              <View style={s.detalle}>
                <Text style={s.creditos}>
                  {item.creditos} créditos
                </Text>

                <Text style={s.fecha}>
                  {formatearFecha(item.acreditado_en)}
                </Text>
              </View>
            </View>

            <View style={s.separador} />

            <View style={s.filaMonto}>
              <Text style={s.textoSecundario}>
                Total pagado
              </Text>

              <Text style={s.monto}>
                ${item.monto_clp.toLocaleString('es-CL')} CLP
              </Text>
            </View>
          </View>
        )}
        ListFooterComponent={
          cargando && compras.length > 0 && !actualizando ? (
            <ActivityIndicator
              style={s.cargandoMas}
              color={colors.accentBlue}
            />
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  botonIcono: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  titulos: {
    flex: 1,
    gap: 5,
  },
  titulo: {
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: '700',
  },
  subtitulo: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  lista: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 130,
    gap: 14,
  },
  tarjeta: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 18,
    gap: 17,
  },
  filaPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconoCompra: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: colors.accentBlueBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detalle: {
    flex: 1,
    gap: 6,
  },
  creditos: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
  },
  fecha: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  separador: {
    height: 1,
    backgroundColor: colors.border,
  },
  filaMonto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  textoSecundario: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  monto: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  vacio: {
    alignItems: 'center',
    paddingVertical: 65,
    gap: 18,
  },
  iconoVacio: {
    width: 84,
    height: 84,
    borderRadius: 25,
    backgroundColor: colors.accentBlueBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloVacio: {
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  descripcionVacia: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 290,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 8,
  },
  textoAviso: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  cargandoMas: {
    paddingVertical: 20,
  },
});