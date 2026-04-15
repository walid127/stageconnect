import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCache } from '../../context/CacheContext';
import { Link } from 'react-router-dom';
import NavigationGestionaire from '../../components/GestionaireNav';
import CarteSquelette from '../../components/SkeletonCard';
import CompteurAnime from '../../components/AnimatedCounter';
import axios from 'axios';

export default function GestionaireDashboard() {
    const { user, loading: authLoading } = useAuth();
    const { getCachedData, setCachedData, clearCache } = useCache();
    const [stats, setStats] = useState({
        total_users: 0,
        total_formateurs: 0,
        pending_users: 0,
        active_users: 0,
        inactive_users: 0,
        applications: { total: 0, pending: 0, accepted: 0, rejected: 0, on_hold: 0 },
        trainings: { total: 0, active: 0 },
        messages: { total: 0, unread: 0 },
        loading: true
    });

    const fetchDashboardStats = useCallback(async () => {
        try {
            // Vérifier le cache d'abord
            const cachedStats = getCachedData('gestionaire_dashboard_stats');
            if (cachedStats && cachedStats.total_users !== undefined) {
                setStats({ ...cachedStats, loading: false });
                return;
            } else if (cachedStats) {
                // Effacer les données en cache invalides
                clearCache('gestionaire_dashboard_stats');
            }

            // Effectuer des appels API avec gestion d'erreur individuelle
            let usersRes, appsRes, trainingsRes, messagesRes;

            try {
                usersRes = await axios.get('/api/admin/formateur-accounts/statistics');
            } catch (err) {
                console.error('Échec de la récupération des statistiques des utilisateurs:', err.response?.data || err.message);
                usersRes = { data: { total_users: 0, total_formateurs: 0, pending_users: 0, active_users: 0, inactive_users: 0 } };
            }

            try {
                appsRes = await axios.get('/api/candidatures/stats/overview');
            } catch (err) {
                console.error('Échec de la récupération des statistiques des demandes de formation:', err.response?.data || err.message);
                appsRes = { data: { total: 0, pending: 0, accepted: 0, rejected: 0, on_hold: 0 } };
            }

            try {
                trainingsRes = await axios.get('/api/formations');
            } catch (err) {
                console.error('Échec de la récupération des formations:', err.response?.data || err.message);
                trainingsRes = { data: { data: [] } };
            }

            try {
                messagesRes = await axios.get('/api/messages/stats');
            } catch (err) {
                console.error('Échec de la récupération des statistiques des messages:', err.response?.data || err.message);
                messagesRes = { data: { total: 0, unread: 0 } };
            }


            // All API calls completed (with fallbacks)

            const trainings = trainingsRes.data.data || trainingsRes.data || [];
            const activeTrainings = trainings.filter(training => training.statut === 'en_cours').length;

            const newStats = {
                ...usersRes.data,
                applications: appsRes.data,
                trainings: {
                    total: trainings.length,
                    active: activeTrainings
                },
                messages: messagesRes.data || { total: 0, unread: 0 }
            };

            // Mettre en cache les données
            setCachedData('gestionaire_dashboard_stats', newStats);

            setStats({
                ...newStats,
                loading: false
            });
        } catch (err) {
            console.error('Erreur lors de la récupération des statistiques du tableau de bord:', err);
            console.error('Détails de l\'erreur:', err.response?.data || err.message);
            setStats(prev => ({ ...prev, loading: false }));
        }
    }, [getCachedData, setCachedData, clearCache]);

    useEffect(() => {
        // Attendre que l'authentification soit terminée avant de récupérer les statistiques
        if (!authLoading && user && user.role === 'gestionaire') {
            fetchDashboardStats();
        }
    }, [fetchDashboardStats, authLoading, user]);

    // Afficher le chargement pendant que l'authentification est en cours
    if (authLoading) {
        return (
            <div className="app-container flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#f53003] mx-auto"></div>
                    <p className="mt-4 text-[#78786c] dark:text-[#9D9D99]">Vérification des autorisations...</p>
                </div>
            </div>
        );
    }

    // Afficher une erreur si l'utilisateur n'est pas admin
    if (!user || user.role !== 'gestionaire') {
        return (
            <div className="app-container flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🚫</div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Accès refusé</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Seuls les gestionaires peuvent accéder à cette page.</p>
                    <button
                        onClick={() => window.location.href = '/login'}
                        className="btn btn-danger"
                    >
                        Retour à la connexion
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container gestionaire-dashboard-tight">
            <NavigationGestionaire />

            {/* Compact Hero Section */}
            <div className="hero-section">
                <div className="hero-overlay"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNkNGFmMzciIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
                <div className="hero-content">
                    <div className="text-center">
                        <h1 className="hero-title gestionaire-dashboard-hero-title">
                            Tableau de Bord Gestionaire
                        </h1>
                    </div>
                </div>
                {/* Decorative Wave */}
                <div className="hero-wave">
                    <svg className="w-full h-4 sm:h-8" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="currentColor"></path>
                    </svg>
                </div>
            </div>

            {/* Show loading skeleton while fetching stats (below hero) */}
            {stats.loading && (
                <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pb-6 sm:pb-16 pt-2 sm:pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-4 md:gap-6 mb-4 sm:mb-12">
                        <CarteSquelette />
                        <CarteSquelette />
                        <CarteSquelette />
                        <CarteSquelette />
                    </div>
                </div>
            )}

            {/* Content */}
            {!stats.loading && (
                <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pb-6 sm:pb-16 pt-2 sm:pt-4 relative z-20">
                {/* Modern Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-4 md:gap-6 mb-4 sm:mb-12">
                    {/* Users Card */}
                    <div className="group relative overflow-hidden bg-gradient-to-br from-[#1e3a8a] to-[#1e40af] rounded-xl shadow-md sm:rounded-2xl sm:shadow-xl lg:rounded-3xl lg:shadow-2xl hover:shadow-blue-900/50 transition-all duration-500 hover:-translate-y-0.5 sm:hover:-translate-y-1 lg:hover:-translate-y-2">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 hidden sm:block"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12 hidden sm:block"></div>
                        <div className="relative p-1.5 sm:p-4 md:p-6">
                            <div className="flex items-start justify-between gap-1 mb-1 sm:mb-4">
                                <div className="w-6 h-6 sm:w-11 sm:h-14 bg-white/20 backdrop-blur-sm rounded-md sm:rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <span className="text-sm sm:text-2xl md:text-3xl leading-none">👥</span>
                                </div>
                                <div className="bg-white/20 backdrop-blur-sm rounded-full px-1.5 py-0.5 sm:px-3 sm:py-1 shrink-0">
                                    <span className="text-[10px] sm:text-xs font-semibold text-white">Total</span>
                                </div>
                            </div>
                            <h3 className="text-white/80 text-[10px] sm:text-sm font-medium mb-0.5 sm:mb-1 line-clamp-2 leading-tight">Utilisateurs</h3>
                            <p className="text-lg max-sm:text-base sm:text-3xl md:text-4xl font-black text-white mb-0 sm:mb-2 leading-none tabular-nums">
                                {stats.loading ? '...' : <CompteurAnime value={stats.total_formateurs || 0} />}
                            </p>
                            <div className="hidden sm:flex items-center text-white/70 text-[10px] sm:text-xs leading-tight">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                                </svg>
                                <span className="line-clamp-1">Formateurs actifs</span>
                            </div>
                            </div>
                        </div>

                    {/* Formations Card */}
                    <div className="group relative overflow-hidden bg-gradient-to-br from-[#d4af37] to-[#b8860b] rounded-xl shadow-md sm:rounded-2xl sm:shadow-xl lg:rounded-3xl lg:shadow-2xl hover:shadow-yellow-600/50 transition-all duration-500 hover:-translate-y-0.5 sm:hover:-translate-y-1 lg:hover:-translate-y-2">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 hidden sm:block"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12 hidden sm:block"></div>
                        <div className="relative p-1.5 sm:p-4 md:p-6">
                            <div className="flex items-start justify-between gap-1 mb-1 sm:mb-4">
                                <div className="w-6 h-6 sm:w-11 sm:h-14 bg-white/20 backdrop-blur-sm rounded-md sm:rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <span className="text-sm sm:text-2xl md:text-3xl leading-none">📚</span>
                                </div>
                                <div className="bg-white/20 backdrop-blur-sm rounded-full px-1.5 py-0.5 sm:px-3 sm:py-1 shrink-0">
                                    <span className="text-[10px] sm:text-xs font-semibold text-white">Actifs</span>
                                </div>
                            </div>
                            <h3 className="text-white/80 text-[10px] sm:text-sm font-medium mb-0.5 sm:mb-1 line-clamp-2 leading-tight">Formations</h3>
                            <p className="text-lg max-sm:text-base sm:text-3xl md:text-4xl font-black text-white mb-0 sm:mb-2 leading-none tabular-nums">
                                {stats.loading ? '...' : <CompteurAnime value={stats.trainings.active} />}
                            </p>
                            <div className="hidden sm:flex items-center text-white/70 text-[10px] sm:text-xs leading-tight">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                </svg>
                                <span className="line-clamp-1">Formations en cours</span>
                            </div>
                            </div>
                        </div>

                    {/* Applications Card */}
                    <div className="group relative overflow-hidden bg-gradient-to-br from-[#0891b2] to-[#0e7490] rounded-xl shadow-md sm:rounded-2xl sm:shadow-xl lg:rounded-3xl lg:shadow-2xl hover:shadow-cyan-600/50 transition-all duration-500 hover:-translate-y-0.5 sm:hover:-translate-y-1 lg:hover:-translate-y-2">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 hidden sm:block"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12 hidden sm:block"></div>
                        <div className="relative p-1.5 sm:p-4 md:p-6">
                            <div className="flex items-start justify-between gap-1 mb-1 sm:mb-4">
                                <div className="w-6 h-6 sm:w-11 sm:h-14 bg-white/20 backdrop-blur-sm rounded-md sm:rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <span className="text-sm sm:text-2xl md:text-3xl leading-none">📝</span>
                                </div>
                                <div className="bg-white/20 backdrop-blur-sm rounded-full px-1.5 py-0.5 sm:px-3 sm:py-1 shrink-0">
                                    <span className="text-[10px] sm:text-xs font-semibold text-white">Total</span>
                                </div>
                            </div>
                            <h3 className="text-white/80 text-[10px] sm:text-sm font-medium mb-0.5 sm:mb-1 line-clamp-2 leading-tight">Demandes</h3>
                            <p className="text-lg max-sm:text-base sm:text-3xl md:text-4xl font-black text-white mb-0 sm:mb-2 leading-none tabular-nums">
                                {stats.loading ? '...' : <CompteurAnime value={stats.applications.total || 0} />}
                            </p>
                            <div className="hidden sm:flex items-center text-white/70 text-[10px] sm:text-xs leading-tight">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                                <span className="line-clamp-1">Toutes demandes</span>
                            </div>
                            </div>
                        </div>

                    {/* Pending Card */}
                    <div className="group relative overflow-hidden bg-gradient-to-br from-[#ea580c] to-[#c2410c] rounded-xl shadow-md sm:rounded-2xl sm:shadow-xl lg:rounded-3xl lg:shadow-2xl hover:shadow-orange-600/50 transition-all duration-500 hover:-translate-y-0.5 sm:hover:-translate-y-1 lg:hover:-translate-y-2">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 hidden sm:block"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12 hidden sm:block"></div>
                        <div className="relative p-1.5 sm:p-4 md:p-6">
                            <div className="flex items-start justify-between gap-1 mb-1 sm:mb-4">
                                <div className="w-6 h-6 sm:w-11 sm:h-14 bg-white/20 backdrop-blur-sm rounded-md sm:rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <span className="text-sm sm:text-2xl md:text-3xl leading-none">⏳</span>
                                </div>
                                <div className="bg-white/20 backdrop-blur-sm rounded-full px-1.5 py-0.5 sm:px-3 sm:py-1 animate-pulse shrink-0">
                                    <span className="text-[10px] sm:text-xs font-semibold text-white">Urgent</span>
                                </div>
                            </div>
                            <h3 className="text-white/80 text-[10px] sm:text-sm font-medium mb-0.5 sm:mb-1 line-clamp-2 leading-tight">À Valider</h3>
                            <p className="text-lg max-sm:text-base sm:text-3xl md:text-4xl font-black text-white mb-0 sm:mb-2 leading-none tabular-nums">
                                {stats.loading ? '...' : <CompteurAnime value={stats.pending_users || 0} />}
                            </p>
                            <div className="hidden sm:flex items-center text-white/70 text-[10px] sm:text-xs leading-tight">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                <span className="line-clamp-1">En attente</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions - Modern Grid */}
                <div className="mb-5 sm:mb-12">
                    <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-6">
                        <div className="h-1 flex-1 bg-gradient-to-r from-[#1a365d] via-[#d4af37] to-[#0891b2] rounded-full"></div>
                        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white whitespace-nowrap">Actions Rapides</h2>
                        <div className="h-1 flex-1 bg-gradient-to-r from-[#1a365d] via-[#d4af37] to-[#0891b2] rounded-full"></div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-4 justify-center">
                        <Link to="/gestionaire/utilisateurs" className="w-full md:w-1/2 lg:w-1/5 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-lg p-2.5 sm:rounded-2xl sm:p-5 border-2 border-gray-100 dark:border-gray-700 hover:border-[#1e40af] dark:hover:border-[#1e40af] transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/20">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-900/10 to-transparent rounded-bl-full hidden sm:block"></div>
                            <div className="relative flex flex-row sm:flex-col items-center gap-2.5 sm:gap-0 sm:items-stretch">
                                <div className="text-lg sm:text-2xl md:text-3xl shrink-0 sm:mb-2 sm:mb-3 leading-none">👥</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base sm:text-lg mb-0 sm:mb-1 leading-tight line-clamp-2">Utilisateurs</h3>
                                    <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400">Gérer les comptes</p>
                                </div>
                                <div className="flex items-center text-[#1e40af] dark:text-blue-400 text-xs sm:text-sm font-medium shrink-0 sm:mt-3">
                                    <span>Accéder</span>
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 sm:ml-1 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        <Link to="/gestionaire/stages" className="w-full md:w-1/2 lg:w-1/5 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-lg p-2.5 sm:rounded-2xl sm:p-5 border-2 border-gray-100 dark:border-gray-700 hover:border-[#d4af37] dark:hover:border-[#d4af37] transition-all duration-300 hover:shadow-lg hover:shadow-yellow-600/20">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-600/10 to-transparent rounded-bl-full hidden sm:block"></div>
                            <div className="relative flex flex-row sm:flex-col items-center gap-2.5 sm:gap-0 sm:items-stretch">
                                <div className="text-lg sm:text-2xl md:text-3xl shrink-0 sm:mb-2 sm:mb-3 leading-none">📚</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base sm:text-lg mb-0 sm:mb-1 leading-tight line-clamp-2">Formations</h3>
                                    <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400">Créer et modifier</p>
                                </div>
                                <div className="flex items-center text-[#b8860b] dark:text-yellow-400 text-xs sm:text-sm font-medium shrink-0 sm:mt-3">
                                    <span>Accéder</span>
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 sm:ml-1 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        <Link to="/gestionaire/candidatures" className="w-full md:w-1/2 lg:w-1/5 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-lg p-2.5 sm:rounded-2xl sm:p-5 border-2 border-gray-100 dark:border-gray-700 hover:border-[#0891b2] dark:hover:border-[#0891b2] transition-all duration-300 hover:shadow-lg hover:shadow-cyan-600/20">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-cyan-600/10 to-transparent rounded-bl-full hidden sm:block"></div>
                            <div className="relative flex flex-row sm:flex-col items-center gap-2.5 sm:gap-0 sm:items-stretch">
                                <div className="text-lg sm:text-2xl md:text-3xl shrink-0 sm:mb-2 sm:mb-3 leading-none">📝</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base sm:text-lg mb-0 sm:mb-1 leading-tight line-clamp-2">Demandes</h3>
                                    <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400">Valider les demandes</p>
                                </div>
                                <div className="flex items-center text-[#0891b2] dark:text-cyan-400 text-xs sm:text-sm font-medium shrink-0 sm:mt-3">
                                    <span>Accéder</span>
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 sm:ml-1 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        <Link to="/gestionaire/specialistes" className="w-full md:w-1/2 lg:w-1/5 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-lg p-2.5 sm:rounded-2xl sm:p-5 border-2 border-gray-100 dark:border-gray-700 hover:border-[#ea580c] dark:hover:border-[#ea580c] transition-all duration-300 hover:shadow-lg hover:shadow-orange-600/20">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-600/10 to-transparent rounded-bl-full hidden sm:block"></div>
                            <div className="relative flex flex-row sm:flex-col items-center gap-2.5 sm:gap-0 sm:items-stretch">
                                <div className="text-lg sm:text-2xl md:text-3xl shrink-0 sm:mb-2 sm:mb-3 leading-none">🎯</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base sm:text-lg mb-0 sm:mb-1 leading-tight line-clamp-2">Spécialités</h3>
                                    <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400">Gérer les domaines</p>
                                </div>
                                <div className="flex items-center text-[#ea580c] dark:text-orange-400 text-xs sm:text-sm font-medium shrink-0 sm:mt-3">
                                    <span>Accéder</span>
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 sm:ml-1 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        <Link to="/gestionaire/messages" className="w-full md:w-1/2 lg:w-1/5 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-lg p-2.5 sm:rounded-2xl sm:p-5 border-2 border-gray-100 dark:border-gray-700 hover:border-[#7c3aed] dark:hover:border-[#7c3aed] transition-all duration-300 hover:shadow-lg hover:shadow-purple-600/20">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-600/10 to-transparent rounded-bl-full hidden sm:block"></div>
                            <div className="relative flex flex-row sm:flex-col items-center gap-2.5 sm:gap-0 sm:items-stretch">
                                <div className="text-lg sm:text-2xl md:text-3xl shrink-0 sm:mb-2 sm:mb-3 leading-none">💬</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base sm:text-lg mb-0 sm:mb-1 leading-tight line-clamp-2">Messages</h3>
                                    <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400">Communiquer avec les formateurs</p>
                                    {stats.messages.unread > 0 && (
                                        <span className="inline-flex sm:hidden mt-1 items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r from-[#7c3aed] to-[#5b21b6] text-white">
                                            {stats.messages.unread}
                                        </span>
                                    )}
                                    {stats.messages.unread > 0 && (
                                        <div className="hidden sm:block mt-2">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-[#7c3aed] to-[#5b21b6] text-white">
                                                {stats.messages.unread} non lus
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center text-[#7c3aed] dark:text-purple-400 text-xs sm:text-sm font-medium shrink-0 sm:mt-3 self-center sm:self-auto">
                                    <span>Accéder</span>
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 sm:ml-1 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        {/* Diplomas */}
                        <Link to="/gestionaire/diplomes" className="w-full md:w-1/2 lg:w-1/5 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-lg p-2.5 sm:rounded-2xl sm:p-5 border-2 border-gray-100 dark:border-gray-700 hover:border-[#d4af37] dark:hover:border-[#d4af37] transition-all duration-300 hover:shadow-lg hover:shadow-yellow-600/20">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-600/10 to-transparent rounded-bl-full hidden sm:block"></div>
                            <div className="relative flex flex-row sm:flex-col items-center gap-2.5 sm:gap-0 sm:items-stretch">
                                <div className="text-lg sm:text-2xl md:text-3xl shrink-0 sm:mb-2 sm:mb-3 leading-none">🎓</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base sm:text-lg mb-0 sm:mb-1 leading-tight line-clamp-2">Diplômes</h3>
                                    <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400">Délivrer et gérer</p>
                                </div>
                                <div className="flex items-center text-[#b8860b] dark:text-yellow-400 text-xs sm:text-sm font-medium shrink-0 sm:mt-3">
                                    <span>Accéder</span>
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 sm:ml-1 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        {/* Formateurs List */}
                        <Link to="/gestionaire/formateurs" className="w-full md:w-1/2 lg:w-1/5 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-lg p-2.5 sm:rounded-2xl sm:p-5 border-2 border-gray-100 dark:border-gray-700 hover:border-[#16a34a] dark:hover:border-[#16a34a] transition-all duration-300 hover:shadow-lg hover:shadow-green-600/20">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-600/10 to-transparent rounded-bl-full hidden sm:block"></div>
                            <div className="relative flex flex-row sm:flex-col items-center gap-2.5 sm:gap-0 sm:items-stretch">
                                <div className="text-lg sm:text-2xl md:text-3xl shrink-0 sm:mb-2 sm:mb-3 leading-none">📋</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base sm:text-lg mb-0 sm:mb-1 leading-tight line-clamp-2">Formateurs</h3>
                                    <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400">Liste des formateurs</p>
                                </div>
                                <div className="flex items-center text-[#16a34a] dark:text-green-400 text-xs sm:text-sm font-medium shrink-0 sm:mt-3">
                                    <span>Accéder</span>
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 sm:ml-1 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        {/* Comptes Formateurs */}
                        <Link to="/gestionaire/utilisateurs" className="w-full md:w-1/2 lg:w-1/5 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-lg p-2.5 sm:rounded-2xl sm:p-5 border-2 border-gray-100 dark:border-gray-700 hover:border-[#0ea5e9] dark:hover:border-[#0ea5e9] transition-all duration-300 hover:shadow-lg hover:shadow-sky-600/20">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-sky-600/10 to-transparent rounded-bl-full hidden sm:block"></div>
                            <div className="relative flex flex-row sm:flex-col items-center gap-2.5 sm:gap-0 sm:items-stretch">
                                <div className="text-lg sm:text-2xl md:text-3xl shrink-0 sm:mb-2 sm:mb-3 leading-none">👤</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base sm:text-lg mb-0 sm:mb-1 leading-tight line-clamp-2">Comptes formateurs</h3>
                                    <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400">Créer et gérer les comptes</p>
                                </div>
                                <div className="flex items-center text-[#0ea5e9] dark:text-sky-400 text-xs sm:text-sm font-medium shrink-0 sm:mt-3">
                                    <span>Accéder</span>
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 sm:ml-1 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        {/* Notifications */}
                        <Link to="/gestionaire/notifications" className="w-full md:w-1/2 lg:w-1/5 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-lg p-2.5 sm:rounded-2xl sm:p-5 border-2 border-gray-100 dark:border-gray-700 hover:border-[#f59e0b] dark:hover:border-[#f59e0b] transition-all duration-300 hover:shadow-lg hover:shadow-amber-600/20">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-600/10 to-transparent rounded-bl-full hidden sm:block"></div>
                            <div className="relative flex flex-row sm:flex-col items-center gap-2.5 sm:gap-0 sm:items-stretch">
                                <div className="text-lg sm:text-2xl md:text-3xl shrink-0 sm:mb-2 sm:mb-3 leading-none">🔔</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base sm:text-lg mb-0 sm:mb-1 leading-tight line-clamp-2">Notifications</h3>
                                    <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400">Voir toutes les notifications</p>
                                </div>
                                <div className="flex items-center text-[#f59e0b] dark:text-amber-400 text-xs sm:text-sm font-medium shrink-0 sm:mt-3">
                                    <span>Accéder</span>
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 sm:ml-1 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Statistics CTA - Ultra Modern */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#1a365d] via-[#d4af37] to-[#0891b2] rounded-2xl sm:rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                    <Link 
                        to="/gestionaire/statistics" 
                        className="relative block bg-gradient-to-r from-[#1a365d] via-[#2d3748] to-[#0891b2] rounded-xl p-4 sm:rounded-3xl sm:p-8 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMjAgMjBjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
                        <div className="relative flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-row sm:flex-row items-center gap-3 sm:gap-6">
                                <div className="w-12 h-12 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shrink-0">
                                    <span className="text-3xl sm:text-5xl">📊</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-lg sm:text-3xl font-black text-white mb-0.5 sm:mb-2 tracking-tight leading-tight">Statistiques Avancées</h3>
                                    <p className="text-white/90 text-xs sm:text-lg hidden sm:block">Visualisations interactives et insights détaillés</p>
                                </div>
                            </div>
                            <div className="hidden md:flex items-center gap-2 text-white">
                                <span className="font-semibold text-lg">Explorer</span>
                                <svg className="w-8 h-8 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </div>
                        </div>
                    </Link>
                </div>
                </div>
            )}
        </div>
    );
}

