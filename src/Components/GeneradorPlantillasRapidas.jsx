import { useMemo, useState } from 'react';
import Swal from 'sweetalert2';

const MAX_PLANTILLAS_POR_LOTE = 100;

const convertirHoraAMinutos = (hora) => {
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos;
};

const convertirMinutosAHora = (minutos) => {
    const horas = String(Math.floor(minutos / 60)).padStart(2, '0');
    const restoMinutos = String(minutos % 60).padStart(2, '0');
    return `${horas}:${restoMinutos}`;
};

const GeneradorPlantillasRapidas = ({ puntos, usuarios, onCreated }) => {
    const api = import.meta.env.VITE_API_URL;
    const diasSemana = [
        { value: 'MONDAY', label: 'Lunes' },
        { value: 'TUESDAY', label: 'Martes' },
        { value: 'WEDNESDAY', label: 'Miércoles' },
        { value: 'THURSDAY', label: 'Jueves' },
        { value: 'FRIDAY', label: 'Viernes' },
        { value: 'SATURDAY', label: 'Sábado' },
        { value: 'SUNDAY', label: 'Domingo' }
    ];
    const [diasSeleccionados, setDiasSeleccionados] = useState(['MONDAY']);
    const [puntoId, setPuntoId] = useState('');
    const [horaInicio, setHoraInicio] = useState('');
    const [horaFin, setHoraFin] = useState('');
    const [duracionMinutos, setDuracionMinutos] = useState('60');
    const [intervaloMinutos, setIntervaloMinutos] = useState('60');
    const [publicador1Id, setPublicador1Id] = useState('');
    const [publicador2Id, setPublicador2Id] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [progreso, setProgreso] = useState(0);

    const horarios = useMemo(() => {
        if (!horaInicio || !horaFin) return [];

        const inicio = convertirHoraAMinutos(horaInicio);
        const fin = convertirHoraAMinutos(horaFin);
        const duracion = Number(duracionMinutos);
        const intervalo = Number(intervaloMinutos);
        if (!Number.isInteger(duracion) || !Number.isInteger(intervalo) || duracion < 15 || intervalo < 15 || fin <= inicio) {
            return [];
        }

        const bloques = [];
        for (let minutos = inicio; minutos + duracion <= fin; minutos += intervalo) {
            bloques.push({
                horaInicio: convertirMinutosAHora(minutos),
                horaFin: convertirMinutosAHora(minutos + duracion)
            });
        }
        return bloques;
    }, [duracionMinutos, horaFin, horaInicio, intervaloMinutos]);

    const totalPlantillas = horarios.length * diasSeleccionados.length;
    const rangoInvalido = horaInicio && horaFin && convertirHoraAMinutos(horaFin) <= convertirHoraAMinutos(horaInicio);
    const puedeCrear = Boolean(
        puntoId &&
        diasSeleccionados.length > 0 &&
        horarios.length > 0 &&
        !rangoInvalido &&
        totalPlantillas <= MAX_PLANTILLAS_POR_LOTE &&
        !guardando
    );

    const alternarDia = (dia) => {
        setDiasSeleccionados(actuales => (
            actuales.includes(dia)
                ? actuales.filter(seleccionado => seleccionado !== dia)
                : [...actuales, dia]
        ));
    };

    const crearPlantillas = async (event) => {
        event.preventDefault();
        if (!puedeCrear) return;

        const plantillas = diasSeleccionados.flatMap(diaSemana =>
            horarios.map(horario => ({ diaSemana, ...horario }))
        );
        let creadas = 0;
        const errores = [];
        setGuardando(true);
        setProgreso(0);

        try {
            for (const [indice, plantilla] of plantillas.entries()) {
                const payload = {
                    diaSemana: plantilla.diaSemana,
                    horaInicio: `${plantilla.horaInicio}:00`,
                    horaFin: `${plantilla.horaFin}:00`,
                    punto: { id: Number(puntoId) }
                };
                if (publicador1Id) payload.publicador1 = { id: Number(publicador1Id) };
                if (publicador2Id) payload.publicador2 = { id: Number(publicador2Id) };

                try {
                    const response = await fetch(`${api}/api/turnos/crear`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(payload)
                    });
                    if (response.ok) {
                        creadas += 1;
                    } else {
                        const mensaje = await response.text();
                        const nombreDia = diasSemana.find(dia => dia.value === plantilla.diaSemana)?.label;
                        errores.push(`${nombreDia} ${plantilla.horaInicio}: ${mensaje || 'no se pudo crear'}`);
                    }
                } catch (error) {
                    console.error('Error de conexión al crear plantillas:', error);
                    errores.push('Se interrumpió la creación por un error de conexión.');
                    setProgreso(indice + 1);
                    break;
                }
                setProgreso(indice + 1);
            }

            if (creadas > 0) await onCreated();
            if (errores.length > 0) {
                await Swal.fire({
                    title: creadas > 0 ? 'Creación parcial' : 'No se pudieron crear las plantillas',
                    text: `${creadas} de ${plantillas.length} plantillas creadas. ${errores.slice(0, 4).join('; ')}`,
                    icon: creadas > 0 ? 'warning' : 'error'
                });
            } else {
                await Swal.fire({
                    title: '¡Plantillas creadas!',
                    text: `Se crearon ${creadas} plantillas para los días y horarios seleccionados.`,
                    icon: 'success'
                });
            }
        } catch (error) {
            console.error('Error al actualizar la lista de plantillas:', error);
            await Swal.fire('Error', 'Se crearon plantillas, pero no se pudo actualizar la lista.', 'error');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="card shadow-sm border-0 mb-4">
            <div className="card-body p-3 p-md-4">
                <div className="d-flex align-items-start gap-3 mb-3">
                    <span className="fs-3 text-success" aria-hidden="true">
                        <i className="bi bi-lightning-charge-fill"></i>
                    </span>
                    <div>
                        <h4 className="h5 fw-bold mb-1">Crear plantillas en lote</h4>
                        <p className="text-body-secondary mb-0 small">
                            Elegí días y un rango; el sistema arma los turnos según su duración e intervalo.
                        </p>
                    </div>
                </div>

                <form onSubmit={crearPlantillas}>
                    <div className="row g-3">
                        <div className="col-12 col-lg-4">
                            <label className="form-label fw-semibold" htmlFor="plantillas-rapidas-punto">Punto *</label>
                            <select
                                id="plantillas-rapidas-punto"
                                className="form-select"
                                value={puntoId}
                                onChange={event => setPuntoId(event.target.value)}
                                required
                            >
                                <option value="">Seleccioná un punto...</option>
                                {puntos.map(punto => (
                                    <option key={punto.id} value={punto.id}>{punto.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <fieldset className="col-12 col-lg-8">
                            <legend className="form-label fw-semibold">Días *</legend>
                            <div className="d-flex flex-wrap gap-2">
                                {diasSemana.map(dia => (
                                    <label className="form-check border rounded-2 bg-body px-2 py-1 mb-0" key={dia.value}>
                                        <input
                                            className="form-check-input ms-0 me-1"
                                            type="checkbox"
                                            checked={diasSeleccionados.includes(dia.value)}
                                            onChange={() => alternarDia(dia.value)}
                                            disabled={guardando}
                                        />
                                        <span className="form-check-label small">{dia.label}</span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        <div className="col-6 col-md-3">
                            <label className="form-label fw-semibold" htmlFor="plantillas-rapidas-desde">Desde *</label>
                            <input id="plantillas-rapidas-desde" type="time" className="form-control" value={horaInicio} onChange={event => setHoraInicio(event.target.value)} required />
                        </div>
                        <div className="col-6 col-md-3">
                            <label className="form-label fw-semibold" htmlFor="plantillas-rapidas-hasta">Hasta *</label>
                            <input id="plantillas-rapidas-hasta" type="time" className="form-control" value={horaFin} onChange={event => setHoraFin(event.target.value)} required />
                        </div>
                        <div className="col-6 col-md-3">
                            <label className="form-label fw-semibold" htmlFor="plantillas-rapidas-duracion">Duración (min) *</label>
                            <input id="plantillas-rapidas-duracion" type="number" className="form-control" min="15" step="15" value={duracionMinutos} onChange={event => setDuracionMinutos(event.target.value)} required />
                        </div>
                        <div className="col-6 col-md-3">
                            <label className="form-label fw-semibold" htmlFor="plantillas-rapidas-intervalo">Intervalo entre inicios (min) *</label>
                            <input id="plantillas-rapidas-intervalo" type="number" className="form-control" min="15" step="15" value={intervaloMinutos} onChange={event => setIntervaloMinutos(event.target.value)} required />
                        </div>

                        <div className="col-12 col-md-6">
                            <label className="form-label fw-semibold" htmlFor="plantillas-rapidas-publicador1">Publicador 1 (opcional)</label>
                            <select id="plantillas-rapidas-publicador1" className="form-select" value={publicador1Id} onChange={event => setPublicador1Id(event.target.value)}>
                                <option value="">Sin asignar</option>
                                {usuarios.map(usuario => (
                                    <option key={usuario.id} value={usuario.id}>{usuario.nombre} {usuario.apellido || ''}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-12 col-md-6">
                            <label className="form-label fw-semibold" htmlFor="plantillas-rapidas-publicador2">Publicador 2 (opcional)</label>
                            <select id="plantillas-rapidas-publicador2" className="form-select" value={publicador2Id} onChange={event => setPublicador2Id(event.target.value)}>
                                <option value="">Sin asignar</option>
                                {usuarios.map(usuario => (
                                    <option key={usuario.id} value={usuario.id}>{usuario.nombre} {usuario.apellido || ''}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-12 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                            <div className="small text-body-secondary">
                                {rangoInvalido
                                    ? <span className="text-danger">La hora final debe ser posterior a la inicial.</span>
                                    : horarios.length > 0
                                        ? <><strong>{totalPlantillas}</strong> plantilla(s): {horarios.slice(0, 4).map(horario => `${horario.horaInicio}–${horario.horaFin}`).join(' · ')}{horarios.length > 4 ? ` · +${horarios.length - 4} más` : ''}</>
                                        : 'Completá un rango válido para ver una vista previa.'}
                                {totalPlantillas > MAX_PLANTILLAS_POR_LOTE && (
                                    <span className="d-block text-danger">El máximo por lote es de {MAX_PLANTILLAS_POR_LOTE} plantillas.</span>
                                )}
                                <span className="d-block">El intervalo se mide entre inicios; si es menor que la duración, los turnos se superponen.</span>
                                <span className="d-block">Los publicadores elegidos se asignan a todas las plantillas del lote.</span>
                            </div>
                            <button type="submit" className="btn btn-success fw-bold flex-shrink-0" disabled={!puedeCrear}>
                                {guardando ? (
                                    <><span className="spinner-border spinner-border-sm me-2" role="status" />Creando {progreso}/{totalPlantillas}...</>
                                ) : (
                                    <><i className="bi bi-lightning-charge me-1"></i>Crear {totalPlantillas} plantilla(s)</>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GeneradorPlantillasRapidas;
