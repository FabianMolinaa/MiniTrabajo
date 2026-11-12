import { View, Modal } from "react-native";
import PagoWebpay from "../components/PagoWebpay";
import HistorialCompras from "../components/HistorialCompras";
import EstadoListaRemota from "../components/EstadoListaRemota";
import AlertaPerfil from "../components/AlertaPerfil";
import FormularioCalificacion from "../components/FormularioCalificacion";
import FormularioEdicionPerfil from "../components/FormularioEdicionPerfil";
import PublicacionesPerfil from "../components/PublicacionesPerfil";
import ResumenPerfil from "../components/ResumenPerfil";
import ActividadPerfil from "../components/ActividadPerfil";
import PostulantesPerfil from "../components/PostulantesPerfil";
import DetallePostulante from "../components/DetallePostulante";
import CreditosPerfil from "../components/CreditosPerfil";
import { usePerfil } from "../hooks/usePerfil";
import { styles } from "../styles/PerfilStyles";

export default function PerfilScreen() {
  const {
    correo,
    cargandoPerfil,
    errorPerfil,
    refrescando,
    cerrandoSesion,
    pagoVisible,
    setPagoVisible,
    historialComprasVisible,
    setHistorialComprasVisible,
    perfil,
    misPublicaciones,
    estadoPublicaciones,
    errorPublicaciones,
    resenasRecibidas,
    estadoResenasRecibidas,
    errorResenasRecibidas,
    historialTrabajos,
    estadoHistorialTrabajos,
    errorHistorialTrabajos,
    comunasDisponibles,
    estadoComunasPerfil,
    errorComunasPerfil,
    cargarComunasPerfil,
    tareaSeleccionada,
    setTareaSeleccionada,
    postulantesDeTarea,
    cargandoPostulantes,
    errorPostulantes,
    postulanteDetalle,
    setPostulanteDetalle,
    resenasPostulante,
    estadoResenasPostulante,
    errorResenasPostulante,
    cargarResenasPostulante,
    historialPostulante,
    estadoHistorialPostulante,
    errorHistorialPostulante,
    cargarHistorialPostulante,
    tabPostulante,
    setTabPostulante,
    targetCalificar,
    estrellasCalificacion,
    setEstrellasCalificacion,
    comentarioCalificacion,
    setComentarioCalificacion,
    guardandoCalificacion,
    tareaOpciones,
    setTareaOpciones,
    modalEditarTareaVisible,
    setModalEditarTareaVisible,
    editTituloTarea,
    setEditTituloTarea,
    editDescripcionTarea,
    setEditDescripcionTarea,
    editMontoTarea,
    setEditMontoTarea,
    guardandoEdicionTarea,
    tabPublicaciones,
    setTabPublicaciones,
    modalVisible,
    setModalVisible,
    modalEditarVisible,
    setModalEditarVisible,
    modalComunasVisible,
    setModalComunasVisible,
    guardandoCambios,
    tempNombre,
    setTempNombre,
    tempSobreMi,
    setTempSobreMi,
    tempAvatarUri,
    setTempAvatarUri,
    setTempAvatarBase64,
    tempComunaId,
    setTempComunaId,
    tempComunaNombre,
    setTempComunaNombre,
    alerta,
    cerrarAlerta,
    handleCerrarSesion,
    cargarDatos,
    onRefresh,
    recargarResenasPropias,
    recargarHistorialPropio,
    recargarPublicacionesPropias,
    handleSeleccionarTarea,
    handleVerPerfilPostulante,
    handleAceptar,
    handleRechazar,
    handleCancelarAcuerdo,
    handleAbrirOpcionesTarea,
    handleIniciarEdicionTarea,
    handleGuardarEdicionTarea,
    handleEliminarTareaOpciones,
    handleAbrirCalificar,
    handleCerrarCalificar,
    handleConfirmarCalificacion,
    handlePickFoto,
    handleGuardarPerfil,
    handleAbrirWhatsApp,
    hayCapaAbierta,
    cerrarCapaSuperior,
  } = usePerfil();


  // Mostrar el historial de compras.
  if (historialComprasVisible) {
    return (
      <HistorialCompras
        onRetomar={() => {
          setHistorialComprasVisible(false);
          setPagoVisible({ paqueteId: null });
        }}
        onCerrar={async () => {
          setHistorialComprasVisible(false);
          setModalVisible("creditos");
          await cargarDatos();
        }}
      />
    );
  }

  // Mostrar Webpay o el resultado de una compra.
  if (pagoVisible !== null) {
    return (
      <PagoWebpay
        paqueteId={pagoVisible.paqueteId}
        onVerHistorial={() => {
          setPagoVisible(null);
          setHistorialComprasVisible(true);
        }}
        onCerrar={async () => {
          setPagoVisible(null);
          setModalVisible("creditos");
          await cargarDatos();
        }}
      />
    );
  }
  if (!perfil) {
    return (
      <View style={styles.screenWrapper}>
        <EstadoListaRemota
          estado={cargandoPerfil ? "cargando" : "error"}
          error={errorPerfil}
          onReintentar={() => void cargarDatos()}
        >
          {null}
        </EstadoListaRemota>
      </View>
    );
  }

  const textoSaldo = cargandoPerfil
    ? "Actualizando saldo…"
    : errorPerfil ? "Saldo sin actualizar" : `${perfil.creditos} créditos`;

  return (
    <View style={styles.screenWrapper}>
      <ResumenPerfil
        perfil={perfil}
        correo={correo}
        textoSaldo={textoSaldo}
        cargandoPerfil={cargandoPerfil}
        errorPerfil={errorPerfil}
        refrescando={refrescando}
        cerrandoSesion={cerrandoSesion}
        estadoPublicaciones={estadoPublicaciones}
        totalPublicaciones={misPublicaciones.length}
        onRefresh={onRefresh}
        onAbrirCreditos={() => setModalVisible("creditos")}
        onEditar={() => {
          setTempNombre(perfil.nombre);
          setTempSobreMi(
            perfil.sobre_mi === "Sin descripción aún."
              ? ""
              : perfil.sobre_mi,
          );
          setTempAvatarUri(perfil.avatar_url);
          setTempAvatarBase64(null);
          setTempComunaId(perfil.comuna_id);
          setTempComunaNombre(perfil.comuna_nombre);
          setModalEditarVisible(true);
        }}
        onAbrirResenas={() => {
          setModalVisible("resenas");
          void recargarResenasPropias();
        }}
        onAbrirHistorial={() => {
          setModalVisible("historial");
          void recargarHistorialPropio();
        }}
        onAbrirPublicaciones={() => {
          setModalVisible("publicaciones");
          void recargarPublicacionesPropias();
        }}
        onCerrarSesion={() => void handleCerrarSesion()}
        onReintentar={() => void cargarDatos()}
      />

      {/* MODAL_HOST_PERFIL: un único Modal nativo; las ventanas se apilan como capas internas
          para evitar presentar un Modal sobre otro (causa bloqueos de toques en iOS). */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={hayCapaAbierta}
        onRequestClose={cerrarCapaSuperior}
      >
        <View style={{ flex: 1 }}>
          {/* MODAL 1: RESEÑAS */}
          <ActividadPerfil
            visible={modalVisible === "resenas" || modalVisible === "historial" ? modalVisible : null}
            resenas={{ datos: resenasRecibidas, estado: estadoResenasRecibidas, error: errorResenasRecibidas }}
            historial={{ datos: historialTrabajos, estado: estadoHistorialTrabajos, error: errorHistorialTrabajos }}
            onCerrar={() => setModalVisible("ninguno")}
            onReintentarResenas={() => void recargarResenasPropias()}
            onReintentarHistorial={() => void recargarHistorialPropio()}
            onCalificarEmpleador={(item) => {
              handleAbrirCalificar(
                {
                  trabajoId: item.id,
                  evaluadoId: item.solicitanteId,
                  nombreContraparte:
                    item.solicitanteNombre || "Empleador",
                  rolContraparte: "empleador",
                  esFinalizacion: false,
                },
                "historial",
              );
            }}
          />

          {/* MODAL 3: MIS PUBLICACIONES */}
          <PublicacionesPerfil
            visible={modalVisible === "publicaciones"}
            listado={{
              publicaciones: misPublicaciones,
              estado: estadoPublicaciones,
              error: errorPublicaciones,
              tab: tabPublicaciones,
            }}
            opciones={tareaOpciones}
            edicion={{
              visible: modalEditarTareaVisible,
              titulo: editTituloTarea,
              descripcion: editDescripcionTarea,
              monto: editMontoTarea,
              guardando: guardandoEdicionTarea,
            }}
            onCerrar={() => setModalVisible("ninguno")}
            onCambiarTab={setTabPublicaciones}
            onReintentar={() => void recargarPublicacionesPropias()}
            onAbrirPostulantes={handleSeleccionarTarea}
            onAbrirOpciones={handleAbrirOpcionesTarea}
            onCalificarTrabajador={(tarea) => {
              handleAbrirCalificar(
                {
                  trabajoId: tarea.id,
                  evaluadoId: tarea.trabajador_id!,
                  nombreContraparte: tarea.trabajador_nombre || "Trabajador",
                  rolContraparte: "trabajador",
                  esFinalizacion: false,
                },
                "publicaciones",
              );
            }}
            onCerrarOpciones={() => setTareaOpciones(null)}
            onEditar={handleIniciarEdicionTarea}
            onEliminar={handleEliminarTareaOpciones}
            onCerrarEdicion={() => setModalEditarTareaVisible(false)}
            onCambiarTitulo={setEditTituloTarea}
            onCambiarDescripcion={setEditDescripcionTarea}
            onCambiarMonto={setEditMontoTarea}
            onGuardarEdicion={handleGuardarEdicionTarea}
          />

          {/* SUB-MODAL: GESTIÓN DE POSTULANTES DE LA TAREA */}
          {tareaSeleccionada !== null && (
            <PostulantesPerfil
              tarea={tareaSeleccionada}
              postulantes={postulantesDeTarea}
              cargando={cargandoPostulantes}
              error={errorPostulantes}
              onCerrar={() => setTareaSeleccionada(null)}
              onFinalizar={() => {
                handleAbrirCalificar(
                  {
                    trabajoId: tareaSeleccionada.id,
                    evaluadoId:
                      tareaSeleccionada.trabajador_id || "",
                    nombreContraparte:
                      tareaSeleccionada.trabajador_nombre ||
                      "Trabajador",
                    rolContraparte: "trabajador",
                    esFinalizacion: true,
                  },
                  "publicaciones",
                );
              }}
              onCalificar={() => {
                handleAbrirCalificar(
                  {
                    trabajoId: tareaSeleccionada.id,
                    evaluadoId:
                      tareaSeleccionada.trabajador_id!,
                    nombreContraparte:
                      tareaSeleccionada.trabajador_nombre ||
                      "Trabajador",
                    rolContraparte: "trabajador",
                    esFinalizacion: false,
                  },
                  "publicaciones",
                );
              }}
              onReintentar={() => void handleSeleccionarTarea(tareaSeleccionada)}
              onCancelarAcuerdo={handleCancelarAcuerdo}
              onVerPerfil={handleVerPerfilPostulante}
              onRechazar={handleRechazar}
              onAceptar={handleAceptar}
              onAbrirWhatsApp={handleAbrirWhatsApp}
            />
          )}

          {/* SUB-MODAL: PERFIL POSTULANTE */}
          {postulanteDetalle !== null && (
            <DetallePostulante
              postulante={postulanteDetalle}
              tab={tabPostulante}
              resenas={{ datos: resenasPostulante, estado: estadoResenasPostulante, error: errorResenasPostulante }}
              historial={{ datos: historialPostulante, estado: estadoHistorialPostulante, error: errorHistorialPostulante }}
              onCambiarTab={setTabPostulante}
              onCerrar={() => setPostulanteDetalle(null)}
              onReintentar={() => {
                if (!postulanteDetalle) return;
                if (tabPostulante === "resenas") {
                  void cargarResenasPostulante(postulanteDetalle.postulante_id);
                } else {
                  void cargarHistorialPostulante(postulanteDetalle.postulante_id);
                }
              }}
            />
          )}

          {/* SUB-MODAL: CALIFICACIÓN MUTUA */}
          {targetCalificar !== null && (
            <FormularioCalificacion
              destinatario={targetCalificar}
              estrellas={estrellasCalificacion}
              comentario={comentarioCalificacion}
              guardando={guardandoCalificacion}
              onCambiarEstrellas={setEstrellasCalificacion}
              onCambiarComentario={setComentarioCalificacion}
              onCerrar={handleCerrarCalificar}
              onConfirmar={handleConfirmarCalificacion}
            />
          )}

          {/* MODAL 4: EDICIÓN DE PERFIL */}
          <FormularioEdicionPerfil
              visible={modalEditarVisible}
              valores={{
                nombre: tempNombre,
                sobreMi: tempSobreMi,
                avatarUri: tempAvatarUri,
                comunaId: tempComunaId,
                comunaNombre: tempComunaNombre,
              }}
              selectorComunas={{
                visible: modalComunasVisible,
                opciones: comunasDisponibles,
                estado: estadoComunasPerfil,
                error: errorComunasPerfil,
              }}
              guardando={guardandoCambios}
              onCambiarNombre={setTempNombre}
              onCambiarSobreMi={setTempSobreMi}
              onElegirFoto={handlePickFoto}
              onGuardar={handleGuardarPerfil}
              onCerrar={() => setModalEditarVisible(false)}
              onAbrirComunas={() => {
                setModalComunasVisible(true);
                void cargarComunasPerfil('catalogo');
              }}
              onCerrarComunas={() => setModalComunasVisible(false)}
              onReintentarComunas={() => void cargarComunasPerfil('catalogo')}
              onSeleccionarComuna={(comuna) => {
                setTempComunaId(comuna.id);
                setTempComunaNombre(comuna.nombre);
                setModalComunasVisible(false);
              }}
            />

          {/* MODAL 5: CRÉDITOS */}
          {modalVisible === "creditos" && (
            <CreditosPerfil
              textoSaldo={textoSaldo}
              onCerrar={() => setModalVisible("ninguno")}
              onVerHistorial={() => {
                setModalVisible("ninguno");
                setHistorialComprasVisible(true);
              }}
              onComprar={(pack: { id: string }) => {
                setModalVisible("ninguno");
                setPagoVisible({ paqueteId: pack.id });
              }}
            />
          )}

          {/* MODAL DE ALERTA PERSONALIZADO (DARK THEME) */}
          {alerta.visible && (
            <AlertaPerfil alerta={alerta} onCerrar={cerrarAlerta} />
          )}
        </View>
      </Modal>
    </View>
  );
}
