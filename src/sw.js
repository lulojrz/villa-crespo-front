import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Precargar assets compilados por Vite
precacheAndRoute(self.__WB_MANIFEST || []);

// Rutas de la API a cachear
const rutasApi = [
    '/api/',
    '/territorios/',
    '/departamentos/',
    '/manzanas/',
    '/edificios/',
    '/experiencias/',
    '/salidas/',
    '/campanas/',
    '/usuarios/',
    '/reporte/'
];

// 1. Caching en tiempo real para las peticiones GET (Territorios, Edificios, Números, etc.)
registerRoute(
    ({ url, request }) => request.method === 'GET' && rutasApi.some(ruta => url.pathname.startsWith(ruta)),
    new NetworkFirst({
        cacheName: 'api-cache',
        plugins: []
    })
);

// 2. Background Sync para peticiones POST, PUT, DELETE (Modificaciones offline)
const bgSyncPlugin = new BackgroundSyncPlugin('api-sync-queue', {
    maxRetentionTime: 24 * 60, // Reintentar hasta por 24 horas
});

registerRoute(
    ({ request, url }) => ['POST', 'PUT', 'DELETE'].includes(request.method) && rutasApi.some(ruta => url.pathname.startsWith(ruta)),
    new NetworkOnly({
        plugins: [bgSyncPlugin]
    })
);

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', () => {
    self.clients.claim();
});
