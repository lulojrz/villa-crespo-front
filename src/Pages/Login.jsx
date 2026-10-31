import React from 'react'
import { useContext } from 'react'
import {AuthContext}  from '../context/AuthContext'
import '../App.css'

const Login = () => {

  const {user, setUser, password, setPassword, errors, handleSubmit, isLoading, isDoorOpening} = useContext(AuthContext)

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100dvh', backgroundColor: '#f4f7f6' }}>
      
      <div className="card shadow-lg p-5" style={{ width: '100%', maxWidth: '420px', borderRadius: '1rem', border: 'none' }}>
        <div className="text-center mb-4">
          {/* Logo Animado en HTML (Compatible con iOS/Mobile) */}
          <div className="mb-3 d-flex justify-content-center" style={{ overflow: 'visible' }}>
            <div style={{ width: '200px', height: '200px', position: 'relative', transform: 'scale(0.8)' }}>
              {/* Círculo exterior */}
              <div style={{ 
                position: 'absolute', top: 15, left: 15, width: 170, height: 170, 
                border: '4px solid #76989d', borderRadius: '50%', boxSizing: 'border-box' 
              }} />

              {/* Sombra o Umbral en el piso */}
              <div style={{
                position: 'absolute', top: 144, left: 50, width: 80, height: 9,
                backgroundColor: '#76989d',
                clipPath: 'polygon(25% 0, 100% 0, 0 100%)',
                WebkitClipPath: 'polygon(25% 0, 100% 0, 0 100%)', // Para compatibilidad iOS
                transition: 'opacity 2s', opacity: isDoorOpening ? 1 : 0
              }} />

              {/* Marco de la puerta */}
              <div style={{ position: 'absolute', left: 70, top: 45, width: 10, height: 100, backgroundColor: '#76989d' }} />
              <div style={{ position: 'absolute', left: 70, top: 45, width: 60, height: 10, backgroundColor: '#76989d' }} />

              {/* Texto JW */}
              <div style={{
                position: 'absolute', left: 80, top: 55, width: 50, height: 90,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#76989d', fontSize: '32px', fontWeight: '700', fontFamily: "'Inter', sans-serif",
                transition: 'text-shadow 2s ease-in-out',
                textShadow: isDoorOpening ? '0 0 10px rgba(118,152,157,0.6)' : 'none',
                zIndex: 1
              }}>JW</div>

              {/* Puerta animada */}
              <div style={{
                position: 'absolute', left: 79, top: 55, width: 51, height: 90,
                transformOrigin: 'right center',
                transition: 'transform 2s cubic-bezier(0.4, 0, 0.2, 1), background-color 2s',
                transform: isDoorOpening ? 'perspective(600px) rotateY(-110deg)' : 'perspective(600px) rotateY(0deg)',
                backgroundColor: isDoorOpening ? '#6b8e93' : '#76989d',
                zIndex: 2,
                transformStyle: 'preserve-3d'
              }}>
                {/* Pomo de la puerta */}
                <div style={{
                  position: 'absolute', left: 3.5, top: '50%', transform: 'translateY(-50%)',
                  width: 7, height: 7, backgroundColor: '#fff', borderRadius: '50%'
                }} />
              </div>
            </div>
          </div>

          <h2 className="fw-bold" style={{ color: '#334155' }}>Bienvenido</h2>
          <p className="text-muted">Por favor, inicia sesión para continuar</p>
        </div>


        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="user" className="form-label fw-semibold" style={{ color: '#475569' }}>
              Usuario
            </label>
            <input
              id="user"
              type="text"
              className={`form-control form-control-lg ${errors.user ? 'is-invalid' : ''}`}
              placeholder="Ingresar Usuario"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              style={{ fontSize: '1rem', padding: '0.75rem' }}
            />
            {errors.user && (
              <div className="invalid-feedback fw-medium">
                {errors.user}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="formBasicPassword" className="form-label fw-semibold" style={{ color: '#475569' }}>
              Contraseña
            </label>
            <input
              id="formBasicPassword"
              type="password"
              className={`form-control form-control-lg ${errors.password ? 'is-invalid' : ''}`}
              placeholder="Ingresar Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ fontSize: '1rem', padding: '0.75rem' }}
            />
            {errors.password && (
              <div className="invalid-feedback fw-medium">
                {errors.password}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-100 fw-bold shadow-sm"
            style={{ padding: '0.75rem', borderRadius: '0.5rem', transition: 'all 0.2s ease-in-out' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Cargando...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
