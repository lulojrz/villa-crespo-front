import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { NumerosContext } from './NumerosContext.jsx'
import Swal from 'sweetalert2'
import { normalizarRol } from '../utils/permisos'

export const AuthContext = createContext()

// Verifica si el JWT existe y su campo "exp" aún no venció
const isTokenValid = (token) => {
    if (!token) return false;
    try {
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse(atob(payloadBase64));
        if (!payload.exp) return true;
        return payload.exp * 1000 > Date.now();
    } catch {
        return false;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState('')
    const [password, setPassword] = useState('')
    const { setIsAuth } = useContext(NumerosContext)
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const [isDoorOpening, setIsDoorOpening] = useState(false)

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('isAuth');
        localStorage.removeItem('usuario');
        localStorage.removeItem('usuarioId');
        localStorage.removeItem('asignacion');
        localStorage.removeItem('privilegio');
        localStorage.removeItem('grupo_servicio');
        localStorage.removeItem('habilitacionPublica');
        setIsAuth(false);
        navigate('/login');
    }, [navigate, setIsAuth]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (isTokenValid(token)) {
            setIsAuth(true);
            if (window.location.pathname === '/login') {
                navigate('/');
            }
        } else if (token || localStorage.getItem('isAuth') === 'true') {
            // Si había un token vencido o sesión vieja, limpiamos todo
            logout();
        }
    }, [navigate, setIsAuth, logout]);

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
            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
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

                if (res.status === 401 || res.status === 403) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Acceso denegado',
                        text: 'Usuario o contraseña incorrectos.',
                        confirmButtonColor: 'var(--bs-primary)'
                    });
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

            if (responseData && responseData.token && responseData.usuario) {
                setErrors({});
                setIsAuth(true);
                localStorage.setItem('token', responseData.token);
                localStorage.setItem('isAuth', 'true');
                localStorage.setItem('usuario', responseData.usuario);

                if (responseData.id) {
                    localStorage.setItem('usuarioId', responseData.id);
                } else {
                    localStorage.removeItem('usuarioId');
                }

                localStorage.setItem('asignacion', responseData.asignacion || '');
                localStorage.setItem('privilegio', normalizarRol(responseData.privilegio));
                localStorage.setItem('grupo_servicio', responseData.grupo_servicio ?? responseData.grupo ?? '');
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
            handleSubmit,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};