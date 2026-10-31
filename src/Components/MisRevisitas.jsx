import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

const MisRevisitas = () => {
    const [revisitas, setRevisitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const api = import.meta.env.VITE_API_URL;
    const usuarioId = localStorage.getItem('usuarioId');

    const fetchData = async () => {
        setLoading(true);
        if (!usuarioId) {
            setLoading(false);
            return;
        }
        try {
            const timestamp = new Date().getTime();
            const res = await fetch(`${api}/territorios/traer?t=${timestamp}`, { credentials: 'include' });
            if (res.ok) {
                const territorios = await res.json();
                let misRev = [];
                territorios.forEach(t => {
                    t.manzanas?.forEach(m => {
                        m.edificios?.forEach(e => {
                            e.departamentos?.forEach(d => {
                                // Asegurarse que es una revisita y pertenece al usuario actual
                                if (d.estado === 'Revisita' && String(d.idPublicador) === String(usuarioId)) {
                                    misRev.push({
                                        ...d,
                                        direccionEdificio: e.direccion || 'Edificio sin dirección'
                                    });
                                }
                            });
                        });
                    });
                });
                setRevisitas(misRev);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [usuarioId]);

    const editarObservaciones = async (dpto) => {
        const { value: observaciones } = await Swal.fire({
            title: 'Editar Observaciones',
            input: 'textarea',
            inputValue: dpto.observaciones || '',
            inputPlaceholder: 'Ej: Se llama Juan...',
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar'
        });
        
        if (observaciones !== undefined && observaciones !== dpto.observaciones) {
            try {
                const res = await fetch(`${api}/departamentos/editar/${dpto.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({...dpto, observaciones})
                });
                if (res.ok) {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Guardado', showConfirmButton: false, timer: 2000 });
                    fetchData();
                }
            } catch (e) {
                Swal.fire('Error', 'No se pudo guardar', 'error');
            }
        }
    };

    const quitarRevisita = async (dpto) => {
        const confirm = await Swal.fire({
            title: '¿Ya no es revisita?',
            text: 'Pasará al estado "Atendió" y dejará de verse en esta lista.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, quitar',
            cancelButtonText: 'Cancelar'
        });
        
        if (confirm.isConfirmed) {
            try {
                const res = await fetch(`${api}/departamentos/editar/${dpto.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({...dpto, estado: 'Atendió', observaciones: ''})
                });
                if (res.ok) {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Actualizado', showConfirmButton: false, timer: 2000 });
                    fetchData();
                }
            } catch (e) {
                Swal.fire('Error', 'No se pudo actualizar', 'error');
            }
        }
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

    if (!usuarioId) {
        return (
            <div className="container mt-5 text-center">
                <div className="alert alert-warning">
                    Por favor cierra sesión y vuelve a iniciarla para que el sistema reconozca tu usuario y pueda mostrarte tus revisitas.
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4 mb-5">
            <h2 className="h4 text-primary fw-bold mb-4">
                <i className="bi bi-star-fill text-warning me-2"></i>Mis Revisitas
            </h2>

            {revisitas.length === 0 ? (
                <div className="alert alert-light text-center border py-5 text-muted shadow-sm rounded-4">
                    <i className="bi bi-journal-x fs-1 d-block mb-3 opacity-50"></i>
                    No tienes revisitas anotadas actualmente.
                    <br/><small>Cuando estés predicando, marca un timbre como "Revisita" para que aparezca aquí.</small>
                </div>
            ) : (
                <div className="row g-3">
                    {revisitas.map(r => (
                        <div className="col-12 col-md-6 col-lg-4" key={r.id}>
                            <div className="card h-100 border-0 shadow-sm rounded-4">
                                <div className="card-header bg-info bg-opacity-10 border-bottom-0 pt-3 pb-2 d-flex justify-content-between align-items-center rounded-top-4">
                                    <div>
                                        <h5 className="fw-bold m-0 text-body">
                                            <i className="bi bi-building me-2"></i>
                                            {r.direccionEdificio}
                                        </h5>
                                        <div className="text-muted small mt-1">
                                            <i className="bi bi-door-closed me-1"></i> Piso {r.piso} - Dpto {r.letra}
                                        </div>
                                    </div>
                                    <span className="badge bg-body text-body border shadow-sm">
                                        {new Date(r.ultimaFechaTrabajada).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="card-body">
                                    <p className="text-muted small mb-3">
                                        <em>"{r.observaciones || 'Sin observaciones'}"</em>
                                    </p>
                                    <div className="d-flex gap-2">
                                        <button className="btn btn-sm btn-outline-primary w-100 rounded-pill fw-bold" onClick={() => editarObservaciones(r)}>
                                            <i className="bi bi-pencil me-1"></i> Editar Notas
                                        </button>
                                        <button className="btn btn-sm btn-outline-secondary w-100 rounded-pill fw-bold" onClick={() => quitarRevisita(r)}>
                                            <i className="bi bi-check2-all me-1"></i> Quitar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MisRevisitas;
