import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { NumerosContext } from '../context/NumerosContext';
import { 
    PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

// Función para calcular el año de servicio (Septiembre - Agosto)
const getServiceYear = (date = new Date()) => {
    const month = date.getMonth(); // 0 a 11 (8 = Septiembre)
    const year = date.getFullYear();
    return month >= 8 ? year + 1 : year;
};

const EstadisticasDashboard = () => {
    const { numeros } = useContext(NumerosContext);
    const navigate = useNavigate();
    const [turnos, setTurnos] = useState([]);
    const [territorios, setTerritorios] = useState([]);
    const [loading, setLoading] = useState(true);
    const api = import.meta.env.VITE_API_URL;
    
    // Año de servicio actual (ej: Oct 2026 -> Año de servicio 2027)
    const currentServiceYear = getServiceYear();
    const [yearSelected, setYearSelected] = useState(currentServiceYear.toString());

    // --- Telefónica Stats ---
    const numerosContestados = numeros.filter(numero => numero.contesta);
    const totalNumeros = numeros.length;
    const progresoTelefonica = totalNumeros > 0 ? Math.round((numerosContestados.length / totalNumeros) * 100) : 0;
    const necesitaReinicio = progresoTelefonica >= 70;

    const dataPieTelefonica = [
        { name: 'Contactados', value: numerosContestados.length },
        { name: 'Pendientes/No Contestan', value: totalNumeros - numerosContestados.length }
    ];
    const COLORS_TELEFONICA = ['#10b981', '#cbd5e1'];

    // Cargar datos del año de servicio seleccionado
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [resTurnos, resTerritorios] = await Promise.all([
                    fetch(`${api}/api/turnos/todos?year=${yearSelected}`, { credentials: 'include' }),
                    fetch(`${api}/territorios/traer`, { credentials: 'include' })
                ]);
                
                if (resTurnos.ok) setTurnos(await resTurnos.json());
                if (resTerritorios.ok) setTerritorios(await resTerritorios.json());
            } catch (error) {
                console.error("Error al cargar datos", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [api, yearSelected]);

    // --- Pública Stats ---
    const getPublicaStats = () => {
        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const añoActual = hoy.getFullYear();

        const mesPasado = mesActual === 0 ? 11 : mesActual - 1;
        const añoMesPasado = mesActual === 0 ? añoActual - 1 : añoActual;

        let cubiertosEsteMes = 0;
        let cubiertosMesPasado = 0;
        const asistenciaPuntos = {};

        turnos.forEach(turno => {
            if (!turno.fecha) return;
            const [year, month] = turno.fecha.split('-').map(Number);
            const turnoDate = new Date(year, month - 1);
            const tMonth = turnoDate.getMonth();
            const tYear = turnoDate.getFullYear();

            const cuposOcupados = (turno.publicador1 ? 1 : 0) + (turno.publicador2 ? 1 : 0);
            
            if (tYear === añoActual && tMonth === mesActual) {
                cubiertosEsteMes += cuposOcupados;
            } else if (tYear === añoMesPasado && tMonth === mesPasado) {
                cubiertosMesPasado += cuposOcupados;
            }

            if (turno.punto && turno.punto.nombre) {
                if (!asistenciaPuntos[turno.punto.nombre]) {
                    asistenciaPuntos[turno.punto.nombre] = { ocupados: 0, total: 0 };
                }
                asistenciaPuntos[turno.punto.nombre].ocupados += cuposOcupados > 0 ? 1 : 0;
                asistenciaPuntos[turno.punto.nombre].total += 1;
            }
        });

        const dataMensual = [
            { name: 'Mes Pasado', 'Turnos Cubiertos': cubiertosMesPasado },
            { name: 'Este Mes', 'Turnos Cubiertos': cubiertosEsteMes }
        ];

        const dataPuntos = Object.keys(asistenciaPuntos)
            .map(nombre => {
                const p = asistenciaPuntos[nombre];
                const porcentaje = p.total > 0 ? Math.round((p.ocupados / p.total) * 100) : 0;
                return { nombre, porcentaje, ocupados: p.ocupados, total: p.total };
            })
            .sort((a, b) => a.porcentaje - b.porcentaje);

        return { dataMensual, dataPuntos };
    };

    // --- Territorios Stats y Alarmas ---
    const terrStats = useMemo(() => {
        const total = territorios.length;
        const asignados = territorios.filter(t => t.asignadoA).length;
        const sinAsignar = total - asignados;
        
        const dataAsignacion = [
            { name: 'Asignados', value: asignados },
            { name: 'Sin Asignar', value: sinAsignar }
        ];

        let nunca = 0;
        let recientes = 0; // <= 30 dias
        let medios = 0; // 31 a 90 dias
        let antiguos = 0; // > 90 dias

        const hoy = new Date();

        // Rango de fechas del año de servicio seleccionado (1 Sept del año anterior al 31 Ago del año actual)
        const syNum = parseInt(yearSelected, 10);
        const inicioSY = new Date(syNum - 1, 8, 1, 0, 0, 0); // 1 de Septiembre
        const finSY = new Date(syNum, 7, 31, 23, 59, 59);     // 31 de Agosto

        let cubiertosEnSY = 0;

        const alarmasList = [];

        territorios.forEach(t => {
            // Chequear si se trabajó dentro de este año de servicio
            let trabajadoEnEsteSY = false;
            if (t.ultimaFechaTrabajada) {
                const f = new Date(t.ultimaFechaTrabajada);
                if (f >= inicioSY && f <= finSY) trabajadoEnEsteSY = true;
            }
            if (!trabajadoEnEsteSY && t.fechasTrabajado && Array.isArray(t.fechasTrabajado)) {
                trabajadoEnEsteSY = t.fechasTrabajado.some(fStr => {
                    const f = new Date(fStr);
                    return f >= inicioSY && f <= finSY;
                });
            }
            if (trabajadoEnEsteSY) cubiertosEnSY++;

            // Chequeo de inactividad / alarmas
            if (!t.ultimaFechaTrabajada) {
                nunca++;
                alarmasList.push({
                    ...t,
                    diffDays: 9999,
                    nivelAlarma: 'critica',
                    motivo: 'Nunca trabajado',
                    meses: 'Sin visitas'
                });
            } else {
                const fecha = new Date(t.ultimaFechaTrabajada);
                const diffTime = Math.abs(hoy - fecha);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                if (diffDays <= 30) recientes++;
                else if (diffDays <= 90) medios++;
                else antiguos++;

                // Alarma si pasaron más de 120 días (4 meses)
                if (diffDays >= 180) {
                    alarmasList.push({
                        ...t,
                        diffDays,
                        nivelAlarma: 'critica',
                        motivo: `Hace ${Math.floor(diffDays / 30)} meses`,
                        meses: `${Math.floor(diffDays / 30)} meses`
                    });
                } else if (diffDays >= 120) {
                    alarmasList.push({
                        ...t,
                        diffDays,
                        nivelAlarma: 'atencion',
                        motivo: `Hace ${Math.floor(diffDays / 30)} meses`,
                        meses: `${Math.floor(diffDays / 30)} meses`
                    });
                }
            }
        });

        alarmasList.sort((a, b) => b.diffDays - a.diffDays);

        const dataAntiguedad = [
            { name: 'Nunca Trabajados', value: nunca, fill: '#ef4444' },
            { name: 'Más de 3 meses', value: antiguos, fill: '#f97316' },
            { name: '1 a 3 meses', value: medios, fill: '#eab308' },
            { name: 'Menos de 1 mes', value: recientes, fill: '#22c55e' },
        ];

        const porcentajeAsignados = total > 0 ? Math.round((asignados / total) * 100) : 0;
        const porcentajeCoberturaSY = total > 0 ? Math.round((cubiertosEnSY / total) * 100) : 0;

        return { 
            dataAsignacion, 
            dataAntiguedad, 
            total, 
            asignados, 
            porcentajeAsignados, 
            nunca, 
            sinAsignar,
            cubiertosEnSY,
            porcentajeCoberturaSY,
            alarmasList
        };
    }, [territorios, yearSelected]);

    // --- Métricas de Edificios y Departamentos ---
    const edificiosStats = useMemo(() => {
        let totalEdificios = 0;
        let totalDeptos = 0;
        let atendieron = 0;
        let noEnCasa = 0;
        let ocupados = 0;
        let revisitas = 0;
        let noTocar = 0;
        let noVisitados = 0;

        const ranking = [];

        territorios.forEach(t => {
            (t.manzanas || []).forEach(m => {
                (m.edificios || []).forEach(e => {
                    totalEdificios++;
                    const deptos = e.departamentos || [];
                    const cantDeptos = deptos.length;
                    totalDeptos += cantDeptos;
                    let atendidosEnEd = 0;

                    deptos.forEach(d => {
                        if (!d.tocar) {
                            noTocar++;
                        } else if (d.estado === 'Atendió') {
                            atendieron++;
                            atendidosEnEd++;
                        } else if (d.estado === 'No en casa') {
                            noEnCasa++;
                        } else if (d.estado === 'Ocupado') {
                            ocupados++;
                        } else if (d.estado === 'Revisita') {
                            revisitas++;
                            atendidosEnEd++;
                        } else {
                            noVisitados++;
                        }
                    });

                    if (cantDeptos > 0) {
                        ranking.push({
                            id: e.id,
                            direccion: e.direccion,
                            territorioNumero: t.numero,
                            manzanaNombre: m.nombre,
                            total: cantDeptos,
                            atendieron: atendidosEnEd,
                            porcentaje: Math.round((atendidosEnEd / cantDeptos) * 100),
                            territorioId: t.id,
                            manzanaId: m.id
                        });
                    }
                });
            });
        });

        ranking.sort((a, b) => b.porcentaje - a.porcentaje || b.total - a.total);

        const dataTimbresPie = [
            { name: 'Atendió / Revisita', value: atendieron + revisitas, color: '#10b981' },
            { name: 'No en casa', value: noEnCasa, color: '#f59e0b' },
            { name: 'Ocupado', value: ocupados, color: '#64748b' },
            { name: 'No Tocar', value: noTocar, color: '#ef4444' },
            { name: 'No Visitado', value: noVisitados, color: '#cbd5e1' }
        ].filter(d => d.value > 0);

        const totalTocados = atendieron + noEnCasa + ocupados + revisitas;
        const tasaEfectividad = totalTocados > 0 ? Math.round(((atendieron + revisitas) / totalTocados) * 100) : 0;

        return {
            totalEdificios,
            totalDeptos,
            atendieron,
            noEnCasa,
            ocupados,
            revisitas,
            noTocar,
            noVisitados,
            tasaEfectividad,
            dataTimbresPie,
            topEdificios: ranking.slice(0, 5)
        };
    }, [territorios]);

    const { dataMensual, dataPuntos } = getPublicaStats();

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando métricas...</span>
                </div>
            </div>
        );
    }

    const syNum = parseInt(yearSelected, 10);

    return (
        <div className="container-fluid p-0 mt-3 pb-5">
            
            {/* Header y Selector de Año de Servicio */}
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4 bg-body p-3 rounded-4 shadow-sm border">
                <div>
                    <h4 className="fw-bold text-body m-0 d-flex align-items-center gap-2">
                        <i className="bi bi-bar-chart-fill text-primary"></i>
                        Tablero de Estadísticas
                    </h4>
                    <span className="text-body-secondary small">
                        Año teocrático de servicio: Septiembre {syNum - 1} a Agosto {syNum}
                    </span>
                </div>

                <div className="d-flex align-items-center bg-body-tertiary rounded-pill px-3 py-1 border shadow-sm">
                    <i className="bi bi-calendar-check text-primary me-2"></i>
                    <span className="text-body-secondary fw-semibold small me-2">Año de Servicio:</span>
                    <select 
                        className="form-select form-select-sm border-0 bg-transparent fw-bold text-primary p-0 pe-3" 
                        value={yearSelected} 
                        onChange={(e) => setYearSelected(e.target.value)}
                        style={{ width: 'auto', cursor: 'pointer', outline: 'none', boxShadow: 'none' }}
                    >
                        <option value={currentServiceYear + 1}>
                            {currentServiceYear + 1} (Sept {currentServiceYear} - Ago {currentServiceYear + 1})
                        </option>
                        <option value={currentServiceYear}>
                            {currentServiceYear} (Sept {currentServiceYear - 1} - Ago {currentServiceYear}) [Actual]
                        </option>
                        <option value={currentServiceYear - 1}>
                            {currentServiceYear - 1} (Sept {currentServiceYear - 2} - Ago {currentServiceYear - 1})
                        </option>
                        <option value={currentServiceYear - 2}>
                            {currentServiceYear - 2} (Sept {currentServiceYear - 3} - Ago {currentServiceYear - 2})
                        </option>
                    </select>
                </div>
            </div>

            {/* SECCIÓN 1: ALARMAS DE TERRITORIOS INACTIVOS / FRÍOS */}
            {terrStats.alarmasList.length > 0 && (
                <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden border-start border-danger border-5 bg-body">
                    <div className="card-header bg-danger bg-opacity-10 border-0 p-3 d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-danger rounded-circle p-2 d-flex align-items-center justify-content-center">
                                <i className="bi bi-bell-fill fs-6"></i>
                            </span>
                            <div>
                                <h6 className="fw-bold text-danger mb-0">
                                    ¡Alarma de Inactividad! {terrStats.alarmasList.length} Territorios Requieren Salida Urgente
                                </h6>
                                <small className="text-body-secondary">
                                    Territorios con más de 4 meses sin trabajarse o que nunca fueron visitados.
                                </small>
                            </div>
                        </div>
                        <span className="badge bg-danger rounded-pill px-3 py-2 fw-bold">
                            {terrStats.alarmasList.length} en Alerta
                        </span>
                    </div>
                    <div className="card-body p-3">
                        <div className="row g-2">
                            {terrStats.alarmasList.slice(0, 6).map(t => (
                                <div className="col-12 col-md-6 col-lg-4" key={t.id}>
                                    <div 
                                        className="p-3 rounded-3 border bg-body-tertiary d-flex justify-content-between align-items-center hover-shadow"
                                        style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                                        onClick={() => navigate('/edificios', { state: { territorioId: t.id, t: Date.now() } })}
                                        title="Click para abrir este territorio"
                                    >
                                        <div>
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="fw-bold text-body fs-6">Territorio #{t.numero}</span>
                                                <span className={`badge ${t.nivelAlarma === 'critica' ? 'bg-danger' : 'bg-warning text-dark'} rounded-pill`} style={{ fontSize: '0.65rem' }}>
                                                    {t.motivo}
                                                </span>
                                            </div>
                                            <small className="text-body-secondary d-block mt-1">
                                                {t.asignadoA ? `Asignado a: ${t.asignadoA.nombre}` : '⚠️ Sin asignar actualmente'}
                                            </small>
                                        </div>
                                        <button className="btn btn-sm btn-outline-danger rounded-pill px-2 py-1">
                                            <i className="bi bi-arrow-right"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* SECCIÓN 2: TARJETAS DE COBERTURA GENERAL */}
            <div className="row g-3 mb-4">
                {/* Cobertura del Año de Servicio */}
                <div className="col-12 col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100 bg-body p-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-body-secondary small fw-bold text-uppercase">Cobertura Año {syNum}</span>
                            <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill p-2">
                                <i className="bi bi-calendar-range fs-5"></i>
                            </span>
                        </div>
                        <h2 className="fw-bold text-primary mb-1">{terrStats.porcentajeCoberturaSY}%</h2>
                        <span className="text-body-secondary small mb-3">
                            {terrStats.cubiertosEnSY} de {terrStats.total} territorios trabajados en este ciclo
                        </span>
                        <div className="progress mt-auto" style={{ height: '8px' }}>
                            <div 
                                className="progress-bar bg-primary" 
                                role="progressbar" 
                                style={{ width: `${terrStats.porcentajeCoberturaSY}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Asignación de Territorios */}
                <div className="col-12 col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100 bg-body p-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-body-secondary small fw-bold text-uppercase">Territorios Asignados</span>
                            <span className="badge bg-info bg-opacity-10 text-info rounded-pill p-2">
                                <i className="bi bi-person-check fs-5"></i>
                            </span>
                        </div>
                        <h2 className="fw-bold text-info mb-1">{terrStats.porcentajeAsignados}%</h2>
                        <span className="text-body-secondary small mb-3">
                            {terrStats.asignados} asignados • {terrStats.sinAsignar} libres para asignar
                        </span>
                        <div className="progress mt-auto" style={{ height: '8px' }}>
                            <div 
                                className="progress-bar bg-info" 
                                role="progressbar" 
                                style={{ width: `${terrStats.porcentajeAsignados}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Efectividad en Edificios */}
                <div className="col-12 col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100 bg-body p-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-body-secondary small fw-bold text-uppercase">Efectividad en Edificios</span>
                            <span className="badge bg-success bg-opacity-10 text-success rounded-pill p-2">
                                <i className="bi bi-building-check fs-5"></i>
                            </span>
                        </div>
                        <h2 className="fw-bold text-success mb-1">{edificiosStats.tasaEfectividad}%</h2>
                        <span className="text-body-secondary small mb-3">
                            {edificiosStats.atendieron + edificiosStats.revisitas} respuestas en {edificiosStats.totalDeptos} timbres
                        </span>
                        <div className="progress mt-auto" style={{ height: '8px' }}>
                            <div 
                                className="progress-bar bg-success" 
                                role="progressbar" 
                                style={{ width: `${edificiosStats.tasaEfectividad}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 3: GRÁFICOS Y DETALLES */}
            <div className="row g-4">
                
                {/* 1. Edificios: Estados de Timbres */}
                <div className="col-12 col-xl-6">
                    <div className="card border-0 shadow-sm rounded-4 h-100 bg-body p-4">
                        <h5 className="fw-bold text-primary mb-1">
                            <i className="bi bi-buildings me-2"></i>
                            Porteros y Timbres de Edificios
                        </h5>
                        <p className="text-body-secondary small mb-3">
                            Distribución de estados en los {edificiosStats.totalEdificios} edificios ({edificiosStats.totalDeptos} departamentos).
                        </p>

                        <div style={{ height: '260px', width: '100%', minWidth: 0 }}>
                            <ResponsiveContainer width="99%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={edificiosStats.dataTimbresPie}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={90}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {edificiosStats.dataTimbresPie.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Top 3 edificios con mayor atención */}
                        {edificiosStats.topEdificios.length > 0 && (
                            <div className="mt-3 pt-3 border-top">
                                <small className="fw-bold text-body-secondary text-uppercase d-block mb-2">
                                    🏢 Edificios con mejor tasa de respuesta:
                                </small>
                                <div className="d-flex flex-column gap-2">
                                    {edificiosStats.topEdificios.slice(0, 3).map(ed => (
                                        <div 
                                            key={ed.id}
                                            className="d-flex justify-content-between align-items-center p-2 rounded bg-body-tertiary small"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => navigate('/edificios', { state: { territorioId: ed.territorioId, manzanaId: ed.manzanaId, edificioId: ed.id, t: Date.now() } })}
                                        >
                                            <span className="fw-semibold text-body text-truncate me-2">
                                                {ed.direccion} <span className="text-body-secondary fw-normal">(T#{ed.territorioNumero})</span>
                                            </span>
                                            <span className="badge bg-success bg-opacity-10 text-success border border-success rounded-pill px-2">
                                                {ed.porcentaje}% atendió ({ed.atendieron}/{ed.total})
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Territorios: Antigüedad de Trabajo */}
                <div className="col-12 col-xl-6">
                    <div className="card border-0 shadow-sm rounded-4 h-100 bg-body p-4">
                        <h5 className="fw-bold text-warning mb-1">
                            <i className="bi bi-clock-history me-2"></i>
                            Antigüedad de Territorios
                        </h5>
                        <p className="text-body-secondary small mb-3">
                            Tiempo transcurrido desde la última vez que fueron trabajados.
                        </p>
                        
                        <div style={{ height: '320px', width: '100%', minWidth: 0 }}>
                            <ResponsiveContainer width="99%" height="100%">
                                <BarChart data={terrStats.dataAntiguedad} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" axisLine={false} tickLine={false} />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={115} />
                                    <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
                                        {terrStats.dataAntiguedad.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 3. Telefónica: Progreso */}
                <div className="col-12 col-md-6">
                    <div className="card border-0 shadow-sm rounded-4 h-100 bg-body p-4">
                        <h5 className="fw-bold text-success mb-1">
                            <i className="bi bi-telephone-fill me-2"></i>
                            Progreso Telefónico
                        </h5>
                        <p className="text-body-secondary small mb-3">
                            Porcentaje de números con respuesta en la base telefónica.
                        </p>
                        
                        <div style={{ height: '240px', width: '100%', minWidth: 0 }}>
                            <ResponsiveContainer width="99%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={dataPieTelefonica}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {dataPieTelefonica.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS_TELEFONICA[index % COLORS_TELEFONICA.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        
                        <div className="text-center mt-2">
                            <h3 className={`fw-bold mb-0 ${necesitaReinicio ? 'text-warning' : 'text-success'}`}>
                                {progresoTelefonica}%
                            </h3>
                            <span className="text-body-secondary small">Contactados ({numerosContestados.length} de {totalNumeros})</span>
                        </div>
                    </div>
                </div>

                {/* 4. Pública: Comparativa Mensual de Turnos */}
                <div className="col-12 col-md-6">
                    <div className="card border-0 shadow-sm rounded-4 h-100 bg-body p-4">
                        <h5 className="fw-bold text-info mb-1">
                            <i className="bi bi-calendar3 me-2"></i>
                            Turnos de Predicación Pública (Año {syNum})
                        </h5>
                        <p className="text-body-secondary small mb-3">
                            Cupos de turnos cubiertos en el período de servicio.
                        </p>
                        
                        <div style={{ height: '240px', width: '100%', minWidth: 0 }}>
                            <ResponsiveContainer width="99%" height="100%">
                                <BarChart data={dataMensual} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} width={30} />
                                    <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                    <Bar dataKey="Turnos Cubiertos" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={45} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="text-center mt-2">
                            <span className="text-body-secondary small">
                                {turnos.length} turnos registrados en el Año de Servicio {syNum}
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default EstadisticasDashboard;
