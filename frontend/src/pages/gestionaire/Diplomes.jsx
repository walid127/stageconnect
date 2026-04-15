import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdvancedFilter from '../../components/AdvancedFilter';
import NavigationGestionaire from '../../components/GestionaireNav';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import axios from 'axios';

export default function GestionaireDiplomas() {
    const [diplomas, setDiplomas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingDiploma, setEditingDiploma] = useState(null);
    const [selectedTraining, setSelectedTraining] = useState(null);
    const [formateurs, setFormateurs] = useState([]);
    const [completedTrainings, setCompletedTrainings] = useState([]);
    const [loadingTrainings, setLoadingTrainings] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [modalError, setModalError] = useState('');
    const [modalSuccess, setModalSuccess] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [diplomaToDelete, setDiplomaToDelete] = useState(null);
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');

    // Advanced filter
    const [appliedFilters, setAppliedFilters] = useState({});

    // Form state
    const [formData, setFormData] = useState({
        formation_id: '',
        type_formation: '',
        promotion_type: '', // 5_ans ou 10_ans
        formateur_id: '',
        numero_diplome: '',
        date_delivrance: new Date().toISOString().split('T')[0],
        notes: '',
        ann_adm: '',
        ref_decision: '',
        fichier_diplome: null,
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
        fetchDiplomas();
        fetchFormateurs();
    }, []);

    const fetchDiplomas = async (skipCache = false, silent = false) => {
        try {
            if (!silent) {
                setLoading(true);
            }
            const response = await axios.get('/api/admin/diplomes');
            // La pagination Laravel retourne les données dans response.data.data
            const diplomasData = response.data?.data || response.data || [];
            setDiplomas(Array.isArray(diplomasData) ? diplomasData : []);
        } catch (err) {
            if (!silent) {
                const errorMessage = err.response?.data?.message || 'Erreur lors du chargement des diplômes';
                showMessagePopup(errorMessage, 'error');
            }
            setDiplomas([]);
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    const fetchFormateurs = async () => {
        try {
            const response = await axios.get('/api/admin/diplomes/formateurs');
            setFormateurs(response.data.data || []);
        } catch (err) {
            console.error('Erreur lors de la récupération des formateurs:', err);
        }
    };

    const fetchCompletedTrainingsForFormateur = async (formateurId) => {
        if (!formateurId) {
            setCompletedTrainings([]);
            return;
        }
        try {
            setLoadingTrainings(true);
            const response = await axios.get(`/api/admin/diplomes/formateurs/${formateurId}/formations-terminees`);
            const trainings = response.data?.data || response.data || [];
            setCompletedTrainings(Array.isArray(trainings) ? trainings : []);
        } catch (err) {
            setCompletedTrainings([]);
        } finally {
            setLoadingTrainings(false);
        }
    };

    const handleFormateurChange = (formateurId) => {
        setFormData({ ...formData, formateur_id: formateurId, formation_id: '', type_formation: '', promotion_type: '' });
        setSelectedTraining(null);
        setCompletedTrainings([]);
        if (formateurId) {
            fetchCompletedTrainingsForFormateur(formateurId);
        }
    };

    const handleTrainingChange = (trainingId, trainingType) => {
        let training = null;
        
        // Try to find by ID first (if trainingId is provided)
        if (trainingId) {
            const idNum = parseInt(trainingId);
            if (!isNaN(idNum)) {
                training = completedTrainings.find(t => t.id && (t.id === idNum || t.id.toString() === trainingId));
            }
        }
        
        // If not found by ID, try to find by type
        if (!training && trainingType) {
            training = completedTrainings.find(t => t.type === trainingType);
        }
        
        setSelectedTraining(training);
        
        if (training) {
            if (training.type === 'optionnelle') {
                // For optionnelle trainings, always use the ID
                setFormData({ ...formData, formation_id: training.id.toString(), type_formation: '' });
            } else if (training.type === 'pedagogical' || training.type === 'promotion') {
                // If training has an ID, use it; otherwise use type_formation
                if (training.id) {
                    setFormData({ 
                        ...formData, 
                        formation_id: training.id.toString(), 
                        type_formation: training.type,
                        promotion_type: training.donnees_promotion?.type || training.type_promotion || ''
                    });
                } else {
                    setFormData({ 
                        ...formData, 
                        formation_id: '', 
                        type_formation: training.type,
                        promotion_type: training.donnees_promotion?.type || training.type_promotion || ''
                    });
                }
            }
        } else {
            // If no training found, clear the form data
            setFormData({ ...formData, formation_id: '', type_formation: '' });
        }
    };

    const handleEdit = async (diploma) => {
        setEditingDiploma(diploma);
        // Charger les formations terminées du formateur
        await fetchCompletedTrainingsForFormateur(diploma.formateur_id);
        
        // Déterminer le type de formation
        let trainingType = '';
        const category = diploma.formation?.specialite?.nom || diploma.formation?.categorie || '';
        if (category === 'Formation Pédagogique') {
            trainingType = 'pedagogical';
        } else if (category === 'Formation de Promotion') {
            trainingType = 'promotion';
        }
        
        setFormData({
            formation_id: diploma.formation_id ? diploma.formation_id.toString() : '',
            type_formation: trainingType,
            formateur_id: diploma.formateur_id.toString(),
            numero_diplome: diploma.num_diplome || '',
            date_delivrance: diploma.date_deliv ? new Date(diploma.date_deliv).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            notes: diploma.notes || '',
            ann_adm: diploma.ann_adm ? String(diploma.ann_adm) : '',
            ref_decision: diploma.ref_decision ? String(diploma.ref_decision) : '',
            fichier_diplome: null,
        });
        setShowCreateModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setModalError('');
        setModalSuccess('');

        // Validation
        if (!formData.date_delivrance || formData.date_delivrance.trim() === '') {
            setModalError('La date de délivrance est requise');
            setSubmitting(false);
            return;
        }
        if (!formData.ann_adm || String(formData.ann_adm).trim() === '') {
            setModalError("L'année d'admission est requise");
            setSubmitting(false);
            return;
        }
        if (!formData.ref_decision || String(formData.ref_decision).trim() === '') {
            setModalError('La référence de décision est requise');
            setSubmitting(false);
            return;
        }

        // Le promotion_type est automatiquement détecté à partir de la formation sélectionnée

        try {
            const formDataToSend = new FormData();
            // If we have a formation_id (including for existing pedagogical/promotion trainings), use it
            // Otherwise, use type_formation for new virtual trainings
            if (formData.formation_id) {
                formDataToSend.append('formation_id', formData.formation_id);
                // Si c'est une formation de promotion, ajouter automatiquement promotion_type
                if (formData.type_formation === 'promotion' && formData.promotion_type) {
                    formDataToSend.append('promotion_type', formData.promotion_type);
                }
            } else if (formData.type_formation) {
                formDataToSend.append('type_formation', formData.type_formation);
                // Ajouter automatiquement promotion_type si c'est une formation de promotion
                if (formData.type_formation === 'promotion' && formData.promotion_type) {
                    formDataToSend.append('promotion_type', formData.promotion_type);
                }
            }
            formDataToSend.append('formateur_id', formData.formateur_id);
            if (formData.numero_diplome) {
                formDataToSend.append('num_diplome', formData.numero_diplome);
            }
            formDataToSend.append('date_deliv', formData.date_delivrance);
            if (formData.notes) {
                formDataToSend.append('notes', formData.notes);
            }
            if (formData.ann_adm) {
                formDataToSend.append('ann_adm', formData.ann_adm);
            }
            if (formData.ref_decision) {
                formDataToSend.append('ref_decision', formData.ref_decision);
            }
            // File is required for new diplomas, optional for updates
            if (formData.fichier_diplome) {
                formDataToSend.append('fichier_diplome', formData.fichier_diplome);
            } else if (!editingDiploma) {
                // For new diplomas, file is required
                setModalError('Le fichier diplôme est requis');
                setSubmitting(false);
                return;
            }

            let response;
            if (editingDiploma) {
                // Update existing diploma
                response = await axios.post(`/api/admin/diplomes/${editingDiploma.id}`, formDataToSend);
                
                // Mettre à jour immédiatement l'état local AVANT la fermeture du modal
                setDiplomas(prev => prev.map(d => 
                    d.id === editingDiploma.id 
                        ? { ...d, ...response.data.diploma }
                        : d
                ));
            } else {
                // Create new diploma
                response = await axios.post('/api/admin/diplomes', formDataToSend);
            }

            // Succès : recharger complètement la page pour tout rafraîchir
            window.location.reload();
        } catch (err) {
            // Show error only in modal
            const errorMessage = err.response?.data?.message || (editingDiploma ? 'Erreur lors de la mise à jour du diplôme' : 'Erreur lors de la création du diplôme');
            setModalError(errorMessage);
            
            // En cas d'erreur, restaurer l'état précédent
            if (editingDiploma) {
                fetchDiplomas(true, true);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        setModalError('');
        setModalSuccess('');
        setShowCreateModal(false);
        setEditingDiploma(null);
        setFormData({
            formation_id: '',
            type_formation: '',
            formateur_id: '',
            numero_diplome: '',
            date_delivrance: new Date().toISOString().split('T')[0],
            notes: '',
            ann_adm: '',
            ref_decision: '',
            fichier_diplome: null,
        });
        setSelectedTraining(null);
        setCompletedTrainings([]);
    };

    const handleDelete = (diploma) => {
        setDiplomaToDelete(diploma);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!diplomaToDelete) return;
        
        try {
            // Mettre à jour immédiatement l'état local AVANT l'appel API
            setDiplomas(prev => prev.filter(d => d.id !== diplomaToDelete.id));
            
            // Réinitialiser les filtres pour voir la liste mise à jour
            setAppliedFilters({});
            
            // Ensuite, faire l'appel API
            await axios.delete(`/api/admin/diplomes/${diplomaToDelete.id}`);
            
            showMessagePopup('Diplôme supprimé avec succès!', 'success');
            
            // Rafraîchir silencieusement en arrière-plan
            setTimeout(() => {
                fetchDiplomas(true, true);
                fetchFormateurs();
            }, 500);
        } catch (err) {
            // En cas d'erreur, restaurer l'état précédent
            fetchDiplomas(true, true);
            
            showMessagePopup(err.response?.data?.message || 'Erreur lors de la suppression', 'error');
        } finally {
            setShowDeleteConfirm(false);
            setDiplomaToDelete(null);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setDiplomaToDelete(null);
    };

    const handleDownload = async (id) => {
        try {
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
            alert('Erreur lors du téléchargement');
        }
    };

    return (
        <div className="app-container">
            <NavigationGestionaire />

            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-overlay"></div>
                <div className="hero-content text-center">
                    <h1 className="hero-title">
                        Gestion des Diplômes
                    </h1>
                    <div className="flex flex-wrap justify-center gap-3 mb-4">
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
                            onClick={() => {
                                setModalError('');
                                setModalSuccess('');
                                setEditingDiploma(null);
                                setFormData({
                                    formation_id: '',
                                    type_formation: '',
                                    formateur_id: '',
                                    numero_diplome: '',
                                    date_delivrance: new Date().toISOString().split('T')[0],
                                    notes: '',
                                    fichier_diplome: null,
                                });
                                setShowCreateModal(true);
                            }}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] hover:from-[#b8860b] hover:to-[#d4af37] text-white rounded-xl shadow-xl hover:shadow-yellow-500/50 transition-all duration-300 text-sm font-bold"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Nouveau Diplôme
                        </button>
                    </div>
                </div>
                {/* Decorative Wave */}
                <div className="hero-wave">
                    <svg className="w-full h-4 sm:h-8" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="currentColor"></path>
                    </svg>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pb-6 sm:pb-16 pt-4 sm:pt-8">

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1a365d] mx-auto"></div>
                        <p className="mt-4 text-[#78786c] dark:text-[#9D9D99]">Chargement...</p>
                    </div>
                ) : (
                    <>
                        {/* Advanced Filter */}
                        <AdvancedFilter
                            fields={[
                                {
                                    name: 'search',
                                    label: 'Recherche',
                                    type: 'text',
                                    placeholder: 'Numéro, Formation, Formateur...',
                                    icon: '🔎'
                                },
                                {
                                    name: 'formateur',
                                    label: 'Formateur',
                                    type: 'text',
                                    placeholder: 'Nom ou ID du formateur...',
                                    icon: '👤'
                                },
                                {
                                    name: 'has_file',
                                    label: 'Fichier',
                                    type: 'select',
                                    icon: '📎',
                                    options: [
                                        { value: 'with', label: 'Avec fichier' },
                                        { value: 'without', label: 'Sans fichier' }
                                    ]
                                },
                                {
                                    name: 'date_delivrance',
                                    label: 'Date de délivrance',
                                    type: 'date',
                                    icon: '📅'
                                }
                            ]}
                            onFilter={(filters) => setAppliedFilters(filters)}
                            onReset={() => setAppliedFilters({})}
                        />

                        {(() => {
                            const normalizedQuery = (appliedFilters.search || '').trim().toLowerCase();
                            const filtered = (diplomas || []).filter((d) => {
                                // Formateur text filter (matches name or numeric ID)
                                if (appliedFilters.formateur) {
                                    const formateurNeedle = String(appliedFilters.formateur).trim().toLowerCase();
                                    const formateurHayName = (d.formateur?.nom || '').toLowerCase();
                                    const formateurHayId = String(d.formateur_id || '').toLowerCase();
                                    const formateurHayFormateurId = String(d.formateur?.identifiant_formateur || '').toLowerCase();
                                    if (
                                        !formateurHayName.includes(formateurNeedle) &&
                                        !formateurHayId.includes(formateurNeedle) &&
                                        !(formateurHayFormateurId && formateurHayFormateurId.includes(formateurNeedle))
                                    ) {
                                        return false;
                                    }
                                }
                                if (appliedFilters.has_file === 'with' && !d.fichier_diplome) return false;
                                if (appliedFilters.has_file === 'without' && d.fichier_diplome) return false;
                                if (appliedFilters.date_delivrance) {
                                    if (!d.date_deliv) return false;
                                    const dDate = new Date(d.date_deliv);
                                    if (isNaN(dDate.getTime())) return false;
                                    const y = dDate.getFullYear();
                                    const m = String(dDate.getMonth() + 1).padStart(2, '0');
                                    const da = String(dDate.getDate()).padStart(2, '0');
                                    const iso = `${y}-${m}-${da}`;
                                    if (iso !== appliedFilters.date_delivrance) return false;
                                }
                                if (normalizedQuery) {
                                    const hay = [
                                        d.num_diplome || '',
                                        d.formation?.titre || '',
                                        d.titre || '',
                                        d.formateur?.nom || ''
                                    ].join(' ').toLowerCase();
                                    if (!hay.includes(normalizedQuery)) return false;
                                }
                                return true;
                            });

                            if (filtered.length === 0) {
                                return (
                                    <div className="bg-white/95 dark:bg-[#161615]/95 rounded-xl shadow-md sm:rounded-2xl sm:shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 overflow-hidden">
                                        <div className="text-center py-16">
                                            <div className="w-24 h-24 bg-gradient-to-br from-[#1a365d] to-[#2d3748] rounded-2xl flex items-center justify-center text-white text-4xl mb-6 mx-auto shadow-xl">
                                                🎓
                                            </div>
                                            <h3 className="text-xl font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">
                                                Aucun diplôme trouvé
                                            </h3>
                                            <p className="text-sm text-[#78786c] dark:text-[#9D9D99]">
                                                Il n'y a actuellement aucun diplôme dans le système.
                                            </p>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div className="bg-white/95 dark:bg-[#161615]/95 rounded-xl shadow-md sm:rounded-2xl sm:shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[980px]">
                                            <thead>
                                                <tr className="sc-table-header-gradient text-white">
                                                    <th className="px-6 py-4 text-center text-sm font-semibold">Numéro</th>
                                                    <th className="px-6 py-4 text-center text-sm font-semibold">Formation</th>
                                                    <th className="px-6 py-4 text-center text-sm font-semibold">Formateur</th>
                                                    <th className="px-6 py-4 text-center text-sm font-semibold">Date de délivrance</th>
                                                    <th className="px-6 py-4 text-center text-sm font-semibold">Fichier</th>
                                                    <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {filtered.map((diploma) => (
                                            <tr key={diploma.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-6 py-4 text-center text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC]">
                                                    {diploma.num_diplome || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm text-[#1b1b18] dark:text-[#EDEDEC]">
                                                    {diploma.formation?.titre || 
                                                     diploma.formation_promotion?.titre || 
                                                     (diploma.formation_pedagogique ? 'Formation Pédagogique' : null) ||
                                                     diploma.titre || 
                                                     'N/A'}
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm text-[#1b1b18] dark:text-[#EDEDEC]">
                                                    {diploma.formateur?.nom || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm text-[#78786c] dark:text-[#9D9D99]">
                                                    {diploma.date_deliv ? (() => {
                                                        const date = new Date(diploma.date_deliv);
                                                        return isNaN(date.getTime()) ? 'Date invalide' : date.toLocaleDateString('fr-FR');
                                                    })() : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {diploma.fichier_diplome ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/15 ring-1 ring-emerald-500/20 shadow-sm">
                                                            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                                <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.414l-7.01 7.01a1 1 0 01-1.414 0L3.296 8.72a1 1 0 111.414-1.415l3.156 3.157 6.303-6.303a1 1 0 011.535.131z" clipRule="evenodd" />
                                                            </svg>
                                                            Disponible
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 ring-1 ring-gray-400/20 shadow-sm">
                                                            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.536-10.95a.75.75 0 10-1.06-1.06L10 8.464 7.525 5.99a.75.75 0 00-1.06 1.06L8.939 9.525l-2.474 2.475a.75.75 0 101.06 1.06L10 10.586l2.475 2.474a.75.75 0 001.06-1.06l-2.474-2.475 2.474-2.475z" clipRule="evenodd" />
                                                            </svg>
                                                            Aucun fichier
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center gap-2 justify-center">
                                                        <button
                                                            onClick={() => handleEdit(diploma)}
                                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                        >
                                                            Modifier
                                                        </button>
                                                        {diploma.fichier_diplome && (
                                                            <button
                                                                onClick={() => handleDownload(diploma.id)}
                                                                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                                                            >
                                                                Télécharger
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(diploma)}
                                                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                        >
                                                            Supprimer
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })()}
                    </>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={handleCloseModal}>
                    <div className="bg-white dark:bg-[#161615] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] px-6 py-4 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-white">{editingDiploma ? 'Modifier le Diplôme' : 'Créer un Nouveau Diplôme'}</h2>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 hover:bg-white/20 rounded-xl transition-all text-white"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Error Message in Modal */}
                            {modalError && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-400">
                                    {modalError}
                                </div>
                            )}
                            {/* Success Message in Modal */}
                            {modalSuccess && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-800 dark:text-green-400">
                                    {modalSuccess}
                                </div>
                            )}
                            {/* Formateur Selection */}
                            <div>
                                <label className="block text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC] mb-2">
                                    Formateur *
                                </label>
                                <select
                                    required
                                    disabled={!!editingDiploma}
                                    value={formData.formateur_id}
                                    onChange={(e) => handleFormateurChange(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="" disabled>Sélectionner un formateur</option>
                                    {formateurs.map((formateur) => (
                                        <option key={formateur.id} value={formateur.id}>
                                            {formateur.nom} {formateur.formateur_id && `(${formateur.formateur_id})`}
                                        </option>
                                    ))}
                                </select>
                                {editingDiploma && (
                                    <p className="mt-1 text-xs text-[#78786c] dark:text-[#9D9D99]">Le formateur ne peut pas être modifié</p>
                                )}
                            </div>

                            {/* Training Selection */}
                            {formData.formateur_id && (
                                <div>
                                    <label className="block text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC] mb-2">
                                        Formation Terminée *
                                    </label>
                                    {loadingTrainings ? (
                                        <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-center">
                                            <span className="text-[#78786c] dark:text-[#9D9D99]">Chargement des formations...</span>
                                        </div>
                                    ) : (
                                        <div>
                                            <select
                                                required
                                                disabled={completedTrainings.length === 0}
                                                value={formData.formation_id || formData.type_formation || ''}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    
                                                    if (!value) {
                                                        setFormData({ ...formData, formation_id: '', type_formation: '' });
                                                        setSelectedTraining(null);
                                                        return;
                                                    }
                                                    
                                                    // Try to find by ID first
                                                    let training = completedTrainings.find(t => {
                                                        if (t.id) {
                                                            return t.id.toString() === value;
                                                        }
                                                        return false;
                                                    });
                                                    
                                                    // If not found by ID, try to find by type
                                                    if (!training) {
                                                        training = completedTrainings.find(t => !t.id && t.type === value);
                                                    }
                                                    
                                                    if (training) {
                                                        if (training.type === 'optionnelle') {
                                                            // For normal trainings, always use the ID
                                                            setFormData({ 
                                                                ...formData, 
                                                                formation_id: training.id.toString(), 
                                                                type_formation: '' 
                                                            });
                                                            setSelectedTraining(training);
                                                        } else {
                                                            // For pedagogical/promotion, use ID if available, otherwise use type
                                                            if (training.id) {
                                                                setFormData({ 
                                                                    ...formData, 
                                                                    formation_id: training.id.toString(), 
                                                                    type_formation: training.type,
                                                                    promotion_type: training.donnees_promotion?.type || training.type_promotion || ''
                                                                });
                                                            } else {
                                                                setFormData({ 
                                                                    ...formData, 
                                                                    formation_id: '', 
                                                                    type_formation: training.type,
                                                                    promotion_type: training.donnees_promotion?.type || training.type_promotion || ''
                                                                });
                                                            }
                                                            setSelectedTraining(training);
                                                        }
                                                    }
                                                }}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <option value="" disabled>{completedTrainings.length > 0 ? 'Sélectionner une formation' : 'Aucune formation disponible'}</option>
                                                {completedTrainings.length > 0 ? (
                                                    completedTrainings.map((training, index) => {
                                                        // Use training ID if available, otherwise use type
                                                        const optionValue = training.id ? training.id.toString() : training.type;
                                                        let displayText = training.titre;
                                                        
                                                        // Add type indicator for better clarity
                                                        if (training.type === 'optionnelle') {
                                                            displayText = `📚 ${training.titre}`;
                                                        } else if (training.type === 'pedagogique') {
                                                            displayText = `🎓 ${training.titre}`;
                                                        } else if (training.type === 'promotion') {
                                                            if (training.donnees_promotion?.type === '5_ans') {
                                                                displayText = `⭐ ${training.titre} (PSP1)`;
                                                            } else if (training.donnees_promotion?.type === '10_ans') {
                                                                displayText = `🌟 ${training.titre} (PSP2)`;
                                                            } else {
                                                                displayText = `⭐ ${training.titre}`;
                                                            }
                                                        }
                                                        
                                                        // Add date if available
                                                        if (training.date_fin) {
                                                            displayText += ` - ${new Date(training.date_fin).toLocaleDateString('fr-FR')}`;
                                                        }
                                                        
                                                        return (
                                                            <option key={training.id || training.type || index} value={optionValue}>
                                                                {displayText}
                                                            </option>
                                                        );
                                                    })
                                                ) : null}
                                            </select>
                                            {completedTrainings.length === 0 && (
                                                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                                                    ⚠️ Aucune formation terminée disponible pour ce formateur.
                                                </p>
                                            )}
                                            {completedTrainings.length > 0 && (
                                                <p className="mt-2 text-xs text-[#78786c] dark:text-[#9D9D99]">
                                                    {completedTrainings.length} formation{completedTrainings.length > 1 ? 's' : ''} disponible{completedTrainings.length > 1 ? 's' : ''}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                </div>
                            )}

                            {/* Diploma Number */}
                            <div>
                                <label className="block text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC] mb-2">
                                    Numéro de Diplôme (optionnel, généré automatiquement si vide)
                                </label>
                                <input
                                    type="text"
                                    value={formData.numero_diplome}
                                    onChange={(e) => setFormData({ ...formData, numero_diplome: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                                    placeholder="DIP-XXXXXXXX"
                                />
                            </div>

                            {/* Issue Date */}
                            <div>
                                <label className="block text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC] mb-2">
                                    Date de délivrance *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.date_delivrance}
                                    onChange={(e) => setFormData({ ...formData, date_delivrance: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                                />
                            </div>

                            {/* Année d'admission & Réf. décision */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC] mb-2">
                                        Année d'admission *
                                    </label>
                                    <input
                                        type="number"
                                        min="1900"
                                        max="2100"
                                        required
                                        value={formData.ann_adm}
                                        onChange={(e) => setFormData({ ...formData, ann_adm: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                                        placeholder="2025"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC] mb-2">
                                        Référence de décision *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.ref_decision}
                                        onChange={(e) => setFormData({ ...formData, ref_decision: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                                        placeholder="Numéro de décision"
                                    />
                                </div>
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC] mb-2">
                                    Fichier Diplôme (PDF, DOC, JPG, PNG - Max 10MB) *
                                </label>
                                <input
                                    type="file"
                                    required={!editingDiploma}
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    onChange={(e) => setFormData({ ...formData, fichier_diplome: e.target.files[0] })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-all font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1a365d] to-[#2d3748] text-white rounded-xl hover:from-[#2d3748] hover:to-[#1a365d] transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? (editingDiploma ? 'Mise à jour...' : 'Création...') : (editingDiploma ? 'Mettre à jour le Diplôme' : 'Créer le Diplôme')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={showDeleteConfirm}
                onClose={cancelDelete}
                onConfirm={confirmDelete}
                itemName={diplomaToDelete?.num_diplome || 'N/A'}
                itemDetails={
                    <p className="text-sm text-[#78786c] dark:text-[#9D9D99] mt-1">
                        {diplomaToDelete?.formation?.titre || diplomaToDelete?.titre || 'N/A'} - {diplomaToDelete?.formateur?.nom || 'N/A'}
                    </p>
                }
                itemIcon={
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                }
            />

            {/* Message Popup */}
            {showMessage && (
                <div className="fixed top-4 right-4 z-50 animate-slide-in">
                    <div className={`px-6 py-4 rounded-xl shadow-lg border-l-4 flex items-center space-x-3 ${
                        messageType === 'success' 
                            ? 'bg-green-50 border-green-500 text-green-800 dark:bg-green-900/20 dark:border-green-400 dark:text-green-400' 
                            : 'bg-red-50 border-red-500 text-red-800 dark:bg-red-900/20 dark:border-red-400 dark:text-red-400'
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


