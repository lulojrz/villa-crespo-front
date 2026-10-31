import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { NumerosContext } from '../context/NumerosContext';

const normalizar = (txt) => {
    if (!txt) return '';
    return txt
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
};

const BuscadorGlobal = () => {
    const { 
        isSearchOpen, 
        cerrarBuscador, 
        territorios, 
        cargarTerritorios, 
        loadingTerritorios,
        numeros 
    } = useContext(NumerosContext);

    const [query, setQuery] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('todos'); // 'todos', 'edificios', 'calles', 'territorios', 'telefonos'
    const [selectedIndex, setSelectedIndex] = useState(0);

    const inputRef = useRef(null);
    const resultsContainerRef = useRef(null);
    const navigate = useNavigate();

    // Cargar territorios al abrir si no están cargados
    useEffect(() => {
        if (isSearchOpen) {
            if (!territorios || territorios.length === 0) {
                cargarTerritorios();
            }
            // Auto focus
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            setSelectedIndex(0);
        } else {
            setQuery('');
            setFiltroTipo('todos');
        }
    }, [isSearchOpen]);

    // Resultados calculados con memoización
    const resultados = useMemo(() => {
        const qNorm = normalizar(query);
        if (!qNorm) return [];

        const terms = qNorm.split(/\s+/).filter(Boolean);
        const matchAllTerms = (str) => {
            const normalizedTarget = normalizar(str);
            return terms.every(term => normalizedTarget.includes(term));
        };

        const resEdificios = [];
        const resCalles = [];
        const resTerritorios = [];
        const resTelefonos = [];

        // 1. Buscar en Territorios, Manzanas y Edificios
        (territorios || []).forEach(t => {
            // Territorio directo
            const matchTerNumero = matchAllTerms(`territorio ${t.numero} ${t.asignadoA?.nombre || ''}`);
            if (matchTerNumero) {
                resTerritorios.push({
                    tipo: 'territorio',
                    id: `ter-${t.id}`,
                    titulo: `Territorio #${t.numero}`,
                    subtitulo: t.asignadoA ? `Asignado a: ${t.asignadoA.nombre} ${t.asignadoA.apellido || ''}` : 'Sin asignar',
                    detalles: `${t.manzanas?.length || 0} manzanas • Última visita: ${t.ultimaFechaTrabajada ? new Date(t.ultimaFechaTrabajada).toLocaleDateString() : 'Sin registro'}`,
                    territorio: t,
                    accion: () => {
                        cerrarBuscador();
                        navigate('/edificios', { state: { territorioId: t.id, t: Date.now() } });
                    }
                });
            }

            (t.manzanas || []).forEach(m => {
                // Calles de la manzana
                const callesManzana = [
                    { nombre: m.calleNorte, lado: 'Norte' },
                    { nombre: m.calleSur, lado: 'Sur' },
                    { nombre: m.calleEste, lado: 'Este' },
                    { nombre: m.calleOeste, lado: 'Oeste' }
                ];

                const callesVistas = new Set();
                callesManzana.forEach(({ nombre, lado }) => {
                    if (nombre && !callesVistas.has(nombre.trim().toLowerCase())) {
                        callesVistas.add(nombre.trim().toLowerCase());
                        if (matchAllTerms(`${nombre} manzana ${m.nombre} territorio ${t.numero}`)) {
                            resCalles.push({
                                tipo: 'calle',
                                id: `calle-${m.id}-${lado}`,
                                titulo: `Calle ${nombre}`,
                                subtitulo: `Lado ${lado} de ${m.nombre} • Territorio #${t.numero}`,
                                detalles: `${m.edificios?.length || 0} edificios en esta manzana`,
                                territorio: t,
                                manzana: m,
                                accion: () => {
                                    cerrarBuscador();
                                    navigate('/edificios', { state: { territorioId: t.id, manzanaId: m.id, t: Date.now() } });
                                }
                            });
                        }
                    }
                });

                // Edificios
                (m.edificios || []).forEach(e => {
                    const textoBusquedaEdificio = `${e.direccion} ${e.categoria || ''} manzana ${m.nombre} territorio ${t.numero}`;
                    if (matchAllTerms(textoBusquedaEdificio)) {
                        const totalDeptos = e.departamentos?.length || (e.cantidadPisos && e.departamentosPorPiso ? e.cantidadPisos * e.departamentosPorPiso : 0);
                        const atendieron = e.departamentos?.filter(d => d.estado === 'Atendió').length || 0;
                        const revisitas = e.departamentos?.filter(d => d.estado === 'Revisita').length || 0;

                        resEdificios.push({
                            tipo: 'edificio',
                            id: `ed-${e.id}`,
                            titulo: e.direccion,
                            subtitulo: `Territorio #${t.numero} • ${m.nombre}`,
                            detalles: `${e.cantidadPisos ? `${e.cantidadPisos} pisos • ` : ''}${totalDeptos} deptos${revisitas > 0 ? ` • ⭐ ${revisitas} revisitas` : ''}${atendieron > 0 ? ` • ✅ ${atendieron} atendieron` : ''}`,
                            territorio: t,
                            manzana: m,
                            edificio: e,
                            accion: () => {
                                cerrarBuscador();
                                navigate('/edificios', { 
                                    state: { 
                                        territorioId: t.id, 
                                        manzanaId: m.id, 
                                        edificioId: e.id, 
                                        t: Date.now() 
                                    } 
                                });
                            }
                        });
                    }
                });
            });
        });

        // 2. Buscar en Números Telefónicos (si están disponibles)
        if (numeros && numeros.length > 0) {
            numeros.forEach(num => {
                const textoNum = `${num.direccion || ''} ${num.numero || ''} ${num.nombre || ''} territorio ${num.territorio || ''}`;
                if (matchAllTerms(textoNum)) {
                    resTelefonos.push({
                        tipo: 'telefono',
                        id: `tel-${num.id}`,
                        titulo: num.direccion || num.numero,
                        subtitulo: `Tel: ${num.numero} ${num.nombre ? `(${num.nombre})` : ''} • Territorio #${num.territorio || '?'}`,
                        detalles: num.contesta ? '✅ Atendió / Contactado' : '⏳ Pendiente / No contesta',
                        numero: num,
                        accion: () => {
                            cerrarBuscador();
                            navigate('/', { 
                                state: { 
                                    activeTab: 'llamar', 
                                    numeroId: num.id, 
                                    timestamp: Date.now() 
                                } 
                            });
                        }
                    });
                }
            });
        }

        return {
            todos: [...resEdificios, ...resCalles, ...resTerritorios, ...resTelefonos.slice(0, 10)],
            edificios: resEdificios,
            calles: resCalles,
            territorios: resTerritorios,
            telefonos: resTelefonos
        };
    }, [query, territorios, numeros]);

    // Filtrar según el tab seleccionado
    const listaFiltrada = useMemo(() => {
        if (!query) return [];
        if (filtroTipo === 'todos') return resultados.todos || [];
        return resultados[filtroTipo] || [];
    }, [query, filtroTipo, resultados]);

    // Resetear selectedIndex al cambiar búsqueda o filtro
    useEffect(() => {
        setSelectedIndex(0);
    }, [query, filtroTipo]);

    // Manejo del teclado (Flechas, Enter, Esc)
    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, Math.max(0, listaFiltrada.length - 1)));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (listaFiltrada[selectedIndex]) {
                listaFiltrada[selectedIndex].accion();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cerrarBuscador();
        }
    };

    if (!isSearchOpen) return null;

    return (
        <div 
            className="modal fade show d-block" 
            tabIndex="-1" 
            style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.65)', 
                backdropFilter: 'blur(5px)',
                zIndex: 1060 
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) cerrarBuscador();
            }}
        >
            <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                <div className="modal-content shadow-lg border-0 rounded-4 overflow-hidden bg-body">
                    
                    {/* Header con Buscador */}
                    <div className="modal-header border-bottom p-3 bg-body">
                        <div className="d-flex align-items-center w-100 gap-2">
                            <i className="bi bi-search text-primary fs-4 ms-1"></i>
                            <input
                                ref={inputRef}
                                type="text"
                                className="form-control form-control-lg border-0 shadow-none bg-transparent fs-5"
                                placeholder="Buscar edificio, calle (ej: Amenábar 2150, Conde) o territorio..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus
                            />
                            {query && (
                                <button 
                                    className="btn btn-sm btn-light rounded-circle text-muted"
                                    onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                                    title="Borrar búsqueda"
                                >
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            )}
                            <button 
                                className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1 ms-2"
                                onClick={cerrarBuscador}
                            >
                                <span className="d-none d-sm-inline me-1">Esc</span>
                                <i className="bi bi-x-lg d-sm-none"></i>
                            </button>
                        </div>
                    </div>

                    {/* Filtros por Categoría */}
                    {query.trim().length > 0 && (
                        <div className="px-3 pt-2 pb-2 border-bottom bg-body-tertiary d-flex gap-2 overflow-auto">
                            <button 
                                className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${filtroTipo === 'todos' ? 'btn-primary' : 'btn-outline-secondary border-0 bg-body'}`}
                                onClick={() => setFiltroTipo('todos')}
                            >
                                Todos ({resultados.todos?.length || 0})
                            </button>
                            <button 
                                className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${filtroTipo === 'edificios' ? 'btn-primary' : 'btn-outline-secondary border-0 bg-body'}`}
                                onClick={() => setFiltroTipo('edificios')}
                            >
                                <i className="bi bi-building me-1"></i> Edificios ({resultados.edificios?.length || 0})
                            </button>
                            <button 
                                className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${filtroTipo === 'calles' ? 'btn-primary' : 'btn-outline-secondary border-0 bg-body'}`}
                                onClick={() => setFiltroTipo('calles')}
                            >
                                <i className="bi bi-geo-alt me-1"></i> Calles ({resultados.calles?.length || 0})
                            </button>
                            <button 
                                className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${filtroTipo === 'territorios' ? 'btn-primary' : 'btn-outline-secondary border-0 bg-body'}`}
                                onClick={() => setFiltroTipo('territorios')}
                            >
                                <i className="bi bi-map me-1"></i> Territorios ({resultados.territorios?.length || 0})
                            </button>
                            {resultados.telefonos?.length > 0 && (
                                <button 
                                    className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${filtroTipo === 'telefonos' ? 'btn-primary' : 'btn-outline-secondary border-0 bg-body'}`}
                                    onClick={() => setFiltroTipo('telefonos')}
                                >
                                    <i className="bi bi-telephone me-1"></i> Teléfonos ({resultados.telefonos?.length || 0})
                                </button>
                            )}
                        </div>
                    )}

                    {/* Contenido / Lista de Resultados */}
                    <div 
                        ref={resultsContainerRef}
                        className="modal-body p-2" 
                        style={{ minHeight: '280px', maxHeight: '55vh' }}
                    >
                        {loadingTerritorios && (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Cargando base de datos...</span>
                                </div>
                                <p className="text-body-secondary small mt-2">Indexando territorios y edificios...</p>
                            </div>
                        )}

                        {!loadingTerritorios && query.trim().length === 0 && (
                            <div className="p-4 text-center">
                                <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex p-3 mb-3">
                                    <i className="bi bi-compass fs-2"></i>
                                </div>
                                <h6 className="fw-bold text-body">Buscador Inteligente Global</h6>
                                <p className="text-body-secondary small mb-4" style={{ maxWidth: '420px', margin: '0 auto' }}>
                                    Escribe el nombre de una calle, una dirección exacta, o el número de territorio para saltar directo a su portero o manzana.
                                </p>
                                
                                {territorios && territorios.length > 0 && (
                                    <div className="text-start mt-3 pt-3 border-top">
                                        <small className="fw-bold text-body-secondary text-uppercase d-block mb-2">
                                            Territorios disponibles:
                                        </small>
                                        <div className="d-flex flex-wrap gap-2">
                                            {territorios.slice(0, 12).map(t => (
                                                <button
                                                    key={t.id}
                                                    className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                                                    onClick={() => {
                                                        cerrarBuscador();
                                                        navigate('/edificios', { state: { territorioId: t.id, t: Date.now() } });
                                                    }}
                                                >
                                                    Territorio {t.numero}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!loadingTerritorios && query.trim().length > 0 && listaFiltrada.length === 0 && (
                            <div className="p-5 text-center text-body-secondary">
                                <i className="bi bi-search fs-1 d-block mb-3 opacity-50"></i>
                                <h6 className="fw-bold text-body">No se encontraron resultados</h6>
                                <p className="small mb-0">
                                    No hay edificios, calles ni territorios que coincidan con <strong>"{query}"</strong>.
                                </p>
                            </div>
                        )}

                        {!loadingTerritorios && query.trim().length > 0 && listaFiltrada.length > 0 && (
                            <div className="list-group list-group-flush rounded-3">
                                {listaFiltrada.map((item, index) => {
                                    const isSelected = index === selectedIndex;
                                    let badgeColor = 'bg-primary';
                                    let badgeIcon = 'bi-building';
                                    let badgeLabel = 'Edificio';

                                    if (item.tipo === 'calle') {
                                        badgeColor = 'bg-info text-dark';
                                        badgeIcon = 'bi-geo-alt';
                                        badgeLabel = 'Calle';
                                    } else if (item.tipo === 'territorio') {
                                        badgeColor = 'bg-success';
                                        badgeIcon = 'bi-map';
                                        badgeLabel = 'Territorio';
                                    } else if (item.tipo === 'telefono') {
                                        badgeColor = 'bg-warning text-dark';
                                        badgeIcon = 'bi-telephone';
                                        badgeLabel = 'Teléfono';
                                    }

                                    return (
                                        <div
                                            key={item.id}
                                            className={`list-group-item list-group-item-action p-3 rounded-3 mb-1 border-0 d-flex justify-content-between align-items-center ${
                                                isSelected ? 'bg-primary bg-opacity-10 border-start border-4 border-primary' : ''
                                            }`}
                                            onClick={item.accion}
                                            style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                        >
                                            <div className="d-flex align-items-start gap-3 flex-grow-1 overflow-hidden me-2">
                                                <div 
                                                    className={`badge ${badgeColor} rounded-pill d-flex align-items-center justify-content-center p-2 flex-shrink-0 mt-1`}
                                                    style={{ width: '32px', height: '32px' }}
                                                >
                                                    <i className={`bi ${badgeIcon} fs-6`}></i>
                                                </div>
                                                <div className="flex-grow-1 overflow-hidden">
                                                    <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                                        <span className="fw-bold text-body fs-6 text-truncate">
                                                            {item.titulo}
                                                        </span>
                                                        <span className={`badge ${badgeColor} rounded-pill small`} style={{ fontSize: '0.65rem' }}>
                                                            {badgeLabel}
                                                        </span>
                                                    </div>
                                                    <div className="small text-body-secondary text-truncate mb-1">
                                                        {item.subtitulo}
                                                    </div>
                                                    <div className="small text-body-tertiary text-truncate" style={{ fontSize: '0.75rem' }}>
                                                        {item.detalles}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="d-flex align-items-center text-primary flex-shrink-0">
                                                <span className="small d-none d-md-inline me-1 fw-semibold">
                                                    {item.tipo === 'edificio' ? 'Abrir Portero' : item.tipo === 'territorio' ? 'Ver Territorio' : item.tipo === 'telefono' ? 'Ir a Llamar' : 'Ver Manzana'}
                                                </span>
                                                <i className="bi bi-chevron-right fs-5"></i>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                    </div>

                    {/* Footer con Atajos */}
                    <div className="modal-footer border-top p-2 px-3 bg-body-tertiary d-flex justify-content-between align-items-center small text-body-secondary">
                        <div className="d-flex gap-3">
                            <span><kbd className="bg-body text-body border px-1">↑</kbd> <kbd className="bg-body text-body border px-1">↓</kbd> Navegar</span>
                            <span><kbd className="bg-body text-body border px-1">Enter</kbd> Seleccionar</span>
                            <span><kbd className="bg-body text-body border px-1">Esc</kbd> Cerrar</span>
                        </div>
                        <span className="text-body-tertiary d-none d-sm-inline">
                            Villa Crespo CRM
                        </span>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default BuscadorGlobal;
