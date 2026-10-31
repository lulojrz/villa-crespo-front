import React, { useContext, useState } from 'react';
import { NumerosContext } from '../context/NumerosContext';

const MisReservas = ({ hideEmpty = false }) => {
    const { numeros, actualizarNumero } = useContext(NumerosContext);
    const loggedInUsername = localStorage.getItem('usuario');
    const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
    const [mostrarModal, setMostrarModal] = useState(false);

    const misReservas = numeros.filter(n => {
        return n.reservado === true && n.reservadoA?.usuario === loggedInUsername;
    });

    const getResultadoBadge = (reserva) => {
        if (!reserva.ultimaFecha) return <span className="badge bg-secondary">Sin llamar</span>;
        if (reserva.tocar === false) return <span className="badge bg-danger">Fuera de Servicio</span>;
        if (reserva.contesta === true) return <span className="badge bg-success">Contesta</span>;
        if (reserva.contesta === false) return <span className="badge bg-warning text-body">No Contesta</span>;
        return <span className="badge bg-secondary">Sin estado</span>;
    };

    const formatearFecha = (fechaStr) => {
        if (!fechaStr) return '-';
        const soloFecha = fechaStr.split('T')[0];
        const partes = soloFecha.split('-');
        return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : soloFecha;
    };

    const handleResultado = (reserva, tipo) => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        const fechaStr = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        const ultUsuario = loggedInUsername ? { usuario: loggedInUsername } : null;

        let obj = {
            ...reserva,
            ultimaFecha: fechaStr,
            ultUsuario: ultUsuario
        };

        if (tipo === 'contesta') {
            obj.contesta = true;
        } else if (tipo === 'noContesta') {
            obj.contesta = false;
        } else if (tipo === 'fueraServicio') {
            obj.tocar = false;
        }

        actualizarNumero(obj);
        setMostrarModal(false);
        setReservaSeleccionada(null);
    };

    const abrirModal = (reserva) => {
        setReservaSeleccionada(reserva);
        setMostrarModal(true);
    };

    if (hideEmpty && misReservas.length === 0) {
        return null;
    }

    return (
        <div className="mt-4">
            <h3 className="mb-4 text-primary">Mis Números Reservados</h3>
            {misReservas.length === 0 ? (
                <p className="text-muted">No tienes números reservados actualmente.</p>
            ) : (
                <>
                    {/* Vista Desktop (Tabla) */}
                    <div className="table-responsive shadow-sm rounded d-none d-md-block">
                        <table className="table table-hover table-striped align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="text-body-secondary fw-semibold">Número</th>
                                    <th className="text-body-secondary fw-semibold">Dirección</th>
                                    <th className="text-body-secondary fw-semibold">Edificio</th>
                                    <th className="text-body-secondary fw-semibold">Territorio</th>
                                    <th className="text-body-secondary fw-semibold">Último Llamado</th>
                                    <th className="text-body-secondary fw-semibold">Resultado</th>
                                    <th className="text-body-secondary fw-semibold text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {misReservas.map(reserva => (
                                    <tr key={reserva.id}>
                                        <td className="fw-bold text-nowrap">{reserva.numero}</td>
                                        <td>{reserva.direccion}</td>
                                        <td>{reserva.edificio || '-'}</td>
                                        <td>{reserva.territorio}</td>
                                        <td>{formatearFecha(reserva.ultimaFecha)}</td>
                                        <td>{getResultadoBadge(reserva)}</td>
                                        <td className="text-center">
                                            <button className="btn btn-primary btn-sm" onClick={() => abrirModal(reserva)}>
                                                <i className="bi bi-telephone"></i> Llamar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Vista Mobile (Tarjetas) */}
                    <div className="d-md-none">
                        {misReservas.map(reserva => (
                            <div key={reserva.id} className="card shadow-sm mb-3 border-0 rounded-3">
                                <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h5 className="card-title text-primary fw-bold mb-0">{reserva.numero}</h5>
                                        <span className="badge bg-body-tertiary text-body border">Terr: {reserva.territorio}</span>
                                    </div>
                                    <p className="card-text mb-1 text-muted small">
                                        <strong>Dirección:</strong> {reserva.direccion}
                                    </p>
                                    <p className="card-text mb-1 text-muted small">
                                        <strong>Edificio:</strong> {reserva.edificio || '-'}
                                    </p>
                                    <div className="d-flex justify-content-between align-items-center mb-3 text-muted small">
                                        <span><strong>Llamado:</strong> {formatearFecha(reserva.ultimaFecha)}</span>
                                        <span>{getResultadoBadge(reserva)}</span>
                                    </div>
                                    <button className="btn btn-primary btn-sm w-100 fw-semibold" onClick={() => abrirModal(reserva)}>
                                        <i className="bi bi-telephone"></i> Llamar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {mostrarModal && reservaSeleccionada && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title text-primary fw-bold">Registrar Llamada</h5>
                                <button type="button" className="btn-close" onClick={() => setMostrarModal(false)}></button>
                            </div>
                            <div className="modal-body text-center px-3 px-md-4">
                                <h2 className="display-6 fw-bold mb-3 text-body">{reservaSeleccionada.numero}</h2>
                                <hr className="my-3" style={{ opacity: 0.1 }} />
                                <div className="text-start ps-md-4">
                                    <p className="mb-2" style={{ fontSize: '1.1rem' }}>
                                        <span className="text-muted fw-semibold me-2">Dirección:</span> 
                                        {reservaSeleccionada.direccion}
                                    </p>
                                    <p className="mb-2" style={{ fontSize: '1.1rem' }}>
                                        <span className="text-muted fw-semibold me-2">Edificio:</span> 
                                        {reservaSeleccionada.edificio || '-'}
                                    </p>
                                    <p className="mb-2" style={{ fontSize: '1.1rem' }}>
                                        <span className="text-muted fw-semibold me-2">Territorio:</span> 
                                        {reservaSeleccionada.territorio}
                                    </p>
                                </div>
                            </div>
                            <div className="modal-footer justify-content-center border-top-0 pt-0 pb-4 px-3 px-md-4">
                                <div className="d-grid gap-2 w-100">
                                    <button className="btn btn-success py-2 fw-semibold shadow-sm" onClick={() => handleResultado(reservaSeleccionada, 'contesta')}>
                                        Contesta
                                    </button>
                                    <button className="btn btn-warning py-2 fw-semibold text-body shadow-sm" onClick={() => handleResultado(reservaSeleccionada, 'noContesta')}>
                                        No Contesta
                                    </button>
                                    <button className="btn btn-danger py-2 fw-semibold shadow-sm" onClick={() => handleResultado(reservaSeleccionada, 'fueraServicio')}>
                                        Fuera de Servicio / No tocar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MisReservas;
