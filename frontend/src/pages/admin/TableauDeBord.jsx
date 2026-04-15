import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCache } from '../../context/CacheContext';
import { Link } from 'react-router-dom';
import NavigationAdmin from '../../components/AdminNav';
import CarteSquelette from '../../components/SkeletonCard';
import CompteurAnime from '../../components/AnimatedCounter';
import axios from 'axios';

export default function AdminDashboard() {
    const { user, loading: authLoading } = useAuth();
    const { getCachedData, setCachedData, clearCache } = useCache();
    const [stats, setStats] = useState({
        total_gestionaires: 0,
        active_gestionaires: 0,
        inactive_gestionaires: 0,
        total_backups: 0,
        total_packages: 0,
        loading: true
    });

    const fetchDashboardStats = useCallback(async () => {
        try {
            // Vérifier le cache d'abord
            const cachedStats = getCachedData('admin_dashboard_stats');
            if (cachedStats && cachedStats.total_gestionaires !== undefined) {
                setStats({ ...cachedStats, loading: false });
                return;
            } else if (cachedStats) {
                // Clear invalid cached data
                clearCache('admin_dashboard_stats');
            }

            // Effectuer des appels API avec gestion d'erreur individuelle
            let gestionairesRes, backupsRes, packagesRes;

            try {
                gestionairesRes = await axios.get('/api/admin/gestionaires');
            } catch (err) {
                console.error('Failed to fetch gestionaires:', err.response?.data || err.message);
                gestionairesRes = { data: { data: [] } };
            }

            try {
                backupsRes = await axios.get('/api/admin/database/backups');
            } catch (err) {
                console.error('Failed to fetch backups:', err.response?.data || err.message);
                backupsRes = { data: { backups: [] } };
            }

            try {
                packagesRes = await axios.get('/api/admin/packages');
            } catch (err) {
                console.error('Failed to fetch packages:', err.response?.data || err.message);
                packagesRes = { data: { packages: [] } };
            }

            const gestionaires = gestionairesRes.data.data || gestionairesRes.data || [];
            const activeGestionaires = gestionaires.filter(g => g.statut === 'actif').length;
            const inactiveGestionaires = gestionaires.filter(g => g.statut === 'inactif').length;
            const backups = backupsRes.data.backups || backupsRes.data || [];
            const packages = packagesRes.data.packages || packagesRes.data || [];

            const newStats = {
                total_gestionaires: gestionaires.length,
                active_gestionaires: activeGestionaires,
                inactive_gestionaires: inactiveGestionaires,
                total_backups: backups.length,
                total_packages: packages.length
            };

            // Mettre en cache les données
            setCachedData('admin_dashboard_stats', newStats);

            setStats({
                ...newStats,
                loading: false
            });
        } catch (err) {
            console.error('Erreur lors de la récupération des statistiques du tableau de bord:', err);
            setStats(prev => ({ ...prev, loading: false }));
        }
    }, [getCachedData, setCachedData, clearCache]);

    useEffect(() => {
        // Attendre que l'authentification soit terminée avant de récupérer les statistiques
        if (!authLoading && user && user.role === 'admin') {
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
    if (!user || user.role !== 'admin') {
        return (
            <div className="app-container flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🚫</div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Accès refusé</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Seuls les administrateurs peuvent accéder à cette page.</p>
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
        <div className="app-container">
            <NavigationAdmin />

            {/* Compact Hero Section */}
            <div className="hero-section">
                <div className="hero-overlay"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNkNGFmMzciIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
                <div className="hero-content">
                    <div className="text-center">
                        <h1 className="hero-title">
                            Tableau de Bord Administrateur
                        </h1>
                        <p className="text-white/80 text-xs sm:text-sm md:text-lg mt-1 sm:mt-2 max-w-md mx-auto">Gestion des gestionaires, base de données et paquets</p>
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
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-4 md:gap-6 mb-4 sm:mb-12">
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
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-4 md:gap-6 mb-4 sm:mb-12">
                    {/* Gestionaires Card */}
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
                            <h3 className="text-white/80 text-[10px] sm:text-sm font-medium mb-0.5 sm:mb-1 line-clamp-2 leading-tight">Gestionaires</h3>
                            <p className="text-lg max-sm:text-base sm:text-3xl md:text-4xl font-black text-white mb-0 sm:mb-2 leading-none tabular-nums">
                                {stats.loading ? '...' : <CompteurAnime value={stats.total_gestionaires || 0} />}
                            </p>
                            <div className="hidden sm:flex items-center text-white/70 text-[10px] sm:text-xs leading-tight">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                                </svg>
                                <span className="line-clamp-1">{stats.active_gestionaires} actifs</span>
                            </div>
                        </div>
                    </div>

                    {/* Backups Card */}
                    <div className="group relative overflow-hidden bg-gradient-to-br from-[#0891b2] to-[#0e7490] rounded-xl shadow-md sm:rounded-2xl sm:shadow-xl lg:rounded-3xl lg:shadow-2xl hover:shadow-cyan-600/50 transition-all duration-500 hover:-translate-y-0.5 sm:hover:-translate-y-1 lg:hover:-translate-y-2">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 hidden sm:block"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12 hidden sm:block"></div>
                        <div className="relative p-1.5 sm:p-4 md:p-6">
                            <div className="flex items-start justify-between gap-1 mb-1 sm:mb-4">
                                <div className="w-6 h-6 sm:w-11 sm:h-14 bg-white/20 backdrop-blur-sm rounded-md sm:rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <span className="text-sm sm:text-2xl md:text-3xl leading-none">💾</span>
                                </div>
                                <div className="bg-white/20 backdrop-blur-sm rounded-full px-1.5 py-0.5 sm:px-3 sm:py-1 shrink-0">
                                    <span className="text-[10px] sm:text-xs font-semibold text-white">Sauv.</span>
                                </div>
                            </div>
                            <h3 className="text-white/80 text-[10px] sm:text-sm font-medium mb-0.5 sm:mb-1 line-clamp-2 leading-tight">Base de données</h3>
                            <p className="text-lg max-sm:text-base sm:text-3xl md:text-4xl font-black text-white mb-0 sm:mb-2 leading-none tabular-nums">
                                {stats.loading ? '...' : <CompteurAnime value={stats.total_backups || 0} />}
                            </p>
                            <div className="hidden sm:flex items-center text-white/70 text-[10px] sm:text-xs leading-tight">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                </svg>
                                <span className="line-clamp-1">Sauvegardes</span>
                            </div>
                        </div>
                    </div>

                    {/* Packages Card */}
                    <div className="group relative overflow-hidden col-span-2 md:col-span-1 bg-gradient-to-br from-[#d4af37] to-[#b8860b] rounded-xl shadow-md sm:rounded-2xl sm:shadow-xl lg:rounded-3xl lg:shadow-2xl hover:shadow-yellow-600/50 transition-all duration-500 hover:-translate-y-0.5 sm:hover:-translate-y-1 lg:hover:-translate-y-2">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 hidden sm:block"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12 hidden sm:block"></div>
                        <div className="relative p-1.5 sm:p-4 md:p-6">
                            <div className="flex items-start justify-between gap-1 mb-1 sm:mb-4">
                                <div className="w-6 h-6 sm:w-11 sm:h-14 bg-white/20 backdrop-blur-sm rounded-md sm:rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <span className="text-sm sm:text-2xl md:text-3xl leading-none">📦</span>
                                </div>
                                <div className="bg-white/20 backdrop-blur-sm rounded-full px-1.5 py-0.5 sm:px-3 sm:py-1 shrink-0">
                                    <span className="text-[10px] sm:text-xs font-semibold text-white">OK</span>
                                </div>
                            </div>
                            <h3 className="text-white/80 text-[10px] sm:text-sm font-medium mb-0.5 sm:mb-1 line-clamp-2 leading-tight">Paquets</h3>
                            <p className="text-lg max-sm:text-base sm:text-3xl md:text-4xl font-black text-white mb-0 sm:mb-2 leading-none tabular-nums">
                                {stats.loading ? '...' : <CompteurAnime value={stats.total_packages || 0} />}
                            </p>
                            <div className="hidden sm:flex items-center text-white/70 text-[10px] sm:text-xs leading-tight">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                                <span className="line-clamp-1">Installés</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions - compact on phone */}
                <div className="mb-5 sm:mb-12">
                    <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-6">
                        <div className="h-1 flex-1 bg-gradient-to-r from-[#1a365d] via-[#d4af37] to-[#0891b2] rounded-full"></div>
                        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white whitespace-nowrap">Actions Rapides</h2>
                        <div className="h-1 flex-1 bg-gradient-to-r from-[#1a365d] via-[#d4af37] to-[#0891b2] rounded-full"></div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-4 justify-center">
                        <Link to="/admin/gestionaires" className="w-full sm:w-1/2 lg:w-1/5 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-lg p-2.5 sm:rounded-2xl sm:p-5 border-2 border-gray-100 dark:border-gray-700 hover:border-[#1e40af] dark:hover:border-[#1e40af] transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/20">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-900/10 to-transparent rounded-bl-full hidden sm:block"></div>
                            <div className="relative flex flex-row sm:flex-col items-center gap-2.5 sm:gap-0 sm:items-stretch">
                                <div className="text-lg sm:text-2xl md:text-3xl shrink-0 sm:mb-2 sm:mb-3 leading-none">👥</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base sm:text-lg mb-0 sm:mb-1 leading-tight line-clamp-2">Gestionaires</h3>
                                    <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400">Comptes gestionaires</p>
                                </div>
                                <div className="flex items-center text-[#1e40af] dark:text-blue-400 text-xs sm:text-sm font-medium shrink-0 sm:mt-3">
                                    <span>Gérer</span>
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 sm:ml-1 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        <Link to="/admin/messages-gestionaires" className="w-full sm:w-1/2 lg:w-1/5 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-lg p-2.5 sm:rounded-2xl sm:p-5 border-2 border-gray-100 dark:border-gray-700 hover:border-[#1a365d] dark:hover:border-[#1a365d] transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/20">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-900/10 to-transparent rounded-bl-full hidden sm:block"></div>
                            <div className="relative flex flex-row sm:flex-col items-center gap-2.5 sm:gap-0 sm:items-stretch">
                                <div className="text-lg sm:text-2xl md:text-3xl shrink-0 sm:mb-2 sm:mb-3 leading-none">💬</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base sm:text-lg mb-0 sm:mb-1 leading-tight line-clamp-2">Messages</h3>
                                    <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400">Gestionaires</p>
                                </div>
                                <div className="flex items-center text-[#1a365d] dark:text-blue-400 text-xs sm:text-sm font-medium shrink-0 sm:mt-3">
                                    <span>Ouvrir</span>
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 sm:ml-1 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        <Link to="/admin/database" className="w-full sm:w-1/2 lg:w-1/5 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-lg p-2.5 sm:rounded-2xl sm:p-5 border-2 border-gray-100 dark:border-gray-700 hover:border-[#0891b2] dark:hover:border-[#0891b2] transition-all duration-300 hover:shadow-lg hover:shadow-cyan-600/20">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-cyan-600/10 to-transparent rounded-bl-full hidden sm:block"></div>
                            <div className="relative flex flex-row sm:flex-col items-center gap-2.5 sm:gap-0 sm:items-stretch">
                                <div className="text-lg sm:text-2xl md:text-3xl shrink-0 sm:mb-2 sm:mb-3 leading-none">💾</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base sm:text-lg mb-0 sm:mb-1 leading-tight line-clamp-2">Base de données</h3>
                                    <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400">Sauvegardes</p>
                                </div>
                                <div className="flex items-center text-[#0891b2] dark:text-cyan-400 text-xs sm:text-sm font-medium shrink-0 sm:mt-3">
                                    <span>Gérer</span>
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 sm:ml-1 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        <Link to="/admin/packages" className="w-full sm:w-1/2 lg:w-1/5 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-lg p-2.5 sm:rounded-2xl sm:p-5 border-2 border-gray-100 dark:border-gray-700 hover:border-[#d4af37] dark:hover:border-[#d4af37] transition-all duration-300 hover:shadow-lg hover:shadow-yellow-600/20">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-600/10 to-transparent rounded-bl-full hidden sm:block"></div>
                            <div className="relative flex flex-row sm:flex-col items-center gap-2.5 sm:gap-0 sm:items-stretch">
                                <div className="text-lg sm:text-2xl md:text-3xl shrink-0 sm:mb-2 sm:mb-3 leading-none">📦</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base sm:text-lg mb-0 sm:mb-1 leading-tight line-clamp-2">Paquets</h3>
                                    <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400">Installation</p>
                                </div>
                                <div className="flex items-center text-[#b8860b] dark:text-yellow-400 text-xs sm:text-sm font-medium shrink-0 sm:mt-3">
                                    <span>Gérer</span>
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5 sm:ml-1 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
                </div>
            )}
        </div>
    );
}
