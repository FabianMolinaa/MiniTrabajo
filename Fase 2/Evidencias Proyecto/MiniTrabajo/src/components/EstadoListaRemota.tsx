import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EstadoCargaLista } from '../hooks/useListaRemota';
import { colors } from '../theme/colors';

interface Props {
  estado: EstadoCargaLista;
  error: string | null;
  onReintentar: () => void;
  children: React.ReactNode;
}

export default function EstadoListaRemota({ estado, error, onReintentar, children }: Props) {
  if (estado === 'lista') return <>{children}</>;
  if (estado === 'cargando') {
    return <ActivityIndicator style={styles.contenedor} color={colors.accentBlue} accessibilityLabel="Cargando información" />;
  }
  return (
    <View style={styles.contenedor} accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle-outline" size={32} color={colors.textMuted} />
      <Text style={styles.mensaje}>
        {error ?? 'No pudimos cargar esta sección. Inténtalo nuevamente.'}
      </Text>
      <TouchableOpacity
        style={styles.boton}
        accessibilityRole="button"
        accessibilityLabel="Reintentar la carga de esta sección"
        onPress={onReintentar}
      >
        <Text style={styles.textoBoton}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  mensaje: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  boton: { backgroundColor: colors.accentBlue, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
  textoBoton: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
});
