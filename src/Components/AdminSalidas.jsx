import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

const AdminSalidas = () => {
    const api = import.meta.env.VITE_API_URL;
    const [disponibilidades, setDisponibilidades] = useState([]);
    const [salidas, setSalidas] = useState([]);
    const [territorios, setTerritorios] = useState([]);
    const [loading, setLoading] = useState(true);

    const [fecha, setFecha] = useState('');
    const [hora, setHora] = useState('');
    const [puntoEncuentro, setPuntoEncuentro] = useState('');
    const [conductorId, setConductorId] = useState('');
    const [territorioId, setTerritorioId] = useState('');
    const [grupos, setGrupos] = useState('Toda la congregación');

    const Toast = Swal.mixin({
        toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resDisp, resSalidas, resTerr] = await Promise.all([
                fetch(`${api}/disponibilidades/traer`, { credentials: 'include' }),
                fetch(`${api}/salidas/traer`, { credentials: 'include' }),
                fetch(`${api}/territorios/traer`, { credentials: 'include' })
            ]);
            if (resDisp.ok) setDisponibilidades(await resDisp.json());
            if (resSalidas.ok) setSalidas(await resSalidas.json());
            if (resTerr.ok) setTerritorios(await resTerr.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const crearSalida = async (e) => {
        e.preventDefault();
        try {
            const body = {
                fecha,
                hora,
                puntoEncuentro,
                grupos,
                conductor: { id: conductorId }
            };
            if (territorioId) body.territorio = { id: territorioId };

            const res = await fetch(`${api}/salidas/agregar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body)
            });
            if (res.ok) {
                Toast.fire({ icon: 'success', title: 'Salida programada' });
                setFecha(''); setHora(''); setPuntoEncuentro(''); setConductorId(''); setTerritorioId(''); setGrupos('Toda la congregación');
                fetchData();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const borrarSalida = async (id) => {
        try {
            const res = await fetch(`${api}/salidas/borrar/${id}`, { method: 'DELETE', credentials: 'include' });
            if (res.ok) {
                Toast.fire({ icon: 'success', title: 'Borrada' });
                fetchData();
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

    // Agrupar disponibilidades por día para una mejor visualización
    const dispPorDia = disponibilidades.reduce((acc, d) => {
        if (!acc[d.diaSemana]) acc[d.diaSemana] = [];
        acc[d.diaSemana].push(d);
        return acc;
    }, {});

    return (
        <div className="container mt-4 mb-5">
            <h2 className="h4 text-primary fw-bold mb-4">
                <i className="bi bi-calendar-range me-2"></i>Armar Programa de Salidas
            </h2>

            <div className="row g-4">
                {/* Columna Izquierda: Disponibilidades */}
                <div className="col-12 col-lg-5">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-header bg-info bg-opacity-10 border-bottom-0 pt-3 pb-2">
                            <h5 className="fw-bold m-0 text-info-emphasis"><i className="bi bi-person-lines-fill me-2"></i>Disponibilidad de Hermanos</h5>
                        </div>
                        <div className="card-body p-0">
                            {Object.keys(dispPorDia).length === 0 ? (
                                <div className="p-4 text-center text-muted">Ningún hermano ha cargado disponibilidades aún.</div>
                            ) : (
                                <div className="accordion accordion-flush" id="accordionDisp">
                                    {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(dia => {
                                        const lista = dispPorDia[dia];
                                        if (!lista) return null;
                                        return (
                                            <div className="accordion-item" key={dia}>
                                                <h2 className="accordion-header">
                                                    <button className="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target={`#col-${dia}`}>
                                                        {dia}s ({lista.length})
                                                    </button>
                                                </h2>
                                                <div id={`col-${dia}`} className="accordion-collapse collapse" data-bs-parent="#accordionDisp">
                                                    <div className="accordion-body p-0">
                                                        <ul className="list-group list-group-flush">
                                                            {lista.map(d => (
                                                                <li key={d.id} className="list-group-item d-flex justify-content-between align-items-center">
                                                                    <span><i className="bi bi-person-fill me-2 text-primary"></i>{d.usuario?.nombre} {d.usuario?.apellido}</span>
                                                                    <span className="badge bg-secondary rounded-pill">{d.hora} hs</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Formulario y Programa */}
                <div className="col-12 col-lg-7">
                    <div className="card shadow-sm border-0 mb-4 bg-body-tertiary">
                        <div className="card-body">
                            <h5 className="fw-bold mb-3"><i className="bi bi-plus-circle me-2"></i>Programar Nueva Salida</h5>
                            <form onSubmit={crearSalida} className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold">Fecha</label>
                                    <input type="date" className="form-control" required value={fecha} onChange={e => setFecha(e.target.value)} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold">Hora</label>
                                    <input type="time" className="form-control" required value={hora} onChange={e => setHora(e.target.value)} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold">Punto de Encuentro</label>
                                    <input type="text" className="form-control" required value={puntoEncuentro} onChange={e => setPuntoEncuentro(e.target.value)} placeholder="Ej: Salón, Casa hno Juan..." />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-primary">Grupo(s) Destinatario(s)</label>
                                    <input type="text" className="form-control border-primary" required value={grupos} onChange={e => setGrupos(e.target.value)} placeholder="Ej: Toda la congregación, Grupo 1 y 2..." />
                                </div>
                                <div className="col-md-12">
                                    <label className="form-label small fw-bold">Conductor</label>
                                    <select className="form-select" required value={conductorId} onChange={e => setConductorId(e.target.value)}>
                                        <option value="">Seleccione...</option>
                                        {disponibilidades.map(d => (
                                            <option key={d.id} value={d.usuario?.id}>{d.usuario?.nombre} {d.usuario?.apellido} ({d.diaSemana} {d.hora}hs)</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-12">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <label className="form-label small fw-bold text-success m-0"><i className="bi bi-map-fill me-1"></i> Territorio Asignado (Opcional)</label>
                                        <div>
                                            <button type="button" className="btn btn-sm btn-outline-secondary fw-bold py-0" disabled title="La visualización de mapas está temporalmente deshabilitada.">
                                                <i className="bi bi-map me-1"></i> Mapas en actualización
                                            </button>
                                        </div>
                                    </div>
                                    <select className="form-select" value={territorioId} onChange={e => setTerritorioId(e.target.value)}>
                                        <option value="">Ninguno específico...</option>
                                        {(() => {
                                            const territoriosOrdenados = [...territorios].sort((a, b) => {
                                                if (!a.ultimaFechaTrabajada) return -1;
                                                if (!b.ultimaFechaTrabajada) return 1;
                                                return new Date(a.ultimaFechaTrabajada) - new Date(b.ultimaFechaTrabajada);
                                            });
                                            const territoriosSugeridos = territoriosOrdenados.slice(0, 3);
                                            const sugeridosIds = territoriosSugeridos.map(t => t.id);
                                            const otrosTerritorios = territorios.filter(t => !sugeridosIds.includes(t.id));

                                            return (
                                                <>
                                                    {territoriosSugeridos.length > 0 && (
                                                        <optgroup label="Sugeridos (Hace mucho no se trabajan)">
                                                            {territoriosSugeridos.map(t => (
                                                                <option key={t.id} value={t.id}>
                                                                    Territorio {t.numero} - {t.manzanas?.length || 0} manzanas {t.ultimaFechaTrabajada ? `(Última vez: ${new Date(t.ultimaFechaTrabajada).toLocaleDateString()})` : '(Nunca trabajado)'}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                    {otrosTerritorios.length > 0 && (
                                                        <optgroup label="Otros Territorios">
                                                            {otrosTerritorios.map(t => (
                                                                <option key={t.id} value={t.id}>
                                                                    Territorio {t.numero} - {t.manzanas?.length || 0} manzanas {t.ultimaFechaTrabajada ? `(Última vez: ${new Date(t.ultimaFechaTrabajada).toLocaleDateString()})` : ''}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </select>
                                </div>
                                <div className="col-12 text-end">
                                    <button type="submit" className="btn btn-primary fw-bold px-4">Guardar Salida</button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <h5 className="fw-bold mb-3">Programa Armado</h5>
                    <div className="list-group shadow-sm">
                        {salidas.length === 0 ? (
                            <div className="list-group-item text-center text-muted py-4">No hay salidas programadas.</div>
                        ) : (
                            salidas.sort((a,b) => a.fecha.localeCompare(b.fecha)).map(s => (
                                <div key={s.id} className="list-group-item list-group-item-action d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
                                    <div>
                                        <h6 className="fw-bold mb-1 d-flex flex-wrap align-items-center gap-2">
                                            <span>{new Date(s.fecha + 'T12:00:00').toLocaleDateString()} a las {s.hora} hs</span>
                                            <span className="badge bg-primary">{s.grupos || 'Toda la congregación'}</span>
                                        </h6>
                                        <div className="small text-muted">
                                            <i className="bi bi-geo-alt-fill text-danger me-1"></i> {s.puntoEncuentro}
                                            {s.territorio && <span className="ms-2 badge bg-success"><i className="bi bi-map-fill me-1"></i>Territorio {s.territorio.numero}</span>}
                                        </div>
                                        <div className="small text-muted mt-1"><i className="bi bi-person-fill text-primary me-1"></i> Conduce: {s.conductor?.nombre} {s.conductor?.apellido}</div>
                                    </div>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => borrarSalida(s.id)}>
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default AdminSalidas;
