import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const obtenerSemanasDelMes = (mesSeleccionado) => {
    const [anio, mes] = mesSeleccionado.split('-').map(Number);
    const primerDia = new Date(anio, mes - 1, 1);
    primerDia.setDate(primerDia.getDate() - ((primerDia.getDay() + 6) % 7));

    const ultimoDia = new Date(anio, mes, 0);
    const semanas = [];
    for (const lunes = new Date(primerDia); lunes <= ultimoDia; lunes.setDate(lunes.getDate() + 7)) {
        semanas.push(formatearFecha(lunes));
    }
    return semanas;
};

const desplazarMes = (mesSeleccionado, cantidad) => {
    const [anio, mes] = mesSeleccionado.split('-').map(Number);
    const fecha = new Date(anio, mes - 1 + cantidad, 1);
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
};

const construirCalendarioMensual = (mesSeleccionado) => {
    const semanas = obtenerSemanasDelMes(mesSeleccionado);
    return semanas.map((lunes) => {
        const [anioSemana, mesSemana, diaSemana] = lunes.split('-').map(Number);
        const fechaInicio = new Date(anioSemana, mesSemana - 1, diaSemana);
        return Array.from({ length: 7 }, (_, dia) => {
            const fecha = new Date(fechaInicio);
            fecha.setDate(fechaInicio.getDate() + dia);
            return fecha;
        });
    });
};

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
    const [errorTurnos, setErrorTurnos] = useState(false);
    const [mesSeleccionado, setMesSeleccionado] = useState(() => {
        const hoy = new Date();
        return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    });
    const solicitudMesRef = useRef(0);

    // pestaña activa = fecha del día seleccionado (string YYYY-MM-DD)
    const [diaActivo, setDiaActivo] = useState(formatearFecha(new Date()));
    const [puntoActivo, setPuntoActivo] = useState(null);
    const semanasCalendario = construirCalendarioMensual(mesSeleccionado);
    const nombreMes = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' })
        .format(new Date(`${mesSeleccionado}-01T12:00:00`));

    // modal o botón procesando: anotarse / desanotarse
    const [accionId, setAccionId] = useState(null);

    // Panel hermanos con carrito/banner
    const [mostrarHermanosPanel, setMostrarHermanosPanel] = useState(false);
    const [hermanosCarrito, setHermanosCarrito] = useState([]);
    const [cargandoHermanos, setCargandoHermanos] = useState(false);

    /* carga las semanas que cubren el mes visible */
    const fetchTurnos = useCallback(async () => {
        const solicitudActual = ++solicitudMesRef.current;
        try {
            const semanas = obtenerSemanasDelMes(mesSeleccionado);
            const resultados = await Promise.all(semanas.map(async (lunes) => {
                const res = await fetch(`${API}/api/turnos/semana?fecha=${lunes}`, { credentials: 'include' });
                if (!res.ok) {
                    throw new Error(`No se pudieron cargar los turnos de la semana ${lunes}.`);
                }
                const data = await res.json();
                if (!Array.isArray(data)) {
                    throw new Error(`La respuesta de turnos para la semana ${lunes} no es válida.`);
                }
                return data;
            }));

            if (solicitudActual !== solicitudMesRef.current) return;
            const turnosUnicos = new Map(resultados.flat().map(turno => [turno.id, turno]));
            setErrorTurnos(false);
            setTurnos([...turnosUnicos.values()]);
        } catch (err) {
            console.error("Error al cargar turnos del mes:", err);
            if (solicitudActual === solicitudMesRef.current) setErrorTurnos(true);
        } finally {
            if (solicitudActual === solicitudMesRef.current) setLoading(false);
        }
    }, [mesSeleccionado]);

    useEffect(() => {
        let activo = true;
        Promise.resolve().then(() => {
            if (activo) fetchTurnos();
        });
        return () => {
            activo = false;
            solicitudMesRef.current += 1;
        };
    }, [fetchTurnos]);

    const cambiarMes = (nuevoMes) => {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(nuevoMes)) return;
        const hoy = formatearFecha(new Date());
        setLoading(true);
        setPuntoActivo(null);
        setDiaActivo(hoy.startsWith(`${nuevoMes}-`) ? hoy : `${nuevoMes}-01`);
        setMesSeleccionado(nuevoMes);
    };

    const irAHoy = () => {
        const hoy = new Date();
        const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
        if (mesSeleccionado !== mesActual) setLoading(true);
        setPuntoActivo(null);
        setDiaActivo(formatearFecha(hoy));
        setMesSeleccionado(mesActual);
    };

    const seleccionarDia = (fecha) => {
        const fechaStr = formatearFecha(fecha);
        const mesFecha = fechaStr.slice(0, 7);
        if (mesFecha !== mesSeleccionado) {
            setLoading(true);
            setMesSeleccionado(mesFecha);
        }
        setPuntoActivo(null);
        setDiaActivo(fechaStr);
    };

    const turnosDelDia = turnos.filter(turno => String(turno.fecha).slice(0, 10) === diaActivo);
    const turnoTieneCupo = (turno) => {
        const participantes = [turno.publicador1, turno.publicador2, turno.publicador3, turno.publicador4].filter(Boolean);
        return participantes.length < 4;
    };
    const turnoEsPropio = (turno) => {
        return [turno.publicador1, turno.publicador2, turno.publicador3, turno.publicador4]
            .some(participante => participante?.usuario === usuarioActual);
    };
    const turnoDisponibleOPropio = (turno) => turnoTieneCupo(turno) || turnoEsPropio(turno);
    const turnoDePunto = (turno) => String(turno.punto?.id ?? turno.punto?.nombre ?? 'sin-punto');
    const puntosDelDia = Array.from(
        turnosDelDia.reduce((grupos, turno) => {
            const key = turnoDePunto(turno);
            if (!grupos.has(key)) {
                grupos.set(key, {
                    key,
                    punto: turno.punto,
                    turnos: [],
                    disponibles: 0,
                    miTurno: false
                });
            }
            const grupo = grupos.get(key);
            grupo.turnos.push(turno);
            if (turnoTieneCupo(turno)) grupo.disponibles += 1;
            if (turnoEsPropio(turno)) grupo.miTurno = true;
            return grupos;
        }, new Map()).values()
    ).sort((a, b) => (a.punto?.nombre || '').localeCompare(b.punto?.nombre || '', 'es', { sensitivity: 'base' }));
    const turnosDia = puntoActivo
        ? turnosDelDia.filter(turno => turnoDePunto(turno) === puntoActivo && turnoDisponibleOPropio(turno))
        : [];
    const contarDisponibles = (fecha) => turnos.filter(turno => {
        if (String(turno.fecha).slice(0, 10) !== fecha) return false;
        return turnoTieneCupo(turno);
    }).length;

    /* WebSocket en vivo actualiza el mes visible. */
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

    const hoy = formatearFecha(new Date());
    const mesActual = `${hoy.slice(0, 4)}-${hoy.slice(5, 7)}`;

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
                            Elegí un día del calendario para consultar los turnos disponibles y anotarte.
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

                    {/* ── Calendario mensual ── */}
                    <div className="card border-0 shadow-sm rounded-4 mb-3 bg-body">
                        <div className="card-body p-3 p-md-4">
                            <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
                                <button
                                    className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center"
                                    style={{ width: 38, height: 38 }}
                                    onClick={() => cambiarMes(desplazarMes(mesSeleccionado, -1))}
                                    title="Mes anterior"
                                    aria-label="Mes anterior"
                                >
                                    <i className="bi bi-chevron-left"></i>
                                </button>

                                <div className="text-center text-capitalize fw-bold text-body fs-5">
                                    {nombreMes}
                                </div>

                                <button
                                    className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center"
                                    style={{ width: 38, height: 38 }}
                                    onClick={() => cambiarMes(desplazarMes(mesSeleccionado, 1))}
                                    title="Mes siguiente"
                                    aria-label="Mes siguiente"
                                >
                                    <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>

                            <div className="d-flex justify-content-end mb-2">
                                {mesSeleccionado !== mesActual && (
                                    <button
                                        className="btn btn-link btn-sm p-0 text-primary text-decoration-none"
                                        onClick={irAHoy}
                                    >
                                        Ir a este mes
                                    </button>
                                )}
                            </div>

                            <div className="d-grid gap-1" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(dia => (
                                    <div className="text-center text-body-secondary small fw-semibold py-1" key={dia}>
                                        {dia}
                                    </div>
                                ))}
                                {semanasCalendario.flat().map(fecha => {
                                    const fechaStr = formatearFecha(fecha);
                                    const esDelMes = fechaStr.startsWith(`${mesSeleccionado}-`);
                                    const esHoy = fechaStr === hoy;
                                    const activo = fechaStr === diaActivo;
                                    const cantidad = contarDisponibles(fechaStr);
                                    return (
                                        <button
                                            type="button"
                                            key={fechaStr}
                                            onClick={() => seleccionarDia(fecha)}
                                            aria-label={`${fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}${cantidad ? `, ${cantidad} turnos disponibles` : ''}`}
                                            aria-pressed={activo}
                                            className={`btn rounded-3 d-flex flex-column align-items-center justify-content-center px-1 py-2 ${
                                                activo
                                                    ? 'btn-primary text-white shadow-sm'
                                                    : esDelMes
                                                        ? 'btn-outline-secondary text-body bg-body'
                                                        : 'btn bg-body-tertiary text-body-tertiary border-0'
                                            }`}
                                            style={{
                                                minHeight: '58px',
                                                border: esHoy && !activo ? '2px solid var(--bs-primary)' : undefined
                                            }}
                                        >
                                            <span className="fw-semibold">{fecha.getDate()}</span>
                                            {cantidad > 0 && (
                                                <span className={`small ${activo ? 'text-white' : 'text-primary'}`} style={{ fontSize: '0.68rem' }}>
                                                    {cantidad} {cantidad === 1 ? 'turno' : 'turnos'}
                                                </span>
                                            )}
                                            {esHoy && <span className="small" style={{ fontSize: '0.62rem' }}>Hoy</span>}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="small text-body-secondary mt-2">
                                Los números indican turnos con cupos disponibles.
                            </div>
                        </div>
                    </div>

                    {/* ── Puntos del día ── */}
                    <div className="mb-3">
                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3">
                            <div>
                                <h5 className="fw-bold text-body mb-1">
                                    {new Date(`${diaActivo}T12:00:00`).toLocaleDateString('es-AR', {
                                        weekday: 'long',
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </h5>
                                <span className="small text-body-secondary">1. Elegí un punto para ver sus turnos</span>
                            </div>
                            {!loading && !errorTurnos && (
                                <span className="badge bg-body-tertiary text-body-secondary border rounded-pill align-self-start">
                                    {puntosDelDia.length} {puntosDelDia.length === 1 ? 'punto' : 'puntos'}
                                </span>
                            )}
                        </div>

                        {loading ? (
                            <div className="d-flex justify-content-center py-4">
                                <div className="spinner-border spinner-border-sm text-primary" role="status">
                                    <span className="visually-hidden">Cargando puntos...</span>
                                </div>
                            </div>
                        ) : errorTurnos ? (
                            <div className="alert alert-danger border-0 shadow-sm rounded-4">
                                No se pudieron cargar los puntos y turnos del mes. Revisá tu conexión e intentá nuevamente.
                                <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={fetchTurnos}>
                                    Reintentar
                                </button>
                            </div>
                        ) : puntosDelDia.length === 0 ? (
                            <div className="card border-0 shadow-sm rounded-4 bg-body">
                                <div className="card-body text-center py-4">
                                    <i className="bi bi-calendar-x fs-2 text-body-tertiary mb-2 d-block"></i>
                                    <h6 className="text-body-secondary fw-semibold mb-1">Sin turnos este día</h6>
                                    <p className="text-body-tertiary small mb-0">
                                        No hay puntos con turnos programados para esta fecha.
                                        {esAdmin && ' Podés generarlos desde Administración → Predicación Pública → Generar turnos.'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="row g-2">
                                {puntosDelDia.map(grupo => {
                                    const activo = grupo.key === puntoActivo;
                                    return (
                                        <div className="col-12 col-sm-6" key={grupo.key}>
                                            <button
                                                type="button"
                                                className={`btn w-100 h-100 text-start p-3 rounded-3 ${
                                                    activo ? 'btn-primary shadow-sm' : 'btn-outline-secondary bg-body text-body'
                                                }`}
                                                onClick={() => setPuntoActivo(grupo.key)}
                                                aria-pressed={activo}
                                            >
                                                <span className="d-flex align-items-center justify-content-between gap-2">
                                                    <span className="d-flex align-items-center gap-2">
                                                        <i className="bi bi-geo-alt-fill"></i>
                                                        <span className="fw-semibold">{grupo.punto?.nombre || 'Punto sin nombre'}</span>
                                                    </span>
                                                    <span className={`badge rounded-pill ${activo ? 'bg-white text-primary' : grupo.disponibles ? 'bg-primary-subtle text-primary' : 'bg-body-secondary text-body-secondary'}`}>
                                                        {grupo.disponibles
                                                            ? `${grupo.disponibles} ${grupo.disponibles === 1 ? 'turno disponible' : 'turnos disponibles'}`
                                                            : grupo.miTurno ? 'Completo · anotado' : 'Completo'}
                                                    </span>
                                                </span>
                                                {grupo.punto?.direccion && (
                                                    <span className={`d-block small mt-1 ms-4 ${activo ? 'text-white-50' : 'text-body-secondary'}`}>
                                                        {grupo.punto.direccion}
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {puntoActivo && (loading ? (
                        <div className="d-flex justify-content-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Cargando...</span>
                            </div>
                        </div>
                    ) : errorTurnos ? (
                        <div className="alert alert-danger border-0 shadow-sm rounded-4">
                            No se pudieron cargar los turnos del mes. Revisá tu conexión e intentá nuevamente.
                            <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={fetchTurnos}>
                                Reintentar
                            </button>
                        </div>
                    ) : turnosDia.length === 0 ? (
                        <div className="card border-0 shadow-sm rounded-4 bg-body">
                            <div className="card-body text-center py-5">
                                <i className={`bi ${turnosDelDia.length > 0 ? 'bi-person-check' : 'bi-calendar-x'} fs-1 text-body-tertiary mb-3 d-block`}></i>
                                <h6 className="text-body-secondary fw-semibold mb-1">
                                    {turnosDia.length === 0 && turnosDelDia.some(turno => turnoDePunto(turno) === puntoActivo)
                                        ? 'No quedan cupos disponibles en este punto'
                                        : 'Sin turnos disponibles en este punto'}
                                </h6>
                                <p className="text-body-tertiary small mb-0">
                                    Revisá otro punto o elegí otra fecha del calendario.<br />
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
                    ))}

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
