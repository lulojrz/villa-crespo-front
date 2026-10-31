import React, { useContext } from 'react'
import Header from '../Components/Header'
import { NumerosContext } from '../context/NumerosContext'
import { esAnciano, esSiervoMinisterial, obtenerNombreRol, obtenerNombreAsignacion } from '../utils/permisos'
import { Link } from 'react-router-dom'

const Home = () => {
  const { isAuthenticated, abrirBuscador } = useContext(NumerosContext)
  const privilegio = localStorage.getItem('privilegio') || 'PUBLICADOR';
  const asignacion = localStorage.getItem('asignacion') || '';
  const isSMAorANC = esAnciano(privilegio) || esSiervoMinisterial(privilegio);

  return (
    <>
      <Header></Header>
      <main className="min-vh-100 bg-body-tertiary pb-5">
        {!isAuthenticated ? (
            <div className="container py-5 mt-5 text-center">
                <div className="row justify-content-center">
                    <div className="col-lg-8">
                        <div className="mb-4">
                            <i className="bi bi-geo-alt-fill text-primary" style={{ fontSize: '3.5rem' }}></i>
                        </div>
                        <h1 className="display-5 fw-bold text-primary mb-2">Congregación Villa Crespo</h1>
                        <p className="text-body-secondary mb-1 fw-semibold" style={{ fontSize: '1.05rem' }}>
                            Sistema de organización de la predicación
                        </p>
                        <p className="lead text-body-secondary mb-5 px-3">
                            Accedé a los turnos de predicación pública, territorios, revisitas y más.
                            Iniciá sesión con tu usuario para continuar.
                        </p>
                        <Link to="/login" className="btn btn-primary btn-lg px-5 rounded-pill shadow">
                            <i className="bi bi-box-arrow-in-right me-2"></i>
                            Iniciar Sesión
                        </Link>
                    </div>
                </div>
            </div>
        ) : (
            <div className="container py-5" style={{ maxWidth: '900px' }}>
                <div className="mb-4">
                    <p className="text-primary fw-bold text-uppercase mb-1" style={{ fontSize: '0.85rem', letterSpacing: '1px' }}>
                        BIENVENIDO A VILLA CRESPO CRM
                    </p>
                    <h1 className="fw-bold text-body" style={{ fontSize: '2.5rem' }}>
                        ¡Hola, {localStorage.getItem('usuario') || 'Usuario'}!
                    </h1>
                    <div className="d-flex flex-wrap gap-2 align-items-center mt-2">
                        <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2 rounded-pill fw-semibold shadow-sm" title="Tu rol asignado (sólo administradores pueden modificarlo)">
                            <i className="bi bi-person-badge-fill me-1"></i> Rol: {obtenerNombreRol(privilegio)}
                        </span>
                        {asignacion && (
                            <span className="badge bg-info bg-opacity-10 text-info-emphasis border border-info border-opacity-25 px-3 py-2 rounded-pill fw-semibold shadow-sm" title="Tu asignación congregacional (sólo administradores pueden modificarlo)">
                                <i className="bi bi-briefcase-fill me-1"></i> Asignación: {obtenerNombreAsignacion(asignacion)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Buscador Rápido en Inicio */}
                <div 
                    className="card border-0 shadow-sm rounded-4 mb-4 p-3 bg-body"
                    onClick={abrirBuscador}
                    style={{ cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.classList.add('shadow'); }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.classList.remove('shadow'); }}
                >
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '44px', height: '44px' }}>
                            <i className="bi bi-search fs-5"></i>
                        </div>
                        <div className="flex-grow-1 overflow-hidden">
                            <div className="fw-bold text-body mb-0 text-truncate">
                                Buscar calle, edificio o territorio...
                            </div>
                            <small className="text-body-secondary d-none d-sm-block">
                                Escribe una dirección para saltar directo a su portero o manzana
                            </small>
                        </div>
                        <span className="badge bg-body-tertiary text-body-secondary border px-2 py-1 d-none d-sm-inline">
                            Ctrl + K
                        </span>
                    </div>
                </div>

                <div className="row g-3">
                    {/* Botón Predicación Pública (Turnos) */}
                    <div className="col-12 col-md-6">
                        <Link 
                            to="/predicacion" 
                            className="btn btn-primary w-100 text-start shadow-sm d-flex justify-content-between align-items-center text-decoration-none"
                            style={{ borderRadius: '12px', padding: '24px 20px', transition: 'transform 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <div className="d-flex align-items-center fw-bold fs-5">
                                <i className="bi bi-calendar3 me-3 fs-4"></i>
                                Predicación Pública
                            </div>
                            <i className="bi bi-chevron-right fs-5 fw-bold"></i>
                        </Link>
                    </div>

                    {/* Botón Predicación Edificios */}
                    <div className="col-12 col-md-6">
                        <Link 
                            to="/edificios" 
                            className="btn btn-primary w-100 text-start shadow-sm d-flex justify-content-between align-items-center text-decoration-none"
                            style={{ borderRadius: '12px', padding: '24px 20px', transition: 'transform 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <div className="d-flex align-items-center fw-bold fs-5">
                                <i className="bi bi-building me-3 fs-4"></i>
                                Predicación Edificios
                            </div>
                            <i className="bi bi-chevron-right fs-5 fw-bold"></i>
                        </Link>
                    </div>

                    {/* Botón Programa de Salidas */}
                    <div className="col-12 col-md-6">
                        <Link 
                            to="/programa" 
                            className="btn btn-primary w-100 text-start shadow-sm d-flex justify-content-between align-items-center text-decoration-none"
                            style={{ borderRadius: '12px', padding: '24px 20px', transition: 'transform 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <div className="d-flex align-items-center fw-bold fs-5">
                                <i className="bi bi-calendar-range me-3 fs-4"></i>
                                Programa de Salidas
                            </div>
                            <i className="bi bi-chevron-right fs-5 fw-bold"></i>
                        </Link>
                    </div>

                    {/* Botón Mis Días de Salida (Disponibilidad) */}
                    {isSMAorANC && (
                        <div className="col-12 col-md-6">
                            <Link 
                                to="/admin/disponibilidad" 
                                className="btn btn-primary w-100 text-start shadow-sm d-flex justify-content-between align-items-center text-decoration-none"
                                style={{ borderRadius: '12px', padding: '24px 20px', transition: 'transform 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <div className="d-flex align-items-center fw-bold fs-5">
                                    <i className="bi bi-clock-history me-3 fs-4"></i>
                                    Mis Días de Salida
                                </div>
                                <i className="bi bi-chevron-right fs-5 fw-bold"></i>
                            </Link>
                        </div>
                    )}

                    {/* Botón Mis Revisitas */}
                    <div className="col-12 col-md-6">
                        <Link 
                            to="/revisitas" 
                            className="btn btn-primary w-100 text-start shadow-sm d-flex justify-content-between align-items-center text-decoration-none"
                            style={{ borderRadius: '12px', padding: '24px 20px', transition: 'transform 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <div className="d-flex align-items-center fw-bold fs-5">
                                <i className="bi bi-star-fill text-warning me-3 fs-4"></i>
                                Mis Revisitas
                            </div>
                            <i className="bi bi-chevron-right fs-5 fw-bold"></i>
                        </Link>
                    </div>

                    {/* Botón Llamados Telefónicos — Próximamente */}
                    <div className="col-12 col-md-6">
                        <div
                            className="btn bg-body-secondary text-body-secondary w-100 text-start shadow-sm d-flex justify-content-between align-items-center"
                            style={{ borderRadius: '12px', padding: '24px 20px', opacity: 0.85, cursor: 'default' }}
                        >
                            <div className="d-flex align-items-center fw-bold fs-5">
                                <i className="bi bi-telephone-fill me-3 fs-4"></i>
                                Llamados Telefónicos
                            </div>
                            <span className="badge bg-light text-secondary rounded-pill" style={{ fontSize: '0.7rem' }}>Próximamente</span>
                        </div>
                    </div>

                    {/* Botón Territorios Personales — Próximamente */}
                    <div className="col-12 col-md-6">
                        <div
                            className="btn bg-body-secondary text-body-secondary w-100 text-start shadow-sm d-flex justify-content-between align-items-center"
                            style={{ borderRadius: '12px', padding: '24px 20px', opacity: 0.85, cursor: 'default' }}
                        >
                            <div className="d-flex align-items-center fw-bold fs-5">
                                <i className="bi bi-map-fill me-3 fs-4"></i>
                                Territorios Personales
                            </div>
                            <span className="badge bg-light text-secondary rounded-pill" style={{ fontSize: '0.7rem' }}>Próximamente</span>
                        </div>
                    </div>

                    {/* Botón Experiencias */}
                    <div className="col-12 col-md-6">
                        <Link
                            to="/experiencias"
                            className="btn btn-primary w-100 text-start shadow-sm d-flex justify-content-between align-items-center text-decoration-none"
                            style={{ borderRadius: '12px', padding: '24px 20px', transition: 'transform 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <div className="d-flex align-items-center fw-bold fs-5">
                                <i className="bi bi-book-fill me-3 fs-4"></i>
                                Experiencias
                            </div>
                            <i className="bi bi-chevron-right fs-5 fw-bold"></i>
                        </Link>
                    </div>

                    {/* Botón Campañas */}
                    <div className="col-12 col-md-6">
                        <Link
                            to="/campanas"
                            className="btn btn-primary w-100 text-start shadow-sm d-flex justify-content-between align-items-center text-decoration-none"
                            style={{ borderRadius: '12px', padding: '24px 20px', transition: 'transform 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <div className="d-flex align-items-center fw-bold fs-5">
                                <i className="bi bi-megaphone-fill me-3 fs-4"></i>
                                Campañas
                            </div>
                            <i className="bi bi-chevron-right fs-5 fw-bold"></i>
                        </Link>
                    </div>

                    {/* Botón Administración */}
                    <div className="col-12 col-md-6">
                        <Link
                            to="/admin"
                            className="btn btn-primary w-100 text-start shadow-sm d-flex justify-content-between align-items-center text-decoration-none"
                            style={{ borderRadius: '12px', padding: '24px 20px', transition: 'transform 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <div className="d-flex align-items-center fw-bold fs-5">
                                <i className="bi bi-gear-fill me-3 fs-4"></i>
                                Administración
                            </div>
                            <i className="bi bi-chevron-right fs-5 fw-bold"></i>
                        </Link>
                    </div>
                </div>
            </div>
        )}
      </main>
    </>
  )
}

export default Home
