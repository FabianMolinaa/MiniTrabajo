import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CompraCreditos } from '../services/webpay';
import { estadoCompra } from '../utils/estadoCompra';
import { colors } from '../theme/colors';

export default function ResultadoCompra({
  compra,
}: {
  compra: CompraCreditos;
}) {
  const estado = estadoCompra(compra);

  return (
    <View style={s.tarjeta} accessibilityLiveRegion="polite">
      <View
        style={[
          s.icono,
          { backgroundColor: `${estado.color}18` },
        ]}
      >
        <Ionicons
          name={estado.icono}
          size={52}
          color={estado.color}
        />
      </View>

      <Text style={[s.etiqueta, { color: estado.color }]}>
        {estado.etiqueta}
      </Text>

      <Text style={s.titulo}>{estado.titulo}</Text>
      <Text style={s.mensaje}>{estado.mensaje}</Text>

      <View style={s.resumen}>
        <View>
          <Text style={s.secundario}>Paquete de créditos</Text>
          <Text style={s.valor}>{compra.creditos} créditos</Text>
        </View>

        <View>
          <Text style={s.secundario}>Monto de la compra</Text>
          <Text style={s.valor}>
            ${compra.monto_clp.toLocaleString('es-CL')} CLP
          </Text>
        </View>
      </View>

      <Text selectable style={s.referencia}>
        Compra · {compra.id}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  tarjeta: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    gap: 14,
  },
  icono: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiqueta: {
    fontSize: 13,
    fontWeight: '700',
  },
  titulo: {
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
  },
  mensaje: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 14,
  },
  resumen: {
    width: '100%',
    gap: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 20,
  },
  secundario: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  valor: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  referencia: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
  },
});