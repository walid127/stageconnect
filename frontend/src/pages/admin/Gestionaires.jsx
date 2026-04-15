import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NavigationAdmin from '../../components/AdminNav';
import TableSquelette from '../../components/SkeletonTable';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import axios from 'axios';

export default function Gestionaires() {
    const { user } = useAuth();
    const [gestionaires, setGestionaires] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedGestionaire, setSelectedGestionaire] = useState(null);
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');
    const [formData, setFormData] = useState({
        nom: '',
        email: '',
        telephone: '',
        mdp: '',
        statut: 'actif'
    });

    const showMessagePopup = (msg, type = 'success') => {
        setMessage(msg);
        setMessageType(type);
        setShowMessage(true);
        setTimeout(() => {
            setShowMessage(false);
        }, 4000);
    };

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchGestionaires();
        }
    }, [user]);

    const fetchGestionaires = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/gestionaires');
            setGestionaires(response.data.data || response.data);
        } catch (err) {
            showMessagePopup('Erreur lors du chargement des gestionaires', 'error');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            // Validation côté client
            if (!formData.mdp || formData.mdp.trim().length < 8) {
                showMessagePopup('Le mot de passe doit contenir au moins 8 caractères.', 'error');
                return;
            }
            
            // S'assurer que mdp est une chaîne
            const dataToSend = {
                ...formData,
                mdp: String(formData.mdp || '')
            };
            
            await axios.post('/api/admin/gestionaires', dataToSend);
            // Recharger complètement la page après création
            window.location.reload();
        } catch (err) {
            let errorMsg = err.response?.data?.message || 'Erreur lors de la création';
            if (err.response?.data?.errors) {
                const errors = err.response.data.errors;
                errorMsg = errors.telephone?.[0] || errors.phone?.[0] || errors.mdp?.[0] || errors.email?.[0] || errorMsg;
            }
            showMessagePopup(errorMsg, 'error');
        }
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        try {
            // Ne pas envoyer mdp si il est vide (pour ne pas changer le mot de passe)
            const dataToSend = { ...formData };
            if (!dataToSend.mdp || dataToSend.mdp.trim() === '') {
                delete dataToSend.mdp;
            } else {
                // Si mdp est fourni, s'assurer qu'il a au moins 8 caractères
                if (dataToSend.mdp.trim().length < 8) {
                    showMessagePopup('Le mot de passe doit contenir au moins 8 caractères.', 'error');
                    return;
                }
                // S'assurer que mdp est une chaîne
                dataToSend.mdp = String(dataToSend.mdp);
            }
            
            await axios.put(`/api/admin/gestionaires/${selectedGestionaire.id}`, dataToSend);
            setShowEditModal(false);
            setSelectedGestionaire(null);
            setFormData({ nom: '', email: '', telephone: '', mdp: '', statut: 'actif' });
            showMessagePopup('Gestionaire modifié avec succès!', 'success');
            fetchGestionaires();
        } catch (err) {
            let errorMsg = err.response?.data?.message || 'Erreur lors de la modification';
            if (err.response?.data?.errors) {
                const errors = err.response.data.errors;
                errorMsg = errors.telephone?.[0] || errors.phone?.[0] || errors.mdp?.[0] || errors.email?.[0] || errorMsg;
            }
            showMessagePopup(errorMsg, 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`/api/admin/gestionaires/${selectedGestionaire.id}`);
            setShowDeleteModal(false);
            setSelectedGestionaire(null);
            showMessagePopup('Gestionaire supprimé avec succès!', 'success');
            fetchGestionaires();
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Erreur lors de la suppression';
            showMessagePopup(errorMsg, 'error');
        }
    };

    const openEditModal = (gestionaire) => {
        setSelectedGestionaire(gestionaire);
        setFormData({
            nom: gestionaire.nom || '',
            email: gestionaire.email || '',
            telephone: gestionaire.telephone || '',
            mdp: '',
            statut: gestionaire.statut || 'actif'
        });
        setShowEditModal(true);
    };

    if (user?.role !== 'admin') {
        return (
            <div className="app-container">
                <NavigationAdmin />
                <div className="p-8 text-center">
                    <p className="text-red-600 dark:text-red-400">Accès non autorisé</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <NavigationAdmin />

            {/* Success/Error Message Popup */}
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
                            className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Epic Hero Section */}
            <div className="hero-section">
                <div className="hero-overlay"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNkNGFmMzciIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
                
                <div className="hero-content">
                    <div className="text-center">
                        <h1 className="hero-title">
                            Gestion des Gestionaires
                        </h1>
                        
                        <div className="mb-4">
                            <Link 
                                to="/admin/dashboard" 
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-xl border border-white/30 shadow-xl hover:shadow-white/20 transition-all duration-300 text-sm font-medium"
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

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-4 relative z-20">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-[#1b1b18] dark:text-[#EDEDEC]">
                        Liste des Gestionaires
                    </h2>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] hover:from-[#b8860b] hover:to-[#d4af37] text-white rounded-xl shadow-xl hover:shadow-yellow-500/50 transition-all duration-300 text-sm font-bold"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Créer un gestionaire
                    </button>
                </div>

                {loading ? (
                    <TableSquelette />
                ) : (
                    <div className="bg-white/95 dark:bg-gray-800/95 rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                        <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead>
                                <tr className="sc-table-header-gradient text-white">
                                    <th className="px-6 py-4 text-center font-semibold">Nom</th>
                                    <th className="px-6 py-4 text-center font-semibold">Email</th>
                                    <th className="px-6 py-4 text-center font-semibold">Téléphone</th>
                                    <th className="px-6 py-4 text-center font-semibold">Statut</th>
                                    <th className="px-6 py-4 text-center font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gestionaires.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <span className="text-4xl">👥</span>
                                                <p className="text-lg font-medium">Aucun gestionaire trouvé</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    gestionaires.map((gestionaire) => (
                                        <tr key={gestionaire.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 text-center font-medium text-gray-900 dark:text-white">{gestionaire.nom}</td>
                                            <td className="px-6 py-4 text-center text-gray-700 dark:text-gray-300">{gestionaire.email}</td>
                                            <td className="px-6 py-4 text-center text-gray-700 dark:text-gray-300">{gestionaire.telephone || '-'}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                                    gestionaire.statut === 'actif' 
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                                        : gestionaire.statut === 'inactif'
                                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                                }`}>
                                                    {gestionaire.statut}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(gestionaire)}
                                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                    >
                                                        Modifier
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedGestionaire(gestionaire);
                                                            setShowDeleteModal(true);
                                                        }}
                                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm"
                                                    >
                                                        Supprimer
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 w-full max-w-md overflow-hidden transform animate-scale-in">
                        <div className="relative bg-gradient-to-r from-[#1a365d] via-[#2d3748] to-[#1e293b] p-8">
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '30px 30px'}}></div>
                            </div>
                            <div className="relative flex justify-between items-start">
                                <div>
                                    <h2 className="text-3xl font-extrabold text-white mb-2">Créer un gestionaire</h2>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setFormData({ nom: '', email: '', telephone: '', mdp: '', statut: 'actif' });
                                    }}
                                    className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl flex items-center justify-center transition-all duration-300 hover:rotate-90 text-white text-xl"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleCreate} className="p-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nom complet</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.nom}
                                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                                        placeholder="Nom du gestionaire"
                                        maxLength="20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Téléphone</label>
                                    <input
                                        type="tel"
                                        value={formData.telephone}
                                        onChange={(e) => {
                                            const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            setFormData({ ...formData, telephone: digits });
                                        }}
                                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                                        placeholder="0672587841"
                                        maxLength="10"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Mot de passe</label>
                                    <input
                                        type="password"
                                        required
                                        value={formData.mdp}
                                        onChange={(e) => setFormData({ ...formData, mdp: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Statut</label>
                                    <select
                                        value={formData.statut}
                                        onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                                    >
                                        <option value="actif">Actif</option>
                                        <option value="inactif">Inactif</option>
                                        <option value="en_attente">En attente</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-4 mt-8 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setFormData({ nom: '', email: '', telephone: '', mdp: '', statut: 'actif' });
                                    }}
                                    className="flex-1 px-6 py-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-[#f53003] to-[#d42803] hover:from-[#d42803] hover:to-[#b32002] text-white rounded-2xl transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    Créer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 w-full max-w-sm overflow-hidden transform animate-scale-in">
                        <div className="relative bg-gradient-to-r from-[#1a365d] via-[#2d3748] to-[#1e293b] p-6">
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '30px 30px'}}></div>
                            </div>
                            <div className="relative flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-extrabold text-white mb-1">Modifier le gestionaire</h2>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedGestionaire(null);
                                        setFormData({ nom: '', email: '', telephone: '', mdp: '', statut: 'actif' });
                                    }}
                                    className="w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl flex items-center justify-center transition-all duration-300 hover:rotate-90 text-white text-lg"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleEdit} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Nom complet</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.nom}
                                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                        className="w-full px-3 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-sm"
                                        placeholder="Nom du gestionaire"
                                        maxLength="20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-sm"
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Téléphone</label>
                                    <input
                                        type="tel"
                                        value={formData.telephone}
                                        onChange={(e) => {
                                            const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            setFormData({ ...formData, telephone: digits });
                                        }}
                                        className="w-full px-3 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-sm"
                                        placeholder="0672587841"
                                        maxLength="10"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Nouveau mot de passe</label>
                                    <input
                                        type="password"
                                        value={formData.mdp}
                                        onChange={(e) => setFormData({ ...formData, mdp: e.target.value })}
                                        className="w-full px-3 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Statut</label>
                                    <select
                                        value={formData.statut}
                                        onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                                        className="w-full px-3 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-sm"
                                    >
                                        <option value="actif">Actif</option>
                                        <option value="inactif">Inactif</option>
                                        <option value="en_attente">En attente</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedGestionaire(null);
                                        setFormData({ nom: '', email: '', telephone: '', mdp: '', statut: 'actif' });
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-all duration-300 font-semibold shadow-md hover:shadow-lg text-sm"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#f53003] to-[#d42803] hover:from-[#d42803] hover:to-[#b32002] text-white rounded-xl transition-all duration-300 font-semibold shadow-md hover:shadow-lg text-sm"
                                >
                                    Modifier
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            <DeleteConfirmModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setSelectedGestionaire(null);
                }}
                onConfirm={handleDelete}
                itemName={selectedGestionaire?.nom}
            />
        </div>
    );
}
