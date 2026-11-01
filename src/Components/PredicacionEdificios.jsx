import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import Loading from './Loading';
import { guardarCacheLocal, obtenerCacheLocal, encolarMutacion } from '../utils/offlineSync';
import { useSwipeable } from 'react-swipeable';
import { puedeAdministrarEdificios } from '../utils/permisos';


const DptoButton = ({ dpto, btnClass, icon, abrirMenuDpto, actualizarDpto }) => {
    const handlers = useSwipeable({
        onSwipedLeft: () => {
            // Swipe a la izquierda: Marcar como No Visitado
            actualizarDpto(dpto, 'No visitado', dpto.tocar);
        },
        onSwipedRight: () => {
            // Swipe a la derecha: Marcar como Atendió
            actualizarDpto(dpto, 'Atendió', dpto.tocar);
        },
        preventDefaultTouchmoveEvent: false,
        trackMouse: true
    });

    return (
        <div className="col-4 col-sm-3 col-md-2" {...handlers}>
            <button 
                className={`btn w-100 py-3 ${btnClass} d-flex flex-column align-items-center justify-content-center h-100`}
                onClick={() => abrirMenuDpto(dpto)}
            >
                <i className={`bi ${icon} fs-4 mb-1`}></i>
                <span className="fw-bold" style={{fontSize: '0.9rem'}}>{dpto.piso}-{dpto.letra}</span>
                {dpto.estado && dpto.estado !== 'No visitado' && dpto.tocar && (
                    <span style={{fontSize: '0.65rem'}} className="mt-1 text-truncate w-100">{dpto.estado}</span>
                )}
                {dpto.ultimaFechaTrabajada && (
                    <span style={{fontSize: '0.55rem', opacity: 0.8}} className="text-truncate w-100">
                        {new Date(dpto.ultimaFechaTrabajada).toLocaleDateString()}
                    </span>
                )}
            </button>
        </div>
    );
};

const PredicacionEdificios = () => {
    const location = useLocation();
    const [territorios, setTerritorios] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Rutas de navegación
    const [vistaActual, setVistaActual] = useState('territorios'); // territorios, manzanas, edificios, portero
    const [territorioSel, setTerritorioSel] = useState(null);
    const [manzanaSel, setManzanaSel] = useState(null);
    const [edificioSel, setEdificioSel] = useState(null);

    const api = import.meta.env.VITE_API_URL;
    const Toast = Swal.mixin({
        toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const timestamp = new Date().getTime();
            const res = await fetch(`${api}/territorios/traer?t=${timestamp}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setTerritorios(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Manejar navegación directa por estado (Buscador Global o enlaces externos)
    useEffect(() => {
        if (!territorios || territorios.length === 0 || !location.state) return;

        if (location.state.edificioId) {
            let encontrado = false;
            for (const t of territorios) {
                for (const m of (t.manzanas || [])) {
                    const ed = (m.edificios || []).find(e => e.id === location.state.edificioId);
                    if (ed) {
                        setTerritorioSel(t);
                        setManzanaSel(m);
                        setEdificioSel(ed);
                        setVistaActual('portero');
                        encontrado = true;
                        break;
                    }
                }
                if (encontrado) break;
            }
            window.history.replaceState({}, document.title);
        } else if (location.state.manzanaId) {
            let encontrado = false;
            for (const t of territorios) {
                const m = (t.manzanas || []).find(man => man.id === location.state.manzanaId);
                if (m) {
                    setTerritorioSel(t);
                    setManzanaSel(m);
                    setVistaActual('edificios');
                    encontrado = true;
                    break;
                }
            }
            window.history.replaceState({}, document.title);
        } else if (location.state.territorioId) {
            const t = territorios.find(ter => ter.id === location.state.territorioId || ter.numero === location.state.territorioNumero);
            if (t) {
                setTerritorioSel(t);
                setVistaActual('manzanas');
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, territorios]);

    // Funciones de navegación
    const irAManzanas = (t) => { setTerritorioSel(t); setVistaActual('manzanas'); };
    const irAEdificios = (m) => { setManzanaSel(m); setVistaActual('edificios'); };
    const irAPortero = (e) => { setEdificioSel(e); setVistaActual('portero'); };
    const volver = () => {
        if (vistaActual === 'portero') setVistaActual('edificios');
        else if (vistaActual === 'edificios') setVistaActual('manzanas');
        else if (vistaActual === 'manzanas') setVistaActual('territorios');
        else if (vistaActual === 'estadisticas') setVistaActual('territorios');
    };

    // Actualizar un departamento
    const actualizarDpto = async (dpto, nuevoEstado, nuevoTocar, observacionesExtra = null) => {
        const fechaStr = new Date().toLocaleDateString();
        let nuevoHistorial = dpto.historial || '';
        // Agregar al historial si cambió el estado o es un registro explícito
        if (nuevoEstado !== 'No visitado') {
            const entry = `${fechaStr}: ${nuevoEstado}`;
            let lineas = nuevoHistorial.split('\n').filter(l => l.trim() !== '');
            // Evitar duplicados del mismo día con el mismo estado
            if (lineas.length === 0 || lineas[lineas.length - 1] !== entry) {
                lineas.push(entry);
                if (lineas.length > 6) lineas = lineas.slice(lineas.length - 6); // Mantener últimos 6
                nuevoHistorial = lineas.join('\n');
            }
        }

        const updated = {
            ...dpto,
            estado: nuevoEstado,
            tocar: nuevoTocar,
            ultimaFechaTrabajada: new Date().toISOString(),
            historial: nuevoHistorial
        };
        if (observacionesExtra !== null) updated.observaciones = observacionesExtra;

        try {
            const res = await fetch(`${api}/departamentos/editar/${dpto.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(updated)
            });
            if (res.ok) {
                Toast.fire({ icon: 'success', title: 'Guardado' });
                // Refetch silencioso para actualizar en pantalla
                const resTerr = await fetch(`${api}/territorios/traer?t=${new Date().getTime()}`, { credentials: 'include' });
                if (resTerr.ok) setTerritorios(await resTerr.json());
            }
        } catch (e) {
            Toast.fire({ icon: 'error', title: 'Error al guardar' });
        }
    };

    const abrirMenuDpto = (dpto) => {
        const historialHtml = dpto.historial 
            ? dpto.historial.split('\n').map(l => `<div><i class="bi bi-clock-history me-1"></i> ${l}</div>`).join('') 
            : '<em>No hay visitas previas.</em>';

        Swal.fire({
            title: `Timbre ${dpto.piso}-${dpto.letra}`,
            html: `
                <div class="mb-3 text-start small text-body-secondary p-2 bg-body-tertiary rounded border" style="max-height: 100px; overflow-y: auto;">
                    <strong class="text-body">Historial de Visitas:</strong><br/>
                    ${historialHtml}
                </div>
                <div class="d-grid gap-2">
                    <button id="btn-revisita" class="btn btn-info text-white fw-bold"><i class="bi bi-star-fill text-warning me-1"></i>Revisita</button>
                    <button id="btn-atendio" class="btn btn-success fw-bold">Atendió</button>
                    <button id="btn-noencasa" class="btn btn-warning fw-bold text-body">No en casa</button>
                    <button id="btn-ocupado" class="btn btn-secondary fw-bold">Ocupado / Vuelvo Luego</button>
                      <button id="btn-novisitado" class="btn btn-outline-secondary fw-bold">Restablecer (No visitado)</button>
                    <hr/>
                    <button id="btn-notocar" class="btn ${dpto.tocar ? 'btn-danger' : 'btn-outline-danger'} fw-bold">
                        <i class="bi bi-slash-circle me-1"></i> ${dpto.tocar ? 'Marcar como NO TOCAR' : 'Volver a TOCAR'}
                    </button>
                </div>
            `,
            showConfirmButton: false,
            showCloseButton: true,
            didOpen: () => {
                document.getElementById('btn-revisita').addEventListener('click', async () => {
                    Swal.close();
                    const { value: obs } = await Swal.fire({
                        title: 'Observaciones de la Revisita',
                        input: 'textarea',
                        inputPlaceholder: 'Ej: Se llama Juan, dejamos la Atalaya...',
                        showCancelButton: true,
                        confirmButtonText: 'Guardar',
                        cancelButtonText: 'Cancelar'
                    });
                    if (obs !== undefined) {
                        const usuarioId = localStorage.getItem('usuarioId');
                        // Para revisita pasamos también publicador
                        const updated = {...dpto, publicador: { id: usuarioId }};
                        actualizarDpto(updated, 'Revisita', dpto.tocar, obs);
                    }
                });
                document.getElementById('btn-atendio').addEventListener('click', () => {
                    Swal.close(); actualizarDpto(dpto, 'Atendió', dpto.tocar);
                });
                document.getElementById('btn-noencasa').addEventListener('click', () => {
                    Swal.close(); actualizarDpto(dpto, 'No en casa', dpto.tocar);
                });
                document.getElementById('btn-ocupado').addEventListener('click', () => {
                      Swal.close(); actualizarDpto(dpto, 'Ocupado', dpto.tocar);
                  });
                  document.getElementById('btn-novisitado')?.addEventListener('click', () => {
                      Swal.close(); actualizarDpto(dpto, 'No visitado', dpto.tocar);
                  });
                document.getElementById('btn-notocar').addEventListener('click', () => {
                    Swal.close(); actualizarDpto(dpto, dpto.estado, !dpto.tocar);
                });
            }
        });
    };

    if (loading) return <div className="mt-4"><Loading type="cards" count={6} /></div>;

    // Obtener referencias actualizadas
    const tActual = territorioSel ? territorios.find(t => t.id === territorioSel.id) : null;
    const mActual = tActual && manzanaSel ? tActual.manzanas?.find(m => m.id === manzanaSel.id) : null;
    const eActual = mActual && edificioSel ? mActual.edificios?.find(e => e.id === edificioSel.id) : null;

    const privilegio = localStorage.getItem('privilegio') || '';
    const asignacion = localStorage.getItem('asignacion') || '';
    const isPublicador = !puedeAdministrarEdificios(privilegio, asignacion);

    return (
        <div className="container mt-4 mb-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="h4 text-primary fw-bold m-0">
                    <i className="bi bi-buildings me-2"></i>Predicación de Edificios
                </h2>
                {vistaActual === 'territorios' ? (
                    !isPublicador && (
                        <button className="btn btn-outline-primary btn-sm fw-bold shadow-sm" onClick={() => setVistaActual('estadisticas')}>
                            <i className="bi bi-bar-chart-fill me-1"></i> Estadísticas
                        </button>
                    )
                ) : (
                    <button className="btn btn-outline-secondary btn-sm shadow-sm" onClick={() => setVistaActual('territorios')}>
                        <i className="bi bi-house-door-fill me-1"></i> Inicio
                    </button>
                )}
            </div>

            {/* BREADCRUMBS */}
            {vistaActual !== 'territorios' && (
                <div className="mb-3 d-flex align-items-center bg-body p-2 rounded shadow-sm border">
                    <button className="btn btn-sm btn-light rounded-circle me-2" onClick={volver}><i className="bi bi-arrow-left"></i></button>
                    <div className="text-muted small fw-semibold overflow-hidden text-truncate">
                        Territorio {tActual?.numero} 
                        {vistaActual !== 'manzanas' && ` > ${mActual?.nombre}`}
                        {vistaActual === 'portero' && ` > ${eActual?.direccion}`}
                    </div>
                </div>
            )}

            {/* VISTA 1: TERRITORIOS */}
            {vistaActual === 'territorios' && (
                <div className="row g-3">
                    {territorios.length === 0 ? (
                        <div className="col-12 text-center text-muted py-5">No hay territorios creados.</div>
                    ) : (
                        territorios.map(t => {
                            const hoy = new Date();
                            let diffDays = null;
                            let tieneAlarma = false;
                            let textoAlarma = '';

                            if (!t.ultimaFechaTrabajada) {
                                tieneAlarma = true;
                                textoAlarma = '¡Alarma! Sin trabajar';
                            } else {
                                const f = new Date(t.ultimaFechaTrabajada);
                                diffDays = Math.ceil(Math.abs(hoy - f) / (1000 * 60 * 60 * 24));
                                if (diffDays >= 120) {
                                    tieneAlarma = true;
                                    textoAlarma = `¡Alarma! Hace ${Math.floor(diffDays / 30)} meses`;
                                }
                            }

                            return (
                                <div className="col-12 col-md-6 col-lg-4" key={t.id}>
                                    <div 
                                        className={`card h-100 border-0 shadow-sm ${tieneAlarma ? 'border-start border-4 border-danger' : ''}`} 
                                        onClick={() => irAManzanas(t)} 
                                        style={{cursor: 'pointer'}}
                                    >
                                        <div className="card-body d-flex justify-content-between align-items-center">
                                            <div>
                                                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                                    <h5 className="fw-bold mb-0">Territorio {t.numero}</h5>
                                                    {tieneAlarma && (
                                                        <span className="badge bg-danger bg-opacity-10 text-danger border border-danger rounded-pill px-2 py-1" style={{ fontSize: '0.7rem' }}>
                                                            <i className="bi bi-bell-fill me-1"></i> {textoAlarma}
                                                        </span>
                                                    )}
                                                    {!tieneAlarma && diffDays !== null && diffDays <= 30 && (
                                                        <span className="badge bg-success bg-opacity-10 text-success border border-success rounded-pill px-2 py-1" style={{ fontSize: '0.7rem' }}>
                                                            <i className="bi bi-check-circle-fill me-1"></i> Al día ({diffDays}d)
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-muted small mt-1">
                                                    <i className="bi bi-grid-3x3 me-1"></i> {t.manzanas?.length || 0} Manzanas
                                                </div>
                                                <div className="text-muted small mt-1">
                                                    <i className="bi bi-calendar-check me-1"></i> 
                                                    Última visita: {t.ultimaFechaTrabajada ? new Date(t.ultimaFechaTrabajada).toLocaleDateString() : 'Ninguna'}
                                                </div>
                                                {t.asignadoA && (
                                                    <div className="badge bg-body-tertiary text-body border mt-2">
                                                        Asignado a: {t.asignadoA.nombre}
                                                    </div>
                                                )}
                                            </div>
                                            <i className="bi bi-chevron-right text-primary fs-4"></i>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* VISTA 2: MANZANAS */}
            {vistaActual === 'manzanas' && tActual && (
                <div className="row g-3">
                    <div className="col-12">
                        {tActual.imagen && (
                            <button type="button" className="btn btn-outline-secondary w-100 bg-body shadow-sm fw-bold mb-3" disabled title="La visualización de mapas está temporalmente deshabilitada.">
                                <i className="bi bi-map me-2"></i> Mapa en actualización
                            </button>
                        )}
                    </div>
                    {(!tActual.manzanas || tActual.manzanas.length === 0) ? (
                        <div className="col-12 text-center text-muted py-5">Este territorio no tiene manzanas.</div>
                    ) : (
                        tActual.manzanas.map(m => (
                            <div className="col-12 col-md-6" key={m.id}>
                                <div className="card h-100 border-0 shadow-sm" onClick={() => irAEdificios(m)} style={{cursor: 'pointer'}}>
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between">
                                            <h5 className="fw-bold text-primary">
                                                {m.nombre} 
                                                {m.completada && <span className="ms-2 badge bg-success align-middle" style={{fontSize: '0.6rem'}}>COMPLETADA</span>}
                                            </h5>
                                            <i className="bi bi-chevron-right text-muted"></i>
                                        </div>
                                        <div className="text-muted small mt-2">
                                            N: {m.calleNorte} | S: {m.calleSur} <br/>
                                            E: {m.calleEste} | O: {m.calleOeste}
                                        </div>
                                        <div className="mt-3">
                                            <span className="badge bg-primary rounded-pill">{m.edificios?.length || 0} Edificios</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    {!isPublicador && (
                        <div className="col-12 mt-4 text-center">
                            <button 
                                className="btn btn-outline-primary rounded-pill px-4 fw-bold shadow-sm"
                                onClick={async () => {
                                    try {
                                        const nuevaFecha = new Date().toISOString();
                                        const nuevasFechas = tActual.fechasTrabajado ? [...tActual.fechasTrabajado, nuevaFecha] : [nuevaFecha];
                                        
                                        const res = await fetch(`${api}/territorios/editar/${tActual.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            credentials: 'include',
                                            body: JSON.stringify({
                                                ...tActual,
                                                ultimaFechaTrabajada: nuevaFecha,
                                                fechasTrabajado: nuevasFechas
                                            })
                                        });
                                        if (res.ok) {
                                            Toast.fire({ icon: 'success', title: 'Territorio actualizado' });
                                            const resTerr = await fetch(`${api}/territorios/traer?t=${new Date().getTime()}`, { credentials: 'include' });
                                            if (resTerr.ok) setTerritorios(await resTerr.json());
                                        }
                                    } catch (e) {
                                        Toast.fire({ icon: 'error', title: 'Error al actualizar territorio' });
                                    }
                                }}
                            >
                                <i className="bi bi-calendar-check me-2"></i>Marcar Territorio como Trabajado Hoy
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* VISTA 3: EDIFICIOS */}
            {vistaActual === 'edificios' && mActual && (
                <div className="row g-3">
                    {!isPublicador && (
                        <div className="col-12 mb-3 d-flex justify-content-end">
                            <button 
                                className={`btn ${mActual.completada ? 'btn-outline-success bg-body' : 'btn-success text-white'} fw-bold shadow-sm rounded-pill px-4`}
                                onClick={async () => {
                                    const nuevoEstado = !mActual.completada;
                                    try {
                                        const res = await fetch(`${api}/manzanas/editar/${mActual.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            credentials: 'include',
                                            body: JSON.stringify({
                                                ...mActual,
                                                completada: nuevoEstado,
                                                ultimaFechaTrabajada: nuevoEstado ? new Date().toISOString() : null
                                            })
                                        });
                                        if (res.ok) {
                                            Toast.fire({ icon: 'success', title: nuevoEstado ? 'Manzana completada' : 'Manzana reabierta' });
                                            const resTerr = await fetch(`${api}/territorios/traer?t=${new Date().getTime()}`, { credentials: 'include' });
                                            if (resTerr.ok) {
                                                const terrs = await resTerr.json();
                                                setTerritorios(terrs);
                                                const tNew = terrs.find(t => t.id === tActual.id);
                                                if (tNew) {
                                                    const mNew = tNew.manzanas.find(m => m.id === mActual.id);
                                                    if (mNew) setManzanaSel(mNew);
                                                }
                                            }
                                        }
                                    } catch (e) {
                                        Toast.fire({ icon: 'error', title: 'Error al actualizar manzana' });
                                    }
                                }}
                            >
                                {mActual.completada ? (
                                    <><i className="bi bi-check-circle-fill me-2"></i>Manzana Completada</>
                                ) : (
                                    <><i className="bi bi-check-circle me-2"></i>Marcar Manzana como Terminada</>
                                )}
                            </button>
                        </div>
                    )}
                    {(!mActual.edificios || mActual.edificios.length === 0) ? (
                        <div className="col-12 text-center text-muted py-5">Esta manzana no tiene edificios.</div>
                    ) : (
                        mActual.edificios.map(e => {
                            const total = e.departamentos?.length || 0;
                            const trabajados = e.departamentos?.filter(d => d.estado && d.estado !== 'No visitado').length || 0;
                            const efectivos = e.departamentos?.filter(d => d.estado === 'Atendió').length || 0;
                            const progreso = total === 0 ? 0 : Math.round((trabajados / total) * 100);
                            const efectividad = total === 0 ? 0 : Math.round((efectivos / total) * 100);
                            
                            return (
                                <div className="col-12 col-lg-6" key={e.id}>
                                    <div className="card h-100 border-0 shadow-sm" onClick={() => irAPortero(e)} style={{cursor: 'pointer'}}>
                                        <div className="card-body">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <h5 className="fw-bold m-0">{e.direccion}</h5>
                                                <span className="badge bg-secondary">{e.categoria}</span>
                                            </div>
                                            <div className="text-muted small mb-3">
                                                <i className="bi bi-bell me-1"></i> {total} timbres en total
                                            </div>
                                            <div className="progress" style={{height: '8px'}}>
                                                <div className="progress-bar bg-success" style={{width: `${progreso}%`}}></div>
                                            </div>
                                            <div className="d-flex justify-content-between small fw-bold mt-2">
                                                <span className="text-warning text-darken"><i className="bi bi-star-fill me-1"></i>{efectividad}% Efectividad</span>
                                                <span className="text-success">{progreso}% Cubierto</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {/* VISTA 4: PORTERO ELÉCTRICO */}
            {vistaActual === 'portero' && eActual && (
                <div className="card border-0 shadow-sm bg-body-tertiary">
                    <div className="card-body">
                        <div className="alert alert-info text-center fw-bold shadow-sm">
                            <i className="bi bi-door-open me-2"></i> Portero Eléctrico de {eActual.direccion}
                        </div>
                        
                        <div className="row g-2 justify-content-center mt-4">
                            {(eActual.departamentos || []).sort((a,b) => {
                                // Ordenar por piso (PB primero, luego numérico invertido para que pisos altos queden arriba)
                                // Esto es complejo, pero simplificamos con sort alfanumérico estandar
                                return a.piso.localeCompare(b.piso) || a.letra.localeCompare(b.letra);
                            }).map(dpto => {
                                let btnClass = "btn-light border shadow-sm";
                                let icon = "bi-bell";
                                
                                if (!dpto.tocar) {
                                    btnClass = "btn-danger text-white shadow";
                                    icon = "bi-slash-circle";
                                } else if (dpto.estado === 'Atendió') {
                                    btnClass = "btn-success text-white shadow-sm";
                                    icon = "bi-check-circle";
                                } else if (dpto.estado === 'No en casa' || dpto.estado === 'Ocupado') {
                                    btnClass = "btn-warning text-body shadow-sm";
                                    icon = "bi-house-x";
                                }

                                return <DptoButton key={dpto.id} dpto={dpto} btnClass={btnClass} icon={icon} abrirMenuDpto={abrirMenuDpto} actualizarDpto={actualizarDpto} />;
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA 5: ESTADISTICAS */}
            {vistaActual === 'estadisticas' && (
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <h5 className="m-0 fw-bold"><i className="bi bi-graph-up me-2"></i>Cobertura por Territorios</h5>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle m-0">
                                <thead className="table-light">
                                    <tr>
                                        <th className="fw-bold text-body-secondary">Territorio</th>
                                        <th className="fw-bold text-body-secondary">Manzanas Completadas</th>
                                        <th className="fw-bold text-body-secondary">Última vez trabajado</th>
                                        <th className="fw-bold text-body-secondary">Historial de fechas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {territorios.sort((a,b) => parseInt(a.numero || 0) - parseInt(b.numero || 0)).map(t => {
                                        const totalManzanas = t.manzanas?.length || 0;
                                        const completadas = t.manzanas?.filter(m => m.completada).length || 0;
                                        const progreso = totalManzanas === 0 ? 0 : Math.round((completadas / totalManzanas) * 100);
                                        
                                        // Últimas 3 fechas
                                        const historial = t.fechasTrabajado ? [...t.fechasTrabajado].sort((a,b) => new Date(b) - new Date(a)).slice(0,3) : [];

                                        return (
                                            <tr key={t.id}>
                                                <td className="fw-bold text-primary">Territorio {t.numero}</td>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <span className="me-2 fw-semibold" style={{minWidth: '40px'}}>{completadas}/{totalManzanas}</span>
                                                        <div className="progress flex-grow-1" style={{height: '8px', maxWidth: '100px'}}>
                                                            <div className={`progress-bar ${progreso === 100 ? 'bg-success' : 'bg-primary'}`} style={{width: `${progreso}%`}}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {t.ultimaFechaTrabajada ? (
                                                        <span className="badge bg-body-tertiary text-body border">
                                                            <i className="bi bi-calendar-check me-1"></i>
                                                            {new Date(t.ultimaFechaTrabajada).toLocaleDateString()}
                                                        </span>
                                                    ) : <span className="text-muted small">Nunca</span>}
                                                </td>
                                                <td>
                                                    {historial.length > 0 ? (
                                                        <div className="d-flex flex-wrap gap-1">
                                                            {historial.map((f, i) => (
                                                                <span key={i} className="badge bg-secondary" style={{fontSize: '0.7rem'}}>
                                                                    {new Date(f).toLocaleDateString()}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : <span className="text-muted small">-</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default PredicacionEdificios;
