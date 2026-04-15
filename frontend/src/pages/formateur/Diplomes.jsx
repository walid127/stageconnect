import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NavigationFormateur from '../../components/FormateurNav';
import axios from 'axios';

export default function FormateurDiplomas() {
    const [diplomas, setDiplomas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(null);
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');

    const showMessagePopup = (msg, type = 'success') => {
        setMessage(msg);
        setMessageType(type);
        setShowMessage(true);
        setTimeout(() => {
            setShowMessage(false);
        }, 4000);
    };

    useEffect(() => {
        fetchDiplomas();
    }, []);

    const fetchDiplomas = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/diplomes/mes-diplomes');
            setDiplomas(response.data.data || []);
        } catch (err) {
            console.error('Erreur lors de la récupération des diplômes:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (id) => {
        try {
            setDownloading(id);
            const response = await axios.get(`/api/diplomes/${id}/download`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'diploma.pdf';
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
            showMessagePopup('Erreur lors du téléchargement du diplôme', 'error');
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="app-container">
            <NavigationFormateur />

            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    <div className="text-center">
                        <h1 className="hero-title">
                            Mes Diplômes
                        </h1>
                        <Link 
                            to="/formateur/dashboard" 
                            className="btn btn-primary"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Retour au Dashboard
                        </Link>
                    </div>
                </div>

                {/* Decorative Wave */}
                <div className="hero-wave">
                    <svg className="w-full h-8" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="currentColor"></path>
                    </svg>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-10 sm:pb-16 pt-6 sm:pt-8 relative z-20">
                {loading ? (
                    <div className="bg-white/80 dark:bg-[#161615]/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 p-8">
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1a365d]"></div>
                            <span className="ml-4 text-[#78786c] dark:text-[#9D9D99]">Chargement...</span>
                        </div>
                    </div>
                ) : diplomas.length === 0 ? (
                    <div className="bg-white/80 dark:bg-[#161615]/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 p-12 text-center">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">Aucun diplôme</h3>
                        <p className="text-[#78786c] dark:text-[#9D9D99]">Vous n'avez pas encore de diplômes délivrés.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {diplomas.map((diploma) => (
                            <div
                                key={diploma.id}
                                className="bg-white/95 dark:bg-[#161615]/95 rounded-xl shadow-md sm:rounded-2xl sm:shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 overflow-hidden hover:shadow-xl transition-all"
                            >
                                {/* Header */}
                                <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="w-12 h-12 bg-[#d4af37] rounded-xl flex items-center justify-center">
                                            <span className="text-2xl">🎓</span>
                                        </div>
                                        {diploma.fichier_diplome && (
                                            <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-medium">
                                                Fichier disponible
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6 space-y-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">
                                            {diploma.formation?.titre || 
                                             (diploma.formation_promotion ? 
                                                (diploma.formation_promotion.titre && diploma.formation_promotion.titre.length > 2 
                                                    ? diploma.formation_promotion.titre 
                                                    : `Formation de Promotion (${diploma.formation_promotion.type_promotion === '5_ans' ? '5 ans' : '10 ans'})`) 
                                                : null) ||
                                             (diploma.formation_pedagogique ? 'Formation Pédagogique' : null) ||
                                             (diploma.titre && diploma.titre.length > 2 ? diploma.titre : null) ||
                                             'Formation'}
                                        </h3>
                                        <p className="text-sm text-[#78786c] dark:text-[#9D9D99]">
                                            {diploma.formation?.specialite?.nom || 
                                             diploma.formation?.categorie ||
                                             (diploma.formation_promotion?.lieu ? `Lieu: ${diploma.formation_promotion.lieu}` : null) ||
                                             (diploma.formation_promotion ? `Type: ${diploma.formation_promotion.type_promotion === '5_ans' ? 'PSP1' : 'PSP2'}` : null) ||
                                             (diploma.formation_pedagogique ? 'Formation Pédagogique' : null) ||
                                             'N/A'}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        {diploma.num_diplome && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-[#78786c] dark:text-[#9D9D99]">Numéro:</span>
                                                <span className="font-medium text-[#1b1b18] dark:text-[#EDEDEC]">{diploma.num_diplome}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-[#78786c] dark:text-[#9D9D99]">Date de délivrance:</span>
                                            <span className="font-medium text-[#1b1b18] dark:text-[#EDEDEC]">
                                                {diploma.date_deliv ? (() => {
                                                    const date = new Date(diploma.date_deliv);
                                                    if (isNaN(date.getTime())) {
                                                        return 'Date invalide';
                                                    }
                                                    return date.toLocaleDateString('fr-FR', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    });
                                                })() : 'N/A'}
                                            </span>
                                        </div>
                                        {diploma.delivrant && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-[#78786c] dark:text-[#9D9D99]">Délivré par:</span>
                                                <span className="font-medium text-[#1b1b18] dark:text-[#EDEDEC]">{diploma.delivrant.nom || 'N/A'}</span>
                                            </div>
                                        )}
                                    </div>

                                    {diploma.notes && (
                                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                            <p className="text-sm text-[#78786c] dark:text-[#9D9D99] italic">
                                                {diploma.notes}
                                            </p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    {diploma.fichier_diplome && (
                                        <div className="pt-4">
                                            <button
                                                onClick={() => handleDownload(diploma.id)}
                                                disabled={downloading === diploma.id}
                                                className="w-full px-3 py-1 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white rounded-md transition-all font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs"
                                            >
                                                {downloading === diploma.id ? (
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
                                                        Télécharger le Diplôme
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

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
