import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import GeneradorPlantillasRapidas from './GeneradorPlantillasRapidas';

const GestionPlantillas = () => {
    const [plantillas, setPlantillas] = useState([]);
    const [puntos, setPuntos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [diaActivo, setDiaActivo] = useState('MONDAY');
    const [filtroPunto, setFiltroPunto] = useState('todos');
    const [nuevaPlantilla, setNuevaPlantilla] = useState({
        diaSemana: 'MONDAY',
        horaInicio: '',
        horaFin: '',
        punto: { id: '' },
        publicador1: { id: '' },
        publicador2: { id: '' }
    });
    
    const api = import.meta.env.VITE_API_URL;

    const diasSemana = [
        { value: 'MONDAY', label: 'Lunes' },
        { value: 'TUESDAY', label: 'Martes' },
        { value: 'WEDNESDAY', label: 'Miércoles' },
        { value: 'THURSDAY', label: 'Jueves' },
        { value: 'FRIDAY', label: 'Viernes' },
        { value: 'SATURDAY', label: 'Sábado' },
        { value: 'SUNDAY', label: 'Domingo' }
    ];

    const fetchPuntos = async () => {
        try {
            const response = await fetch(`${api}/api/turnos/puntos`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                // Solo cargar puntos activos si es posible, o todos
                setPuntos(data.filter(p => p.activo !== false)); // if activo doesn't exist, show it.
            }
        } catch (error) {
            console.error("Error al cargar puntos", error);
        }
    };

    const fetchUsuarios = async () => {
        try {
            const response = await fetch(`${api}/usuarios`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setUsuarios(data);
            }
        } catch (error) {
            console.error("Error al cargar usuarios", error);
        }
    };

    const fetchPlantillas = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${api}/api/turnos/obtener`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setPlantillas(data);
            }
        } catch (error) {
            console.error("Error al cargar plantillas", error);
            Swal.fire('Error', 'No se pudieron cargar las plantillas de turnos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPuntos();
        fetchUsuarios();
        fetchPlantillas();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'puntoId') {
            setNuevaPlantilla(prev => ({ ...prev, punto: { id: value } }));
        } else if (name === 'publicador1Id') {
            setNuevaPlantilla(prev => ({ ...prev, publicador1: { id: value } }));
        } else if (name === 'publicador2Id') {
            setNuevaPlantilla(prev => ({ ...prev, publicador2: { id: value } }));
        } else {
            setNuevaPlantilla(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!nuevaPlantilla.diaSemana || !nuevaPlantilla.horaInicio || !nuevaPlantilla.horaFin || !nuevaPlantilla.punto.id) {
            Swal.fire('Atención', 'Todos los campos son obligatorios.', 'warning');
            return;
        }
        console.log("Submitting new plantilla:", nuevaPlantilla);

        const formatTime = (timeStr) => {
            return timeStr && timeStr.split(':').length === 2 ? `${timeStr}:00` : timeStr;
        };

        const payload = {
            diaSemana: nuevaPlantilla.diaSemana,
            horaInicio: formatTime(nuevaPlantilla.horaInicio),
            horaFin: formatTime(nuevaPlantilla.horaFin),
            punto: {
                id: parseInt(nuevaPlantilla.punto.id, 10)
            }
        };

        if (nuevaPlantilla.publicador1.id) {
            payload.publicador1 = { id: parseInt(nuevaPlantilla.publicador1.id, 10) };
        }
        if (nuevaPlantilla.publicador2.id) {
            payload.publicador2 = { id: parseInt(nuevaPlantilla.publicador2.id, 10) };
        }

        try {
            const response = await fetch(`${api}/api/turnos/crear`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                Swal.fire('¡Éxito!', 'La plantilla se ha agregado correctamente.', 'success');
                setNuevaPlantilla({ 
                    diaSemana: 'MONDAY', 
                    horaInicio: '', 
                    horaFin: '', 
                    punto: { id: '' },
                    publicador1: { id: '' },
                    publicador2: { id: '' }
                });
                fetchPlantillas();
            } else {
                Swal.fire('Error', 'No se pudo crear la plantilla.', 'error');
            }
        } catch (error) {
            console.error("Error al crear plantilla", error);
            Swal.fire('Error', 'Problema de red al crear la plantilla.', 'error');
        }
    };

    const eliminarPlantilla = async (id) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "Esta acción no se puede deshacer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--bs-danger)',
            cancelButtonColor: 'var(--bs-secondary)',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`${api}/api/turnos/eliminar/${id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                if (response.ok) {
                    Swal.fire('¡Eliminado!', 'La plantilla ha sido eliminada.', 'success');
                    fetchPlantillas();
                } else {
                    Swal.fire('Error', 'No se pudo eliminar la plantilla.', 'error');
                }
            } catch (error) {
                console.error("Error al eliminar plantilla", error);
                Swal.fire('Error', 'Problema de red al eliminar la plantilla.', 'error');
            }
        }
    };

    const getDiaLabel = (diaValue) => {
        const dia = diasSemana.find(d => d.value === diaValue);
        return dia ? dia.label : diaValue;
    };

    const plantillasOrdenadas = [...plantillas].sort((a, b) => {
        const dayOrder = {
            'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3, 'THURSDAY': 4,
            'FRIDAY': 5, 'SATURDAY': 6, 'SUNDAY': 7
        };
        const dayDiff = (dayOrder[a.diaSemana] || 0) - (dayOrder[b.diaSemana] || 0);
        if (dayDiff !== 0) return dayDiff;
        
        const timeA = a.horaInicio || '00:00';
        const timeB = b.horaInicio || '00:00';
        return timeA.localeCompare(timeB);
    });

    const plantillasFiltradas = plantillasOrdenadas.filter(p => {
        if (p.diaSemana !== diaActivo) return false;
        if (filtroPunto !== 'todos' && p.punto?.id.toString() !== filtroPunto) return false;
        return true;
    });

    return (
        <div className="container-fluid p-0 mt-4">
            <GeneradorPlantillasRapidas puntos={puntos} usuarios={usuarios} onCreated={fetchPlantillas} />
            <div className="row g-4">
                {/* Formulario de Creación */}
                <div className="col-12 col-lg-4">
                    <div className="card shadow-sm border-0 bg-body-tertiary">
                        <div className="card-body p-4">
                            <h4 className="card-title fw-bold text-primary mb-4">Crear Plantilla</h4>
                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Punto de Predicación *</label>
                                    <select 
                                        className="form-select" 
                                        name="puntoId"
                                        value={nuevaPlantilla.punto.id || ''}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Seleccione un punto...</option>
                                        {puntos.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Día de la Semana *</label>
                                    <select 
                                        className="form-select" 
                                        name="diaSemana"
                                        value={nuevaPlantilla.diaSemana}
                                        onChange={handleChange}
                                        required
                                    >
                                        {diasSemana.map(dia => (
                                            <option key={dia.value} value={dia.value}>{dia.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Hora de Inicio *</label>
                                    <input 
                                        type="time" 
                                        className="form-control" 
                                        name="horaInicio"
                                        value={nuevaPlantilla.horaInicio}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Hora de Fin *</label>
                                    <input 
                                        type="time" 
                                        className="form-control" 
                                        name="horaFin"
                                        value={nuevaPlantilla.horaFin}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Publicador 1 (Opcional)</label>
                                    <select 
                                        className="form-select" 
                                        name="publicador1Id"
                                        value={nuevaPlantilla.publicador1.id || ''}
                                        onChange={handleChange}
                                    >
                                        <option value="">Sin asignar</option>
                                        {usuarios.map(u => (
                                            <option key={u.id} value={u.id}>{u.nombre} {u.apellido || ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mb-4">
                                    <label className="form-label fw-semibold">Publicador 2 (Opcional)</label>
                                    <select 
                                        className="form-select" 
                                        name="publicador2Id"
                                        value={nuevaPlantilla.publicador2.id || ''}
                                        onChange={handleChange}
                                    >
                                        <option value="">Sin asignar</option>
                                        {usuarios.map(u => (
                                            <option key={u.id} value={u.id}>{u.nombre} {u.apellido || ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <button type="submit" className="btn btn-success w-100 fw-bold shadow-sm">
                                    Guardar Plantilla
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Lista de Plantillas */}
                <div className="col-12 col-lg-8">
                    <div className="card shadow-sm border-0">
                        <div className="card-body p-4">
                            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
                                <h4 className="card-title fw-bold text-body-secondary mb-0">Plantillas de Turnos</h4>
                                <div className="w-100" style={{ maxWidth: '300px' }}>
                                    <select 
                                        className="form-select w-100"
                                        value={filtroPunto}
                                        onChange={(e) => setFiltroPunto(e.target.value)}
                                    >
                                        <option value="todos">Todos los puntos</option>
                                        {puntos.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            {/* Tabs por Día */}
                            <ul className="nav nav-pills mb-4 flex-nowrap overflow-x-auto pb-2" style={{ whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch' }}>
                                {diasSemana.map(dia => (
                                    <li className="nav-item" key={dia.value}>
                                        <button
                                            className={`nav-link fw-semibold ${diaActivo === dia.value ? 'active' : ''}`}
                                            onClick={() => setDiaActivo(dia.value)}
                                            type="button"
                                            style={diaActivo !== dia.value ? { color: '#6c757d' } : {}}
                                        >
                                            {dia.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            {loading ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Cargando...</span>
                                    </div>
                                </div>
                            ) : plantillas.length === 0 ? (
                                <div className="alert alert-info border-0 shadow-sm text-center">
                                    No hay ninguna plantilla de turnos registrada.
                                </div>
                            ) : plantillasFiltradas.length === 0 ? (
                                <div className="alert alert-warning border-0 shadow-sm text-center">
                                    No hay plantillas registradas para el {getDiaLabel(diaActivo)}.
                                </div>
                            ) : (
                                <React.Fragment>
                                    {/* Vista Desktop (Tabla) */}
                                    <div className="table-responsive d-none d-md-block">
                                        <table className="table table-hover align-middle text-center mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th scope="col">Horario</th>
                                                    <th scope="col">Punto</th>
                                                    <th scope="col">Fijos</th>
                                                    <th scope="col">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {plantillasFiltradas.map(plantilla => (
                                                    <tr key={plantilla.id}>
                                                        <td className="fw-semibold">{plantilla.horaInicio?.slice(0, 5)} - {plantilla.horaFin?.slice(0, 5)}</td>
                                                        <td className="text-muted">{plantilla.punto?.nombre || 'Desconocido'}</td>
                                                        <td>
                                                            <div className="small text-start d-inline-block">
                                                                {plantilla.publicador1 ? <div><i className="bi bi-person-fill text-body-secondary"></i> {plantilla.publicador1.nombre} {plantilla.publicador1.apellido || ''}</div> : null}
                                                                {plantilla.publicador2 ? <div><i className="bi bi-person-fill text-body-secondary"></i> {plantilla.publicador2.nombre} {plantilla.publicador2.apellido || ''}</div> : null}
                                                                {!plantilla.publicador1 && !plantilla.publicador2 ? <span className="text-muted fst-italic">Nadie</span> : null}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <button 
                                                                className="btn btn-sm btn-outline-danger fw-semibold"
                                                                onClick={() => eliminarPlantilla(plantilla.id)}
                                                            >
                                                                <i className="bi bi-trash-fill me-1"></i> Eliminar
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Vista Mobile (Tarjetas) */}
                                    <div className="d-block d-md-none">
                                        {plantillasFiltradas.map(plantilla => (
                                            <div key={plantilla.id} className="card mb-3 border border-light shadow-sm">
                                                <div className="card-body p-3">
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <span className="fw-bold text-primary fs-5">
                                                            <i className="bi bi-clock me-2"></i>
                                                            {plantilla.horaInicio?.slice(0, 5)} - {plantilla.horaFin?.slice(0, 5)}
                                                        </span>
                                                        <button 
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() => eliminarPlantilla(plantilla.id)}
                                                        >
                                                            <i className="bi bi-trash-fill"></i>
                                                        </button>
                                                    </div>
                                                    <div className="d-flex align-items-center text-muted">
                                                        <i className="bi bi-geo-alt-fill me-2 text-body-secondary"></i>
                                                        <span>{plantilla.punto?.nombre || 'Desconocido'}</span>
                                                    </div>
                                                    {(plantilla.publicador1 || plantilla.publicador2) && (
                                                        <div className="d-flex align-items-center mt-2 small text-muted">
                                                            <i className="bi bi-people-fill me-2 text-info"></i>
                                                            <span>
                                                                {[plantilla.publicador1?.nombre, plantilla.publicador2?.nombre].filter(Boolean).join(' y ')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </React.Fragment>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GestionPlantillas;
