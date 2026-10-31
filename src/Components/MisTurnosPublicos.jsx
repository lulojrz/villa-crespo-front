import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const MisTurnosPublicos = () => {
    const [turnosActivos, setTurnosActivos] = useState([]);
    const [turnosPasados, setTurnosPasados] = useState([]);
    const [loading, setLoading] = useState(true);
    const usuarioActual = localStorage.getItem('usuario');
    const api = import.meta.env.VITE_API_URL;

    useEffect(() => {
        const fetchMisTurnos = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${api}/api/turnos/usuario/${usuarioActual}`, {
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    // Separar turnos en activos y pasados
                    const hoy = new Date();
                    hoy.setHours(0, 0, 0, 0);

                    const activos = [];
                    const pasados = [];

                    data.forEach(turno => {
                        // turno.fecha asume formato "YYYY-MM-DD"
                        const [year, month, day] = turno.fecha.split('-');
                        const fechaTurno = new Date(year, month - 1, day);
                        fechaTurno.setHours(0, 0, 0, 0);

                        if (fechaTurno >= hoy) {
                            activos.push(turno);
                        } else {
                            pasados.push(turno);
                        }
                    });

                    // Ordenar activos (los más próximos primero)
                    activos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
                    // Ordenar pasados (los más recientes primero)
                    pasados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

                    setTurnosActivos(activos);
                    setTurnosPasados(pasados);
                } else {
                    Swal.fire('Error', 'No se pudieron cargar tus turnos de predicación pública.', 'error');
                }
            } catch (error) {
                console.error("Error fetching mis turnos:", error);
                Swal.fire('Error', 'Problema de conexión al cargar los turnos.', 'error');
            } finally {
                setLoading(false);
            }
        };

        if (usuarioActual) {
            fetchMisTurnos();
            
            // WebSocket logic para mantener los turnos propios en vivo
            const socket = new SockJS(`${api}/ws-turnos`);
            const stompClient = new Client({
                webSocketFactory: () => socket,
                reconnectDelay: 5000,
                onConnect: () => {
                    stompClient.subscribe('/topic/turnos', (message) => {
                        if (message.body) {
                            // Fetch silencioso
                            fetch(`${api}/api/turnos/usuario/${usuarioActual}`, {
                                credentials: 'include'
                            }).then(res => {
                                if (res.ok) return res.json();
                                throw new Error("Error fetching silent");
                            }).then(data => {
                                const hoy = new Date();
                                hoy.setHours(0, 0, 0, 0);
                                const activos = [];
                                const pasados = [];
                                data.forEach(turno => {
                                    const [year, month, day] = turno.fecha.split('-');
                                    const fechaTurno = new Date(year, month - 1, day);
                                    fechaTurno.setHours(0, 0, 0, 0);
                                    if (fechaTurno >= hoy) activos.push(turno);
                                    else pasados.push(turno);
                                });
                                activos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
                                pasados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
                                setTurnosActivos(activos);
                                setTurnosPasados(pasados);
                            }).catch(err => console.error(err));
                        }
                    });
                }
            });
            stompClient.activate();

            return () => {
                stompClient.deactivate();
            };
        } else {
            setLoading(false);
        }
    }, [usuarioActual, api]);

    const formatearFecha = (fechaStr) => {
        const [year, month, day] = fechaStr.split('-');
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const renderTurnos = (turnos, esPasado) => {
        if (turnos.length === 0) {
            return (
                <div className="alert alert-light text-center border-0 shadow-sm text-muted">
                    No tienes turnos {esPasado ? 'pasados' : 'activos'} en este momento.
                </div>
            );
        }

        return (
            <div className="row g-3">
                {turnos.map(turno => (
                    <div key={turno.id} className="col-12 col-md-6 col-lg-4">
                        <div className={`card h-100 shadow-sm border-0 ${esPasado ? 'bg-body-tertiary' : 'border-start border-primary border-4'}`}>
                            <div className="card-body p-4">
                                <h5 className={`card-title fw-bold text-capitalize ${esPasado ? 'text-body-secondary' : 'text-primary'}`}>
                                    {formatearFecha(turno.fecha)}
                                </h5>
                                <h6 className="card-subtitle mb-3 text-muted">
                                    <i className="bi bi-clock-fill me-2"></i>
                                    {turno.horaInicio.slice(0, 5)} - {turno.horaFin.slice(0, 5)}
                                </h6>
                                <p className="card-text mb-2">
                                    <i className="bi bi-geo-alt-fill text-danger me-2"></i>
                                    <span className="fw-medium">{turno.punto.nombre}</span>
                                </p>
                                <hr className="my-3"/>
                                <div className="d-flex flex-column gap-2">
                                    <div className="d-flex align-items-center">
                                        <i className="bi bi-person-fill text-body-secondary me-2"></i>
                                        <span className={turno.publicador1?.usuario === usuarioActual ? 'fw-bold text-body' : 'text-muted'}>
                                            {turno.publicador1 ? `${turno.publicador1.nombre} ${turno.publicador1.apellido || ''}` : 'Libre'}
                                        </span>
                                    </div>
                                    <div className="d-flex align-items-center">
                                        <i className="bi bi-person-fill text-body-secondary me-2"></i>
                                        <span className={turno.publicador2?.usuario === usuarioActual ? 'fw-bold text-body' : 'text-muted'}>
                                            {turno.publicador2 ? `${turno.publicador2.nombre} ${turno.publicador2.apellido || ''}` : 'Libre'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid p-0 mt-4">
            <h4 className="fw-bold mb-4 text-primary">Mis Turnos Activos</h4>
            {renderTurnos(turnosActivos, false)}

            <h4 className="fw-bold mt-5 mb-4 text-body-secondary">Historial de Turnos</h4>
            {renderTurnos(turnosPasados, true)}
        </div>
    );
};

export default MisTurnosPublicos;
