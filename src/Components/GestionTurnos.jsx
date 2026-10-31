import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

const hoy = () => {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
};

const GestionTurnos = () => {
    const api = import.meta.env.VITE_API_URL;
    const [puntos, setPuntos] = useState([]);
    const [cargandoPuntos, setCargandoPuntos] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [nuevoTurno, setNuevoTurno] = useState({
        fecha: hoy(),
        horaInicio: '',
        horaFin: '',
        capacidad: '',
        puntoId: ''
    });

    useEffect(() => {
        const cargarPuntos = async () => {
            try {
                const response = await fetch(`${api}/api/turnos/puntos`, {
                    credentials: 'include'
                });
                if (!response.ok) {
                    throw new Error('No se pudieron cargar los puntos de predicación.');
                }

                const data = await response.json();
                setPuntos(data.filter(punto => punto.activo !== false));
            } catch (error) {
                console.error('Error al cargar puntos para crear un turno', error);
                Swal.fire('Error', 'No se pudieron cargar los puntos de predicación.', 'error');
            } finally {
                setCargandoPuntos(false);
            }
        };

        cargarPuntos();
    }, [api]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setNuevoTurno(prev => ({ ...prev, [name]: value }));
    };

    const crearTurno = async (event) => {
        event.preventDefault();

        if (nuevoTurno.horaFin <= nuevoTurno.horaInicio) {
            Swal.fire('Revisá el horario', 'La hora de finalización debe ser posterior al inicio.', 'warning');
            return;
        }

        setGuardando(true);
        try {
            const response = await fetch(`${api}/turnos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    fecha: nuevoTurno.fecha,
                    horaInicio: `${nuevoTurno.horaInicio}:00`,
                    horaFin: `${nuevoTurno.horaFin}:00`,
                    capacidad: Number(nuevoTurno.capacidad),
                    punto: { id: Number(nuevoTurno.puntoId) }
                })
            });

            if (!response.ok) {
                const mensaje = await response.text();
                throw new Error(mensaje || 'No se pudo crear el turno.');
            }

            await Swal.fire({
                title: 'Turno creado',
                text: 'El turno ya está disponible para que se anoten.',
                icon: 'success'
            });
            setNuevoTurno({
                fecha: hoy(),
                horaInicio: '',
                horaFin: '',
                capacidad: '',
                puntoId: ''
            });
        } catch (error) {
            console.error('Error al crear turno', error);
            Swal.fire('Error', error.message || 'Problema de conexión al crear el turno.', 'error');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="container-fluid p-0 mt-4">
            <div className="row g-4">
                <div className="col-12 col-lg-7 col-xl-6">
                    <div className="card shadow-sm border-0">
                        <div className="card-body p-4">
                            <div className="d-flex align-items-start gap-3 mb-4">
                                <span className="fs-3 text-primary" aria-hidden="true">
                                    <i className="bi bi-calendar-plus"></i>
                                </span>
                                <div>
                                    <h2 className="h4 fw-bold mb-1">Crear turno puntual</h2>
                                    <p className="text-body-secondary mb-0">
                                        Programá un turno para una fecha y un punto específicos.
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={crearTurno}>
                                <div className="mb-3">
                                    <label className="form-label fw-semibold" htmlFor="turno-punto">Punto de predicación *</label>
                                    <select
                                        id="turno-punto"
                                        className="form-select"
                                        name="puntoId"
                                        value={nuevoTurno.puntoId}
                                        onChange={handleChange}
                                        required
                                        disabled={cargandoPuntos || puntos.length === 0}
                                    >
                                        <option value="">
                                            {cargandoPuntos ? 'Cargando puntos...' : 'Seleccioná un punto'}
                                        </option>
                                        {puntos.map(punto => (
                                            <option key={punto.id} value={punto.id}>
                                                {punto.nombre}{punto.direccion ? ` — ${punto.direccion}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {!cargandoPuntos && puntos.length === 0 && (
                                        <div className="form-text text-warning">
                                            Primero creá o activá un punto en Gestión de Puntos.
                                        </div>
                                    )}
                                </div>

                                <div className="mb-3">
                                    <label className="form-label fw-semibold" htmlFor="turno-fecha">Fecha *</label>
                                    <input
                                        id="turno-fecha"
                                        type="date"
                                        className="form-control"
                                        name="fecha"
                                        min={hoy()}
                                        value={nuevoTurno.fecha}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="row g-3 mb-3">
                                    <div className="col-6">
                                        <label className="form-label fw-semibold" htmlFor="turno-inicio">Desde *</label>
                                        <input
                                            id="turno-inicio"
                                            type="time"
                                            className="form-control"
                                            name="horaInicio"
                                            value={nuevoTurno.horaInicio}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label fw-semibold" htmlFor="turno-fin">Hasta *</label>
                                        <input
                                            id="turno-fin"
                                            type="time"
                                            className="form-control"
                                            name="horaFin"
                                            value={nuevoTurno.horaFin}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="form-label fw-semibold" htmlFor="turno-capacidad">Cupos disponibles *</label>
                                    <input
                                        id="turno-capacidad"
                                        type="number"
                                        className="form-control"
                                        name="capacidad"
                                        min="1"
                                        step="1"
                                        value={nuevoTurno.capacidad}
                                        onChange={handleChange}
                                        required
                                    />
                                    <div className="form-text">Cantidad de personas que podrán anotarse.</div>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary w-100 fw-bold"
                                    disabled={guardando || cargandoPuntos || puntos.length === 0}
                                >
                                    {guardando ? (
                                        <><span className="spinner-border spinner-border-sm me-2" role="status" />Creando turno...</>
                                    ) : (
                                        <><i className="bi bi-check-circle me-2"></i>Crear turno</>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-5 col-xl-6">
                    <div className="card h-100 border-0 bg-body-tertiary">
                        <div className="card-body p-4">
                            <h3 className="h5 fw-bold mb-3">Administración de predicación pública</h3>
                            <p className="text-body-secondary">
                                Los turnos puntuales son independientes de las plantillas semanales. Una vez creado,
                                el turno aparecerá en la agenda pública para que los publicadores puedan anotarse.
                            </p>
                            <div className="d-flex align-items-start gap-3 mb-3">
                                <i className="bi bi-geo-alt-fill text-success mt-1"></i>
                                <div>
                                    <div className="fw-semibold">Gestión de Puntos</div>
                                    <div className="small text-body-secondary">Creá puntos y administrá cuáles están activos.</div>
                                </div>
                            </div>
                            <div className="d-flex align-items-start gap-3 mb-3">
                                <i className="bi bi-arrow-repeat text-primary mt-1"></i>
                                <div>
                                    <div className="fw-semibold">Plantillas de Turnos</div>
                                    <div className="small text-body-secondary">Configurá horarios semanales recurrentes.</div>
                                </div>
                            </div>
                            <div className="d-flex align-items-start gap-3">
                                <i className="bi bi-list-task text-warning mt-1"></i>
                                <div>
                                    <div className="fw-semibold">To-Do Reportes</div>
                                    <div className="small text-body-secondary">Consultá y gestioná los reportes pendientes.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GestionTurnos;
