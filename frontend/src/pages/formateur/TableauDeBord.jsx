import { useAuth } from '../../context/AuthContext';
import { useCache } from '../../context/CacheContext';
import { Link } from 'react-router-dom';
import NavigationFormateur from '../../components/FormateurNav';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function FormateurDashboard() {
    const { user } = useAuth();
    const { setCachedData } = useCache();
    const [stats, setStats] = useState({
        availableTrainings: 0,
        myApplications: 0,
        pedagogicalStatus: null, // 'en_attente' | 'en_cours' | 'termine' | null
        promotion: {
            isEligible: false,
            yearsSinceRegistration: 0,
        },
    });
    const [loading, setLoading] = useState(true);
    const [userLoading, setUserLoading] = useState(true);

    useEffect(() => {
        // In dev (StrictMode), effects run twice. Guard fetch until formateur exists
        if (user?.formateur) {
            if (userLoading) setUserLoading(false);
            fetchDashboardData();
        } else if (user) {
            // User loaded but formateur not yet resolved; keep lightweight loading
            if (!userLoading) setUserLoading(true);
        }
    }, [user]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            
            // Récupérer les formations disponibles (uniquement actives)
            const trainingsResponse = await axios.get('/api/formations?status=en_cours');
            const allTrainings = trainingsResponse.data.data || trainingsResponse.data || [];
            
            // Le backend filtre déjà par spécialité si l'utilisateur est formateur
            // On compte juste les formations actives retournées
            const availableTrainings = allTrainings.filter(t => (t.statut || '').toLowerCase() === 'en_cours').length;
            
            // Récupérer mes demandes de formation
            const applicationsResponse = await axios.get('/api/candidatures');
            const allApplications = applicationsResponse.data.data || [];
            const myApplications = allApplications.filter(app => app.formateur_id === user.id)?.length || 0;
            
            // Récupérer la formation pédagogique
            let pedagogicalStatus = null;
            try {
                const pedagogicalResponse = await axios.get('/api/formation-pedagogique/ma-formation');
                const ped = pedagogicalResponse.data?.data;
                pedagogicalStatus = ped?.pedagogical_training_status || null;
            } catch (e) {
                // ignorer si non trouvé
            }

            // Récupérer les informations de formation de promotion
            let promotion = { isEligible: false, yearsSinceRegistration: 0 };
            try {
                const promotionResponse = await axios.get('/api/formation-promotion/ma-promotion');
                const prom = promotionResponse.data?.data;
                if (prom) {
                    promotion = {
                        isEligible: !!prom.is_eligible,
                        yearsSinceRegistration: prom.years_since_registration || 0,
                    };
                }
            } catch (e) {
                // ignore if not found
            }

            const statsData = {
                availableTrainings,
                myApplications,
                pedagogicalStatus,
                promotion,
            };
            
            // Mettre en cache les données
            setCachedData('formateur_dashboard', statsData);
            setStats(statsData);
        } catch (error) {
            console.error('Erreur lors de la récupération des données du tableau de bord:', error);
        } finally {
            setLoading(false);
        }
    };

    if (userLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-[#0a0a0a] dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1a365d] mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <NavigationFormateur />

            {/* Epic Hero Section */}
            <div className="hero-section">
                <div className="hero-overlay"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNkNGFmMzciIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
                
                <div className="hero-content">
                    <div className="text-center">
                        <h1 className="hero-title">
                            Accueil Formateur
                        </h1>

                        {user.formateur?.specialite && (
                            <div className="inline-flex items-center gap-2 badge" style={{background: 'linear-gradient(to right, #d4af37, #b8860b)'}}>
                                <span className="text-sm">🎯</span>
                                <span className="text-white text-sm font-semibold">Spécialisé en {user.formateur?.specialite?.nom || user.formateur?.specialite}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Decorative Wave */}
                <div className="hero-wave">
                    <svg className="w-full h-8" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="currentColor"></path>
                    </svg>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-10 sm:pb-16 pt-3 sm:pt-4 relative z-20">

                {/* Accueil Intro */}
                <div className="mb-6 sm:mb-10">
                    <div className="relative overflow-hidden bg-gradient-to-br from-[#1a365d] via-[#2d3748] to-[#1a365d] dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#0f172a] rounded-2xl shadow-xl lg:rounded-3xl lg:shadow-2xl border border-[#1a365d]/20 dark:border-[#334155]/30">
                        {/* Decorative Pattern */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNkNGFmMzciIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')]"></div>
                        </div>
                        
                        {/* Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        
                        <div className="relative p-4 sm:p-6 md:p-8 lg:p-10">
                            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                                {/* Icon */}
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#d4af37] to-[#b8860b] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg sm:shadow-xl shadow-[#d4af37]/20">
                                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <h2 className="text-xl sm:text-2xl md:text-4xl font-extrabold bg-gradient-to-r from-white via-[#EDEDEC] to-[#d4af37] bg-clip-text text-transparent">
                                            Bienvenue{user?.nom ? `, ${user.nom}` : ''}
                                        </h2>
                                        <div className="hidden md:block w-12 h-0.5 bg-gradient-to-r from-[#d4af37] to-transparent"></div>
                                    </div>
                                    <p className="text-base md:text-lg text-white/90 dark:text-[#EDEDEC]/90 leading-relaxed max-w-2xl">
                                        Consultez vos formations, votre progression pédagogique et votre promotion.
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Bottom Gradient Border */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#d4af37] via-[#0891b2] to-[#d4af37]"></div>
                    </div>
                </div>

                {/* Types de Formations */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
                    {/* Réguliers */}
                    <div className="group relative overflow-hidden bg-gradient-to-br from-white to-blue-50/50 dark:from-[#161615] dark:to-blue-950/20 rounded-2xl shadow-lg sm:rounded-3xl sm:shadow-xl border border-blue-200/50 dark:border-blue-800/30 hover:shadow-xl sm:hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                                <div className="relative w-11 h-11 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                    <span className="text-xl sm:text-2xl filter drop-shadow-lg">📚</span>
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                                </div>
                                <div className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-br from-[#1a365d] to-blue-600 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
                                    {loading || userLoading ? '…' : stats.availableTrainings}
                                </div>
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-[#1b1b18] dark:text-[#EDEDEC] group-hover:text-[#1a365d] dark:group-hover:text-blue-400 transition-colors duration-300">Formations disponibles</h3>
                        </div>
                    </div>

                    {/* Pédagogique */}
                    <div className="group relative overflow-hidden bg-gradient-to-br from-white to-indigo-50/50 dark:from-[#161615] dark:to-indigo-950/20 rounded-2xl shadow-lg sm:rounded-3xl sm:shadow-xl border border-indigo-200/50 dark:border-indigo-800/30 hover:shadow-xl sm:hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                                <div className="relative w-11 h-11 sm:w-14 sm:h-14 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                    <span className="text-xl sm:text-2xl filter drop-shadow-lg">🎓</span>
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                                </div>
                                <span className={`px-3 py-1.5 text-xs rounded-full font-semibold shadow-md ${
                                    stats.pedagogicalStatus === 'termine' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white dark:from-green-600 dark:to-emerald-700' :
                                    stats.pedagogicalStatus === 'en_cours' ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white dark:from-blue-600 dark:to-cyan-700' :
                                    stats.pedagogicalStatus === 'en_attente' ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white dark:from-yellow-600 dark:to-amber-700' :
                                    'bg-gradient-to-r from-gray-400 to-gray-500 text-white dark:from-gray-600 dark:to-gray-700'
                                }`}>
                                    {stats.pedagogicalStatus === 'termine' ? 'Terminé' :
                                     stats.pedagogicalStatus === 'en_cours' ? 'En cours' :
                                     stats.pedagogicalStatus === 'en_attente' ? 'En attente' : 'Aucun'}
                                </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-[#1b1b18] dark:text-[#EDEDEC] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">Formation pédagogique</h3>
                        </div>
                    </div>

                    {/* Promotion */}
                    <div className="group relative overflow-hidden bg-gradient-to-br from-white to-amber-50/50 dark:from-[#161615] dark:to-amber-950/20 rounded-2xl shadow-lg sm:rounded-3xl sm:shadow-xl border border-amber-200/50 dark:border-amber-800/30 hover:shadow-xl sm:hover:shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                                <div className="relative w-11 h-11 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-500 to-yellow-600 dark:from-amber-600 dark:to-yellow-700 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                    <span className="text-xl sm:text-2xl filter drop-shadow-lg">⭐</span>
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                                </div>
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-[#1b1b18] dark:text-[#EDEDEC] group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">Formation de promotion</h3>
                        </div>
                    </div>
                </div>

                {/* Quick Actions Section */}
                <div className="mb-8 sm:mb-12">
                    <div className="flex items-center gap-2 sm:gap-4 mb-5 sm:mb-8">
                        <div className="h-1 flex-1 bg-gradient-to-r from-[#1a365d] via-[#d4af37] to-[#0891b2] rounded-full"></div>
                        <h2 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white whitespace-nowrap">
                            Actions Rapides
                        </h2>
                        <div className="h-1 flex-1 bg-gradient-to-r from-[#1a365d] via-[#d4af37] to-[#0891b2] rounded-full"></div>
                    </div>

                    <div className="flex flex-wrap gap-4 sm:gap-6 justify-center">
                        <Link to="/formateur/stages" className="w-full md:w-1/2 lg:w-1/4 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 sm:rounded-2xl sm:p-6 border-2 border-gray-100 dark:border-gray-700 hover:border-[#1e40af] dark:hover:border-[#1e40af] transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/20">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg sm:shadow-xl">
                                    <span className="text-2xl sm:text-3xl">📚</span>
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Explorer les Formations</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Découvrez de nouvelles formations</p>
                                <div className="mt-4 flex items-center text-[#1e40af] dark:text-blue-400 text-sm font-medium">
                                    <span>Accéder</span>
                                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        <Link to="/formateur/candidatures" className="w-full md:w-1/2 lg:w-1/4 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 sm:rounded-2xl sm:p-6 border-2 border-gray-100 dark:border-gray-700 hover:border-[#0891b2] dark:hover:border-[#0891b2] transition-all duration-300 hover:shadow-lg hover:shadow-cyan-600/20">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#0891b2] to-[#0e7490] rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg sm:shadow-xl">
                                    <span className="text-2xl sm:text-3xl">📝</span>
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Mes demandes de formation</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Suivez vos demandes de formation</p>
                                <div className="mt-4 flex items-center text-[#0891b2] dark:text-cyan-400 text-sm font-medium">
                                    <span>Accéder</span>
                                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        <Link to="/formateur/messages" className="w-full md:w-1/2 lg:w-1/4 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 sm:rounded-2xl sm:p-6 border-2 border-gray-100 dark:border-gray-700 hover:border-purple-600 dark:hover:border-purple-600 transition-all duration-300 hover:shadow-lg hover:shadow-purple-600/20">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg sm:shadow-xl">
                                    <span className="text-2xl sm:text-3xl">💬</span>
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Messages</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Communiquez avec les admins</p>
                                <div className="mt-4 flex items-center text-purple-600 dark:text-purple-400 text-sm font-medium">
                                    <span>Accéder</span>
                                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        <Link to="/formateur/profile" className="w-full md:w-1/2 lg:w-1/4 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 sm:rounded-2xl sm:p-6 border-2 border-gray-100 dark:border-gray-700 hover:border-[#d4af37] dark:hover:border-[#d4af37] transition-all duration-300 hover:shadow-lg hover:shadow-yellow-600/20">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#d4af37] to-[#b8860b] rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg sm:shadow-xl">
                                    <span className="text-2xl sm:text-3xl">👤</span>
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Mon Profil</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Gérez vos informations</p>
                                <div className="mt-4 flex items-center text-[#d4af37] dark:text-yellow-400 text-sm font-medium">
                                    <span>Accéder</span>
                                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        <Link to="/formateur/diplomes" className="w-full md:w-1/2 lg:w-1/4 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 sm:rounded-2xl sm:p-6 border-2 border-gray-100 dark:border-gray-700 hover:border-emerald-600 dark:hover:border-emerald-600 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-600/20">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg sm:shadow-xl">
                                    <span className="text-2xl sm:text-3xl">🎓</span>
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Mes Diplômes</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Voir et télécharger</p>
                                <div className="mt-4 flex items-center text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                                    <span>Accéder</span>
                                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        <Link to="/formateur/history" className="w-full md:w-1/2 lg:w-1/4 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 sm:rounded-2xl sm:p-6 border-2 border-gray-100 dark:border-gray-700 hover:border-slate-600 dark:hover:border-slate-600 transition-all duration-300 hover:shadow-lg hover:shadow-slate-600/20">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg sm:shadow-xl">
                                    <span className="text-2xl sm:text-3xl">📜</span>
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Historique</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Activités et suivis</p>
                                <div className="mt-4 flex items-center text-slate-600 dark:text-slate-400 text-sm font-medium">
                                    <span>Accéder</span>
                                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        <Link to="/formateur/notifications" className="w-full md:w-1/2 lg:w-1/4 group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 sm:rounded-2xl sm:p-6 border-2 border-gray-100 dark:border-gray-700 hover:border-rose-600 dark:hover:border-rose-600 transition-all duration-300 hover:shadow-lg hover:shadow-rose-600/20">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-rose-600 to-rose-700 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg sm:shadow-xl">
                                    <span className="text-2xl sm:text-3xl">🔔</span>
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Notifications</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Alertes et mises à jour</p>
                                <div className="mt-4 flex items-center text-rose-600 dark:text-rose-400 text-sm font-medium">
                                    <span>Accéder</span>
                                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Evergreen Welcome Banner - Modern, minimal */}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#1a365d] via-[#d4af37] to-[#0891b2] rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
                    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-white/80 dark:bg-[#161615]/80 backdrop-blur-sm shadow-lg sm:shadow-xl border border-white/20 dark:border-[#3E3E3A]/50 p-4 sm:p-6 md:p-8">
                        <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-[#d4af37]/5 blur-2xl"></div>
                        <div className="absolute -left-24 -bottom-24 w-80 h-80 rounded-full bg-[#1a365d]/5 blur-2xl"></div>

                        <div className="relative flex flex-col items-center text-center">
                            <div className="flex items-center gap-3 mb-3">
                                <svg className="w-6 h-6 text-[#1a365d] dark:text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                <h3 className="text-xl md:text-2xl font-bold tracking-tight text-[#1b1b18] dark:text-white">
                                    Progression continue, en toute simplicité
                                </h3>
                            </div>
                            <p className="text-sm md:text-base text-[#78786c] dark:text-[#9D9D99] max-w-2xl leading-relaxed">
                                Suivez votre formation pédagogique et avancez vers la promotion — au même endroit.
                            </p>

                            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2 w-full max-w-3xl">
                                <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6"/></svg>
                                    <span className="text-xs font-medium">Formations</span>
                                </div>
                                <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z"/></svg>
                                    <span className="text-xs font-medium">Formation pédagogique</span>
                                </div>
                                <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.803 2.036a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.803-2.036a1 1 0 00-1.175 0l-2.803 2.036c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                                    <span className="text-xs font-medium">Promotion</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

