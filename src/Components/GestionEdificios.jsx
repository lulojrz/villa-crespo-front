import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { exportarS13 } from '../utils/exportS13';

const GestionEdificios = () => {
    const [territorios, setTerritorios] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [territorioSeleccionado, setTerritorioSeleccionado] = useState(null);
    const [manzanaSeleccionada, setManzanaSeleccionada] = useState(null);
    const [edificioSeleccionado, setEdificioSeleccionado] = useState(null);

    const api = import.meta.env.VITE_API_URL;
    const Toast = Swal.mixin({
        toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const timestamp = new Date().getTime();
            const resTerr = await fetch(`${api}/territorios/traer?t=${timestamp}`, { credentials: 'include' });
            if (resTerr.ok) setTerritorios(await resTerr.json());

            const resUsu = await fetch(`${api}/usuarios?t=${timestamp}`, { credentials: 'include' });
            if (resUsu.ok) setUsuarios(await resUsu.json());
        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ... (Mantener las funciones de territorio y manzana intactas) ...
    const agregarTerritorio = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Nuevo Territorio (Edificios)',
            html: `
                <input id="swal-num" class="swal2-input" placeholder="Número o Nombre (Ej: 15)">
                <div class="mt-3 text-start" style="width: 80%; margin: 0 auto;">
                    <label class="form-label text-muted small mb-1">Imagen del mapa (Opcional)</label>
                    <input type="file" id="swal-img-file" class="form-control" accept="image/*">
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Crear',
            preConfirm: () => {
                const numero = document.getElementById('swal-num').value;
                const fileInput = document.getElementById('swal-img-file');
                
                if (!numero) {
                    Swal.showValidationMessage('El número de territorio es obligatorio');
                    return false;
                }
                
                return new Promise((resolve) => {
                    if (fileInput.files.length > 0) {
                        const file = fileInput.files[0];
                        if (file.size > 5 * 1024 * 1024) {
                            Swal.showValidationMessage('La imagen es muy pesada (Máximo 5MB)');
                            resolve(false);
                            return;
                        }
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            resolve({ numero: numero, imagen: e.target.result });
                        };
                        reader.onerror = () => {
                            Swal.showValidationMessage('Error al leer la imagen');
                            resolve(false);
                        };
                        reader.readAsDataURL(file);
                    } else {
                        resolve({ numero: numero, imagen: null });
                    }
                });
            }
        });

        if (formValues && formValues.numero) {
            try {
                const res = await fetch(`${api}/territorios/agregar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(formValues)
                });
                if (res.ok) {
                    Toast.fire({ icon: 'success', title: 'Territorio creado' });
                    fetchData();
                } else throw new Error("Error backend");
            } catch (e) {
                Toast.fire({ icon: 'error', title: 'No se pudo crear el territorio' });
            }
        }
    };

    const editarAsignacion = async (territorio, asignadoAId) => {
        const usuarioAsignado = usuarios.find(u => u.id === parseInt(asignadoAId));
        const updated = { ...territorio, asignadoA: usuarioAsignado || null };
        try {
            const res = await fetch(`${api}/territorios/editar/${territorio.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(updated)
            });
            if (res.ok) {
                Toast.fire({ icon: 'success', title: 'Asignación actualizada' });
                fetchData();
            }
        } catch (e) {
            Toast.fire({ icon: 'error', title: 'Error al actualizar' });
        }
    };

    const borrarTerritorio = async (id) => {
        const result = await Swal.fire({
            title: '¿Borrar Territorio?',
            text: "Se borrarán también todas sus manzanas y edificios.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--bs-danger)',
            confirmButtonText: 'Sí, borrar'
        });
        if (result.isConfirmed) {
            try {
                const res = await fetch(`${api}/territorios/borrar/${id}`, { method: 'DELETE', credentials: 'include' });
                if (res.ok) {
                    Toast.fire({ icon: 'success', title: 'Territorio borrado' });
                    setTerritorioSeleccionado(null);
                    fetchData();
                }
            } catch (e) {}
        }
    };

    const agregarManzana = async (territorioId) => {
        const { value: formValues } = await Swal.fire({
            title: 'Nueva Manzana',
            html: `
                <input id="swal-nombre" class="swal2-input" placeholder="Nombre (Ej: Manzana 1)">
                <input id="swal-norte" class="swal2-input" placeholder="Calle Norte">
                <input id="swal-sur" class="swal2-input" placeholder="Calle Sur">
                <input id="swal-este" class="swal2-input" placeholder="Calle Este">
                <input id="swal-oeste" class="swal2-input" placeholder="Calle Oeste">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Crear',
            preConfirm: () => {
                return {
                    nombre: document.getElementById('swal-nombre').value,
                    calleNorte: document.getElementById('swal-norte').value,
                    calleSur: document.getElementById('swal-sur').value,
                    calleEste: document.getElementById('swal-este').value,
                    calleOeste: document.getElementById('swal-oeste').value,
                    territorio: { id: territorioId }
                }
            }
        });
        if (formValues && formValues.nombre) {
            try {
                const res = await fetch(`${api}/manzanas/agregar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(formValues)
                });
                if (res.ok) {
                    Toast.fire({ icon: 'success', title: 'Manzana creada' });
                    fetchData();
                }
            } catch (e) {}
        }
    };

    const borrarManzana = async (id) => {
        if (confirm("¿Seguro que deseas borrar esta manzana?")) {
            try {
                const res = await fetch(`${api}/manzanas/borrar/${id}`, { method: 'DELETE', credentials: 'include' });
                if (res.ok) {
                    Toast.fire({ icon: 'success', title: 'Manzana borrada' });
                    fetchData();
                }
            } catch (e) {}
        }
    };

    // Funciones para Edificios
    const agregarEdificio = async (manzanaId) => {
        const { value: formValues } = await Swal.fire({
            title: 'Nuevo Edificio',
            html: `
                <input id="swal-dir" class="swal2-input" placeholder="Dirección (Ej: Cabildo 2040)">
                <select id="swal-cat" class="swal2-input">
                    <option value="Edificio">Edificio (con departamentos)</option>
                    <option value="Casa">Casa (Única)</option>
                    <option value="Negocio">Negocio / Local</option>
                    <option value="Telefónica">Solo Telefónica</option>
                </select>
                <input id="swal-pisos" type="number" class="swal2-input" placeholder="Cantidad de Pisos (Ej: 10)">
                <input id="swal-dptos" type="number" class="swal2-input" placeholder="Timbres por Piso (Ej: 4)">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Crear y Autogenerar',
            preConfirm: () => {
                const dir = document.getElementById('swal-dir').value;
                const cat = document.getElementById('swal-cat').value;
                const pisos = parseInt(document.getElementById('swal-pisos').value) || 1;
                const dptos = parseInt(document.getElementById('swal-dptos').value) || 1;
                
                if (!dir) {
                    Swal.showValidationMessage('La dirección es obligatoria');
                    return false;
                }
                
                // Autogeneración de departamentos
                const letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
                const departamentos = [];
                
                // Si es Casa o Negocio, solo creamos 1 timbre
                if (cat === 'Casa' || cat === 'Negocio') {
                    departamentos.push({ piso: "PB", letra: "-", estado: "No visitado", tocar: true });
                } else {
                    for (let p = 0; p <= pisos; p++) {
                        let pisoNombre = p === 0 ? "PB" : p.toString();
                        for (let d = 0; d < dptos; d++) {
                            let letraNombre = letras[d] || (d+1).toString();
                            departamentos.push({
                                piso: pisoNombre,
                                letra: letraNombre,
                                estado: "No visitado",
                                tocar: true
                            });
                        }
                    }
                }
                
                return {
                    direccion: dir,
                    categoria: cat,
                    cantidadPisos: cat === 'Casa' || cat === 'Negocio' ? 1 : pisos,
                    departamentosPorPiso: cat === 'Casa' || cat === 'Negocio' ? 1 : dptos,
                    manzana: { id: manzanaId },
                    departamentos: departamentos
                };
            }
        });

        if (formValues && formValues.direccion) {
            Swal.fire({ title: 'Creando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                const res = await fetch(`${api}/edificios/agregar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(formValues)
                });
                if (res.ok) {
                    Swal.fire('Éxito', 'Edificio y timbres creados', 'success');
                    fetchData();
                }
            } catch (e) {
                Swal.fire('Error', 'No se pudo crear', 'error');
            }
        }
    };

    const borrarEdificio = async (id) => {
        if (confirm("¿Borrar este edificio y todos sus timbres?")) {
            try {
                const res = await fetch(`${api}/edificios/borrar/${id}`, { method: 'DELETE', credentials: 'include' });
                if (res.ok) {
                    Toast.fire({ icon: 'success', title: 'Borrado' });
                    setEdificioSeleccionado(null);
                    fetchData();
                }
            } catch (e) {}
        }
    };
    
    const agregarDptoManual = async (edificioId) => {
        const { value: formValues } = await Swal.fire({
            title: 'Agregar Timbre Manual',
            html: `
                <input id="swal-p" class="swal2-input" placeholder="Piso (Ej: PB, 1, Local)">
                <input id="swal-l" class="swal2-input" placeholder="Letra/Nombre (Ej: Portería)">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Agregar',
            preConfirm: () => {
                return {
                    piso: document.getElementById('swal-p').value,
                    letra: document.getElementById('swal-l').value,
                    estado: "No visitado",
                    tocar: true,
                    edificio: { id: edificioId }
                }
            }
        });
        if (formValues && formValues.piso) {
            try {
                const res = await fetch(`${api}/departamentos/agregar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(formValues)
                });
                if (res.ok) fetchData();
            } catch (e) {}
        }
    };

    const borrarDpto = async (id) => {
        if (confirm("¿Borrar este timbre?")) {
            try {
                const res = await fetch(`${api}/departamentos/borrar/${id}`, { method: 'DELETE', credentials: 'include' });
                if (res.ok) fetchData();
            } catch (e) {}
        }
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

    const currentTerritorioFull = territorioSeleccionado ? territorios.find(t => t.id === territorioSeleccionado.id) : null;
    const currentManzanaFull = currentTerritorioFull && manzanaSeleccionada ? currentTerritorioFull.manzanas.find(m => m.id === manzanaSeleccionada.id) : null;
    const currentEdificioFull = currentManzanaFull && edificioSeleccionado ? currentManzanaFull.edificios?.find(e => e.id === edificioSeleccionado.id) : null;

    return (
        <div className="mt-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="h5 text-primary m-0">Gestión de Territorios (Edificios)</h3>
                <button className="btn btn-outline-danger btn-sm fw-bold shadow-sm" onClick={() => exportarS13(territorios)}>
                    <i className="bi bi-file-earmark-pdf-fill me-2"></i>Exportar S-13 (Registro)
                </button>
            </div>
            
            <div className="row g-4">
                {/* LISTA DE TERRITORIOS (Se oculta si entramos a una manzana) */}
                {!manzanaSeleccionada && (
                    <div className="col-12 col-md-5 col-lg-4">
                        <div className="card shadow-sm border-0 bg-body-tertiary">
                            <div className="card-header bg-transparent border-bottom-0 pt-3 pb-0 d-flex justify-content-between align-items-center">
                                <h5 className="fw-bold m-0"><i className="bi bi-map text-warning me-2"></i>Territorios</h5>
                                <button className="btn btn-sm btn-outline-success rounded-circle" onClick={agregarTerritorio} title="Agregar Territorio">
                                    <i className="bi bi-plus-lg"></i>
                                </button>
                            </div>
                            <div className="card-body">
                                {territorios.length === 0 ? (
                                    <p className="text-muted small text-center">No hay territorios creados.</p>
                                ) : (
                                    <div className="list-group list-group-flush border-0">
                                        {territorios.map(t => (
                                            <button 
                                                key={t.id} 
                                                onClick={() => setTerritorioSeleccionado(t)}
                                                className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center rounded-3 mb-1 border-0 ${territorioSeleccionado?.id === t.id ? 'active shadow-sm' : 'bg-body'}`}
                                            >
                                                <div>
                                                    <div className="fw-bold">Territorio {t.numero}</div>
                                                    <small className={territorioSeleccionado?.id === t.id ? 'text-white-50' : 'text-muted'}>
                                                        {t.manzanas?.length || 0} manzanas
                                                    </small>
                                                </div>
                                                <i className="bi bi-chevron-right"></i>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* DETALLE DEL TERRITORIO O MANZANA */}
                <div className={manzanaSeleccionada ? "col-12" : "col-12 col-md-7 col-lg-8"}>
                    
                    {/* VISTA: EDIFICIO -> DEPARTAMENTOS */}
                    {edificioSeleccionado && currentEdificioFull ? (
                        <div className="card shadow-sm border-0 animate__animated animate__fadeIn">
                            <div className="card-header bg-body border-bottom-0 pt-4 pb-2 d-flex justify-content-between align-items-center">
                                <div>
                                    <button className="btn btn-sm btn-light me-3 rounded-pill" onClick={() => setEdificioSeleccionado(null)}>
                                        <i className="bi bi-arrow-left"></i> Volver a Edificios
                                    </button>
                                    <span className="h5 fw-bold mb-0 text-primary">{currentEdificioFull.direccion}</span>
                                    <span className="badge bg-secondary ms-2">{currentEdificioFull.categoria}</span>
                                </div>
                                <div>
                                    <button className="btn btn-success btn-sm rounded-pill shadow-sm me-2" onClick={() => agregarDptoManual(currentEdificioFull.id)}>
                                        <i className="bi bi-plus"></i> Timbre Manual
                                    </button>
                                </div>
                            </div>
                            <div className="card-body bg-body-tertiary">
                                <div className="row g-2">
                                    {(currentEdificioFull.departamentos || []).sort((a,b) => a.piso.localeCompare(b.piso) || a.letra.localeCompare(b.letra)).map(dpto => (
                                        <div className="col-4 col-sm-3 col-md-2" key={dpto.id}>
                                            <div className="card border-0 shadow-sm text-center position-relative">
                                                <div className="card-body p-2">
                                                    <button className="btn btn-sm btn-link text-danger position-absolute" style={{top: -5, right: -5, padding: 0}} onClick={() => borrarDpto(dpto.id)}>
                                                        <i className="bi bi-x-circle-fill"></i>
                                                    </button>
                                                    <div className="fw-bold">{dpto.piso}-{dpto.letra}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : 
                    
                    /* VISTA: MANZANA -> EDIFICIOS */
                    manzanaSeleccionada && currentManzanaFull ? (
                        <div className="card shadow-sm border-0 animate__animated animate__fadeIn">
                            <div className="card-header bg-body border-bottom-0 pt-4 pb-2 d-flex justify-content-between align-items-center">
                                <div>
                                    <button className="btn btn-sm btn-light me-3 rounded-pill" onClick={() => setManzanaSeleccionada(null)}>
                                        <i className="bi bi-arrow-left"></i> Volver a Manzanas
                                    </button>
                                    <span className="h5 fw-bold mb-0 text-primary">{currentManzanaFull.nombre}</span>
                                </div>
                                <button className="btn btn-success btn-sm rounded-pill shadow-sm" onClick={() => agregarEdificio(currentManzanaFull.id)}>
                                    <i className="bi bi-plus-lg me-1"></i> Nuevo Edificio
                                </button>
                            </div>
                            <div className="card-body bg-body-tertiary">
                                <div className="row g-3">
                                    {(!currentManzanaFull.edificios || currentManzanaFull.edificios.length === 0) ? (
                                        <div className="col-12 text-center py-4 text-muted">
                                            No hay edificios creados en esta manzana.
                                        </div>
                                    ) : (
                                        currentManzanaFull.edificios.map(e => (
                                            <div className="col-12 col-md-6 col-xl-4" key={e.id}>
                                                <div className="card h-100 border-0 shadow-sm">
                                                    <div className="card-body">
                                                        <div className="d-flex justify-content-between">
                                                            <h6 className="fw-bold">{e.direccion}</h6>
                                                            <button className="btn btn-sm btn-link text-danger p-0" onClick={() => borrarEdificio(e.id)}><i className="bi bi-trash"></i></button>
                                                        </div>
                                                        <span className="badge bg-secondary mb-2">{e.categoria}</span>
                                                        <div className="text-muted small mb-3">
                                                            {e.departamentos?.length || 0} timbres configurados
                                                        </div>
                                                        <button className="btn btn-outline-primary btn-sm w-100" onClick={() => setEdificioSeleccionado(e)}>
                                                            <i className="bi bi-grid-3x3-gap"></i> Editar Timbres
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : 
                    
                    /* VISTA: TERRITORIO -> MANZANAS */
                    currentTerritorioFull ? (
                        <div className="card shadow-sm border-0 animate__animated animate__fadeIn">
                            <div className="card-body p-4">
                                <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-2">
                                    <div>
                                        <h4 className="fw-bold text-primary m-0">Territorio {currentTerritorioFull.numero}</h4>
                                        <p className="text-muted mb-0 small">ID: {currentTerritorioFull.id}</p>
                                    </div>
                                    <button className="btn btn-outline-danger btn-sm rounded-pill px-3" onClick={() => borrarTerritorio(currentTerritorioFull.id)}>
                                        <i className="bi bi-trash3 me-1"></i> Eliminar Territorio
                                    </button>
                                </div>

                                <div className="row mb-4 bg-body-tertiary p-3 rounded-3 g-3">
                                    <div className="col-12 col-md-6">
                                        <label className="form-label fw-semibold text-body-secondary small mb-1">Asignar a:</label>
                                        <select 
                                            className="form-select border-0 shadow-sm"
                                            value={currentTerritorioFull.asignadoA?.id || ""}
                                            onChange={(e) => editarAsignacion(currentTerritorioFull, e.target.value)}
                                        >
                                            <option value="">-- Disponible (Sin asignar) --</option>
                                            {usuarios.map(u => (
                                                <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-12 col-md-6">
                                        {currentTerritorioFull.imagen && (
                                            <button type="button" className="btn btn-outline-secondary w-100 h-100 d-flex align-items-center justify-content-center border-0 shadow-sm bg-body p-3" disabled title="La visualización de mapas está temporalmente deshabilitada.">
                                                <i className="bi bi-map fs-4 me-2"></i> <span className="fw-semibold">Mapa en actualización</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="fw-bold m-0"><i className="bi bi-grid-3x3 text-body-secondary me-2"></i>Manzanas</h5>
                                    <button className="btn btn-success btn-sm px-3 rounded-pill fw-semibold shadow-sm" onClick={() => agregarManzana(currentTerritorioFull.id)}>
                                        <i className="bi bi-plus-lg me-1"></i> Nueva Manzana
                                    </button>
                                </div>

                                {(!currentTerritorioFull.manzanas || currentTerritorioFull.manzanas.length === 0) ? (
                                    <div className="alert alert-light border text-center py-4 text-muted">
                                        <i className="bi bi-building fs-1 d-block mb-2 text-body-secondary opacity-50"></i>
                                        No hay manzanas creadas en este territorio.
                                    </div>
                                ) : (
                                    <div className="row g-3">
                                        {currentTerritorioFull.manzanas.map(m => (
                                            <div className="col-12 col-xl-6" key={m.id}>
                                                <div className="card h-100 border bg-body rounded-3 shadow-sm position-relative">
                                                    <div className="card-body">
                                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                                            <h6 className="fw-bold text-primary m-0">{m.nombre}</h6>
                                                            <button className="btn btn-link text-danger p-0" onClick={() => borrarManzana(m.id)}>
                                                                <i className="bi bi-x-circle-fill fs-5"></i>
                                                            </button>
                                                        </div>
                                                        <div className="text-muted small lh-sm mb-3">
                                                            <div><span className="fw-semibold">Calles:</span> {m.calleNorte}, {m.calleSur}, {m.calleEste}, {m.calleOeste}</div>
                                                        </div>
                                                        <button className="btn btn-primary btn-sm w-100 fw-semibold" onClick={() => setManzanaSeleccionada(m)}>
                                                            Gestionar Edificios ({m.edificios?.length || 0})
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="card shadow-sm border-0 h-100 bg-body-tertiary d-flex align-items-center justify-content-center py-5">
                            <div className="text-center text-muted">
                                <i className="bi bi-map fs-1 mb-3 d-block opacity-50"></i>
                                <h5>Selecciona un territorio</h5>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default GestionEdificios;
