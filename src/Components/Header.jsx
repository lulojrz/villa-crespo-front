import React, { useContext, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { NumerosContext } from '../context/NumerosContext'
import { obtenerColaPendiente } from '../utils/offlineSync'
import { obtenerNombreRol, obtenerNombreAsignacion } from '../utils/permisos'

const Header = () => {
  const { isAuthenticated, setIsAuth, theme, setTheme, abrirBuscador } = useContext(NumerosContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    setIsAuth(false);
    navigate('/');
  };

  const [usuarios, setUsuarios] = useState([]);
  const [showContacto, setShowContacto] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [colaCount, setColaCount] = useState(() => {
    try {
      return obtenerColaPendiente().length;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setColaCount(obtenerColaPendiente().length);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setColaCount(obtenerColaPendiente().length);
    };
    const handleQueueChange = (e) => {
      if (e && e.detail && e.detail.count !== undefined) {
        setColaCount(e.detail.count);
      } else {
        setColaCount(obtenerColaPendiente().length);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-changed', handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-changed', handleQueueChange);
    };
  }, []);

  useEffect(() => {
    if (showContacto && usuarios.length === 0) {
      const fetchUsuarios = async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/usuarios`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            setUsuarios(data);
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchUsuarios();
    }
  }, [showContacto]);

  const contactosServicio = usuarios.filter(u => {
    const asig = (u.asignacion || '').trim().toLowerCase();
    return asig === 'servicio' || asig === 'territorios' || asig === 'servicio y territorios';
  });
  
  const contactosTelefonica = usuarios.filter(u => {
    const asig = (u.asignacion || '').trim().toLowerCase();
    return asig === 'territorios telefonicos/personales' || asig === 'territorios telefónicos/personales' || asig === 'territorios telefonicos' || asig === 'personales' || asig === 'territorios personales';
  });

  const contactosPublica = usuarios.filter(u => {
    const asig = (u.asignacion || '').trim().toLowerCase();
    return asig === 'publica' || asig === 'pública';
  });

    return (
    <>
      <nav className="navbar navbar-expand-lg bg-body shadow-sm mx-auto mt-3 px-3 py-2 border-0" style={{ maxWidth: '900px', borderRadius: '1rem', transition: 'background-color 0.3s ease' }}>
        <div className="container-fluid px-2"> 
            <Link className="navbar-brand fw-bold text-primary d-flex align-items-center gap-2" to={'/'} style={{ letterSpacing: '-0.5px' }}>
                <i className="bi bi-geo-alt-fill"></i> Villa Crespo
            </Link>

            <div className="d-flex align-items-center gap-2 order-lg-last ms-auto me-2 me-lg-0">
                {!isOnline ? (
                    <span 
                        className="badge bg-warning bg-opacity-25 text-warning-emphasis border border-warning rounded-pill px-2 py-1 small d-flex align-items-center gap-1"
                        title="Modo sin conexión activo. Tus marcas se guardan localmente y se sincronizan al recuperar internet."
                    >
                        <i className="bi bi-wifi-off"></i>
                        <span className="d-none d-sm-inline">Offline</span>
                        {colaCount > 0 && <span className="badge bg-warning text-dark px-1">{colaCount}</span>}
                    </span>
                ) : colaCount > 0 ? (
                    <span 
                        className="badge bg-info bg-opacity-25 text-info-emphasis border border-info rounded-pill px-2 py-1 small d-flex align-items-center gap-1"
                        title="Sincronizando cambios pendientes con el servidor..."
                    >
                        <i className="bi bi-arrow-repeat"></i>
                        <span className="d-none d-sm-inline">Sincronizando ({colaCount})</span>
                    </span>
                ) : null}
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary rounded-pill px-2 px-md-3 py-1 d-flex align-items-center gap-2 border shadow-none"
                    onClick={abrirBuscador}
                    title="Buscar calle, edificio o territorio (Ctrl+K)"
                >
                    <i className="bi bi-search text-primary"></i>
                    <span className="d-none d-md-inline text-body-secondary small">Buscar...</span>
                    <span className="badge bg-body-secondary text-body-tertiary border d-none d-md-inline" style={{ fontSize: '0.65rem' }}>Ctrl+K</span>
                </button>

                <button 
                    className="btn btn-sm btn-outline-secondary rounded-circle" 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                >
                    {theme === 'dark' ? <i className="bi bi-sun-fill"></i> : <i className="bi bi-moon-stars-fill"></i>}
                </button>
            </div>

            <button
                className="navbar-toggler border-0 shadow-none p-1"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#navbarSupportedContent"
                aria-controls="navbarSupportedContent"
                aria-expanded="false"
                aria-label="Toggle navigation"
            >
                <span className="navbar-toggler-icon"></span>
            </button>

            <div className="collapse navbar-collapse justify-content-center" id="navbarSupportedContent">
                <ul className="navbar-nav mb-2 mb-lg-0 align-items-lg-center text-center mt-3 mt-lg-0 gap-lg-4">
                    {isAuthenticated ? (
                        <>
                            <li className="nav-item">
                                <Link className="nav-link fw-semibold text-body d-flex align-items-center justify-content-center gap-2" to={'/'}>
                                    <i className="bi bi-house text-primary"></i> Inicio
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link fw-semibold text-body d-flex align-items-center justify-content-center gap-2" to={'/admin'}>
                                    <i className="bi bi-gear-fill text-primary"></i> Administración
                                </Link>
                            </li>
                            <li className="nav-item dropdown">
                                <a className="nav-link fw-semibold text-body d-flex align-items-center justify-content-center gap-2 dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                    <i className="bi bi-person text-primary"></i> Perfil
                                </a>
                                <ul className="dropdown-menu dropdown-menu-end border-0 shadow-sm rounded-3 mt-2 p-0 overflow-hidden" style={{ minWidth: '220px' }}>
                                    <li className="px-3 py-2 border-bottom bg-body-tertiary">
                                        <div className="fw-bold text-body text-truncate">{localStorage.getItem('usuario') || 'Usuario'}</div>
                                        <div className="d-flex flex-wrap gap-1 mt-1">
                                            <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25" style={{ fontSize: '0.7rem' }}>
                                                {obtenerNombreRol(localStorage.getItem('privilegio'))}
                                            </span>
                                            {localStorage.getItem('asignacion') && (
                                                <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25" style={{ fontSize: '0.7rem' }}>
                                                    {obtenerNombreAsignacion(localStorage.getItem('asignacion'))}
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                    <li><Link className="dropdown-item fw-medium py-2 mt-1" to={'/admin/perfil'}><i className="bi bi-person-badge me-2 text-primary"></i>Mi Perfil</Link></li>
                                    <li><hr className="dropdown-divider my-1" /></li>
                                    <li><button className="dropdown-item fw-medium py-2 text-danger mb-1" onClick={handleLogout}><i className="bi bi-box-arrow-right me-2"></i>Cerrar Sesión</button></li>
                                </ul>
                            </li>
                        </>
                    ) : (
                        <li className="nav-item mb-2 mb-lg-0">
                            <Link className="nav-link active d-inline-block p-0" aria-current="page" to={'/login'}>
                                <button className="btn btn-outline-primary px-4 fw-semibold">Iniciar Sesión</button>
                            </Link>
                        </li>
                    )}
                </ul>
            </div>
        </div>
      </nav>

      {/* Modal de Contacto */}
      {showContacto && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-info bg-opacity-10 border-bottom-0">
                <h5 className="modal-title fw-bold text-info-emphasis">
                  <i className="bi bi-person-lines-fill me-2"></i>
                  Directorio de Contacto
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowContacto(false)}></button>
              </div>
              <div className="modal-body px-4">
                <p className="text-muted mb-4">¿Tienes alguna consulta? Comunícate con los encargados correspondientes según el área:</p>
                
                <div className="mb-4">
                  <h6 className="fw-bold text-body-secondary mb-2 border-bottom pb-1">Administración (Servicio y Territorios)</h6>
                  {contactosServicio.length > 0 ? (
                    <ul className="list-unstyled mb-0">
                      {contactosServicio.map((c, i) => (
                        <li key={i} className="mb-2 d-flex justify-content-between align-items-center border-bottom pb-1">
                          <span><i className="bi bi-person-fill me-2 text-primary"></i>{c.nombre} {c.apellido}</span>
                          {c.telefono && (
                            <a href={`https://wa.me/${c.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${c.nombre}, te escribo por una consulta sobre Administración/Servicio`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-success rounded-pill px-3"><i className="bi bi-whatsapp"></i></a>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : <span className="text-muted fst-italic">No hay encargados registrados.</span>}
                </div>

                <div className="mb-4">
                  <h6 className="fw-bold text-body-secondary mb-2 border-bottom pb-1">Predicación Pública</h6>
                  {contactosPublica.length > 0 ? (
                    <ul className="list-unstyled mb-0">
                      {contactosPublica.map((c, i) => (
                        <li key={i} className="mb-2 d-flex justify-content-between align-items-center border-bottom pb-1">
                          <span><i className="bi bi-person-fill me-2 text-success"></i>{c.nombre} {c.apellido}</span>
                          {c.telefono && (
                            <a href={`https://wa.me/${c.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${c.nombre}, te escribo por una consulta sobre Predicación Pública`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-success rounded-pill px-3"><i className="bi bi-whatsapp"></i></a>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : <span className="text-muted fst-italic">No hay encargados registrados.</span>}
                </div>

                <div className="mb-4">
                  <h6 className="fw-bold text-body-secondary mb-2 border-bottom pb-1">Territorios Telefónicos / Personales</h6>
                  {contactosTelefonica.length > 0 ? (
                    <ul className="list-unstyled mb-0">
                      {contactosTelefonica.map((c, i) => (
                        <li key={i} className="mb-2 d-flex justify-content-between align-items-center border-bottom pb-1">
                          <span><i className="bi bi-person-fill me-2 text-info"></i>{c.nombre} {c.apellido}</span>
                          {c.telefono && (
                            <a href={`https://wa.me/${c.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${c.nombre}, te escribo por una consulta sobre Territorios Telefónicos o Personales`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-success rounded-pill px-3"><i className="bi bi-whatsapp"></i></a>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : <span className="text-muted fst-italic">No hay encargados registrados.</span>}
                </div>

                <div className="mb-2">
                  <h6 className="fw-bold text-body-secondary mb-2 border-bottom pb-1">Soporte Técnico de la App</h6>
                  <ul className="list-unstyled mb-0">
                    <li className="mb-2 d-flex justify-content-between align-items-center border-bottom pb-1">
                      <span><i className="bi bi-gear-fill me-2 text-warning"></i>Luca Jerez</span>
                      <a href={`https://wa.me/5491151030168?text=${encodeURIComponent(`Hola Luca, te escribo por una consulta de Soporte Técnico de la App Villa Crespo`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-success rounded-pill px-3"><i className="bi bi-whatsapp"></i></a>
                    </li>
                  </ul>
                </div>

              </div>
              <div className="modal-footer border-top-0">
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowContacto(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Header
