import React from 'react'
import { useContext } from 'react'
import { NumerosContext } from '../context/NumerosContext'

const PantallaNumero = ({ objeto }) => {
    const { numero, actualizarNumero, eliminarNumero } = useContext(NumerosContext)
    
    const getLocalIsoDate = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    };
    const handleContestaClick =  () => {
        const usuarioActual = localStorage.getItem('usuario');
        let objetoActualizado ={
            ...objeto,
            ultimaFecha: getLocalIsoDate(), 
            contesta : true,
            ultUsuario: usuarioActual ? { usuario: usuarioActual } : null
        }
        actualizarNumero(objetoActualizado)
    }
    const handleNoContestaClick = () => {
        const usuarioActual = localStorage.getItem('usuario');
        let objetoActualizado ={
            ...objeto,
            ultimaFecha: getLocalIsoDate(),
            contesta : false,
            ultUsuario: usuarioActual ? { usuario: usuarioActual } : null
        }
        actualizarNumero(objetoActualizado)
    }

    const handleFueraDeServicioClick = () => {
        const usuarioActual = localStorage.getItem('usuario');
        let objetoActualizado ={
            ...objeto,
            ultimaFecha: getLocalIsoDate(),
            tocar: false,
            ultUsuario: usuarioActual ? { usuario: usuarioActual } : null
        }
        actualizarNumero(objetoActualizado)
    }
    

    return (
        <div className="container p-3">

            <div
                className="card p-4 mb-4 bg-body"
                style={{
                    maxWidth: '450px',
                    margin: '0 auto',
                    minHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                    borderRadius: '12px'
                }}
            >
                <div className="card-body text-center p-0">
                    {objeto ? (
                        <>

                            <a 
                                href={objeto.numero ? `tel:${String(objeto.numero).replace(/\s+/g, '')}` : '#'} 
                                className="card-title text-primary text-decoration-none mb-3 fw-bold d-inline-flex align-items-center justify-content-center gap-2" 
                                style={{ fontSize: '2.5rem', letterSpacing: '-0.5px' }}
                                title="Tocar para llamar directamente"
                            >
                                <i className="bi bi-telephone-outbound-fill fs-3"></i>
                                {objeto.numero}
                            </a>

                            <hr className="my-3" style={{ opacity: 0.1 }} />


                            <div className="text-start">
                                <p className="mb-2 text-body" style={{ fontSize: '1.1rem' }}>
                                    <span className="text-muted fw-semibold me-2">Dirección:</span> 
                                    {objeto.direccion}
                                </p>
                                <p className="mb-2 text-body" style={{ fontSize: '1.1rem' }}>
                                    <span className="text-muted fw-semibold me-2">Territorio:</span> 
                                    {objeto.territorio} 
                                </p>
                                <p className="mb-0 text-body" style={{ fontSize: '1.1rem' }}>
                                    <span className="text-muted fw-semibold me-2">Último llamado:</span> 
                                    {
                                        objeto.ultimaFecha 
                                        ? (() => {
                                            const fechaStr = objeto.ultimaFecha.split('T')[0];
                                            const partes = fechaStr.split('-');
                                            return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : objeto.ultimaFecha;
                                        })()
                                        : "No registrado"
                                    }
                                </p>
                            </div>
                        </>
                    ) : (

                        <h5 className="text-danger my-auto">No hay número para llamar</h5>
                    )}
                </div>
            </div>
            <div className="d-grid gap-3 col-10 mx-auto d-md-flex justify-content-md-center mt-4">

                {
                    objeto ? (
                        <>
                            <button
                                className="btn btn-success px-4 py-2 fw-semibold shadow-sm"
                                onClick={handleContestaClick}
                            >
                                Contesta
                            </button>
                            <button
                                className="btn btn-warning px-4 py-2 fw-semibold text-body shadow-sm"
                                onClick={handleNoContestaClick}
                            >
                                No Contesta
                            </button>
                            <button
                                className="btn btn-danger px-4 py-2 fw-semibold shadow-sm"
                                onClick={handleFueraDeServicioClick}
                            >
                                Fuera de Servicio/ No tocar
                            </button>
                        </>
                    ) : null
                }

            </div>
        </div>

    )
}
export default PantallaNumero;
