import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';

const formatearFecha = (fecha) => {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
};

const fechaLocalAString = (fecha) => {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
};

const obtenerSemanasDelMes = (mesSeleccionado) => {
    const [anio, mes] = mesSeleccionado.split('-').map(Number);
    const primerDia = new Date(anio, mes - 1, 1);
    primerDia.setDate(primerDia.getDate() - ((primerDia.getDay() + 6) % 7));

    const ultimoDia = new Date(anio, mes, 0);
    const semanas = [];
    for (const lunes = new Date(primerDia); lunes <= ultimoDia; lunes.setDate(lunes.getDate() + 7)) {
        semanas.push(fechaLocalAString(lunes));
    }
    return semanas;
};

const obtenerFechasSemana = (lunes) => {
    const [anio, mes, dia] = lunes.split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    return Array.from({ length: 7 }, (_, indice) => {
        const diaSemana = new Date(fecha);
        diaSemana.setDate(fecha.getDate() + indice);
        return fechaLocalAString(diaSemana);
    });
};

const desplazarMes = (mesSeleccionado, cantidad) => {
    const [anio, mes] = mesSeleccionado.split('-').map(Number);
    const fecha = new Date(anio, mes - 1 + cantidad, 1);
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
};

const GenerarTurnos = ({ onTurnosGenerados, onIrAPlantillas }) => {
    const api = import.meta.env.VITE_API_URL;
    const hoy = new Date();
    const [mesSeleccionado, setMesSeleccionado] = useState(
        `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
    );
    const [turnosPorSemana, setTurnosPorSemana] = useState({});
    const [cargandoMes, setCargandoMes] = useState(true);
    const [semanaEnProceso, setSemanaEnProceso] = useState(null);
    const [semanaBorrando, setSemanaBorrando] = useState(null);
    const [cantidadPlantillas, setCantidadPlantillas] = useState(null);
    const [cargandoPlantillas, setCargandoPlantillas] = useState(true);
    const solicitudMesRef = useRef(0);
    const semanasDelMes = useMemo(() => obtenerSemanasDelMes(mesSeleccionado), [mesSeleccionado]);

    const nombreMes = useMemo(() => {
        const [anio, mes] = mesSeleccionado.split('-').map(Number);
        const nombre = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' })
            .format(new Date(anio, mes - 1, 1));
        return nombre.charAt(0).toUpperCase() + nombre.slice(1);
    }, [mesSeleccionado]);

    const cargarTurnosMes = useCallback(async () => {
        const solicitudId = ++solicitudMesRef.current;
        const resultados = await Promise.all(semanasDelMes.map(async (lunes) => {
            try {
                const response = await fetch(
                    `${api}/api/turnos/semana?fecha=${lunes}`,
                    { credentials: 'include' }
                );
                if (!response.ok) {
                    const mensaje = await response.text();
                    throw new Error(mensaje || `No se pudieron cargar los turnos de la semana del ${formatearFecha(lunes)}.`);
                }

                const data = await response.json();
                if (!Array.isArray(data)) {
                    throw new Error(`La respuesta de turnos para la semana del ${formatearFecha(lunes)} no es válida.`);
                }
                return [lunes, { turnos: data, error: null }];
            } catch (error) {
                console.error(`Error al cargar turnos de la semana ${lunes}:`, error);
                return [lunes, { turnos: [], error: error.message || 'Error de conexión al cargar la semana.' }];
            }
        }));

        if (solicitudId !== solicitudMesRef.current) return;
        setTurnosPorSemana(Object.fromEntries(resultados));
        setCargandoMes(false);
    }, [api, semanasDelMes]);

    useEffect(() => {
        cargarTurnosMes();
        return () => {
            solicitudMesRef.current += 1;
        };
    }, [cargarTurnosMes]);

    useEffect(() => {
        let activo = true;
        const consultarPlantillas = async () => {
            try {
                const response = await fetch(`${api}/api/turnos/obtener`, { credentials: 'include' });
                if (!response.ok) {
                    const mensaje = await response.text();
                    throw new Error(mensaje || 'No se pudieron consultar las plantillas.');
                }
                const data = await response.json();
                if (activo) setCantidadPlantillas(Array.isArray(data) ? data.length : 0);
            } catch (error) {
                console.error('Error al consultar plantillas:', error);
                if (activo) setCantidadPlantillas(null);
            } finally {
                if (activo) setCargandoPlantillas(false);
            }
        };
        consultarPlantillas();
        return () => {
            activo = false;
        };
    }, [api]);

    const generarSemana = async (lunes) => {
        const fechas = obtenerFechasSemana(lunes);
        const domingo = fechas[6];
        const [anio, mes] = mesSeleccionado.split('-').map(Number);
        const fueraDelMes = fechas.some((fecha) => {
            const [anioFecha, mesFecha] = fecha.split('-').map(Number);
            return anioFecha !== anio || mesFecha !== mes;
        });

        const confirmacion = await Swal.fire({
            title: '¿Generar esta semana?',
            html: `Se crearán los turnos del <strong>${formatearFecha(lunes)}</strong> al <strong>${formatearFecha(domingo)}</strong> según las plantillas configuradas.${fueraDelMes
                ? '<br/><span class="text-warning">La semana incluye también días fuera del mes seleccionado.</span>'
                : ''}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: 'var(--bs-primary)',
            cancelButtonColor: 'var(--bs-secondary)',
            confirmButtonText: '<i class="bi bi-calendar-check me-1"></i> Sí, generar',
            cancelButtonText: 'Cancelar'
        });
        if (!confirmacion.isConfirmed) return;

        setSemanaEnProceso(lunes);
        try {
            const response = await fetch(`${api}/api/turnos/generar?lunes=${lunes}`, {
                method: 'POST',
                credentials: 'include'
            });
            if (!response.ok) {
                const mensaje = await response.text();
                await Swal.fire({
                    icon: 'warning',
                    title: 'No se pudieron generar los turnos',
                    text: mensaje || 'Ya existen turnos para esta semana o no hay plantillas activas.',
                    confirmButtonColor: 'var(--bs-primary)'
                });
                return;
            }

            const mensaje = await response.text();
            await Swal.fire({
                icon: 'success',
                title: '¡Turnos generados!',
                text: mensaje || `Se generaron los turnos de la semana del ${formatearFecha(lunes)} al ${formatearFecha(domingo)}.`,
                confirmButtonColor: 'var(--bs-primary)'
            });
            setCargandoMes(true);
            await cargarTurnosMes();
            onTurnosGenerados?.();
        } catch (error) {
            console.error('Error al generar turnos:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'No se pudo conectar con el servidor para generar los turnos.',
                confirmButtonColor: 'var(--bs-primary)'
            });
        } finally {
            setSemanaEnProceso(null);
        }
    };

    const borrarSemana = async (lunes) => {
        const domingo = obtenerFechasSemana(lunes)[6];
        const confirmacion = await Swal.fire({
            title: '¿Borrar toda la semana?',
            html: `<div class="text-start">
                <p>Se eliminarán todos los turnos del <strong>${formatearFecha(lunes)}</strong> al <strong>${formatearFecha(domingo)}</strong>.</p>
                <div class="alert alert-warning py-2 px-3 small mb-0">
                    <i class="bi bi-exclamation-triangle-fill me-1"></i>
                    Esto incluye las inscripciones realizadas y no se puede deshacer.
                </div>
            </div>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--bs-danger)',
            cancelButtonColor: 'var(--bs-secondary)',
            confirmButtonText: '<i class="bi bi-trash3 me-1"></i> Sí, borrar semana',
            cancelButtonText: 'Cancelar'
        });
        if (!confirmacion.isConfirmed) return;

        setSemanaBorrando(lunes);
        try {
            const response = await fetch(`${api}/api/turnos/semana?fecha=${lunes}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!response.ok) {
                const mensaje = await response.text();
                await Swal.fire({
                    icon: 'warning',
                    title: 'No se pudo borrar la semana',
                    text: mensaje || 'No hay turnos generados para esa semana.',
                    confirmButtonColor: 'var(--bs-primary)'
                });
                return;
            }

            const mensaje = await response.text();
            await Swal.fire({
                icon: 'success',
                title: 'Semana borrada',
                text: mensaje || 'Los turnos de la semana fueron eliminados.',
                confirmButtonColor: 'var(--bs-primary)'
            });
            setCargandoMes(true);
            await cargarTurnosMes();
            onTurnosGenerados?.();
        } catch (error) {
            console.error('Error al borrar turnos de la semana:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'No se pudo conectar con el servidor.',
                confirmButtonColor: 'var(--bs-primary)'
            });
        } finally {
            setSemanaBorrando(null);
        }
    };

    const totalTurnos = Object.values(turnosPorSemana)
        .reduce((total, semana) => total + semana.turnos.filter(
            (turno) => String(turno.fecha).slice(0, 7) === mesSeleccionado
        ).length, 0);
    const semanasConError = Object.values(turnosPorSemana).filter((semana) => semana.error).length;

    const cambiarMes = (mes) => {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return;
        setCargandoMes(true);
        setMesSeleccionado(mes);
    };

    return (
        <div className="container-fluid p-0 mt-4">
            <div className="card shadow-sm border-0">
                <div className="card-body p-3 p-md-4">
                    <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
                        <div className="d-flex align-items-start gap-3">
                            <span className="fs-3 text-info" aria-hidden="true">
                                <i className="bi bi-calendar-month"></i>
                            </span>
                            <div>
                                <h2 className="h4 fw-bold mb-1">Turnos del mes</h2>
                                <p className="text-body-secondary mb-0">
                                    Consultá el calendario y generá o borrá los turnos de cada semana.
                                </p>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={() => cambiarMes(desplazarMes(mesSeleccionado, -1))}
                                disabled={Boolean(semanaEnProceso || semanaBorrando)}
                                aria-label="Mes anterior"
                            >
                                <i className="bi bi-chevron-left"></i>
                            </button>
                            <input
                                type="month"
                                className="form-control"
                                aria-label="Elegir mes"
                                value={mesSeleccionado}
                                onChange={(event) => cambiarMes(event.target.value)}
                                disabled={Boolean(semanaEnProceso || semanaBorrando)}
                                style={{ maxWidth: '180px' }}
                            />
                            <button
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={() => cambiarMes(desplazarMes(mesSeleccionado, 1))}
                                disabled={Boolean(semanaEnProceso || semanaBorrando)}
                                aria-label="Mes siguiente"
                            >
                                <i className="bi bi-chevron-right"></i>
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => cambiarMes(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`)}
                                disabled={Boolean(semanaEnProceso || semanaBorrando)}
                            >
                                Hoy
                            </button>
                        </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                        <h3 className="h5 fw-bold text-primary text-capitalize mb-0">{nombreMes}</h3>
                        <span className="badge bg-body-secondary text-body-secondary border">
                            {cargandoMes ? 'Cargando turnos...' : `${totalTurnos} turno(s) en el calendario`}
                        </span>
                    </div>

                    {cantidadPlantillas === 0 && !cargandoPlantillas && (
                        <div className="alert alert-warning d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <span>No hay plantillas activas para generar turnos.</span>
                            {onIrAPlantillas && (
                                <button type="button" className="btn btn-sm btn-warning" onClick={onIrAPlantillas}>
                                    <i className="bi bi-layout-text-window me-1"></i> Crear plantillas
                                </button>
                            )}
                        </div>
                    )}
                    {cantidadPlantillas === null && !cargandoPlantillas && (
                        <div className="alert alert-danger">
                            No se pudieron consultar las plantillas. Recargá la página para volver a intentar.
                        </div>
                    )}
                    {semanasConError > 0 && !cargandoMes && (
                        <div className="alert alert-danger">
                            No se pudieron cargar los turnos de {semanasConError} semana(s). Revisá la conexión o recargá el mes.
                        </div>
                    )}

                    {cargandoMes ? (
                        <div className="text-center text-body-secondary py-5">
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Cargando calendario mensual...
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {semanasDelMes.map((lunes) => {
                                const fechas = obtenerFechasSemana(lunes);
                                const domingo = fechas[6];
                                const semana = turnosPorSemana[lunes] || { turnos: [], error: null };
                                const fueraDelMes = fechas.some((fecha) => fecha.slice(0, 7) !== mesSeleccionado);
                                const mesCompleto = cantidadPlantillas !== null && !cargandoPlantillas;
                                const puedeGenerar = !semana.error && semana.turnos.length === 0 &&
                                    mesCompleto && cantidadPlantillas > 0 && !semanaEnProceso && !semanaBorrando;

                                return (
                                    <section className="border rounded-3 overflow-hidden" key={lunes}>
                                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 p-2 px-md-3 bg-body-tertiary border-bottom">
                                            <div>
                                                <span className="fw-bold">
                                                    {formatearFecha(lunes)} – {formatearFecha(domingo)}
                                                </span>
                                                {fueraDelMes && (
                                                    <span className="small text-body-secondary ms-2">
                                                        Incluye días de otro mes
                                                    </span>
                                                )}
                                            </div>
                                            <div className="d-flex align-items-center gap-2">
                                                {semana.error ? (
                                                    <span className="small text-danger">No se pudo cargar</span>
                                                ) : semana.turnos.length > 0 ? (
                                                    <>
                                                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                                            {semana.turnos.length} turno(s)
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() => borrarSemana(lunes)}
                                                            disabled={Boolean(semanaBorrando || semanaEnProceso)}
                                                        >
                                                            {semanaBorrando === lunes ? (
                                                                <><span className="spinner-border spinner-border-sm me-1" role="status" />Borrando...</>
                                                            ) : (
                                                                <><i className="bi bi-trash3 me-1"></i>Borrar semana</>
                                                            )}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() => generarSemana(lunes)}
                                                        disabled={!puedeGenerar}
                                                    >
                                                        {semanaEnProceso === lunes ? (
                                                            <><span className="spinner-border spinner-border-sm me-1" role="status" />Generando...</>
                                                        ) : (
                                                            <><i className="bi bi-magic me-1"></i>Generar semana</>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="table-responsive">
                                            <table className="table table-bordered table-sm align-top text-start mb-0">
                                                <thead>
                                                    <tr>
                                                        {fechas.map((fecha) => (
                                                            <th
                                                                className={`small text-center ${fecha.slice(0, 7) !== mesSeleccionado ? 'text-body-tertiary bg-body-tertiary' : 'text-body-secondary'}`}
                                                                key={fecha}
                                                            >
                                                                {new Intl.DateTimeFormat('es-AR', { weekday: 'short' }).format(new Date(`${fecha}T12:00:00`))}
                                                                <span className="ms-1">{Number(fecha.slice(-2))}</span>
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        {fechas.map((fecha) => {
                                                            const turnosDia = semana.turnos.filter(
                                                                (turno) => String(turno.fecha).slice(0, 10) === fecha
                                                            );
                                                            const esOtroMes = fecha.slice(0, 7) !== mesSeleccionado;
                                                            return (
                                                                <td
                                                                    className={`p-1 p-md-2 ${esOtroMes ? 'bg-body-tertiary' : ''}`}
                                                                    key={fecha}
                                                                    style={{ minWidth: '105px', height: '82px' }}
                                                                >
                                                                    {turnosDia.length > 0 ? turnosDia.map((turno) => (
                                                                        <div
                                                                            className="rounded bg-primary-subtle text-primary-emphasis small p-1 mb-1"
                                                                            key={turno.id}
                                                                        >
                                                                            <div className="fw-semibold">
                                                                                {turno.horaInicio?.slice(0, 5)}–{turno.horaFin?.slice(0, 5)}
                                                                            </div>
                                                                            <div className="text-truncate" title={turno.punto?.nombre || 'Punto'}>
                                                                                {turno.punto?.nombre || 'Punto'}
                                                                            </div>
                                                                        </div>
                                                                    )) : (
                                                                        <span className="text-body-tertiary small">—</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GenerarTurnos;
