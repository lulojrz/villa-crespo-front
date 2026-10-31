import { useState, useContext, lazy, Suspense, useEffect } from 'react' // 1. Importamos lazy y Suspense
import { Routes, Route } from 'react-router-dom'
import './App.css'

import { NumerosContext } from './context/NumerosContext'
import RutasProtegidas from './rutas/RutasProtegidas'
import BuscadorGlobal from './Components/BuscadorGlobal'
import { puedeAdministrarUsuarios } from './utils/permisos'

// 2. Componentes estáticos (Los que se necesitan SI O SI al cargar la app de entrada)
import Home from './Pages/Home'
import Login from './Pages/Login'

// 3. Componentes perezosos (Se descargarán por separado en "chunks" solo cuando el usuario navegue a ellos)
const Admin = lazy(() => import('./Pages/Admin'))
const AdminUsuarios = lazy(() => import('./Pages/AdminUsuarios'))
const CambiarContrasena = lazy(() => import('./Pages/CambiarContrasena'))
const Experiencias = lazy(() => import('./Pages/Experiencias'))
const Campanas = lazy(() => import('./Pages/Campanas'))
const PredicacionPublica = lazy(() => import('./Pages/PredicacionPublica'))
const PredicacionEdificios = lazy(() => import('./Pages/PredicacionEdificios'))
const MisRevisitas = lazy(() => import('./Pages/MisRevisitas'))
const MisDisponibilidades = lazy(() => import('./Components/MisDisponibilidades'))
const ProgramaPredicacion = lazy(() => import('./Components/ProgramaPredicacion'))

function App() {
  const { numero, numeros, error, loading, setNumero, isAuthenticated } = useContext(NumerosContext)
  
  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <>
      <BuscadorGlobal />
      {/* 4. Envolvemos las rutas en Suspense e inyectamos un spinner de Bootstrap como fallback temporal */}
      <Suspense fallback={
        <div className="d-flex min-vh-100 justify-content-center align-items-center bg-body-tertiary">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando sección...</span>
          </div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Home numero={numero} numeros={numeros} error={error} loading={loading} setNumero={setNumero} />} />
          <Route path='/login' element={<Login />} />
          
          <Route path='/admin' element={
            <RutasProtegidas isAuthenticated={isAuthenticated}><Admin /></RutasProtegidas>
          } />
          
          <Route path='/admin/usuarios' element={
            <RutasProtegidas isAuthenticated={isAuthenticated} permisoRequerido={puedeAdministrarUsuarios}><AdminUsuarios /></RutasProtegidas>
          } />
          
          <Route path='/admin/perfil' element={
            <RutasProtegidas isAuthenticated={isAuthenticated}><CambiarContrasena /></RutasProtegidas>
          } />
          
          <Route path='/experiencias' element={
            <RutasProtegidas isAuthenticated={isAuthenticated}><Experiencias /></RutasProtegidas>
          } />

          <Route path='/campanas' element={
            <RutasProtegidas isAuthenticated={isAuthenticated}><Campanas /></RutasProtegidas>
          } />

          <Route path='/predicacion' element={
            <RutasProtegidas isAuthenticated={isAuthenticated}><PredicacionPublica /></RutasProtegidas>
          } />

          <Route path='/edificios' element={
            <RutasProtegidas isAuthenticated={isAuthenticated}><PredicacionEdificios /></RutasProtegidas>
          } />

          <Route path='/revisitas' element={
            <RutasProtegidas isAuthenticated={isAuthenticated}><MisRevisitas /></RutasProtegidas>
          } />

          <Route path='/programa' element={
            <RutasProtegidas isAuthenticated={isAuthenticated}><ProgramaPredicacion /></RutasProtegidas>
          } />

          <Route path='/admin/disponibilidad' element={
            <RutasProtegidas isAuthenticated={isAuthenticated}><MisDisponibilidades /></RutasProtegidas>
          } />
        </Routes>
      </Suspense>
    </>
  )
}

export default App
