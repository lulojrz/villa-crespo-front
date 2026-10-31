import React from 'react';
import Header from './Header';

const Proximamente = ({ modulo = 'Este módulo', icono = 'bi-hammer', color = '#4b6cb7' }) => {
    return (
        <>
            <Header />
            <main className="min-vh-100 bg-body-tertiary d-flex align-items-center justify-content-center">
                <div className="container py-5 text-center" style={{ maxWidth: '600px' }}>

                    {/* Ícono animado */}
                    <div
                        className="mx-auto mb-4 d-flex align-items-center justify-content-center rounded-circle"
                        style={{
                            width: '100px',
                            height: '100px',
                            backgroundColor: color + '1A',
                            border: `2px dashed ${color}`,
                        }}
                    >
                        <i className={`bi ${icono} fs-1`} style={{ color }}></i>
                    </div>

                    {/* Badge */}
                    <span
                        className="badge rounded-pill px-3 py-2 mb-3"
                        style={{ backgroundColor: color + '22', color, fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em' }}
                    >
                        <i className="bi bi-clock me-1"></i> EN DESARROLLO
                    </span>

                    {/* Título */}
                    <h2 className="fw-bold text-body mb-3" style={{ fontSize: '1.9rem' }}>
                        {modulo}
                    </h2>

                    {/* Descripción */}
                    <p className="text-body-secondary mb-4" style={{ lineHeight: 1.7, fontSize: '1.05rem' }}>
                        Este módulo estará disponible próximamente.<br />
                        Estamos trabajando para que puedas usar esta sección muy pronto. ¡Gracias por tu paciencia!
                    </p>

                    {/* Barra de progreso decorativa */}
                    <div className="progress rounded-pill mb-4" style={{ height: '6px' }}>
                        <div
                            className="progress-bar progress-bar-striped progress-bar-animated"
                            style={{ width: '60%', backgroundColor: color }}
                        ></div>
                    </div>

                    {/* Botón volver */}
                    <a href="/" className="btn rounded-pill px-5 fw-semibold" style={{ backgroundColor: color, color: 'white', border: 'none' }}>
                        <i className="bi bi-house-fill me-2"></i>
                        Volver al Inicio
                    </a>
                </div>
            </main>
        </>
    );
};

export default Proximamente;
