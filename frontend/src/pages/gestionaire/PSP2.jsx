import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NavigationGestionaire from '../../components/GestionaireNav';
import TableSquelette from '../../components/SkeletonTable';
import FiltreAvance from '../../components/AdvancedFilter';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import axios from 'axios';

export default function PSP2Gestionaire() {
    const [promotionTrainings, setPromotionTrainings] = useState([]);
    const [loadingPromotion, setLoadingPromotion] = useState(false);
    const [promotionFilters, setPromotionFilters] = useState({});
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedFormateur, setSelectedFormateur] = useState(null);
    const [createFormData, setCreateFormData] = useState({
        titre: '',
        description: '',
        type_promotion: '10_years',
        date_deb: '',
        date_fin: '',
        lieu: '',
        statut: 'en_cours',
    });
    const [createScheduleFile, setCreateScheduleFile] = useState(null);
    const [createEdtMeta, setCreateEdtMeta] = useState({
        annee_scolaire: '',
        etablissement: '',
        departement: '',
        specialite: '',
    });
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedFormation, setSelectedFormation] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({
        titre: '',
        description: '',
        date_deb: '',
        date_fin: '',
        lieu: '',
        statut: 'en_cours',
    });
    const [editEdtData, setEditEdtData] = useState({
        annee_scolaire: '',
        etablissement: '',
        departement: '',
        specialite: '',
        fichier: null,
    });
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [promotionToCancel, setPromotionToCancel] = useState(null);

    const showMessagePopup = (message, type = 'success') => {
        setMessage(message);
        setMessageType(type);
        setShowMessage(true);
        setTimeout(() => {
            setShowMessage(false);
        }, 4000);
    };

    useEffect(() => {
        fetchPromotionTrainings();
    }, []);

    const fetchPromotionTrainings = async () => {
        setLoadingPromotion(true);
        try {
            // Récupérer les formateurs avec formation de promotion 10 ans (PSP2)
            const response = await axios.get('/api/admin/formations-promotion?type_promotion=10_ans');
            setPromotionTrainings(response.data.data || []);
        } catch (error) {
            console.error('Erreur lors de la récupération des formations de promotion:', error);
            showMessagePopup('Erreur lors du chargement des formations de promotion', 'error');
        } finally {
            setLoadingPromotion(false);
        }
    };

    const filteredPromotionTrainings = promotionTrainings.filter(teacher => {
        if (promotionFilters.teacher_name && !teacher.teacher_name?.toLowerCase().includes(promotionFilters.teacher_name.toLowerCase())) {
            return false;
        }
        if (promotionFilters.email && !teacher.email?.toLowerCase().includes(promotionFilters.email.toLowerCase())) {
            return false;
        }
        if (promotionFilters.titre && teacher.formation_promotion && !teacher.formation_promotion.titre?.toLowerCase().includes(promotionFilters.titre.toLowerCase())) {
            return false;
        }
        if (promotionFilters.statut && promotionFilters.statut !== '' && (!teacher.formation_promotion || teacher.formation_promotion.statut !== promotionFilters.statut)) {
            return false;
        }
        if (promotionFilters.grade && !teacher.grade?.toLowerCase().includes(promotionFilters.grade.toLowerCase())) {
            return false;
        }
        return true;
    });

    const handleDownloadPromotionSchedule = async (teacherId) => {
        try {
            const response = await axios.get(`/api/admin/formations-promotion/${teacherId}/emploi-du-temps/telecharger`, {
                responseType: 'blob',
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `emploi-du-temps-promotion-${teacherId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            showMessagePopup('Emploi du temps téléchargé avec succès!', 'success');
        } catch (error) {
            console.error('Erreur lors du téléchargement:', error);
            const apiMsg = error.response?.data?.message || 'Erreur lors du téléchargement';
            showMessagePopup(apiMsg, 'error');
        }
    };


    const handleStartPromotion = async (teacherId, promotionType) => {
        try {
            await axios.post(`/api/admin/formations-promotion/${teacherId}/demarrer`, {
                promotion_type: promotionType // '5_years' or '10_years'
            }, {
                headers: { 'Content-Type': 'application/json' }
            });
            showMessagePopup(`Formation de promotion ${promotionType === '5_years' ? '5 ans' : '10 ans'} démarrée avec succès! Notification et email envoyés au formateur.`, 'success');
            await fetchPromotionTrainings();
        } catch (error) {
            console.error('Erreur lors du démarrage de la formation de promotion:', error);
            const errorMessage = error.response?.data?.message || 'Erreur lors du démarrage de la formation';
            showMessagePopup(errorMessage, 'error');
        }
    };

    const handleOpenCreateModal = (teacher) => {
        setSelectedFormateur(teacher);
        setCreateFormData({
            titre: '',
            description: '',
            type_promotion: '10_years',
            date_deb: '',
            date_fin: '',
            lieu: '',
            statut: 'en_cours',
        });
        setCreateScheduleFile(null);
        setCreateEdtMeta({
            annee_scolaire: '',
            etablissement: '',
            departement: '',
            specialite: '',
        });
        setShowCreateModal(true);
    };

    const handleCreatePromotion = async () => {
        if (!selectedFormateur) return;

        if (!createFormData.titre || !createFormData.date_deb || !createFormData.date_fin) {
            showMessagePopup('Veuillez remplir tous les champs obligatoires', 'error');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('formateur_id', selectedFormateur.id);
            formData.append('titre', createFormData.titre);
            formData.append('description', createFormData.description || '');
            formData.append('type_promotion', createFormData.type_promotion);
            formData.append('date_deb', createFormData.date_deb);
            formData.append('date_fin', createFormData.date_fin);
            formData.append('lieu', createFormData.lieu || '');
            formData.append('statut', createFormData.statut);
            
            if (createScheduleFile) {
                formData.append('emploi_du_temps', createScheduleFile);
                if (createEdtMeta.annee_scolaire) {
                    formData.append('edt_annee_scolaire', createEdtMeta.annee_scolaire);
                }
                if (createEdtMeta.etablissement) {
                    formData.append('edt_etablissement', createEdtMeta.etablissement);
                }
                if (createEdtMeta.departement) {
                    formData.append('edt_departement', createEdtMeta.departement);
                }
                if (createEdtMeta.specialite) {
                    formData.append('edt_specialite', createEdtMeta.specialite);
                }
            }

            await axios.post('/api/admin/formations-promotion', formData);
            // Après création, recharger entièrement la page
            window.location.reload();
        } catch (error) {
            console.error('Erreur lors de la création:', error);
            const apiMsg = error.response?.data?.message || 'Erreur lors de la création';
            showMessagePopup(apiMsg, 'error');
        }
    };

    const handleCancelPromotion = (teacher) => {
        if (!teacher.formation_promotion || !teacher.formation_promotion.id) {
            showMessagePopup('Aucune formation de promotion à annuler', 'error');
            return;
        }
        setPromotionToCancel(teacher);
        setShowCancelConfirm(true);
    };

    const cancelCancelConfirm = () => {
        setShowCancelConfirm(false);
        setPromotionToCancel(null);
    };

    const confirmCancel = async () => {
        if (!promotionToCancel || !promotionToCancel.formation_promotion || !promotionToCancel.formation_promotion.id) {
            return;
        }

        try {
            await axios.delete(`/api/admin/formations-promotion/${promotionToCancel.formation_promotion.id}`);
            showMessagePopup('Formation de promotion annulée avec succès!', 'success');
            setShowCancelConfirm(false);
            setPromotionToCancel(null);
            await fetchPromotionTrainings();
        } catch (error) {
            console.error('Erreur lors de l\'annulation:', error);
            const apiMsg = error.response?.data?.message || 'Erreur lors de l\'annulation';
            showMessagePopup(apiMsg, 'error');
        }
    };

    const handleOpenEditModal = (teacher) => {
        if (teacher.formation_promotion) {
            setSelectedFormateur(teacher);
            setEditFormData({
                titre: teacher.formation_promotion.titre || '',
                description: teacher.formation_promotion.description || '',
                date_deb: teacher.formation_promotion.date_deb || '',
                date_fin: teacher.formation_promotion.date_fin || '',
                lieu: teacher.formation_promotion.lieu || '',
                statut: teacher.formation_promotion.statut || 'en_cours',
            });
            setEditEdtData({ annee_scolaire: '', etablissement: '', departement: '', specialite: '', fichier: null });
            setShowEditModal(true);
        }
    };

    const handleUpdatePromotion = async () => {
        if (!selectedFormateur || !selectedFormateur.formation_promotion) return;

        if (!editFormData.titre || !editFormData.date_deb || !editFormData.date_fin) {
            showMessagePopup('Veuillez remplir tous les champs obligatoires', 'error');
            return;
        }

        const formationId = selectedFormateur.formation_promotion.id;
        try {
            if (editEdtData.fichier) {
                const formDataToSend = new FormData();
                formDataToSend.append('_method', 'PUT');
                formDataToSend.append('titre', editFormData.titre);
                formDataToSend.append('description', editFormData.description || '');
                formDataToSend.append('date_deb', editFormData.date_deb);
                formDataToSend.append('date_fin', editFormData.date_fin);
                formDataToSend.append('lieu', editFormData.lieu || '');
                formDataToSend.append('statut', editFormData.statut);
                formDataToSend.append('emploi_du_temps', editEdtData.fichier);
                if (editEdtData.annee_scolaire) formDataToSend.append('edt_annee_scolaire', editEdtData.annee_scolaire);
                if (editEdtData.etablissement) formDataToSend.append('edt_etablissement', editEdtData.etablissement);
                if (editEdtData.departement) formDataToSend.append('edt_departement', editEdtData.departement);
                if (editEdtData.specialite) formDataToSend.append('edt_specialite', editEdtData.specialite);
                await axios.post(`/api/admin/formations-promotion/${formationId}`, formDataToSend);
            } else {
                await axios.put(`/api/admin/formations-promotion/${formationId}`, {
                    titre: editFormData.titre,
                    description: editFormData.description,
                    date_deb: editFormData.date_deb,
                    date_fin: editFormData.date_fin,
                    lieu: editFormData.lieu,
                    statut: editFormData.statut,
                });
            }
            showMessagePopup('Formation de promotion modifiée avec succès!', 'success');
            setShowEditModal(false);
            setSelectedFormateur(null);
            setEditEdtData({ annee_scolaire: '', etablissement: '', departement: '', specialite: '', fichier: null });
            await fetchPromotionTrainings();
        } catch (error) {
            console.error('Erreur lors de la modification:', error);
            const apiMsg = error.response?.data?.message || (error.response?.data?.errors && Object.values(error.response.data.errors).flat().join(', ')) || 'Erreur lors de la modification';
            showMessagePopup(apiMsg, 'error');
        }
    };

    const activeFiltersCount = Object.keys(promotionFilters || {}).filter(key => promotionFilters[key] && promotionFilters[key] !== '').length;

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
                            PSP2 (Promotion 10 ans)
                        </h1>
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

                {/* Decorative Wave */}
                <div className="hero-wave">
                    <svg className="w-full h-8" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="currentColor"></path>
                    </svg>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-10 sm:pb-16 pt-3 sm:pt-4 relative z-20">
                {/* Composant Filtre Avancé */}
                <FiltreAvance
                    fields={[
                        {
                            name: 'teacher_name',
                            label: 'Nom du Formateur',
                            type: 'text',
                            placeholder: 'Rechercher par nom...',
                            icon: '👤'
                        },
                        {
                            name: 'email',
                            label: 'Email',
                            type: 'text',
                            placeholder: 'Rechercher par email...',
                            icon: '📧'
                        },
                        {
                            name: 'titre',
                            label: 'Titre de la Formation',
                            type: 'text',
                            placeholder: 'Rechercher par titre...',
                            icon: '📚'
                        },
                        {
                            name: 'statut',
                            label: 'Statut',
                            type: 'select',
                            icon: '📊',
                            options: [
                                { value: 'en_attente', label: '⏳ En attente' },
                                { value: 'en_cours', label: '🔄 En cours' },
                                { value: 'termine', label: '✅ Terminé' }
                            ]
                        },
                        {
                            name: 'grade',
                            label: 'Grade',
                            type: 'text',
                            placeholder: 'Rechercher par grade...',
                            icon: '🎓'
                        }
                    ]}
                    onFilter={(filters) => setPromotionFilters(filters)}
                    onReset={() => setPromotionFilters({})}
                    appliedFilters={promotionFilters}
                />

                {/* Résumé des Résultats */}
                {activeFiltersCount > 0 && (
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
                                            {filteredPromotionTrainings.length} formation{filteredPromotionTrainings.length > 1 ? 's' : ''} trouvée{filteredPromotionTrainings.length > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-medium">
                                        {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {loadingPromotion ? (
                    <TableSquelette rows={6} />
                ) : filteredPromotionTrainings.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-semibold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">Aucun formateur trouvé</h3>
                        <p className="text-lg text-[#78786c] dark:text-[#9D9D99]">Aucune formation de promotion 10 ans (PSP2) disponible pour le moment.</p>
                    </div>
                ) : (
                    <div className="bg-white/95 dark:bg-[#161615]/95 rounded-xl shadow-md sm:rounded-2xl sm:shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 overflow-hidden">
                        <div className="overflow-x-auto">
                            <div className="min-w-[980px] sc-table-header-gradient px-3 py-3 sm:px-6 sm:py-4">
                                <div className="grid min-w-[980px] grid-cols-12 gap-2 text-white font-semibold">
                                    <div className="col-span-1 text-center">#</div>
                                    <div className="col-span-2 text-center">Nom du Formateur</div>
                                    <div className="col-span-3 text-center">Détails</div>
                                    <div className="col-span-2 text-center">Statut</div>
                                    <div className="col-span-2 text-center">Emploi du temps</div>
                                    <div className="col-span-2 text-center">Actions</div>
                                </div>
                            </div>
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredPromotionTrainings.map((teacher, index) => (
                                    <div 
                                        key={teacher.id} 
                                        className="px-3 py-3 sm:px-6 sm:py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                                    >
                                        <div className="grid min-w-[980px] grid-cols-12 gap-2 items-center">
                                            <div className="col-span-1 text-center">
                                                <span className="text-sm font-medium text-[#78786c] dark:text-[#9D9D99]">{index + 1}</span>
                                            </div>
                                            <div className="col-span-2 text-center">
                                                <h3 className="font-semibold text-[#1b1b18] dark:text-[#EDEDEC] text-sm">{teacher.teacher_name}</h3>
                                            </div>
                                            
                                            {/* Détails */}
                                            <div className="col-span-3 text-center">
                                                {teacher.formation_promotion ? (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedFormation(teacher.formation_promotion);
                                                            setShowDetailsModal(true);
                                                        }}
                                                        className="px-3 py-1 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                        title="Voir les détails"
                                                    >
                                                        Détails
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                                )}
                                            </div>
                                            
                                            {/* Statut */}
                                            <div className="col-span-2 text-center">
                                                {teacher.formation_promotion ? (
                                                    <span className={`inline-flex px-3 py-1 text-xs rounded-full font-medium ${
                                                        teacher.formation_promotion.statut === 'en_cours' 
                                                            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                                            : teacher.formation_promotion.statut === 'termine'
                                                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                                                    }`}>
                                                        {teacher.formation_promotion.statut === 'en_cours' ? 'En cours' : teacher.formation_promotion.statut === 'termine' ? 'Terminé' : 'En attente'}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                                )}
                                            </div>
                                            
                                            {/* Emploi du Temps */}
                                            <div className="col-span-2 text-center">
                                                {teacher.has_promotion_training && (
                                                    teacher.has_promotion_schedule_file ? (
                                                        <button
                                                            onClick={() => handleDownloadPromotionSchedule(teacher.id)}
                                                            className="px-3 py-1 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                            title="Télécharger l'emploi du temps"
                                                        >
                                                            Télécharger
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleOpenEditModal(teacher)}
                                                            className="px-3 py-1 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                            title="Ajouter un emploi du temps (via Modifier la formation)"
                                                        >
                                                            Ajouter EDT
                                                        </button>
                                                    )
                                                )}
                                                {!teacher.has_promotion_training && (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                                )}
                                            </div>
                                            
                                            {/* Actions */}
                                            <div className="col-span-2 text-center flex gap-2 justify-center">
                                                {!teacher.has_promotion_training && (
                                                    <button
                                                        onClick={() => handleOpenCreateModal(teacher)}
                                                        className="px-3 py-1 bg-gradient-to-r from-[#d4af37] to-[#b8860b] hover:from-[#b8860b] hover:to-[#d4af37] text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                        title="Créer une formation de promotion"
                                                    >
                                                        ➕ Créer
                                                    </button>
                                                )}
                                                {teacher.has_promotion_training && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenEditModal(teacher)}
                                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                            title="Modifier la formation de promotion"
                                                        >
                                                            Modifier
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancelPromotion(teacher)}
                                                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                            title="Annuler la formation de promotion"
                                                        >
                                                            Annuler
                                                        </button>
                                                    </>
                                                )}
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
            {showDetailsModal && selectedFormation && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-[#161615] rounded-2xl shadow-2xl border border-white/20 dark:border-[#3E3E3A]/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto my-4">
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] p-6 text-white rounded-t-2xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">Détails de la Formation de Promotion</h2>
                                    <p className="text-white/80 text-sm">{selectedFormation.titre}</p>
                                </div>
                                <button
                                    onClick={() => { setShowDetailsModal(false); setSelectedFormation(null); }}
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
                                    {selectedFormation.titre}
                                </p>
                            </div>
                            {selectedFormation.description && (
                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Description
                                    </label>
                                    <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">
                                        {selectedFormation.description}
                                    </p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Type de Promotion
                                    </label>
                                    <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">
                                        {selectedFormation.type_promotion === '5_ans' ? '5 ans (PSP1)' : '10 ans (PSP2)'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Statut
                                    </label>
                                    <span className={`inline-flex px-3 py-1 text-xs rounded-full font-medium ${
                                        selectedFormation.statut === 'en_cours' 
                                            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                            : selectedFormation.statut === 'termine'
                                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                                    }`}>
                                        {selectedFormation.statut === 'en_cours' ? 'En cours' : selectedFormation.statut === 'termine' ? 'Terminé' : 'En attente'}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Date de début
                                    </label>
                                    <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">
                                        {selectedFormation.date_deb ? new Date(selectedFormation.date_deb).toLocaleDateString('fr-FR') : '-'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Date de fin
                                    </label>
                                    <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">
                                        {selectedFormation.date_fin ? new Date(selectedFormation.date_fin).toLocaleDateString('fr-FR') : '-'}
                                    </p>
                                </div>
                            </div>
                            {selectedFormation.lieu && (
                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Lieu
                                    </label>
                                    <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC]">
                                        📍 {selectedFormation.lieu}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl flex justify-end">
                            <button
                                onClick={() => { setShowDetailsModal(false); setSelectedFormation(null); }}
                                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-all font-medium"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Promotion Modal */}
            {showEditModal && selectedFormateur && selectedFormateur.formation_promotion && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-[#161615] rounded-2xl shadow-2xl border border-white/20 dark:border-[#3E3E3A]/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto my-4">
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] p-6 text-white rounded-t-2xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">Modifier la Formation de Promotion PSP2</h2>
                                    <p className="text-white/80 text-sm">Formateur: {selectedFormateur.teacher_name}</p>
                                    <p className="text-white/70 text-xs mt-1">Formation de Promotion 10 ans</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { 
                                        setShowEditModal(false); 
                                        setSelectedFormateur(null);
                                        setEditEdtData({ annee_scolaire: '', etablissement: '', departement: '', specialite: '', fichier: null });
                                    }}
                                    className="p-2 hover:bg-white/20 rounded-xl transition-all text-white"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); handleUpdatePromotion(); }} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                    Titre *
                                </label>
                                <input
                                    type="text"
                                    value={editFormData.titre}
                                    onChange={(e) => setEditFormData({ ...editFormData, titre: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-white dark:bg-[#0a0a0a] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20"
                                    placeholder="Titre de la formation PSP2 (10 ans)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={editFormData.description}
                                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-white dark:bg-[#0a0a0a] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20"
                                    placeholder="Description de la formation de promotion 10 ans"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Type de Promotion
                                    </label>
                                    <input
                                        type="text"
                                        value="10 ans (PSP2)"
                                        disabled
                                        className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Statut *
                                    </label>
                                    <select
                                        value={editFormData.statut}
                                        onChange={(e) => setEditFormData({ ...editFormData, statut: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-white dark:bg-[#0a0a0a] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20"
                                    >
                                        <option value="en_attente">En attente</option>
                                        <option value="en_cours">En cours</option>
                                        <option value="termine">Terminé</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Date de début *
                                    </label>
                                    <input
                                        type="date"
                                        value={editFormData.date_deb}
                                        onChange={(e) => setEditFormData({ ...editFormData, date_deb: e.target.value })}
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
                                        value={editFormData.date_fin}
                                        onChange={(e) => setEditFormData({ ...editFormData, date_fin: e.target.value })}
                                        required
                                        min={editFormData.date_deb}
                                        className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-white dark:bg-[#0a0a0a] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                    Lieu
                                </label>
                                <input
                                    type="text"
                                    value={editFormData.lieu}
                                    onChange={(e) => setEditFormData({ ...editFormData, lieu: e.target.value })}
                                    className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-white dark:bg-[#0a0a0a] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20"
                                    placeholder="Lieu de la formation"
                                />
                            </div>

                            {/* Emploi du temps (optionnel) - même modèle que formation optionnelle / pédagogique */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50/60 dark:bg-gray-900/40 space-y-3">
                                <p className="text-sm font-semibold text-[#1b1b18] dark:text-[#EDEDEC]">Emploi du temps (optionnel)</p>
                                <p className="text-xs text-[#78786c] dark:text-[#9D9D99]">Ajouter ou remplacer l&apos;emploi du temps. Même formulaire qu&apos;à la création.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99] mb-1">Année scolaire (année uniquement)</label>
                                        <input type="number" min="1900" max="2100" value={editEdtData.annee_scolaire} onChange={(e) => setEditEdtData({ ...editEdtData, annee_scolaire: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent" placeholder="2025" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99] mb-1">Établissement</label>
                                        <input type="text" value={editEdtData.etablissement} onChange={(e) => setEditEdtData({ ...editEdtData, etablissement: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent" placeholder="Ex: Institut Supérieur StageConnect" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99] mb-1">Département</label>
                                        <input type="text" value={editEdtData.departement} onChange={(e) => setEditEdtData({ ...editEdtData, departement: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent" placeholder="Ex: Informatique" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99] mb-1">Spécialité</label>
                                        <input type="text" value={editEdtData.specialite} onChange={(e) => setEditEdtData({ ...editEdtData, specialite: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent" placeholder="Ex: Pédagogie" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99] mb-1">Fichier emploi du temps</label>
                                    <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(e) => setEditEdtData({ ...editEdtData, fichier: e.target.files?.[0] || null })} className="block w-full text-sm text-gray-500 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#1a365d] file:text-white hover:file:bg-[#2d3748] file:cursor-pointer cursor-pointer" />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Formats acceptés: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG</p>
                                    {editEdtData.fichier && <p className="mt-1 text-sm text-green-600 dark:text-green-400">✓ Fichier sélectionné: {editEdtData.fichier.name}</p>}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { 
                                        setShowEditModal(false); 
                                        setSelectedFormateur(null);
                                        setEditEdtData({ annee_scolaire: '', etablissement: '', departement: '', specialite: '', fichier: null });
                                    }}
                                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-all font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1a365d] to-[#2d3748] text-white rounded-xl hover:from-[#2d3748] hover:to-[#1a365d] transition-all font-medium shadow-lg"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Promotion Modal */}
            {showCreateModal && selectedFormateur && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-[#161615] rounded-2xl shadow-2xl border border-white/20 dark:border-[#3E3E3A]/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto my-4">
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] p-6 text-white rounded-t-2xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">Créer une Formation de Promotion PSP2</h2>
                                    <p className="text-white/80 text-sm">Formateur: {selectedFormateur.teacher_name}</p>
                                    <p className="text-white/70 text-xs mt-1">Formation de Promotion 10 ans</p>
                                </div>
                                <button
                                    onClick={() => { setShowCreateModal(false); setSelectedFormateur(null); }}
                                    className="p-2 hover:bg-white/20 rounded-xl transition-all text-white"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); handleCreatePromotion(); }} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                    Titre *
                                </label>
                                <input
                                    type="text"
                                    value={createFormData.titre}
                                    onChange={(e) => setCreateFormData({ ...createFormData, titre: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-white dark:bg-[#0a0a0a] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20"
                                    placeholder="Titre de la formation PSP2 (10 ans)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={createFormData.description}
                                    onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-white dark:bg-[#0a0a0a] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20"
                                    placeholder="Description de la formation de promotion 10 ans"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Type de Promotion
                                    </label>
                                    <input
                                        type="text"
                                        value="10 ans (PSP2)"
                                        disabled
                                        className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Statut *
                                    </label>
                                    <select
                                        value={createFormData.statut}
                                        onChange={(e) => setCreateFormData({ ...createFormData, statut: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-white dark:bg-[#0a0a0a] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20"
                                    >
                                        <option value="en_attente">En attente</option>
                                        <option value="en_cours">En cours</option>
                                        <option value="termine">Terminé</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                        Date de début *
                                    </label>
                                    <input
                                        type="date"
                                        value={createFormData.date_deb}
                                        onChange={(e) => setCreateFormData({ ...createFormData, date_deb: e.target.value })}
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
                                        value={createFormData.date_fin}
                                        onChange={(e) => setCreateFormData({ ...createFormData, date_fin: e.target.value })}
                                        required
                                        min={createFormData.date_deb}
                                        className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-white dark:bg-[#0a0a0a] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#78786c] dark:text-[#9D9D99] mb-2">
                                    Lieu
                                </label>
                                <input
                                    type="text"
                                    value={createFormData.lieu}
                                    onChange={(e) => setCreateFormData({ ...createFormData, lieu: e.target.value })}
                                    className="w-full px-4 py-3 border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-xl text-[#1b1b18] dark:text-[#EDEDEC] bg-white dark:bg-[#0a0a0a] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20"
                                    placeholder="Lieu de la formation"
                                />
                            </div>
                            {/* Emploi du temps (optionnel) avec métadonnées, comme pour formation & pédagogique */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50/60 dark:bg-gray-900/40 space-y-3">
                                <p className="text-sm font-semibold text-[#1b1b18] dark:text-[#EDEDEC]">
                                    Emploi du temps (optionnel)
                                </p>
                                <p className="text-xs text-[#78786c] dark:text-[#9D9D99]">
                                    Si vous ajoutez un emploi du temps ici, il sera partagé avec ce formateur pour toute la formation de promotion (PSP2).
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
                                            value={createEdtMeta.annee_scolaire}
                                            onChange={(e) => setCreateEdtMeta({ ...createEdtMeta, annee_scolaire: e.target.value })}
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
                                            value={createEdtMeta.etablissement}
                                            onChange={(e) => setCreateEdtMeta({ ...createEdtMeta, etablissement: e.target.value })}
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
                                            value={createEdtMeta.departement}
                                            onChange={(e) => setCreateEdtMeta({ ...createEdtMeta, departement: e.target.value })}
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
                                            value={createEdtMeta.specialite}
                                            onChange={(e) => setCreateEdtMeta({ ...createEdtMeta, specialite: e.target.value })}
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
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                        onChange={(e) => setCreateScheduleFile(e.target.files[0] || null)}
                                        className="block w-full text-sm text-gray-500 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#1a365d] file:text-white hover:file:bg-[#2d3748] file:cursor-pointer cursor-pointer"
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        Formats acceptés: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG
                                    </p>
                                    {createScheduleFile && (
                                        <p className="mt1 text-sm text-green-600 dark:text-green-400">
                                            ✓ Fichier sélectionné: {createScheduleFile.name}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { 
                                        setShowCreateModal(false); 
                                        setSelectedFormateur(null);
                                        setCreateScheduleFile(null);
                                        setCreateFormData({
                                            titre: '',
                                            description: '',
                                            type_promotion: '10_years',
                                            date_deb: '',
                                            date_fin: '',
                                            lieu: '',
                                            statut: 'en_cours',
                                        });
                                    }}
                                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-all font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1a365d] to-[#2d3748] text-white rounded-xl hover:from-[#2d3748] hover:to-[#1a365d] transition-all font-medium shadow-lg"
                                >
                                    Créer PSP2
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Cancel Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={showCancelConfirm && !!promotionToCancel}
                onClose={cancelCancelConfirm}
                onConfirm={confirmCancel}
                title="Confirmer l'annulation"
                itemName={promotionToCancel?.formation_promotion?.titre || 'Formation de Promotion'}
                itemDetails={
                    <p className="text-sm text-[#78786c] dark:text-[#9D9D99] mt-1">
                        {promotionToCancel?.teacher_name || 'N/A'} - PSP2
                    </p>
                }
                confirmButtonText="Confirmer l'annulation"
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

