import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCache } from '../../context/CacheContext';
import NavigationGestionaire from '../../components/GestionaireNav';
import TableSquelette from '../../components/SkeletonTable';
import FiltreAvance from '../../components/AdvancedFilter';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import axios from 'axios';

export default function Formateurs() {
    const { getCachedData, setCachedData, clearCache } = useCache();
    const [formateurs, setFormateurs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [createError, setCreateError] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedFormateur, setSelectedFormateur] = useState(null);
    const [formateurDetails, setFormateurDetails] = useState(null);
    const [editingFormateur, setEditingFormateur] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [createFormData, setCreateFormData] = useState({
        name: '',
        formateur_id: '',
        grade_id: '',
        specialization: '',
        institution: '',
        diploma: '',
        city: '',
    });
    const [creating, setCreating] = useState(false);
    const [specialists, setSpecialists] = useState([]);
    const [loadingSpecialists, setLoadingSpecialists] = useState(false);
    const [grades, setGrades] = useState([]);
    const [loadingGrades, setLoadingGrades] = useState(false);
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    // Advanced filter state
    const [appliedFilters, setAppliedFilters] = useState({});
    
    // Static counts
    const [staticCounts, setStaticCounts] = useState({
        total: 0,
        with_account: 0,
        without_account: 0,
    });

    // Calculate filtered formateurs
    const filteredFormateurs = formateurs.filter(formateur => {
        // Apply advanced filters
        if (appliedFilters.formateur_id && !formateur.identifiant_formateur?.toLowerCase().includes(appliedFilters.formateur_id.toLowerCase())) {
            return false;
        }
        
        if (appliedFilters.specialization) {
            const specialiteName = formateur.specialite?.nom || formateur.specialite || '';
            if (!specialiteName.toLowerCase().includes(appliedFilters.specialization.toLowerCase())) {
                return false;
            }
        }
        
        if (appliedFilters.city && !formateur.ville?.toLowerCase().includes(appliedFilters.city.toLowerCase())) {
            return false;
        }
        
        if (appliedFilters.institution && !formateur.institution?.toLowerCase().includes(appliedFilters.institution.toLowerCase())) {
            return false;
        }
        
        // Filter by account status
        if (appliedFilters.has_account) {
            const hasAccount = appliedFilters.has_account === 'true';
            const formateurHasAccount = !!formateur.utilisateur_id;
            if (hasAccount !== formateurHasAccount) {
                return false;
            }
        }
        
        return true;
    });

    useEffect(() => {
        fetchFormateurs();
        fetchSpecialists();
        fetchGrades();
    }, []);

    // Recharger lorsque les filtres changent (uniquement si nous utilisons le filtrage côté serveur)
    useEffect(() => {
        // Recharger uniquement s'il y a des filtres significatifs qui nécessitent un traitement côté serveur
        if (appliedFilters.has_account || appliedFilters.specialization) {
            fetchFormateurs();
        }
    }, [appliedFilters.has_account, appliedFilters.specialization]);

    const showSuccessMessage = (text, type = 'success') => {
        setMessage(text);
        setMessageType(type);
        setShowMessage(true);
        setTimeout(() => {
            setShowMessage(false);
        }, 3000);
    };

    const fetchFormateurs = async (skipCache = false, silent = false) => {
        try {
            if (!silent) {
                setError('');
                setLoading(true);
            }
            
            // Construire les paramètres de requête avec les filtres
            const params = new URLSearchParams();
            if (appliedFilters.has_account) {
                params.append('has_account', appliedFilters.has_account);
            }
            if (appliedFilters.specialization) {
                params.append('specialization', appliedFilters.specialization);
            }
            if (appliedFilters.formateur_id || appliedFilters.city || appliedFilters.institution) {
                // Combiner les filtres de recherche
                const termeRecherche = [appliedFilters.formateur_id, appliedFilters.city, appliedFilters.institution]
                    .filter(Boolean)
                    .join(' ');
                if (termeRecherche) {
                    params.append('search', termeRecherche);
                }
            }
            
            const queryString = params.toString();
            const cleCache = queryString ? `admin_formateurs_${queryString}` : 'admin_formateurs';
            
            // Vérifier le cache d'abord (avec les filtres dans la clé de cache) - sauf si skipCache est true
            if (!skipCache) {
                const formateursCaches = getCachedData(cleCache);
                if (formateursCaches) {
                    setFormateurs(formateursCaches.formateurs);
                    setStaticCounts(formateursCaches.counts);
                    if (!silent) {
                        setLoading(false);
                    }
                    return;
                }
            }
            
            const url = queryString ? `/api/admin/formateurs?${queryString}` : '/api/admin/formateurs';
            const response = await axios.get(url);
            
            // Gérer les réponses paginées et non paginées
            let donneesFormateurs = [];
            if (response.data.data && Array.isArray(response.data.data)) {
                donneesFormateurs = response.data.data;
            } else if (Array.isArray(response.data)) {
                donneesFormateurs = response.data;
            } else {
                donneesFormateurs = [];
            }
            
            setFormateurs(donneesFormateurs);
            
            // Mettre à jour les compteurs statiques
            const counts = {
                total: donneesFormateurs.length,
                with_account: donneesFormateurs.filter(f => f.utilisateur_id).length,
                without_account: donneesFormateurs.filter(f => !f.utilisateur_id).length,
            };
            setStaticCounts(counts);
            
            // Mettre en cache les données (avec les filtres dans la clé de cache)
            const cleCacheAUtiliser = queryString ? `admin_formateurs_${queryString}` : 'admin_formateurs';
            setCachedData(cleCacheAUtiliser, { formateurs: donneesFormateurs, counts });
        } catch (err) {
            if (!silent) {
                setError(err.response?.data?.message || 'Erreur lors du chargement des formateurs');
                setFormateurs([]);
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    const fetchSpecialists = async () => {
        try {
            setLoadingSpecialists(true);
            const response = await axios.get('/api/admin/specialistes');
            setSpecialists(response.data.data || response.data);
        } catch (error) {
            console.error('Erreur lors de la récupération des spécialistes:', error);
        } finally {
            setLoadingSpecialists(false);
        }
    };

    const fetchGrades = async () => {
        try {
            setLoadingGrades(true);
                const response = await axios.get('/api/grades');
            
            // The API returns { data: [...] }
            let gradesData = [];
            if (response.data) {
                // Check if response.data is an array directly
                if (Array.isArray(response.data)) {
                    gradesData = response.data;
                }
                // Check if response.data has a data property that is an array
                else if (response.data.data && Array.isArray(response.data.data)) {
                    gradesData = response.data.data;
                }
            }
            
            
            setGrades(gradesData);
            
            if (gradesData.length === 0) {
                console.warn('⚠️ Aucun grade trouvé - vérifiez la base de données');
            } else {
            }
        } catch (error) {
            console.error('❌ Erreur lors de la récupération des grades:', error);
            if (error.response) {
            } else if (error.request) {
                console.error('❌ Aucune réponse reçue:', error.request);
            } else {
            }
            setGrades([]);
        } finally {
            setLoadingGrades(false);
        }
    };

    const handleEdit = (formateur) => {
        setEditingFormateur(formateur);
        setCreateFormData({
            name: formateur.nom || '',
            formateur_id: formateur.identifiant_formateur || '',
            grade_id: formateur.grade_id || formateur.grade?.id || '',
            specialization: formateur.specialite?.nom || formateur.specialite || '',
            institution: formateur.institution || '',
            diploma: formateur.diplome || '',
            city: formateur.ville || '',
        });
        setShowEditModal(true);
    };

    const handleDelete = (formateur) => {
        setSelectedFormateur(formateur);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            const response = await axios.delete(`/api/admin/formateurs/${selectedFormateur.id}`);
            
            // Clear cache
            clearCache('admin_formateurs');
            
            // Mettre à jour immédiatement l'état local
            setFormateurs(prev => prev.filter(f => f.id !== selectedFormateur.id));
            
            // Réinitialiser les filtres pour voir la liste mise à jour
            setAppliedFilters({});
            
            const formateurIdentifiant = selectedFormateur.identifiant_formateur;
            setShowDeleteModal(false);
            setSelectedFormateur(null);
            
            // Afficher le message de succès du backend (indique si le compte utilisateur a aussi été supprimé)
            const successMessage = response.data?.message || `✅ Formateur ${formateurIdentifiant} supprimé avec succès!`;
            showSuccessMessage(successMessage);
            
            // Rafraîchir silencieusement en arrière-plan
            setTimeout(() => {
                fetchFormateurs(true, true);
            }, 500);
        } catch (error) {
            console.error('Erreur lors de la suppression du formateur:', error);
            let errorMessage = '❌ Erreur lors de la suppression du formateur';
            
            // Extraire le message d'erreur du backend
            if (error.response?.data?.message) {
                errorMessage = `❌ ${error.response.data.message}`;
            }
            
            showSuccessMessage(errorMessage, 'error');
        }
    };

    const handleCreateChange = (e) => {
        const { name, value } = e.target;
        setCreateFormData({
            ...createFormData,
            [name]: value,
        });
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setCreating(true);
        setCreateError('');

        // Validation
        if (!createFormData.name || createFormData.name.trim() === '') {
            showSuccessMessage('Le nom complet est requis', 'error');
            setCreating(false);
            return;
        }

        if (!createFormData.formateur_id || createFormData.formateur_id.trim() === '') {
            showSuccessMessage("L'ID formateur est requis", 'error');
            setCreating(false);
            return;
        }

        // Validate that a grade is selected
        if (!createFormData.grade_id || createFormData.grade_id === '') {
            showSuccessMessage('Veuillez sélectionner un grade', 'error');
            setCreating(false);
            return;
        }

        try {
            // Find the specialite_id from the specialization name
            const selectedSpecialite = specialists.find(s => s.nom === createFormData.specialization);
            
            const payload = {
                name: createFormData.name,
                formateur_id: createFormData.formateur_id,
                grade_id: createFormData.grade_id,
                specialite_id: selectedSpecialite?.id,
                institution: createFormData.institution,
                diploma: createFormData.diploma,
                city: createFormData.city,
            };

            await axios.post('/api/admin/formateurs', payload);

            // Après création, recharger complètement la page pour tout rafraîchir
            window.location.reload();
        } catch (error) {
            console.error('Erreur lors de la création du formateur:', error);
            let errorMessage = 'Erreur lors de la création du formateur';
            
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.data?.errors) {
                // Gérer les erreurs de validation
                const errors = error.response.data.errors;
                errorMessage = errors.formateur_id?.[0] || errors.name?.[0] || errors.phone?.[0] || errors.email?.[0] || errorMessage;
                const firstError = Object.values(errors)[0];
                if (Array.isArray(firstError) && firstError.length > 0 && !errorMessage.includes('formateur')) {
                    errorMessage = firstError[0];
                } else if (typeof firstError === 'string' && !errorMessage.includes('formateur')) {
                    errorMessage = firstError;
                }
            }
            
            showSuccessMessage(errorMessage, 'error');
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        setUpdating(true);
        setError('');

        try {
            // Find the specialite_id from the specialization name
            const selectedSpecialite = createFormData.specialization 
                ? specialists.find(s => s.nom === createFormData.specialization)
                : null;
            
            const payload = {
                name: createFormData.name,
                formateur_id: createFormData.formateur_id,
                grade_id: createFormData.grade_id || undefined,
                specialite_id: selectedSpecialite?.id || undefined,
                institution: createFormData.institution || undefined,
                diploma: createFormData.diploma || undefined,
                city: createFormData.city || undefined,
            };

            await axios.put(`/api/admin/formateurs/${editingFormateur.id}`, payload);
            
            // Clear cache
            clearCache('admin_formateurs');
            clearCache('gestionaire_dashboard_stats');
            
            // Reset form
            setCreateFormData({
                name: '',
                formateur_id: '',
                grade_id: '',
                specialization: '',
                institution: '',
                diploma: '',
                city: '',
            });
            
            setShowEditModal(false);
            setEditingFormateur(null);
            showSuccessMessage(`✅ Formateur mis à jour avec succès!`);
            
            // Réinitialiser les filtres pour voir le formateur mis à jour
            setAppliedFilters({});
            
            // Rafraîchir silencieusement en arrière-plan
            setTimeout(() => {
                fetchFormateurs(true, true);
            }, 500);
        } catch (error) {
            console.error('Erreur lors de la mise à jour du formateur:', error);
            setError(error.response?.data?.message || 'Erreur lors de la mise à jour du formateur');
        } finally {
            setUpdating(false);
        }
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
                            Formateurs
                        </h1>

                        <div className="mb-4 flex items-center justify-center gap-4">
                            <Link 
                                to="/gestionaire/dashboard" 
                                className="btn btn-primary"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Retour au Dashboard
                            </Link>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] hover:from-[#b8860b] hover:to-[#d4af37] text-white rounded-xl shadow-xl hover:shadow-yellow-500/50 transition-all duration-300 text-sm font-bold"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Créer un Formateur
                            </button>
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
                            name: 'formateur_id',
                            label: 'ID Formateur',
                            type: 'text',
                            placeholder: 'Rechercher par ID...',
                            icon: '🆔'
                        },
                        {
                            name: 'specialization',
                            label: 'Spécialité',
                            type: 'select',
                            icon: '🎯',
                            options: specialists.map(spec => ({
                                value: spec.name,
                                label: spec.name
                            }))
                        },
                        {
                            name: 'city',
                            label: 'Ville',
                            type: 'text',
                            placeholder: 'Rechercher par ville...',
                            icon: '🏙️'
                        },
                        {
                            name: 'institution',
                            label: 'Institution',
                            type: 'text',
                            placeholder: 'Rechercher par institution...',
                            icon: '🏛️'
                        },
                        {
                            name: 'has_account',
                            label: 'Statut du compte',
                            type: 'select',
                            icon: '👤',
                            options: [
                                { value: '', label: 'Tous' },
                                { value: 'true', label: 'Avec compte' },
                                { value: 'false', label: 'Sans compte' }
                            ]
                        }
                    ]}
                    onFilter={(filters) => setAppliedFilters(filters)}
                    onReset={() => setAppliedFilters({})}
                />

                {/* Statistics Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="stat-card">
                        <div className="stat-card-content">
                            <div className="flex items-center gap-3">
                                <div className="stat-icon">
                                    <span className="text-xl">👥</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="stat-value">
                                        {staticCounts.total || 0}
                                    </p>
                                    <p className="stat-label truncate">Total Formateurs</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-content">
                            <div className="flex items-center gap-3">
                                <div className="stat-icon" style={{background: 'linear-gradient(to bottom right, #10b981, #059669)'}}>
                                    <span className="text-xl">✅</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="stat-value" style={{background: 'linear-gradient(to right, #059669, #047857)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>
                                        {staticCounts.with_account || 0}
                                    </p>
                                    <p className="stat-label truncate">Avec compte</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-content">
                            <div className="flex items-center gap-3">
                                <div className="stat-icon" style={{background: 'linear-gradient(to bottom right, #f97316, #ea580c)'}}>
                                    <span className="text-xl">⏳</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="stat-value" style={{background: 'linear-gradient(to right, #ea580c, #c2410c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>
                                        {staticCounts.without_account || 0}
                                    </p>
                                    <p className="stat-label truncate">Sans compte</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Résumé des Résultats */}
                {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 0 && (
                    <div className="mb-6">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-blue-200 dark:border-gray-600">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Résultats</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {filteredFormateurs.length} formateur{filteredFormateurs.length > 1 ? 's' : ''} trouvé{filteredFormateurs.length > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-6 py-4 rounded-xl">
                        {error}
                    </div>
                )}

                {/* Loading State */}
                {loading ? (
                    <TableSquelette rows={8} />
                ) : filteredFormateurs.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">👤</span>
                        </div>
                        <h3 className="text-2xl font-semibold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">Aucun formateur trouvé</h3>
                        <p className="text-lg text-[#78786c] dark:text-[#9D9D99]">
                            {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 0 
                                ? "Aucun formateur ne correspond aux critères de recherche"
                                : "Aucun formateur créé pour le moment"}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white/80 dark:bg-[#161615]/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 overflow-hidden">
                        <div className="overflow-x-auto">
                            {/* List Header */}
                            <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] px-6 py-4">
                                <div className="grid grid-cols-7 gap-4 text-white font-semibold">
                                    <div className="col-span-1 text-center">#</div>
                                    <div className="col-span-1 text-center">ID</div>
                                    <div className="col-span-1 text-center">Nom</div>
                                    <div className="col-span-1 text-center">Détails</div>
                                    <div className="col-span-1 text-center">Compte</div>
                                    <div className="col-span-2 text-center">Actions</div>
                                </div>
                            </div>
                            
                            {/* List Items */}
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredFormateurs.map((f, index) => (
                                    <div
                                        key={f.id}
                                        className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                                    >
                                        <div className="grid grid-cols-7 gap-4 items-center">
                                            {/* Index */}
                                            <div className="col-span-1 text-center">
                                                <span className="text-sm font-medium text-[#78786c] dark:text-[#9D9D99]">
                                                    {index + 1}
                                                </span>
                                            </div>
                                            
                                            {/* Formateur ID */}
                                            <div className="col-span-1 text-center">
                                                <span className="text-sm font-semibold text-[#1b1b18] dark:text-[#EDEDEC]" title={f.identifiant_formateur || 'N/A'}>
                                                    {f.identifiant_formateur || 'N/A'}
                                                </span>
                                            </div>
                                            
                                            {/* Name */}
                                            <div className="col-span-1 text-center">
                                                <span className="text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC]" title={f.nom || 'N/A'}>
                                                    {f.nom || 'N/A'}
                                                </span>
                                            </div>
                                            
                                            {/* Details Button */}
                                            <div className="col-span-1 text-center">
                                                <button
                                                    onClick={() => {
                                                        setFormateurDetails(f);
                                                        setShowDetailsModal(true);
                                                    }}
                                                    className="px-3 py-1 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                    >
                                                        Détails
                                                    </button>
                                            </div>
                                            
                                            {/* Account Status */}
                                            <div className="col-span-1 text-center">
                                                {f.utilisateur_id ? (
                                                    <span className="inline-flex px-3 py-1 text-xs rounded-full font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                                                        Actif
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex px-3 py-1 text-xs rounded-full font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
                                                        En attente
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* Actions */}
                                            <div className="col-span-2 text-center flex flex-wrap gap-2 justify-center items-center">
                                                <button
                                                    onClick={() => handleEdit(f)}
                                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                    title="Modifier"
                                                >
                                                    Modifier
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(f)}
                                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                    title="Supprimer"
                                                >
                                                    Supprimer
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {showDetailsModal && formateurDetails && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#161615] rounded-2xl shadow-2xl border border-white/20 dark:border-[#3E3E3A]/50 w-full max-w-2xl">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] p-6 text-white rounded-t-2xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">Détails du Formateur</h2>
                                    <p className="text-white/80 text-sm">{formateurDetails.nom || 'N/A'}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowDetailsModal(false);
                                        setFormateurDetails(null);
                                    }}
                                    className="p-2 hover:bg-white/20 rounded-xl transition-all text-white"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                {/* Grade */}
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Grade</h3>
                                            <p className="text-lg font-semibold text-[#1b1b18] dark:text-[#EDEDEC]">
                                                {formateurDetails.grade?.nom || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Spécialité */}
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Spécialité</h3>
                                            <p className="text-lg font-semibold text-[#1b1b18] dark:text-[#EDEDEC]">
                                                {formateurDetails.specialite?.nom || formateurDetails.specialite || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Ville */}
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ville</h3>
                                            <p className="text-lg font-semibold text-[#1b1b18] dark:text-[#EDEDEC]">
                                                {formateurDetails.ville || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Institution */}
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Institution</h3>
                                            <p className="text-lg font-semibold text-[#1b1b18] dark:text-[#EDEDEC]">
                                                {formateurDetails.institution || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            <DeleteConfirmModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setSelectedFormateur(null);
                }}
                onConfirm={handleDeleteConfirm}
                itemName={selectedFormateur?.nom || 'N/A'}
                itemDetails={
                    <p className="text-sm text-[#78786c] dark:text-[#9D9D99] mt-1">
                        ID: {selectedFormateur?.identifiant_formateur}
                    </p>
                }
                warningMessage="Si un compte utilisateur n'a pas encore été créé avec cet ID, vous pourrez le recréer."
                itemIcon={
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                }
            />

            {/* Create Formateur Modal */}
            {showCreateModal && (
                <div className="modal-overlay" style={{overflowY: 'auto'}}>
                    <div className="modal-content my-8">
                        {/* Modal Header */}
                        <div className="modal-header" style={{background: 'linear-gradient(to right, #1a365d, #2d3748)'}}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Créer un Nouveau Formateur</h3>
                                    <p className="text-white/80 text-sm">Créez le profil formateur (le compte sera créé lors de l'inscription)</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setCreateError('');
                                        setCreateFormData({
                                            name: '',
                                            formateur_id: '',
                                            grade_id: '',
                                            specialization: '',
                                            institution: '',
                                            diploma: '',
                                            city: '',
                                        });
                                    }}
                                    className="text-white hover:text-white/80 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <form onSubmit={handleCreateSubmit} className="modal-body" style={{maxHeight: '70vh', overflowY: 'auto'}}>

                            {/* Informations de Base */}
                            <div className="form-group">
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                                    Informations de Base
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">
                                            Nom complet *
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={createFormData.name}
                                            onChange={handleCreateChange}
                                            className="form-input"
                                            required
                                            maxLength="20"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            ID Formateur *
                                        </label>
                                        <input
                                            type="text"
                                            name="formateur_id"
                                            value={createFormData.formateur_id}
                                            onChange={handleCreateChange}
                                            placeholder="FOR-0001"
                                            className="form-input"
                                            required
                                        />
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            L'ID formateur unique doit être saisi par l'administrateur
                                        </p>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            Grade *
                                        </label>
                                        <select
                                            name="grade_id"
                                            value={createFormData.grade_id}
                                            onChange={handleCreateChange}
                                            className="form-select"
                                            required
                                            disabled={loadingGrades}
                                        >
                                            <option value="" disabled>
                                                {loadingGrades 
                                                    ? 'Chargement des grades...' 
                                                    : 'Sélectionner un grade'}
                                            </option>
                                            {grades.length > 0 ? (
                                                grades.map((grade) => (
                                                    <option key={grade.id} value={grade.id}>
                                                        {grade.nom}
                                                    </option>
                                                ))
                                            ) : (
                                                !loadingGrades && (
                                                    <option value="" disabled>
                                                        Aucun grade disponible
                                                    </option>
                                                )
                                            )}
                                        </select>
                                        {grades.length === 0 && !loadingGrades && (
                                            <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                                                ⚠️ Aucun grade disponible. Vérifiez la console pour plus de détails.
                                            </p>
                                        )}
                                        {grades.length > 0 && (
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                {grades.length} grade(s) disponible(s)
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Profil Professionnel */}
                            <div className="form-group">
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                                    Profil Professionnel
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">
                                            Spécialité *
                                        </label>
                                        <select
                                            name="specialization"
                                            value={createFormData.specialization}
                                            onChange={handleCreateChange}
                                            className="form-select"
                                            required
                                        >
                                            <option value="" disabled>Sélectionner une spécialité</option>
                                            {specialists.map((specialist) => (
                                                <option key={specialist.id} value={specialist.nom}>
                                                    {specialist.nom}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            Ville *
                                        </label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={createFormData.city}
                                            onChange={handleCreateChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            Institution *
                                        </label>
                                        <input
                                            type="text"
                                            name="institution"
                                            value={createFormData.institution}
                                            onChange={handleCreateChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>

                                    <div className="form-group md:col-span-2">
                                        <label className="form-label">
                                            Diplôme *
                                        </label>
                                        <input
                                            type="text"
                                            name="diploma"
                                            value={createFormData.diploma}
                                            onChange={handleCreateChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setError('');
                                        setCreateFormData({
                                            name: '',
                                            formateur_id: '',
                                            grade_id: '',
                                            specialization: '',
                                            institution: '',
                                            diploma: '',
                                            city: '',
                                        });
                                    }}
                                    className="btn btn-secondary"
                                    style={{flex: 1}}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="btn btn-success"
                                    style={{flex: 1, background: creating ? '#6b7280' : undefined}}
                                >
                                    {creating ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Création en cours...
                                        </span>
                                    ) : (
                                        'Créer le Formateur'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Formateur Modal */}
            {showEditModal && (
                <div className="modal-overlay" style={{overflowY: 'auto'}}>
                    <div className="modal-content my-8">
                        {/* Modal Header */}
                        <div className="modal-header" style={{background: 'linear-gradient(to right, #1a365d, #2d3748)'}}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Modifier le Formateur</h3>
                                    <p className="text-white/80 text-sm">Modifiez les informations du formateur</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingFormateur(null);
                                        setError('');
                                        setCreateFormData({
                                            name: '',
                                            formateur_id: '',
                                            grade_id: '',
                                            specialization: '',
                                            institution: '',
                                            diploma: '',
                                            city: '',
                                        });
                                    }}
                                    className="text-white hover:text-white/80 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <form onSubmit={handleUpdateSubmit} className="modal-body" style={{maxHeight: '70vh', overflowY: 'auto'}}>
                            {error && (
                                <div className="message message-error">
                                    {error}
                                </div>
                            )}

                            {/* Informations de Base */}
                            <div className="form-group">
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                                    Informations de Base
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">
                                            Nom complet *
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={createFormData.name}
                                            onChange={handleCreateChange}
                                            className="form-input"
                                            required
                                            maxLength="20"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            ID Formateur *
                                        </label>
                                        <input
                                            type="text"
                                            name="formateur_id"
                                            value={createFormData.formateur_id}
                                            onChange={handleCreateChange}
                                            placeholder="FOR-0001"
                                            className="form-input"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            Grade
                                        </label>
                                        <select
                                            name="grade_id"
                                            value={createFormData.grade_id}
                                            onChange={handleCreateChange}
                                            className="form-select"
                                            disabled={loadingGrades}
                                        >
                                            <option value="" disabled>Sélectionner un grade</option>
                                            {grades.map((grade) => (
                                                <option key={grade.id} value={grade.id}>
                                                    {grade.nom}
                                                </option>
                                            ))}
                                        </select>
                                        {loadingGrades && (
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Chargement des grades...</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Profil Professionnel */}
                            <div className="form-group">
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                                    Profil Professionnel
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">
                                            Spécialité
                                        </label>
                                        <select
                                            name="specialization"
                                            value={createFormData.specialization}
                                            onChange={handleCreateChange}
                                            className="form-select"
                                        >
                                            <option value="" disabled>Sélectionner une spécialité</option>
                                            {specialists.map((specialist) => (
                                                <option key={specialist.id} value={specialist.nom}>
                                                    {specialist.nom}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            Ville
                                        </label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={createFormData.city}
                                            onChange={handleCreateChange}
                                            className="form-input"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            Institution
                                        </label>
                                        <input
                                            type="text"
                                            name="institution"
                                            value={createFormData.institution}
                                            onChange={handleCreateChange}
                                            className="form-input"
                                        />
                                    </div>

                                    <div className="form-group md:col-span-2">
                                        <label className="form-label">
                                            Diplôme
                                        </label>
                                        <input
                                            type="text"
                                            name="diploma"
                                            value={createFormData.diploma}
                                            onChange={handleCreateChange}
                                            className="form-input"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingFormateur(null);
                                        setError('');
                                        setCreateFormData({
                                            name: '',
                                            formateur_id: '',
                                            grade_id: '',
                                            specialization: '',
                                            institution: '',
                                            diploma: '',
                                            city: '',
                                        });
                                    }}
                                    className="btn btn-secondary"
                                    style={{flex: 1}}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="btn"
                                    style={{flex: 1, background: updating ? '#6b7280' : 'linear-gradient(to right, #1a365d, #2d3748)'}}
                                >
                                    {updating ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Mise à jour en cours...
                                        </span>
                                    ) : (
                                        'Mettre à jour le Formateur'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Success Message Popup */}
            {showMessage && (
                <div className="fixed top-4 right-4 z-[9999] animate-slide-in">
                    <div className={`px-6 py-4 rounded-xl shadow-lg border-l-4 flex items-center space-x-3 ${
                        messageType === 'success' 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-400' 
                            : 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-400'
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

