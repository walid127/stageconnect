import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NavigationAdmin from '../../components/AdminNav';
import TableSquelette from '../../components/SkeletonTable';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import axios from 'axios';

export default function Database() {
    const { user } = useAuth();
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState(null);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [backupToDelete, setBackupToDelete] = useState(null);

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
            fetchBackups();
        }
    }, [user]);

    const fetchBackups = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/database/backups');
            setBackups(response.data.backups || []);
        } catch (err) {
            showMessagePopup('Erreur lors du chargement des sauvegardes', 'error');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleBackup = async () => {
        try {
            setIsBackingUp(true);
            const response = await axios.post('/api/admin/database/backup');
            showMessagePopup('Sauvegarde créée avec succès!', 'success');
            fetchBackups();
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Erreur lors de la sauvegarde';
            showMessagePopup(errorMsg, 'error');
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleRestore = async () => {
        try {
            setIsRestoring(true);
            await axios.post('/api/admin/database/restore', {
                filename: selectedBackup.filename
            });
            showMessagePopup('Base de données restaurée avec succès!', 'success');
            setShowRestoreModal(false);
            setSelectedBackup(null);
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Erreur lors de la restauration';
            showMessagePopup(errorMsg, 'error');
        } finally {
            setIsRestoring(false);
        }
    };

    const handleDownload = async (filename) => {
        try {
            const response = await axios.get(`/api/admin/database/backups/${filename}/download`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            showMessagePopup('Sauvegarde téléchargée avec succès!', 'success');
        } catch (err) {
            showMessagePopup('Erreur lors du téléchargement', 'error');
        }
    };

    const openDeleteConfirm = (filename) => {
        setBackupToDelete(filename);
        setShowDeleteConfirm(true);
    };

    const handleDelete = async () => {
        if (!backupToDelete) return;
        try {
            await axios.delete(`/api/admin/database/backups/${backupToDelete}`);
            showMessagePopup('Sauvegarde supprimée avec succès!', 'success');
            setShowDeleteConfirm(false);
            setBackupToDelete(null);
            fetchBackups();
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Erreur lors de la suppression';
            showMessagePopup(errorMsg, 'error');
            setShowDeleteConfirm(false);
            setBackupToDelete(null);
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
                            Gestion de la Base de Données
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
                        Sauvegardes disponibles
                    </h2>
                    <button
                        onClick={handleBackup}
                        disabled={isBackingUp}
                        className="bg-gradient-to-r from-[#f53003] to-[#d42803] text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-red-500/20 transition-all duration-300 font-semibold transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isBackingUp ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Sauvegarde en cours...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <span>💾</span>
                                Créer une sauvegarde
                            </span>
                        )}
                    </button>
                </div>

                {loading ? (
                    <TableSquelette />
                ) : (
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                        {backups.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <span className="text-4xl">💾</span>
                                    <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Aucune sauvegarde disponible</p>
                                    <p className="text-sm text-gray-400 dark:text-gray-500">Créez votre première sauvegarde en cliquant sur le bouton ci-dessus</p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                            <table className="w-full min-w-[980px]">
                                <thead>
                                    <tr className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] text-white">
                                        <th className="px-6 py-4 text-center font-semibold">Nom du fichier</th>
                                        <th className="px-6 py-4 text-center font-semibold">Taille</th>
                                        <th className="px-6 py-4 text-center font-semibold">Date de création</th>
                                        <th className="px-6 py-4 text-center font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {backups.map((backup, index) => (
                                        <tr key={index} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 text-center font-medium text-gray-900 dark:text-white">{backup.filename}</td>
                                            <td className="px-6 py-4 text-center text-gray-700 dark:text-gray-300">{formatFileSize(backup.size)}</td>
                                            <td className="px-6 py-4 text-center text-gray-700 dark:text-gray-300">{backup.created_at}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleDownload(backup.filename)}
                                                        className="btn btn-secondary"
                                                        style={{padding: '0.25rem 0.75rem', fontSize: '0.75rem'}}
                                                    >
                                                        Télécharger
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedBackup(backup);
                                                            setShowRestoreModal(true);
                                                        }}
                                                        className="btn btn-success"
                                                        style={{padding: '0.25rem 0.75rem', fontSize: '0.75rem'}}
                                                    >
                                                        Restaurer
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteConfirm(backup.filename)}
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
                        )}
                    </div>
                )}
            </div>

            {/* Restore Modal */}
            {showRestoreModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 w-full max-w-md overflow-hidden transform animate-scale-in">
                        <div className="relative bg-gradient-to-r from-red-600 to-red-700 p-8">
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '30px 30px'}}></div>
                            </div>
                            <div className="relative flex justify-between items-start">
                                <div>
                                    <h2 className="text-3xl font-extrabold text-white mb-2">Restaurer la base de données</h2>
                                    <p className="text-white/70 text-sm">Cette action est irréversible</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowRestoreModal(false);
                                        setSelectedBackup(null);
                                    }}
                                    className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl flex items-center justify-center transition-all duration-300 hover:rotate-90 text-white text-xl"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-6 mb-6">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">⚠️</span>
                                    <div>
                                        <p className="font-bold text-red-900 dark:text-red-300 mb-1">Attention!</p>
                                        <p className="text-sm text-red-700 dark:text-red-400">
                                            Cette action va remplacer toutes les données actuelles par celles de la sauvegarde <span className="font-bold">"{selectedBackup?.filename}"</span>.
                                            Cette action est irréversible!
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        setShowRestoreModal(false);
                                        setSelectedBackup(null);
                                    }}
                                    className="flex-1 px-6 py-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleRestore}
                                    disabled={isRestoring}
                                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-2xl transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isRestoring ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Restauration...
                                        </span>
                                    ) : (
                                        'Confirmer la restauration'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setBackupToDelete(null);
                }}
                onConfirm={handleDelete}
                title="Supprimer la sauvegarde"
                message="Êtes-vous sûr de vouloir supprimer cette sauvegarde ?"
                itemName={backupToDelete || ''}
                warningMessage="Cette action est irréversible. La sauvegarde sera définitivement supprimée."
                confirmButtonText="Supprimer"
                itemIcon="💾"
            />
        </div>
    );
}
