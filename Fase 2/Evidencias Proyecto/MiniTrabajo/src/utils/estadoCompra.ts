import type { CompraCreditos } from '../services/webpay';

export function estadoCompra(compra: CompraCreditos) {
  if (compra.estado === 'aprobado' && compra.acreditado_en) {
    return {
      titulo: '¡Tus créditos ya están aquí!',
      etiqueta: 'Aprobada',
      mensaje: `Agregamos ${compra.creditos} créditos a tu saldo. Ya puedes usarlos para destacar tus publicaciones.`,
      icono: 'checkmark-circle' as const,
      color: '#4ade80',
    };
  }

  switch (compra.estado) {
    case 'anulado':
    case 'cancelado':
      return {
        titulo: 'Compra cancelada',
        etiqueta: 'Cancelada',
        mensaje:
          'Este intento se cerró sin acreditar créditos. Puedes elegir un paquete y volver a intentarlo cuando quieras.',
        icono: 'close-circle' as const,
        color: '#9ca3af',
      };

    case 'rechazado':
      return {
        titulo: 'El pago fue rechazado',
        etiqueta: 'Rechazada',
        mensaje:
          'No se acreditaron créditos en este intento. Puedes volver a comprar con otro medio de pago.',
        icono: 'close-circle' as const,
        color: '#fb7185',
      };

    case 'expirado':
      return {
        titulo: 'El tiempo de pago terminó',
        etiqueta: 'Expirada',
        mensaje:
          'Este intento expiró sin acreditar créditos. Vuelve al perfil para iniciar una nueva compra.',
        icono: 'time' as const,
        color: '#fbbf24',
      };

    case 'error':
      return {
        titulo: 'No pudimos completar la compra',
        etiqueta: 'Con error',
        mensaje:
          'Revisa el estado de esta compra antes de intentarlo otra vez. Si viste un cobro, conserva el identificador de la compra.',
        icono: 'alert-circle' as const,
        color: '#fb7185',
      };

    default:
      return {
        titulo: 'Estamos revisando tu compra',
        etiqueta: 'Por confirmar',
        mensaje:
          'Todavía no confirmamos la acreditación. Si ya pagaste, evita repetir la compra y vuelve a consultar el resultado.',
        icono: 'time' as const,
        color: '#fbbf24',
      };
  }
}