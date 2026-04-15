import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCache } from '../../context/CacheContext';
import NavigationGestionaire from '../../components/GestionaireNav';
import TableSquelette from '../../components/SkeletonTable';
import FiltreAvance from '../../components/AdvancedFilter';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import axios from 'axios';

export default function Specialistes() {
    const { getCachedData, setCachedData, clearCache } = useCache();
    const [specialists, setSpecialists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSpecialist, setEditingSpecialist] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        is_active: true
    });
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [specialistToDelete, setSpecialistToDelete] = useState(null);
    
    // Advanced filter state
    const [appliedFilters, setAppliedFilters] = useState({});

    const showMessagePopup = (message, type = 'success') => {
        setMessage(message);
        setMessageType(type);
        setShowMessage(true);
        setTimeout(() => {
            setShowMessage(false);
        }, 4000);
    };

    // Filtrer les spécialistes en fonction des filtres appliqués
    const filteredSpecialists = specialists.filter(specialist => {
        if (appliedFilters.name && !specialist.nom?.toLowerCase().includes(appliedFilters.name.toLowerCase())) {
            return false;
        }
        
        if (appliedFilters.description && !specialist.description?.toLowerCase().includes(appliedFilters.description.toLowerCase())) {
            return false;
        }
        
        if (appliedFilters.status && appliedFilters.status !== '') {
            const isActive = specialist.is_active === 1 || specialist.is_active === true || 
                           (specialist.est_actif === 1 || specialist.est_actif === true);
            if (appliedFilters.status === 'active' && !isActive) return false;
            if (appliedFilters.status === 'inactive' && isActive) return false;
        }
        
        return true;
    });

    useEffect(() => {
        fetchSpecialists();
    }, []);

    const fetchSpecialists = async (skipCache = false, silent = false) => {
        try {
            if (!silent) {
                setLoading(true);
            }
            
            // Vérifier le cache d'abord (sauf si skipCache est true)
            if (!skipCache) {
                const cached = getCachedData('admin_specialists');
                if (cached) {
                    setSpecialists(cached);
                    if (!silent) {
                        setLoading(false);
                    }
                    return;
                }
            }
            
            const response = await axios.get('/api/admin/specialistes');
            const data = response.data.data;
            setSpecialists(data);
            
            // Mettre en cache les données
            setCachedData('admin_specialists', data);
        } catch (error) {
            console.error('Erreur lors de la récupération des spécialistes:', error);
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingSpecialist) {
                await axios.put(`/api/admin/specialistes/${editingSpecialist.id}`, formData);
            } else {
                await axios.post('/api/admin/specialistes', formData);
            }
            
            clearCache('admin_specialists');
            clearCache('gestionaire_dashboard_stats');
            setShowModal(false);
            setEditingSpecialist(null);
            setFormData({ name: '', description: '', is_active: true });
            
            // Mettre à jour immédiatement l'état local
            if (editingSpecialist) {
                setSpecialists(prev => prev.map(s => 
                    s.id === editingSpecialist.id 
                        ? { ...s, nom: formData.name, description: formData.description, is_active: formData.is_active }
                        : s
                ));
            } else {
                // Pour la création, on rafraîchit silencieusement
                setTimeout(() => {
                    fetchSpecialists(true, true);
                }, 500);
            }
            
            // Réinitialiser les filtres pour voir le nouveau spécialiste
            setAppliedFilters({});
            
            showMessagePopup(
                editingSpecialist ? 'Spécialité modifiée avec succès !' : 'Spécialité créée avec succès !', 
                'success'
            );
            
            // Rafraîchir silencieusement en arrière-plan
            if (editingSpecialist) {
                setTimeout(() => {
                    fetchSpecialists(true, true);
                }, 500);
            }
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du spécialiste:', error);
            showMessagePopup('Erreur lors de la sauvegarde de la spécialité', 'error');
        }
    };

    const handleEdit = (specialist) => {
        setEditingSpecialist(specialist);
        setFormData({
            name: specialist.nom,
            description: specialist.description || '',
            is_active: specialist.is_active !== undefined ? specialist.is_active : (specialist.est_actif !== undefined ? specialist.est_actif : true)
        });
        setShowModal(true);
    };

    const handleDelete = (specialist) => {
        setSpecialistToDelete(specialist);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!specialistToDelete) return;
        
        try {
            await axios.delete(`/api/admin/specialistes/${specialistToDelete.id}`);
            clearCache('admin_specialists');
            clearCache('gestionaire_dashboard_stats');
            
            // Mettre à jour immédiatement l'état local
            setSpecialists(prev => prev.filter(s => s.id !== specialistToDelete.id));
            
            // Réinitialiser les filtres pour voir la liste mise à jour
            setAppliedFilters({});
            
            showMessagePopup('Spécialité supprimée avec succès !', 'success');
            
            // Rafraîchir silencieusement en arrière-plan
            setTimeout(() => {
                fetchSpecialists(true, true);
            }, 500);
        } catch (error) {
            console.error('Erreur lors de la suppression du spécialiste:', error);
            const errorMessage = error.response?.data?.message || 'Erreur lors de la suppression de la spécialité';
            showMessagePopup(errorMessage, 'error');
        } finally {
            setShowDeleteConfirm(false);
            setSpecialistToDelete(null);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setSpecialistToDelete(null);
    };

    const resetForm = () => {
        setFormData({ name: '', description: '', is_active: true });
        setEditingSpecialist(null);
        setShowModal(false);
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
                            Gestion des Spécialités
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
                                onClick={() => setShowModal(true)}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] hover:from-[#b8860b] hover:to-[#d4af37] text-white rounded-xl shadow-xl hover:shadow-yellow-500/50 transition-all duration-300 text-sm font-bold"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Ajouter une Spécialité
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
                            name: 'name',
                            label: 'Nom',
                            type: 'text',
                            placeholder: 'Rechercher par nom...',
                            icon: '🎯'
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
                                { value: 'active', label: '✅ Active' },
                                { value: 'inactive', label: '⛔ Inactive' }
                            ]
                        }
                    ]}
                    onFilter={(filters) => setAppliedFilters(filters)}
                    onReset={() => setAppliedFilters({})}
                />

                {/* Résumé des Résultats - Afficher uniquement lorsque les filtres sont appliqués */}
                {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 0 && (
                    <div className="mb-6">
                        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-orange-200 dark:border-gray-600">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Résultats</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {filteredSpecialists.length} spécialité{filteredSpecialists.length > 1 ? 's' : ''} trouvée{filteredSpecialists.length > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-sm font-medium">
                                        {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length} filtre{Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 1 ? 's' : ''} actif{Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Specialists List */}
                {loading ? (
                    <TableSquelette rows={8} />
                ) : filteredSpecialists.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-semibold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">Aucune spécialité trouvée</h3>
                        <p className="text-lg text-[#78786c] dark:text-[#9D9D99] mb-8">
                            {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 0 
                                ? "Aucune spécialité ne correspond aux critères de recherche"
                                : "Commencez par ajouter votre première spécialité"}
                        </p>
                        {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length === 0 && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] hover:from-[#b8860b] hover:to-[#d4af37] text-white rounded-xl shadow-xl hover:shadow-yellow-500/50 transition-all duration-300 text-sm font-bold"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Créer la première spécialité
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-white/80 dark:bg-[#161615]/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 overflow-x-auto">
                        {/* List Header */}
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] px-6 py-4">
                            <div className="grid min-w-[900px] grid-cols-12 gap-4 text-white font-semibold">
                                <div className="col-span-1 text-center">#</div>
                                <div className="col-span-4 text-center">Nom de la Spécialité</div>
                                <div className="col-span-3 text-center">Description</div>
                                <div className="col-span-2 text-center">Statut</div>
                                <div className="col-span-2 text-center">Actions</div>
                            </div>
                        </div>
                        
                        {/* List Items */}
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredSpecialists.map((specialist, index) => (
                                <div
                                    key={specialist.id}
                                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                                >
                                    <div className="grid min-w-[900px] grid-cols-12 gap-4 items-center">
                                        {/* Index */}
                                        <div className="col-span-1 text-center">
                                            <span className="text-sm font-medium text-[#78786c] dark:text-[#9D9D99]">
                                                {index + 1}
                                            </span>
                                        </div>
                                        
                                        {/* Name */}
                                        <div className="col-span-4 text-center">
                                            <h3 className="font-semibold text-[#1b1b18] dark:text-[#EDEDEC] text-sm">
                                                {specialist.nom}
                                            </h3>
                                        </div>
                                        
                                        {/* Description */}
                                        <div className="col-span-3 text-center">
                                            <p className="text-sm text-[#78786c] dark:text-[#9D9D99] truncate">
                                                {specialist.description || 'Aucune description'}
                                            </p>
                                        </div>
                                        
                                        {/* Status */}
                                        <div className="col-span-2 text-center">
                                            {(() => {
                                                const isActive = specialist.is_active !== undefined 
                                                    ? (specialist.is_active === 1 || specialist.is_active === true)
                                                    : (specialist.est_actif === 1 || specialist.est_actif === true);
                                                return (
                                                    <span className={`inline-flex px-3 py-1 text-xs rounded-full font-medium ${
                                                        isActive
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                                    }`}>
                                                        {isActive ? 'Actif' : 'Inactif'}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        
                                        {/* Actions */}
                                        <div className="col-span-2 text-center flex flex-wrap gap-2 justify-center items-center">
                                            <button
                                                onClick={() => handleEdit(specialist)}
                                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                            >
                                                Modifier
                                            </button>
                                            <button
                                                onClick={() => handleDelete(specialist)}
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
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#161615] rounded-2xl shadow-2xl border border-white/20 dark:border-[#3E3E3A]/50 w-full max-w-lg">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] p-6 text-white rounded-t-2xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold">
                                        {editingSpecialist ? 'Modifier la Spécialité' : 'Ajouter une Spécialité'}
                                    </h2>
                                    <p className="text-white/80 text-sm mt-1">
                                        {editingSpecialist ? 'Mettez à jour les informations de la spécialité' : 'Créez une nouvelle spécialité pour vos stages'}
                                    </p>
                                </div>
                                <button
                                    onClick={resetForm}
                                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC] mb-3">
                                    Nom de la spécialité *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="Ex: Développement Web, Marketing Digital..."
                                    className="w-full px-4 py-3 border border-white/20 dark:border-[#3E3E3A]/50 rounded-xl bg-white/50 dark:bg-[#161615]/50 text-[#1b1b18] dark:text-[#EDEDEC] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20 transition-all"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC] mb-3">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    rows={3}
                                    placeholder="Décrivez cette spécialité..."
                                    className="w-full px-4 py-3 border border-white/20 dark:border-[#3E3E3A]/50 rounded-xl bg-white/50 dark:bg-[#161615]/50 text-[#1b1b18] dark:text-[#EDEDEC] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20 transition-all resize-none"
                                />
                            </div>
                            
                            <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                    className="h-5 w-5 text-[#1a365d] focus:ring-[#1a365d] border-gray-300 dark:border-gray-600 rounded"
                                />
                                <label htmlFor="is_active" className="ml-3 text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC]">
                                    Spécialité active
                                </label>
                            </div>
                            
                            <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-all font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] text-white rounded-xl transition-all font-medium shadow-lg"
                                >
                                    {editingSpecialist ? 'Modifier' : 'Ajouter'}
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
                itemName={specialistToDelete?.name}
                itemDetails={
                    specialistToDelete?.description && (
                        <p className="text-sm text-[#78786c] dark:text-[#9D9D99] mt-1">
                            {specialistToDelete.description}
                        </p>
                    )
                }
                itemIcon={
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
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
