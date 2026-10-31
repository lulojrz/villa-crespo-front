import React, { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { NumerosContext } from './NumerosContext.jsx'
import Swal from 'sweetalert2'
import { normalizarRol } from '../utils/permisos'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState('')
    const [password, setPassword] = useState('')
    const { setIsAuth } = useContext(NumerosContext)
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const [isDoorOpening, setIsDoorOpening] = useState(false)

    useEffect(() => {
        const isAuthenticated = localStorage.getItem('isAuth') === 'true'
        if (isAuthenticated) {
            setIsAuth(true)
            if (window.location.pathname === '/login') {
                navigate("/")
            }
        }
    }, [navigate, setIsAuth])

    const handleSubmit = async (e) => {
        e.preventDefault();

        const cleanUser = user.trim().toLowerCase();
        const cleanPassword = password.trim();

        let validationErrors = {};
        if (!cleanUser) validationErrors.user = 'Usuario es requerido';
        if (!cleanPassword) validationErrors.password = 'Contraseña es requerida';

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/usuarios/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ usuario: cleanUser, contrasena: cleanPassword })
            });

            if (!res.ok) {
                if (res.status === 502 || res.status === 503) {
                    Swal.fire(
                        'Servidor iniciando',
                        'El servidor está despertando. Por favor, reintentá en 10 segundos.',
                        'info'
                    );
                    return;
                }

                const errorMessage = await res.text();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage || 'Credenciales incorrectas o error en la autenticación',
                    confirmButtonColor: 'var(--bs-primary)'
                });
                return;
            }

            const responseData = await res.json();

            // As we return the user object, it should have the 'usuario' field if successful
            if (responseData && responseData.usuario) {
                setErrors({});
                setIsAuth(true);
                localStorage.setItem('isAuth', 'true');
                localStorage.setItem('usuario', responseData.usuario);
                if (responseData.id) {
                    localStorage.setItem('usuarioId', responseData.id);
                } else {
                    localStorage.removeItem('usuarioId');
                }

                localStorage.setItem('asignacion', responseData.asignacion || '');
                localStorage.setItem('privilegio', normalizarRol(responseData.privilegio));
                localStorage.setItem('grupo_servicio', responseData.grupo_servicio || responseData.grupo || '');
                localStorage.setItem(
                    'habilitacionPublica',
                    String(responseData.habilitacionPublica === true || responseData.habilitacionPublica === 'true')
                );

                // Iniciar animación de puerta
                setIsDoorOpening(true);
                setTimeout(() => {
                    setIsDoorOpening(false);
                    navigate('/');
                }, 2500);
            }

        } catch (err) {
            console.error("Error crítico en el login:", err);
            // Si la API estaba dormida o tira error de red
            Swal.fire(
                'Servidor iniciando', 
                'El servidor está despertando. Por favor, reintentá en 10 segundos.', 
                'info'
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            user, setUser, 
            password, setPassword,
            errors, setErrors,
            isLoading,
            isDoorOpening,
            handleSubmit
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
