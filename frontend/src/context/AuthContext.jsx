import { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));
    
    // Utiliser une ref pour stocker les setters afin qu'ils soient accessibles dans l'intercepteur
    const settersRef = useRef({ setToken, setUser });
    settersRef.current = { setToken, setUser };

    // Configurer l'intercepteur axios une seule fois au montage
    useEffect(() => {
        // Intercepteur pour gérer les erreurs d'authentification
        const responseInterceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                // Si l'erreur est 401 (Unauthenticated), nettoyer le token
                if (error.response?.status === 401) {
                    // Ne pas nettoyer si c'est déjà une route d'authentification
                    const isAuthRoute = error.config?.url?.includes('/auth/login') || 
                                       error.config?.url?.includes('/auth/register');
                    
                    if (!isAuthRoute) {
                        // Nettoyer le token et l'utilisateur
                        localStorage.removeItem('token');
                        settersRef.current.setToken(null);
                        settersRef.current.setUser(null);
                        
                        // Ne pas logger les erreurs 401 pour les routes protégées (c'est normal si le token est expiré)
                        if (!error.config?.url?.includes('/auth/me')) {
                            console.warn('Session expirée. Veuillez vous reconnecter.');
                        }
                    }
                }
                return Promise.reject(error);
            }
        );

        // Nettoyer l'intercepteur lors du démontage
        return () => {
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, []); // Exécuter une seule fois au montage

    // Configurer les headers d'authentification quand le token change
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);

    // Vérifier si l'utilisateur est connecté
    useEffect(() => {
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [token]);

    const fetchUser = async () => {
        try {
            const response = await axios.get('/api/auth/me');
            const userData = response.data.user;
            // S'assurer que les propriétés sont cohérentes
            if (userData && !userData.statut && userData.status) {
                userData.statut = userData.status;
            }
            if (userData && !userData.nom && userData.name) {
                userData.nom = userData.name;
            }
            if (userData && !userData.telephone && userData.phone) {
                userData.telephone = userData.phone;
            }
            setUser(userData);
        } catch (error) {
            // Si l'utilisateur n'est pas authentifié (401), c'est normal - ne pas logger comme erreur
            if (error.response?.status === 401) {
                // Token invalide ou expiré - nettoyer silencieusement
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
            } else {
                // Autres erreurs - logger seulement si ce n'est pas une erreur d'authentification
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
            const response = await axios.post('/api/auth/login', { email, password });
            const { token, user } = response.data;
            
            localStorage.setItem('token', token);
            setToken(token);
            setUser(user);
            
            return response.data;
        } catch (error) {
            // Gérer les erreurs de validation (422)
            if (error.response?.status === 422) {
                const errors = error.response.data.errors || {};
                const errorMessages = Object.values(errors).flat();
                throw new Error(errorMessages.join(', ') || 'Erreur de validation');
            }
            
            // Relancer avec le message d'erreur du backend
            if (error.response?.data?.message) {
                throw new Error(error.response.data.message);
            }
            
            // Erreur générique
            throw new Error(error.message || 'Une erreur est survenue lors de la connexion');
        }
    };

    const register = async (data) => {
        try {
            // Convertir le téléphone vide en null
            const payload = {
                ...data,
                phone: data.phone && data.phone.trim() !== '' ? data.phone.trim() : null,
            };
            
            const response = await axios.post('/api/auth/register', payload);
            return response.data;
        } catch (error) {
            // Gérer les erreurs de validation
            if (error.response?.status === 422) {
                const errors = error.response.data.errors || {};
                const messagesErreur = [];
                
                Object.keys(errors).forEach(key => {
                    if (Array.isArray(errors[key])) {
                        messagesErreur.push(...errors[key]);
                    } else {
                        messagesErreur.push(errors[key]);
                    }
                });
                
                const messageErreur = messagesErreur.length > 0 
                    ? messagesErreur.join(', ') 
                    : error.response.data.message || 'Erreur de validation';
                
                throw new Error(messageErreur);
            }
            
            // Relancer avec le message d'erreur du backend
            if (error.response?.data?.message) {
                throw new Error(error.response.data.message);
            }
            throw error;
        }
    };

    const logout = async () => {
        try {
            // Essayer de déconnecter côté serveur seulement si on a un token
            if (token) {
                await axios.post('/api/auth/logout');
            }
        } catch (error) {
            // Ne pas logger les erreurs 401 (token déjà invalide) ou si l'utilisateur n'est pas connecté
            if (error.response?.status !== 401) {
                console.error('Erreur lors de la déconnexion:', error);
            }
        } finally {
            // Toujours nettoyer côté client
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
        }
    };

    const updateUser = (updatedUser) => {
        // S'assurer que les propriétés sont cohérentes
        if (updatedUser && !updatedUser.statut && updatedUser.status) {
            updatedUser.statut = updatedUser.status;
        }
        if (updatedUser && !updatedUser.nom && updatedUser.name) {
            updatedUser.nom = updatedUser.name;
        }
        if (updatedUser && !updatedUser.telephone && updatedUser.phone) {
            updatedUser.telephone = updatedUser.phone;
        }
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
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

