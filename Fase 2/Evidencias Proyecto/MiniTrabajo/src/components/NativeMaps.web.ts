// Versión web: react-native-maps no soporta web, así que se usan stubs
// que muestran un aviso en lugar de romper el bundle.
// (Archivo .web.ts, no .tsx: Metro prueba .ts antes que .tsx y tomaría NativeMaps.ts.)
import React from 'react';
import { View, Text } from 'react-native';

export const PROVIDER_DEFAULT = null;

export const Marker = (_props: any) => null;
export const Callout = (_props: any) => null;

export default class MapView extends React.Component<any> {
  animateToRegion(_region?: any, _duration?: number) {}

  render() {
    return React.createElement(
      View,
      {
        style: [
          { alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d1117', padding: 24 },
          this.props.style,
        ],
      },
      React.createElement(
        Text,
        { style: { color: '#8b949e', textAlign: 'center', fontSize: 14 } },
        'El mapa solo está disponible en la app móvil (Expo Go / iOS / Android).'
      )
    );
  }
}
