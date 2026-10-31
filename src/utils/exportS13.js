import { PDFDocument } from 'pdf-lib';

export const exportarS13 = async (territorios) => {
    try {
        const url = '/S-13-S_rellenable.pdf'; 
        const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

        const doc = await PDFDocument.load(existingPdfBytes);
        const form = doc.getForm();
        const currentYear = new Date().getFullYear();

        for (const t of territorios) {
            const rowNum = (t.numero || '').toString().padStart(2, '0');
            
            try {
                // Última fecha
                if (t.ultimaFechaTrabajada) {
                    const dateStr = new Date(t.ultimaFechaTrabajada).toLocaleDateString('es-AR', {day: '2-digit', month: '2-digit', year: '2-digit'});
                    const fieldUltima = form.getTextField(`T${rowNum}_ultima_fecha`);
                    if(fieldUltima) {
                        fieldUltima.setText(dateStr);
                        fieldUltima.setFontSize(8);
                        fieldUltima.setAlignment(1);
                    }
                }

                let blockIdx = 1;
                
                if (t.fechasTrabajado && t.fechasTrabajado.length > 0) {
                    const fechas = [...t.fechasTrabajado].sort((a,b) => new Date(a) - new Date(b));
                    const ultimasFechas = fechas.slice(-4); 
                    
                    ultimasFechas.forEach((f) => {
                        if(blockIdx > 4) return;
                        const dateStr = new Date(f).toLocaleDateString('es-AR', {day: '2-digit', month: '2-digit', year: '2-digit'});
                        
                        const fComp = form.getTextField(`T${rowNum}_g${blockIdx}_fecha_completado`);
                        if(fComp) {
                            fComp.setText(dateStr);
                            fComp.setFontSize(8);
                            fComp.setAlignment(1);
                        }

                        // Llenar SIEMPRE el hermano asignado para esta fecha histórica
                        const fAsigHist = form.getTextField(`T${rowNum}_g${blockIdx}_asignado_a`);
                        if(fAsigHist) {
                            const nombreHist = t.asignadoA ? (t.asignadoA.nombre + ' ' + (t.asignadoA.apellido || '')).substring(0, 15) : "---";
                            fAsigHist.setText(nombreHist);
                            fAsigHist.setFontSize(8);
                        }
                        
                        blockIdx++;
                    });
                }

                // Si NO hay fechas históricas, el hermano asignado actual ocupa el primer bloque
                if (t.asignadoA && (!t.fechasTrabajado || t.fechasTrabajado.length === 0)) {
                    const nombreCorto = (t.asignadoA.nombre + ' ' + (t.asignadoA.apellido || '')).substring(0, 15);
                    const fAsig = form.getTextField(`T${rowNum}_g1_asignado_a`);
                    if(fAsig) {
                        fAsig.setText(nombreCorto);
                        fAsig.setFontSize(8);
                    }
                }

            } catch (e) {
                console.error(`Error al llenar campos fila ${rowNum}:`, e);
            }
        }

        form.flatten();
        const pdfBytes = await doc.save();
        
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `S-13_Territorios_${currentYear}.pdf`;
        link.click();
        
    } catch (error) {
        console.error('Error al exportar S-13 rellenable:', error);
        throw error;
    }
};
