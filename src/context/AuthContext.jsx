import { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// 🌐 عدل هنا حسب الـ backend الجديد
const BASE_URL = 'https://stageconnect-api.onrender.com';

axios.defaults.baseURL = BASE_URL;

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
            localStorage.setItem('token', token);
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