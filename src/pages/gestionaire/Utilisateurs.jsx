import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCache } from '../../context/CacheContext';
import NavigationGestionaire from '../../components/GestionaireNav';
import TableSquelette from '../../components/SkeletonTable';
import FiltreAvance from '../../components/AdvancedFilter';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import axios from 'axios';

export default function UtilisateursGestionaire() {
    const { getCachedData, setCachedData, clearCache } = useCache();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [editFormData, setEditFormData] = useState({
        name: '',
        email: '',
        phone: '',
        specialization: ''
    });
    const [createFormData, setCreateFormData] = useState({
        name: '',
        email: '',
        phone: '',
        formateur_id: '',
        specialization: '',
        institution: '',
        diploma: '',
        city: '',
    });
    const [creating, setCreating] = useState(false);
    const [specialists, setSpecialists] = useState([]);
    const [loadingSpecialists, setLoadingSpecialists] = useState(false);
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    
    // Advanced filter state
    const [appliedFilters, setAppliedFilters] = useState({});
    
    // Static counts that don't change when switching filters
    const [staticCounts, setStaticCounts] = useState({
        total: 0,
        pending: 0,
        active: 0,
        inactive: 0
    });

    // Calculate filtered users - exclude admin accounts
    const filteredUsers = users.filter(user => {
        // Exclude admin accounts
        if (user.role === 'gestionaire') return false;
        
        // Apply advanced filters
        if (appliedFilters.name && !user.nom?.toLowerCase().includes(appliedFilters.name.toLowerCase())) {
            return false;
        }
        
        if (appliedFilters.email && !user.email?.toLowerCase().includes(appliedFilters.email.toLowerCase())) {
            return false;
        }
        
        if (appliedFilters.phone) {
            const phone = user.telephone || user.phone || '';
            if (!phone.toLowerCase().includes(appliedFilters.phone.toLowerCase())) {
                return false;
            }
        }
        
        if (appliedFilters.specialization && !user.formateur?.specialite?.toLowerCase().includes(appliedFilters.specialization.toLowerCase())) {
            return false;
        }
        
        if (appliedFilters.status && appliedFilters.status !== '' && (user.statut || user.status) !== appliedFilters.status) {
            return false;
        }
        
        return true;
    });

    useEffect(() => {
        fetchUsers();
        fetchSpecialists();
    }, []);

    const showSuccessMessage = (text, type = 'success') => {
        setMessage(text);
        setMessageType(type);
        setShowMessage(true);
        setTimeout(() => {
            setShowMessage(false);
        }, 3000);
    };

    const fetchUsers = async (skipCache = false, silent = false) => {
        try {
            if (!silent) {
                setError(''); // Clear previous errors
                setLoading(true);
            }
            
            // Vérifier le cache d'abord (sauf si skipCache est true)
            if (!skipCache) {
                const cachedUsers = getCachedData('admin_formateur_accounts');
                if (cachedUsers) {
                    setUsers(cachedUsers.users);
                    setStaticCounts(cachedUsers.counts);
                    if (!silent) {
                        setLoading(false);
                    }
                    return;
                }
            }
            
            const response = await axios.get('/api/admin/formateur-accounts');
            
            // Gérer les réponses paginées et non paginées
            let usersData = [];
            if (response.data.data && Array.isArray(response.data.data)) {
                usersData = response.data.data;
            } else if (Array.isArray(response.data)) {
                usersData = response.data;
            } else {
                usersData = [];
            }
            
            setUsers(usersData);
            
            // Mettre à jour les compteurs statiques - exclure les comptes gestionaire
            const formateurUsers = usersData.filter(u => u.role !== 'gestionaire');
            const counts = {
                total: formateurUsers.length,
                pending: formateurUsers.filter(u => (u.statut || u.status) === 'en_attente').length,
                active: formateurUsers.filter(u => (u.statut || u.status) === 'actif').length,
                inactive: formateurUsers.filter(u => (u.statut || u.status) === 'inactif').length
            };
            setStaticCounts(counts);
            
            // Mettre en cache les données
            setCachedData('admin_formateur_accounts', { users: usersData, counts });
        } catch (err) {
            if (!silent) {
                setError(err.response?.data?.message || 'Erreur lors du chargement des utilisateurs');
                setUsers([]);
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    const handleStatusChange = async (userId, newStatus) => {
        // Obtenir le nom d'utilisateur AVANT la mise à jour
        const user = users.find(u => u.id === userId);
        const userName = user ? (user.nom || user.name) : 'Utilisateur';
        
        try {
            // Mettre à jour immédiatement l'état local AVANT l'appel API pour un feedback instantané
            setUsers(prevUsers => {
                const updatedUsers = prevUsers.map(u => 
                    u.id === userId 
                        ? { ...u, statut: newStatus, status: newStatus }
                        : u
                );
                
                // Mettre à jour les compteurs statiques avec les utilisateurs mis à jour
                const formateurUsers = updatedUsers.filter(u => u.role !== 'gestionaire');
                setStaticCounts({
                    total: formateurUsers.length,
                    pending: formateurUsers.filter(u => (u.statut || u.status) === 'en_attente').length,
                    active: formateurUsers.filter(u => (u.statut || u.status) === 'actif').length,
                    inactive: formateurUsers.filter(u => (u.statut || u.status) === 'inactif').length
                });
                
                return updatedUsers;
            });
            
            // Ensuite, faire l'appel API
            await axios.put(`/api/admin/formateur-accounts/${userId}/status`, { status: newStatus });
            
            // Clear cache après la mise à jour réussie
            clearCache('admin_formateur_accounts');
            clearCache('gestionaire_dashboard_stats');
            
            // Afficher le message de succès en fonction du statut
            if (newStatus === 'actif') {
                showSuccessMessage(`✅ ${userName} a été activé avec succès!`);
            } else if (newStatus === 'inactif') {
                showSuccessMessage(`✅ ${userName} a été désactivé avec succès!`);
            } else {
                showSuccessMessage(`✅ Statut de ${userName} mis à jour avec succès!`);
            }
        } catch (err) {
            // En cas d'erreur, restaurer l'état précédent
            showSuccessMessage('❌ Erreur lors de la mise à jour du statut', 'error');
            console.error(err);
            // Recharger les données depuis le serveur pour restaurer l'état correct (silencieux)
            fetchUsers(true, true);
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

    const handleEdit = (user) => {
        setSelectedUser(user);
        setEditFormData({
            name: user.nom || user.name || '',
            email: user.email || '',
            phone: user.telephone || user.phone || '',
            specialization: user.formateur?.specialite || ''
        });
        setShowEditModal(true);
    };

    const handleDelete = (user) => {
        setSelectedUser(user);
        setShowDeleteModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            // Préparer le payload avec les bonnes clés attendues par l'API
            const payload = {
                name: editFormData.name,
                email: editFormData.email,
                phone: editFormData.phone || null,
                specialization: editFormData.specialization || null,
            };
            
            await axios.put(`/api/admin/formateur-accounts/${selectedUser.id}`, payload);
            
            // Clear cache
            clearCache('admin_formateur_accounts');
            
            // Mettre à jour immédiatement l'état local
            setUsers(prevUsers => 
                prevUsers.map(u => 
                    u.id === selectedUser.id 
                        ? { 
                            ...u, 
                            nom: payload.name, 
                            name: payload.name,
                            email: payload.email,
                            telephone: payload.phone || null,
                            phone: payload.phone || null,
                            formateur: u.formateur ? {
                                ...u.formateur,
                                specialite: payload.specialization || u.formateur.specialite
                            } : u.formateur
                        }
                        : u
                )
            );
            
            // Réinitialiser les filtres pour voir l'utilisateur mis à jour
            setAppliedFilters({});
            
            setShowEditModal(false);
            setSelectedUser(null);
            showSuccessMessage(`✅ ${editFormData.name} a été modifié avec succès!`);
            
            // Rafraîchir les données depuis le serveur en arrière-plan de manière silencieuse
            setTimeout(() => {
                fetchUsers(true, true); // skipCache=true, silent=true
            }, 500);
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
            showSuccessMessage(`❌ Erreur lors de la mise à jour du formateur: ${error.response?.data?.message || error.message}`, 'error');
        }
    };

    const handleDeleteConfirm = async () => {
        try {
            await axios.delete(`/api/admin/formateur-accounts/${selectedUser.id}`);
            
            // Clear cache
            clearCache('admin_formateur_accounts');
            clearCache('gestionaire_dashboard_stats');
            
            // Mettre à jour immédiatement l'état local
            setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
            
            // Réinitialiser les filtres pour voir la liste mise à jour
            setAppliedFilters({});
            
            setShowDeleteModal(false);
            setSelectedUser(null);
            showSuccessMessage(`✅ ${selectedUser.nom} a été supprimé avec succès!`);
            
            // Rafraîchir silencieusement en arrière-plan
            setTimeout(() => {
                fetchUsers(true, true);
            }, 500);
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'utilisateur:', error);
            showSuccessMessage('❌ Erreur lors de la suppression du formateur', 'error');
        }
    };

    const handleCreateChange = (e) => {
        setCreateFormData({
            ...createFormData,
            [e.target.name]: e.target.value,
        });
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setCreating(true);
        setError('');

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

        if (createFormData.password !== createFormData.password_confirmation) {
            showSuccessMessage('Les mots de passe ne correspondent pas', 'error');
            setCreating(false);
            return;
        }

        try {
            const payload = {
                nom: createFormData.name,
                email: createFormData.email || undefined,
                phone: createFormData.phone || undefined,
                formateur_id: createFormData.formateur_id,
                specialization: createFormData.specialization || undefined,
                institution: createFormData.institution || undefined,
                diploma: createFormData.diploma || undefined,
                city: createFormData.city || undefined,
            };

            await axios.post('/api/admin/formateurs', payload);

            // Après création, recharger complètement la page pour tout rafraîchir
            window.location.reload();
        } catch (error) {
            console.error('Erreur lors de la création du formateur:', error);
            let errorMsg = error.response?.data?.message || 'Erreur lors de la création du formateur';
            if (error.response?.data?.errors) {
                const errors = error.response.data.errors;
                errorMsg = errors.formateur_id?.[0] || errors.phone?.[0] || errors.email?.[0] || errorMsg;
            }
            showSuccessMessage(errorMsg, 'error');
        } finally {
            setCreating(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'actif': return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400';
            case 'inactif': return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400';
            default: return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'actif': return 'Actif';
            case 'inactif': return 'Inactif';
            default: return 'En attente';
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
                            Comptes Formateurs
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
                            name: 'phone',
                            label: 'Téléphone',
                            type: 'text',
                            placeholder: 'Rechercher par téléphone...',
                            icon: '📱'
                        },
                        {
                            name: 'specialization',
                            label: 'Spécialité',
                            type: 'select',
                            icon: '🎯',
                            options: specialists.map(spec => ({
                                value: spec.nom,
                                label: spec.nom
                            }))
                        },
                        {
                            name: 'status',
                            label: 'Statut',
                            type: 'select',
                            icon: '📊',
                            options: [
                                { value: 'en_attente', label: '⏳ En attente' },
                                { value: 'actif', label: '✅ Actif' },
                                { value: 'inactif', label: '⛔ Inactif' }
                            ]
                        }
                    ]}
                    onFilter={(filters) => setAppliedFilters(filters)}
                    onReset={() => setAppliedFilters({})}
                />

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {/* Total Card */}
                    <div className="group relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                        <div className="relative bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-blue-100 dark:border-blue-900/50 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-xl">📊</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-2xl font-black bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
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

                    {/* Active Card */}
                    <div className="group relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-green-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                        <div className="relative bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-green-100 dark:border-green-900/50 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-xl">✅</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-2xl font-black bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                                        {staticCounts.active}
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 font-medium text-xs truncate">Actifs</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Inactive Card */}
                    <div className="group relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                        <div className="relative bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-xl">⛔</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-2xl font-black bg-gradient-to-r from-gray-600 to-gray-700 bg-clip-text text-transparent">
                                        {staticCounts.inactive}
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 font-medium text-xs truncate">Inactifs</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Résumé des Résultats - Afficher uniquement lorsque les filtres sont appliqués */}
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
                                            {filteredUsers.length} formateur{filteredUsers.length > 1 ? 's' : ''} trouvé{filteredUsers.length > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-medium">
                                        {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length} filtre{Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 1 ? 's' : ''} actif{Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 1 ? 's' : ''}
                                    </span>
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
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">👤</span>
                        </div>
                        <h3 className="text-2xl font-semibold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">Aucun formateur trouvé</h3>
                        <p className="text-lg text-[#78786c] dark:text-[#9D9D99]">
                            {Object.keys(appliedFilters).filter(key => appliedFilters[key] && appliedFilters[key] !== '').length > 0 
                                ? "Aucun formateur ne correspond aux critères de recherche"
                                : "Aucun formateur inscrit pour le moment"}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white/80 dark:bg-[#161615]/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 overflow-hidden">
                        {/* List Header */}
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] px-6 py-4">
                            <div className="grid grid-cols-12 gap-4 text-white font-semibold">
                                <div className="col-span-1 text-center">#</div>
                                <div className="col-span-2 text-center">Formateur</div>
                                <div className="col-span-2 text-center">Email</div>
                                <div className="col-span-2 text-center">Téléphone</div>
                                <div className="col-span-2 text-center">Statut</div>
                                <div className="col-span-3 text-center">Actions</div>
                            </div>
                        </div>
                        
                        {/* List Items */}
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredUsers.map((u, index) => (
                                <div
                                    key={u.id}
                                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200"
                                >
                                    <div className="grid grid-cols-12 gap-4 items-center">
                                        {/* Index */}
                                        <div className="col-span-1 text-center">
                                            <span className="text-sm font-medium text-[#78786c] dark:text-[#9D9D99]">
                                                {index + 1}
                                            </span>
                                        </div>
                                        
                                        {/* User Info */}
                                        <div className="col-span-2 min-w-0 text-center">
                                            <div>
                                                <h3 className="font-semibold text-[#1b1b18] dark:text-[#EDEDEC] text-sm truncate" title={u.nom}>
                                                    {u.nom}
                                                </h3>
                                            </div>
                                        </div>
                                        
                                        {/* Email */}
                                        <div className="col-span-2 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <svg className="w-2.5 h-2.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                                </svg>
                                                <span className="text-xs text-[#78786c] dark:text-[#9D9D99] truncate">
                                                    {u.email}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Phone */}
                                        <div className="col-span-2 text-center">
                                            {u.telephone ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <svg className="w-2.5 h-2.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                                    </svg>
                                                    <span className="text-xs text-[#78786c] dark:text-[#9D9D99]">
                                                        {u.telephone}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">Non renseigné</span>
                                            )}
                                        </div>
                                        
                                        {/* Status */}
                                        <div className="col-span-2 text-center">
                                            <span className={`inline-flex px-3 py-1 text-xs rounded-full font-medium ${getStatusColor(u.statut || u.status)}`}>
                                                {getStatusText(u.statut || u.status)}
                                            </span>
                                        </div>
                                        
                                        {/* Actions */}
                                        <div className="col-span-3 text-center flex flex-wrap gap-2 justify-center items-center">
                                            {(u.statut || u.status) === 'en_attente' && (
                                                <>
                                                    <button
                                                        onClick={() => handleStatusChange(u.id, 'actif')}
                                                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                    >
                                                        Valider
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusChange(u.id, 'inactif')}
                                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                    >
                                                        Refuser
                                                    </button>
                                                </>
                                            )}
                                            {(u.statut || u.status) === 'actif' && (
                                                <button
                                                    onClick={() => handleStatusChange(u.id, 'inactif')}
                                                    className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                >
                                                    Désactiver
                                                </button>
                                            )}
                                            {(u.statut || u.status) === 'inactif' && (
                                                <button
                                                    onClick={() => handleStatusChange(u.id, 'actif')}
                                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                >
                                                    Réactiver
                                                </button>
                                            )}
                                            
                                            {/* Edit and Delete buttons for all users */}
                                            <button
                                                onClick={() => handleEdit(u)}
                                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                            >
                                                Modifier
                                            </button>
                                            <button
                                                onClick={() => handleDelete(u)}
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

            {/* Edit User Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] px-6 py-4 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Modifier le Formateur</h3>
                                </div>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="text-white hover:text-blue-200 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Nom complet
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-300"
                                    required
                                    maxLength="20"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={editFormData.email}
                                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-300"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Téléphone
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={editFormData.phone}
                                    onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-300"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Spécialité
                                </label>
                                <select
                                    name="specialization"
                                    value={editFormData.specialization}
                                    onChange={(e) => setEditFormData({...editFormData, specialization: e.target.value})}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-300"
                                >
                                    <option value="" disabled>Sélectionner une spécialité</option>
                                    {specialists.map((specialist) => (
                                        <option key={specialist.id} value={specialist.nom}>
                                            {specialist.nom}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-all font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1a365d] to-[#2d3748] text-white rounded-xl hover:from-[#2d3748] hover:to-[#1a365d] transition-all font-medium shadow-lg"
                                >
                                    Sauvegarder
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete User Modal */}
            <DeleteConfirmModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setSelectedUser(null);
                }}
                onConfirm={handleDeleteConfirm}
                itemName={selectedUser?.nom || 'N/A'}
                itemDetails={
                    <p className="text-sm text-[#78786c] dark:text-[#9D9D99] mt-1">
                        {selectedUser?.email || 'N/A'}
                    </p>
                }
                warningMessage="Cette action supprimera uniquement le compte utilisateur. Le profil formateur sera conservé et redeviendra un formateur sans compte."
                itemIcon={
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                }
            />

            {/* Create Formateur Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-4xl border border-gray-200 dark:border-gray-700 my-8">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] px-6 py-4 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Créer un Nouveau Formateur</h3>
                                    <p className="text-white/80 text-sm">Créez le profil formateur (le compte sera créé lors de l'inscription)</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setError('');
                                        setCreateFormData({
                                            name: '',
                                            email: '',
                                            password: '',
                                            password_confirmation: '',
                                            phone: '',
                                            formateur_id: '',
                                            specialization: '',
                                            institution: '',
                                            diploma: '',
                                            city: '',
                                            status: 'actif'
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
                        <form onSubmit={handleCreateSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

                            {/* Informations de Base */}
                            <div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                                    Informations de Base
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Nom complet *
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={createFormData.name}
                                            onChange={handleCreateChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                            required
                                            maxLength="20"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Téléphone
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={createFormData.phone}
                                            onChange={handleCreateChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            ID Formateur *
                                        </label>
                                        <input
                                            type="text"
                                            name="formateur_id"
                                            value={createFormData.formateur_id}
                                            onChange={handleCreateChange}
                                            placeholder="FOR-0001"
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                            required
                                        />
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            L'ID formateur unique doit être saisi par l'administrateur
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Email (optionnel)
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={createFormData.email}
                                            onChange={handleCreateChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                            placeholder="Pour référence uniquement"
                                        />
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            L'email sera défini lors de l'inscription par le formateur
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Profil Professionnel */}
                            <div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                                    Profil Professionnel
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Spécialité
                                        </label>
                                        <select
                                            name="specialization"
                                            value={createFormData.specialization}
                                            onChange={handleCreateChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                        >
                                            <option value="" disabled>Sélectionner une spécialité</option>
                                            {specialists.map((specialist) => (
                                                <option key={specialist.id} value={specialist.nom}>
                                                    {specialist.nom}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Ville
                                        </label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={createFormData.city}
                                            onChange={handleCreateChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Institution
                                        </label>
                                        <input
                                            type="text"
                                            name="institution"
                                            value={createFormData.institution}
                                            onChange={handleCreateChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Diplôme
                                        </label>
                                        <input
                                            type="text"
                                            name="diploma"
                                            value={createFormData.diploma}
                                            onChange={handleCreateChange}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setError('');
                                        setCreateFormData({
                                            name: '',
                                            email: '',
                                            password: '',
                                            password_confirmation: '',
                                            phone: '',
                                            formateur_id: '',
                                            specialization: '',
                                            institution: '',
                                            diploma: '',
                                            city: '',
                                            status: 'actif'
                                        });
                                    }}
                                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-all font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1a365d] to-[#2d3748] text-white rounded-xl hover:from-[#2d3748] hover:to-[#1a365d] transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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

