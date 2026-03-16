import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCache } from '../../context/CacheContext';
import NavigationGestionaire from '../../components/GestionaireNav';
import TableSquelette from '../../components/SkeletonTable';
import FiltreAvance from '../../components/AdvancedFilter';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import axios from 'axios';

export default function CandidaturesGestionaire() {
    const { getCachedData, setCachedData, clearCache } = useCache();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [editingScheduleAppId, setEditingScheduleAppId] = useState(null);
    const [verifyingAppId, setVerifyingAppId] = useState(null);
    const [dossierComment, setDossierComment] = useState('');
    const [showAcceptWithEDTModal, setShowAcceptWithEDTModal] = useState(false);
    const [showAcceptModal, setShowAcceptModal] = useState(false);
    const [scheduleFile, setScheduleFile] = useState(null);
    const [acceptingAppId, setAcceptingAppId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [candidatureToDelete, setCandidatureToDelete] = useState(null);
    
    // Advanced filter state
    const [appliedFilters, setAppliedFilters] = useState({});

    const handleDeleteApplication = async () => {
        if (!candidatureToDelete) return;

        try {
            await axios.delete(`/api/candidatures/${candidatureToDelete}`);
            showMessagePopup('Demande retirée de la liste avec succès. Le formateur conserve le statut (acceptée/refusée).', 'success');
            setShowDeleteConfirm(false);
            setCandidatureToDelete(null);
            await fetchApplications(true, true);
        } catch (err) {
            console.error('Erreur lors de la suppression:', err);
            const errorMessage = err.response?.data?.message || 'Erreur lors de la suppression de la demande de formation';
            showMessagePopup(errorMessage, 'error');
        }
    };

    const openDeleteConfirm = (appId) => {
        setCandidatureToDelete(appId);
        setShowDeleteConfirm(true);
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

    const handleViewDossier = (appId) => {
        handleDownloadDossier(appId);
    };

    // Check if dossier is accepted (using statut column)
    const isDossierAccepted = (dossier) => {
        if (!dossier) return false;
        return dossier.statut === 'accepte';
    };

    // Check if dossier is pending (not verified yet)
    const isDossierPending = (dossier) => {
        if (!dossier) return false;
        return dossier.statut === 'en_attente';
    };

    // Check if dossier needs resubmission
    const isDossierResubmitRequested = (dossier) => {
        if (!dossier) return false;
        return dossier.statut === 'resubmit_requested';
    };

    const handleVerifyDossier = (appId) => {
        const app = applications.find(a => a.id === appId);
        if (!app || !app.dossier) {
            showMessagePopup('Cette demande de formation n\'a pas de dossier.', 'error');
            return;
        }
        // Si le dossier est déjà traité, informer simplement
        if (!isDossierPending(app.dossier)) {
            showMessagePopup('Ce dossier a déjà été vérifié.', 'error');
            return;
        }
        setVerifyingAppId(appId);
        setShowAcceptWithEDTModal(true);
        setDossierComment('');
    };

    const handleVerifyDossierAction = async (action) => {
        if (!verifyingAppId) return;

        try {
            const formData = {
                dossier_action: action,
            };
            if (action === 'reject_resubmit' || action === 'reject_definitif') {
                if (!dossierComment.trim()) {
                    showMessagePopup('Veuillez entrer un commentaire.', 'error');
                    return;
                }
                formData.commentaire = dossierComment;
            }

            await axios.put(`/api/candidatures/${verifyingAppId}/status`, formData);

            showMessagePopup(
                action === 'accept' ? 'Dossier accepté avec succès!' :
                action === 'reject_resubmit' ? 'Demande de resoumission envoyée!' :
                'Demande de formation refusée!',
                'success'
            );
            setVerifyingAppId(null);
            setVerifyingAppId(null);
            setDossierComment('');
            await fetchApplications(true, true);
        } catch (err) {
            console.error('Erreur lors de la vérification:', err);
            showMessagePopup('Erreur lors de la vérification du dossier', 'error');
        }
    };

    const handleAcceptCandidat = async (appId) => {
        try {
            await axios.post(`/api/candidatures/${appId}/accept-candidat`);

            showMessagePopup('Candidat accepté avec succès!', 'success');
            await fetchApplications(true, true);
        } catch (err) {
            console.error('Erreur lors de l\'acceptation:', err);
            const errorMessage = err.response?.data?.message || 'Erreur lors de l\'acceptation du candidat';
            showMessagePopup(errorMessage, 'error');
        }
    };

    // Téléchargement de l'emploi du temps (lecture seule)
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
            const apiMsg = err.response?.data?.message;
            showMessagePopup(apiMsg || 'Erreur lors du téléchargement du fichier', 'error');
        }
    };

    const handleRefuseDirect = async (appId) => {
        const app = applications.find(a => a.id === appId);
        if (!app || !app.dossier) {
            showMessagePopup('Cette demande de formation n\'a pas de dossier.', 'error');
            return;
        }

        try {
            const formData = {
                dossier_action: 'reject_definitif',
                commentaire: '',
            };

            await axios.put(`/api/candidatures/${appId}/status`, formData);

            showMessagePopup('Demande de formation refusée avec succès!', 'success');
            await fetchApplications(true, true);
        } catch (err) {
            console.error('Erreur lors du refus:', err);
            const errorMessage = err.response?.data?.message || 'Erreur lors du refus de la demande de formation';
            showMessagePopup(errorMessage, 'error');
        }
    };





    // Static counts that don't change when switching filters
    const [staticCounts, setStaticCounts] = useState({
        total: 0,
        pending: 0,
        accepted: 0,
        rejected: 0
    });

    // Calculate filtered applications
    const filteredApplications = applications.filter(app => {
        if (appliedFilters.training_title && !app.formation?.titre?.toLowerCase().includes(appliedFilters.training_title.toLowerCase())) {
            return false;
        }
        
        if (appliedFilters.formateur_nom && !app.formateur?.nom?.toLowerCase().includes(appliedFilters.formateur_nom.toLowerCase())) {
            return false;
        }
        
        if (appliedFilters.formateur_email && !app.formateur?.email?.toLowerCase().includes(appliedFilters.formateur_email.toLowerCase())) {
            return false;
        }
        
        if (appliedFilters.status && appliedFilters.status !== '' && app.statut !== appliedFilters.status) {
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
        fetchApplications();
    }, []);

    const fetchApplications = async (skipCache = false, silent = false) => {
        try {
            if (!silent) {
                setLoading(true);
            }
            
            // Vérifier le cache d'abord (sauf si skipCache est true)
            if (!skipCache) {
                const cached = getCachedData('admin_applications');
                if (cached) {
                    setApplications(cached.apps);
                    setStaticCounts(cached.counts);
                    if (!silent) {
                        setLoading(false);
                    }
                    return;
                }
            }
            
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
            
            // Mettre à jour les compteurs statiques
            const counts = {
                total: apps.length,
                pending: apps.filter(app => app.statut === 'en_attente').length,
                accepted: apps.filter(app => app.statut === 'accepte').length,
                rejected: apps.filter(app => app.statut === 'refuse').length
            };
            setStaticCounts(counts);
            
            // Mettre en cache les données
            setCachedData('admin_applications', { apps, counts });
        } catch (err) {
            console.error('Erreur lors de la récupération des demandes de formation:', err);
        } finally{
            if (!silent) {
                setLoading(false);
            }
        }
    };

    const handleOpenAcceptModal = async (appId) => {
        const app = applications.find(a => a.id === appId);
        if (!app) {
            showMessagePopup('Demande de formation introuvable.', 'error');
            return;
        }
        
        // Si la demande est refusée, changer le statut directement vers accepte (sans passer par acceptCandidat)
        if (app.statut === 'refuse') {
            try {
                await axios.put(`/api/candidatures/${appId}/status`, { status: 'accepte' });
                showMessagePopup('Demande de formation acceptée avec succès!', 'success');
                await fetchApplications(true, true);
                return;
            } catch (err) {
                console.error('Erreur lors de l\'acceptation:', err);
                const msg = err?.response?.data?.message || err?.response?.data?.error;
                showMessagePopup(msg || 'Erreur lors de l\'acceptation de la demande de formation', 'error');
                return;
            }
        }
        
        // Demande en attente : appeler l'API d'acceptation du candidat (dossier doit être accepté)
        await handleAcceptCandidat(appId);
    };

    // handleAcceptWithSchedule is plus utilisé maintenant (emploi du temps géré au niveau des formations)

    const handleStatusChange = async (appId, newStatus) => {
        try {
            // Mettre à jour immédiatement l'état local AVANT l'appel API
            setApplications(prev => prev.map(app => 
                app.id === appId 
                    ? { ...app, statut: newStatus }
                    : app
            ));
            
            // Mettre à jour les compteurs statiques
            setStaticCounts(prev => {
                const newCounts = { ...prev };
                const app = applications.find(a => a.id === appId);
                if (app) {
                    // Décrémenter l'ancien statut
                    if (app.statut === 'en_attente') newCounts.pending = Math.max(0, newCounts.pending - 1);
                    if (app.statut === 'accepte') newCounts.accepted = Math.max(0, newCounts.accepted - 1);
                    if (app.statut === 'refuse') newCounts.rejected = Math.max(0, newCounts.rejected - 1);
                    
                    // Incrémenter le nouveau statut
                    if (newStatus === 'en_attente') newCounts.pending += 1;
                    if (newStatus === 'accepte') newCounts.accepted += 1;
                    if (newStatus === 'refuse') newCounts.rejected += 1;
                }
                return newCounts;
            });
            
            // Réinitialiser les filtres pour voir la demande de formation mise à jour
            setAppliedFilters({});
            
            // Ensuite, faire l'appel API
            await axios.put(`/api/candidatures/${appId}/status`, { status: newStatus });
            
            clearCache('admin_applications');
            clearCache('gestionaire_dashboard_stats');
            showMessagePopup('Statut mis à jour avec succès!', 'success');

            // Actualiser les formations du formateur si la fonction est disponible
            if (window.refreshFormateurTrainings) {
                window.refreshFormateurTrainings();
            }
            
            // Rafraîchir silencieusement en arrière-plan
            setTimeout(() => {
                fetchApplications(true, true);
            }, 500);
        } catch (err) {
            // En cas d'erreur, restaurer l'état précédent
            fetchApplications(true, true);
            showMessagePopup('Erreur lors de la mise à jour du statut', 'error');
            console.error(err);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'accepte': return 'bg-[#6FCF97]/20 text-[#6FCF97]';
            case 'refuse': return 'bg-[#EB5757]/20 text-[#EB5757]';
            case 'en_attente_validation': return 'bg-[#F2C94C]/20 text-[#F2C94C]';
            default: return 'bg-[#2F80ED]/20 text-[#2F80ED]';
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

    const handleViewDetails = (application) => {
        setSelectedApplication(application);
        setShowDetailsModal(true);
    };

    const closeDetailsModal = () => {
        setShowDetailsModal(false);
        setSelectedApplication(null);
    };

    return (
        <div className="app-container">
            <NavigationGestionaire />

            {/* Compact Hero Section */}
            <div className="hero-section">
                <div className="hero-overlay"></div>
                
                <div className="hero-content">
                    <div className="text-center">
                        <h1 className="hero-title">
                            Gestion des demandes de formation
                        </h1>

                        <div className="mb-4">
                            <Link 
                                to="/gestionaire/stages" 
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

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-4 relative z-20">
                {/* Composant Filtre Avancé */}
                <FiltreAvance
                    fields={[
                        {
                            name: 'training_title',
                            label: 'Titre de la Formation',
                            type: 'text',
                            placeholder: 'Rechercher par titre de la formation...',
                            icon: '📚'
                        },
                        {
                            name: 'formateur_nom',
                            label: 'Nom du Formateur',
                            type: 'text',
                            placeholder: 'Rechercher par nom...',
                            icon: '👤'
                        },
                        {
                            name: 'formateur_email',
                            label: 'Email du Formateur',
                            type: 'text',
                            placeholder: 'Rechercher par email...',
                            icon: '📧'
                        },
                        {
                            name: 'status',
                            label: 'Statut',
                            type: 'select',
                            icon: '📊',
                            options: [
                                { value: 'en_attente', label: '⏳ En attente' },
                                { value: 'accepte', label: '✅ Acceptée' },
                                { value: 'refuse', label: '❌ Refusée' }
                            ]
                        }
                    ]}
                    onFilter={(filters) => setAppliedFilters(filters)}
                    onReset={() => setAppliedFilters({})}
                    appliedFilters={appliedFilters}
                />

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {/* Total Card */}
                    <div className="group relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                        <div className="relative bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-cyan-100 dark:border-cyan-900/50 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-xl">📊</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-2xl font-black bg-gradient-to-r from-cyan-600 to-cyan-700 bg-clip-text text-transparent">
                                        {staticCounts.total}
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 font-medium text-xs truncate">Total</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pending Card */}
                    <div className="group relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                        <div className="relative bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-orange-100 dark:border-orange-900/50 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-xl">⏳</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-2xl font-black bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent">
                                        {staticCounts.pending}
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 font-medium text-xs truncate">En attente</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Accepted Card */}
                    <div className="group relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-green-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                        <div className="relative bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-green-100 dark:border-green-900/50 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-xl">✅</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-2xl font-black bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                                        {staticCounts.accepted}
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 font-medium text-xs truncate">Acceptées</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Rejected Card */}
                    <div className="group relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-red-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                        <div className="relative bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-red-100 dark:border-red-900/50 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-xl">❌</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-2xl font-black bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                                        {staticCounts.rejected}
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 font-medium text-xs truncate">Refusées</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Résumé des Résultats - Afficher uniquement lorsque les filtres sont appliqués */}
                {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 0 && (
                    <div className="mb-6">
                        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-cyan-200 dark:border-gray-600">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Résultats</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {filteredApplications.length} demande{filteredApplications.length > 1 ? 's' : ''} de formation trouvée{filteredApplications.length > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-cyan-500 text-white rounded-full text-sm font-medium">
                                        {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length} filtre{Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 1 ? 's' : ''} actif{Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                    {loading ? (
                        <TableSquelette rows={8} />
                    ) : filteredApplications.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-semibold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">Aucune demande de formation trouvée</h3>
                        <p className="text-lg text-[#78786c] dark:text-[#9D9D99]">
                            {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 0 
                                ? "Aucune demande de formation ne correspond aux critères de recherche"
                                : "Aucune demande de formation reçue pour le moment"}
                        </p>
                        </div>
                    ) : (
                    <div className="bg-white/80 dark:bg-[#161615]/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 overflow-hidden">
                        {/* List Header */}
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] px-6 py-4">
                            <div className="grid grid-cols-12 gap-4 text-white font-semibold">
                                <div className="col-span-1 text-center">#</div>
                                <div className="col-span-2 text-center">Formation</div>
                                <div className="col-span-2 text-center">Formateur</div>
                                <div className="col-span-1 text-center">Statut</div>
                                <div className="col-span-1 text-center">Détails</div>
                                <div className="col-span-1 text-center">Dossier</div>
                                <div className="col-span-1 text-center">Emploi du temps</div>
                                <div className="col-span-2 text-center">Actions</div>
                            </div>
                        </div>
                        
                        {/* List Items */}
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredApplications.map((app, index) => (
                                <div
                                    key={app.id}
                                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                                >
                                    <div className="grid grid-cols-12 gap-4 items-center">
                                        {/* Index */}
                                        <div className="col-span-1 text-center">
                                            <span className="text-sm font-medium text-[#78786c] dark:text-[#9D9D99]">
                                                {index + 1}
                                            </span>
                                        </div>
                                        
                                        {/* Training Title */}
                                        <div className="col-span-2 text-center">
                                            <h3 className="font-semibold text-[#1b1b18] dark:text-[#EDEDEC] text-sm">
                                                {app.formation?.titre || 'Formation'}
                                            </h3>
                                        </div>
                                        
                                        {/* Formateur Name */}
                                        <div className="col-span-2 text-center">
                                            <p className="text-sm text-[#78786c] dark:text-[#9D9D99]">
                                                {app.formateur?.nom || 'N/A'}
                                            </p>
                                        </div>
                                        
                                        {/* Status */}
                                        <div className="col-span-1 text-center">
                                            <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(app.statut)}`}>
                                                {getStatusText(app.statut)}
                                            </span>
                                        </div>
                                        
                                        {/* Détails */}
                                        <div className="col-span-1 text-center">
                                            <button
                                                onClick={() => handleViewDetails(app)}
                                                className="px-3 py-1 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                            >
                                                Détails
                                            </button>
                                        </div>
                                        
                                        {/* Dossier */}
                                        <div className="col-span-1 text-center">
                                            {app.dossier ? (
                                                <button
                                                    onClick={() => handleViewDossier(app.id)}
                                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                    title="Voir les détails du dossier"
                                                >
                                                    Voir
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                            )}
                                        </div>

                                        {/* Emploi du temps (affichage / téléchargement seulement) */}
                                        <div className="col-span-1 text-center">
                                            {app.fichier_emploi_temps ? (
                                                <button
                                                    onClick={() => handleDownloadSchedule(app.id)}
                                                    className="px-3 py-1 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                    title="Télécharger l'emploi du temps"
                                                >
                                                    Télécharger
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                            )}
                                        </div>
                                        
                                        {/* Actions */}
                                        <div className="col-span-2 text-center flex flex-wrap gap-2 justify-center items-center">
                                            {/* If dossier is pending, show verify dossier button */}
                                            {app.statut === 'en_attente' && app.dossier && isDossierPending(app.dossier) && (
                                            <button
                                                onClick={() => handleVerifyDossier(app.id)}
                                                className="px-3 py-1 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                            >
                                                Valider dossier
                                            </button>
                                            )}
                                            
                                            {/* If dossier is accepted but demande is still pending, show accept candidat button (direct) */}
                                            {app.statut === 'en_attente' && app.dossier && isDossierAccepted(app.dossier) && (
                                                <button
                                                    onClick={() => handleAcceptCandidat(app.id)}
                                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                >
                                                    Accepter la demande
                                                </button>
                                            )}
                                            
                                            {/* If dossier needs resubmission, show resubmit option (for admin to see status) */}
                                            {app.statut === 'en_attente' && app.dossier && isDossierResubmitRequested(app.dossier) && (
                                                <span className="px-3 py-1 bg-yellow-500 text-white rounded-md text-xs font-medium">
                                                    En attente resoumission
                                                </span>
                                            )}
                                            
                                            {app.statut === 'accepte' && (
                                                <button
                                                    onClick={() => handleStatusChange(app.id, 'refuse')}
                                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                >
                                                    Refuser
                                                </button>
                                            )}
                                            
                                            {/* Accepter la demande : seulement si refusée sans refus définitif du dossier (refuser dossier = refuser la demande) */}
                                            {app.statut === 'refuse' && app.dossier?.statut !== 'refuse_definitif' && (
                                                <button
                                                    onClick={() => handleOpenAcceptModal(app.id)}
                                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                >
                                                    Accepter la demande
                                                </button>
                                            )}
                                            
                                            {/* Supprimer : seulement après avoir accepté ou refusé la demande */}
                                            {(app.statut === 'accepte' || app.statut === 'refuse') && (
                                                <button
                                                    onClick={() => openDeleteConfirm(app.id)}
                                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                    title="Retirer la demande de la liste"
                                                >
                                                    Supprimer
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    )}
            </div>

            {/* Application Details Modal */}
            {showDetailsModal && selectedApplication && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#161615] rounded-2xl shadow-2xl border border-white/20 dark:border-[#3E3E3A]/50 w-full max-w-5xl">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] p-4 text-white rounded-t-2xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">Détails de la demande de formation</h2>
                                    <p className="text-white/80 text-sm">Informations complètes de la demande de formation</p>
                                </div>
                                <button
                                    onClick={closeDetailsModal}
                                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {/* Column 1 - Application Info */}
                                <div className="space-y-3">
                                    <h3 className="text-lg font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">Informations de la demande de formation</h3>
                                    <div className="space-y-2">
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99]">Formation</label>
                                            <p className="text-sm font-semibold text-[#1b1b18] dark:text-[#EDEDEC]">{selectedApplication.formation?.titre || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99]">Date de demande de formation</label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">
                                                {(selectedApplication.date_demande ?? selectedApplication.date_cand) ? 
                                                    (() => {
                                                        try {
                                                            const dateVal = selectedApplication.date_demande ?? selectedApplication.date_cand;
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
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99]">Statut</label>
                                            <span className={`px-2 py-1 text-xs rounded-lg font-medium ${getStatusColor(selectedApplication.statut)}`}>
                                                {getStatusText(selectedApplication.statut)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Column 2 - Formateur Info */}
                                <div className="space-y-3">
                                    <h3 className="text-lg font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">Informations du Formateur</h3>
                                    <div className="space-y-2">
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99]">Nom</label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">{selectedApplication.formateur?.nom || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99]">Email</label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">{selectedApplication.formateur?.email || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99]">Téléphone</label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">{selectedApplication.formateur?.telephone || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99]">Ville</label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">
                                                {selectedApplication?.formateur?.ville || selectedApplication?.formateur?.formateur?.ville || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Column 3 - Training Info and Motivation */}
                                <div className="space-y-3">
                                    <h3 className="text-lg font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">Informations de la Formation</h3>
                                    <div className="space-y-2">
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99]">Lieu</label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">{selectedApplication.formation?.lieu || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99]">Période</label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">
                                                {selectedApplication.formation ? 
                                                    `${(() => {
                                                        const dateDeb = selectedApplication.formation.date_deb || selectedApplication.formation.date_debut;
                                                        const dateFin = selectedApplication.formation.date_fin;
                                                        if (!dateDeb || !dateFin) return 'N/A';
                                                        try {
                                                            return `${new Date(dateDeb).toLocaleDateString('fr-FR')} - ${new Date(dateFin).toLocaleDateString('fr-FR')}`;
                                                        } catch (e) {
                                                            return 'N/A';
                                                        }
                                                    })()}` 
                                                    : 'N/A'
                                                }
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99]">Participants max</label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">{(selectedApplication.formation?.part_max || selectedApplication.formation?.participants_max || 'N/A')} {selectedApplication.formation?.part_max || selectedApplication.formation?.participants_max ? 'participants' : ''}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99]">Description</label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC] leading-relaxed">{selectedApplication.formation?.description || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl">
                            <div className="flex justify-end">
                                <button
                                    onClick={closeDetailsModal}
                                    className="px-4 py-2 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white rounded-lg transition-all font-medium shadow-lg hover:shadow-xl text-sm"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal d'acceptation avec upload EDT supprimé : l'emploi du temps est géré au niveau des formations */}

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

            {/* Verify Dossier / Accept Candidat Modal */}
            {/* Modal de vérification du dossier (UNIQUEMENT quand le dossier est en attente) */}
            {showAcceptWithEDTModal && verifyingAppId && (() => {
                const app = applications.find(a => a.id === verifyingAppId);
                if (!app || !app.dossier) return null;
                
                const dossierPending = isDossierPending(app.dossier);
                
                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-[#161615] rounded-2xl shadow-2xl border border-white/20 dark:border-[#3E3E3A]/50 w-full max-w-md">
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] p-6 text-white rounded-t-2xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 01-1.414 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold">
                                                Valider le Dossier
                                            </h3>
                                            <p className="text-sm mt-1 text-white/90">
                                                {'Choisissez une action pour valider le dossier du candidat'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowAcceptWithEDTModal(false);
                                            setVerifyingAppId(null);
                                            setDossierComment('');
                                        }}
                                        className="p-2 hover:bg-white/20 rounded-xl transition-all text-white"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-4">
                                {dossierPending && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Commentaire (optionnel pour acceptation, requis pour refus/resoumission)
                                        </label>
                                        <textarea
                                            value={dossierComment}
                                            onChange={(e) => setDossierComment(e.target.value)}
                                            rows={4}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                            placeholder="Entrez un commentaire si nécessaire..."
                                        />
                                    </div>
                                )}
                                
                                {/* Plus d'ajout d'emploi du temps ici : l'EDT est géré au niveau des formations */}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl flex flex-col gap-3">
                                {dossierPending && (
                                    <>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleVerifyDossierAction('accept')}
                                                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg transition-all font-medium shadow-lg flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Valider dossier
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowAcceptWithEDTModal(false);
                                                    setVerifyingAppId(null);
                                                    setDossierComment('');
                                                    handleRefuseDirect(verifyingAppId);
                                                }}
                                                className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all font-medium shadow-lg flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                Refuser
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleVerifyDossierAction('reject_resubmit')}
                                            disabled={!dossierComment.trim()}
                                            className="w-full px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all font-medium shadow-lg flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            Demander resoumission
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowAcceptWithEDTModal(false);
                                                setVerifyingAppId(null);
                                                setDossierComment('');
                                                setScheduleFile(null);
                                            }}
                                            className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
                                        >
                                            Annuler
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setCandidatureToDelete(null);
                }}
                onConfirm={handleDeleteApplication}
                title="Confirmer la suppression"
                message="Cette action est irréversible"
                itemName={candidatureToDelete && applications.find(app => app.id === candidatureToDelete)?.formation?.titre || 'Cette demande de formation'}
                itemDetails={
                    candidatureToDelete && applications.find(app => app.id === candidatureToDelete) ? (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            <p>Formateur: {applications.find(app => app.id === candidatureToDelete)?.formateur?.nom || 'N/A'}</p>
                            <p>Statut: {applications.find(app => app.id === candidatureToDelete)?.statut || 'N/A'}</p>
                        </div>
                    ) : null
                }
                warningMessage="La suppression de cette demande de formation supprimera également le dossier associé."
                confirmButtonText="Supprimer"
            />

        </div>
    );
}

