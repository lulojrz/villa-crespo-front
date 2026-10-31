/**
 * Gestión centralizada de Roles y Asignaciones según los requerimientos:
 * - Roles: ANCIANO, SIERVO_MINISTERIAL, PRECURSOR_REGULAR, PUBLICADOR.
 * - Solo ANCIANO y SIERVO_MINISTERIAL con campo asignación pueden tener opciones de administración.
 * - Asignaciones disponibles: publica, soporte, territorios, servicio.
 * - Permisos por asignación:
 *    * publica: solo administra predicación pública.
 *    * soporte: administra todo.
 *    * territorios: solo telefónica y edificios.
 *    * servicio: administra todo.
 */

export const ROLES = {
  ANCIANO: 'ANCIANO',
  SIERVO_MINISTERIAL: 'SIERVO_MINISTERIAL',
  PRECURSOR_REGULAR: 'PRECURSOR_REGULAR',
  PUBLICADOR: 'PUBLICADOR'
};

export const ASIGNACIONES = {
  PUBLICA: 'publica',
  SOPORTE: 'soporte',
  TERRITORIOS: 'territorios',
  SERVICIO: 'servicio'
};

/**
 * Normaliza cualquier variante de rol histórica o alternativa al estándar actual.
 */
export const normalizarRol = (rol) => {
  if (!rol) return ROLES.PUBLICADOR;
  const r = String(rol).trim().toUpperCase();
  if (r === ROLES.ANCIANO) return ROLES.ANCIANO;
  if (r === ROLES.SIERVO_MINISTERIAL) return ROLES.SIERVO_MINISTERIAL;
  if (r === ROLES.PRECURSOR_REGULAR) return ROLES.PRECURSOR_REGULAR;
  if (r === ROLES.PUBLICADOR) return ROLES.PUBLICADOR;
  return ROLES.PUBLICADOR;
};

export const esAnciano = (rol) => normalizarRol(rol) === ROLES.ANCIANO;
export const esSiervoMinisterial = (rol) => normalizarRol(rol) === ROLES.SIERVO_MINISTERIAL;
export const esPrecursorRegular = (rol) => normalizarRol(rol) === ROLES.PRECURSOR_REGULAR;
export const esPublicador = (rol) => normalizarRol(rol) === ROLES.PUBLICADOR;

/**
 * Normaliza cualquier variante de asignación.
 */
export const normalizarAsignacion = (asig) => {
  if (!asig) return '';
  const a = String(asig).trim().toLowerCase();
  if (a === 'publica' || a === 'pública') return ASIGNACIONES.PUBLICA;
  if (a === 'soporte') return ASIGNACIONES.SOPORTE;
  if (a === 'territorios' || a.startsWith('territorio')) return ASIGNACIONES.TERRITORIOS;
  if (a === 'servicio' || a.startsWith('servicio')) return ASIGNACIONES.SERVICIO;
  return a;
};

/**
 * Solo los ANCIANO y SIERVO_MINISTERIAL con campo asignación válido pueden tener opciones de administración.
 */
export const puedeAdministrar = (rol, asignacion) => {
  const r = normalizarRol(rol);
  const esLider = r === ROLES.ANCIANO || r === ROLES.SIERVO_MINISTERIAL;
  if (!esLider) return false;

  const a = normalizarAsignacion(asignacion);
  return [ASIGNACIONES.PUBLICA, ASIGNACIONES.SOPORTE, ASIGNACIONES.TERRITORIOS, ASIGNACIONES.SERVICIO].includes(a);
};

/**
 * Rol publica solo podrá administrar predicación pública. Soporte y Servicio administran todo.
 */
export const puedeAdministrarPublica = (rol, asignacion) => {
  if (!puedeAdministrar(rol, asignacion)) return false;
  const a = normalizarAsignacion(asignacion);
  return a === ASIGNACIONES.PUBLICA || a === ASIGNACIONES.SOPORTE || a === ASIGNACIONES.SERVICIO;
};

/**
 * Territorios solo telefónica y edificios. Soporte y Servicio administran todo.
 */
export const puedeAdministrarTelefonica = (rol, asignacion) => {
  if (!puedeAdministrar(rol, asignacion)) return false;
  const a = normalizarAsignacion(asignacion);
  return a === ASIGNACIONES.TERRITORIOS || a === ASIGNACIONES.SOPORTE || a === ASIGNACIONES.SERVICIO;
};

/**
 * Territorios solo telefónica y edificios. Soporte y Servicio administran todo.
 */
export const puedeAdministrarEdificios = (rol, asignacion) => {
  if (!puedeAdministrar(rol, asignacion)) return false;
  const a = normalizarAsignacion(asignacion);
  return a === ASIGNACIONES.TERRITORIOS || a === ASIGNACIONES.SOPORTE || a === ASIGNACIONES.SERVICIO;
};

/**
 * Soporte y Servicio administran todo (salidas, estadísticas, etc.)
 */
export const puedeAdministrarTodo = (rol, asignacion) => {
  if (!puedeAdministrar(rol, asignacion)) return false;
  const a = normalizarAsignacion(asignacion);
  return a === ASIGNACIONES.SOPORTE || a === ASIGNACIONES.SERVICIO;
};

/**
 * Gestión de usuarios: Soporte y Servicio (o Anciano con asignación de soporte/servicio).
 */
export const puedeAdministrarUsuarios = (rol, asignacion) => {
  return puedeAdministrarTodo(rol, asignacion);
};

export const obtenerNombreRol = (rol) => {
  const r = normalizarRol(rol);
  switch (r) {
    case ROLES.ANCIANO: return 'Anciano';
    case ROLES.SIERVO_MINISTERIAL: return 'Siervo Ministerial';
    case ROLES.PRECURSOR_REGULAR: return 'Precursor Regular';
    case ROLES.PUBLICADOR: default: return 'Publicador';
  }
};

export const obtenerNombreAsignacion = (asig) => {
  const a = normalizarAsignacion(asig);
  switch (a) {
    case ASIGNACIONES.PUBLICA: return 'Predicación Pública';
    case ASIGNACIONES.SOPORTE: return 'Soporte';
    case ASIGNACIONES.TERRITORIOS: return 'Territorios';
    case ASIGNACIONES.SERVICIO: return 'Servicio';
    default: return 'Sin Asignación';
  }
};
