import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NavigationFormateur from '../../components/FormateurNav';
import axios from 'axios';

export default function PSP1() {
    const [promotionTraining, setPromotionTraining] = useState(null);
    const [loadingPromotion, setLoadingPromotion] = useState(false);
    const [downloadingPromotionSchedule, setDownloadingPromotionSchedule] = useState(false);
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const showMessagePopup = (message, type = 'success') => {
        setMessage(message);
        setMessageType(type);
        setShowMessage(true);
        setTimeout(() => {
            setShowMessage(false);
        }, 4000);
    };

    useEffect(() => {
        fetchPromotionTraining();
    }, []);

    const fetchPromotionTraining = async () => {
        setLoadingPromotion(true);
        try {
            const response = await axios.get('/api/formation-promotion/ma-promotion');
            if (response.data && response.data.data) {
                const data = response.data.data;
                // Afficher seulement si la formation de promotion 5 ans existe
                if (data.has_promotion_training_5 && data.formation_promotion_5) {
                    setPromotionTraining({
                        ...data,
                        has_promotion_training: true,
                        promotion_type: '5_years',
                        dossier_promotion: data.formation_promotion_5.dossier_promotion,
                    });
                } else {
                    setPromotionTraining(null);
                }
            } else {
                setPromotionTraining(null);
            }
        } catch (err) {
            console.error('Erreur lors de la récupération de la formation de promotion:', err);
            setPromotionTraining(null);
        } finally {
            setLoadingPromotion(false);
        }
    };


    const handleDownloadPromotionSchedule = async () => {
        try {
            setDownloadingPromotionSchedule(true);
            const response = await axios.get('/api/formation-promotion/emploi-du-temps/telecharger', {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'emploi_du_temps_promotion.pdf');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Erreur lors du téléchargement:', err);
            showMessagePopup('Erreur lors du téléchargement du fichier', 'error');
        } finally {
            setDownloadingPromotionSchedule(false);
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
                            PSP1 - Formation de Promotion (5 ans)
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
                    {loadingPromotion ? (
                        <div className="p-8 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1a365d]"></div>
                            <span className="ml-4 text-[#78786c] dark:text-[#9D9D99]">Chargement...</span>
                        </div>
                    ) : !promotionTraining ? (
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">Aucune formation de promotion 5 ans disponible</h3>
                            <p className="text-[#78786c] dark:text-[#9D9D99]">Aucune formation de promotion 5 ans (PSP1) disponible pour le moment.</p>
                        </div>
                    ) : (
                        <div className="p-6">
                            <div className="bg-white/80 dark:bg-[#161615]/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 overflow-x-auto">
                                {/* Table Header */}
                                <div className="min-w-[900px] bg-gradient-to-r from-[#1a365d] to-[#2d3748] px-6 py-3">
                                    <div className="grid min-w-[900px] grid-cols-12 gap-2 text-white font-semibold">
                                        <div className="col-span-2 text-center">Type de Promotion</div>
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
                                                <span className="inline-flex px-3 py-1 text-xs rounded-full font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                                                    Promotion 5 ans (PSP1)
                                                </span>
                                            </div>
                                            <div className="col-span-3 text-center">
                                                {promotionTraining.formation_promotion_5 ? (
                                                    <div className="text-center space-y-1">
                                                        {promotionTraining.formation_promotion_5.date_deb && (
                                                            <p className="text-xs text-[#78786c] dark:text-[#9D9D99]">
                                                                <span className="font-medium">Début:</span> {new Date(promotionTraining.formation_promotion_5.date_deb).toLocaleDateString('fr-FR')}
                                                            </p>
                                                        )}
                                                        {promotionTraining.formation_promotion_5.date_fin && (
                                                            <p className="text-xs text-[#78786c] dark:text-[#9D9D99]">
                                                                <span className="font-medium">Fin:</span> {new Date(promotionTraining.formation_promotion_5.date_fin).toLocaleDateString('fr-FR')}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                                )}
                                            </div>
                                            <div className="col-span-2 text-center">
                                                {promotionTraining.formation_promotion_5 ? (
                                                    <span className={`inline-flex px-3 py-1 text-xs rounded-full font-medium ${
                                                        promotionTraining.formation_promotion_5.statut === 'en_cours' 
                                                            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                                            : promotionTraining.formation_promotion_5.statut === 'termine'
                                                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                                                    }`}>
                                                        {promotionTraining.formation_promotion_5.statut === 'en_cours' ? 'En cours' : promotionTraining.formation_promotion_5.statut === 'termine' ? 'Terminé' : 'En attente'}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                                )}
                                            </div>
                                            <div className="col-span-2 text-center">
                                                {promotionTraining.formation_promotion_5 ? (
                                                    <button
                                                        onClick={() => setShowDetailsModal(true)}
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
                                                    onClick={handleDownloadPromotionSchedule}
                                                    disabled={!promotionTraining?.has_schedule_file || downloadingPromotionSchedule}
                                                    className={`px-3 py-1 rounded-md text-xs transition-all ${promotionTraining?.has_schedule_file ? 'bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}`}
                                                    title={promotionTraining?.has_schedule_file ? 'Télécharger l\'emploi du temps' : 'Aucun emploi du temps disponible'}
                                                >
                                                    {downloadingPromotionSchedule ? 'Téléchargement...' : 'Télécharger'}
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

            {/* Details Modal */}
            {showDetailsModal && promotionTraining?.formation_promotion_5 && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-[#161615] rounded-2xl shadow-2xl border border-white/20 dark:border-[#3E3E3A]/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto my-4">
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] p-6 text-white rounded-t-2xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">Détails de la Formation de Promotion PSP1</h2>
                                    <p className="text-white/80 text-sm">{promotionTraining.formation_promotion_5.titre}</p>
                                </div>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="p-2 hover:bg-white/20 rounded-xl transition-all text-white"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                    Titre
                                </label>
                                <p className="text-sm font-semibold text-[#1b1b18] dark:text-[#EDEDEC]">
                                    {promotionTraining.formation_promotion_5.titre}
                                </p>
                            </div>
                            {promotionTraining.formation_promotion_5.description && (
                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Description
                                    </label>
                                    <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">
                                        {promotionTraining.formation_promotion_5.description}
                                    </p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Type de Promotion
                                    </label>
                                    <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">
                                        5 ans (PSP1)
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Statut
                                    </label>
                                    <span className={`inline-flex px-3 py-1 text-xs rounded-full font-medium ${
                                        promotionTraining.formation_promotion_5.statut === 'en_cours' 
                                            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                            : promotionTraining.formation_promotion_5.statut === 'termine'
                                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                                    }`}>
                                        {promotionTraining.formation_promotion_5.statut === 'en_cours' ? 'En cours' : promotionTraining.formation_promotion_5.statut === 'termine' ? 'Terminé' : 'En attente'}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Date de début
                                    </label>
                                    <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">
                                        {promotionTraining.formation_promotion_5.date_deb ? new Date(promotionTraining.formation_promotion_5.date_deb).toLocaleDateString('fr-FR') : '-'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Date de fin
                                    </label>
                                    <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">
                                        {promotionTraining.formation_promotion_5.date_fin ? new Date(promotionTraining.formation_promotion_5.date_fin).toLocaleDateString('fr-FR') : '-'}
                                    </p>
                                </div>
                            </div>
                            {promotionTraining.formation_promotion_5.lieu && (
                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Lieu
                                    </label>
                                    <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">
                                        📍 {promotionTraining.formation_promotion_5.lieu}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl flex justify-end">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
                            >
                                Fermer
                            </button>
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
                            className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
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

