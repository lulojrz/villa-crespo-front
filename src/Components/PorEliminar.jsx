import React, { useContext } from 'react';
import { NumerosContext } from '../context/NumerosContext';

const PorEliminar = () => {
    const { numeros, eliminarNumero } = useContext(NumerosContext);
    
    const porEliminar = numeros.filter(n => n.tocar === false);

    return (
        <div className="mt-4">
            <div className="alert alert-warning d-flex align-items-center" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2 fs-4"></i>
                <div>
                    <strong>¡Atención!</strong> Estos números están marcados para no ser tocados (tocar: false) y deberían ser revisados o eliminados.
                </div>
            </div>
            {porEliminar.length === 0 ? (
                <p className="text-muted">No hay números marcados por eliminar.</p>
            ) : (
                <>
                    {/* Vista Desktop */}
                    <div className="table-responsive d-none d-md-block">
                        <table className="table table-hover">
                            <thead>
                                <tr>
                                    <th>Número</th>
                                    <th>Dirección</th>
                                    <th>Territorio</th>
                                    <th>Edificio</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {porEliminar.map(num => (
                                    <tr key={num.id}>
                                        <td className="fw-bold">{num.numero}</td>
                                        <td>{num.direccion}</td>
                                        <td>{num.territorio}</td>
                                        <td>{num.edificio}</td>
                                        <td>
                                            <button 
                                                className="btn btn-danger btn-sm"
                                                onClick={() => eliminarNumero(num.id)}
                                            >
                                                <i className="bi bi-trash"></i> Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Vista Mobile */}
                    <div className="d-md-none">
                        {porEliminar.map(num => (
                            <div key={num.id} className="card shadow-sm mb-3 border-0 rounded-3 border-start border-danger border-4">
                                <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h5 className="card-title text-danger fw-bold mb-0">{num.numero}</h5>
                                        <span className="badge bg-body-tertiary text-body border">Terr: {num.territorio}</span>
                                    </div>
                                    <p className="card-text mb-1 text-muted small">
                                        <strong>Dirección:</strong> {num.direccion}
                                    </p>
                                    <p className="card-text mb-3 text-muted small">
                                        <strong>Edificio:</strong> {num.edificio}
                                    </p>
                                    <button 
                                        className="btn btn-outline-danger btn-sm w-100 fw-semibold"
                                        onClick={() => eliminarNumero(num.id)}
                                    >
                                        <i className="bi bi-trash"></i> Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default PorEliminar;
