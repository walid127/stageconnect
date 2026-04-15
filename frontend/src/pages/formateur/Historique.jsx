import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCache } from '../../context/CacheContext';
import NavigationFormateur from '../../components/FormateurNav';
import TableSquelette from '../../components/SkeletonTable';
import FiltreAvance from '../../components/AdvancedFilter';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import axios from 'axios';

export default function Historique() {
    const { getCachedData, setCachedData } = useCache();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');
    const [appliedFilters, setAppliedFilters] = useState({});
    const [selectedItems, setSelectedItems] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showSingleDeleteModal, setShowSingleDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const showMessagePopup = (msg, type = 'success') => {
        setMessage(msg);
        setMessageType(type);
        setShowMessage(true);
        setTimeout(() => {
            setShowMessage(false);
        }, 4000);
    };

    useEffect(() => {
        fetchHistory();
    }, [appliedFilters]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            
            const hasFilters = Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 0;
            
            // Vérifier le cache uniquement lorsqu'aucun filtre n'est appliqué
            if (!hasFilters) {
                const cached = getCachedData('formateur_history');
                if (cached) {
                    setHistory(cached);
                    setLoading(false);
                    return;
                }
            }
            
            const params = new URLSearchParams();
            if (appliedFilters.action && appliedFilters.action !== 'all') params.append('action', appliedFilters.action);
            if (appliedFilters.search) params.append('search', appliedFilters.search);
            if (appliedFilters.date_from) params.append('date_from', appliedFilters.date_from);
            if (appliedFilters.date_to) params.append('date_to', appliedFilters.date_to);
            
            const response = await axios.get(`/api/historique-formations?${params.toString()}`);
            
            // Handle different response structures
            let historyData = [];
            if (response.data.data && response.data.data.data) {
                historyData = response.data.data.data;
            } else if (response.data.data) {
                historyData = response.data.data;
            } else if (Array.isArray(response.data)) {
                historyData = response.data;
            }
            
            setHistory(historyData);
            
            // Mettre en cache uniquement lorsqu'aucun filtre n'est appliqué
            if (!hasFilters) {
                setCachedData('formateur_history', historyData);
            }
        } catch (err) {
            console.error('Erreur lors de la récupération de l\'historique:', err);
            showMessagePopup('Erreur lors du chargement de l\'historique: ' + (err.response?.data?.message || err.message), 'error');
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'application_submitted':
                return '📝';
            case 'application_accepted':
                return '✅';
            case 'application_rejected':
                return '❌';
            case 'training_started':
                return '🚀';
            case 'training_completed':
                return '🎓';
            case 'profile_updated':
                return '👤';
            default:
                return '📋';
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'application_submitted':
                return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300';
            case 'application_accepted':
                return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
            case 'application_rejected':
                return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
            case 'training_started':
                return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300';
            case 'training_completed':
                return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300';
            case 'profile_updated':
                return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300';
            default:
                return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300';
        }
    };

    const getActionText = (action) => {
        switch (action) {
            case 'application_submitted':
                return 'Demande de formation envoyée';
            case 'application_accepted':
                return 'Demande de formation acceptée';
            case 'application_rejected':
                return 'Demande de formation refusée';
            case 'training_started':
                return 'Formation commencée';
            case 'training_completed':
                return 'Formation terminée';
            case 'profile_updated':
                return 'Profil mis à jour';
            default:
                return 'Action effectuée';
        }
    };

    const handleDelete = (id) => {
        setItemToDelete(id);
        setShowSingleDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            setDeleteLoading(true);
            await axios.delete(`/api/historique-formations/${itemToDelete}`);
            setShowSingleDeleteModal(false);
            setItemToDelete(null);
            
            // Rafraîchir immédiatement les données
            await fetchHistory();
            
            // Réinitialiser les filtres pour voir la liste mise à jour
            setAppliedFilters({});
            showMessagePopup('Élément supprimé avec succès!', 'success');
        } catch (err) {
            console.error('Erreur lors de la suppression de l\'élément d\'historique:', err);
            showMessagePopup('Erreur lors de la suppression: ' + (err.response?.data?.message || err.message), 'error');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleSelectItem = (id) => {
        setSelectedItems(prev => 
            prev.includes(id) 
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
    };

    const handleDeleteSelected = async () => {
        if (selectedItems.length === 0) return;

        try {
            setDeleteLoading(true);
            await axios.delete('/api/historique-formations', {
                data: { ids: selectedItems }
            });
            setSelectedItems([]);
            setShowDeleteModal(false);
            
            // Rafraîchir immédiatement les données
            await fetchHistory();
            
            // Réinitialiser les filtres pour voir la liste mise à jour
            setAppliedFilters({});
            showMessagePopup(`${selectedItems.length} élément(s) supprimé(s) avec succès!`, 'success');
        } catch (err) {
            console.error('Erreur lors de la suppression des éléments sélectionnés:', err);
            showMessagePopup('Erreur lors de la suppression: ' + (err.response?.data?.message || err.message), 'error');
        } finally {
            setDeleteLoading(false);
        }
    };

    const groupedHistory = history.reduce((groups, item) => {
        const date = new Date(item.created_at).toDateString();
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(item);
        return groups;
    }, {});

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
                            Mon Historique
                        </h1>
                        
                        <div className="mb-4">
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
                            name: 'action',
                            label: 'Type d\'action',
                            type: 'select',
                            icon: '🎯',
                            options: [
                                { value: 'all', label: '📊 Toutes les actions' },
                                { value: 'application_submitted', label: '📝 Demandes de formation' },
                                { value: 'application_accepted', label: '✅ Acceptées' },
                                { value: 'application_rejected', label: '❌ Refusées' },
                                { value: 'profile_updated', label: '👤 Profil' }
                            ]
                        },
                        {
                            name: 'search',
                            label: 'Rechercher',
                            type: 'text',
                            placeholder: 'Rechercher dans l\'historique...',
                            icon: '🔍'
                        },
                        {
                            name: 'date_from',
                            label: 'Date de début',
                            type: 'date',
                            icon: '📅'
                        },
                        {
                            name: 'date_to',
                            label: 'Date de fin',
                            type: 'date',
                            icon: '📅'
                        }
                    ]}
                    onFilter={(filters) => setAppliedFilters(filters)}
                    onReset={() => setAppliedFilters({})}
                />

                {/* Résumé des Résultats et Actions en Masse - Afficher uniquement lorsque les filtres sont appliqués ou des éléments sont sélectionnés */}
                {(Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '' && appliedFilters[key] !== 'all').length > 0 || selectedItems.length > 0) && (
                    <div className="mb-6">
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-purple-200 dark:border-gray-600">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Résultats</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {history.length} événement{history.length > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '' && appliedFilters[key] !== 'all').length > 0 && (
                                        <span className="px-3 py-1 bg-purple-500 text-white rounded-full text-sm font-medium">
                                            {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '' && appliedFilters[key] !== 'all').length} filtre{Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '' && appliedFilters[key] !== 'all').length > 1 ? 's' : ''} actif{Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '' && appliedFilters[key] !== 'all').length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {selectedItems.length > 0 && (
                                        <>
                                            <span className="px-3 py-1 bg-indigo-500 text-white rounded-full text-sm font-medium">
                                                {selectedItems.length} sélectionné{selectedItems.length > 1 ? 's' : ''}
                                            </span>
                                            <button
                                                onClick={() => setShowDeleteModal(true)}
                                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                            >
                                                Supprimer sélection
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* History Content */}
                {loading ? (
                    <TableSquelette rows={8} />
                ) : !history || history.length === 0 || Object.keys(groupedHistory).length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gradient-to-br from-[#1a365d] to-[#2d3748] rounded-2xl flex items-center justify-center text-white text-4xl mb-6 mx-auto shadow-xl">
                            📋
                        </div>
                        <h3 className="text-2xl font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-3">
                            Aucun historique
                        </h3>
                        <p className="text-lg text-[#78786c] dark:text-[#9D9D99]">
                            Votre historique d'activités apparaîtra ici
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedHistory)
                            .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
                            .map(([date, items]) => (
                            <div key={date} className="bg-white/95 dark:bg-[#161615]/95 rounded-xl shadow-md sm:rounded-2xl sm:shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 overflow-hidden">
                                {/* Date Header */}
                                <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-[#2a2a2a] dark:to-[#3a3a3a] px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                        {new Date(date).toLocaleDateString('fr-FR', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={items.every(item => selectedItems.includes(item.id))}
                                            onChange={() => {
                                                const allSelected = items.every(item => selectedItems.includes(item.id));
                                                if (allSelected) {
                                                    setSelectedItems(prev => prev.filter(id => !items.some(item => item.id === id)));
                                                } else {
                                                    setSelectedItems(prev => [...prev, ...items.map(item => item.id)]);
                                                }
                                            }}
                                            className="w-4 h-4 text-[#1a365d] bg-gray-100 border-gray-300 rounded focus:ring-[#1a365d] focus:ring-2"
                                        />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            Tout sélectionner
                                        </span>
                                    </div>
                                </div>

                                {/* History Items */}
                                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {items
                                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                        .map((item, index) => (
                                        <div key={index} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <div className="flex items-start space-x-4">
                                                {/* Checkbox */}
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.includes(item.id)}
                                                    onChange={() => handleSelectItem(item.id)}
                                                    className="w-4 h-4 text-[#1a365d] bg-gray-100 border-gray-300 rounded focus:ring-[#1a365d] focus:ring-2 mt-1"
                                                />

                                                {/* Action Icon */}
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${getActionColor(item.action)}`}>
                                                    {getActionIcon(item.action)}
                                                </div>

                                                {/* Action Details */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-semibold text-[#1b1b18] dark:text-[#EDEDEC]">
                                                            {getActionText(item.action)}
                                                        </h4>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-[#78786c] dark:text-[#9D9D99]">
                                                                {new Date(item.created_at).toLocaleTimeString('fr-FR', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                            <button
                                                                onClick={() => handleDelete(item.id)}
                                                                disabled={deleteLoading}
                                                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm disabled:opacity-50"
                                                                title="Supprimer cet élément"
                                                            >
                                                                Supprimer
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    {item.description && (
                                                        <p className="text-sm text-[#78786c] dark:text-[#9D9D99] mt-1">
                                                            {item.description}
                                                        </p>
                                                    )}

                                                    {item.training_title && (
                                                        <div className="mt-2">
                                                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg">
                                                                📚 {item.training_title}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {item.old_value && item.new_value && (
                                                        <div className="mt-2 text-xs text-[#78786c] dark:text-[#9D9D99]">
                                                            <span className="line-through">{item.old_value}</span>
                                                            <span className="mx-2">→</span>
                                                            <span className="font-medium">{item.new_value}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Single Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={showSingleDeleteModal}
                onClose={() => {
                    setShowSingleDeleteModal(false);
                    setItemToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                itemName="cet élément de l'historique"
                confirmButtonText={deleteLoading ? 'Suppression...' : 'Supprimer'}
            />

            {/* Bulk Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteSelected}
                itemName={`${selectedItems.length} élément(s) de l'historique`}
                confirmButtonText={deleteLoading ? 'Suppression...' : 'Supprimer'}
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
