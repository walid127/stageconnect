import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCache } from '../../context/CacheContext';
import NavigationGestionaire from '../../components/GestionaireNav';
import DiagrammeAnneau from '../../components/DonutChart';
import ProgressionCirculaire from '../../components/CircularProgress';
import CarteSquelette from '../../components/SkeletonCard';
import axios from 'axios';

export default function Statistiques() {
    const { getCachedData, setCachedData } = useCache();
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [availableYears, setAvailableYears] = useState([]);
            const [stats, setStats] = useState({
        users: { total_users: 0, active_users: 0, pending_users: 0, total_admin: 0, total_formateurs: 0, inactive_users: 0 },
        applications: { total: 0, pending: 0, accepted: 0, rejected: 0, on_hold: 0, en_attente: 0, accepte: 0, refuse: 0 },
        trainings: { total: 0, active: 0 },
        trainingsByType: {
            regular: { total: 0, active: 0, completed: 0 },
            pedagogical: { total: 0, active: 0, completed: 0 },
            promotion: { total: 0, eligible5: 0, eligible10: 0 },
        },
        loading: true
    });
    const [activeType, setActiveType] = useState('all'); // all | regular | pedagogical | promotion

    useEffect(() => {
        fetchAvailableYears();
    }, []);

    useEffect(() => {
        if (selectedYear) {
            fetchStatistics(selectedYear);
        }
    }, [selectedYear]);

    const fetchAvailableYears = async () => {
        try {
            const response = await axios.get('/api/statistics/years');
            const years = response.data.years || [];
            setAvailableYears(years);
            
            // If current year is not in the list, add it
            if (!years.includes(currentYear)) {
                setAvailableYears([currentYear, ...years]);
            }
        } catch (err) {
            console.error('Erreur lors de la récupération des années:', err);
            // Fallback: show last 5 years including current
            const fallbackYears = Array.from({ length: 5 }, (_, i) => currentYear - i);
            setAvailableYears(fallbackYears);
        }
    };

    const fetchStatistics = async (year) => {
        try {
            setStats(prev => ({ ...prev, loading: true }));
            
            // Vérifier le cache d'abord
            const cacheKey = `gestionaire_statistics_${year}`;
            const cachedStats = getCachedData(cacheKey);
            if (cachedStats) {
                setStats({ ...cachedStats, loading: false });
                return;
            }
            
            const [usersRes, appsRes, trainingsRes, pedRes, promoRes] = await Promise.all([
                axios.get(`/api/admin/formateur-accounts/statistics?year=${year}`).catch(err => {
                    return { data: { total_users: 0, active_users: 0, pending_users: 0, total_admin: 0, total_formateurs: 0, inactive_users: 0 } };
                }),
                axios.get(`/api/candidatures/stats/overview?year=${year}`).catch(err => {
                    return { data: { total: 0, en_attente: 0, accepte: 0, refuse: 0, en_attente_validation: 0 } };
                }),
                axios.get(`/api/formations?year=${year}`).catch(err => {
                    console.error('❌ Erreur formations:', err.response?.data || err.message);
                    return { data: { data: [] } };
                }),
                axios.get(`/api/admin/formations-pedagogiques`).catch(err => {
                    return { data: { data: [] } };
                }),
                axios.get(`/api/admin/formations-promotion?eligible_only=false`).catch(err => {
                    console.error('❌ Erreur formations promotion:', err.response?.data || err.message);
                    return { data: { data: [] } };
                })
            ]);


            const trainings = trainingsRes.data?.data || trainingsRes.data || [];
            const isActive = (t) => t.statut === 'en_cours' || t.statut === 'published';
            const isCompleted = (t) => t.statut === 'termine';
            const byType = {
                regular: trainings.filter(t => {
                    const category = t.specialite?.nom || t.categorie || '';
                    return category !== 'Formation Pédagogique' && category !== 'Formation de Promotion';
                }),
                pedagogical: trainings.filter(t => {
                    const category = t.specialite?.nom || t.categorie || '';
                    return category === 'Formation Pédagogique';
                }),
                promotion: trainings.filter(t => {
                    const category = t.specialite?.nom || t.categorie || '';
                    return category === 'Formation de Promotion';
                }),
            };
            const activeTrainings = trainings.filter(isActive).length;
            
            // Pedagogical via admin endpoint (status field names differ)
            const pedagogicalList = pedRes.data?.data || [];
            const pedTotal = pedagogicalList.length;
            const pedActive = pedagogicalList.filter(p => {
                const status = p.pedagogical_training_status || p.statut_formation_pedagogique;
                return status === 'en_cours';
            }).length;
            const pedCompleted = pedagogicalList.filter(p => {
                const status = p.pedagogical_training_status || p.statut_formation_pedagogique;
                return status === 'termine';
            }).length;
            const pedPending = pedagogicalList.filter(p => {
                const status = p.pedagogical_training_status || p.statut_formation_pedagogique;
                return status === 'en_attente' || (!status || (status !== 'en_cours' && status !== 'termine'));
            }).length;

            // Promotion via admin endpoint (eligibility differs)
            const promotionList = promoRes.data?.data || [];
            const promoTotal = promotionList.length;
            const eligible10 = promotionList.filter(p => (p.years_since_registration || 0) >= 10).length;
            const eligible5 = promotionList.filter(p => (p.years_since_registration || 0) >= 5).length;

            const trainingsByType = {
                regular: {
                    total: byType.regular.length,
                    active: byType.regular.filter(isActive).length,
                    completed: byType.regular.filter(isCompleted).length,
                },
                pedagogical: {
                    total: pedTotal,
                    active: pedActive,
                    completed: pedCompleted,
                    pending: pedPending,
                },
                promotion: {
                    total: promoTotal,
                    eligible5,
                    eligible10,
                },
            };

            // Normaliser les données des demandes de formation (français vers anglais pour compatibilité)
            const appsData = appsRes.data || { total: 0, en_attente: 0, accepte: 0, refuse: 0, en_attente_validation: 0 };
            const normalizedApps = {
                total: appsData.total || 0,
                pending: appsData.en_attente || appsData.pending || 0,
                accepted: appsData.accepte || appsData.accepted || 0,
                rejected: appsData.refuse || appsData.rejected || 0,
                on_hold: appsData.en_attente_validation || appsData.on_hold || 0,
                // Garder aussi les valeurs françaises pour référence
                en_attente: appsData.en_attente || 0,
                accepte: appsData.accepte || 0,
                refuse: appsData.refuse || 0,
            };

            const newStats = {
                users: usersRes.data || { total_users: 0, active_users: 0, pending_users: 0, total_admin: 0, total_formateurs: 0, inactive_users: 0 },
                applications: normalizedApps,
                trainings: {
                    total: trainings.length,
                    active: activeTrainings
                },
                trainingsByType
            };
            
            
            // Mettre en cache les données
            setCachedData(cacheKey, newStats);

            setStats({
                ...newStats,
                loading: false
            });
        } catch (err) {
            setStats(prev => ({ 
                ...prev, 
                loading: false,
                users: { total_users: 0, active_users: 0, pending_users: 0, total_admin: 0, total_formateurs: 0, inactive_users: 0 },
                applications: { total: 0, pending: 0, accepted: 0, rejected: 0, on_hold: 0, en_attente: 0, accepte: 0, refuse: 0 },
                trainings: { total: 0, active: 0 },
                trainingsByType: {
                    regular: { total: 0, active: 0, completed: 0 },
                    pedagogical: { total: 0, active: 0, completed: 0, pending: 0 },
                    promotion: { total: 0, eligible5: 0, eligible10: 0 },
                }
            }));
        }
    };

    return (
        <div className="app-container print:bg-white">
            {/* Print helpers */}
            <style>{`
                @media print {
                  .avoid-break { break-inside: avoid; page-break-inside: avoid; }
                  .print-trim { box-shadow: none !important; margin-bottom: 12px !important; padding-bottom: 12px !important; }
                  .print-container { padding: 0 !important; }
                }
            `}</style>
            <div className="print:hidden">
                <NavigationGestionaire />
            </div>

            {/* Compact Hero Section */}
            <div className="hero-section print:hidden">
                <div className="hero-overlay"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNkNGFmMzciIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
                
                <div className="hero-content">
                    <div className="text-center">
                        <h1 className="hero-title">
                            Statistiques
                        </h1>

                        {/* Buttons: Back, Year Selector & Print */}
                        <div className="flex flex-wrap justify-center gap-3 mb-4">
                            {/* Back to Dashboard Button */}
                            <Link 
                                to="/gestionaire/dashboard" 
                                className="btn btn-primary"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Retour au Dashboard
                            </Link>
                            
                            {/* Year Selector */}
                            <div className="relative">
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="appearance-none px-6 py-3 pr-10 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-xl border border-white/30 shadow-xl focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-300 font-medium text-sm cursor-pointer"
                                >
                                    {availableYears.map(year => (
                                        <option key={year} value={year} className="bg-gray-800 text-white">
                                            📅 {year}
                                        </option>
                                    ))}
                                </select>
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {/* Print Button */}
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-xl border border-white/30 shadow-xl hover:shadow-white/20 transition-all duration-300"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                <span className="font-medium text-sm">Imprimer</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Decorative Wave */}
                <div className="hero-wave">
                    <svg className="w-full h-4 sm:h-8" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="currentColor"></path>
                    </svg>
                </div>
            </div>

            {/* Print Header (only visible when printing) */}
            <div className="hidden print:block text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    📊 Statistiques StageConnect
                </h1>
                <p className="text-lg text-gray-600 mb-1">
                    Analyse complète des performances et métriques
                </p>
                <p className="text-sm text-gray-500">
                    Généré le {new Date().toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </p>
            </div>

            <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pb-6 sm:pb-16 pt-2 sm:pt-4 relative z-20 print:px-0 print:pt-0 print-container">
                
                {stats.loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        <CarteSquelette />
                        <CarteSquelette />
                        <CarteSquelette />
                        <CarteSquelette />
                        <CarteSquelette />
                        <CarteSquelette />
                    </div>
                ) : (
                    <>
                {/* KPI SUMMARY BAR removed; numbers integrated into sections below */}
                {/* SECTION 1: Statistiques des demandes de formation - WITH GRAPHIC */}
                <div className="relative group mb-8 print:mb-4 avoid-break print-trim">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 overflow-hidden print:bg-white print:border print:border-gray-300 avoid-break print-trim">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-100/30 to-transparent rounded-full -mr-32 -mt-32 blur-3xl print:hidden"></div>
                        
                        <div className="relative">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-[#ea580c] to-[#c2410c] rounded-xl flex items-center justify-center shadow-lg">
                                    <span className="text-xl">📝</span>
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Statistiques des demandes de formation</h2>
                                    <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Analyse des demandes de formation</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs">Total: <strong>{stats.applications.total}</strong></span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left: Donut Chart */}
                                <div className="flex justify-center items-center">
                                    <DiagrammeAnneau
                                        size={220}
                                        strokeWidth={40}
                                        data={[
                                            { label: 'En Attente', value: stats.applications.pending || 0, color: '#f59e0b' },
                                            { label: 'Acceptées', value: stats.applications.accepted || 0, color: '#10b981' },
                                            { label: 'Refusées', value: stats.applications.rejected || 0, color: '#ef4444' },
                                        ]}
                                    />
                                </div>

                                {/* Right: All Statistics */}
                                <div className="space-y-2">
                                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-3 flex justify-between items-center border-l-4 border-orange-500">
                                        <span className="text-orange-700 dark:text-orange-300 text-xs font-medium">⏳ En Attente</span>
                                        <span className="text-2xl font-black text-orange-600 dark:text-orange-400">{stats.applications.pending}</span>
                                    </div>
                                    <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-3 border-l-4 border-green-500">
                                        <div className="flex justify-between items-center">
                                            <span className="text-green-700 dark:text-green-300 text-xs font-medium">✅ Acceptées</span>
                                            <span className="text-2xl font-black text-green-600 dark:text-green-400">{stats.applications.accepted}</span>
                                        </div>
                                        <div className="mt-1 text-[10px] text-green-600 dark:text-green-400">
                                            Taux de succès: {stats.applications.total > 0 ? Math.round((stats.applications.accepted / stats.applications.total) * 100) : 0}%
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-3 flex justify-between items-center border-l-4 border-red-500">
                                        <span className="text-red-700 dark:text-red-300 text-xs font-medium">❌ Refusées</span>
                                        <span className="text-2xl font-black text-red-600 dark:text-red-400">{stats.applications.rejected}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: Statistiques des Utilisateurs - WITH GRAPHIC */}
                <div className="relative group mb-8 print:mb-4 avoid-break print-trim">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#1e40af] to-[#3b82f6] rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 overflow-hidden print:bg-white print:border print:border-gray-300 avoid-break print-trim">
                        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-100/30 to-transparent rounded-full -ml-32 -mt-32 blur-3xl print:hidden"></div>
                        
                        <div className="relative">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] rounded-xl flex items-center justify-center shadow-lg">
                                    <span className="text-xl">👥</span>
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Statistiques des Utilisateurs</h2>
                                    <p className="text_gray-600 dark:text_gray-400 text-xs mt-1">Répartition et activité des formateurs</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs">Total: <strong>{stats.users.total_users}</strong></span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left: Circular Progress */}
                                <div className="flex flex-col items-center justify-center gap-4">
                                    <ProgressionCirculaire
                                        percentage={stats.users.total_users > 0 ? (stats.users.active_users / stats.users.total_users) * 100 : 0}
                                        size={180}
                                        strokeWidth={16}
                                        color="#1e40af"
                                        label="Taux d'Activité"
                                    />
                                    <div className="text-center">
                                        <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{stats.users.active_users}</p>
                                        <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">utilisateurs actifs sur {stats.users.total_users}</p>
                                    </div>
                                </div>

                                {/* Right: All Statistics */}
                                <div className="space-y-2">
                                    <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl p-4 flex justify-between items-center border-l-4 border-indigo-500">
                                        <span className="text-indigo-700 dark:text-indigo-300 text-sm font-medium">👨‍💼 gestionaires</span>
                                        <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{stats.users.total_admin}</span>
                                    </div>
                                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 flex justify-between items-center border-l-4 border-purple-500">
                                        <span className="text-purple-700 dark:text-purple-300 text-sm font-medium">🎓 Formateurs</span>
                                        <span className="text-3xl font-black text-purple-600 dark:text-purple-400">{stats.users.total_formateurs}</span>
                                    </div>
                                    <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 flex justify-between items-center border-l-4 border-green-500">
                                        <span className="text-green-700 dark:text-green-300 text-sm font-medium">✅ Utilisateurs Actifs</span>
                                        <span className="text-3xl font-black text-green-600 dark:text-green-400">{stats.users.active_users}</span>
                                    </div>
                                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/50 rounded-xl p-4 flex justify-between items-center border-l-4 border-gray-500">
                                        <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">⛔ Utilisateurs Inactifs</span>
                                        <span className="text-3xl font-black text-gray-600 dark:text-gray-400">{stats.users.inactive_users}</span>
                                    </div>
                                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4 flex justify-between items-center border-l-4 border-orange-500">
                                        <span className="text-orange-700 dark:text-orange-300 text-sm font-medium">⏳ En Attente Validation</span>
                                        <span className="text-3xl font-black text-orange-600 dark:text-orange-400">{stats.users.pending_users}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 3: Statistiques des Formations - WITH TYPE FILTER */}
                <div className="relative group avoid-break print-trim">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
                    <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 p-10 overflow-hidden print:bg-white print:border print:border-gray-300 avoid-break print-trim">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-100/30 to-transparent rounded-full -mr-32 -mt-32 blur-3xl print:hidden"></div>
                        
                        <div className="relative">
                            <div className="flex items-center justify-between gap-4 mb-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-[#d4af37] to-[#b8860b] rounded-2xl flex items-center justify-center shadow-xl">
                                    <span className="text-2xl">🎯</span>
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Répartition des Formations par Type</h2>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Vue synthétique par type de formation</p>
                                </div>
                                <div className="hidden md:flex items-center gap-2">
                                    <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs">Actifs: <strong>{stats.trainings.active}</strong></span>
                                    <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs">Total: <strong>{stats.trainings.total}</strong></span>
                                </div>
                            </div>

                            {/* Removed redundant overall grid to reduce repetition */}

                            {/* Segmented Control */}
                            <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 text-sm">
                                {[
                                    { key: 'all', label: 'Tous' },
                                    { key: 'regular', label: 'Réguliers' },
                                    { key: 'pedagogical', label: 'Pédagogique' },
                                    { key: 'promotion', label: 'Promotion' },
                                ].map(btn => (
                                    <button
                                        key={btn.key}
                                        onClick={() => setActiveType(btn.key)}
                                        className={`${activeType === btn.key ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-600 dark:text-gray-300'} px-4 py-2 rounded-md transition-colors`}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>

                            {/* Breakdown by Formation Type */}
                            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Regular */}
                                {(activeType === 'all' || activeType === 'regular') && (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Formations</h3>
                                        <span className="text-gray-500">📚</span>
                                    </div>
                                    <div className="flex justify-center">
                                        <DiagrammeAnneau
                                            size={180}
                                            strokeWidth={42}
                                            data={(() => {
                                                const active = stats.trainingsByType.regular.active || 0;
                                                const completed = stats.trainingsByType.regular.completed || 0;
                                                return [
                                                    { label: 'En cours', value: active, color: '#16a34a' },
                                                    { label: 'Terminés', value: completed, color: '#475569' },
                                                ];
                                            })()}
                                        />
                                    </div>
                                </div>)}

                                {/* Pedagogical */}
                                {(activeType === 'all' || activeType === 'pedagogical') && (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Formation pédagogique</h3>
                                        <span className="text-gray-500">🎓</span>
                                    </div>
                                    <div className="flex justify-center">
                                        <DiagrammeAnneau
                                            size={180}
                                            strokeWidth={42}
                                            data={(() => {
                                                const total = stats.trainingsByType.pedagogical.total || 0;
                                                const ongoing = stats.trainingsByType.pedagogical.active || 0; // 'encour'
                                                const completed = stats.trainingsByType.pedagogical.completed || 0;
                                                const pending = stats.trainingsByType.pedagogical.pending || 0;
                                                return [
                                                    { label: 'En cours', value: ongoing, color: '#2563eb' },
                                                    { label: 'Terminés', value: completed, color: '#475569' },
                                                    { label: 'En attente', value: pending, color: '#f59e0b' },
                                                ];
                                            })()}
                                        />
                                    </div>
                                </div>)}

                                {/* Promotion */}
                                {(activeType === 'all' || activeType === 'promotion') && (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Formation de promotion</h3>
                                        <span className="text-gray-500">⭐</span>
                                    </div>
                                    <div className="flex justify-center">
                                        <DiagrammeAnneau
                                            size={180}
                                            strokeWidth={42}
                                            data={(() => {
                                                const total = stats.trainingsByType.promotion.total || 0;
                                                const elig5 = stats.trainingsByType.promotion.eligible5 || 0;
                                                const elig10 = stats.trainingsByType.promotion.eligible10 || 0;
                                                const nonElig = Math.max(total - Math.max(elig5, elig10), 0);
                                                return [
                                                    { label: 'Éligible 10 ans', value: elig10, color: '#a855f7' },
                                                    { label: 'Éligible 5 ans', value: elig5 - elig10 > 0 ? (elig5 - elig10) : 0, color: '#7c3aed' },
                                                    { label: 'Non qualifié', value: nonElig, color: '#e5e7eb' },
                                                ];
                                            })()}
                                        />
                                    </div>
                                </div>)}
                            </div>
                        </div>
                    </div>
                </div>
                    </>
                )}
            </div>
        </div>
    );
}

