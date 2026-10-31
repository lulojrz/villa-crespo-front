import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { normalizarRol, normalizarAsignacion, obtenerNombreRol, obtenerNombreAsignacion } from '../utils/permisos';

const CambiarContrasena = () => {
    const [formData, setFormData] = useState({
        contrasenaActual: '',
        nuevaContrasena: '',
        confirmarContrasena: ''
    });
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState(null);
    const [loadingInventario, setLoadingInventario] = useState(false);

    const api = import.meta.env.VITE_API_URL;
    const usuarioLogueado = localStorage.getItem('usuario'); // Tomamos el usuario del localStorage

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await fetch(`${api}/usuarios`, { credentials: 'include' });
                if (response.ok) {
                    const data = await response.json();
                    const loggedIn = data.find(u => u.usuario === usuarioLogueado);
                    if (loggedIn) {
                        setUserData(loggedIn);
                    }
                }
            } catch (error) {
                console.error('Error fetching user data', error);
            }
        };
        fetchUserData();
    }, [api, usuarioLogueado]);

    const handleGuardarInventario = async (e) => {
        e.preventDefault();
        setLoadingInventario(true);
        try {
            const response = await fetch(`${api}/usuarios/editar/${userData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(userData)
            });
            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: 'Tu inventario ha sido actualizado.',
                    confirmButtonColor: '#007bff'
                });
            } else {
                Swal.fire('Error', 'No se pudo actualizar el inventario.', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Error de conexión', 'error');
        } finally {
            setLoadingInventario(false);
        }
    };

    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
        }
    });

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. Validar que la nueva contraseña tenga al menos 6 caracteres
        if (formData.nuevaContrasena.length < 6) {
            Swal.fire({
                icon: 'error',
                title: 'Contraseña muy corta',
                text: 'La nueva contraseña debe tener al menos 6 caracteres.',
                confirmButtonColor: '#007bff'
            });
            return;
        }

        // 2. Validar que las contraseñas nuevas coincidan
        if (formData.nuevaContrasena !== formData.confirmarContrasena) {
            Swal.fire({
                icon: 'error',
                title: 'Las contraseñas no coinciden',
                text: 'Asegúrate de escribir la misma contraseña en ambos campos nuevos.',
                confirmButtonColor: '#007bff'
            });
            return;
        }

        // 3. Validar que no sea la misma que la anterior (opcional pero buena práctica)
        if (formData.contrasenaActual === formData.nuevaContrasena) {
            Swal.fire({
                icon: 'error',
                title: 'Sin cambios',
                text: 'La nueva contraseña debe ser diferente a la actual.',
                confirmButtonColor: '#007bff'
            });
            return;
        }

        setLoading(true);

        try {
            // Se envía al backend: usuario (para saber quién es), contraseña actual (para validar) y la nueva
            const response = await fetch(`${api}/usuarios/cambiar-contrasena`, {
                method: 'PUT', // o POST, depende del backend
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    usuario: usuarioLogueado,
                    contrasenaActual: formData.contrasenaActual,
                    nuevaContrasena: formData.nuevaContrasena
                })
            });

            if (response.ok) {
                const responseText = await response.text();
                
                // Si el backend devuelve un mensaje específico de error como "Contraseña actual incorrecta"
                if (responseText.toLowerCase().includes("incorrecta") || responseText.toLowerCase().includes("error")) {
                     Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: responseText || 'La contraseña actual es incorrecta.',
                        confirmButtonColor: '#007bff'
                    });
                } else {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Éxito!',
                        text: 'Tu contraseña ha sido actualizada correctamente.',
                        confirmButtonColor: '#007bff'
                    });
                    // Limpiar el formulario
                    setFormData({ contrasenaActual: '', nuevaContrasena: '', confirmarContrasena: '' });
                }
            } else {
                // Si la respuesta no fue 2xx
                const errorMessage = await response.text();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage || 'Hubo un error al intentar cambiar la contraseña.',
                    confirmButtonColor: '#007bff'
                });
            }

        } catch (error) {

            Toast.fire({
                icon: 'error',
                title: 'Error de conexión con el servidor'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='container my-5'>
            <div className='row justify-content-center'>
                <div className='col-md-6 col-lg-5'>
                    <div className='card shadow-lg p-4'>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h2 className="h4 mb-0">Mi Perfil</h2>
                            <Link to="/admin" className='btn btn-outline-secondary btn-sm'>
                                Volver
                            </Link>
                        </div>
                        
                        <hr />
                        
                        <p className="text-muted mb-4">Usuario: <strong>{usuarioLogueado}</strong></p>

                        {/* Bloque de Información de Cuenta (Rol y Asignación - No modificables) */}
                        <div className="card bg-body-tertiary border-0 rounded-3 p-3 mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="fw-bold mb-0 text-body">
                                    <i className="bi bi-shield-lock-fill text-primary me-2"></i>
                                    Tu Asignación y Privilegio
                                </h6>
                                <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle small">
                                    <i className="bi bi-lock-fill me-1"></i> Solo lectura
                                </span>
                            </div>
                            <p className="small text-body-secondary mb-3">
                                Tu rol y asignación son administrados por el cuerpo de ancianos y no pueden modificarse desde aquí.
                            </p>

                            <div className="row g-2">
                                <div className="col-12 col-sm-6">
                                    <div className="bg-body border rounded-2 p-2 h-100">
                                        <small className="text-muted d-block fw-semibold mb-1">Rol / Privilegio</small>
                                        <div className="fw-bold text-primary d-flex align-items-center gap-1">
                                            <i className="bi bi-person-badge"></i>
                                            {obtenerNombreRol(userData?.privilegio || localStorage.getItem('privilegio'))}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-12 col-sm-6">
                                    <div className="bg-body border rounded-2 p-2 h-100">
                                        <small className="text-muted d-block fw-semibold mb-1">Asignación</small>
                                        <div className="fw-bold text-info d-flex align-items-center gap-1">
                                            <i className="bi bi-briefcase"></i>
                                            {obtenerNombreAsignacion(userData?.asignacion || localStorage.getItem('asignacion'))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {(userData?.habilitacionPublica || localStorage.getItem('habilitacionPublica') === 'true') && (
                                <div className="mt-2 text-success small fw-semibold d-flex align-items-center gap-1">
                                    <i className="bi bi-check-circle-fill"></i> Habilitado para Predicación Pública (Carritos)
                                </div>
                            )}
                        </div>

                        {userData && (
                            <form onSubmit={handleGuardarInventario} className="mb-4">
                                <h5 className="mb-3">Mi Inventario de Predicación</h5>
                                <div className="mb-4 d-flex gap-4">
                                    <div className="form-check form-switch">
                                        <input className="form-check-input" type="checkbox" id="checkCarritoUser" 
                                            checked={userData.carrito || false} 
                                            onChange={(e) => setUserData({...userData, carrito: e.target.checked})} 
                                        />
                                        <label className="form-check-label" htmlFor="checkCarritoUser">Tengo Carrito 🛒</label>
                                    </div>
                                    <div className="form-check form-switch">
                                        <input className="form-check-input" type="checkbox" id="checkBannerUser" 
                                            checked={userData.banner || false} 
                                            onChange={(e) => setUserData({...userData, banner: e.target.checked})} 
                                        />
                                        <label className="form-check-label" htmlFor="checkBannerUser">Tengo Banner 🏳️</label>
                                    </div>
                                </div>
                                <div className="d-grid">
                                    <button type="submit" className="btn btn-success" disabled={loadingInventario}>
                                        {loadingInventario ? 'Guardando...' : 'Guardar Inventario'}
                                    </button>
                                </div>
                            </form>
                        )}
                        
                        {userData && <hr className="mb-4" />}

                        <form onSubmit={handleSubmit}>
                            <h5 className="mb-3">Cambiar Contraseña</h5>
                            
                            <div className="mb-3">
                                <label className="form-label">Contraseña Actual</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    name="contrasenaActual"
                                    value={formData.contrasenaActual}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Ingresa tu contraseña actual"
                                />
                            </div>
                            
                            <div className="mb-3">
                                <label className="form-label">Nueva Contraseña</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    name="nuevaContrasena"
                                    value={formData.nuevaContrasena}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                            
                            <div className="mb-4">
                                <label className="form-label">Confirmar Nueva Contraseña</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    name="confirmarContrasena"
                                    value={formData.confirmarContrasena}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Repite la nueva contraseña"
                                />
                            </div>
                            
                            <div className="d-grid">
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Procesando...' : 'Actualizar Contraseña'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CambiarContrasena;
