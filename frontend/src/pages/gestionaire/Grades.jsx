import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCache } from '../../context/CacheContext';
import NavigationGestionaire from '../../components/GestionaireNav';
import TableSquelette from '../../components/SkeletonTable';
import FiltreAvance from '../../components/AdvancedFilter';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import axios from 'axios';

export default function Grades() {
    const { getCachedData, setCachedData, clearCache } = useCache();
    const [grades, setGrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingGrade, setEditingGrade] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        nom: '',
        description: ''
    });
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [gradeToDelete, setGradeToDelete] = useState(null);
    const [saving, setSaving] = useState(false);
    
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

    // Filtrer les grades en fonction des filtres appliqués
    const filteredGrades = grades.filter(grade => {
        if (appliedFilters.code && !grade.code?.toLowerCase().includes(appliedFilters.code.toLowerCase())) {
            return false;
        }
        
        if (appliedFilters.nom && !grade.nom?.toLowerCase().includes(appliedFilters.nom.toLowerCase())) {
            return false;
        }
        
        if (appliedFilters.description && !grade.description?.toLowerCase().includes(appliedFilters.description.toLowerCase())) {
            return false;
        }
        
        return true;
    });

    useEffect(() => {
        fetchGrades();
    }, []);

    const fetchGrades = async (skipCache = false, silent = false) => {
        try {
            if (!silent) {
                setLoading(true);
            }
            
            // Vérifier le cache d'abord (sauf si skipCache est true)
            if (!skipCache) {
                const cached = getCachedData('admin_grades');
                if (cached) {
                    setGrades(cached);
                    if (!silent) {
                        setLoading(false);
                    }
                    return;
                }
            }
            
            const response = await axios.get('/api/grades');
            const data = response.data.data || response.data;
            setGrades(Array.isArray(data) ? data : []);
            
            // Mettre en cache les données
            setCachedData('admin_grades', Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erreur lors de la récupération des grades:', error);
            showMessagePopup('Erreur lors de la récupération des grades', 'error');
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingGrade) {
                await axios.put(`/api/grades/${editingGrade.id}`, formData);
                showMessagePopup('Grade mis à jour avec succès!', 'success');
            } else {
                await axios.post('/api/grades', formData);
                showMessagePopup('Grade créé avec succès!', 'success');
            }
            
            setShowModal(false);
            resetForm();
            await fetchGrades(true);
            clearCache('admin_grades');
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            const errorMessage = error.response?.data?.message || 'Erreur lors de la sauvegarde du grade';
            showMessagePopup(errorMessage, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (grade) => {
        setEditingGrade(grade);
        setFormData({
            code: grade.code || '',
            nom: grade.nom || '',
            description: grade.description || ''
        });
        setShowModal(true);
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`/api/grades/${gradeToDelete.id}`);
            showMessagePopup('Grade supprimé avec succès!', 'success');
            setShowDeleteConfirm(false);
            setGradeToDelete(null);
            await fetchGrades(true);
            clearCache('admin_grades');
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            const errorMessage = error.response?.data?.message || 'Erreur lors de la suppression du grade';
            showMessagePopup(errorMessage, 'error');
            setShowDeleteConfirm(false);
            setGradeToDelete(null);
        }
    };

    const resetForm = () => {
        setFormData({
            code: '',
            nom: '',
            description: ''
        });
        setEditingGrade(null);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        resetForm();
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
                            Gestion des Grades
                        </h1>
                        <div className="flex flex-wrap justify-center gap-3 mt-6">
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
                                    resetForm();
                                    setShowModal(true);
                                }}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] hover:from-[#b8860b] hover:to-[#d4af37] text-white rounded-xl shadow-xl hover:shadow-yellow-500/50 transition-all duration-300 text-sm font-bold"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Ajouter un Grade
                            </button>
                        </div>
                    </div>
                </div>

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
                            name: 'code',
                            label: 'Code',
                            type: 'text',
                            placeholder: 'Rechercher par code...',
                            icon: '🔖'
                        },
                        {
                            name: 'nom',
                            label: 'Nom',
                            type: 'text',
                            placeholder: 'Rechercher par nom...',
                            icon: '📝'
                        },
                        {
                            name: 'description',
                            label: 'Description',
                            type: 'text',
                            placeholder: 'Rechercher dans la description...',
                            icon: '📄'
                        },
                    ]}
                    onFilterChange={setAppliedFilters}
                    appliedFilters={appliedFilters}
                />


                {/* Loading State */}
                {loading ? (
                    <TableSquelette rows={6} />
                ) : filteredGrades.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-semibold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">Aucun grade trouvé</h3>
                        <p className="text-lg text-[#78786c] dark:text-[#9D9D99] mb-8">
                            {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 0 
                                ? "Aucun grade ne correspond aux critères de recherche"
                                : "Commencez par créer votre premier grade"}
                        </p>
                        {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length === 0 && (
                            <button
                                onClick={() => {
                                    resetForm();
                                    setShowModal(true);
                                }}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] hover:from-[#b8860b] hover:to-[#d4af37] text-white rounded-xl shadow-xl hover:shadow-yellow-500/50 transition-all duration-300 text-sm font-bold"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Créer le premier grade
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-white/95 dark:bg-[#161615]/95 rounded-2xl shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 overflow-hidden">
                        <div className="overflow-x-auto">
                            {/* Table Header */}
                            <div className="min-w-[860px] sc-table-header-gradient px-6 py-4">
                                <div className="grid min-w-[860px] grid-cols-6 gap-4 text-white font-semibold">
                                    <div className="col-span-1 text-center">Code</div>
                                    <div className="col-span-2 text-center">Nom</div>
                                    <div className="col-span-2 text-center">Description</div>
                                    <div className="col-span-1 text-center">Actions</div>
                                </div>
                            </div>
                            
                            {/* Table Body */}
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredGrades.map((grade) => (
                                    <div
                                        key={grade.id}
                                        className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                                    >
                                        <div className="grid min-w-[860px] grid-cols-6 gap-4 items-center">
                                            <div className="col-span-1 text-center">
                                                <span className="text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC]">
                                                    {grade.code}
                                                </span>
                                            </div>
                                            
                                            <div className="col-span-2 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <h3 className="font-semibold text-[#1b1b18] dark:text-[#EDEDEC] text-sm">
                                                        {grade.nom}
                                                    </h3>
                                                </div>
                                            </div>
                                            
                                            <div className="col-span-2 text-center">
                                                <p className="text-sm text-[#78786c] dark:text-[#9D9D99] line-clamp-2">
                                                    {grade.description || 'Aucune description'}
                                                </p>
                                            </div>

                                            <div className="col-span-1 flex gap-2 justify-center">
                                                <button
                                                    onClick={() => handleEdit(grade)}
                                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                    title="Modifier"
                                                >
                                                    Modifier
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setGradeToDelete(grade);
                                                        setShowDeleteConfirm(true);
                                                    }}
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

            {/* Modal pour créer/modifier */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#161615] rounded-2xl shadow-2xl border border-white/20 dark:border-[#3E3E3A]/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] p-6 text-white rounded-t-2xl">
                            <h3 className="text-2xl font-bold">
                                {editingGrade ? 'Modifier le Grade' : 'Créer un Grade'}
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Code <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                                    placeholder="Ex: PFP, PSFP"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Nom <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.nom}
                                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                                    placeholder="Ex: Professeur de Formation Professionnelle"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                                    placeholder="Description du grade..."
                                />
                            </div>


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
                                    disabled={saving}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1a365d] to-[#2d3748] text-white rounded-xl hover:from-[#2d3748] hover:to-[#1a365d] transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Enregistrement...' : (editingGrade ? 'Modifier' : 'Créer')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de confirmation de suppression */}
            <DeleteConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setGradeToDelete(null);
                }}
                onConfirm={handleDelete}
                itemName={gradeToDelete?.nom}
                itemDetails={
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                        Si ce grade est utilisé par des formateurs, la suppression sera refusée.
                    </p>
                }
                itemIcon={
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
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

