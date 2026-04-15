import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import NavigationFormateur from '../../components/FormateurNav';
import axios from 'axios';

export default function StagePedagogique() {
    const [pedagogicalTraining, setPedagogicalTraining] = useState(null);
    const [loadingPedagogical, setLoadingPedagogical] = useState(false);
    const [downloadingSchedule, setDownloadingSchedule] = useState(false);
    const [refreshingPedagogical, setRefreshingPedagogical] = useState(false);
    const [showPedagogicalModal, setShowPedagogicalModal] = useState(false);
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');

    const showMessagePopup = (message, type = 'success') => {
        setMessage(message);
        setMessageType(type);
        setShowMessage(true);
        setTimeout(() => {
            setShowMessage(false);
        }, 4000);
    };

    const location = useLocation();

    useEffect(() => {
        fetchPedagogicalTraining();
    }, []);

    // Re-fetch data when navigating to this page (e.g., from notification)
    useEffect(() => {
        if (location.pathname === '/formateur/stages/pedagogique') {
            fetchPedagogicalTraining();
        }
    }, [location.pathname]);

    const fetchPedagogicalTraining = async () => {
        setLoadingPedagogical(true);
        try {
            const response = await axios.get('/api/formation-pedagogique/ma-formation');
            if (response.data && response.data.data) {
                const trainingData = response.data.data;
                
                // Afficher seulement si la formation pédagogique existe vraiment (a un formation_pedagogique_id)
                if (trainingData.formation_pedagogique_id) {
                    if (!trainingData.pedagogical_training_status || 
                        trainingData.pedagogical_training_status === null || 
                        trainingData.pedagogical_training_status === undefined ||
                        trainingData.pedagogical_training_status === '') {
                        trainingData.pedagogical_training_status = 'en_attente';
                    }
                    setPedagogicalTraining(trainingData);
                } else {
                    setPedagogicalTraining(null);
                }
            } else {
                setPedagogicalTraining(null);
            }
        } catch (err) {
            console.error('Erreur lors de la récupération de la formation pédagogique:', err);
            setPedagogicalTraining(null);
        } finally {
            setLoadingPedagogical(false);
        }
    };

    const handleRefreshPedagogical = async () => {
        setRefreshingPedagogical(true);
        try {
            await fetchPedagogicalTraining();
        } finally {
            setRefreshingPedagogical(false);
        }
    };

    const handleDownloadPedagogicalSchedule = async () => {
        try {
            setDownloadingSchedule(true);
            const response = await axios.get('/api/formation-pedagogique/emploi-du-temps/telecharger', {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'emploi_du_temps.pdf';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Erreur lors du téléchargement:', err);
            showMessagePopup('Erreur lors du téléchargement du fichier', 'error');
        } finally {
            setDownloadingSchedule(false);
        }
    };


    const getStatusColor = (status) => {
        if (!status || status === '' || status === null || status === undefined) {
            return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400';
        }
        
        const normalizedStatus = String(status).toLowerCase().trim();
        
        switch (normalizedStatus) {
            case 'en_attente':
                return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400';
            case 'en_cours':
                return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400';
            case 'termine':
                return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400';
            default: 
                return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400';
        }
    };

    const getStatusText = (status) => {
        if (!status || status === '' || status === null || status === undefined) {
            return 'En attente';
        }
        
        const normalizedStatus = String(status).toLowerCase().trim();
        
        switch (normalizedStatus) {
            case 'en_attente':
                return 'En attente';
            case 'en_cours':
                return 'En cours';
            case 'termine':
                return 'Terminé';
            default: 
                return 'En attente';
        }
    };

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
                            Formation Pédagogique
                        </h1>
                        
                        <div className="mb-4">
                            <Link 
                                to="/formateur/stages" 
                                className="btn btn-primary"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Retour aux Formations
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Decorative Wave */}
                <div className="hero-wave">
                    <svg className="w-full h-8" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="currentColor"></path>
                    </svg>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-4 relative z-20">
                <div className="bg-white/80 dark:bg-[#161615]/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 overflow-hidden">
                    {loadingPedagogical ? (
                        <div className="p-8 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1a365d]"></div>
                            <span className="ml-4 text-[#78786c] dark:text-[#9D9D99]">Chargement...</span>
                        </div>
                    ) : !pedagogicalTraining ? (
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">Aucune formation trouvée</h3>
                            <p className="text-[#78786c] dark:text-[#9D9D99]">Vous n'avez pas encore de formation pédagogique enregistrée.</p>
                        </div>
                    ) : (
                        <div className="p-6">
                            <div className="bg-white/95 dark:bg-[#161615]/95 rounded-2xl shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 overflow-x-auto">
                                {/* Table Header */}
                                <div className="min-w-[900px] sc-table-header-gradient px-6 py-3">
                                    <div className="grid min-w-[900px] grid-cols-12 gap-2 text-white font-semibold">
                                        <div className="col-span-2 text-center">Type</div>
                                        <div className="col-span-3 text-center">Dates</div>
                                        <div className="col-span-2 text-center">Statut</div>
                                        <div className="col-span-2 text-center">Détails</div>
                                        <div className="col-span-3 text-center">Emploi du temps</div>
                                    </div>
                                </div>
                                {/* Table Row */}
                                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                    <div className="px-6 py-4">
                                        <div className="grid min-w-[900px] grid-cols-12 gap-2 items-center">
                                            <div className="col-span-2 text-center">
                                                <span className="inline-flex px-3 py-1 text-xs rounded-full font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">Formation pédagogique</span>
                                            </div>
                                            <div className="col-span-3 text-center">
                                                {(pedagogicalTraining.pedagogical_training_start_date || pedagogicalTraining.pedagogical_training_end_date) ? (
                                                    <div className="text-center space-y-1">
                                                        {pedagogicalTraining.pedagogical_training_start_date && (
                                                            <p className="text-xs text-[#78786c] dark:text-[#9D9D99]">
                                                                <span className="font-medium">Début:</span> {new Date(pedagogicalTraining.pedagogical_training_start_date).toLocaleDateString('fr-FR')}
                                                            </p>
                                                        )}
                                                        {pedagogicalTraining.pedagogical_training_end_date && (
                                                            <p className="text-xs text-[#78786c] dark:text-[#9D9D99]">
                                                                <span className="font-medium">Fin:</span> {new Date(pedagogicalTraining.pedagogical_training_end_date).toLocaleDateString('fr-FR')}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                                )}
                                            </div>
                                            <div className="col-span-2 text-center">
                                                <span className={`inline-flex px-3 py-1 text-xs rounded-full font-medium ${getStatusColor(pedagogicalTraining.pedagogical_training_status)}`}>
                                                    {getStatusText(pedagogicalTraining.pedagogical_training_status)}
                                                </span>
                                            </div>
                                            <div className="col-span-2 text-center">
                                                {pedagogicalTraining.formation_pedagogique_id || pedagogicalTraining.id ? (
                                                    <button
                                                        onClick={() => setShowPedagogicalModal(true)}
                                                        className="px-3 py-1 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                        title="Voir les détails"
                                                    >
                                                        Détails
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                                )}
                                            </div>
                                            <div className="col-span-3 text-center">
                                                <button
                                                    onClick={handleDownloadPedagogicalSchedule}
                                                    disabled={!pedagogicalTraining?.has_schedule_file || downloadingSchedule}
                                                    className={`px-3 py-1 rounded-md text-xs transition-all ${pedagogicalTraining?.has_schedule_file ? 'bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}`}
                                                    title={pedagogicalTraining?.has_schedule_file ? 'Télécharger l\'emploi du temps' : 'Aucun emploi du temps disponible'}
                                                >
                                                    {downloadingSchedule ? 'Téléchargement...' : 'Télécharger'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>


                        </div>
                    )}
                </div>
            </div>

            {/* Pedagogical Training Details Modal */}
            {showPedagogicalModal && pedagogicalTraining && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowPedagogicalModal(false)}>
                    <div className="bg-white dark:bg-[#161615] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] px-6 py-4 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-white">Détails de la Formation Pédagogique</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleRefreshPedagogical}
                                    disabled={refreshingPedagogical}
                                    className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl transition-all duration-300 font-medium text-sm shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    title="Actualiser"
                                >
                                    {refreshingPedagogical ? (
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowPedagogicalModal(false)}
                                    className="p-2 hover:bg-white/20 rounded-xl transition-all text-white"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6 overflow-y-auto flex-1">
                            {/* Status */}
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
                                <div>
                                    <p className="text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-1">Statut</p>
                                    <span className={`inline-flex px-3 py-1 text-sm rounded-full font-medium ${getStatusColor(pedagogicalTraining.pedagogical_training_status)}`}>
                                        {getStatusText(pedagogicalTraining.pedagogical_training_status)}
                                    </span>
                                </div>
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Dates - show when status is en_cours or termine */}
                            {(pedagogicalTraining.pedagogical_training_status === 'en_cours' || 
                              pedagogicalTraining.pedagogical_training_status === 'termine') && 
                             pedagogicalTraining.pedagogical_training_start_date && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                                                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-[#78786c] dark:text-[#9D9D99]">Date de début</p>
                                                <p className="text-lg font-semibold text-[#1b1b18] dark:text-[#EDEDEC]">
                                                    {new Date(pedagogicalTraining.pedagogical_training_start_date).toLocaleDateString('fr-FR', {
                                                        day: '2-digit',
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {pedagogicalTraining.pedagogical_training_end_date && (
                                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-[#78786c] dark:text-[#9D9D99]">Date de fin</p>
                                                    <p className="text-lg font-semibold text-[#1b1b18] dark:text-[#EDEDEC]">
                                                        {new Date(pedagogicalTraining.pedagogical_training_end_date).toLocaleDateString('fr-FR', {
                                                            day: '2-digit',
                                                            month: 'long',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Schedule File Download - only when en_cours or termine */}
                            {(pedagogicalTraining.pedagogical_training_status === 'en_cours' || 
                              pedagogicalTraining.pedagogical_training_status === 'termine') && 
                             pedagogicalTraining.has_schedule_file && (
                                <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 rounded-xl border border-yellow-200 dark:border-yellow-800">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center">
                                                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-1">Emploi du temps</p>
                                                <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">Téléchargez votre emploi du temps de formation</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleDownloadPedagogicalSchedule}
                                            disabled={downloadingSchedule}
                                            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl transition-all duration-300 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {downloadingSchedule ? (
                                                <>
                                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Téléchargement...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    Télécharger
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Information Messages */}
                            {pedagogicalTraining.pedagogical_training_status === 'en_attente' && (
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div>
                                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">Formation en attente</p>
                                            <p className="text-sm text-blue-700 dark:text-blue-400">Votre formation pédagogique est en attente. Vous serez notifié lorsque celle-ci débutera.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(pedagogicalTraining.pedagogical_training_status === 'encour' || pedagogicalTraining.pedagogical_training_status === 'en_cours') && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-6 h-6 text-green-600 dark:text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div>
                                            <p className="text-sm font-semibold text-green-900 dark:text-green-300 mb-1">Formation en cours</p>
                                            <p className="text-sm text-green-700 dark:text-green-400">Votre formation pédagogique est actuellement en cours. N'oubliez pas de consulter votre emploi du temps.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {pedagogicalTraining.pedagogical_training_status === 'termine' && (
                                <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-200 dark:border-purple-800">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-6 h-6 text-purple-600 dark:text-purple-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                        </svg>
                                        <div>
                                            <p className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-1">Formation terminée</p>
                                            <p className="text-sm text-purple-700 dark:text-purple-400">Félicitations ! Votre formation pédagogique est maintenant terminée.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {/* Message Popup */}
            {showMessage && (
                <div className="fixed top-4 right-4 z-50 animate-slide-in">
                    <div className={`px-6 py-4 rounded-xl shadow-lg border-l-4 flex items-center space-x-3 ${
                        messageType === 'success' 
                            ? 'bg-green-50 border-green-500 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                            : 'bg-red-50 border-red-500 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            messageType === 'success' 
                                ? 'bg-green-500' 
                                : 'bg-red-500'
                        }`}>
                            {messageType === 'success' ? (
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <p className="font-semibold">
                                {messageType === 'success' ? 'Succès' : 'Erreur'}
                            </p>
                            <p className="text-sm">{message}</p>
                        </div>
                        <button 
                            onClick={() => setShowMessage(false)}
                            className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

