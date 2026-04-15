import { Link } from 'react-router-dom';
import NavigationGestionaire from '../../components/GestionaireNav';

export default function FormationsGestionaire() {
    return (
        <div className="app-container">
            <NavigationGestionaire />

            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-overlay"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNkNGFmMzciIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
                
                <div className="hero-content">
                    <div className="text-center">
                        <h1 className="hero-title">
                            Gestion des Formations
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

            <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pb-6 sm:pb-16 pt-2 sm:pt-4 relative z-20">
                {/* Row 1: 3 cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 md:gap-8 mb-4 sm:mb-8">
                    <Link
                        to="/gestionaire/stages/regulier"
                        className="group relative overflow-hidden rounded-[2rem] p-[2px] bg-gradient-to-br from-rose-400 via-rose-500 to-red-600 dark:from-rose-600 dark:via-rose-700 dark:to-red-800 shadow-[0_25px_50px_-12px_rgba(244,63,94,0.35)] dark:shadow-[0_25px_50px_-12px_rgba(190,18,60,0.4)] hover:shadow-[0_35px_60px_-15px_rgba(244,63,94,0.45)] hover:scale-[1.03] active:scale-[0.99] transition-all duration-500 ease-out"
                    >
                        <div className="relative h-full rounded-[calc(2rem-2px)] bg-white dark:bg-[#1a1a18] p-4 sm:p-6 md:p-8 flex flex-col items-center text-center min-h-[140px] sm:min-h-[190px] md:min-h-[220px]">
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[calc(2rem-2px)]" />
                            <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center mb-3 sm:mb-4 md:mb-5 shadow-lg shadow-rose-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                <svg className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-1 sm:mb-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors duration-300">Formation</h3>
                            <p className="text-xs sm:text-sm text-[#78786c] dark:text-[#9D9D99] mb-3 sm:mb-4 flex-1">Gérer les formations</p>
                            <span className="inline-flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-sm opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                Accéder <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                            </span>
                        </div>
                    </Link>

                    <Link
                        to="/gestionaire/candidatures"
                        className="group relative overflow-hidden rounded-[2rem] p-[2px] bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 dark:from-amber-600 dark:via-amber-700 dark:to-orange-800 shadow-[0_25px_50px_-12px_rgba(245,158,11,0.35)] dark:shadow-[0_25px_50px_-12px_rgba(217,119,6,0.4)] hover:shadow-[0_35px_60px_-15px_rgba(245,158,11,0.45)] hover:scale-[1.03] active:scale-[0.99] transition-all duration-500 ease-out"
                    >
                        <div className="relative h-full rounded-[calc(2rem-2px)] bg-white dark:bg-[#1a1a18] p-4 sm:p-6 md:p-8 flex flex-col items-center text-center min-h-[140px] sm:min-h-[190px] md:min-h-[220px]">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[calc(2rem-2px)]" />
                            <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-3 sm:mb-4 md:mb-5 shadow-lg shadow-amber-500/30 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
                                <svg className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-1 sm:mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">Demandes de formation</h3>
                            <p className="text-xs sm:text-sm text-[#78786c] dark:text-[#9D9D99] mb-3 sm:mb-4 flex-1">Gérer les demandes de formation</p>
                            <span className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                Accéder <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                            </span>
                        </div>
                    </Link>

                    <Link
                        to="/gestionaire/stages/pedagogique"
                        className="group relative overflow-hidden rounded-[2rem] p-[2px] bg-gradient-to-br from-indigo-400 via-indigo-500 to-purple-600 dark:from-indigo-600 dark:via-indigo-700 dark:to-purple-800 shadow-[0_25px_50px_-12px_rgba(99,102,241,0.35)] dark:shadow-[0_25px_50px_-12px_rgba(79,70,229,0.4)] hover:shadow-[0_35px_60px_-15px_rgba(99,102,241,0.45)] hover:scale-[1.03] active:scale-[0.99] transition-all duration-500 ease-out"
                    >
                        <div className="relative h-full rounded-[calc(2rem-2px)] bg-white dark:bg-[#1a1a18] p-4 sm:p-6 md:p-8 flex flex-col items-center text-center min-h-[140px] sm:min-h-[190px] md:min-h-[220px]">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[calc(2rem-2px)]" />
                            <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-3 sm:mb-4 md:mb-5 shadow-lg shadow-indigo-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                <svg className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-1 sm:mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">Formation Pédagogique</h3>
                            <p className="text-xs sm:text-sm text-[#78786c] dark:text-[#9D9D99] mb-3 sm:mb-4 flex-1">Gérer les formations pédagogiques</p>
                            <span className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                Accéder <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Row 2: 2 cards centered */}
                <div className="flex flex-col sm:flex-row justify-center items-stretch gap-4 sm:gap-6 md:gap-8 max-w-4xl mx-auto">
                    <Link
                        to="/gestionaire/stages/psp1"
                        className="group relative overflow-hidden rounded-[2rem] p-[2px] bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 dark:from-emerald-600 dark:via-green-700 dark:to-teal-800 shadow-[0_25px_50px_-12px_rgba(16,185,129,0.35)] dark:shadow-[0_25px_50px_-12px_rgba(5,150,105,0.4)] hover:shadow-[0_35px_60px_-15px_rgba(16,185,129,0.45)] hover:scale-[1.03] active:scale-[0.99] transition-all duration-500 ease-out flex-1 max-w-md mx-auto sm:mx-0 w-full"
                    >
                        <div className="relative h-full rounded-[calc(2rem-2px)] bg-white dark:bg-[#1a1a18] p-4 sm:p-6 md:p-8 flex flex-col items-center text-center min-h-[140px] sm:min-h-[190px] md:min-h-[220px]">
                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[calc(2rem-2px)]" />
                            <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3 sm:mb-4 md:mb-5 shadow-lg shadow-emerald-500/30 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
                                <svg className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-1 sm:mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">PSP1 (Promotion 5 ans)</h3>
                            <p className="text-xs sm:text-sm text-[#78786c] dark:text-[#9D9D99] mb-3 sm:mb-4 flex-1">Gérer les promotions de 5 ans</p>
                            <span className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                Accéder <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                            </span>
                        </div>
                    </Link>

                    <Link
                        to="/gestionaire/stages/psp2"
                        className="group relative overflow-hidden rounded-[2rem] p-[2px] bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-600 dark:from-violet-600 dark:via-purple-700 dark:to-fuchsia-800 shadow-[0_25px_50px_-12px_rgba(139,92,246,0.35)] dark:shadow-[0_25px_50px_-12px_rgba(124,58,237,0.4)] hover:shadow-[0_35px_60px_-15px_rgba(139,92,246,0.45)] hover:scale-[1.03] active:scale-[0.99] transition-all duration-500 ease-out flex-1 max-w-md mx-auto sm:mx-0 w-full"
                    >
                        <div className="relative h-full rounded-[calc(2rem-2px)] bg-white dark:bg-[#1a1a18] p-4 sm:p-6 md:p-8 flex flex-col items-center text-center min-h-[140px] sm:min-h-[190px] md:min-h-[220px]">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[calc(2rem-2px)]" />
                            <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center mb-3 sm:mb-4 md:mb-5 shadow-lg shadow-violet-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                <svg className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-1 sm:mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-300">PSP2 (Promotion 10 ans)</h3>
                            <p className="text-xs sm:text-sm text-[#78786c] dark:text-[#9D9D99] mb-3 sm:mb-4 flex-1">Gérer les promotions de 10 ans</p>
                            <span className="inline-flex items-center gap-2 text-violet-600 dark:text-violet-400 font-semibold text-sm opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                Accéder <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                            </span>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}

