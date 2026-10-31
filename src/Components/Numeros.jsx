import React, { useEffect, useState, useContext } from 'react';
import { NumerosContext } from '../context/NumerosContext';
import PantallaNumero from './PantallaNumero';

const Numeros = ({ numeroSeleccionadoId, onLimpiarSeleccionado }) => {
    const { numeros, setNumero, numero, cambiarEstadoNumero } = useContext(NumerosContext);
    const [objetoActivo, setObjetoActivo] = useState(null);
    const loggedInUsername = localStorage.getItem('usuario');

    const filtrador = numeros.filter((num) => {
        const isReservedForOther = num.reservado && num.reservadoA?.usuario !== loggedInUsername;
        return num.contesta === false && num.tocar !== false && !isReservedForOther;
    }).sort((a, b) => new Date(a.ultimaFecha || 0) - new Date(b.ultimaFecha || 0));

    useEffect(() => {
        // Si viene un número específico seleccionado desde el buscador
        if (numeroSeleccionadoId) {
            const encontrado = numeros.find(n => n.id === numeroSeleccionadoId);
            if (encontrado) {
                setObjetoActivo(encontrado);
                setNumero(encontrado.numero);
                return;
            }
        }

        // Si no hay número específico, seleccionar entre los pendientes
        if (filtrador.length > 0) {
            const maxIndex = Math.min(15, filtrador.length) - 1;
            const randomIndex = Math.floor(Math.random() * (maxIndex + 1));
            setObjetoActivo(filtrador[randomIndex]);
            setNumero(filtrador[randomIndex]?.numero);
        } else if (numeros.length > 0) {
            setObjetoActivo(null);
        }
    }, [numeros, numeroSeleccionadoId]);

    const handleSiguienteAleatorio = () => {
        if (onLimpiarSeleccionado) onLimpiarSeleccionado();
        if (filtrador.length > 0) {
            const maxIndex = Math.min(15, filtrador.length) - 1;
            const randomIndex = Math.floor(Math.random() * (maxIndex + 1));
            setObjetoActivo(filtrador[randomIndex]);
            setNumero(filtrador[randomIndex]?.numero);
        }
    };

    return (
        <>
            {numeroSeleccionadoId && objetoActivo && (
                <div className="d-flex justify-content-center mb-3">
                    <div className="badge bg-primary bg-opacity-10 text-primary border border-primary px-3 py-2 rounded-pill d-inline-flex align-items-center gap-2 shadow-sm">
                        <i className="bi bi-geo-alt-fill"></i>
                        <span>Dirección seleccionada del buscador</span>
                        <button 
                            type="button" 
                            className="btn btn-sm btn-link text-primary p-0 ms-2 text-decoration-none fw-bold"
                            onClick={handleSiguienteAleatorio}
                            title="Ir a números aleatorios pendientes"
                        >
                            <i className="bi bi-shuffle me-1"></i> Ir a aleatorios
                        </button>
                    </div>
                </div>
            )}

            <PantallaNumero 
                numero={numero} 
                cambiarEstadoNumero={cambiarEstadoNumero} 
                objeto={objetoActivo || (filtrador.length > 0 ? filtrador[0] : null)} 
            />
        </>
    );
};

export default Numeros;
