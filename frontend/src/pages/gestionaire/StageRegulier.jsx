import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCache } from '../../context/CacheContext';
import NavigationGestionaire from '../../components/GestionaireNav';
import TableSquelette from '../../components/SkeletonTable';
import FiltreAvance from '../../components/AdvancedFilter';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import axios from 'axios';

export default function StageRegulierGestionaire() {
    const { getCachedData, setCachedData, clearCache } = useCache();
    const [trainings, setTrainings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedTraining, setSelectedTraining] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingTraining, setEditingTraining] = useState(null);
    const [formData, setFormData] = useState({
        titre: '',
        description: '',
        date_debut: '',
        date_fin: '',
        duree_heures: '',
        lieu: '',
        participants_max: 30,
        prerequis: '',
        statut: 'en_cours'
    });
    const [saving, setSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [trainingToDelete, setTrainingToDelete] = useState(null);
    const [appliedFilters, setAppliedFilters] = useState({});
    const [editEdtData, setEditEdtData] = useState({
        annee_scolaire: '',
        etablissement: '',
        departement: '',
        specialite: '',
        fichier: null,
    });

    const filteredTrainings = trainings.filter(training => {
        if (appliedFilters.title && !training.titre?.toLowerCase().includes(appliedFilters.title.toLowerCase())) {
            return false;
        }
        if (appliedFilters.location && !training.lieu?.toLowerCase().includes(appliedFilters.location.toLowerCase())) {
            return false;
        }
        if (appliedFilters.description && !training.description?.toLowerCase().includes(appliedFilters.description.toLowerCase())) {
            return false;
        }
        if (appliedFilters.status && appliedFilters.status !== '' && training.statut !== appliedFilters.status) {
            return false;
        }
        if (appliedFilters.start_date && (training.date_deb || training.date_debut) && new Date(training.date_deb || training.date_debut) < new Date(appliedFilters.start_date)) {
            return false;
        }
        if (appliedFilters.end_date && training.date_fin && new Date(training.date_fin) > new Date(appliedFilters.end_date)) {
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
        clearCache('admin_trainings');
        fetchTrainings(true, false);
    }, []);

    const fetchTrainings = async (skipCache = false, silent = false) => {
        try {
            if (!silent) {
                setLoading(true);
            }
            
            if (!skipCache) {
                const cached = getCachedData('admin_trainings');
                if (cached) {
                    setTrainings(cached);
                    if (!silent) {
                        setLoading(false);
                    }
                    return;
                }
            }
            
            const response = await axios.get('/api/formations');
            const allData = response.data.data || [];
            
            const data = allData.filter(t => {
                // Filtrer uniquement les formations optionnelles
                if (t.type && t.type !== 'optionnelle') {
                    return false;
                }
                return true;
            });
            
            setCachedData('admin_trainings', data);
            setTrainings(data);
        } catch (err) {
            console.error(err);
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };


    const getStatusColor = (status) => {
        switch (status) {
            case 'en_cours': return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400';
            case 'termine': return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400';
            default: return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'en_cours': return 'En cours';
            case 'termine': return 'Terminé';
            default: return 'En cours';
        }
    };

    const handleViewDetails = (training) => {
        setSelectedTraining(training);
        setShowDetailsModal(true);
    };

    const closeDetailsModal = () => {
        setShowDetailsModal(false);
        setSelectedTraining(null);
    };

    const handleEdit = (training) => {
        setEditingTraining(training);
        
        const formatDateForInput = (dateValue) => {
            if (!dateValue) return '';
            if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                return dateValue;
            }
            if (typeof dateValue === 'string' && dateValue.includes('T')) {
                return dateValue.split('T')[0];
            }
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
            return '';
        };
        
        setFormData({
            titre: training.titre || '',
            description: training.description || '',
            date_debut: formatDateForInput(training.date_deb || training.date_debut),
            date_fin: formatDateForInput(training.date_fin),
            duree_heures: training.duree_hrs || training.duree_heures || '',
            lieu: training.lieu || '',
            participants_max: training.part_max || training.participants_max || 30,
            prerequis: training.prerequis || '',
            statut: training.statut || 'en_cours'
        });
        const edts = training.emplois_du_temps ?? training.emploisDuTemps;
        const firstEdt = Array.isArray(edts) ? edts[0] : null;
        setEditEdtData({
            annee_scolaire: firstEdt?.annee_scolaire ?? '',
            etablissement: firstEdt?.etablissement ?? '',
            departement: firstEdt?.departement ?? '',
            specialite: firstEdt?.specialite ?? '',
            fichier: null,
        });
        setShowEditModal(true);
    };

    const handleDelete = (training) => {
        setTrainingToDelete(training);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!trainingToDelete) return;
        
        try {
            const trainingTitle = trainingToDelete.titre || trainingToDelete.title || 'Formation';
            setTrainings(prev => prev.filter(t => t.id !== trainingToDelete.id));
            setAppliedFilters({});
            
            const response = await axios.delete(`/api/formations/${trainingToDelete.id}`);
            
            if (response.data.success) {
                clearCache('admin_trainings');
                clearCache('gestionaire_dashboard_stats');
                showMessagePopup('Formation supprimée avec succès !', 'success');
                setTimeout(() => {
                    fetchTrainings(true, true);
                }, 500);
            } else {
                fetchTrainings(true, true);
                showMessagePopup(response.data.message || 'Erreur lors de la suppression de la formation', 'error');
            }
        } catch (error) {
            console.error('Erreur lors de la suppression de la formation:', error);
            fetchTrainings(true, true);
            
            let messageErreur = 'Erreur lors de la suppression de la formation';
            if (error.response?.data?.message) {
                messageErreur = error.response.data.message;
            } else if (error.response?.status === 403) {
                messageErreur = 'Vous n\'avez pas les permissions pour supprimer cette formation';
            } else if (error.response?.status === 404) {
                messageErreur = 'Formation non trouvée';
            } else if (error.message) {
                messageErreur = error.message;
            }
            
            showMessagePopup(messageErreur, 'error');
        } finally {
            setShowDeleteConfirm(false);
            setTrainingToDelete(null);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setTrainingToDelete(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        try {
            if (editEdtData.fichier) {
                const formDataToSend = new FormData();
                formDataToSend.append('_method', 'PUT');
                formDataToSend.append('titre', formData.titre);
                formDataToSend.append('description', formData.description);
                formDataToSend.append('date_deb', formData.date_debut);
                formDataToSend.append('date_fin', formData.date_fin);
                if (formData.duree_heures) formDataToSend.append('duree_hrs', String(formData.duree_heures));
                formDataToSend.append('lieu', formData.lieu);
                formDataToSend.append('part_max', String(formData.participants_max));
                formDataToSend.append('prerequis', formData.prerequis || '');
                formDataToSend.append('statut', formData.statut);
                formDataToSend.append('emploi_du_temps', editEdtData.fichier);
                if (editEdtData.annee_scolaire) formDataToSend.append('edt_annee_scolaire', editEdtData.annee_scolaire);
                if (editEdtData.etablissement) formDataToSend.append('edt_etablissement', editEdtData.etablissement);
                if (editEdtData.departement) formDataToSend.append('edt_departement', editEdtData.departement);
                if (editEdtData.specialite) formDataToSend.append('edt_specialite', editEdtData.specialite);
                await axios.post(`/api/formations/${editingTraining.id}`, formDataToSend);
            } else {
                const payload = {
                    titre: formData.titre,
                    description: formData.description,
                    date_deb: formData.date_debut,
                    date_fin: formData.date_fin,
                    duree_hrs: formData.duree_heures ? parseInt(formData.duree_heures) : null,
                    lieu: formData.lieu,
                    part_max: parseInt(formData.participants_max),
                    prerequis: formData.prerequis || null,
                    statut: formData.statut
                };
                await axios.put(`/api/formations/${editingTraining.id}`, payload);
            }
            
            clearCache('admin_trainings');
            clearCache('gestionaire_dashboard_stats');
            clearCache('formateur_trainings');
            
            setShowEditModal(false);
            setEditingTraining(null);
            setEditEdtData({ annee_scolaire: '', etablissement: '', departement: '', specialite: '', fichier: null });
            showMessagePopup('Formation modifiée avec succès !', 'success');
            setAppliedFilters({});
            await fetchTrainings(true, false);
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la formation:', error);
            fetchTrainings(true, true);
            const msg = error.response?.data?.message
                || (error.response?.data?.errors && Object.values(error.response.data.errors).flat().join(', '))
                || 'Erreur lors de la modification de la formation';
            showMessagePopup(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setShowEditModal(false);
        setEditingTraining(null);
        setEditEdtData({ annee_scolaire: '', etablissement: '', departement: '', specialite: '', fichier: null });
        setFormData({
            titre: '',
            description: '',
            date_debut: '',
            date_fin: '',
            duree_heures: '',
            lieu: '',
            participants_max: 30,
            prerequis: '',
            statut: 'en_cours'
        });
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

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
                            Formations
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
                            <Link
                                to="/gestionaire/formations/creer"
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] hover:from-[#b8860b] hover:to-[#d4af37] text-white rounded-xl shadow-xl hover:shadow-yellow-500/50 transition-all duration-300 text-sm font-bold"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Créer une Formation
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
                            name: 'location',
                            label: 'Lieu',
                            type: 'text',
                            placeholder: 'Rechercher par lieu...',
                            icon: '📍'
                        },
                        {
                            name: 'description',
                            label: 'Description',
                            type: 'text',
                            placeholder: 'Rechercher dans la description...',
                            icon: '📝'
                        },
                        {
                            name: 'status',
                            label: 'Statut',
                            type: 'select',
                            icon: '📊',
                            options: [
                                { value: 'en_cours', label: '✅ En cours' },
                                { value: 'termine', label: '🎓 Terminé' }
                            ]
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

                {/* Résumé des Résultats */}
                {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 0 && (
                    <div className="mb-6">
                        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-yellow-200 dark:border-gray-600">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Résultats</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {filteredTrainings.length} formation{filteredTrainings.length > 1 ? 's' : ''} trouvée{filteredTrainings.length > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-medium">
                                        {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length} filtre{Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 1 ? 's' : ''} actif{Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading ? (
                    <TableSquelette rows={6} />
                ) : filteredTrainings.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-semibold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">Aucune formation trouvée</h3>
                        <p className="text-lg text-[#78786c] dark:text-[#9D9D99] mb-8">
                            {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 0 
                                ? "Aucune formation ne correspond aux critères de recherche"
                                : "Commencez par créer votre première formation"}
                        </p>
                        <Link
                            to="/gestionaire/formations/creer"
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] hover:from-[#b8860b] hover:to-[#d4af37] text-white rounded-xl shadow-xl hover:shadow-yellow-500/50 transition-all duration-300 text-sm font-bold"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Créer la première formation
                        </Link>
                    </div>
                ) : (
                    <div className="bg-white/80 dark:bg-[#161615]/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 overflow-hidden">
                        <div className="overflow-x-auto">
                            {/* List Header */}
                            <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] px-6 py-4">
                                <div className="grid min-w-[980px] grid-cols-11 gap-2 text-white font-semibold">
                                    <div className="col-span-1 text-center">#</div>
                                    <div className="col-span-3 text-center">Titre de la Formation</div>
                                    <div className="col-span-1 text-center">Places</div>
                                    <div className="col-span-1 text-center">Demandes de formation</div>
                                    <div className="col-span-1 text-center">Statut</div>
                                    <div className="col-span-4 text-center">Actions</div>
                                </div>
                            </div>
                            
                            {/* List Items */}
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredTrainings.map((training, index) => (
                                    <div
                                        key={`training-${training.id}`}
                                        className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                                    >
                                        <div className="grid min-w-[980px] grid-cols-11 gap-2 items-center">
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
                                            
                                            <div className="col-span-1 text-center">
                                                <div className="space-y-1">
                                                    <p className={`text-sm font-medium ${training.is_full || training.remaining_slots === 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                                        {training.is_full || training.remaining_slots === 0 ? '0' : (training.remaining_slots || training.part_max || training.participants_max)} disponibles
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                        {training.accepted_count || 0} accepté{training.accepted_count !== 1 ? 's' : ''} / {training.part_max || training.participants_max} max
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="col-span-1 text-center">
                                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                                    {training.candidatures?.length || 0}
                                                </p>
                                            </div>
                                            
                                            <div className="col-span-1 text-center">
                                                <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(training.statut)}`}>
                                                    {getStatusText(training.statut)}
                                                </span>
                                            </div>

                                            <div className="col-span-4 text-center flex flex-wrap gap-2 justify-center items-center">
                                                <button
                                                    onClick={() => handleViewDetails(training)}
                                                    className="px-3 py-1 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                >
                                                    Détails
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(training)}
                                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                >
                                                    Modifier
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(training)}
                                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
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

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-[#161615] rounded-2xl shadow-2xl border border-[#e3e3e0] dark:border-[#3E3E3A] w-full max-w-4xl max-h-[90vh] overflow-y-auto my-4">
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] p-6 text-white rounded-t-2xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">Modifier la Formation</h2>
                                    <p className="text-white/80 text-sm">Mettez à jour les informations de la formation</p>
                                </div>
                                <button
                                    onClick={handleCancel}
                                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="p-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Titre de la formation *
                                    </label>
                                    <input
                                        type="text"
                                        name="titre"
                                        value={formData.titre}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-white dark:bg-[#0a0a0a] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Description *
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        required
                                        rows={2}
                                        className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-white dark:bg-[#0a0a0a] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Lieu *
                                    </label>
                                    <input
                                        type="text"
                                        name="lieu"
                                        value={formData.lieu}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-white dark:bg-[#0a0a0a] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Date de début *
                                    </label>
                                    <input
                                        type="date"
                                        name="date_debut"
                                        value={formData.date_debut}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-white dark:bg-[#0a0a0a] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Date de fin *
                                    </label>
                                    <input
                                        type="date"
                                        name="date_fin"
                                        value={formData.date_fin}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-white dark:bg-[#0a0a0a] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Durée (heures)
                                    </label>
                                    <input
                                        type="number"
                                        name="duree_heures"
                                        value={formData.duree_heures}
                                        onChange={handleInputChange}
                                        min="1"
                                        className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-white dark:bg-[#0a0a0a] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Nombre max de participants *
                                    </label>
                                    <input
                                        type="number"
                                        name="participants_max"
                                        value={formData.participants_max}
                                        onChange={handleInputChange}
                                        required
                                        min="1"
                                        max="100"
                                        className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-white dark:bg-[#0a0a0a] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Statut
                                    </label>
                                    <select
                                        name="statut"
                                        value={formData.statut}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-white dark:bg-[#0a0a0a] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20"
                                    >
                                        <option value="en_cours">En cours</option>
                                        <option value="termine">Terminé</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Prérequis
                                    </label>
                                    <textarea
                                        name="prerequis"
                                        value={formData.prerequis}
                                        onChange={handleInputChange}
                                        rows={1}
                                        className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-white dark:bg-[#0a0a0a] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20"
                                    />
                                </div>

                                {/* Emploi du temps (optionnel) - même modèle que Créer une formation */}
                                <div className="md:col-span-2 border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50/60 dark:bg-gray-900/40 space-y-3">
                                    <p className="text-sm font-semibold text-[#1b1b18] dark:text-[#EDEDEC]">
                                        Emploi du temps (optionnel)
                                    </p>
                                    <p className="text-xs text-[#78786c] dark:text-[#9D9D99]">
                                        Ajouter ou remplacer l&apos;emploi du temps. Il sera partagé avec les candidats acceptés. Même formulaire qu&apos;à la création.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99] mb-1">
                                                Année scolaire (année uniquement)
                                            </label>
                                            <input
                                                type="number"
                                                min="1900"
                                                max="2100"
                                                value={editEdtData.annee_scolaire}
                                                onChange={(e) => setEditEdtData({ ...editEdtData, annee_scolaire: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                                                placeholder="2025"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99] mb-1">
                                                Établissement
                                            </label>
                                            <input
                                                type="text"
                                                value={editEdtData.etablissement}
                                                onChange={(e) => setEditEdtData({ ...editEdtData, etablissement: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                                                placeholder="Ex: Institut Supérieur StageConnect"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99] mb-1">
                                                Département
                                            </label>
                                            <input
                                                type="text"
                                                value={editEdtData.departement}
                                                onChange={(e) => setEditEdtData({ ...editEdtData, departement: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                                                placeholder="Ex: Informatique"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99] mb-1">
                                                Spécialité
                                            </label>
                                            <input
                                                type="text"
                                                value={editEdtData.specialite}
                                                onChange={(e) => setEditEdtData({ ...editEdtData, specialite: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                                                placeholder="Ex: Pédagogie"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99] mb-1">
                                            Fichier emploi du temps
                                        </label>
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,.xls,.xlsx"
                                            onChange={(e) => setEditEdtData({ ...editEdtData, fichier: e.target.files?.[0] || null })}
                                            className="block w-full text-sm text-gray-500 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#1a365d] file:text-white hover:file:bg-[#2d3748] file:cursor-pointer cursor-pointer"
                                        />
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Formats acceptés: PDF, DOC, DOCX, XLS, XLSX
                                        </p>
                                        {editEdtData.fichier && (
                                            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                                                ✓ Fichier sélectionné: {editEdtData.fichier.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-all font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white rounded-xl transition-all disabled:opacity-50 font-medium shadow-lg"
                                >
                                    {saving ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Sauvegarde...
                                        </span>
                                    ) : (
                                        'Sauvegarder'
                                    )}
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
                itemName={trainingToDelete?.titre}
                itemDetails={
                    <p className="text-sm text-[#78786c] dark:text-[#9D9D99] mt-1">
                        {trainingToDelete?.lieu}
                    </p>
                }
                itemIcon={
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                }
            />

            {/* Training Details Modal */}
            {showDetailsModal && selectedTraining && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#161615] rounded-2xl shadow-2xl border border-white/20 dark:border-[#3E3E3A]/50 w-full max-w-5xl">
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] p-4 text-white rounded-t-2xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">Détails de la Formation</h2>
                                    <p className="text-white/80 text-sm">Informations complètes de la formation</p>
                                </div>
                                <button
                                    onClick={closeDetailsModal}
                                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="space-y-3">
                                    <h3 className="text-lg font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">Informations Générales</h3>
                                    <div className="space-y-2">
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99]">Titre</label>
                                            <p className="text-sm font-semibold text-[#1b1b18] dark:text-[#EDEDEC]">{selectedTraining.titre}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99]">Spécialité</label>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99]">Lieu</label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">{selectedTraining.lieu}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99]">Statut</label>
                                            <span className={`px-2 py-1 text-xs rounded-lg font-medium ${getStatusColor(selectedTraining.statut)}`}>
                                                {getStatusText(selectedTraining.statut)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-lg font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">Dates et Participants</h3>
                                    <div className="space-y-2">
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99]">Date de début</label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">
                                                {(() => {
                                                    const dateDeb = selectedTraining.date_deb || selectedTraining.date_debut;
                                                    if (!dateDeb) return 'N/A';
                                                    try {
                                                        return new Date(dateDeb).toLocaleDateString('fr-FR', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric'
                                                        });
                                                    } catch (e) {
                                                        return 'N/A';
                                                    }
                                                })()}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99]">Date de fin</label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">
                                                {(() => {
                                                    const dateFin = selectedTraining.date_fin;
                                                    if (!dateFin) return 'N/A';
                                                    try {
                                                        return new Date(dateFin).toLocaleDateString('fr-FR', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric'
                                                        });
                                                    } catch (e) {
                                                        return 'N/A';
                                                    }
                                                })()}
                                            </p>
                                        </div>
                                        {(selectedTraining.duree_hrs || selectedTraining.duree_heures) && (
                                            <div>
                                                <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99]">Durée</label>
                                                <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">{(selectedTraining.duree_hrs || selectedTraining.duree_heures)} heures</p>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99]">Participants max</label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">{(selectedTraining.part_max || selectedTraining.participants_max || 'N/A')} {selectedTraining.part_max || selectedTraining.participants_max ? 'participants' : ''}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-lg font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">Description</h3>
                                    <div>
                                        <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC] leading-relaxed mb-3">{selectedTraining.description}</p>
                                        {selectedTraining.prerequis && (
                                            <div>
                                                <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99] mb-1">Prérequis</label>
                                                <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC] leading-relaxed">{selectedTraining.prerequis}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

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

