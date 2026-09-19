import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    TextInput,
    Modal,
    ScrollView,
    Pressable,
    Linking,
    Alert,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

type EstadoTrabajo = 'disponible' | 'postulado' | 'aceptado' | 'completado';

interface Trabajo {
    id: string;
    titulo: string;
    categoria: string;
    monto: string;
    distancia: string;
    solicitante: string;
    comuna: string;
    telefono: string;
    descripcion: string;
    requisitos: string;
    destacado?: boolean;
    estado: EstadoTrabajo;
    imagenes?: string[];
}

const TRABAJOS_INICIALES: Trabajo[] = [
    {
        id: '1',
        titulo: 'Armado de mueble dormitorio',
        categoria: 'Hogar',
        monto: '$15.000',
        distancia: '1.2 km',
        solicitante: 'Carlos Mendoza',
        comuna: 'Santiago Centro',
        telefono: '56912345678',
        descripcion:
            'Necesito armar una cómoda de 4 cajones. Cuento con las cajas selladas y espacio despejado en la habitación.',
        requisitos: 'Traer destornillador eléctrico o set manual de puntas cruz y llave allen.',
        destacado: true,
        estado: 'disponible',
        imagenes: [
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600',
            'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600',
        ],
    },
    {
        id: '2',
        titulo: 'Paseo de perro (Pastor Alemán)',
        categoria: 'Mascotas',
        monto: '$8.000',
        distancia: '0.5 km',
        solicitante: 'Sofía Rojas',
        comuna: 'Providencia',
        telefono: '56987654321',
        descripcion:
            'Paseo de 1 hora por parques cercanos. Es dócil y está acostumbrado a pasear con arnés.',
        requisitos: 'Experiencia previa con perros de raza mediana o grande.',
        destacado: false,
        estado: 'disponible',
        imagenes: [
            'https://images.unsplash.com/photo-1589941013453-ec89f33b5455?w=600',
        ],
    },
    {
        id: '3',
        titulo: 'Apoyo en mudanza pequeña',
        categoria: 'Flete',
        monto: '$25.000',
        distancia: '3.0 km',
        solicitante: 'Matías Pinto',
        comuna: 'Estación Central',
        telefono: '56911223344',
        descripcion:
            'Ayudar a bajar cajas y una cama desde un tercer piso por escalera. El camión ya está contratado.',
        requisitos: 'Zapatillas cómodas y guantes de trabajo.',
        destacado: false,
        estado: 'aceptado',
        imagenes: [],
    },
    {
        id: '4',
        titulo: 'Instalación de cortinas y lámparas',
        categoria: 'Hogar',
        monto: '$18.000',
        distancia: '2.4 km',
        solicitante: 'Valeria Gómez',
        comuna: 'Ñuñoa',
        telefono: '56999887766',
        descripcion:
            'Instalar dos barras de cortina en living y plafones LED en techo de concreto.',
        requisitos: 'Traer taladro percutor, brocas y escalera pequeña.',
        destacado: false,
        estado: 'disponible',
        imagenes: [
            'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600',
        ],
    },
];

const CATEGORIAS_LISTA = [
    'Todas las categorías',
    'Hogar',
    'Mascotas',
    'Flete',
    'Jardinería',
    'Tecnología',
    'Cuidado de personas',
];

const COMUNAS_CHILE = [
    'Todas las comunas',
    'Santiago Centro',
    'Providencia',
    'Las Condes',
    'Ñuñoa',
    'Estación Central',
    'Maipú',
    'La Florida',
    'San Miguel',
    'Macul',
    'Peñalolén',
];

export default function TrabajosScreen() {
    const [trabajos, setTrabajos] = useState<Trabajo[]>(TRABAJOS_INICIALES);
    const [vista, setVista] = useState<'lista' | 'mapa'>('lista');
    const [modalFiltrosVisible, setModalFiltrosVisible] = useState(false);
    const [dropdownVisible, setDropdownVisible] = useState<'ninguno' | 'categoria' | 'comuna'>('ninguno');
    const [busqueda, setBusqueda] = useState('');

    const [trabajoSeleccionado, setTrabajoSeleccionado] = useState<Trabajo | null>(null);

    // Estados de filtros
    const [categoriaSel, setCategoriaSel] = useState('Todas las categorías');
    const [comunaSel, setComunaSel] = useState('Todas las comunas');
    const [distanciaMax, setDistanciaMax] = useState(5);
    const [presupuestoMin, setPresupuestoMin] = useState(15000);

    const insets = useSafeAreaInsets();
    const buttonBottom = (insets.bottom > 0 ? insets.bottom : 12) + 80;

    const hayFiltrosActivos =
        categoriaSel !== 'Todas las categorías' ||
        comunaSel !== 'Todas las comunas' ||
        distanciaMax !== 5 ||
        presupuestoMin !== 15000;

    const handlePostular = (id: string) => {
        setTrabajos((prev) =>
            prev.map((t) => (t.id === id ? { ...t, estado: 'postulado' } : t))
        );
        if (trabajoSeleccionado) {
            setTrabajoSeleccionado({ ...trabajoSeleccionado, estado: 'postulado' });
        }
        Alert.alert(
            '¡Postulación enviada!',
            'El solicitante revisará tu perfil. Si te acepta, se habilitará el botón para coordinar por WhatsApp.'
        );
    };

    const handleRetirarPostulacion = (id: string) => {
        Alert.alert(
            'Retirar postulación',
            '¿Deseas retirar tu postulación a esta tarea?',
            [
                { text: 'No, volver', style: 'cancel' },
                {
                    text: 'Sí, retirar',
                    style: 'destructive',
                    onPress: () => {
                        setTrabajos((prev) =>
                            prev.map((t) => (t.id === id ? { ...t, estado: 'disponible' } : t))
                        );
                        if (trabajoSeleccionado) {
                            setTrabajoSeleccionado({ ...trabajoSeleccionado, estado: 'disponible' });
                        }
                        Alert.alert('Postulación retirada', 'Puedes volver a postular cuando gustes.');
                    },
                },
            ]
        );
    };

    const handleCancelarTrabajoAceptado = (id: string) => {
        Alert.alert(
            'Cancelar trabajo acordado',
            '¿Seguro que no puedes realizar este trabajo? Recuerda avisar al solicitante por respeto.',
            [
                { text: 'Continuar con el trabajo', style: 'cancel' },
                {
                    text: 'Cancelar trabajo',
                    style: 'destructive',
                    onPress: () => {
                        setTrabajos((prev) =>
                            prev.map((t) => (t.id === id ? { ...t, estado: 'disponible' } : t))
                        );
                        if (trabajoSeleccionado) {
                            setTrabajoSeleccionado({ ...trabajoSeleccionado, estado: 'disponible' });
                        }
                        Alert.alert('Trabajo cancelado', 'La tarea vuelve a estar disponible para la comunidad.');
                    },
                },
            ]
        );
    };

    const handleAbrirWhatsApp = (trabajo: Trabajo) => {
        const mensaje = encodeURIComponent(
            `¡Hola ${trabajo.solicitante}! Aceptaste mi postulación para "${trabajo.titulo}" en la app. Te escribo para coordinar la hora y dirección exacta.`
        );
        const url = `https://wa.me/${trabajo.telefono}?text=${mensaje}`;
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'No se pudo abrir WhatsApp en tu dispositivo.');
        });
    };

    const handleCompletarTarea = (id: string) => {
        Alert.alert(
            'Finalizar Tarea',
            '¿Confirmas que realizaste el trabajo y recibiste el pago acordado directamente?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí, calificar',
                    onPress: () => {
                        setTrabajos((prev) =>
                            prev.map((t) => (t.id === id ? { ...t, estado: 'completado' } : t))
                        );
                        setTrabajoSeleccionado(null);
                        Alert.alert('¡Tarea Completada!', 'Gracias por calificar. El trabajo se registró en tu historial.');
                    },
                },
            ]
        );
    };

    const renderStatusTag = (estado: EstadoTrabajo) => {
        if (estado === 'postulado') {
            return (
                <View style={[styles.statusTag, styles.statusTagPending]}>
                    <Text style={styles.statusTagPendingText}>Postulado (Esperando)</Text>
                </View>
            );
        }
        if (estado === 'aceptado') {
            return (
                <View style={[styles.statusTag, styles.statusTagAccepted]}>
                    <Text style={styles.statusTagAcceptedText}>¡Aceptado! En curso</Text>
                </View>
            );
        }
        if (estado === 'completado') {
            return (
                <View style={[styles.statusTag, styles.statusTagCompleted]}>
                    <Text style={styles.statusTagCompletedText}>Completado</Text>
                </View>
            );
        }
        return null;
    };

    return (
        <View style={styles.container}>
            {/* 1. BUSCADOR Y FILTROS */}
            <View style={styles.searchRow}>
                <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar mini-trabajos..."
                        placeholderTextColor={colors.textSecondary}
                        value={busqueda}
                        onChangeText={setBusqueda}
                    />
                    {busqueda.length > 0 && (
                        <TouchableOpacity onPress={() => setBusqueda('')}>
                            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.filterButton, hayFiltrosActivos && styles.filterButtonActive]}
                    onPress={() => setModalFiltrosVisible(true)}
                >
                    <Ionicons
                        name="options-outline"
                        size={20}
                        color={hayFiltrosActivos ? colors.accentBlue : colors.textPrimary}
                    />
                    {hayFiltrosActivos && <View style={styles.filterDotActive} />}
                </TouchableOpacity>
            </View>

            {/* 2. LISTADO DE TRABAJOS */}
            {vista === 'lista' ? (
                <FlatList
                    data={trabajos}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[styles.listContent, { paddingBottom: buttonBottom + 60 }]}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.card, item.destacado && styles.cardFeatured]}
                            onPress={() => setTrabajoSeleccionado(item)}
                        >
                            {item.destacado && (
                                <View style={styles.featuredBadgeTop}>
                                    <Ionicons name="flash" size={11} color="#000000" />
                                    <Text style={styles.featuredBadgeText}>DESTACADO</Text>
                                </View>
                            )}

                            <View style={styles.cardHeader}>
                                <View style={styles.headerLeftRow}>
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{item.categoria}</Text>
                                    </View>
                                    {renderStatusTag(item.estado)}
                                    {item.imagenes && item.imagenes.length > 0 && (
                                        <View style={styles.photosBadgeTag}>
                                            <Ionicons name="image-outline" size={12} color={colors.accentBlue} />
                                            <Text style={styles.photosBadgeText}>{item.imagenes.length}</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.cardMonto}>{item.monto}</Text>
                            </View>

                            <Text style={styles.cardTitle}>{item.titulo}</Text>

                            <View style={styles.cardFooter}>
                                <View style={styles.footerItem}>
                                    <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                                    <Text style={styles.footerText}>
                                        {item.distancia} • {item.comuna}
                                    </Text>
                                </View>
                                <View style={styles.footerItem}>
                                    <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
                                    <Text style={styles.footerText}>{item.solicitante}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            ) : (
                <View style={styles.mapContainer}>
                    <Ionicons name="map-outline" size={54} color={colors.textMuted} />
                    <Text style={styles.mapTitle}>Vista de Mapa</Text>
                    <Text style={styles.mapSubtitle}>
                        Mostrando: {categoriaSel} en {comunaSel} (hasta {distanciaMax} km)
                    </Text>
                </View>
            )}

            {/* 3. BOTÓN FLOTANTE ESTILO PLUXEE */}
            <View style={[styles.floatingButtonContainer, { bottom: buttonBottom }]} pointerEvents="box-none">
                <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.pluxeeButton}
                    onPress={() => setVista(vista === 'lista' ? 'mapa' : 'lista')}
                >
                    <Ionicons
                        name={vista === 'lista' ? 'location-sharp' : 'reorder-three'}
                        size={18}
                        color="#ffffff"
                    />
                    <Text style={styles.pluxeeButtonText}>
                        {vista === 'lista' ? 'Mostrar en el mapa' : 'Volver al listado'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 4. MODAL DETALLE CON FLUJO DE ACCIONES Y CANCELACIÓN */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={trabajoSeleccionado !== null}
                onRequestClose={() => setTrabajoSeleccionado(null)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setTrabajoSeleccionado(null)}>
                    <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
                        {trabajoSeleccionado && (
                            <>
                                <View style={styles.sheetHeader}>
                                    <View style={styles.detailCategoryRow}>
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>{trabajoSeleccionado.categoria}</Text>
                                        </View>
                                        {renderStatusTag(trabajoSeleccionado.estado)}
                                    </View>
                                    <TouchableOpacity onPress={() => setTrabajoSeleccionado(null)}>
                                        <Ionicons name="close" size={24} color={colors.textPrimary} />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScrollContent}>
                                    <Text style={styles.detailTitle}>{trabajoSeleccionado.titulo}</Text>

                                    {/* Carrusel de fotos */}
                                    {trabajoSeleccionado.imagenes && trabajoSeleccionado.imagenes.length > 0 && (
                                        <View style={styles.detailImagesContainer}>
                                            <Text style={styles.detailSectionTitle}>Fotos del trabajo ({trabajoSeleccionado.imagenes.length})</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.detailImagesScroll}>
                                                {trabajoSeleccionado.imagenes.map((uri, idx) => (
                                                    <View key={idx} style={styles.detailImageCard}>
                                                        <Image source={{ uri }} style={styles.detailImage} />
                                                    </View>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}

                                    <View style={styles.detailMetaCard}>
                                        <View style={styles.detailMetaItem}>
                                            <Text style={styles.detailMetaLabel}>PAGO DIRECTO</Text>
                                            <Text style={styles.detailPrice}>{trabajoSeleccionado.monto}</Text>
                                        </View>
                                        <View style={styles.detailMetaDivider} />
                                        <View style={styles.detailMetaItem}>
                                            <Text style={styles.detailMetaLabel}>COMUNA</Text>
                                            <Text style={styles.detailComuna}>{trabajoSeleccionado.comuna}</Text>
                                        </View>
                                    </View>

                                    <Text style={styles.detailSectionTitle}>Publicado por</Text>
                                    <View style={styles.userRowDetail}>
                                        <View style={styles.userAvatarDetail}>
                                            <Ionicons name="person" size={18} color={colors.textPrimary} />
                                        </View>
                                        <View>
                                            <Text style={styles.userNameDetail}>{trabajoSeleccionado.solicitante}</Text>
                                            <Text style={styles.userSubDetail}>A {trabajoSeleccionado.distancia} de tu ubicación</Text>
                                        </View>
                                    </View>

                                    <Text style={styles.detailSectionTitle}>Descripción</Text>
                                    <Text style={styles.detailBodyText}>{trabajoSeleccionado.descripcion}</Text>

                                    <Text style={styles.detailSectionTitle}>Requisitos / Herramientas</Text>
                                    <View style={styles.requirementsBox}>
                                        <Ionicons name="hammer-outline" size={16} color={colors.accentBlue} />
                                        <Text style={styles.requirementsText}>{trabajoSeleccionado.requisitos}</Text>
                                    </View>

                                    <Text style={styles.disclaimerText}>
                                        * El pago se acuerda y se efectúa directamente con el solicitante en persona o transferencia.
                                    </Text>
                                </ScrollView>

                                {/* ACCIONES DINÁMICAS SEGÚN EL ESTADO */}
                                <View style={styles.detailActionContainer}>
                                    {trabajoSeleccionado.estado === 'disponible' && (
                                        <TouchableOpacity
                                            style={styles.btnPrimaryAction}
                                            activeOpacity={0.85}
                                            onPress={() => handlePostular(trabajoSeleccionado.id)}
                                        >
                                            <Ionicons name="hand-right-outline" size={18} color="#ffffff" />
                                            <Text style={styles.btnActionText}>Postular a este trabajo</Text>
                                        </TouchableOpacity>
                                    )}

                                    {trabajoSeleccionado.estado === 'postulado' && (
                                        <View style={{ gap: 8 }}>
                                            <View style={styles.pendingActionWrap}>
                                                <Ionicons name="time-outline" size={20} color="#eab308" />
                                                <Text style={styles.pendingActionText}>
                                                    Postulación enviada. Te notificaremos si el solicitante te acepta.
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.btnRetirarPostulacion}
                                                onPress={() => handleRetirarPostulacion(trabajoSeleccionado.id)}
                                                activeOpacity={0.8}
                                            >
                                                <Ionicons name="close" size={14} color="#ef4444" />
                                                <Text style={styles.btnRetirarPostulacionText}>Retirar postulación</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {trabajoSeleccionado.estado === 'aceptado' && (
                                        <View style={{ gap: 8 }}>
                                            <View style={styles.acceptedButtonsRow}>
                                                <TouchableOpacity
                                                    style={styles.whatsappButton}
                                                    activeOpacity={0.85}
                                                    onPress={() => handleAbrirWhatsApp(trabajoSeleccionado)}
                                                >
                                                    <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                                                    <Text style={styles.btnActionText}>WhatsApp</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={styles.btnComplete}
                                                    activeOpacity={0.85}
                                                    onPress={() => handleCompletarTarea(trabajoSeleccionado.id)}
                                                >
                                                    <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                                                    <Text style={styles.btnActionText}>Completada</Text>
                                                </TouchableOpacity>
                                            </View>

                                            <TouchableOpacity
                                                style={styles.btnRetirarPostulacion}
                                                onPress={() => handleCancelarTrabajoAceptado(trabajoSeleccionado.id)}
                                                activeOpacity={0.8}
                                            >
                                                <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
                                                <Text style={styles.btnRetirarPostulacionText}>No podré realizar este trabajo</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {trabajoSeleccionado.estado === 'completado' && (
                                        <View style={styles.completedBadgeWrap}>
                                            <Ionicons name="checkmark-done" size={18} color={colors.accentGreen} />
                                            <Text style={styles.completedBadgeText}>Trabajo finalizado y calificado</Text>
                                        </View>
                                    )}
                                </View>
                            </>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>

            {/* 5. MODAL DE FILTROS */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalFiltrosVisible}
                onRequestClose={() => setModalFiltrosVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setModalFiltrosVisible(false)}>
                    <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Filtrar búsqueda</Text>
                            <TouchableOpacity onPress={() => setModalFiltrosVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
                            <Text style={styles.filterSectionTitle}>Categoría</Text>
                            <TouchableOpacity
                                style={styles.dropdownButton}
                                activeOpacity={0.7}
                                onPress={() => setDropdownVisible('categoria')}
                            >
                                <View style={styles.dropdownInner}>
                                    <Ionicons name="briefcase-outline" size={18} color={colors.accentBlue} />
                                    <Text style={styles.dropdownButtonText}>{categoriaSel}</Text>
                                </View>
                                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                            </TouchableOpacity>

                            <Text style={styles.filterSectionTitle}>Comuna</Text>
                            <TouchableOpacity
                                style={styles.dropdownButton}
                                activeOpacity={0.7}
                                onPress={() => setDropdownVisible('comuna')}
                            >
                                <View style={styles.dropdownInner}>
                                    <Ionicons name="navigate-outline" size={18} color={colors.accentBlue} />
                                    <Text style={styles.dropdownButtonText}>{comunaSel}</Text>
                                </View>
                                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                            </TouchableOpacity>

                            <View style={styles.sliderHeaderRow}>
                                <Text style={styles.filterSectionTitle}>Radio de distancia</Text>
                                <Text style={styles.sliderValueBadge}>{distanciaMax} km</Text>
                            </View>
                            <View style={styles.sliderContainer}>
                                <View style={styles.sliderTrack}>
                                    <View style={[styles.sliderFill, { width: `${(distanciaMax / 20) * 100}%` }]} />
                                </View>
                                <View style={styles.sliderStepsRow}>
                                    {[1, 5, 10, 15, 20].map((km) => (
                                        <TouchableOpacity
                                            key={km}
                                            style={[styles.stepItem, distanciaMax === km && styles.stepItemActive]}
                                            onPress={() => setDistanciaMax(km)}
                                        >
                                            <Text style={[styles.stepText, distanciaMax === km && styles.stepTextActive]}>
                                                {km}k
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.sliderHeaderRow}>
                                <Text style={styles.filterSectionTitle}>Pago mínimo esperado</Text>
                                <Text style={styles.sliderValueBadge}>${presupuestoMin.toLocaleString('es-CL')}</Text>
                            </View>
                            <View style={styles.sliderContainer}>
                                <View style={styles.sliderTrack}>
                                    <View
                                        style={[
                                            styles.sliderFill,
                                            { width: `${(presupuestoMin / 50000) * 100}%`, backgroundColor: colors.accentGreen },
                                        ]}
                                    />
                                </View>
                                <View style={styles.sliderStepsRow}>
                                    {[5000, 15000, 25000, 35000, 50000].map((monto) => (
                                        <TouchableOpacity
                                            key={monto}
                                            style={[styles.stepItem, presupuestoMin === monto && styles.stepItemActive]}
                                            onPress={() => setPresupuestoMin(monto)}
                                        >
                                            <Text style={[styles.stepText, presupuestoMin === monto && styles.stepTextActive]}>
                                                ${monto >= 1000 ? `${monto / 1000}k` : monto}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.sheetFooter}>
                            <TouchableOpacity
                                style={styles.btnReset}
                                onPress={() => {
                                    setCategoriaSel('Todas las categorías');
                                    setComunaSel('Todas las comunas');
                                    setDistanciaMax(5);
                                    setPresupuestoMin(15000);
                                }}
                            >
                                <Text style={styles.btnResetText}>Restablecer</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.btnApply}
                                onPress={() => setModalFiltrosVisible(false)}
                            >
                                <Text style={styles.btnApplyText}>Aplicar Filtros</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* 6. MODAL SELECTORES */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={dropdownVisible !== 'ninguno'}
                onRequestClose={() => setDropdownVisible('ninguno')}
            >
                <Pressable style={styles.dropdownOverlay} onPress={() => setDropdownVisible('ninguno')}>
                    <Pressable style={styles.dropdownModal} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.dropdownHeader}>
                            <Text style={styles.dropdownTitle}>
                                {dropdownVisible === 'categoria' ? 'Selecciona una Categoría' : 'Selecciona una Comuna'}
                            </Text>
                            <TouchableOpacity onPress={() => setDropdownVisible('ninguno')}>
                                <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={dropdownVisible === 'categoria' ? CATEGORIAS_LISTA : COMUNAS_CHILE}
                            keyExtractor={(item) => item}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => {
                                const isSelected =
                                    dropdownVisible === 'categoria' ? categoriaSel === item : comunaSel === item;

                                return (
                                    <TouchableOpacity
                                        style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                                        onPress={() => {
                                            if (dropdownVisible === 'categoria') {
                                                setCategoriaSel(item);
                                            } else {
                                                setComunaSel(item);
                                            }
                                            setDropdownVisible('ninguno');
                                        }}
                                    >
                                        <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                                            {item}
                                        </Text>
                                        {isSelected && (
                                            <Ionicons name="checkmark" size={18} color={colors.accentBlue} />
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: 20,
        paddingTop: 14,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceLight,
        borderRadius: 20,
        paddingHorizontal: 14,
        height: 44,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 14,
        marginLeft: 8,
        paddingVertical: 0,
    },
    filterButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterButtonActive: {
        borderColor: colors.accentBlue,
        backgroundColor: colors.accentBlueBg,
    },
    filterDotActive: {
        position: 'absolute',
        top: 9,
        right: 10,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.accentBlue,
    },
    listContent: {
        paddingTop: 2,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        position: 'relative',
    },
    cardFeatured: {
        borderColor: '#eab308',
        backgroundColor: 'rgba(234, 179, 8, 0.03)',
    },
    featuredBadgeTop: {
        position: 'absolute',
        top: -8,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#eab308',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    featuredBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#000000',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    headerLeftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    badge: {
        backgroundColor: colors.accentBlueBg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        color: colors.accentBlue,
        fontSize: 12,
        fontWeight: '600',
    },
    photosBadgeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: colors.surfaceLight,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
    },
    photosBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.accentBlue,
    },
    statusTag: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusTagPending: {
        backgroundColor: 'rgba(234, 179, 8, 0.15)',
    },
    statusTagPendingText: {
        color: '#eab308',
        fontSize: 10,
        fontWeight: '700',
    },
    statusTagAccepted: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
    },
    statusTagAcceptedText: {
        color: colors.accentGreen,
        fontSize: 10,
        fontWeight: '700',
    },
    statusTagCompleted: {
        backgroundColor: colors.surfaceLight,
    },
    statusTagCompletedText: {
        color: colors.textMuted,
        fontSize: 10,
        fontWeight: '700',
    },
    cardMonto: {
        color: colors.accentGreen,
        fontSize: 16,
        fontWeight: '700',
    },
    cardTitle: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footerText: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    mapContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 140,
    },
    mapTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 12,
    },
    mapSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 30,
        marginTop: 6,
    },
    floatingButtonContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pluxeeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1d4ed8',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 8,
        gap: 8,
        elevation: 6,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
    },
    pluxeeButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingHorizontal: 20,
        maxHeight: '84%',
        borderTopWidth: 1,
        borderColor: colors.border,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    sheetBody: {
        paddingVertical: 14,
    },
    filterSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        marginVertical: 8,
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceLight,
        paddingHorizontal: 14,
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 14,
    },
    dropdownInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dropdownButtonText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '500',
    },
    sliderHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
    },
    sliderValueBadge: {
        color: colors.accentBlue,
        fontSize: 14,
        fontWeight: '700',
    },
    sliderContainer: {
        marginBottom: 18,
    },
    sliderTrack: {
        height: 6,
        backgroundColor: colors.surfaceLight,
        borderRadius: 3,
        marginVertical: 10,
        overflow: 'hidden',
    },
    sliderFill: {
        height: '100%',
        backgroundColor: colors.accentBlue,
        borderRadius: 3,
    },
    sliderStepsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    stepItem: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        backgroundColor: colors.surfaceLight,
    },
    stepItemActive: {
        backgroundColor: colors.border,
    },
    stepText: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    stepTextActive: {
        color: colors.textPrimary,
        fontWeight: '700',
    },
    sheetFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 12,
    },
    btnReset: {
        flex: 1,
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceLight,
    },
    btnResetText: {
        color: colors.textSecondary,
        fontWeight: '600',
        fontSize: 14,
    },
    btnApply: {
        flex: 2,
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accentBlue,
    },
    btnApplyText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 14,
    },
    dropdownOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    dropdownModal: {
        width: '100%',
        maxHeight: '65%',
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.border,
    },
    dropdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        marginBottom: 8,
    },
    dropdownTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceLight,
    },
    dropdownItemActive: {
        backgroundColor: colors.surfaceLight,
        borderRadius: 8,
        paddingHorizontal: 8,
    },
    dropdownItemText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    dropdownItemTextActive: {
        color: colors.accentBlue,
        fontWeight: '700',
    },

    // Modal Detalle
    detailCategoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailScrollContent: {
        paddingVertical: 14,
    },
    detailTitle: {
        fontSize: 19,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 12,
    },
    detailImagesContainer: {
        marginBottom: 14,
    },
    detailImagesScroll: {
        flexDirection: 'row',
        marginTop: 6,
    },
    detailImageCard: {
        width: 140,
        height: 100,
        borderRadius: 12,
        marginRight: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceLight,
    },
    detailImage: {
        width: '100%',
        height: '100%',
    },
    detailMetaCard: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceLight,
        borderRadius: 14,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    detailMetaItem: {
        flex: 1,
        alignItems: 'center',
    },
    detailMetaDivider: {
        width: 1,
        backgroundColor: colors.border,
    },
    detailMetaLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    detailPrice: {
        fontSize: 17,
        fontWeight: '800',
        color: colors.accentGreen,
        marginTop: 2,
    },
    detailComuna: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        marginTop: 2,
    },
    detailSectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 8,
        marginTop: 6,
    },
    userRowDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.surfaceLight,
        padding: 10,
        borderRadius: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    userAvatarDetail: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    userNameDetail: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    userSubDetail: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    detailBodyText: {
        fontSize: 13,
        color: colors.textPrimary,
        lineHeight: 20,
        marginBottom: 14,
    },
    requirementsBox: {
        flexDirection: 'row',
        gap: 10,
        backgroundColor: colors.surfaceLight,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    requirementsText: {
        flex: 1,
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    disclaimerText: {
        fontSize: 11,
        color: colors.textMuted,
        fontStyle: 'italic',
        lineHeight: 15,
        marginTop: 4,
    },

    // Controles de Acción
    detailActionContainer: {
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    btnPrimaryAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accentBlue,
        height: 50,
        borderRadius: 14,
        gap: 8,
    },
    btnActionText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '700',
    },
    pendingActionWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        padding: 14,
        borderRadius: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(234, 179, 8, 0.3)',
    },
    pendingActionText: {
        flex: 1,
        color: '#eab308',
        fontSize: 12,
        fontWeight: '600',
    },
    btnRetirarPostulacion: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 4,
    },
    btnRetirarPostulacionText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#ef4444',
    },
    acceptedButtonsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    whatsappButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#22c55e',
        height: 50,
        borderRadius: 14,
        gap: 8,
    },
    btnComplete: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1d4ed8',
        height: 50,
        borderRadius: 14,
        gap: 8,
    },
    completedBadgeWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceLight,
        height: 48,
        borderRadius: 14,
        gap: 8,
    },
    completedBadgeText: {
        color: colors.accentGreen,
        fontSize: 13,
        fontWeight: '700',
    },
});