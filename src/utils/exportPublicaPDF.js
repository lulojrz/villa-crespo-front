import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import Swal from 'sweetalert2';
import { normalizarRol, obtenerNombreRol } from './permisos';

/**
 * Genera y descarga un informe en PDF con los hermanos aptos para predicación pública
 * y el detalle de los puntos trabajados hasta la fecha actual.
 */
export const exportarInformePublicaPDF = async (apiUrl) => {
    const api = apiUrl || import.meta.env.VITE_API_URL;

    // Toast de progreso inicial
    Swal.fire({
        title: 'Generando informe...',
        text: 'Obteniendo publicadores habilitados y registro de turnos...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        // 1. Obtener usuarios, turnos y puntos en paralelo
        const [resUsuarios, resTurnos, resPuntos] = await Promise.all([
            fetch(`${api}/usuarios`, { credentials: 'include' }),
            fetch(`${api}/api/turnos/todos`, { credentials: 'include' }).catch(() => ({ ok: false })),
            fetch(`${api}/api/turnos/puntos`, { credentials: 'include' }).catch(() => ({ ok: false }))
        ]);

        if (!resUsuarios.ok) {
            throw new Error('No se pudo obtener la lista de usuarios.');
        }

        const usuarios = await resUsuarios.json();
        const turnos = resTurnos.ok ? await resTurnos.json() : [];
        const puntos = resPuntos.ok ? await resPuntos.json() : [];

        // 2. Filtrar publicadores aptos
        const publicadoresAptos = (Array.isArray(usuarios) ? usuarios : []).filter(u => {
            return u.habilitacionPublica === true || u.aptoPredicacionPublica === true;
        });

        if (publicadoresAptos.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'Sin publicadores habilitados',
                text: 'No hay publicadores con habilitación para predicación pública registrados actualmente en el sistema.',
                confirmButtonColor: '#0d6efd'
            });
            return;
        }

        // Ordenar alfabéticamente por apellido y nombre
        publicadoresAptos.sort((a, b) => {
            const apeA = (a.apellido || '').trim().toLowerCase();
            const apeB = (b.apellido || '').trim().toLowerCase();
            if (apeA !== apeB) return apeA.localeCompare(apeB);
            return (a.nombre || '').trim().toLowerCase().localeCompare((b.nombre || '').trim().toLowerCase());
        });

        // 3. Procesar turnos trabajados hasta el momento (fecha <= hoy)
        const hoy = new Date();
        const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
        
        const turnosValidos = (Array.isArray(turnos) ? turnos : []).filter(t => {
            return t.fecha && t.fecha <= hoyStr;
        });

        // Mapear estadísticas por usuario
        const statsPorUsuario = {};
        let granTotalTurnos = 0;

        publicadoresAptos.forEach(u => {
            statsPorUsuario[u.usuario] = {
                totalTurnos: 0,
                puntosMap: {},
                turnosList: []
            };
        });

        turnosValidos.forEach(t => {
            const u1 = t.publicador1?.usuario;
            const u2 = t.publicador2?.usuario;
            const puntoNombre = t.punto?.nombre || 'Punto';

            if (u1 && statsPorUsuario[u1]) {
                statsPorUsuario[u1].totalTurnos += 1;
                statsPorUsuario[u1].puntosMap[puntoNombre] = (statsPorUsuario[u1].puntosMap[puntoNombre] || 0) + 1;
                granTotalTurnos++;
            }
            if (u2 && statsPorUsuario[u2]) {
                statsPorUsuario[u2].totalTurnos += 1;
                statsPorUsuario[u2].puntosMap[puntoNombre] = (statsPorUsuario[u2].puntosMap[puntoNombre] || 0) + 1;
                granTotalTurnos++;
            }
        });

        // 4. Crear Documento PDF (A4 Apaisado / Landscape: 841.89 x 595.28 pt)
        const pdfDoc = await PDFDocument.create();
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const PAGE_WIDTH = 841.89;
        const PAGE_HEIGHT = 595.28;
        const MARGIN = 36;
        const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // ~770 pt

        const colorPrimario = rgb(0.05, 0.43, 0.99); // Azul corporativo #0d6efd
        const colorSecundario = rgb(0.3, 0.35, 0.4);
        const colorGrisFondo = rgb(0.96, 0.97, 0.98);
        const colorGrisBorde = rgb(0.85, 0.88, 0.92);
        const colorTexto = rgb(0.12, 0.14, 0.17);
        const colorBlanco = rgb(1, 1, 1);
        const colorVerde = rgb(0.1, 0.6, 0.3);

        // Definición de columnas de la tabla
        const cols = [
            { id: 'nombre', header: 'Publicador / Hermano', width: 170 },
            { id: 'rol', header: 'Rol / Privilegio', width: 110 },
            { id: 'grupo', header: 'Grupo', width: 50 },
            { id: 'telefono', header: 'Teléfono', width: 90 },
            { id: 'inventario', header: 'Inventario', width: 65 },
            { id: 'turnos', header: 'Turnos', width: 55 },
            { id: 'puntos', header: 'Puntos Trabajados (Detalle)', width: 230 }
        ];

        let currentPage = null;
        let y = 0;
        const ROW_HEIGHT = 22;

        const dibujarEncabezadoPagina = (pageNumber, totalPagesEstimate = 1) => {
            const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            
            // Banda superior decorativa
            page.drawRectangle({
                x: 0,
                y: PAGE_HEIGHT - 6,
                width: PAGE_WIDTH,
                height: 6,
                color: colorPrimario
            });

            // Título y membrete
            page.drawText('CONGREGACIÓN VILLA CRESPO — PREDICACIÓN PÚBLICA', {
                x: MARGIN,
                y: PAGE_HEIGHT - 32,
                size: 14,
                font: fontBold,
                color: colorPrimario
            });

            page.drawText('Informe de Hermanos Habilitados y Puntos Trabajados', {
                x: MARGIN,
                y: PAGE_HEIGHT - 48,
                size: 11,
                font: fontBold,
                color: colorTexto
            });

            const fechaHora = hoy.toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }) + ' ' + hoy.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

            page.drawText(`Generado: ${fechaHora} hs | Villa Crespo, CABA`, {
                x: PAGE_WIDTH - MARGIN - 230,
                y: PAGE_HEIGHT - 32,
                size: 8.5,
                font: fontRegular,
                color: colorSecundario
            });

            // Si es la página 1, dibujar tarjetas de resumen
            let tablaStartY = PAGE_HEIGHT - 70;
            if (pageNumber === 1) {
                const cardY = PAGE_HEIGHT - 100;
                const cardHeight = 36;
                const cardWidth = (CONTENT_WIDTH - 20) / 3;

                // Card 1: Total Hermanos Aptos
                page.drawRectangle({
                    x: MARGIN,
                    y: cardY,
                    width: cardWidth,
                    height: cardHeight,
                    color: rgb(0.93, 0.96, 1),
                    borderColor: rgb(0.75, 0.85, 1),
                    borderWidth: 1
                });
                page.drawText('PUBLICADORES HABILITADOS', {
                    x: MARGIN + 10,
                    y: cardY + 22,
                    size: 7.5,
                    font: fontBold,
                    color: colorPrimario
                });
                page.drawText(`${publicadoresAptos.length} hermanos`, {
                    x: MARGIN + 10,
                    y: cardY + 8,
                    size: 12,
                    font: fontBold,
                    color: colorTexto
                });

                // Card 2: Total Turnos Trabajados
                page.drawRectangle({
                    x: MARGIN + cardWidth + 10,
                    y: cardY,
                    width: cardWidth,
                    height: cardHeight,
                    color: rgb(0.93, 0.98, 0.94),
                    borderColor: rgb(0.75, 0.92, 0.8),
                    borderWidth: 1
                });
                page.drawText('PARTICIPACIONES EN TURNOS (HASTA HOY)', {
                    x: MARGIN + cardWidth + 20,
                    y: cardY + 22,
                    size: 7.5,
                    font: fontBold,
                    color: colorVerde
                });
                page.drawText(`${granTotalTurnos} asignaciones cumplidas`, {
                    x: MARGIN + cardWidth + 20,
                    y: cardY + 8,
                    size: 12,
                    font: fontBold,
                    color: colorTexto
                });

                // Card 3: Puntos Activos
                const cantPuntosActivos = Array.isArray(puntos) ? puntos.filter(p => p.activo !== false).length : 0;
                page.drawRectangle({
                    x: MARGIN + (cardWidth + 10) * 2,
                    y: cardY,
                    width: cardWidth,
                    height: cardHeight,
                    color: rgb(0.98, 0.96, 0.92),
                    borderColor: rgb(0.92, 0.85, 0.7),
                    borderWidth: 1
                });
                page.drawText('PUNTOS DE PREDICACIÓN ACTIVOS', {
                    x: MARGIN + (cardWidth + 10) * 2 + 10,
                    y: cardY + 22,
                    size: 7.5,
                    font: fontBold,
                    color: rgb(0.8, 0.5, 0.1)
                });
                page.drawText(`${cantPuntosActivos} puntos habilitados`, {
                    x: MARGIN + (cardWidth + 10) * 2 + 10,
                    y: cardY + 8,
                    size: 12,
                    font: fontBold,
                    color: colorTexto
                });

                tablaStartY = cardY - 20;
            }

            // Dibujar cabecera de la tabla
            page.drawRectangle({
                x: MARGIN,
                y: tablaStartY - ROW_HEIGHT,
                width: CONTENT_WIDTH,
                height: ROW_HEIGHT,
                color: colorPrimario
            });

            let currentX = MARGIN;
            cols.forEach(col => {
                page.drawText(col.header, {
                    x: currentX + 6,
                    y: tablaStartY - ROW_HEIGHT + 7,
                    size: 8.5,
                    font: fontBold,
                    color: colorBlanco
                });
                currentX += col.width;
            });

            return {
                page,
                tablaStartY: tablaStartY - ROW_HEIGHT
            };
        };

        // Iniciar primera página
        let pageCount = 1;
        let setup = dibujarEncabezadoPagina(pageCount);
        currentPage = setup.page;
        y = setup.tablaStartY - ROW_HEIGHT;

        // 5. Imprimir cada fila de usuario
        publicadoresAptos.forEach((u, index) => {
            // Si nos quedamos sin espacio vertical en la página, crear otra
            if (y < 45) {
                pageCount++;
                setup = dibujarEncabezadoPagina(pageCount);
                currentPage = setup.page;
                y = setup.tablaStartY - ROW_HEIGHT;
            }

            // Fondo alternado de filas
            const esPar = index % 2 === 0;
            if (esPar) {
                currentPage.drawRectangle({
                    x: MARGIN,
                    y: y,
                    width: CONTENT_WIDTH,
                    height: ROW_HEIGHT,
                    color: colorGrisFondo
                });
            }

            // Línea separadora inferior
            currentPage.drawLine({
                start: { x: MARGIN, y: y },
                end: { x: MARGIN + CONTENT_WIDTH, y: y },
                thickness: 0.5,
                color: colorGrisBorde
            });

            // Preparar valores
            const stats = statsPorUsuario[u.usuario] || { totalTurnos: 0, puntosMap: {} };
            
            // Resumen de puntos en texto: "Malabia (4), Parque (2)"
            const puntosDetalle = Object.entries(stats.puntosMap)
                .map(([pto, cant]) => `${pto} (${cant})`)
                .join(', ') || (stats.totalTurnos === 0 ? 'Sin turnos registrados' : 'Varios');

            const nombreCompleto = `${u.apellido || ''}, ${u.nombre || ''}`.trim() || u.usuario;
            const rolTexto = obtenerNombreRol(u.privilegio);
            const grupoTexto = u.grupo ? `G${String(u.grupo).replace(/\D/g, '') || u.grupo}` : '—';
            const telTexto = (u.telefono || '').trim() || '—';
            
            let invTexto = '';
            if (u.carrito) invTexto += 'Carrito ';
            if (u.banner) invTexto += 'Banner';
            if (!invTexto) invTexto = '—';

            // Dibujar columnas
            let currentX = MARGIN;

            // Col 1: Nombre
            currentPage.drawText(truncarTexto(nombreCompleto, 26), {
                x: currentX + 6,
                y: y + 6.5,
                size: 8,
                font: fontBold,
                color: colorTexto
            });
            currentX += cols[0].width;

            // Col 2: Rol
            currentPage.drawText(truncarTexto(rolTexto, 18), {
                x: currentX + 6,
                y: y + 6.5,
                size: 8,
                font: fontRegular,
                color: colorSecundario
            });
            currentX += cols[1].width;

            // Col 3: Grupo
            currentPage.drawText(grupoTexto, {
                x: currentX + 6,
                y: y + 6.5,
                size: 8,
                font: fontRegular,
                color: colorTexto
            });
            currentX += cols[2].width;

            // Col 4: Teléfono
            currentPage.drawText(truncarTexto(telTexto, 14), {
                x: currentX + 6,
                y: y + 6.5,
                size: 8,
                font: fontRegular,
                color: colorTexto
            });
            currentX += cols[3].width;

            // Col 5: Inventario
            currentPage.drawText(truncarTexto(invTexto, 12), {
                x: currentX + 6,
                y: y + 6.5,
                size: 7.5,
                font: fontRegular,
                color: colorSecundario
            });
            currentX += cols[4].width;

            // Col 6: Turnos
            currentPage.drawText(`${stats.totalTurnos}`, {
                x: currentX + 16,
                y: y + 6.5,
                size: 8.5,
                font: fontBold,
                color: stats.totalTurnos > 0 ? colorPrimario : colorSecundario
            });
            currentX += cols[5].width;

            // Col 7: Puntos trabajados
            currentPage.drawText(truncarTexto(puntosDetalle, 44), {
                x: currentX + 6,
                y: y + 6.5,
                size: 7.5,
                font: stats.totalTurnos > 0 ? fontRegular : fontRegular,
                color: stats.totalTurnos > 0 ? colorTexto : colorSecundario
            });

            y -= ROW_HEIGHT;
        });

        // 6. Pie de página en todas las hojas con numeración
        const allPages = pdfDoc.getPages();
        allPages.forEach((page, idx) => {
            page.drawLine({
                start: { x: MARGIN, y: 26 },
                end: { x: PAGE_WIDTH - MARGIN, y: 26 },
                thickness: 0.5,
                color: colorGrisBorde
            });

            page.drawText('Villa Crespo CRM — Sistema de Organización de la Predicación', {
                x: MARGIN,
                y: 14,
                size: 7.5,
                font: fontRegular,
                color: colorSecundario
            });

            page.drawText(`Página ${idx + 1} de ${allPages.length}`, {
                x: PAGE_WIDTH - MARGIN - 70,
                y: 14,
                size: 7.5,
                font: fontRegular,
                color: colorSecundario
            });
        });

        // 7. Descargar archivo
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const urlBlob = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlBlob;
        a.download = `Hermanos_Aptos_Predicacion_Publica_${hoyStr}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(urlBlob);

        Swal.fire({
            icon: 'success',
            title: '¡Informe descargado!',
            text: `Se descargó el PDF con ${publicadoresAptos.length} hermanos habilitados y su historial de turnos.`,
            confirmButtonColor: '#0d6efd'
        });

    } catch (error) {
        console.error('Error al generar PDF de Predicación Pública:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error al generar el informe',
            text: error.message || 'Ocurrió un problema de red o procesando los datos.',
            confirmButtonColor: '#0d6efd'
        });
    }
};

/**
 * Recorta texto largo para evitar desbordes en celdas de ancho fijo.
 */
function truncarTexto(str, maxLen) {
    if (!str) return '';
    const limpio = String(str).trim();
    if (limpio.length <= maxLen) return limpio;
    return limpio.slice(0, maxLen - 1) + '…';
}
