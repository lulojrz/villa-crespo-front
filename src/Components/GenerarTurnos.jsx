import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';

/**
 * Función que dado cualquier objeto Date calcula la fecha del lunes correspondiente (en formato YYYY-MM-DD).
 */
const calcularLunes = (fecha) => {
    const d = new Date(fecha);
    const day = d.getDay(); // 0 es Domingo, 1 es Lunes, ...
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dia}`;
};

/**
 * Calcula el domingo dado un string lunes 'YYYY-MM-DD'.
 */
const calcularDomingo = (lunesStr) => {
    const [y, m, d] = lunesStr.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    fecha.setDate(fecha.getDate() + 6);
    const yDom = fecha.getFullYear();
    const mDom = String(fecha.getMonth() + 1).padStart(2, '0');
    const dDom = String(fecha.getDate()).padStart(2, '0');
    return `${yDom}-${mDom}-${dDom}`;
};

const formatearParaMostrar = (fechaStr) => {
    if (!fechaStr) return '';
    const [y, m, d] = fechaStr.split('-');
    return `${d}/${m}/${y}`;
};

const GenerarTurnos = ({ onTurnosGenerados, onIrAPlantillas }) => {
    const api = import.meta.env.VITE_API_URL;
    
    const hoy = new Date();
    const lunesActualStr = calcularLunes(hoy);
    
    const proximoLunesDate = new Date();
    proximoLunesDate.setDate(proximoLunesDate.getDate() + 7);
    const proximoLunesStr = calcularLunes(proximoLunesDate);

    const [fechaSeleccionada, setFechaSeleccionada] = useState(
        hoy.getDay() >= 5 ? proximoLunesStr : lunesActualStr
    );
    const [lunesCalculado, setLunesCalculado] = useState(
        hoy.getDay() >= 5 ? proximoLunesStr : lunesActualStr
    );
    const [cargando, setCargando] = useState(false);
    const [cargandoBorrar, setCargandoBorrar] = useState(false);
    const [cantidadPlantillas, setCantidadPlantillas] = useState(null);
    const [cargandoPlantillas, setCargandoPlantillas] = useState(true);

    const [turnosGeneradosSemana, setTurnosGeneradosSemana] = useState([]);
    const [cargandoTurnosSemana, setCargandoTurnosSemana] = useState(false);

    useEffect(() => {
        if (fechaSeleccionada) {
            const [y, m, d] = fechaSeleccionada.split('-').map(Number);
            const fechaObj = new Date(y, m - 1, d);
            setLunesCalculado(calcularLunes(fechaObj));
        }
    }, [fechaSeleccionada]);

    const consultarPlantillas = useCallback(async () => {
        setCargandoPlantillas(true);
        try {
            const res = await fetch(`${api}/api/turnos/obtener`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setCantidadPlantillas(Array.isArray(data) ? data.length : 0);
            } else {
                setCantidadPlantillas(0);
            }
        } catch (error) {
            console.error("Error al consultar plantillas:", error);
            setCantidadPlantillas(0);
        } finally {
            setCargandoPlantillas(false);
        }
    }, [api]);

    const cargarTurnosSemana = useCallback(async () => {
        if (!lunesCalculado) return;
        setCargandoTurnosSemana(true);
        try {
            const res = await fetch(`${api}/api/turnos/semana?fecha=${lunesCalculado}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setTurnosGeneradosSemana(Array.isArray(data) ? data : []);
            } else {
                setTurnosGeneradosSemana([]);
            }
        } catch (err) {
            console.error("Error al cargar turnos de la semana:", err);
            setTurnosGeneradosSemana([]);
        } finally {
            setCargandoTurnosSemana(false);
        }
    }, [api, lunesCalculado]);

    useEffect(() => {
        consultarPlantillas();
    }, [consultarPlantillas]);

    useEffect(() => {
        cargarTurnosSemana();
    }, [cargarTurnosSemana]);

    const handleGenerar = async (e) => {
        e?.preventDefault();

        if (!lunesCalculado) {
            Swal.fire('Atención', 'Por favor seleccioná una semana válida.', 'warning');
            return;
        }

        const domingoCalculado = calcularDomingo(lunesCalculado);
        const confirmacion = await Swal.fire({
            title: '¿Generar turnos semanales?',
            html: `Se crearán los turnos según las plantillas configuradas para la semana del:<br/>
                   <strong class="text-primary fs-5">${formatearParaMostrar(lunesCalculado)}</strong> al <strong class="text-primary fs-5">${formatearParaMostrar(domingoCalculado)}</strong>.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: 'var(--bs-primary)',
            cancelButtonColor: 'var(--bs-secondary)',
            confirmButtonText: '<i class="bi bi-calendar-check me-1"></i> Sí, generar turnos',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmacion.isConfirmed) return;

        setCargando(true);
        try {
            const response = await fetch(`${api}/api/turnos/generar?lunes=${lunesCalculado}`, {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                const mensaje = await response.text();
                await Swal.fire({
                    icon: 'success',
                    title: '¡Turnos Generados!',
                    text: mensaje || 'Se generaron exitosamente los turnos de la semana.',
                    confirmButtonColor: 'var(--bs-primary)'
                });
                await cargarTurnosSemana();
                if (onTurnosGenerados) {
                    onTurnosGenerados();
                }
            } else {
                const errorTexto = await response.text();
                Swal.fire({
                    icon: 'warning',
                    title: 'No se pudieron generar los turnos',
                    text: errorTexto || 'Ya existen turnos generados para esa semana o no hay plantillas activas.',
                    confirmButtonColor: 'var(--bs-primary)'
                });
            }
        } catch (error) {
            console.error("Error al generar turnos:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'No se pudo conectar con el servidor para generar los turnos.',
                confirmButtonColor: 'var(--bs-primary)'
            });
        } finally {
            setCargando(false);
        }
    };

    const handleBorrarSemana = async () => {
        if (!lunesCalculado) {
            Swal.fire('Atención', 'Por favor seleccioná una semana válida.', 'warning');
            return;
        }

        const domingoCalculado = calcularDomingo(lunesCalculado);
        const confirmacion = await Swal.fire({
            title: '¿Borrar toda la semana?',
            html: `<div class="text-start">
                    <p>Se eliminarán <strong>todos los turnos</strong> generados para la semana del:</p>
                    <p class="text-center fw-bold text-danger fs-6">
                        ${formatearParaMostrar(lunesCalculado)} al ${formatearParaMostrar(domingoCalculado)}
                    </p>
                    <div class="alert alert-warning py-2 px-3 small mb-0">
                        <i class="bi bi-exclamation-triangle-fill me-1"></i>
                        Esto incluye las inscripciones ya realizadas por los hermanos. Esta acción no se puede deshacer.
                    </div>
                   </div>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--bs-danger)',
            cancelButtonColor: 'var(--bs-secondary)',
            confirmButtonText: '<i class="bi bi-trash3 me-1"></i> Sí, borrar toda la semana',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmacion.isConfirmed) return;

        setCargandoBorrar(true);
        try {
            const response = await fetch(`${api}/api/turnos/semana?fecha=${lunesCalculado}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                const mensaje = await response.text();
                await Swal.fire({
                    icon: 'success',
                    title: 'Semana borrada',
                    text: mensaje || 'Los turnos de la semana fueron eliminados. Podés volver a generarlos.',
                    confirmButtonColor: 'var(--bs-primary)'
                });
                await cargarTurnosSemana();
                if (onTurnosGenerados) {
                    onTurnosGenerados();
                }
            } else {
                const errorTexto = await response.text();
                Swal.fire({
                    icon: 'warning',
                    title: 'No se pudo borrar la semana',
                    text: errorTexto || 'No hay turnos generados para esa semana.',
                    confirmButtonColor: 'var(--bs-primary)'
                });
            }
        } catch (error) {
            console.error("Error al borrar turnos de la semana:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'No se pudo conectar con el servidor.',
                confirmButtonColor: 'var(--bs-primary)'
            });
        } finally {
            setCargandoBorrar(false);
        }
    };

    const domingo = lunesCalculado ? calcularDomingo(lunesCalculado) : '';

    /* Calcular cuántos publicadores tiene cada turno */
    const contarParticipantes = (t) => {
        return [t.publicador1, t.publicador2, t.publicador3, t.publicador4].filter(Boolean).length;
    };

    return (
        <div className="container-fluid p-0 mt-4">
            <div className="row g-4">
                <div className="col-12 col-lg-7 col-xl-6">
                    <div className="card shadow-sm border-0">
                        <div className="card-body p-4">
                            <div className="d-flex align-items-start gap-3 mb-4">
                                <span className="fs-3 text-info" aria-hidden="true">
                                    <i className="bi bi-calendar-week"></i>
                                </span>
                                <div>
                                    <h2 className="h4 fw-bold mb-1">Generar Turnos Semanales</h2>
                                    <p className="text-body-secondary mb-0">
                                        Creá automáticamente todos los turnos para la semana elegida a partir de las plantillas configuradas.
                                    </p>
                                </div>
                            </div>

                            {/* Botones rápidos de selección de semana */}
                            <div className="mb-4">
                                <label className="form-label fw-semibold text-muted small text-uppercase">Accesos rápidos de semana</label>
                                <div className="d-flex gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${lunesCalculado === lunesActualStr ? 'btn-primary' : 'btn-outline-primary'}`}
                                        onClick={() => {
                                            setFechaSeleccionada(lunesActualStr);
                                            setLunesCalculado(lunesActualStr);
                                        }}
                                    >
                                        <i className="bi bi-calendar-event me-1"></i> Esta semana
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${lunesCalculado === proximoLunesStr ? 'btn-primary' : 'btn-outline-primary'}`}
                                        onClick={() => {
                                            setFechaSeleccionada(proximoLunesStr);
                                            setLunesCalculado(proximoLunesStr);
                                        }}
                                    >
                                        <i className="bi bi-calendar-plus me-1"></i> Próxima semana
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleGenerar}>
                                <div className="mb-4">
                                    <label htmlFor="fecha-semana" className="form-label fw-semibold">
                                        Elegir fecha de la semana
                                    </label>
                                    <input
                                        type="date"
                                        id="fecha-semana"
                                        className="form-control form-control-lg"
                                        value={fechaSeleccionada}
                                        onChange={(e) => setFechaSeleccionada(e.target.value)}
                                        required
                                    />
                                    <div className="form-text">
                                        Podés elegir cualquier día; el sistema calculará automáticamente la semana completa de lunes a domingo.
                                    </div>
                                </div>

                                {/* Resumen de la semana calculada */}
                                <div className="p-3 bg-body-tertiary rounded-3 border mb-4">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <span className="fw-semibold text-body-secondary small">Semana a programar:</span>
                                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                            7 días
                                        </span>
                                    </div>
                                    <div className="h5 fw-bold mb-1 text-primary">
                                        Del Lunes {formatearParaMostrar(lunesCalculado)} al Domingo {formatearParaMostrar(domingo)}
                                    </div>
                                    <div className="small text-muted">
                                        Fecha base: <code>{lunesCalculado}</code>
                                    </div>
                                </div>

                                {/* Botones de acción */}
                                <div className="d-flex flex-column gap-2">
                                    <button
                                        type="submit"
                                        className="btn btn-primary btn-lg w-100 fw-bold shadow-sm"
                                        disabled={cargando || cantidadPlantillas === 0}
                                    >
                                        {cargando ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Generando turnos...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-magic me-2"></i>
                                                Generar turnos de esta semana
                                            </>
                                        )}
                                    </button>

                                    {/* Botón Borrar semana — solo visible si hay turnos generados */}
                                    {turnosGeneradosSemana.length > 0 && (
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger w-100 fw-semibold"
                                            onClick={handleBorrarSemana}
                                            disabled={cargandoBorrar}
                                        >
                                            {cargandoBorrar ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Borrando semana...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-trash3 me-2"></i>
                                                    Borrar toda la semana y regenerar
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-5 col-xl-6">
                    <div className="card h-100 border-0 bg-body-tertiary">
                        <div className="card-body p-4">
                            <h3 className="h5 fw-bold mb-3">Estado de las Plantillas</h3>
                            
                            {cargandoPlantillas ? (
                                <div className="text-muted small">
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Verificando plantillas configuradas...
                                </div>
                            ) : cantidadPlantillas > 0 ? (
                                <div className="alert alert-success border-0 shadow-sm d-flex align-items-center gap-3">
                                    <i className="bi bi-check-circle-fill fs-3 text-success"></i>
                                    <div>
                                        <div className="fw-bold">Hay {cantidadPlantillas} plantilla(s) lista(s)</div>
                                        <div className="small text-muted">
                                            Se crearán turnos para cada plantilla registrada en los días correspondientes de la semana seleccionada.
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="alert alert-warning border-0 shadow-sm">
                                    <div className="d-flex align-items-start gap-3">
                                        <i className="bi bi-exclamation-triangle-fill fs-3 text-warning"></i>
                                        <div>
                                            <div className="fw-bold">No hay plantillas configuradas</div>
                                            <div className="small text-muted mb-3">
                                                Debes configurar primero los horarios en <strong>Plantillas de Turnos</strong> antes de poder generar la semana.
                                            </div>
                                            {onIrAPlantillas && (
                                                <button 
                                                    type="button" 
                                                    className="btn btn-sm btn-warning fw-semibold shadow-sm"
                                                    onClick={onIrAPlantillas}
                                                >
                                                    <i className="bi bi-layout-text-window me-1"></i> Ir a Plantillas de Turnos
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Vista de turnos ya generados para esta semana */}
                            <div className="mt-4 pt-3 border-top">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h4 className="h6 fw-bold mb-0 text-uppercase text-body">
                                        Turnos generados para esta semana
                                    </h4>
                                    <span className="badge bg-body-secondary text-body-secondary border">
                                        {turnosGeneradosSemana.length} turno(s)
                                    </span>
                                </div>

                                {cargandoTurnosSemana ? (
                                    <div className="text-center py-3 text-muted small">
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Cargando turnos de la semana...
                                    </div>
                                ) : turnosGeneradosSemana.length > 0 ? (
                                    <div className="list-group list-group-flush rounded-3 border bg-body overflow-auto" style={{ maxHeight: '220px' }}>
                                        {turnosGeneradosSemana.map(t => {
                                            const cant = contarParticipantes(t);
                                            return (
                                                <div key={t.id} className="list-group-item d-flex justify-content-between align-items-center py-2 px-3 small">
                                                    <div>
                                                        <span className="fw-bold text-primary me-2">{formatearParaMostrar(t.fecha)}</span>
                                                        <span className="fw-semibold text-body">{t.punto?.nombre || 'Punto'}</span>
                                                        <span className="text-muted ms-2">({t.horaInicio?.slice(0, 5)} - {t.horaFin?.slice(0, 5)})</span>
                                                    </div>
                                                    <div className="text-end">
                                                        <span className={`badge ${cant >= 4 ? 'bg-danger' : cant >= 2 ? 'bg-warning text-dark' : 'bg-success'} rounded-pill`}>
                                                            {cant}/4
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-body-secondary small mb-0">
                                        No se han generado turnos todavía para la semana del <strong>{formatearParaMostrar(lunesCalculado)}</strong>. Hacé clic en el botón <strong>"Generar turnos de esta semana"</strong> para crearlos.
                                    </p>
                                )}
                            </div>

                            <h4 className="h6 fw-bold mt-4 mb-2 text-uppercase text-muted" style={{ letterSpacing: '0.5px' }}>
                                ¿Cómo funciona esta función?
                            </h4>
                            <ul className="text-body-secondary small ps-3 mb-0">
                                <li className="mb-2">
                                    Toma como molde todas las <strong>Plantillas de Turnos</strong> guardadas (lunes a domingo).
                                </li>
                                <li className="mb-2">
                                    Copia automáticamente a los <strong>publicadores fijos</strong> asignados en la plantilla si los hubiera.
                                </li>
                                <li className="mb-2">
                                    Cada turno acepta hasta <strong>4 hermanos</strong>. Lo ideal son 2 por carrito o banner; nunca predicar solo.
                                </li>
                                <li className="mb-2">
                                    Si una semana ya tiene turnos generados, podés usar <strong>"Borrar toda la semana"</strong> para limpiarlos y volver a generarlos.
                                </li>
                                <li>
                                    Una vez generados, los hermanos pueden empezar a anotarse desde <strong>Predicación Pública</strong>.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GenerarTurnos;
