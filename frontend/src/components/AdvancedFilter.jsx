import { useState, useEffect } from 'react';

export default function FiltreAvance({ fields, onFilter, onReset, appliedFilters }) {
    // État local pour les valeurs en cours de saisie
    // Initialiser avec appliedFilters si disponible (pour le cas de notification)
    const [localFilters, setLocalFilters] = useState(() => {
        // Initialiser avec appliedFilters si disponible
        if (appliedFilters && Object.keys(appliedFilters).length > 0) {
            return appliedFilters;
        }
        return {};
    });
    // Ouvrir automatiquement si des filtres sont déjà appliqués (cas de notification)
    const [isExpanded, setIsExpanded] = useState(() => {
        if (appliedFilters) {
            const hasActiveFilters = Object.values(appliedFilters).some(v => v && v !== '');
            return hasActiveFilters;
        }
        return false;
    });

    // Synchroniser localFilters avec appliedFilters quand il change (notamment après reset)
    useEffect(() => {
        if (appliedFilters !== undefined) {
            setLocalFilters(appliedFilters);
            // Ouvrir automatiquement si des filtres sont appliqués
            const hasActiveFilters = Object.values(appliedFilters).some(v => v && v !== '');
            if (hasActiveFilters) {
                setIsExpanded(true);
            }
        }
    }, [appliedFilters]);

    // Synchroniser localFilters avec appliedFilters au chargement initial
    // Cela garantit que les filtres venant de l'URL (notification) sont immédiatement synchronisés
    useEffect(() => {
        if (appliedFilters && Object.keys(appliedFilters).length > 0) {
            const hasActiveFilters = Object.values(appliedFilters).some(v => v && v !== '');
            if (hasActiveFilters) {
                // Synchroniser localFilters avec appliedFilters pour l'affichage
                setLocalFilters(appliedFilters);
                setIsExpanded(true);
            }
        }
    }, []);

    const handleInputChange = (fieldName, value) => {
        setLocalFilters(prev => ({
            ...prev,
            [fieldName]: value
        }));
    };

    const handleApplyFilter = () => {
        onFilter(localFilters);
    };

    const handleReset = () => {
        const emptyFilters = {};
        setLocalFilters(emptyFilters);
        onReset();
    };

    // Utiliser localFilters pour compter et afficher
    const activeFiltersCount = Object.values(localFilters).filter(v => v && v !== '').length;
    
    // Vérifier si les filtres locaux sont identiques aux filtres appliqués
    const filtersAreApplied = JSON.stringify(localFilters) === JSON.stringify(appliedFilters || {});

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
            {/* En-tête */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filtres Avancés</h3>
                        {activeFiltersCount > 0 && (
                            <p className="text-sm text-blue-600 dark:text-blue-400">
                                {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 border border-gray-200 dark:border-gray-600"
                >
                    <span className="font-medium">{isExpanded ? 'Masquer' : 'Afficher'}</span>
                    <svg 
                        className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            {/* Champs de Filtre */}
            {isExpanded && (
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {fields.map((field) => (
                            <div key={field.name}>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    {field.icon && <span className="mr-2">{field.icon}</span>}
                                    {field.label}
                                </label>
                                
                                {field.type === 'text' && (
                                    <input
                                        type="text"
                                        value={localFilters[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleApplyFilter();
                                            }
                                        }}
                                        placeholder={field.placeholder}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                    />
                                )}

                                {field.type === 'select' && (
                                    <select
                                        value={localFilters[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Tous</option>
                                        {field.options.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                {field.type === 'date' && (
                                    <input
                                        type="date"
                                        value={localFilters[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white"
                                    />
                                )}

                                {field.type === 'number' && (
                                    <input
                                        type="number"
                                        value={localFilters[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleApplyFilter();
                                            }
                                        }}
                                        placeholder={field.placeholder}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Boutons d'Action */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={handleApplyFilter}
                            disabled={filtersAreApplied}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 font-semibold ${
                                filtersAreApplied
                                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            {filtersAreApplied ? 'Filtres appliqués' : 'Appliquer les filtres'}
                        </button>
                        
                        <button
                            type="button"
                            onClick={handleReset}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 font-semibold border border-gray-300 dark:border-gray-600"
                            disabled={activeFiltersCount === 0}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Réinitialiser
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

