import React from 'react'
import { Navigate } from 'react-router'
import Swal from 'sweetalert2'
import { normalizarRol } from '../utils/permisos'

const RutasProtegidas = ({ isAuthenticated, rolesPermitidos, permisoRequerido, children }) => {
  if (!isAuthenticated) {
    return <Navigate to='/login' replace />
  }

  const userRole = localStorage.getItem('privilegio') || '';
  const userAsig = localStorage.getItem('asignacion') || '';

  if (permisoRequerido && typeof permisoRequerido === 'function') {
    if (!permisoRequerido(userRole, userAsig)) {
      setTimeout(() => {
        Swal.fire({
          icon: 'error',
          title: 'Acceso Denegado',
          text: 'No tienes permisos suficientes para acceder a esta sección.',
          confirmButtonColor: 'var(--bs-primary)'
        });
      }, 100);
      return <Navigate to='/admin' replace />
    }
  } else if (rolesPermitidos && rolesPermitidos.length > 0) {
    const rolNorm = normalizarRol(userRole);
    const cumple = rolesPermitidos.some(r => r === userRole || normalizarRol(r) === rolNorm);
    if (!cumple) {
      setTimeout(() => {
        Swal.fire({
          icon: 'error',
          title: 'Acceso Denegado',
          text: 'No tienes permisos suficientes para acceder a esta sección.',
          confirmButtonColor: 'var(--bs-primary)'
        });
      }, 100);
      return <Navigate to='/admin' replace />
    }
  }
  
  return children
}

export default RutasProtegidas
