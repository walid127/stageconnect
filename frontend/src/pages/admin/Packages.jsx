import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NavigationAdmin from '../../components/AdminNav';
import TableSquelette from '../../components/SkeletonTable';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import axios from 'axios';

export default function Packages() {
    const { user } = useAuth();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [installFormData, setInstallFormData] = useState({
        package: '',
        version: ''
    });
    const [isInstalling, setIsInstalling] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isUninstalling, setIsUninstalling] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState(null);

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
            fetchPackages();
        }
    }, [user]);

    const fetchPackages = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/packages');
            setPackages(response.data.packages || []);
        } catch (err) {
            showMessagePopup('Erreur lors du chargement des paquets', 'error');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleInstall = async (e) => {
        e.preventDefault();
        try {
            setIsInstalling(true);
            await axios.post('/api/admin/packages/install', installFormData);
            showMessagePopup('Paquet installé avec succès!', 'success');
            setShowInstallModal(false);
            setInstallFormData({ package: '', version: '' });
            fetchPackages();
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Erreur lors de l\'installation';
            showMessagePopup(errorMsg, 'error');
        } finally {
            setIsInstalling(false);
        }
    };

    const handleUpdate = async (packageName) => {
        try {
            setIsUpdating(true);
            // Encoder le nom du paquet pour gérer les slashes (ex: brick/math)
            const encodedPackageName = encodeURIComponent(packageName);
            await axios.put(`/api/admin/packages/${encodedPackageName}/update`);
            showMessagePopup('Paquet mis à jour avec succès!', 'success');
            fetchPackages();
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Erreur lors de la mise à jour';
            showMessagePopup(errorMsg, 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUninstall = async () => {
        try {
            setIsUninstalling(true);
            // Encoder le nom du paquet pour gérer les slashes (ex: brick/math)
            const encodedPackageName = encodeURIComponent(selectedPackage.name);
            await axios.delete(`/api/admin/packages/${encodedPackageName}/uninstall`);
            showMessagePopup('Paquet désinstallé avec succès!', 'success');
            setShowDeleteModal(false);
            setSelectedPackage(null);
            fetchPackages();
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Erreur lors de la désinstallation';
            showMessagePopup(errorMsg, 'error');
        } finally {
            setIsUninstalling(false);
        }
    };

    const handleUpdateAll = async () => {
        if (!window.confirm('Êtes-vous sûr de vouloir mettre à jour tous les paquets ?')) {
            return;
        }
        try {
            setIsUpdating(true);
            await axios.post('/api/admin/packages/update-all');
            showMessagePopup('Tous les paquets ont été mis à jour avec succès!', 'success');
            fetchPackages();
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Erreur lors de la mise à jour';
            showMessagePopup(errorMsg, 'error');
        } finally {
            setIsUpdating(false);
        }
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
                <div className="fixed top-4 right-4 z-50 animate-slide-in">
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
                            Gestion des Paquets
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
                        Paquets installés ({packages.length})
                    </h2>
                    <div className="flex gap-4">
                        <button
                            onClick={handleUpdateAll}
                            disabled={isUpdating}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 font-semibold transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUpdating ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Mise à jour...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <span>🔄</span>
                                    Mettre à jour tous
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setShowInstallModal(true)}
                            className="bg-gradient-to-r from-[#f53003] to-[#d42803] text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-red-500/20 transition-all duration-300 font-semibold transform hover:-translate-y-0.5"
                        >
                            + Installer un paquet
                        </button>
                    </div>
                </div>

                {loading ? (
                    <TableSquelette />
                ) : (
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                        {packages.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <span className="text-4xl">📦</span>
                                    <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Aucun paquet installé</p>
                                    <p className="text-sm text-gray-400 dark:text-gray-500">Installez votre premier paquet en cliquant sur le bouton ci-dessus</p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                            <table className="w-full min-w-[1050px]">
                                <thead>
                                    <tr className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] text-white">
                                        <th className="px-6 py-4 text-center font-semibold">Nom</th>
                                        <th className="px-6 py-4 text-center font-semibold">Version</th>
                                        <th className="px-6 py-4 text-center font-semibold">Type</th>
                                        <th className="px-6 py-4 text-center font-semibold">Description</th>
                                        <th className="px-6 py-4 text-center font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {packages.map((pkg, index) => (
                                        <tr key={index} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 text-center font-medium text-gray-900 dark:text-white">{pkg.name}</td>
                                            <td className="px-6 py-4 text-center text-gray-700 dark:text-gray-300">{pkg.version}</td>
                                            <td className="px-6 py-4 text-center text-gray-700 dark:text-gray-300">{pkg.type || '-'}</td>
                                            <td className="px-6 py-4 text-center text-gray-700 dark:text-gray-300">{pkg.description || '-'}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleUpdate(pkg.name)}
                                                        disabled={isUpdating}
                                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        Mettre à jour
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedPackage(pkg);
                                                            setShowDeleteModal(true);
                                                        }}
                                                        disabled={isUninstalling}
                                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-all duration-200 font-medium text-xs shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        Désinstaller
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Install Modal */}
            {showInstallModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 w-full max-w-md overflow-hidden transform animate-scale-in">
                        <div className="relative bg-gradient-to-r from-[#1a365d] via-[#2d3748] to-[#1e293b] p-8">
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '30px 30px'}}></div>
                            </div>
                            <div className="relative flex justify-between items-start">
                                <div>
                                    <h2 className="text-3xl font-extrabold text-white mb-2">Installer un paquet</h2>
                                    <p className="text-white/70 text-sm">Ajouter un nouveau paquet au système</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowInstallModal(false);
                                        setInstallFormData({ package: '', version: '' });
                                    }}
                                    className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl flex items-center justify-center transition-all duration-300 hover:rotate-90 text-white text-xl"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleInstall} className="p-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nom du paquet (ex: vendor/package)</label>
                                    <input
                                        type="text"
                                        required
                                        value={installFormData.package}
                                        onChange={(e) => setInstallFormData({ ...installFormData, package: e.target.value })}
                                        placeholder="ex: laravel/sanctum"
                                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Version (optionnel)</label>
                                    <input
                                        type="text"
                                        value={installFormData.version}
                                        onChange={(e) => setInstallFormData({ ...installFormData, version: e.target.value })}
                                        placeholder="ex: ^3.0"
                                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 mt-8 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowInstallModal(false);
                                        setInstallFormData({ package: '', version: '' });
                                    }}
                                    className="flex-1 px-6 py-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isInstalling}
                                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-[#f53003] to-[#d42803] hover:from-[#d42803] hover:to-[#b32002] text-white rounded-2xl transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isInstalling ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Installation...
                                        </span>
                                    ) : (
                                        'Installer'
                                    )}
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
                    setSelectedPackage(null);
                }}
                onConfirm={handleUninstall}
                title="Désinstaller le paquet"
                itemName={selectedPackage?.name}
                confirmButtonText={isUninstalling ? 'Désinstallation...' : 'Désinstaller'}
                disabled={isUninstalling}
            />
        </div>
    );
}
