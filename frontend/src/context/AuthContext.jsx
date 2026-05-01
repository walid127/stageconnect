import { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// 🌐 عدل هنا حسب الـ backend الجديد
const BASE_URL = import.meta.env.VITE_API_URL || 'https://stageconnect-api.onrender.com';

axios.defaults.baseURL = BASE_URL;

// Attach Bearer token from localStorage on every request so calls are authenticated
// even before React effects sync axios.defaults (avoids 401 right after login).
const isPublicAuthPost = (config) => {
    const method = (config.method || 'get').toLowerCase();
    if (method !== 'post') return false;
    const path = config.url || '';
    return (
        path.includes('/auth/login') ||
        path.includes('/auth/register') ||
        path.includes('/auth/forgot-password') ||
        path.includes('/auth/reset-password')
    );
};

axios.interceptors.request.use((config) => {
    if (isPublicAuthPost(config)) {
        const h = config.headers;
        if (h && typeof h.delete === 'function') {
            h.delete('Authorization');
        } else if (h) {
            delete h.Authorization;
        }
        return config;
    }
    const stored = localStorage.getItem('token');
    if (stored) {
        config.headers.Authorization = `Bearer ${stored}`;
    }
    return config;
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));
    
    const settersRef = useRef({ setToken, setUser });
    settersRef.current = { setToken, setUser };

    useEffect(() => {
        const responseInterceptor = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response?.status === 401) {
                    const isAuthRoute = error.config?.url?.includes('/auth/login') || 
                                        error.config?.url?.includes('/auth/register');
                    if (!isAuthRoute) {
                        localStorage.removeItem('token');
                        settersRef.current.setToken(null);
                        settersRef.current.setUser(null);
                        if (!error.config?.url?.includes('/auth/me')) {
                            console.warn('Session expirée. Veuillez vous reconnecter.');
                        }
                    }
                }
                return Promise.reject(error);
            }
        );

        return () => axios.interceptors.response.eject(responseInterceptor);
    }, []);

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);

    useEffect(() => {
        if (token) fetchUser();
        else setLoading(false);
    }, [token]);

    const fetchUser = async () => {
        try {
            const response = await axios.get('/api/auth/me'); // ← تأكد من المسار الجديد
            const userData = response.data.user;
            if (userData && !userData.statut && userData.status) userData.statut = userData.status;
            if (userData && !userData.nom && userData.name) userData.nom = userData.name;
            if (userData && !userData.telephone && userData.phone) userData.telephone = userData.phone;
            setUser(userData);
        } catch (error) {
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
            } else {
                console.error('Erreur lors de la récupération de l\'utilisateur:', error);
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
            }
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await axios.post('/api/auth/login', { email, password }); // ← تأكد من المسار
            const { token, user } = response.data;
            if (!token || typeof token !== 'string') {
                throw new Error('Réponse de connexion invalide (jeton manquant).');
            }
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setToken(token);
            setUser(user);
            return response.data;
        } catch (error) {
            if (error.response?.status === 422) {
                const errors = error.response.data.errors || {};
                const errorMessages = Object.values(errors).flat();
                throw new Error(errorMessages.join(', ') || 'Erreur de validation');
            }
            if (error.response?.data?.message) throw new Error(error.response.data.message);
            throw new Error(error.message || 'Une erreur est survenue lors de la connexion');
        }
    };

    const register = async (data) => {
        try {
            const payload = { ...data, phone: data.phone?.trim() || null };
            const response = await axios.post('/api/auth/register', payload); // ← تأكد من المسار
            return response.data;
        } catch (error) {
            if (error.response?.status === 422) {
                const errors = error.response.data.errors || {};
                const messagesErreur = [];
                Object.keys(errors).forEach(key => {
                    if (Array.isArray(errors[key])) messagesErreur.push(...errors[key]);
                    else messagesErreur.push(errors[key]);
                });
                throw new Error(messagesErreur.join(', ') || error.response.data.message || 'Erreur de validation');
            }
            if (error.response?.data?.message) throw new Error(error.response.data.message);
            throw error;
        }
    };

    const logout = async () => {
        try {
            if (token) await axios.post('/api/auth/logout'); // ← تأكد من المسار
        } catch (error) {
            if (error.response?.status !== 401) console.error('Erreur lors de la déconnexion:', error);
        } finally {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
        }
    };

    const updateUser = (updatedUser) => {
        if (updatedUser && !updatedUser.statut && updatedUser.status) updatedUser.statut = updatedUser.status;
        if (updatedUser && !updatedUser.nom && updatedUser.name) updatedUser.nom = updatedUser.name;
        if (updatedUser && !updatedUser.telephone && updatedUser.phone) updatedUser.telephone = updatedUser.phone;
        setUser(updatedUser);
    };

    const value = {
        user,
        login,
        register,
        logout,
        updateUser,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isGestionaire: user?.role === 'gestionaire',
        isFormateur: user?.role === 'formateur',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};