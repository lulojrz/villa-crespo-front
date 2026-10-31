import React, { useState, useContext, useEffect } from 'react';
import { NumerosContext } from '../context/NumerosContext';
import FormularioEditar from './FormularioEditar';
import Swal from 'sweetalert2';

const ListaNumeros = () => {
    const {
        numeros,
        eliminarNumero,
        seleccionado,
        setSeleccionado,
        productosFiltrados,
        busqueda,
        setBusqueda,
        filtroTerritorio,
        setFiltroTerritorio,
        filtroEdificio,
        setFiltroEdificio,
        filtroReservado,
        setFiltroReservado,
        actualizarReserva,
        sacarReservados,
        reiniciarContesta,
        filtroFechaDesde,
        setFiltroFechaDesde,
        filtroFechaHasta,
        setFiltroFechaHasta,
        loading // <-- Extraemos 'loading' que viene del contexto de números
    } = useContext(NumerosContext);
    
    const [mostrarModal, setMostrarModal] = useState(false);
    const [usuariosLista, setUsuariosLista] = useState([]);
    const [usuarioElegido, setUsuarioElegido] = useState("");

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const itemsPorPagina = 50;

    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda, filtroTerritorio, filtroEdificio, filtroReservado, filtroFechaDesde, filtroFechaHasta]);

    useEffect(() => {
        const fetchUsuarios = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/usuarios`, {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    setUsuariosLista(data);
                }
            } catch (error) {}
        };
        fetchUsuarios();
    }, []);

    const handleConfirmarReserva = () => {
        if (!usuarioElegido) {
            alert("Por favor seleccione un usuario.");
            return;
        }
        const usuarioObj = usuariosLista.find(u => u.usuario === usuarioElegido) || { usuario: usuarioElegido };
        actualizarReserva(productosFiltrados, usuarioObj);
        setMostrarModal(false);
        setUsuarioElegido("");
    };

    const numeroSeleccionado = numeros.find((num) => num.id === seleccionado);

    const territoriosUnicos = [...new Set(numeros.map(n => n.territorio).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
    const edificiosUnicos = [...new Set(numeros.map(n => n.edificio).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));

    const handleCancelarEdicion = () => {
        setSeleccionado(null);
    };

    const hayFiltrosActivos = busqueda.trim() !== "" || filtroTerritorio !== "" || filtroEdificio !== "" || filtroReservado !== "" || filtroFechaDesde !== "" || filtroFechaHasta !== "";
    const puedeModificarBloque = hayFiltrosActivos && productosFiltrados && productosFiltrados.length > 0;

    const totalPaginas = Math.ceil((productosFiltrados?.length || 0) / itemsPorPagina);
    const indiceUltimoItem = paginaActual * itemsPorPagina;
    const indicePrimerItem = indiceUltimoItem - itemsPorPagina;
    const itemsActuales = productosFiltrados ? productosFiltrados.slice(indicePrimerItem, indiceUltimoItem) : [];

    const handleReiniciarContesta = async () => {
        const result = await Swal.fire({
            title: '¿Reiniciar llamadas?',
            text: `Esto marcará a los ${productosFiltrados.length} números filtrados como "No contesta". ¿Deseas continuar?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#0d6efd',
            cancelButtonColor: '#dc3545',
            confirmButtonText: 'Sí, reiniciar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            reiniciarContesta(productosFiltrados);
        }
    };

    return (
        <>
            <form className="mb-4" onSubmit={(e) => e.preventDefault()}>
                <div className="card shadow-sm p-3 border-0 bg-body-tertiary" style={{ borderRadius: '0.75rem' }}>
                    <h6 className="mb-3 text-body-secondary fw-bold">Filtros de Búsqueda</h6>
                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label text-muted small fw-semibold mb-1">Dirección</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Buscar calle..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label text-muted small fw-semibold mb-1">Territorio</label>
                            <select
                                className="form-select form-select-sm"
                                value={filtroTerritorio}
                                onChange={(e) => setFiltroTerritorio(e.target.value)}
                            >
                                <option value="">Todos</option>
                                {territoriosUnicos.map((t, idx) => (
                                    <option key={idx} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label text-muted small fw-semibold mb-1">Edificio</label>
                            <select
                                className="form-select form-select-sm"
                                value={filtroEdificio}
                                onChange={(e) => setFiltroEdificio(e.target.value)}
                            >
                                <option value="">Todas</option>
                                {edificiosUnicos.map((m, idx) => (
                                    <option key={idx} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label text-muted small fw-semibold mb-1">Estado</label>
                            <select
                                className="form-select form-select-sm"
                                value={filtroReservado}
                                onChange={(e) => setFiltroReservado(e.target.value)}
                            >
                                <option value="">Todos</option>
                                <option value="si">Reservados</option>
                                <option value="no">Disponibles</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label text-muted small fw-semibold mb-1">Fecha Desde</label>
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={filtroFechaDesde}
                                onChange={(e) => setFiltroFechaDesde(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label text-muted small fw-semibold mb-1">Fecha Hasta</label>
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={filtroFechaHasta}
                                onChange={(e) => setFiltroFechaHasta(e.target.value)}
                            />
                        </div>

                        <div className="col-12 mt-3 pt-3 border-top">
                            <div className="d-flex flex-wrap gap-2 justify-content-end">
                                <button type="button" className="btn btn-outline-secondary btn-sm px-3" onClick={() => {
                                    setBusqueda(""); setFiltroTerritorio(""); setFiltroEdificio(""); setFiltroReservado(""); setFiltroFechaDesde(""); setFiltroFechaHasta("");
                                }}>
                                    Limpiar Filtros
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-success btn-sm px-3 shadow-sm" 
                                    onClick={() => setMostrarModal(true)}
                                    disabled={!puedeModificarBloque}
                                    title={!puedeModificarBloque ? "Debes aplicar al menos un filtro para reservar" : ""}
                                >
                                    Reservar Filtrados
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-danger btn-sm px-3 shadow-sm" 
                                    onClick={() => sacarReservados(productosFiltrados)}
                                    disabled={!puedeModificarBloque}
                                    title={!puedeModificarBloque ? "Debes aplicar al menos un filtro para liberar" : ""}
                                >
                                    Liberar Filtrados
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-warning btn-sm px-3 shadow-sm text-body" 
                                    onClick={handleReiniciarContesta}
                                    disabled={!puedeModificarBloque}
                                    title={!puedeModificarBloque ? "Debes aplicar al menos un filtro para reiniciar" : ""}
                                >
                                    Reiniciar Contesta
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            <div>
                <div className="container mt-4">
                    <h2 className="mb-4 text-center text-primary fw-bold">Lista de Números</h2>

                    {/* Vista Desktop */}
                    <div className="table-responsive shadow-sm rounded d-none d-md-block">
                        <table className="table table-hover table-striped align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th scope="col" className="text-body-secondary fw-semibold">Número</th>
                                    <th scope="col" className="text-body-secondary fw-semibold">Dirección</th>
                                    <th scope="col" className="text-body-secondary fw-semibold">Territorio</th>
                                    <th scope="col" className="text-body-secondary fw-semibold">Edificio</th>
                                    <th scope="col" className="text-body-secondary fw-semibold">Contesta</th>
                                    <th scope="col" className="text-body-secondary fw-semibold">Última Fecha (Y-MM-DD)</th>
                                    <th scope="col" className="text-body-secondary fw-semibold">Último Usuario</th>
                                    <th scope="col" className="text-body-secondary fw-semibold">Reservado</th>
                                    <th scope="col" className="text-body-secondary fw-semibold">Reservado A</th>
                                    <th scope="col" className="text-body-secondary fw-semibold">Fecha Reserva</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    // 1. Muestra filas fantasma simulando las 9 columnas en desktop
                                    [1, 2, 3, 4, 5].map((n) => (
                                        <tr key={n}>
                                            <td><div className="skeleton skeleton-text w-75 my-1"></div></td>
                                            <td><div className="skeleton skeleton-text w-100 my-1"></div></td>
                                            <td><div className="skeleton skeleton-text w-50 my-1"></div></td>
                                            <td><div className="skeleton skeleton-text w-50 my-1"></div></td>
                                            <td><div className="skeleton skeleton-text w-50 my-1"></div></td>
                                            <td><div className="skeleton skeleton-text w-75 my-1"></div></td>
                                            <td><div className="skeleton skeleton-text w-60 my-1"></div></td>
                                            <td><div className="skeleton skeleton-text w-50 my-1"></div></td>
                                            <td><div className="skeleton skeleton-text w-60 my-1"></div></td>
                                            <td><div className="skeleton skeleton-text w-60 my-1"></div></td>
                                        </tr>
                                    ))
                                ) : itemsActuales && itemsActuales.length > 0 ? (
                                    itemsActuales.map((num) => (
                                        <tr key={num.id}>
                                            <td className="fw-bold text-nowrap">{num.numero}</td>
                                            <td>{num.direccion}</td>
                                            <td>{num.territorio}</td>
                                            <td>{num.edificio}</td>
                                            <td>
                                                {num.contesta ?
                                                    <span className="badge bg-success">Sí</span> :
                                                    <span className="badge bg-secondary">No</span>
                                                }
                                            </td>
                                            <td className="text-muted">{num.ultimaFecha ? num.ultimaFecha.slice(0, 10) : '-'}</td>
                                            <td className="text-muted fw-semibold">
                                                {num.ultUsuario ? (num.ultUsuario.usuario || 'Sí') : '-'}
                                            </td>
                                            <td>
                                                {num.reservado ? <span className="badge bg-success">Sí</span> : <span className="badge bg-secondary">No</span>}
                                            </td>
                                            <td className="text-muted fw-semibold">{num.reservadoA?.usuario || '-'}</td>
                                            <td className="text-muted">{num.fechaReserva ? num.fechaReserva.slice(0, 10) : '-'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="10" className="text-center py-4 text-muted">
                                            No se encontraron números disponibles.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Vista Mobile */}
                    <div className="d-md-none">
                        {loading ? (
                            // 2. Muestra 3 tarjetas fantasma con el alto correspondiente en mobile
                            [1, 2, 3].map((n) => (
                                <div key={n} className="card shadow-sm mb-3 border-0 rounded-3" style={{ minHeight: '160px' }}>
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <div className="skeleton skeleton-title w-50 mb-0"></div>
                                            <div className="skeleton skeleton-text w-25 mb-0"></div>
                                        </div>
                                        <div className="skeleton skeleton-text w-100 mb-2"></div>
                                        <div className="skeleton skeleton-text w-75 mb-2"></div>
                                        <div className="skeleton skeleton-text w-50 mb-0"></div>
                                    </div>
                                </div>
                            ))
                        ) : itemsActuales && itemsActuales.length > 0 ? (
                            itemsActuales.map((num) => (
                                <div key={num.id} className="card shadow-sm mb-3 border-0 rounded-3">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <h5 className="card-title text-primary fw-bold mb-0">{num.numero}</h5>
                                            <span className="badge bg-body-tertiary text-body border">Terr: {num.territorio}</span>
                                        </div>
                                        <p className="card-text mb-2 text-muted small">
                                            <strong>Dirección:</strong> {num.direccion}
                                        </p>
                                        <div className="d-flex justify-content-between mb-2 text-muted small">
                                            <span><strong>Últ. Usr:</strong> {num.ultUsuario ? (num.ultUsuario.usuario || 'Sí') : '-'}</span>
                                            <span><strong>Contesta:</strong> {num.contesta ? <span className="badge bg-success">Sí</span> : <span className="badge bg-secondary">No</span>}</span>
                                        </div>
                                        <div className="d-flex justify-content-between mb-2 text-muted small">
                                            <span><strong>Últ. Fecha:</strong> {num.ultimaFecha ? num.ultimaFecha.slice(0, 10) : '-'}</span>
                                            <span><strong>Res:</strong> {num.reservado ? <span className="badge bg-success">Sí</span> : <span className="badge bg-secondary">No</span>}</span>
                                        </div>
                                        <div className="d-flex justify-content-between mb-0 text-muted small">
                                            <span><strong>Reservado A:</strong> {num.reservadoA?.usuario || '-'}</span>
                                            <span><strong>Fecha Res:</strong> {num.fechaReserva ? num.fechaReserva.slice(0, 10) : '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4 text-muted border rounded shadow-sm bg-body">
                                No se encontraron números disponibles.
                            </div>
                        )}
                    </div>
                </div>

                {/* Paginación */}
                {!loading && totalPaginas > 1 && (
                    <nav className="d-flex justify-content-center mt-4">
                        <ul className="pagination pagination-sm shadow-sm">
                            <li className={`page-item ${paginaActual === 1 ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => setPaginaActual(paginaActual - 1)}>Anterior</button>
                            </li>
                            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                                let startPage = Math.max(1, paginaActual - 2);
                                if (startPage + 4 > totalPaginas) {
                                    startPage = Math.max(1, totalPaginas - 4);
                                }
                                const pageNum = startPage + i;
                                return (
                                    <li key={pageNum} className={`page-item ${paginaActual === pageNum ? 'active' : ''}`}>
                                        <button className="page-link" onClick={() => setPaginaActual(pageNum)}>{pageNum}</button>
                                    </li>
                                );
                            })}
                            <li className={`page-item ${paginaActual === totalPaginas ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => setPaginaActual(paginaActual + 1)}>Siguiente</button>
                            </li>
                        </ul>
                    </nav>
                )}

                {numeroSeleccionado && (
                    <FormularioEditar
                        handleCancelarEdicion={handleCancelarEdicion}
                        numero={numeroSeleccionado}
                    />
                )}
            </div>
            
            {/* Modal para agregar */}
            {mostrarModal && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Reservar Números</h5>
                                <button type="button" className="btn-close" onClick={() => setMostrarModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p>Seleccione el usuario para reservar los números filtrados ({productosFiltrados ? productosFiltrados.length : 0}):</p>
                                <select className="form-select" value={usuarioElegido} onChange={(e) => setUsuarioElegido(e.target.value)}>
                                    <option value="">-- Seleccionar Usuario --</option>
                                    {usuariosLista.map((u) => (
                                        <option key={u.id || u.usuario} value={u.usuario}>{u.usuario}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setMostrarModal(false)}>Cancelar</button>
                                <button type="button" className="btn btn-primary" onClick={handleConfirmarReserva}>Confirmar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
export default ListaNumeros;
