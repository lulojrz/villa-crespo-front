import React from 'react'
import { createContext, useState, useEffect } from 'react'
import Swal from 'sweetalert2'

export const NumerosContext = createContext()

export const NumerosProvider = ({ children }) => {


    const [numero, setNumero] = useState()
    const [numeros, setNumeros] = useState([])
    const [error, setError] = useState(false)
    const [loading, setLoading] = useState(true)
    const [isAuthenticated, setIsAuth] = useState(() => localStorage.getItem('isAuth') === 'true')
    const [seleccionado, setSeleccionado] = useState(null)
    const [busqueda, setBusqueda] = useState("")
    const [filtroTerritorio, setFiltroTerritorio] = useState("")
    const [filtroEdificio, setFiltroEdificio] = useState("")
    const [filtroReservado, setFiltroReservado] = useState("")
    const [filtroFechaDesde, setFiltroFechaDesde] = useState("")
    const [filtroFechaHasta, setFiltroFechaHasta] = useState("")
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    });

    // Estado del Buscador Inteligente Global
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const abrirBuscador = () => setIsSearchOpen(true);
    const cerrarBuscador = () => setIsSearchOpen(false);

    // Territorios en caché global
    const [territorios, setTerritorios] = useState([]);
    const [loadingTerritorios, setLoadingTerritorios] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Atajo global Ctrl+K / Cmd+K para abrir/cerrar buscador
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsSearchOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    const api = `${import.meta.env.VITE_API_URL}`

    const cargarTerritorios = async (force = false) => {
        if (!force && territorios.length > 0) return territorios;
        setLoadingTerritorios(true);
        try {
            const timestamp = new Date().getTime();
            const res = await fetch(`${api}/territorios/traer?t=${timestamp}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setTerritorios(data);
                return data;
            }
        } catch (e) {
            console.error("Error al cargar territorios:", e);
        } finally {
            setLoadingTerritorios(false);
        }
        return [];
    };

    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
        }
    });

    useEffect(() => {
        cargarProductos();
    }, [])

    const actualizarNumero = async (objetoActualizado) => {
        // Actualización optimista de la UI
        setNumeros(prev => prev.map(n => n.id === objetoActualizado.id ? objetoActualizado : n));

        try {
            await fetch(`${api}/api/editar/${objetoActualizado.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(objetoActualizado)
            })
            Toast.fire({
                icon: 'success',
                title: 'Número actualizado con éxito'
            });
            cargarProductos();
        }   
        catch (error) {
            Toast.fire({
                icon: 'error',
                title: 'Error al actualizar el número'
            });
            // Revertir en caso de error
            cargarProductos();
        }

    }


        const cargarProductos = async () => {
            setLoading(true)
            try {
                const response = await fetch(api + '/api/numeros', { credentials: 'include' })
                if (response.ok) {
                    const data = await response.json()
                    if (Array.isArray(data)) {
                        setNumeros(data)
                    } else {
                        setNumeros([])
                    }
                } else {
                    setNumeros([])
                }
            }
            catch (error) {
                setNumeros([])
            } finally {
                setLoading(false)
            }
        }


        const productosFiltrados = numeros.filter((num) => {
            const matchesDireccion = num?.direccion?.toLowerCase().includes(busqueda.toLowerCase()) ?? false;
            const matchesTerritorio = filtroTerritorio === "" || (num?.territorio && num.territorio.toString().toLowerCase() === filtroTerritorio.toLowerCase());
            const matchesEdificio = filtroEdificio === "" || (num?.edificio && num.edificio.toString().toLowerCase() === filtroEdificio.toLowerCase());

            let matchesReservado = true;
            if (filtroReservado === "si") matchesReservado = num?.reservado === true;
            if (filtroReservado === "no") matchesReservado = num?.reservado === false;

            let matchesFecha = true;
            if (filtroFechaDesde || filtroFechaHasta) {
                if (!num.ultimaFecha) {
                    matchesFecha = false;
                } else {
                    const fechaNum = num.ultimaFecha.slice(0, 10);
                    if (filtroFechaDesde && fechaNum < filtroFechaDesde) matchesFecha = false;
                    if (filtroFechaHasta && fechaNum > filtroFechaHasta) matchesFecha = false;
                }
            }

            return matchesDireccion && matchesTerritorio && matchesEdificio && matchesReservado && matchesFecha;
        }).sort((a, b) => {
            const terrA = String(a.territorio || '');
            const terrB = String(b.territorio || '');
            const diffTerr = terrA.localeCompare(terrB, undefined, { numeric: true, sensitivity: 'base' });
            if (diffTerr !== 0) return diffTerr;

            const edificioA = String(a.edificio || '');
            const edificioB = String(b.edificio || '');
            return edificioA.localeCompare(edificioB, undefined, { numeric: true, sensitivity: 'base' });
        });


        const eliminarNumero = async (id) => {
            const result = await Swal.fire({
                title: '¿Estás seguro?',
                text: "Deseas eliminar este número? Esta acción no se puede revertir.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#0d6efd',
                cancelButtonColor: '#dc3545',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            });

            if (!result.isConfirmed) return;

            try {
                await fetch(`${api}/api/borrar/${id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                })
                Toast.fire({
                    icon: 'success',
                    title: 'Número eliminado con éxito'
                });
                cargarProductos();
            }
            catch (error) {
    
                Toast.fire({
                    icon: 'error',
                    title: 'Error al eliminar el número'
                });
            }
        }





        const agregarNumero = async (number) => {

            try {
                await fetch(`${api}/api/agregar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify(number)
                })
                Toast.fire({
                    icon: 'success',
                    title: 'Número agregado con éxito'
                });
                cargarProductos();
            }
            catch (error) {
    
                Toast.fire({
                    icon: 'error',
                    title: 'Error al agregar el número'
                });
            }
        }




        const actualizarReserva = async (filtrados, usuarioSeleccionado) => {

            const d = new Date();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            const currentDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
            
            let filtraditos = filtrados.map((num) => ({
                ...num,
                reservado: true,
                fechaReserva: currentDate,
                ultUsuario: num.ultUsuario && num.ultUsuario.usuario ? { usuario: num.ultUsuario.usuario } : null,
                reservadoA: usuarioSeleccionado ? { usuario: usuarioSeleccionado.usuario } : null,
                tocar: num.tocar !== undefined ? num.tocar : true
            }));


            // Optimistic UI update
            setNumeros(prev => prev.map(n => {
                const updated = filtraditos.find(f => f.id === n.id);
                return updated ? updated : n;
            }));

            try {
                // Wait for all PUT requests in parallel
                await Promise.all(filtraditos.map(num => 
                    fetch(`${api}/api/editar/${num.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(num)
                    })
                ));
                
                Toast.fire({
                    icon: 'success',
                    title: 'Números reservados con éxito'
                });
            } catch (error) {
    ;
                Toast.fire({
                    icon: 'error',
                    title: 'Error en el servidor al guardar reservas'
                });
                cargarProductos(); // Sync with server again in case of failure
            }
        }
        
        const sacarReservados = async (filtrados) => {
            let noReservados = filtrados.map((num) => ({
                ...num,
                reservado: false,
                reservadoA: null,
                fechaReserva: null,
                ultUsuario: num.ultUsuario && num.ultUsuario.usuario ? { usuario: num.ultUsuario.usuario } : null,
                tocar: num.tocar !== undefined ? num.tocar : true
            }));

            // Optimistic UI update
            setNumeros(prev => prev.map(n => {
                const updated = noReservados.find(f => f.id === n.id);
                return updated ? updated : n;
            }));

            try {
                // Wait for all PUT requests in parallel
                await Promise.all(noReservados.map(num => 
                    fetch(`${api}/api/editar/${num.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(num)
                    })
                ));
                
                Toast.fire({
                    icon: 'success',
                    title: 'Reservados sacados con éxito'
                });
            } catch (error) {
    ;
                Toast.fire({
                    icon: 'error',
                    title: 'Error en el servidor al liberar reservas'
                });
                cargarProductos(); // Sync with server again in case of failure
            }
        }

        const reiniciarContesta = async (filtrados) => {
            let reiniciados = filtrados.map((num) => ({
                ...num,
                contesta: false,
                tocar: num.tocar !== undefined ? num.tocar : true,
                ultUsuario: num.ultUsuario && num.ultUsuario.usuario ? { usuario: num.ultUsuario.usuario } : null,
                reservadoA: num.reservadoA && num.reservadoA.usuario ? { usuario: num.reservadoA.usuario } : null
            }));

            setNumeros(prev => prev.map(n => {
                const updated = reiniciados.find(f => f.id === n.id);
                return updated ? updated : n;
            }));

            try {
                await Promise.all(reiniciados.map(num => 
                    fetch(`${api}/api/editar/${num.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(num)
                    })
                ));
                Toast.fire({ icon: 'success', title: 'Números marcados como "No contesta"' });
            } catch (error) {
                Toast.fire({ icon: 'error', title: 'Error al reiniciar contesta' });
                cargarProductos();
            }
        }


        return (
            <NumerosContext.Provider value={{ 
                numero, setNumero, actualizarNumero, numeros, setNumeros, error, loading, 
                isAuthenticated, setIsAuth, eliminarNumero, seleccionado, setSeleccionado, 
                agregarNumero, cargarProductos, productosFiltrados, busqueda, setBusqueda, 
                filtroTerritorio, setFiltroTerritorio, filtroEdificio, setFiltroEdificio, 
                filtroReservado, setFiltroReservado, filtroFechaDesde, setFiltroFechaDesde, 
                filtroFechaHasta, setFiltroFechaHasta, actualizarReserva, sacarReservados, 
                reiniciarContesta, theme, setTheme,
                isSearchOpen, setIsSearchOpen, abrirBuscador, cerrarBuscador,
                territorios, setTerritorios, loadingTerritorios, cargarTerritorios
            }}>
                {children}
            </NumerosContext.Provider>
        )

    }
