import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

const GestionReportes = () => {
    const [reportes, setReportes] = useState([]);
    const [loading, setLoading] = useState(true);
    const api = import.meta.env.VITE_API_URL;

    const cargarReportes = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${api}/reporte/traer`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setReportes(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarReportes();
    }, []);

    const handleRealizado = async (id) => {
        try {
            const res = await fetch(`${api}/reporte/eliminar/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (res.ok) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Reporte marcado como realizado',
                    showConfirmButton: false,
                    timer: 2000
                });
                setReportes(reportes.filter(r => r.id !== id));
            } else {
                Swal.fire('Error', 'No se pudo eliminar el reporte', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Problema de red al eliminar el reporte', 'error');
        }
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-grow text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                </div>
            </div>
        );
    }

    if (reportes.length === 0) {
        return (
            <div className="text-center py-5 bg-body shadow-sm rounded-4 border-0 mt-3">
                <i className="bi bi-check-circle text-success" style={{ fontSize: '3rem' }}></i>
                <h5 className="mt-3 text-body-secondary">¡Todo al día!</h5>
                <p className="text-muted mb-0">No hay reportes pendientes.</p>
            </div>
        );
    }

    return (
        <div className="mt-3">
            <h4 className="mb-4 text-primary"><i className="bi bi-list-check me-2"></i>To-Do List: Reportes</h4>
            <div className="row g-3">
                {reportes.map(r => (
                    <div key={r.id} className="col-12 col-md-6 col-lg-4">
                        <div className="card shadow-sm border-start border-warning border-4 h-100">
                            <div className="card-body d-flex flex-column">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <span className="badge bg-secondary">
                                        {new Date(r.fecha).toLocaleDateString()}
                                    </span>
                                    <span className="fw-bold text-body small">
                                        <i className="bi bi-person-fill me-1 text-primary"></i> 
                                        {r.usuario?.usuario || 'Desconocido'}
                                    </span>
                                </div>
                                
                                <ul className="list-group list-group-flush mb-3 flex-grow-1">
                                    <li className="list-group-item px-0 py-2 bg-transparent">
                                        <strong>Falta Literatura:</strong> {r.faltaLiteratura ? <span className="text-danger fw-bold">Sí</span> : 'No'}
                                        {r.faltaLiteratura && <div className="text-muted small mt-1"><i className="bi bi-arrow-return-right me-1"></i>{r.literaturaDetalle}</div>}
                                    </li>
                                    <li className="list-group-item px-0 py-2 bg-transparent">
                                        <strong>Necesita Limpieza:</strong> {r.necesitaLimpieza ? <span className="text-danger fw-bold">Sí</span> : 'No'}
                                    </li>
                                    {r.observaciones && (
                                        <li className="list-group-item px-0 py-2 bg-transparent">
                                            <strong>Obs:</strong> <span className="text-muted">{r.observaciones}</span>
                                        </li>
                                    )}
                                </ul>
                                
                                <button 
                                    className="btn btn-outline-success w-100 fw-bold rounded-pill mt-auto"
                                    onClick={() => handleRealizado(r.id)}
                                >
                                    <i className="bi bi-check2-square me-2"></i> Realizado
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GestionReportes;
