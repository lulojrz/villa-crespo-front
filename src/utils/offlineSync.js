import Swal from 'sweetalert2';

const QUEUE_KEY = 'offline_mutations_queue';
const CACHE_PREFIX = 'offline_cache_';

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true
});

// Guardar datos en caché local
export const guardarCacheLocal = (clave, datos) => {
    try {
        localStorage.setItem(`${CACHE_PREFIX}${clave}`, JSON.stringify({
            timestamp: Date.now(),
            datos
        }));
    } catch (e) {
        console.warn('No se pudo guardar en caché local (posible límite de cuota):', e);
    }
};

// Obtener datos de la caché local
export const obtenerCacheLocal = (clave) => {
    try {
        const item = localStorage.getItem(`${CACHE_PREFIX}${clave}`);
        if (!item) return null;
        const parsed = JSON.parse(item);
        return parsed.datos;
    } catch (e) {
        console.error('Error al leer caché local:', e);
        return null;
    }
};

// Obtener cola de cambios pendientes
export const obtenerColaPendiente = () => {
    try {
        const q = localStorage.getItem(QUEUE_KEY);
        return q ? JSON.parse(q) : [];
    } catch (e) {
        return [];
    }
};

// Notificar a los componentes de cambios en la cola
const notificarCambioCola = (cola) => {
    window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { count: cola.length } }));
};

// Encolar una mutación para sincronizar luego
export const encolarMutacion = (mutacion) => {
    const cola = obtenerColaPendiente();
    const item = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        ...mutacion
    };
    cola.push(item);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(cola));
    notificarCambioCola(cola);
    
    Toast.fire({
        icon: 'warning',
        title: 'Guardado sin conexión',
        text: 'Se enviará automáticamente al recuperar internet.'
    });

    return item;
};

// Procesar y sincronizar todas las mutaciones pendientes
let sincronizando = false;
export const sincronizarColaOffline = async () => {
    if (sincronizando) return;
    if (!navigator.onLine) return;

    const cola = obtenerColaPendiente();
    if (cola.length === 0) return;

    sincronizando = true;
    window.dispatchEvent(new CustomEvent('offline-sync-status', { detail: { syncing: true } }));

    const colaRestante = [];
    let sincronizadosExitosos = 0;

    for (const item of cola) {
        try {
            const res = await fetch(item.url, {
                method: item.method || 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(item.headers || {})
                },
                credentials: 'include',
                body: item.body ? (typeof item.body === 'string' ? item.body : JSON.stringify(item.body)) : undefined
            });

            if (res.ok) {
                sincronizadosExitosos++;
            } else {
                // Si el servidor rechaza (ej: 400/500), reintentar más tarde
                colaRestante.push(item);
            }
        } catch (error) {
            // Error de red: detener bucle y reintentar cuando vuelva la señal
            colaRestante.push(item);
            break;
        }
    }

    localStorage.setItem(QUEUE_KEY, JSON.stringify(colaRestante));
    notificarCambioCola(colaRestante);
    sincronizando = false;
    window.dispatchEvent(new CustomEvent('offline-sync-status', { detail: { syncing: false } }));

    if (sincronizadosExitosos > 0) {
        Toast.fire({
            icon: 'success',
            title: `¡Conexión restaurada!`,
            text: `${sincronizadosExitosos} cambio(s) sincronizado(s) con el servidor.`
        });
        // Disparar evento para que las vistas refresquen datos frescos
        window.dispatchEvent(new CustomEvent('offline-data-synced'));
    }
};

// Escuchador global de reconexión
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('Conexión reestablecida. Sincronizando cola offline...');
        sincronizarColaOffline();
    });

    // Intentar sincronizar al arrancar por si quedaron cambios pendientes
    setTimeout(() => {
        if (navigator.onLine) {
            sincronizarColaOffline();
        }
    }, 2000);
}
