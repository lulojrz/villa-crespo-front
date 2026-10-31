import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { NumerosContext } from '../context/NumerosContext';
import { 
    ROLES, 
    ASIGNACIONES, 
    normalizarRol, 
    normalizarAsignacion, 
    esAnciano, 
    puedeAdministrarUsuarios 
} from '../utils/permisos';
import { exportarInformePublicaPDF } from '../utils/exportPublicaPDF';

const AdminUsuarios = () => {
    const { numeros } = useContext(NumerosContext);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [clickAgregar, setClickAgregar] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState(null);
    const [filtroReservas, setFiltroReservas] = useState('todos');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    
    // Form state
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        usuario: '',
        telefono: '',
        contrasena: 'prueba123',
        privilegio: ROLES.PUBLICADOR,
        asignacion: '',
        grupo_servicio: '',
        carrito: false,
        banner: false,
        habilitacionPublica: false
    });
    const [filtroInventario, setFiltroInventario] = useState('todos');

    const api = import.meta.env.VITE_API_URL;

    const loggedInUsername = localStorage.getItem('usuario');
    const loggedInPrivilegio = localStorage.getItem('privilegio');
    const loggedInAsignacion = localStorage.getItem('asignacion');

    const tienePermisoGestion = puedeAdministrarUsuarios(loggedInPrivilegio, loggedInAsignacion) || esAnciano(loggedInPrivilegio);

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

    useEffect(() => {
        cargarUsuarios();
    }, []);

    const cargarUsuarios = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${api}/usuarios`, { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                setUsuarios(data);
                
                const loggedUser = data.find(u => u.usuario === localStorage.getItem('usuario'));
                if (loggedUser && !tienePermisoGestion) {
                    setUsuarioEditando(loggedUser);
                    setFormData({ 
                        nombre: loggedUser.nombre || '', 
                        apellido: loggedUser.apellido || '', 
                        usuario: loggedUser.usuario || '',
                        telefono: loggedUser.telefono || '',
                        contrasena: '',
                        privilegio: normalizarRol(loggedUser.privilegio),
                        asignacion: normalizarAsignacion(loggedUser.asignacion),
                        grupo_servicio: loggedUser.grupo_servicio || loggedUser.grupo || '',
                        carrito: loggedUser.carrito || false,
                        banner: loggedUser.banner || false,
                        habilitacionPublica: loggedUser.habilitacionPublica || false
                    });
                }
            }
        } catch (error) {
            console.error("Error al cargar usuarios:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleAgregar = async (e) => {
        e.preventDefault();
        
        if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.usuario.trim() || !formData.telefono.trim()) {
            Toast.fire({ icon: 'warning', title: 'Por favor, no dejes campos obligatorios en blanco.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${api}/usuarios/crear`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    ...formData,
                    privilegio: normalizarRol(formData.privilegio),
                    asignacion: normalizarAsignacion(formData.asignacion),
                    grupo_servicio: formData.grupo_servicio || '',
                    grupo: formData.grupo_servicio || '',
                    carrito: formData.carrito,
                    banner: formData.banner,
                    habilitacionPublica: formData.habilitacionPublica
                })
            });
            
            if (response.ok) {
                Toast.fire({
                    icon: 'success',
                    title: 'Usuario agregado con éxito'
                });
                setFormData({ nombre: '', apellido: '', usuario: '', telefono: '', contrasena: 'prueba123', privilegio: ROLES.PUBLICADOR, asignacion: '', grupo_servicio: '', carrito: false, banner: false, habilitacionPublica: false });
                setClickAgregar(false);
                cargarUsuarios();
            } else {
                Toast.fire({
                    icon: 'error',
                    title: 'Error al agregar usuario'
                });
            }
        } catch (error) {
            Toast.fire({
                icon: 'error',
                title: 'Error de conexión'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditar = async (e) => {
        e.preventDefault();

        if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.usuario.trim() || !formData.telefono.trim()) {
            Toast.fire({ icon: 'warning', title: 'Por favor, no dejes campos obligatorios en blanco.' });
            return;
        }
        

        setIsSubmitting(true);
        try {
            const response = await fetch(`${api}/usuarios/editar/${usuarioEditando.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    ...usuarioEditando, 
                    ...formData,
                    privilegio: normalizarRol(formData.privilegio),
                    asignacion: normalizarAsignacion(formData.asignacion),
                    grupo_servicio: formData.grupo_servicio || '',
                    grupo: formData.grupo_servicio || '',
                    carrito: formData.carrito,
                    banner: formData.banner,
                    habilitacionPublica: formData.habilitacionPublica
                })
            });
            
            if (response.ok) {
                Toast.fire({
                    icon: 'success',
                    title: 'Usuario editado con éxito'
                });
                
                if (tienePermisoGestion) {
                    setFormData({ nombre: '', apellido: '', usuario: '', telefono: '', contrasena: 'prueba123', privilegio: ROLES.PUBLICADOR, asignacion: '', grupo_servicio: '', carrito: false, banner: false, habilitacionPublica: false });
                    setUsuarioEditando(null);
                }
                cargarUsuarios();
            } else {
                Toast.fire({
                    icon: 'error',
                    title: 'Error al editar usuario'
                });
            }
        } catch (error) {
            Toast.fire({
                icon: 'error',
                title: 'Error de conexión'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const eliminarUsuario = async (id) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "¿Deseas eliminar este usuario? Esta acción no se puede revertir.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#0d6efd',
            cancelButtonColor: '#dc3545',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        setDeletingId(id);
        try {
            const response = await fetch(`${api}/usuarios/borrar/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) {
                Toast.fire({
                    icon: 'success',
                    title: 'Usuario eliminado con éxito'
                });
                cargarUsuarios();
            } else {
                Toast.fire({
                    icon: 'error',
                    title: 'Error al eliminar usuario'
                });
            }
        } catch (error) {
            Toast.fire({
                icon: 'error',
                title: 'Error de conexión'
            });
        } finally {
            setDeletingId(null);
        }
    };

    const abrirFormularioEditar = (user) => {
        setUsuarioEditando(user);
        setFormData({ 
            nombre: user.nombre || '', 
            apellido: user.apellido || '', 
            usuario: user.usuario || '', 
            telefono: user.telefono || '',
            contrasena: '',
            privilegio: normalizarRol(user.privilegio),
            asignacion: normalizarAsignacion(user.asignacion),
            grupo_servicio: user.grupo_servicio || user.grupo || '',
            carrito: user.carrito || false,
            banner: user.banner || false,
            habilitacionPublica: user.habilitacionPublica || false
        });
        setClickAgregar(false);
    };

    const cancelarEdicion = () => {
        setUsuarioEditando(null);
        setFormData({ nombre: '', apellido: '', usuario: '', telefono: '', contrasena: 'prueba123', privilegio: ROLES.PUBLICADOR, asignacion: '', grupo_servicio: '', carrito: false, banner: false, habilitacionPublica: false });
    };

    const renderBadgeRol = (rol) => {
        const r = normalizarRol(rol);
        switch (r) {
            case ROLES.ANCIANO:
                return <span className="badge bg-primary">ANCIANO</span>;
            case ROLES.SIERVO_MINISTERIAL:
                return <span className="badge bg-info text-dark">SIERVO_MINISTERIAL</span>;
            case ROLES.PRECURSOR_REGULAR:
                return <span className="badge bg-warning text-dark">PRECURSOR_REGULAR</span>;
            case ROLES.PUBLICADOR:
            default:
                return <span className="badge bg-secondary">PUBLICADOR</span>;
        }
    };

    const renderBadgeAsignacion = (asig) => {
        const a = normalizarAsignacion(asig);
        switch (a) {
            case ASIGNACIONES.SOPORTE:
                return <span className="badge bg-danger">Soporte (Todo)</span>;
            case ASIGNACIONES.SERVICIO:
                return <span className="badge bg-success">Servicio (Todo)</span>;
            case ASIGNACIONES.TERRITORIOS:
                return <span className="badge bg-warning text-dark">Territorios</span>;
            case ASIGNACIONES.PUBLICA:
                return <span className="badge bg-info text-dark">Pública</span>;
            default:
                return <span className="text-muted small fst-italic">Ninguna</span>;
        }
    };

    const usuariosFiltrados = usuarios.filter(u => {
        if (filtroInventario === 'conCarrito' && !u.carrito) return false;
        if (filtroInventario === 'conBanner' && !u.banner) return false;

        if (filtroReservas === 'todos') return true;
        
        const tieneReservas = numeros.some(n => n.reservado === true && n.reservadoA?.usuario === u.usuario);
        
        if (filtroReservas === 'conReservas') return tieneReservas;
        if (filtroReservas === 'sinReservas') return !tieneReservas;
        return true;
    });

    return (
        <div className='container my-5'>
            <div className='card shadow-lg p-4'>
                <div className="d-flex justify-content-between align-items-center flex-wrap mb-4">
                    <h1 className="h2 mb-2 mb-md-0">{!tienePermisoGestion ? 'Mi Perfil' : 'Gestión de Usuarios'}</h1>
                    <Link to="/admin" className='btn btn-secondary'>
                        Volver al Panel
                    </Link>
                </div>

                {tienePermisoGestion && (
                    <div className='container-buttons d-grid gap-3 d-md-flex mt-3 mb-4'>
                        <button
                            className={`btn flex-fill fw-semibold ${!clickAgregar && !usuarioEditando ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => { setClickAgregar(false); setUsuarioEditando(null); setFormData({ nombre: '', apellido: '', usuario: '', telefono: '', contrasena: 'prueba123', privilegio: ROLES.PUBLICADOR, asignacion: '', grupo_servicio: '', carrito: false, banner: false, habilitacionPublica: false }); }}
                        >
                            Lista de Usuarios
                        </button>
                        <button
                            className={`btn flex-fill fw-semibold ${clickAgregar && !usuarioEditando ? 'btn-success' : 'btn-outline-success'}`}
                            onClick={() => { setClickAgregar(true); setUsuarioEditando(null); setFormData({ nombre: '', apellido: '', usuario: '', telefono: '', contrasena: 'prueba123', privilegio: ROLES.PUBLICADOR, asignacion: '', grupo_servicio: '', carrito: false, banner: false, habilitacionPublica: false }); }}
                        >
                            Agregar Nuevo
                        </button>
                    </div>
                )}

                {tienePermisoGestion && <hr />}

                {loading ? (
                    <div className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Cargando...</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {(!clickAgregar && !usuarioEditando && tienePermisoGestion) && (
                            <div className="mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
                                    <h4 className="mb-0">Lista de Usuarios</h4>
                                    <div className="mt-2 mt-md-0 d-flex flex-column flex-sm-row align-items-start align-items-sm-center flex-wrap gap-2 w-100 w-md-auto">
                                        <div className="w-100 w-sm-auto">
                                            <label className="me-2 fw-semibold text-muted small d-block d-sm-inline">Reservas:</label>
                                            <select 
                                                className="form-select form-select-sm w-100 w-sm-auto d-inline-block" 
                                                value={filtroReservas}
                                                onChange={(e) => setFiltroReservas(e.target.value)}
                                            >
                                                <option value="todos">Todos</option>
                                                <option value="conReservas">Con reservas</option>
                                                <option value="sinReservas">Sin reservas</option>
                                            </select>
                                        </div>
                                        <div className="w-100 w-sm-auto mt-2 mt-sm-0">
                                            <label className="me-2 fw-semibold text-muted small d-block d-sm-inline">Inventario:</label>
                                            <select 
                                                className="form-select form-select-sm w-100 w-sm-auto d-inline-block" 
                                                value={filtroInventario}
                                                onChange={(e) => setFiltroInventario(e.target.value)}
                                            >
                                                <option value="todos">Todos</option>
                                                <option value="conCarrito">Con Carrito 🛒</option>
                                                <option value="conBanner">Con Banner 🏳️</option>
                                            </select>
                                        </div>
                                        <div className="w-100 w-sm-auto mt-2 mt-sm-0">
                                            <button 
                                                type="button"
                                                className="btn btn-sm btn-outline-danger fw-semibold w-100 w-sm-auto"
                                                onClick={() => exportarInformePublicaPDF(api)}
                                                title="Descargar informe PDF de hermanos aptos para pública y puntos trabajados"
                                            >
                                                <i className="bi bi-file-earmark-pdf-fill me-1"></i> PDF Aptos Pública
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Vista Desktop */}
                                <div className="table-responsive shadow-sm rounded d-none d-md-block">
                                    <table className="table table-hover table-striped align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="text-body-secondary fw-semibold">ID</th>
                                                <th className="text-body-secondary fw-semibold">Nombre</th>
                                                <th className="text-body-secondary fw-semibold">Apellido</th>
                                                <th className="text-body-secondary fw-semibold">Usuario</th>
                                                <th className="text-body-secondary fw-semibold">Teléfono</th>
                                                <th className="text-body-secondary fw-semibold text-center">Inv.</th>
                                                <th className="text-body-secondary fw-semibold">Rol</th>
                                                <th className="text-body-secondary fw-semibold">Asignación</th>
                                                <th className="text-body-secondary fw-semibold">Grupo</th>
                                                <th className="text-body-secondary fw-semibold text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usuariosFiltrados.map(u => {
                                                const tieneNumero = u.telefono && u.telefono.trim() !== "";
                                                const numLimpiado = tieneNumero ? u.telefono.replace(/\D/g, '') : '';
                                                return (
                                                <tr key={u.id}>
                                                    <td className="fw-bold">{u.id}</td>
                                                    <td>{u.nombre}</td>
                                                    <td>{u.apellido}</td>
                                                    <td>{u.usuario}</td>
                                                    <td>
                                                        {tieneNumero ? (
                                                            <a 
                                                                href={`https://wa.me/${numLimpiado}?text=${encodeURIComponent(`Hola ${u.nombre}, `)}`}
                                                                target="_blank" rel="noopener noreferrer"
                                                                className="btn btn-sm btn-success rounded-pill fw-semibold shadow-sm px-2 py-0"
                                                                title={u.telefono}
                                                            >
                                                                <i className="bi bi-whatsapp"></i>
                                                            </a>
                                                        ) : (
                                                            <span className="text-muted small fst-italic">Sin tel</span>
                                                        )}
                                                    </td>
                                                    <td className="text-center">
                                                        {u.carrito && <span title="Tiene Carrito" className="me-1">🛒</span>}
                                                        {u.banner && <span title="Tiene Banner">🏳️</span>}
                                                    </td>
                                                    <td>{renderBadgeRol(u.privilegio)}</td>
                                                    <td>{renderBadgeAsignacion(u.asignacion)}</td>
                                                    <td>{(u.grupo_servicio || u.grupo) ? <span className="badge border border-primary text-primary">{u.grupo_servicio || u.grupo}</span> : <span className="text-muted small">-</span>}</td>
                                                    <td className="text-center">
                                                        <button className="btn btn-sm btn-primary me-2" onClick={() => abrirFormularioEditar(u)}>
                                                            <i className="bi bi-pencil"></i> Editar
                                                        </button>
                                                        {tienePermisoGestion && u.usuario !== loggedInUsername && (
                                                            <button className="btn btn-sm btn-danger" onClick={() => eliminarUsuario(u.id)} disabled={deletingId === u.id}>
                                                                {deletingId === u.id ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-trash"></i>}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                                );
                                            })}
                                            {usuariosFiltrados.length === 0 && (
                                                <tr>
                                                    <td colSpan="10" className="text-center py-4 text-muted">No se encontraron usuarios.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Vista Mobile */}
                                <div className="d-md-none">
                                    {usuariosFiltrados.map(u => {
                                        const tieneNumero = u.telefono && u.telefono.trim() !== "";
                                        const numLimpiado = tieneNumero ? u.telefono.replace(/\D/g, '') : '';
                                        return (
                                        <div key={u.id} className="card shadow-sm mb-3">
                                            <div className="card-body">
                                                <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
                                                    <h5 className="card-title mb-0 text-primary fw-bold text-break" style={{maxWidth: '100%'}}>{u.usuario}</h5>
                                                    <div className="d-flex flex-wrap gap-1">
                                                        {renderBadgeRol(u.privilegio)}
                                                        {renderBadgeAsignacion(u.asignacion)}
                                                        {(u.grupo_servicio || u.grupo) && <span className="badge border border-primary text-primary">{u.grupo_servicio || u.grupo}</span>}
                                                    </div>
                                                </div>
                                                <p className="card-text mb-1 text-muted small">
                                                    <strong>Nombre:</strong> {u.nombre} {u.apellido}
                                                </p>
                                                <div className="d-flex justify-content-between align-items-center mb-3">
                                                    <p className="card-text mb-0 text-muted small">
                                                        <strong>ID:</strong> {u.id} {u.carrito && '🛒'} {u.banner && '🏳️'}
                                                    </p>
                                                    {tieneNumero && (
                                                        <a 
                                                            href={`https://wa.me/${numLimpiado}?text=${encodeURIComponent(`Hola ${u.nombre}, `)}`}
                                                            target="_blank" rel="noopener noreferrer"
                                                            className="btn btn-sm btn-success rounded-pill fw-semibold shadow-sm px-2 py-0"
                                                            title={u.telefono}
                                                        >
                                                            <i className="bi bi-whatsapp"></i> Wpp
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="d-flex gap-2">
                                                    <button className="btn btn-outline-primary btn-sm flex-fill fw-semibold" onClick={() => abrirFormularioEditar(u)}>
                                                        <i className="bi bi-pencil"></i> Editar
                                                    </button>
                                                    {tienePermisoGestion && u.usuario !== loggedInUsername && (
                                                        <button className="btn btn-outline-danger btn-sm flex-fill fw-semibold" onClick={() => eliminarUsuario(u.id)} disabled={deletingId === u.id}>
                                                            {deletingId === u.id ? <><span className="spinner-border spinner-border-sm me-1"></span> Borrando...</> : <><i className="bi bi-trash"></i> Eliminar</>}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })}
                                    {usuariosFiltrados.length === 0 && (
                                        <div className="text-center py-4 text-muted border rounded shadow-sm bg-body">
                                            No se encontraron usuarios.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {(clickAgregar || usuarioEditando) && (
                            <form onSubmit={usuarioEditando ? handleEditar : handleAgregar} className="mt-4">
                                <h4 className="mb-3">{usuarioEditando ? (tienePermisoGestion ? 'Editar Usuario' : 'Editar Mi Perfil') : 'Nuevo Usuario'}</h4>
                                <div className="mb-3">
                                    <label className="form-label">Nombre</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="nombre"
                                        value={formData.nombre}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Apellido</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="apellido"
                                        value={formData.apellido}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Usuario</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="usuario"
                                        value={formData.usuario}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Teléfono</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="telefono"
                                        placeholder="Ej: 1139562904"
                                        value={formData.telefono}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Contraseña</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        name="contrasena"
                                        value={formData.contrasena}
                                        onChange={handleInputChange}
                                        required={!usuarioEditando}
                                        placeholder={usuarioEditando ? 'Dejar en blanco para no cambiar' : ''}
                                        disabled
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Rol</label>
                                    <select
                                        className="form-select"
                                        name="privilegio"
                                        value={normalizarRol(formData.privilegio)}
                                        onChange={handleInputChange}
                                        required
                                        disabled={!tienePermisoGestion}
                                    >
                                        <option value="ANCIANO">ANCIANO</option>
                                        <option value="SIERVO_MINISTERIAL">SIERVO_MINISTERIAL</option>
                                        <option value="PRECURSOR_REGULAR">PRECURSOR_REGULAR</option>
                                        <option value="PUBLICADOR">PUBLICADOR</option>
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Asignación</label>
                                    <select
                                        className="form-select"
                                        name="asignacion"
                                        value={normalizarAsignacion(formData.asignacion)}
                                        onChange={handleInputChange}
                                        disabled={!tienePermisoGestion}
                                    >
                                        <option value="">Ninguna</option>
                                        <option value="soporte">soporte (Administra Todo)</option>
                                        <option value="servicio">servicio (Administra Todo)</option>
                                        <option value="territorios">territorios (Telefónica y Edificios)</option>
                                        <option value="publica">publica (Solo Predicación Pública)</option>
                                    </select>
                                    <div className="form-text small text-muted">
                                        Solo los <strong>ANCIANO</strong> y <strong>SIERVO_MINISTERIAL</strong> con asignación tendrán permisos en administración.
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Grupo de Servicio</label>
                                    <select
                                        className="form-select"
                                        name="grupo_servicio"
                                        value={formData.grupo_servicio}
                                        onChange={handleInputChange}
                                        disabled={!tienePermisoGestion}
                                    >
                                        <option value="">Ninguno</option>
                                        <option value="Grupo 1">Grupo 1</option>
                                        <option value="Grupo 2">Grupo 2</option>
                                        <option value="Grupo 3">Grupo 3</option>
                                        <option value="Grupo 4">Grupo 4</option>
                                        <option value="Grupo 5">Grupo 5</option>
                                    </select>
                                </div>
                                <div className="mb-4 d-flex gap-4">
                                    <div className="form-check form-switch">
                                        <input className="form-check-input" type="checkbox" name="carrito" id="checkCarrito" checked={formData.carrito} onChange={(e) => setFormData({...formData, carrito: e.target.checked})} />
                                        <label className="form-check-label" htmlFor="checkCarrito">Tiene Carrito 🛒</label>
                                    </div>
                                    <div className="form-check form-switch">
                                        <input className="form-check-input" type="checkbox" name="banner" id="checkBanner" checked={formData.banner} onChange={(e) => setFormData({...formData, banner: e.target.checked})} />
                                        <label className="form-check-label" htmlFor="checkBanner">Tiene Banner 🏳️</label>
                                    </div>
                                    <div className="form-check form-switch">
                                        <input 
                                            className="form-check-input border-primary" 
                                            type="checkbox" 
                                            name="habilitacionPublica" 
                                            id="checkHabilitacion" 
                                            checked={formData.habilitacionPublica} 
                                            onChange={(e) => setFormData({...formData, habilitacionPublica: e.target.checked})} 
                                            disabled={!tienePermisoGestion}
                                        />
                                        <label className="form-check-label fw-semibold text-primary" htmlFor="checkHabilitacion">Apto Pública 🌟</label>
                                    </div>
                                </div>
                                <div className="d-flex gap-2">
                                    <button type="submit" className={`btn ${usuarioEditando ? 'btn-primary' : 'btn-success'}`} disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <><span className="spinner-border spinner-border-sm me-2"></span> Cargando...</>
                                        ) : (
                                            usuarioEditando ? 'Guardar Cambios' : 'Agregar Usuario'
                                        )}
                                    </button>
                                    {usuarioEditando && tienePermisoGestion && (
                                        <button type="button" className="btn btn-secondary" onClick={cancelarEdicion}>
                                            Cancelar
                                        </button>
                                    )}
                                </div>
                            </form>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminUsuarios;
