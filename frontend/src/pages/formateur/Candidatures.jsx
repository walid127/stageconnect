import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCache } from '../../context/CacheContext';
import NavigationFormateur from '../../components/FormateurNav';
import TableSquelette from '../../components/SkeletonTable';
import FiltreAvance from '../../components/AdvancedFilter';
import axios from 'axios';

export default function CandidaturesFormateur() {
    const { clearCache } = useCache();
    const [searchParams, setSearchParams] = useSearchParams();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showResubmitModal, setShowResubmitModal] = useState(false);
    const [resubmittingAppId, setResubmittingAppId] = useState(null);
    const [resubmitDossierFile, setResubmitDossierFile] = useState(null);
    const [showActionsModal, setShowActionsModal] = useState(false);
    const [selectedActionApp, setSelectedActionApp] = useState(null);
    
    // Advanced filter state - Initialize from URL params
    // Only auto-apply filter if status=refuse (from notification)
    const [appliedFilters, setAppliedFilters] = useState(() => {
        const status = searchParams.get('status');
        // Only auto-apply if status is 'refuse' (from notification)
        if (status === 'refuse') {
            return { status };
        }
        return {};
    });
    
    // Filtrer les demandes de formation en fonction des filtres appliqués
    const filteredApplications = applications.filter(app => {
        if (appliedFilters.training_title) {
            const title = app.formation?.titre || '';
            if (!title.toLowerCase().includes(appliedFilters.training_title.toLowerCase())) {
                return false;
            }
        }
        
        if (appliedFilters.status && appliedFilters.status !== '') {
            if (app.statut !== appliedFilters.status) {
                return false;
            }
        }
        
        return true;
    });

    const handleDownloadSchedule = async (appId) => {
        try {
            const response = await axios.get(`/api/candidatures/${appId}/schedule/download`, {
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
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    // Update filters when URL params change
    // Only auto-apply filter if status=refuse (from notification)
    useEffect(() => {
        const status = searchParams.get('status');
        if (status === 'refuse') {
            // Auto-apply filter only for 'refuse' status (from notification)
            const newFilters = { status };
            setAppliedFilters(newFilters);
        } else {
            // For other statuses or no status, clear applied filters
            // User must manually apply filters by clicking "Appliquer les filtres"
            setAppliedFilters({});
        }
    }, [searchParams]);

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

    const fetchApplications = async () => {
        try {
            clearCache('formateur_applications');
            
            const response = await axios.get('/api/candidatures');
            const rawApps = response.data.data || response.data.data?.data || [];
            
            // Normaliser les données pour s'assurer que fichier_emploi_temps et dossier sont présents
            const apps = rawApps.map(app => ({
                ...app,
                fichier_emploi_temps: app.fichier_emploi_temps !== null && app.fichier_emploi_temps !== undefined 
                    ? app.fichier_emploi_temps 
                    : (app.emploi_du_temps ? true : null),
                dossier: app.dossier || null
            }));
            
            setApplications(apps);
        } catch (err) {
            console.error('Erreur lors de la récupération des demandes de formation:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'accepte': return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400';
            case 'refuse': return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400';
            case 'en_attente_validation': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400';
            default: return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'accepte': return 'Acceptée';
            case 'refuse': return 'Refusée';
            case 'en_attente_validation': return 'En attente de validation';
            default: return 'En attente';
        }
    };

    const handleResubmitDossier = (appId) => {
        setResubmittingAppId(appId);
        setShowResubmitModal(true);
        setResubmitDossierFile(null);
    };

    const handleSubmitResubmit = async () => {
        if (!resubmitDossierFile) {
            showMessagePopup('Veuillez sélectionner un fichier', 'error');
            return;
        }

        if (!resubmittingAppId) {
            showMessagePopup('Erreur: ID de demande de formation manquant', 'error');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('dossier', resubmitDossierFile);

            await axios.post(`/api/candidatures/${resubmittingAppId}/dossier/resubmit`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            showMessagePopup('Dossier resoumis avec succès!', 'success');
            setShowResubmitModal(false);
            setResubmittingAppId(null);
            setResubmitDossierFile(null);
            await fetchApplications();
        } catch (err) {
            console.error('Erreur lors de la resoumission:', err);
            const errorMessage = err.response?.data?.message || 'Erreur lors de la resoumission du dossier';
            showMessagePopup(errorMessage, 'error');
        }
    };

    const handleDownloadDossier = async (appId) => {
        try {
            const response = await axios.get(`/api/candidatures/${appId}/dossier/download`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
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

    const handleCancelApplication = async (appId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir annuler cette demande de formation ? Cette action est irréversible.')) {
            return;
        }

        try {
            await axios.delete(`/api/candidatures/${appId}`);
            showMessagePopup('Demande de formation annulée avec succès!', 'success');
            await fetchApplications();
        } catch (err) {
            console.error('Erreur lors de l\'annulation:', err);
            const errorMessage = err.response?.data?.message || 'Erreur lors de l\'annulation de la demande de formation';
            showMessagePopup(errorMessage, 'error');
        }
    };

    return (
        <>
        <div className="app-container">
            <NavigationFormateur />

            {/* Epic Hero Section */}
            <div className="hero-section">
                <div className="hero-overlay"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNkNGFmMzciIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
                
                <div className="hero-content">
                    <div className="text-center">
                        <h1 className="hero-title">
                            Mes demandes de formation
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
                            name: 'training_title',
                            label: 'Titre de la Formation',
                            type: 'text',
                            placeholder: 'Rechercher par titre...',
                            icon: '📚'
                        },
                        {
                            name: 'status',
                            label: 'Statut',
                            type: 'select',
                            icon: '📊',
                            options: [
                                { value: 'en_attente', label: '⏳ En attente' },
                                { value: 'accepte', label: '✅ Acceptée' },
                                { value: 'refuse', label: '❌ Refusée' },
                                { value: 'on_hold', label: '⏸️ En attente' }
                            ]
                        }
                    ]}
                    appliedFilters={appliedFilters}
                    onFilter={(filters) => {
                        setAppliedFilters(filters);
                        // Update URL params
                        const newParams = new URLSearchParams();
                        if (filters.status) {
                            newParams.set('status', filters.status);
                        }
                        setSearchParams(newParams);
                    }}
                    onReset={() => {
                        setAppliedFilters({});
                        // Clear URL params
                        setSearchParams({});
                    }}
                />

                {/* Results Summary */}
                {!loading && Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 0 && (
                    <div className="mb-6">
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-indigo-200 dark:border-gray-600">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Résultats</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {filteredApplications.length} demande{filteredApplications.length > 1 ? 's' : ''} de formation
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
                        <TableSquelette rows={8} />
                    ) : filteredApplications.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-24 h-24 bg-gradient-to-br from-[#1a365d] to-[#2d3748] rounded-2xl flex items-center justify-center text-white text-4xl mb-6 mx-auto shadow-xl">
                                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-3">
                                Aucune demande de formation trouvée
                            </h3>
                            <p className="text-lg text-[#78786c] dark:text-[#9D9D99] mb-6">
                                {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 0 
                                    ? "Aucune demande de formation ne correspond aux critères de recherche"
                                    : "Vous n'avez pas encore de demandes de formation"}
                            </p>
                            <Link
                                to="/formateur/stages"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
                            >
                                Parcourir les formations
                            </Link>
                        </div>
                    ) : (
                        <div className="bg-white/80 dark:bg-[#161615]/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 overflow-x-auto">
                            {/* List Header */}
                            <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] px-6 py-4">
                                <div className="grid min-w-[1100px] grid-cols-12 gap-4 text-white font-semibold items-center">
                                    <div className="col-span-1 flex items-center justify-center">#</div>
                                    <div className="col-span-3 flex items-center justify-center">Formation</div>
                                    <div className="col-span-1 flex items-center justify-center">Date</div>
                                    <div className="col-span-1 flex items-center justify-center">Lieu</div>
                                    <div className="col-span-1 flex items-center justify-center">Statut</div>
                                    <div className="col-span-1 flex items-center justify-center">Période</div>
                                    <div className="col-span-1 flex items-center justify-center">Emploi du temps</div>
                                    <div className="col-span-2 flex items-center justify-center">Détails</div>
                                    <div className="col-span-1 flex items-center justify-center">Actions</div>
                                </div>
                            </div>
                            
                            {/* List Items */}
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredApplications.map((app, index) => (
                                    <div
                                        key={app.id}
                                        className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                                    >
                                        <div className="grid min-w-[1100px] grid-cols-12 gap-4 items-center">
                                            {/* Index */}
                                            <div className="col-span-1 flex items-center justify-center">
                                                <span className="text-sm font-medium text-[#78786c] dark:text-[#9D9D99]">
                                                    {index + 1}
                                                </span>
                                            </div>
                                            
                                            {/* Training Title */}
                                            <div className="col-span-3 flex items-center justify-center text-center">
                                                <h3 className="font-semibold text-[#1b1b18] dark:text-[#EDEDEC] text-sm">
                                                    {app.formation?.titre || 'Formation'}
                                                </h3>
                                            </div>
                                            
                                            {/* Application Date */}
                                            <div className="col-span-1 flex items-center justify-center">
                                                <p className="text-sm text-[#78786c] dark:text-[#9D9D99]">
                                                    {(app.date_demande ?? app.date_cand) ? 
                                                        (() => {
                                                            try {
                                                                const dateVal = app.date_demande ?? app.date_cand;
                                                                const date = new Date(dateVal);
                                                                return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                                                            } catch (e) {
                                                                return 'N/A';
                                                            }
                                                        })() 
                                                        : 'N/A'
                                                    }
                                                </p>
                                            </div>
                                            
                                            {/* Location */}
                                            <div className="col-span-1 flex items-center justify-center">
                                                <p className="text-sm text-[#78786c] dark:text-[#9D9D99] truncate text-center" title={app.formation?.lieu || 'N/A'}>
                                                    {app.formation?.lieu || 'N/A'}
                                                </p>
                                            </div>
                                            
                                            {/* Status */}
                                            <div className="col-span-1 flex items-center justify-center">
                                                <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(app.statut)}`}>
                                                    {getStatusText(app.statut)}
                                                </span>
                                            </div>
                                            
                                            {/* Period */}
                                            <div className="col-span-1 flex items-center justify-center">
                                                <p className="text-xs text-[#78786c] dark:text-[#9D9D99] text-center">
                                                    {app.formation ? 
                                                        (() => {
                                                            try {
                                                                const dateDeb = app.formation.date_deb || app.formation.date_debut;
                                                                const dateFin = app.formation.date_fin;
                                                                if (!dateDeb || !dateFin) return 'N/A';
                                                                const deb = new Date(dateDeb);
                                                                const fin = new Date(dateFin);
                                                                if (isNaN(deb.getTime()) || isNaN(fin.getTime())) return 'N/A';
                                                                return `${deb.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${fin.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`;
                                                            } catch (e) {
                                                                return 'N/A';
                                                            }
                                                        })() 
                                                        : 'N/A'
                                                    }
                                                </p>
                                            </div>

                                            {/* Schedule Download */}
                                            <div className="col-span-1 flex items-center justify-center">
                                                {app.fichier_emploi_temps ? (
                                                    <button
                                                        onClick={() => handleDownloadSchedule(app.id)}
                                                        className="inline-flex items-center justify-center px-3 py-1 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white text-xs rounded transition-all font-medium shadow-sm"
                                                        title="Télécharger l'emploi du temps"
                                                    >
                                                        Télécharger
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                                )}
                                            </div>
                                            
                                            {/* Détails */}
                                            <div className="col-span-2 flex items-center justify-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedActionApp(app);
                                                        setShowActionsModal(true);
                                                    }}
                                                    className="px-3 py-1 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                    title="Voir les détails du dossier et du statut"
                                                >
                                                    Détails
                                                </button>
                                            </div>
                                            
                                            {/* Actions */}
                                            <div className="col-span-1 flex flex-wrap gap-1 justify-center items-center">
                                                {app.dossier && app.dossier.statut === 'resubmit_requested' && (
                                                    <button
                                                        onClick={() => handleResubmitDossier(app.id)}
                                                        className="px-3 py-1 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white text-xs rounded transition-all font-medium shadow-sm"
                                                        title="Resoumettre le dossier"
                                                    >
                                                        Resoumettre
                                                    </button>
                                                )}
                                                {/* Annuler seulement si le dossier n'a pas été validé (accepté ou refusé) */}
                                                {app.statut !== 'accepte' && 
                                                 (!app.dossier || 
                                                  app.dossier.statut === 'en_attente' || 
                                                  app.dossier.statut === 'resubmit_requested') && (
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm('Êtes-vous sûr de vouloir annuler cette demande de formation ?')) {
                                                                handleCancelApplication(app.id);
                                                            }
                                                        }}
                                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                    >
                                                        Annuler
                                                    </button>
                                                )}
                                                {((app.statut === 'accepte') || 
                                                  (app.dossier && (app.dossier.statut === 'accepte' || app.dossier.statut === 'refuse_definitif'))) && (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Resubmit Dossier Modal */}
            {showResubmitModal && resubmittingAppId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#161615] rounded-2xl shadow-2xl border border-white/20 dark:border-[#3E3E3A]/50 w-full max-w-md">
                        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 text-white rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold">Resoumettre le Dossier</h3>
                                        <p className="text-sm mt-1 text-white/90">Téléchargez un nouveau dossier avec les corrections</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowResubmitModal(false);
                                        setResubmittingAppId(null);
                                        setResubmitDossierFile(null);
                                    }}
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Nouveau Dossier (PDF, ZIP ou RAR) *
                                </label>
                                <input
                                    type="file"
                                    accept=".pdf,.zip,.rar"
                                    onChange={(e) => setResubmitDossierFile(e.target.files[0])}
                                    required
                                    className="block w-full text-sm text-gray-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-lg file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-yellow-500 file:text-white
                                        hover:file:bg-orange-500
                                        file:cursor-pointer cursor-pointer
                                        border border-gray-300 dark:border-gray-600
                                        rounded-lg bg-gray-50 dark:bg-gray-800"
                                />
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Taille maximale: 10MB. Formats acceptés: PDF, ZIP, RAR
                                </p>
                                {resubmitDossierFile && (
                                    <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                                        ✓ Fichier sélectionné: {resubmitDossierFile.name}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl flex gap-3">
                            <button
                                onClick={() => {
                                    setShowResubmitModal(false);
                                    setResubmittingAppId(null);
                                    setResubmitDossierFile(null);
                                }}
                                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSubmitResubmit}
                                disabled={!resubmitDossierFile}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Resoumettre
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Détails Modal */}
            {showActionsModal && selectedActionApp && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#161615] rounded-2xl shadow-2xl border border-white/20 dark:border-[#3E3E3A]/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] p-6 text-white rounded-t-2xl sticky top-0 z-10">
                            <h3 className="text-2xl font-bold">Détails de la Demande de formation</h3>
                            <p className="text-sm mt-1 text-white/90">{selectedActionApp.formation?.titre || 'N/A'}</p>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {/* Informations Générales */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Informations Générales</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date de demande de formation</p>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {(selectedActionApp.date_demande ?? selectedActionApp.date_cand) ? 
                                                (() => {
                                                    try {
                                                        const dateVal = selectedActionApp.date_demande ?? selectedActionApp.date_cand;
                                                        const date = new Date(dateVal);
                                                        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                                    } catch (e) {
                                                        return 'N/A';
                                                    }
                                                })() 
                                                : 'N/A'
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Statut</p>
                                        <span className={`inline-flex px-3 py-1 text-xs rounded-full font-medium ${getStatusColor(selectedActionApp.statut)}`}>
                                            {getStatusText(selectedActionApp.statut)}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Lieu</p>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {selectedActionApp.formation?.lieu || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Période</p>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {selectedActionApp.formation ? 
                                                (() => {
                                                    try {
                                                        const dateDeb = selectedActionApp.formation.date_deb || selectedActionApp.formation.date_debut;
                                                        const dateFin = selectedActionApp.formation.date_fin;
                                                        if (!dateDeb || !dateFin) return 'N/A';
                                                        const deb = new Date(dateDeb);
                                                        const fin = new Date(dateFin);
                                                        if (isNaN(deb.getTime()) || isNaN(fin.getTime())) return 'N/A';
                                                        return `${deb.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${fin.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
                                                    } catch (e) {
                                                        return 'N/A';
                                                    }
                                                })() 
                                                : 'N/A'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Emploi du Temps */}
                            {selectedActionApp.fichier_emploi_temps && (
                                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Emploi du Temps</h4>
                                    <button
                                        onClick={() => handleDownloadSchedule(selectedActionApp.id)}
                                        className="w-full px-4 py-2 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white text-sm rounded-lg transition-all font-medium shadow-sm"
                                    >
                                        Télécharger l'emploi du temps
                                    </button>
                                </div>
                            )}

                            {/* Dossier Section */}
                            {selectedActionApp.dossier ? (
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Dossier</h4>
                                        <span className={`inline-flex px-3 py-1 text-xs rounded-full font-medium ${
                                            selectedActionApp.dossier.statut === 'accepte' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                                            selectedActionApp.dossier.statut === 'refuse_definitif' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                                            selectedActionApp.dossier.statut === 'resubmit_requested' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                        }`}>
                                            {selectedActionApp.dossier.statut === 'accepte' ? '✅ Accepté' :
                                             selectedActionApp.dossier.statut === 'refuse_definitif' ? 'Refusé' :
                                             selectedActionApp.dossier.statut === 'resubmit_requested' ? '🔄 Resoumission demandée' :
                                             '⏳ En attente'}
                                        </span>
                                    </div>
                                    
                                    {selectedActionApp.dossier.commentaire && (
                                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                            <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-1">Commentaire</p>
                                            <p className="text-sm text-yellow-900 dark:text-yellow-200 italic">
                                                {selectedActionApp.dossier.commentaire}
                                            </p>
                                        </div>
                                    )}
                                    
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleDownloadDossier(selectedActionApp.id)}
                                            className="flex-1 px-4 py-2 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white text-sm rounded-lg transition-all font-medium shadow-sm"
                                        >
                                            Télécharger le dossier
                                        </button>
                                        {selectedActionApp.dossier.statut === 'resubmit_requested' && (
                                            <button
                                                onClick={() => {
                                                    setShowActionsModal(false);
                                                    handleResubmitDossier(selectedActionApp.id);
                                                }}
                                                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white text-sm rounded-lg transition-all font-medium shadow-sm"
                                            >
                                                Resoumettre le dossier
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Aucun dossier soumis</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                                {/* Annuler seulement si le dossier n'a pas été validé (accepté ou refusé) */}
                                {selectedActionApp.statut !== 'accepte' && 
                                 (!selectedActionApp.dossier || 
                                  selectedActionApp.dossier.statut === 'en_attente' || 
                                  selectedActionApp.dossier.statut === 'resubmit_requested') && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Êtes-vous sûr de vouloir annuler cette demande de formation ?')) {
                                                setShowActionsModal(false);
                                                handleCancelApplication(selectedActionApp.id);
                                            }
                                        }}
                                        className="w-full px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                    >
                                        Annuler la demande de formation
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl sticky bottom-0">
                            <button
                                onClick={() => {
                                    setShowActionsModal(false);
                                    setSelectedActionApp(null);
                                }}
                                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
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
        </>
    );
}

