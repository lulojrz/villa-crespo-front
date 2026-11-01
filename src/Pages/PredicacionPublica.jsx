import React, { useState, useEffect, useCallback } from 'react';
import Header from '../Components/Header';
import Swal from 'sweetalert2';
import { puedeAdministrarPublica } from '../utils/permisos';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

/* ───────── utilidades de fecha ───────── */
const formatearFecha = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const getLunes = (fecha) => {
    const d = new Date(fecha);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d;
};

const DIAS_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DIAS_FULL   = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const API = import.meta.env.VITE_API_URL;

/* ───────── componente principal ───────── */
const PredicacionPublica = () => {
    const usuarioActual = localStorage.getItem('usuario');
    const privilegio    = localStorage.getItem('privilegio') || '';
    const asignacion    = localStorage.getItem('asignacion') || '';
    const esAdmin       = puedeAdministrarPublica(privilegio, asignacion);
    const estaHabilitado = localStorage.getItem('habilitacionPublica') === 'true';

    const [turnos,   setTurnos]   = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [semana,   setSemana]   = useState(new Date());

    // pestaña activa = fecha del día seleccionado (string YYYY-MM-DD)
    const [diaActivo, setDiaActivo] = useState(formatearFecha(new Date()));

    // modal o botón procesando: anotarse / desanotarse
    const [accionId, setAccionId] = useState(null);

    // Panel hermanos con carrito/banner
    const [mostrarHermanosPanel, setMostrarHermanosPanel] = useState(false);
    const [hermanosCarrito, setHermanosCarrito] = useState([]);
    const [cargandoHermanos, setCargandoHermanos] = useState(false);

    /* genera los 7 días de la semana actual */
    const diasSemana = Array.from({ length: 7 }).map((_, i) => {
        const d = getLunes(semana);
        d.setDate(d.getDate() + i);
        return d;
    });

    /* asegura que diaActivo esté dentro de la semana visible */
    useEffect(() => {
        const lunes   = getLunes(semana);
        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);
        const activo  = new Date(diaActivo + 'T12:00:00');
        if (activo < lunes || activo > domingo) {
            setDiaActivo(formatearFecha(lunes));
        }
    }, [semana]);

    /* carga turnos de la semana */
    const fetchTurnos = useCallback(async () => {
        setLoading(true);
        try {
            const lunesStr = formatearFecha(getLunes(semana));
            const res = await fetch(`${API}/api/turnos/semana?fecha=${lunesStr}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setTurnos(Array.isArray(data) ? data : []);
            } else {
                setTurnos([]);
            }
        } catch (err) {
            console.error("Error al cargar turnos de la semana:", err);
            setTurnos([]);
        } finally {
            setLoading(false);
        }
    }, [semana]);

    useEffect(() => { 
        fetchTurnos(); 
    }, [fetchTurnos]);

    // WebSocket en vivo para actualizar cambios instantáneamente
    useEffect(() => {
        let stompClient = null;
        try {
            const socket = new SockJS(`${API}/ws-turnos`);
            stompClient = new Client({
                webSocketFactory: () => socket,
                reconnectDelay: 5000,
                onConnect: () => {
                    stompClient.subscribe('/topic/turnos', () => {
                        fetchTurnos();
                    });
                }
            });
            stompClient.activate();
        } catch (e) {
            console.error("Error de WebSocket:", e);
        }

        return () => {
            if (stompClient) {
                stompClient.deactivate();
            }
        };
    }, [fetchTurnos]);

    /* ── cargar hermanos con carrito o banner ── */
    const cargarHermanos = useCallback(async () => {
        if (hermanosCarrito.length > 0) return; // ya cargados
        setCargandoHermanos(true);
        try {
            const res = await fetch(`${API}/usuarios`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                const filtrados = (Array.isArray(data) ? data : []).filter(u => u.carrito || u.banner);
                setHermanosCarrito(filtrados);
            }
        } catch (err) {
            console.error("Error al cargar hermanos con carrito/banner:", err);
        } finally {
            setCargandoHermanos(false);
        }
    }, [hermanosCarrito.length]);

    const toggleHermanosPanel = () => {
        if (!mostrarHermanosPanel) {
            cargarHermanos();
        }
        setMostrarHermanosPanel(prev => !prev);
    };

    /* ── acciones de anotarse / desanotarse ── */
    const toggleAnotarse = async (turno, esSalida = false) => {
        const turnoId = turno.id;

        if (!usuarioActual) {
            Swal.fire('Atención', 'Debes iniciar sesión para anotarte en un turno.', 'warning');
            return;
        }

        if (!esSalida && !estaHabilitado) {
            Swal.fire({
                icon: 'warning',
                title: 'No habilitado',
                text: 'Tu usuario aún no está habilitado para anotarse en carritos de predicación pública. Te invitamos a hablar con el comité de servicio de la congregación.',
                confirmButtonColor: 'var(--bs-primary)'
            });
            return;
        }

        if (esSalida) {
            const confirm = await Swal.fire({
                title: '¿Salir del turno?',
                text: 'Se liberará tu lugar en este turno.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, salir',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: 'var(--bs-danger)',
            });
            if (!confirm.isConfirmed) return;
        } else {
            // Calcular participantes actuales para mostrar mensaje si es el primero
            const participantes = [turno.publicador1, turno.publicador2, turno.publicador3, turno.publicador4].filter(Boolean);
            if (participantes.length === 0) {
                // El usuario sería el primero en anotarse → advertencia
                const confirmSolo = await Swal.fire({
                    title: '¡Recordá ir acompañado!',
                    html: `<div class="text-start">
                              <p class="mb-2">Lo recomendable es estar con al menos otro hermano/a en el carrito o banner.</p>
                              <div class="alert alert-warning py-2 px-3 small mb-0">
                                  <i class="bi bi-exclamation-triangle-fill me-1"></i>
                                  <strong>Nunca predicar solo/a.</strong> Si no encontrás compañero/a, usá la sección
                                  <em>"Hermanos con carrito/banner"</em> para contactar a alguien.
                              </div>
                           </div>`,
                    icon: 'info',
                    showCancelButton: true,
                    confirmButtonText: '<i class="bi bi-plus-circle me-1"></i> Anotarme igual',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: 'var(--bs-primary)',
                });
                if (!confirmSolo.isConfirmed) return;
            }
        }

        setAccionId(turnoId);
        try {
            const res = await fetch(`${API}/api/turnos/anotarse/${turnoId}?usuario=${encodeURIComponent(usuarioActual)}`, {
                method: 'PUT',
                credentials: 'include',
            });

            if (res.ok) {
                Swal.fire({ 
                    icon: 'success', 
                    title: esSalida ? 'Saliste del turno' : '¡Te anotaste con éxito!', 
                    timer: 1500, 
                    showConfirmButton: false 
                });
                fetchTurnos();
            } else {
                const msg = await res.text();
                Swal.fire({ icon: 'error', title: 'Atención', text: msg || 'No se pudo completar la acción.' });
            }
        } catch (err) {
            console.error("Error al interactuar con el turno:", err);
            Swal.fire({ icon: 'error', title: 'Sin conexión', text: 'No se pudo conectar con el servidor.' });
        } finally {
            setAccionId(null);
        }
    };

    /* ── semana anterior / siguiente ── */
    const cambiarSemana = (delta) => {
        setSemana(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() + delta * 7);
            return d;
        });
    };

    const irAHoy = () => {
        setSemana(new Date());
        setDiaActivo(formatearFecha(new Date()));
    };

    /* ── filtrado por día activo ── */
    const turnosDia = turnos.filter(t => t.fecha === diaActivo);

    const hoy = formatearFecha(new Date());
    const esSemanaActual = diasSemana.some(d => formatearFecha(d) === hoy);

    /* ── helper: armar enlace WhatsApp ── */
    const buildWhatsappLink = (telefono, nombre) => {
        if (!telefono) return null;
        const numLimpio = telefono.replace(/\D/g, '');
        if (!numLimpio) return null;
        const texto = encodeURIComponent(`Hola ${nombre}, te escribo por el turno de predicación pública de Villa Crespo.`);
        return `https://wa.me/${numLimpio}?text=${texto}`;
    };

    return (
        <>
            <Header />
            <main className="bg-body-tertiary min-vh-100 pb-5">
                <div className="container py-4" style={{ maxWidth: '900px' }}>

                    {/* ── Encabezado ── */}
                    <div className="mb-4">
                        <p className="text-primary fw-bold text-uppercase mb-1" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>
                            CONGREGACIÓN VILLA CRESPO
                        </p>
                        <h1 className="fw-bold text-body" style={{ fontSize: '2rem' }}>
                            <i className="bi bi-calendar3 me-2 text-primary"></i>
                            Predicación Pública
                        </h1>
                        <p className="text-body-secondary mb-0">
                            Mirá los turnos disponibles de carritos esta semana y anotate en el que puedas participar.
                        </p>
                    </div>

                    {!estaHabilitado && (
                        <div className="alert alert-warning border-0 shadow-sm rounded-4 mb-4 p-3 d-flex align-items-center gap-3">
                            <i className="bi bi-info-circle-fill text-warning fs-3"></i>
                            <div>
                                <div className="fw-bold">Visualización de Turnos</div>
                                <div className="small text-body-secondary">
                                    Podés consultar los turnos de la congregación. Para anotarte como participante, debes hablar con el comité de servicio para habilitar tu usuario.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Panel: Hermanos con carrito o banner ── */}
                    <div className="card border-0 shadow-sm rounded-4 mb-4 bg-body">
                        <div
                            className="card-header bg-transparent border-0 d-flex align-items-center justify-content-between py-3 px-4"
                            style={{ cursor: 'pointer' }}
                            onClick={toggleHermanosPanel}
                            role="button"
                            aria-expanded={mostrarHermanosPanel}
                        >
                            <div className="d-flex align-items-center gap-2">
                                <span className="fs-5">🛒</span>
                                <span className="fw-semibold text-body">Hermanos con carrito o banner</span>
                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle ms-1" style={{ fontSize: '0.72rem' }}>
                                    Contacto directo
                                </span>
                            </div>
                            <i className={`bi bi-chevron-${mostrarHermanosPanel ? 'up' : 'down'} text-body-secondary`}></i>
                        </div>

                        {mostrarHermanosPanel && (
                            <div className="card-body pt-0 px-4 pb-4">
                                <p className="text-body-secondary small mb-3">
                                    Si necesitás compañero/a para un turno, podés contactar directamente a los hermanos que tienen carrito o banner propio.
                                    <strong className="text-danger ms-1">Nunca vayas solo/a a predicar.</strong>
                                </p>

                                {cargandoHermanos ? (
                                    <div className="text-center py-3 text-muted small">
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Cargando hermanos...
                                    </div>
                                ) : hermanosCarrito.length === 0 ? (
                                    <div className="text-center py-3 text-body-secondary small">
                                        <i className="bi bi-person-slash fs-4 d-block mb-2 text-body-tertiary"></i>
                                        No se encontraron hermanos con carrito o banner registrado.
                                    </div>
                                ) : (
                                    <div className="row g-2">
                                        {hermanosCarrito.map(h => {
                                            const nombre = [h.nombre, h.apellido].filter(Boolean).join(' ') || h.usuario;
                                            const wppLink = buildWhatsappLink(h.telefono, nombre);
                                            return (
                                                <div key={h.id || h.usuario} className="col-12 col-sm-6 col-md-4">
                                                    <div className="d-flex align-items-center gap-2 p-2 rounded-3 border bg-body-tertiary">
                                                        <div className="flex-shrink-0 rounded-circle bg-primary-subtle d-flex align-items-center justify-content-center"
                                                             style={{ width: 36, height: 36 }}>
                                                            <i className="bi bi-person-fill text-primary" style={{ fontSize: '1rem' }}></i>
                                                        </div>
                                                        <div className="flex-grow-1 overflow-hidden">
                                                            <div className="fw-semibold text-body small text-truncate">{nombre}</div>
                                                            <div className="d-flex gap-1 mt-1 flex-wrap">
                                                                {h.carrito && (
                                                                    <span className="badge bg-info-subtle text-info border border-info-subtle" style={{ fontSize: '0.65rem' }}>
                                                                        🛒 Carrito
                                                                    </span>
                                                                )}
                                                                {h.banner && (
                                                                    <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle" style={{ fontSize: '0.65rem' }}>
                                                                        🏳️ Banner
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {wppLink ? (
                                                            <a
                                                                href={wppLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="btn btn-sm btn-success rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                                                style={{ width: 34, height: 34 }}
                                                                title={`Escribirle a ${nombre} por WhatsApp`}
                                                            >
                                                                <i className="bi bi-whatsapp" style={{ fontSize: '1rem' }}></i>
                                                            </a>
                                                        ) : (
                                                            <span className="text-body-tertiary small" style={{ fontSize: '0.7rem' }}>Sin tel.</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Navegación de semana ── */}
                    <div className="card border-0 shadow-sm rounded-4 mb-3 bg-body">
                        <div className="card-body p-3">
                            <div className="d-flex align-items-center justify-content-between gap-2">
                                <button
                                    className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center"
                                    style={{ width: 38, height: 38 }}
                                    onClick={() => cambiarSemana(-1)}
                                    title="Semana anterior"
                                >
                                    <i className="bi bi-chevron-left"></i>
                                </button>

                                <div className="text-center">
                                    <div className="fw-semibold text-body" style={{ fontSize: '0.95rem' }}>
                                        {diasSemana[0].toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                        &nbsp;–&nbsp;
                                        {diasSemana[6].toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                    {!esSemanaActual && (
                                        <button
                                            className="btn btn-link btn-sm p-0 text-primary text-decoration-none"
                                            onClick={irAHoy}
                                            style={{ fontSize: '0.8rem' }}
                                        >
                                            Ir a esta semana
                                        </button>
                                    )}
                                </div>

                                <button
                                    className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center"
                                    style={{ width: 38, height: 38 }}
                                    onClick={() => cambiarSemana(1)}
                                    title="Semana siguiente"
                                >
                                    <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Pestañas de días ── */}
                    <div className="d-flex gap-2 mb-4 overflow-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                        {diasSemana.map((d, i) => {
                            const fechaStr = formatearFecha(d);
                            const esHoy    = fechaStr === hoy;
                            const activo   = fechaStr === diaActivo;
                            const cantTurnos = turnos.filter(t => t.fecha === fechaStr).length;

                            return (
                                <button
                                    key={i}
                                    onClick={() => setDiaActivo(fechaStr)}
                                    className={`btn flex-shrink-0 rounded-3 d-flex flex-column align-items-center position-relative ${
                                        activo
                                            ? 'btn-primary text-white shadow-sm'
                                            : 'btn-outline-secondary text-body-secondary bg-body'
                                    }`}
                                    style={{ minWidth: '68px', padding: '10px 8px', border: esHoy && !activo ? '2px solid var(--bs-primary)' : undefined }}
                                >
                                    <small className="fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}>
                                        {DIAS_LABELS[i]}
                                    </small>
                                    <span className="fw-bold" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                                        {d.getDate()}
                                    </span>
                                    {cantTurnos > 0 && (
                                        <span
                                            className={`position-absolute top-0 end-0 translate-middle badge rounded-pill ${activo ? 'bg-white text-primary' : 'bg-primary text-white'}`}
                                            style={{ fontSize: '0.65rem', padding: '3px 6px' }}
                                        >
                                            {cantTurnos}
                                        </span>
                                    )}
                                    {esHoy && !activo && (
                                        <span className="badge bg-primary rounded-pill mt-1" style={{ fontSize: '0.55rem', padding: '2px 6px' }}>Hoy</span>
                                    )}
                                    {esHoy && activo && (
                                        <span className="badge bg-white text-primary rounded-pill mt-1" style={{ fontSize: '0.55rem', padding: '2px 6px' }}>Hoy</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Título del día ── */}
                    <div className="d-flex align-items-center justify-content-between mb-3">
                        <h5 className="fw-bold text-body mb-0">
                            {DIAS_FULL[diasSemana.findIndex(d => formatearFecha(d) === diaActivo)]}
                            &nbsp;
                            <span className="text-body-secondary fw-normal" style={{ fontSize: '0.95rem' }}>
                                {new Date(diaActivo + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long' })}
                            </span>
                        </h5>
                        <span className="badge bg-body-tertiary text-body-secondary border rounded-pill">
                            {turnosDia.length} {turnosDia.length === 1 ? 'turno' : 'turnos'}
                        </span>
                    </div>

                    {/* ── Lista de turnos ── */}
                    {loading ? (
                        <div className="d-flex justify-content-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Cargando...</span>
                            </div>
                        </div>
                    ) : turnosDia.length === 0 ? (
                        <div className="card border-0 shadow-sm rounded-4 bg-body">
                            <div className="card-body text-center py-5">
                                <i className="bi bi-calendar-x fs-1 text-body-tertiary mb-3 d-block"></i>
                                <h6 className="text-body-secondary fw-semibold mb-1">Sin turnos este día</h6>
                                <p className="text-body-tertiary small mb-0">
                                    No hay turnos cargados para este día.<br />
                                    {esAdmin && 'Podés generarlos desde Administración → Predicación Pública → Generar turnos.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {turnosDia.map(turno => {
                                const participantes = [turno.publicador1, turno.publicador2, turno.publicador3, turno.publicador4].filter(Boolean);
                                const miTurno = participantes.some(p => p.usuario === usuarioActual);
                                const lleno = participantes.length >= 4;
                                const cargando = accionId === turno.id;

                                return (
                                    <div
                                        key={turno.id}
                                        className={`card border-0 shadow-sm rounded-4 bg-body ${miTurno ? 'border-start border-4 border-primary' : ''}`}
                                        style={miTurno ? { borderLeftColor: '#0d6efd !important' } : {}}
                                    >
                                        <div className="card-body p-4">
                                            {/* Fila superior: punto + horario */}
                                            <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
                                                <div>
                                                    <div className="d-flex align-items-center gap-2 mb-1">
                                                        {miTurno && (
                                                            <span className="badge bg-primary rounded-pill" style={{ fontSize: '0.7rem' }}>
                                                                <i className="bi bi-check-circle-fill me-1"></i>
                                                                Anotado
                                                            </span>
                                                        )}
                                                        {lleno && !miTurno && (
                                                            <span className="badge bg-danger bg-opacity-10 text-danger rounded-pill border border-danger" style={{ fontSize: '0.7rem' }}>
                                                                <i className="bi bi-x-circle me-1"></i>
                                                                Completo
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h6 className="fw-bold text-body mb-0" style={{ fontSize: '1.05rem' }}>
                                                        <i className="bi bi-geo-alt-fill text-primary me-2"></i>
                                                        {turno.punto?.nombre || 'Punto sin nombre'}
                                                    </h6>
                                                    {turno.punto?.direccion && (
                                                        <small className="text-body-secondary ms-4 ps-1">
                                                            {turno.punto.direccion}
                                                        </small>
                                                    )}
                                                </div>

                                                {/* Horario */}
                                                <div className="text-end flex-shrink-0">
                                                    <div className="fw-bold text-primary" style={{ fontSize: '1.15rem' }}>
                                                        {turno.horaInicio?.slice(0, 5)}
                                                    </div>
                                                    <small className="text-body-secondary">
                                                        hasta {turno.horaFin?.slice(0, 5)}
                                                    </small>
                                                </div>
                                            </div>

                                            {/* Aviso cupos: recomendación */}
                                            {participantes.length === 1 && (
                                                <div className="alert alert-warning border-0 rounded-3 py-2 px-3 mb-3 d-flex align-items-center gap-2 small">
                                                    <i className="bi bi-exclamation-triangle-fill text-warning flex-shrink-0"></i>
                                                    <span>
                                                        <strong>Solo hay 1 hermano/a anotado/a.</strong> Lo ideal son 2 por carrito o banner.
                                                        Nunca predicar solo/a.
                                                    </span>
                                                </div>
                                            )}

                                            {/* Participantes */}
                                            <div className="d-flex align-items-center justify-content-between gap-3">
                                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                                    {/* Cupos */}
                                                    <span className={`badge rounded-pill ${
                                                        lleno
                                                            ? 'bg-danger bg-opacity-10 text-danger border border-danger'
                                                            : participantes.length >= 2
                                                                ? 'bg-warning-subtle text-warning-emphasis border border-warning'
                                                                : 'bg-success bg-opacity-10 text-success border border-success'
                                                    }`} style={{ fontSize: '0.78rem' }}>
                                                        <i className={`bi ${lleno ? 'bi-person-x' : 'bi-person-check'} me-1`}></i>
                                                        {participantes.length}/4 cupos
                                                    </span>

                                                    {/* Nombres de participantes */}
                                                    {participantes.length > 0 && (
                                                        <div className="d-flex align-items-center gap-1 flex-wrap">
                                                            {participantes.map((p, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className={`badge rounded-pill ${p.usuario === usuarioActual ? 'bg-primary' : 'bg-body-tertiary text-body-secondary border'}`}
                                                                    style={{ fontSize: '0.73rem' }}
                                                                    title={p.nombre && p.apellido ? `${p.nombre} ${p.apellido}` : p.usuario}
                                                                >
                                                                    <i className="bi bi-person-fill me-1"></i>
                                                                    {p.nombre ? `${p.nombre} ${p.apellido || ''}`.trim() : p.usuario}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Botón de acción */}
                                                <div className="flex-shrink-0">
                                                    {miTurno ? (
                                                        <button
                                                            className="btn btn-outline-danger rounded-pill btn-sm px-3 fw-semibold"
                                                            onClick={() => toggleAnotarse(turno, true)}
                                                            disabled={cargando}
                                                        >
                                                            {cargando
                                                                ? <span className="spinner-border spinner-border-sm" />
                                                                : <><i className="bi bi-x-circle me-1"></i>Salir</>
                                                            }
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className={`btn rounded-pill btn-sm px-3 fw-semibold ${lleno ? 'btn-secondary' : 'btn-primary'}`}
                                                            onClick={() => toggleAnotarse(turno, false)}
                                                            disabled={lleno || cargando}
                                                            title={lleno ? 'Turno completo (máx. 4)' : 'Anotarte en este turno'}
                                                        >
                                                            {cargando
                                                                ? <span className="spinner-border spinner-border-sm" />
                                                                : lleno
                                                                    ? <><i className="bi bi-lock me-1"></i>Completo</>
                                                                    : <><i className="bi bi-plus-circle me-1"></i>Anotarme</>
                                                            }
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── Acceso rápido admin ── */}
                    {esAdmin && (
                        <div className="mt-4 p-3 rounded-4 bg-body border d-flex align-items-center justify-content-between gap-3">
                            <div>
                                <div className="fw-semibold text-body">
                                    <i className="bi bi-gear-fill text-primary me-2"></i>
                                    Panel de Administración
                                </div>
                                <small className="text-body-secondary">
                                    Desde aquí podés configurar horarios, plantillas y generar los turnos semanales.
                                </small>
                            </div>
                            <a href="/admin" className="btn btn-outline-primary rounded-pill btn-sm px-3 fw-semibold flex-shrink-0">
                                Ir al admin
                            </a>
                        </div>
                    )}

                </div>
            </main>
        </>
    );
};

export default PredicacionPublica;
