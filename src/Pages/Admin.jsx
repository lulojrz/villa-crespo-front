import React, { useContext, useState, useEffect } from 'react'
import { NumerosContext } from '../context/NumerosContext'
import FormularioAgregar from '../Components/FormularioAgregar.jsx'
import ListaNumeros from '../Components/ListaNumeros.jsx'
import MisLlamados from '../Components/MisLlamados.jsx'
import PorEliminar from '../Components/PorEliminar.jsx'
import TerritoriosPersonales from '../Components/TerritoriosPersonales.jsx'
import GestionPuntos from '../Components/GestionPuntos.jsx'
import GestionPlantillas from '../Components/GestionPlantillas.jsx'
import GestionTurnos from '../Components/GestionTurnos.jsx'
import GenerarTurnos from '../Components/GenerarTurnos.jsx'
import GestionReportes from '../Components/GestionReportes.jsx'
import MisTurnosPublicos from '../Components/MisTurnosPublicos.jsx'
import EstadisticasDashboard from '../Components/EstadisticasDashboard.jsx'
import GestionEdificios from '../Components/GestionEdificios.jsx'
import AdminSalidas from '../Components/AdminSalidas.jsx'
import { exportarInformePublicaPDF } from '../utils/exportPublicaPDF.js'
import { Link } from 'react-router-dom'
import {
    puedeAdministrarPublica,
    puedeAdministrarTelefonica,
    puedeAdministrarEdificios,
    puedeAdministrarTodo,
    puedeAdministrarUsuarios,
    normalizarRol
} from '../utils/permisos'

const Admin = () => {
  const { numeros } = useContext(NumerosContext)
  const numerosContestados = numeros.filter(numero => numero.contesta);
  const [clickeditar, setClickeditar] = useState(false)
  const [clickagregar, setClickagregar] = useState(false)
  const [clickllamados, setClickllamados] = useState(false)
  const [clickReservas, setClickReservas] = useState(false)
  const [clickPorEliminar, setClickPorEliminar] = useState(false)

  const [privilegio, setPrivilegio] = useState(() => localStorage.getItem('privilegio') || '')
  const [asignacion, setAsignacion] = useState(() => localStorage.getItem('asignacion') || '')

  const isTelefonicaAdmin = puedeAdministrarTelefonica(privilegio, asignacion)
  const isPublicaAdmin = puedeAdministrarPublica(privilegio, asignacion)
  const isEdificiosAdmin = puedeAdministrarEdificios(privilegio, asignacion)
  const isFullAdmin = puedeAdministrarTodo(privilegio, asignacion)
  const isUsuariosAdmin = puedeAdministrarUsuarios(privilegio, asignacion)

  // Si solo puede administrar pública, abrimos directamente la pestaña pública
  const [tabActiva, setTabActiva] = useState(() => {
    if (isPublicaAdmin && !isTelefonicaAdmin) {
      return 'publica';
    }
    return 'telefonica';
  })

  const [subTabPublica, setSubTabPublica] = useState('generar')

  useEffect(() => {
    const fetchPrivilegio = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/usuarios`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          const loggedInUsername = localStorage.getItem('usuario');
          const currentUser = data.find(u => u.usuario === loggedInUsername);
          if (currentUser) {
            const nuevoPriv = normalizarRol(currentUser.privilegio);
            const nuevaAsig = currentUser.asignacion || '';
            localStorage.setItem('asignacion', nuevaAsig);
            localStorage.setItem('privilegio', nuevoPriv);
            setPrivilegio(nuevoPriv);
            setAsignacion(nuevaAsig);
          }
        }
      } catch (error) {
        console.error("Error al refrescar datos del usuario:", error);
      }
    };
    fetchPrivilegio();
  }, []);

  return (
    <div className='container my-5'> 
        <div className='card shadow-lg p-4'> 
            <div className="d-flex justify-content-between align-items-center flex-wrap mb-4">
                <h1 className="h2 mb-2 mb-md-0">Panel de Administración</h1> 
                <div className="d-flex gap-2 align-items-center flex-wrap">
                    {isUsuariosAdmin && (
                        <Link to="/admin/usuarios" className="btn btn-info fw-semibold text-body shadow-sm">
                            <i className="bi bi-people-fill me-2"></i>Gestión de Usuarios
                        </Link>
                    )}
                    <Link to="/admin/perfil" className="btn btn-outline-secondary">
                        Mi Perfil
                    </Link>
                    <Link to="/" className="btn btn-danger">
                        Volver
                    </Link>
                </div>
            </div>

            {/* Pestañas Principales */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button 
                        className={`nav-link fw-bold ${tabActiva === 'telefonica' ? 'active' : 'text-body-secondary'}`} 
                        onClick={() => setTabActiva('telefonica')}
                        style={tabActiva === 'telefonica' ? { color: 'var(--bs-primary)' } : {}}
                    >
                        <i className="bi bi-telephone-fill me-2"></i>Predicación Telefónica
                    </button>
                </li>
                <li className="nav-item">
                    <button 
                        className={`nav-link fw-bold ${tabActiva === 'publica' ? 'active' : 'text-body-secondary'}`} 
                        onClick={() => setTabActiva('publica')}
                        style={tabActiva === 'publica' ? { color: '#198754' } : {}}
                    >
                        <i className="bi bi-geo-alt-fill me-2"></i>Predicación Pública
                    </button>
                </li>
                {isEdificiosAdmin && (
                    <li className="nav-item">
                        <button 
                            className={`nav-link fw-bold ${tabActiva === 'edificios' ? 'active' : 'text-body-secondary'}`} 
                            onClick={() => setTabActiva('edificios')}
                            style={tabActiva === 'edificios' ? { color: '#fd7e14' } : {}}
                        >
                            <i className="bi bi-building me-2"></i>Predicación de Edificios
                        </button>
                    </li>
                )}
                {isFullAdmin && (
                    <li className="nav-item">
                        <button 
                            className={`nav-link fw-bold ${tabActiva === 'salidas' ? 'active' : 'text-body-secondary'}`} 
                            onClick={() => setTabActiva('salidas')}
                            style={tabActiva === 'salidas' ? { color: '#0dcaf0' } : {}}
                        >
                            <i className="bi bi-calendar-range me-2"></i>Salidas de Predicación
                        </button>
                    </li>
                )}
                {isFullAdmin && (
                    <li className="nav-item">
                        <button 
                            className={`nav-link fw-bold ${tabActiva === 'estadisticas' ? 'active' : 'text-body-secondary'}`} 
                            onClick={() => setTabActiva('estadisticas')}
                            style={tabActiva === 'estadisticas' ? { color: '#6f42c1' } : {}}
                        >
                            <i className="bi bi-graph-up me-2"></i>Estadísticas
                        </button>
                    </li>
                )}
            </ul>

            {tabActiva === 'telefonica' && (
                <>
                    <h3 className="h5">
                        {isTelefonicaAdmin ? 'Elija una opción (Telefónica)' : 'Mis Registros (Telefónica)'}
                    </h3>

                    <div className='container-buttons d-grid gap-3 d-md-flex mt-3 mb-4'>
                        {isTelefonicaAdmin && (
                            <>
                                <button 
                                    className={`btn flex-fill fw-semibold ${clickeditar ? 'btn-primary' : 'btn-outline-primary'}`} 
                                    onClick={() => { setClickeditar(true); setClickagregar(false); setClickllamados(false); setClickPorEliminar(false); setClickReservas(false); }}
                                >
                                    Editar Números
                                </button>
                                <button 
                                    className={`btn flex-fill fw-semibold ${clickagregar && !clickeditar && !clickllamados && !clickPorEliminar && !clickReservas ? 'btn-success' : 'btn-outline-success'}`}
                                    onClick={() => { setClickagregar(true); setClickeditar(false); setClickllamados(false); setClickPorEliminar(false); setClickReservas(false); }}
                                >
                                    Agregar Nuevo
                                </button>
                            </>
                        )}
                        <button 
                            className={`btn flex-fill fw-semibold ${clickllamados ? 'btn-warning text-body' : 'btn-outline-warning text-body'}`}
                            onClick={() => { setClickllamados(true); setClickeditar(false); setClickagregar(false); setClickPorEliminar(false); setClickReservas(false); }}
                        >
                            Mis Llamados
                        </button>
                        <button 
                            className={`btn flex-fill fw-semibold ${clickReservas ? 'btn-info text-white' : 'btn-outline-info'}`}
                            onClick={() => { setClickReservas(true); setClickllamados(false); setClickeditar(false); setClickagregar(false); setClickPorEliminar(false); }}
                        >
                            Territorios Personales <span className="badge bg-secondary ms-1" style={{ fontSize: '0.65rem' }}>Próximamente</span>
                        </button>
                        {isTelefonicaAdmin && (
                            <button 
                                className={`btn flex-fill fw-semibold ${clickPorEliminar ? 'btn-danger text-white' : 'btn-outline-danger'}`}
                                onClick={() => { setClickPorEliminar(true); setClickeditar(false); setClickagregar(false); setClickPorEliminar(false); setClickReservas(false); }}
                            >
                                Por Eliminar
                            </button>
                        )}
                    </div>

                    {clickeditar && isTelefonicaAdmin && (
                        <div className="mb-4">
                            <h3 className="h4 text-primary">Progreso</h3>
                            <h5 className="text-body-secondary">Números contestados: {
                                numerosContestados.length !== 0 ? 
                                Math.round((numerosContestados.length / numeros.length) * 100) + "%" : "0%"
                            }</h5>
                            <hr />
                        </div>
                    )}

                    {clickPorEliminar && isTelefonicaAdmin ? (
                        <PorEliminar />
                    ) : clickllamados ? (
                        <MisLlamados />
                    ) : clickReservas ? (
                        <TerritoriosPersonales />
                    ) : clickeditar && isTelefonicaAdmin ? (
                        <ListaNumeros />
                    ) : isTelefonicaAdmin && clickagregar ? (
                        <FormularioAgregar />
                    ) : (
                        <MisLlamados />
                    )}
                </>
            )}

            {tabActiva === 'publica' && (
                <>
                    {isPublicaAdmin ? (
                        <>
                            <h3 className="h5">Elija una opción (Pública)</h3>
                            <div className='container-buttons d-grid gap-3 d-md-flex mt-3 mb-4 flex-wrap'>
                                <button
                                    className={`btn flex-fill fw-semibold ${subTabPublica === 'generar' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setSubTabPublica('generar')}
                                >
                                    <i className="bi bi-magic me-1"></i> Generar turnos
                                </button>
                                <button 
                                    className={`btn flex-fill fw-semibold ${subTabPublica === 'plantillas' ? 'btn-info text-white' : 'btn-outline-info'}`}
                                    onClick={() => setSubTabPublica('plantillas')}
                                >
                                    <i className="bi bi-layout-text-window me-1"></i> Plantillas de Horarios
                                </button>
                                <button 
                                    className={`btn flex-fill fw-semibold ${subTabPublica === 'puntos' ? 'btn-success' : 'btn-outline-success'}`}
                                    onClick={() => setSubTabPublica('puntos')}
                                >
                                    <i className="bi bi-geo-alt-fill me-1"></i> Gestión de Puntos
                                </button>
                                <button 
                                    className={`btn flex-fill fw-semibold ${subTabPublica === 'reportes' ? 'btn-warning' : 'btn-outline-warning'}`}
                                    onClick={() => setSubTabPublica('reportes')}
                                >
                                    <i className="bi bi-list-task me-1"></i> To-Do Reportes
                                </button>
                                <button 
                                    type="button"
                                    className="btn flex-fill fw-semibold btn-outline-danger shadow-sm"
                                    onClick={() => exportarInformePublicaPDF()}
                                    title="Descargar PDF con hermanos aptos y puntos trabajados hasta hoy"
                                >
                                    <i className="bi bi-file-earmark-pdf-fill me-1"></i> Descargar Informe PDF
                                </button>
                            </div>
                            
                            {subTabPublica === 'plantillas' ? (
                                <GestionPlantillas />
                            ) : subTabPublica === 'puntos' ? (
                                <GestionPuntos />
                            ) : subTabPublica === 'reportes' ? (
                                <GestionReportes />
                            ) : (
                                <GenerarTurnos onIrAPlantillas={() => setSubTabPublica('plantillas')} />
                            )}
                        </>
                    ) : (
                        <MisTurnosPublicos />
                    )}
                </>
            )}

            {tabActiva === 'estadisticas' && isFullAdmin && (
                <EstadisticasDashboard />
            )}

            {tabActiva === 'edificios' && isEdificiosAdmin && (
                <GestionEdificios />
            )}

            {tabActiva === 'salidas' && isFullAdmin && (
                <AdminSalidas />
            )}

        </div> 
    </div>
  )
}

export default Admin
