import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCache } from '../../context/CacheContext';
import NavigationFormateur from '../../components/FormateurNav';
import CarteSquelette from '../../components/SkeletonCard';
import FiltreAvance from '../../components/AdvancedFilter';
import axios from 'axios';

export default function StageRegulier() {
    const { getCachedData, setCachedData, clearCache } = useCache();
    const [trainings, setTrainings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showApplicationModal, setShowApplicationModal] = useState(false);
    const [selectedTraining, setSelectedTraining] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [dossierFile, setDossierFile] = useState(null);
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');
    const [userApplications, setUserApplications] = useState([]);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedTrainingDetails, setSelectedTrainingDetails] = useState(null);
    const [appliedFilters, setAppliedFilters] = useState({});

    const filteredTrainings = trainings.filter(training => {
        if (appliedFilters.title && !training.titre?.toLowerCase().includes(appliedFilters.title.toLowerCase())) {
            return false;
        }
        if (appliedFilters.category && !(training.specialite?.nom || training.categorie || '')?.toLowerCase().includes(appliedFilters.category.toLowerCase())) {
            return false;
        }
        if (appliedFilters.location && !training.lieu?.toLowerCase().includes(appliedFilters.location.toLowerCase())) {
            return false;
        }
        if (appliedFilters.start_date && (training.date_deb || training.date_debut) && new Date(training.date_deb || training.date_debut) < new Date(appliedFilters.start_date)) {
            return false;
        }
        return true;
    });

    const showMessagePopup = (message, type = 'success') => {
        setMessage(message);
        setMessageType(type);
        setShowMessage(true);
        setTimeout(() => {
            setShowMessage(false);
        }, 4000);
    };

    useEffect(() => {
        fetchTrainings(true);
        fetchUserApplications();
    }, []);

    const fetchTrainings = async (forceRefresh = false) => {
        try {
            if (!forceRefresh) {
                const cached = getCachedData('formateur_trainings');
                if (cached) {
                    setTrainings(cached);
                    setLoading(false);
                    return;
                }
            } else {
                clearCache('formateur_trainings');
            }
            
            const response = await axios.get('/api/formations?status=en_cours');
            const allData = response.data.data || [];
            
            const allTrainings = allData.filter(t => {
                const status = (t.statut || t.status || '').toLowerCase();
                const isActive = status === 'en_cours';
                if (!isActive) return false;
                
                const isOptionnelleType = !t.type || t.type === 'optionnelle';
                if (!isOptionnelleType) return false;
                
                // Exclure les formations de promotion et pédagogiques (identifiées par leur titre)
                if (t.titre && (t.titre.includes('Formation de Promotion') || t.titre.includes('Formation Pédagogique'))) {
                    return false;
                }
                
                return true;
            });
            
            setCachedData('formateur_trainings', allTrainings);
            setTrainings(allTrainings);
        } catch (err) {
            setError('Erreur lors du chargement des formations');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserApplications = async () => {
        try {
            const response = await axios.get('/api/candidatures');
            setUserApplications(response.data.data || []);
        } catch (err) {
            console.error('Erreur lors de la récupération des demandes de formation:', err);
        }
    };

    const handleApply = (training) => {
        if (training.statut === 'termine') {
            showMessagePopup('Cette formation est terminée, vous ne pouvez plus postuler.', 'error');
            return;
        }
        if (training.is_full || training.remaining_slots === 0) {
            showMessagePopup('Cette formation est complète, il n\'y a plus de places disponibles.', 'error');
            return;
        }
        setSelectedTraining(training);
        setShowApplicationModal(true);
    };

    const handleViewDetails = (training) => {
        // Find the application for this training to get dossier info
        const application = userApplications.find(app => app.formation_id === training.id);
        const trainingWithApplication = {
            ...training,
            application: application
        };
        setSelectedTrainingDetails(trainingWithApplication);
        setShowDetailsModal(true);
    };

    const handleCloseDetails = () => {
        setShowDetailsModal(false);
        setSelectedTrainingDetails(null);
    };

    const handleSubmitApplication = async (e) => {
        e.preventDefault();
        if (!selectedTraining) return;

        if (selectedTraining.is_full || selectedTraining.remaining_slots === 0) {
            showMessagePopup('Cette formation est complète, il n\'y a plus de places disponibles.', 'error');
            setShowApplicationModal(false);
            setSelectedTraining(null);
            return;
        }

        if (!selectedTraining || !selectedTraining.id) {
            showMessagePopup('Erreur: Formation invalide. Veuillez réessayer.', 'error');
            return;
        }

        if (!dossierFile) {
            showMessagePopup('Veuillez sélectionner un dossier (PDF, ZIP ou RAR)', 'error');
            return;
        }

        const maxBytes = 10 * 1024 * 1024;
        if (dossierFile.size > maxBytes) {
            showMessagePopup('Le fichier dépasse 10 Mo. Veuillez choisir un fichier plus petit.', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('formation_id', String(selectedTraining.id));
            formData.append('dossier', dossierFile);

            await axios.post('/api/candidatures', formData);
            
            clearCache('formateur_trainings');
            clearCache('formateur_applications');
            clearCache('formateur_dashboard');
            
            await fetchUserApplications();
            await fetchTrainings();
            
            setShowApplicationModal(false);
            setSelectedTraining(null);
            setAppliedFilters({});
            
            showMessagePopup('Demande de formation envoyée avec succès !', 'success');
        } catch (error) {
            console.error('Erreur lors de la soumission de la demande de formation:', error);
            let messageErreur = 'Erreur lors de l\'envoi de la demande de formation';
            const errData = error.response?.data;
            if (errData?.errors) {
                const parts = Object.values(errData.errors).flat().filter(Boolean);
                if (parts.length) {
                    messageErreur = parts.join(' ');
                }
            } else if (errData?.message) {
                messageErreur = errData.message;
            }
            
            showMessagePopup(messageErreur, 'error');
            await fetchUserApplications();
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelApplication = () => {
        setShowApplicationModal(false);
        setSelectedTraining(null);
        setDossierFile(null);
    };

    const getApplicationStatus = (trainingId) => {
        const application = userApplications.find(app => app.formation_id === trainingId);
        if (!application) return null;
        return application.statut || null;
    };

    const handleDownloadDossier = async (appId) => {
        try {
            const response = await axios.get(`/api/candidatures/${appId}/dossier/download`, {
                responseType: 'blob',
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // Get filename from Content-Disposition header
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'dossier.pdf';
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
            showMessagePopup('Erreur lors du téléchargement du dossier', 'error');
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
                            Formations
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
                {/* Composant Filtre Avancé */}
                <FiltreAvance
                    fields={[
                        {
                            name: 'title',
                            label: 'Titre',
                            type: 'text',
                            placeholder: 'Rechercher par titre...',
                            icon: '📚'
                        },
                        {
                            name: 'category',
                            label: 'Catégorie',
                            type: 'text',
                            placeholder: 'Rechercher par catégorie...',
                            icon: '🎯'
                        },
                        {
                            name: 'location',
                            label: 'Lieu',
                            type: 'text',
                            placeholder: 'Rechercher par lieu...',
                            icon: '📍'
                        },
                        {
                            name: 'start_date',
                            label: 'Date de début (après)',
                            type: 'date',
                            icon: '📅'
                        }
                    ]}
                    onFilter={(filters) => setAppliedFilters(filters)}
                    onReset={() => setAppliedFilters({})}
                />

                {/* Results Summary */}
                {!loading && !error && Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 0 && (
                    <div className="mb-6">
                        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-indigo-200 dark:border-gray-600">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Résultats</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {filteredTrainings.length} formation{filteredTrainings.length > 1 ? 's' : ''} disponible{filteredTrainings.length > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-indigo-500 text-white rounded-full text-sm font-medium">
                                        {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length} filtre{Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 1 ? 's' : ''} actif{Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 p-8">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => <CarteSquelette key={i} />)}
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-6 py-4 rounded-xl">
                            {error}
                        </div>
                    ) : filteredTrainings.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-24 h-24 bg-gradient-to-br from-[#1a365d] to-[#2d3748] rounded-2xl flex items-center justify-center text-white text-4xl mb-6 mx-auto shadow-xl">
                                📭
                            </div>
                            <h3 className="text-2xl font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-3">
                                Aucune formation trouvée
                            </h3>
                            <p className="text-lg text-[#78786c] dark:text-[#9D9D99] mb-4">
                                {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 0 
                                    ? "Aucune formation ne correspond aux critères de recherche"
                                    : "Aucune formation disponible"}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white/95 dark:bg-[#161615]/95 rounded-2xl shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 overflow-x-auto">
                            {/* List Header */}
                            <div className="min-w-[980px] sc-table-header-gradient px-6 py-4">
                                <div className="grid min-w-[980px] grid-cols-12 gap-4 text-white font-semibold">
                                    <div className="col-span-1 text-center">#</div>
                                    <div className="col-span-3 text-center">Titre</div>
                                    <div className="col-span-2 text-center">Période</div>
                                    <div className="col-span-2 text-center">Places disponibles</div>
                                    <div className="col-span-1 text-center">Détails</div>
                                    <div className="col-span-3 text-center">Actions</div>
                                </div>
                            </div>
                            
                            {/* List Items */}
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredTrainings.map((training, index) => (
                                    <div
                                        key={training.id}
                                        className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                                    >
                                        <div className="grid min-w-[980px] grid-cols-12 gap-4 items-center">
                                            <div className="col-span-1 text-center">
                                                <span className="text-sm font-medium text-[#78786c] dark:text-[#9D9D99]">
                                                    {index + 1}
                                                </span>
                                            </div>
                                            
                                            <div className="col-span-3 text-center">
                                                <h3 className="font-semibold text-[#1b1b18] dark:text-[#EDEDEC] text-sm">
                                                    {training.titre}
                                                </h3>
                                            </div>
                                            
                                            <div className="col-span-2 text-center">
                                                <p className="text-xs text-[#78786c] dark:text-[#9D9D99]">
                                                    {(() => {
                                                        const dateDeb = training.date_deb || training.date_debut;
                                                        const dateFin = training.date_fin;
                                                        if (!dateDeb || !dateFin) return 'N/A';
                                                        try {
                                                            return `${new Date(dateDeb).toLocaleDateString('fr-FR')} - ${new Date(dateFin).toLocaleDateString('fr-FR')}`;
                                                        } catch (e) {
                                                            return 'N/A';
                                                        }
                                                    })()}
                                                </p>
                                            </div>
                                            
                                            <div className="col-span-2 text-center">
                                                <span className={`text-sm font-medium ${training.is_full || training.remaining_slots === 0 ? 'text-red-600 dark:text-red-400' : 'text-[#78786c] dark:text-[#9D9D99]'}`}>
                                                    {training.is_full || training.remaining_slots === 0 ? '0' : (training.remaining_slots || training.max_participants)}
                                                </span>
                                            </div>

                                            <div className="col-span-1 text-center">
                                                <button
                                                    className="px-3 py-1 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                    onClick={() => handleViewDetails(training)}
                                                    title="Voir les détails du dossier et du statut"
                                                >
                                                    Détails
                                                </button>
                                            </div>

                                            <div className="col-span-3 text-center">
                                                <div className="flex flex-wrap gap-2 justify-center items-center">
                                                    {(() => {
                                                        const applicationStatus = getApplicationStatus(training.id);
                                                        if (applicationStatus === 'en_attente') {
                                                            return (
                                                                <span className="inline-flex px-3 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-md">
                                                                    En attente
                                                                </span>
                                                            );
                                                        } else if (applicationStatus === 'accepte') {
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    disabled
                                                                    className="inline-flex px-3 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-md transition-colors disabled:opacity-100 disabled:cursor-default whitespace-nowrap shadow-sm"
                                                                >
                                                                    Acceptée
                                                                </button>
                                                            );
                                                        } else if (applicationStatus === 'refuse') {
                                                            return (
                                                                <span className="inline-flex px-3 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-md">
                                                                    Refusée
                                                                </span>
                                                            );
                                                        } else if (training.statut === 'termine') {
                                                            return (
                                                                <span className="inline-flex px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 rounded-md">
                                                                    Terminé
                                                                </span>
                                                            );
                                                        } else if (training.is_full || training.remaining_slots === 0) {
                                                            return (
                                                                <span className="inline-flex px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 rounded-md">
                                                                    Complet
                                                                </span>
                                                            );
                                                        } else {
                                                            return (
                                                                <button
                                                                    className="inline-flex px-3 py-1 text-xs font-medium bg-[#1a365d] hover:bg-[#2d3748] text-white rounded-md transition-colors whitespace-nowrap shadow-sm"
                                                                    onClick={() => handleApply(training)}
                                                                >
                                                                    Postuler
                                                                </button>
                                                            );
                                                        }
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Application Modal */}
            {showApplicationModal && selectedTraining && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-[#161615] rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-[#1b1b18] dark:text-[#EDEDEC]">
                                    Postuler à la formation
                                </h3>
                                <button
                                    onClick={handleCancelApplication}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>

                            <div className="mb-6">
                                <div className="bg-[#f8f8f7] dark:bg-[#2a2a28] rounded-xl p-4 border border-[#e3e3e0] dark:border-[#3E3E3A]">
                                    <h4 className="font-semibold text-[#1b1b18] dark:text-[#EDEDEC] text-lg">
                                        {selectedTraining.titre || selectedTraining.title}
                                    </h4>
                                </div>
                            </div>

                            <form onSubmit={handleSubmitApplication}>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Dossier (PDF, ZIP ou RAR) *
                                    </label>
                                    <input
                                        type="file"
                                        accept=".pdf,.zip,.rar"
                                        onChange={(e) => setDossierFile(e.target.files[0])}
                                        required
                                        className="block w-full text-sm text-gray-500
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-lg file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-[#1a365d] file:text-white
                                            hover:file:bg-[#2d3748]
                                            file:cursor-pointer cursor-pointer
                                            border border-gray-300 dark:border-gray-600
                                            rounded-lg bg-gray-50 dark:bg-gray-800"
                                    />
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        Taille maximale: 10MB. Formats acceptés: PDF, ZIP, RAR
                                    </p>
                                    {dossierFile && (
                                        <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                                            ✓ Fichier sélectionné: {dossierFile.name}
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={handleCancelApplication}
                                        className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || !dossierFile}
                                        className="flex-1 px-4 py-2 bg-gradient-to-r from-[#1a365d] to-[#2d3748] text-white rounded-lg hover:from-[#2d3748] hover:to-[#1a365d] transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {submitting ? 'Envoi en cours...' : 'Envoyer la demande de formation'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedTrainingDetails && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#161615] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] p-6 text-white rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-bold">
                                        {selectedTrainingDetails.titre}
                                    </h3>
                                </div>
                                <button
                                    onClick={handleCloseDetails}
                                    className="p-2 hover:bg-white/20 rounded-xl transition-all text-white"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Formation Details Section */}
                            <div className="mb-6">
                                <h4 className="text-lg font-semibold text-[#1b1b18] dark:text-[#EDEDEC] mb-4">Informations de la Formation</h4>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</p>
                                        <p className="text-[#1b1b18] dark:text-[#EDEDEC]">
                                            {selectedTrainingDetails.description || 'Aucune description disponible'}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Lieu</p>
                                            <p className="text-[#1b1b18] dark:text-[#EDEDEC]">
                                                {selectedTrainingDetails.lieu || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Période</p>
                                            <p className="text-[#1b1b18] dark:text-[#EDEDEC]">
                                                {(() => {
                                                    const dateDeb = selectedTrainingDetails.date_deb || selectedTrainingDetails.date_debut;
                                                    const dateFin = selectedTrainingDetails.date_fin;
                                                    if (!dateDeb || !dateFin) return 'N/A';
                                                    try {
                                                        return `${new Date(dateDeb).toLocaleDateString('fr-FR')} - ${new Date(dateFin).toLocaleDateString('fr-FR')}`;
                                                    } catch (e) {
                                                        return 'N/A';
                                                    }
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Places disponibles</p>
                                        <p className="text-[#1b1b18] dark:text-[#EDEDEC]">
                                            {selectedTrainingDetails.remaining_slots || selectedTrainingDetails.part_max || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Statut de la demande de formation et section dossier */}
                            {selectedTrainingDetails.application && (
                                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                                    <h4 className="text-lg font-semibold text-[#1b1b18] dark:text-[#EDEDEC] mb-4">Votre demande de formation</h4>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Statut de la demande de formation</p>
                                        <span className={`inline-flex px-4 py-2 text-sm font-medium rounded-md ${
                                            selectedTrainingDetails.application.statut === 'accepte' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                                            selectedTrainingDetails.application.statut === 'refuse' ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                                            'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                                        }`}>
                                            {selectedTrainingDetails.application.statut === 'accepte' ? '✅ Demande de formation acceptée' :
                                             selectedTrainingDetails.application.statut === 'refuse' ? '❌ Demande de formation refusée' :
                                             '⏳ Demande de formation en attente'}
                                        </span>
                                    </div>

                                    {/* Dossier Section - Always show if application exists */}
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Détails du Dossier</p>
                                        {selectedTrainingDetails.application.dossier ? (
                                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h5 className="text-base font-semibold text-gray-800 dark:text-gray-200">Statut du Dossier</h5>
                                                    <span className={`inline-flex px-3 py-1 text-xs rounded-full font-medium ${
                                                        selectedTrainingDetails.application.dossier.statut === 'accepte' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                                                        selectedTrainingDetails.application.dossier.statut === 'refuse_definitif' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                                                        selectedTrainingDetails.application.dossier.statut === 'resubmit_requested' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                                                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}>
                                                        {selectedTrainingDetails.application.dossier.statut === 'accepte' ? '✅ Accepté' :
                                                         selectedTrainingDetails.application.dossier.statut === 'refuse_definitif' ? 'Refusé' :
                                                         selectedTrainingDetails.application.dossier.statut === 'resubmit_requested' ? '🔄 Resoumission demandée' :
                                                         '⏳ En attente'}
                                                    </span>
                                                </div>
                                                
                                                {selectedTrainingDetails.application.dossier.commentaire && (
                                                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                                        <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-1">Commentaire</p>
                                                        <p className="text-sm text-yellow-900 dark:text-yellow-200 italic">
                                                            {selectedTrainingDetails.application.dossier.commentaire}
                                                        </p>
                                                    </div>
                                                )}
                                                
                                                <button
                                                    onClick={() => handleDownloadDossier(selectedTrainingDetails.application.id)}
                                                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-sm rounded-lg transition-all font-medium shadow-sm"
                                                >
                                                    📄 Télécharger le dossier
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Aucun dossier soumis pour cette demande de formation</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Actions Section - Only show if no application exists */}
                            {!selectedTrainingDetails.application && (
                                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    {(() => {
                                        if (selectedTrainingDetails.statut === 'termine') {
                                            return (
                                                <div className="text-center">
                                                    <span className="inline-flex px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 rounded-md">
                                                        Formation terminée
                                                    </span>
                                                </div>
                                            );
                                        } else if (selectedTrainingDetails.is_full || selectedTrainingDetails.remaining_slots === 0) {
                                            return (
                                                <div className="text-center">
                                                    <span className="inline-flex px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 rounded-md">
                                                        Formation complète
                                                    </span>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <button
                                                    className="w-full px-4 py-2 bg-gradient-to-r from-[#1a365d] to-[#2d3748] text-white rounded-lg hover:from-[#2d3748] hover:to-[#1a365d] transition-all font-medium"
                                                    onClick={() => {
                                                        handleCloseDetails();
                                                        handleApply(selectedTrainingDetails);
                                                    }}
                                                >
                                                    Postuler à cette formation
                                                </button>
                                            );
                                        }
                                    })()}
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

