import React, { useContext, useState, useEffect } from 'react';
import MisReservas from './MisReservas';
import { NumerosContext } from '../context/NumerosContext';
import { puedeAdministrarTelefonica } from '../utils/permisos';

const TerritoriosPersonales = () => {
    const { numeros } = useContext(NumerosContext);
    const loggedInUsername = localStorage.getItem('usuario');
    const privilegio = localStorage.getItem('privilegio') || '';
    const asignacion = localStorage.getItem('asignacion') || '';
    const isAdmin = puedeAdministrarTelefonica(privilegio, asignacion);
    const [mostrarMapa, setMostrarMapa] = useState(false);
    const [mostrarModalAyuda, setMostrarModalAyuda] = useState(false);
    const [tabActiva, setTabActiva] = useState('telefonica');

    let usuariosConTerritorios = [];
    if (isAdmin) {
        const numerosReservados = numeros.filter(n => n.reservado === true && n.reservadoA?.usuario);
        const mapUsuarios = new Map();
        
        numerosReservados.forEach(n => {
            const user = n.reservadoA.usuario;
            if (!mapUsuarios.has(user)) {
                mapUsuarios.set(user, {
                    usuario: user,
                    territorios: new Set([n.territorio]),
                    fechaAsignacion: n.fechaReserva ? new Date(n.fechaReserva).getTime() : 0
                });
            } else {
                const data = mapUsuarios.get(user);
                data.territorios.add(n.territorio);
                const nFecha = n.fechaReserva ? new Date(n.fechaReserva).getTime() : 0;
                if (nFecha > 0 && (data.fechaAsignacion === 0 || nFecha < data.fechaAsignacion)) {
                    data.fechaAsignacion = nFecha;
                }
            }
        });
        
        mapUsuarios.forEach(data => {
            usuariosConTerritorios.push({
                usuario: data.usuario,
                territorios: Array.from(data.territorios).join(', '),
                fechaAsignacion: data.fechaAsignacion > 0 ? new Date(data.fechaAsignacion).toLocaleDateString() : 'Sin fecha'
            });
        });
    }

    const misReservas = numeros.filter(n => n.reservado === true && n.reservadoA?.usuario === loggedInUsername);
    const tieneReservas = misReservas.length > 0;

    let fechaAsignacion = null;
    let diasRestantes = 0;
    let progreso = 0;
    let colorProgreso = 'bg-success';
    const DIAS_TOTALES = 90; // Aprox 3 meses

    if (tieneReservas) {
        // Encontrar la fecha de reserva más antigua (fecha de asignación del territorio)
        const fechasValidas = misReservas
            .map(n => n.fechaReserva)
            .filter(f => f != null)
            .map(f => new Date(f).getTime());
        
        if (fechasValidas.length > 0) {
            const fechaMinima = Math.min(...fechasValidas);
            fechaAsignacion = new Date(fechaMinima);
            
            // Calcular fecha límite sumando los días totales
            const fechaLimite = new Date(fechaAsignacion.getTime() + (DIAS_TOTALES * 24 * 60 * 60 * 1000));
            
            const hoy = new Date();
            const diferenciaMs = fechaLimite.getTime() - hoy.getTime();
            diasRestantes = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
            
            if (diasRestantes < 0) diasRestantes = 0;
            
            progreso = ((DIAS_TOTALES - diasRestantes) / DIAS_TOTALES) * 100;
            if (progreso > 100) progreso = 100;
            
            if (diasRestantes <= 15) {
                colorProgreso = 'bg-danger';
            } else if (diasRestantes <= 30) {
                colorProgreso = 'bg-warning';
            }
        }
    }

    const [encargado, setEncargado] = useState(null);

    useEffect(() => {
        const fetchUsuarios = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/usuarios`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        const encargadoEncontrado = data.find(u => {
                            const asig = (u.asignacion || '').trim().toLowerCase();
                            return asig.includes('personales') || asig.includes('telefónicos') || asig.includes('telefonicos');
                        });
                        if (encargadoEncontrado) {
                            setEncargado(encargadoEncontrado);
                        }
                    }
                }
            } catch (e) {
                console.error("Error al cargar encargado", e);
            }
        };
        fetchUsuarios();
    }, []);

    const enviarMensaje = (e) => {
        e.preventDefault();
        const especificacion = e.target.querySelector('input[type="text"]').value;
        const mensaje = encodeURIComponent(`Hola! Me gustaria pedir un territorio personal en la zona de ${especificacion}`);
        
        let telefono = '5491151030168'; // fallback
        if (encargado && encargado.telefono) {
            telefono = encargado.telefono.replace(/\D/g, ''); // Limpiar caracteres no numéricos
        }
        
        const url = `https://api.whatsapp.com/send?phone=${telefono}&text=${mensaje}`;
        window.open(url, '_blank');
    }

    return (
        <div className="card shadow-sm p-4 border-0" style={{ borderRadius: '1rem' }}>
            {tieneReservas ? (
                <div className="mt-2">
                    {fechaAsignacion && (
                        <div className="card shadow-sm mb-4 border-0 bg-body-tertiary" style={{ borderRadius: '0.75rem' }}>
                            <div className="card-body p-4">
                                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                    <h5 className="card-title text-primary fw-bold mb-0">
                                        <i className="bi bi-clock-history me-2"></i>
                                        Progreso del Territorio
                                    </h5>
                                    <div>
                                        <button 
                                            className="btn btn-outline-primary btn-sm rounded-pill me-2 fw-semibold shadow-sm"
                                            onClick={() => setMostrarModalAyuda(true)}
                                        >
                                            <i className="bi bi-question-circle me-1"></i>
                                            ¿Cómo trabajarlo?
                                        </button>
                                        <span className={`badge ${diasRestantes <= 15 ? 'bg-danger' : diasRestantes <= 30 ? 'bg-warning text-body' : 'bg-success'} fs-6 px-3 py-2 shadow-sm rounded-pill`}>
                                            {diasRestantes} días restantes
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="progress mb-3 shadow-sm bg-secondary-subtle" style={{ height: '1.5rem', borderRadius: '1rem' }}>
                                    <div 
                                        className={`progress-bar progress-bar-striped progress-bar-animated ${colorProgreso}`} 
                                        role="progressbar" 
                                        style={{ width: `${progreso}%` }} 
                                        aria-valuenow={progreso} 
                                        aria-valuemin="0" 
                                        aria-valuemax="100"
                                    ></div>
                                </div>
                                
                                <div className="d-flex justify-content-between text-muted small fw-semibold px-1">
                                    <span>
                                        <i className="bi bi-calendar-check me-1 text-primary"></i>
                                        Asignado: {fechaAsignacion.toLocaleDateString()}
                                    </span>
                                    <span>
                                        <i className="bi bi-calendar-x me-1 text-danger"></i>
                                        Vence: {new Date(fechaAsignacion.getTime() + (DIAS_TOTALES * 24 * 60 * 60 * 1000)).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                    <MisReservas hideEmpty={false} />
                </div>
            ) : (
                <>
                    <div className="text-center py-4 my-2 mx-auto" style={{ maxWidth: '650px' }}>
                        <div
                            className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
                            style={{
                                width: '80px',
                                height: '80px',
                                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                                border: '2px dashed #0d6efd',
                            }}
                        >
                            <i className="bi bi-map text-primary fs-2"></i>
                        </div>

                        <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-2 mb-3 fw-semibold">
                            <i className="bi bi-clock-history me-1"></i> EN DESARROLLO · PRÓXIMAMENTE
                        </span>

                        <h3 className="fw-bold text-body mb-2">Territorios Personales</h3>
                        <p className="text-body-secondary mb-4" style={{ lineHeight: 1.6 }}>
                            Estamos actualizando el sistema de asignación y gestión de territorios personales de la congregación. Muy pronto vas a poder solicitar, renovar y gestionar tus territorios personales directamente desde esta sección.
                        </p>

                        <div className="alert alert-info bg-info-subtle border-0 rounded-3 text-start small p-3 mb-4">
                            <div className="d-flex align-items-start gap-2">
                                <i className="bi bi-info-circle-fill text-info fs-5 mt-1"></i>
                                <div>
                                    <strong className="d-block mb-1">¿Necesitás un territorio personal ahora?</strong>
                                    Por favor consultá directamente con el siervo o superintendente de servicio de la congregación para su asignación manual.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-2 mx-auto text-center">
                        <button 
                            className="btn btn-outline-primary mb-3 fw-semibold"
                            onClick={() => setMostrarMapa(true)}
                        >
                            <i className="bi bi-map me-2"></i>
                            Ver mapa de zonas
                        </button>
                        
                        {mostrarMapa && (
                            <div style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                zIndex: 9999,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                padding: '1rem'
                            }}>
                                <div className="shadow-lg bg-body" style={{ 
                                    width: '100%', 
                                    maxWidth: '1200px', 
                                    height: '90vh', 
                                    borderRadius: '1rem', 
                                    overflow: 'hidden', 
                                    display: 'flex', 
                                    flexDirection: 'column' 
                                }}>
                                    <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-body-tertiary">
                                        <h5 className="m-0 fw-bold text-primary">
                                            <i className="bi bi-geo-alt-fill me-2"></i>
                                            Mapa de Territorios
                                        </h5>
                                        <button 
                                            type="button" 
                                            className="btn-close" 
                                            onClick={() => setMostrarMapa(false)} 
                                            aria-label="Cerrar"
                                        ></button>
                                    </div>
                                    <div className="flex-grow-1 position-relative">
                                        <iframe 
                                            src="https://www.google.com/maps/d/embed?mid=1Q2YLge2FsHV1aUYzNV4fzLL8MHNwV2Y&ehbc=2E312F" 
                                            title="Mapa de territorios"
                                            style={{ border: 0, width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                                            allowFullScreen
                                        ></iframe>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {mostrarModalAyuda && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
                }}>
                    <div className="card shadow-lg border-0" style={{ width: '100%', maxWidth: '600px', borderRadius: '1rem', overflow: 'hidden' }}>
                        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center p-3">
                            <h5 className="mb-0 fw-bold"><i className="bi bi-lightbulb me-2"></i>Formas de predicar</h5>
                            <button type="button" className="btn-close btn-close-white" onClick={() => setMostrarModalAyuda(false)}></button>
                        </div>
                        <div className="card-body p-0">
                            <ul className="nav nav-tabs nav-fill bg-body-secondary pt-2" style={{ borderBottom: '2px solid var(--bs-border-color)' }}>
                                <li className="nav-item">
                                    <button className={`nav-link fw-bold ${tabActiva === 'telefonica' ? 'active text-primary' : 'text-body-secondary'}`} style={{ border: 'none', borderBottom: tabActiva === 'telefonica' ? '3px solid #0d6efd' : '3px solid transparent' }} onClick={() => setTabActiva('telefonica')}>
                                        <i className="bi bi-telephone-fill me-2"></i>Telefónica
                                    </button>
                                </li>
                                <li className="nav-item">
                                    <button className={`nav-link fw-bold ${tabActiva === 'cartas' ? 'active text-primary' : 'text-body-secondary'}`} style={{ border: 'none', borderBottom: tabActiva === 'cartas' ? '3px solid #0d6efd' : '3px solid transparent' }} onClick={() => setTabActiva('cartas')}>
                                        <i className="bi bi-envelope-paper-fill me-2"></i>Cartas
                                    </button>
                                </li>
                                <li className="nav-item">
                                    <button className={`nav-link fw-bold ${tabActiva === 'publica' ? 'active text-primary' : 'text-body-secondary'}`} style={{ border: 'none', borderBottom: tabActiva === 'publica' ? '3px solid #0d6efd' : '3px solid transparent' }} onClick={() => setTabActiva('publica')}>
                                        <i className="bi bi-signpost-split-fill me-2"></i>Pública
                                    </button>
                                </li>
                            </ul>
                            
                            <div className="p-4 bg-body" style={{ minHeight: '200px' }}>
                                {tabActiva === 'telefonica' && (
                                    <div className="animate__animated animate__fadeIn">
                                        <h6 className="text-primary fw-bold mb-3">Predicación Telefónica</h6>
                                        <p className="text-muted">Utiliza la lista de números que aparece abajo en <strong>"Mis Reservas"</strong>. Tienes los números telefónicos exclusivos de tu territorio.</p>
                                        <ul className="text-muted small">
                                            <li>Al llamar, anota si la persona contesta o no usando el botón correspondiente.</li>
                                            <li>Puedes dejar una nota en el número si la persona pidió que no la llamen más.</li>
                                            <li>Recuerda ser amable y breve en tu presentación.</li>
                                        </ul>
                                    </div>
                                )}
                                {tabActiva === 'cartas' && (
                                    <div className="animate__animated animate__fadeIn">
                                        <h6 className="text-primary fw-bold mb-3">Predicación por Cartas</h6>
                                        <p className="text-muted">Junto a los números telefónicos, también puedes ver la <strong>dirección y edificio</strong>.</p>
                                        <ul className="text-muted small mb-0">
                                            <li>Usa estas direcciones postales para enviar cartas a los vecinos de tu territorio.</li>
                                            <li>Es ideal para aquellos números que nunca contestan o donde es difícil encontrar gente en casa.</li>
                                            <li>Recuerda incluir un folleto o tratado y usar remitentes adecuados.</li>
                                        </ul>
                                    </div>
                                )}
                                {tabActiva === 'publica' && (
                                    <div className="animate__animated animate__fadeIn">
                                        <h6 className="text-primary fw-bold mb-3">Predicación Pública (Carritos/Banners)</h6>
                                        <p className="text-muted">Si las condiciones lo permiten, puedes organizar la predicación pública dentro de los límites de tu territorio.</p>
                                        <ul className="text-muted small mb-0">
                                            <li>Ponte de acuerdo con tu grupo para ubicar un exhibidor portátil (carrito) en una zona transitada de este territorio.</li>
                                            <li>Asegúrate de no superponerte con territorios de otros grupos.</li>
                                            <li>Es una excelente manera de abordar a las personas de esta zona de forma directa.</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="card-footer bg-body-tertiary text-end p-3">
                            <button className="btn btn-secondary px-4 shadow-sm" onClick={() => setMostrarModalAyuda(false)}>Entendido</button>
                        </div>
                    </div>
                </div>
            )}

            {isAdmin && (
                <div className="mt-5 border-top pt-4">
                    <h4 className="text-primary fw-bold mb-3">
                        <i className="bi bi-people-fill me-2"></i>
                        Usuarios con Territorios Asignados
                    </h4>
                    {usuariosConTerritorios.length === 0 ? (
                        <div className="alert alert-info shadow-sm border-0" style={{ borderRadius: '0.75rem' }}>
                            <i className="bi bi-info-circle me-2"></i>No hay territorios asignados a ningún usuario actualmente.
                        </div>
                    ) : (
                        <div className="table-responsive shadow-sm rounded-3">
                            <table className="table table-hover table-striped align-middle mb-0 bg-body">
                                <thead className="table-light">
                                    <tr>
                                        <th className="text-body-secondary fw-semibold border-0 py-3 ps-4 rounded-start">Usuario</th>
                                        <th className="text-body-secondary fw-semibold border-0 py-3">Territorios</th>
                                        <th className="text-body-secondary fw-semibold border-0 py-3 pe-4 rounded-end">Fecha de Asignación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuariosConTerritorios.map((u, idx) => (
                                        <tr key={idx}>
                                            <td className="fw-bold ps-4">{u.usuario}</td>
                                            <td>{u.territorios}</td>
                                            <td className="pe-4">{u.fechaAsignacion}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TerritoriosPersonales;
