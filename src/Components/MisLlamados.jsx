import React, { useContext } from 'react';
import { NumerosContext } from '../context/NumerosContext';

const MisLlamados = () => {
    const { numeros } = useContext(NumerosContext);
    const loggedInUsername = localStorage.getItem('usuario');

    const misLlamados = numeros
        .filter(n => {
            const usuario = n.ultUsuario;
            const nombreUsuario = typeof usuario === 'string' ? usuario : usuario?.usuario;
            return nombreUsuario === loggedInUsername;
        })
        .sort((a, b) => new Date(b.ultimaFecha || 0) - new Date(a.ultimaFecha || 0));

    return (
        <div className="mt-4">
            <h3 className="mb-4">Mis Llamados Recientes</h3>
            {misLlamados.length === 0 ? (
                <p className="text-muted">No has realizado llamados aún.</p>
            ) : (
                <>
                    {/* Vista Desktop (Tabla) */}
                    <div className="table-responsive d-none d-md-block">
                        <table className="table table-hover">
                            <thead>
                                <tr>
                                    <th>Número</th>
                                    <th>Dirección</th>
                                    <th>Fecha</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {misLlamados.map(llamado => (
                                    <tr key={llamado.id}>
                                        <td>{llamado.numero}</td>
                                        <td>{llamado.direccion}</td>
                                        <td>
                                            {llamado.ultimaFecha 
                                                ? (() => {
                                                    const fechaStr = llamado.ultimaFecha.split('T')[0];
                                                    const partes = fechaStr.split('-');
                                                    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : llamado.ultimaFecha;
                                                })()
                                                : "No registrado"
                                            }
                                        </td>
                                        <td>
                                            {llamado.contesta ? (
                                                <span className="badge bg-success">Contesta</span>
                                            ) : (
                                                <span className="badge bg-warning text-body">No Contesta</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Vista Mobile (Tarjetas) */}
                    <div className="d-md-none">
                        {misLlamados.map(llamado => (
                            <div key={llamado.id} className="card shadow-sm mb-3 border-0 rounded-3">
                                <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h5 className="card-title text-primary fw-bold mb-0">{llamado.numero}</h5>
                                        {llamado.contesta ? (
                                            <span className="badge bg-success">Contesta</span>
                                        ) : (
                                            <span className="badge bg-warning text-body">No Contesta</span>
                                        )}
                                    </div>
                                    <p className="card-text mb-1 text-muted small">
                                        <strong>Dirección:</strong> {llamado.direccion}
                                    </p>
                                    <p className="card-text mb-0 text-muted small">
                                        <strong>Fecha:</strong> {
                                            llamado.ultimaFecha 
                                                ? (() => {
                                                    const fechaStr = llamado.ultimaFecha.split('T')[0];
                                                    const partes = fechaStr.split('-');
                                                    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : llamado.ultimaFecha;
                                                })()
                                                : "No registrado"
                                        }
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default MisLlamados;
