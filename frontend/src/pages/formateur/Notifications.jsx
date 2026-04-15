import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NavigationFormateur from '../../components/FormateurNav';

export default function FormateurNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, unread, read
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/notifications', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.data || []);
                setUnreadCount(data.data?.filter(n => !n.lu_le).length || 0);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (response.ok) {
                setNotifications(prev =>
                    prev.map(n =>
                        n.id === notificationId ? { ...n, lu_le: new Date().toISOString() } : n
                    )
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
                // Déclencher un événement pour rafraîchir le NotificationBell
                window.dispatchEvent(new CustomEvent('notificationsUpdated'));
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la notification:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (response.ok) {
                setNotifications(prev =>
                    prev.map(n => ({ ...n, lu_le: new Date().toISOString() }))
                );
                setUnreadCount(0);
                // Déclencher un événement pour rafraîchir le NotificationBell
                window.dispatchEvent(new CustomEvent('notificationsUpdated'));
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour des notifications:', error);
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            const response = await fetch(`/api/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (response.ok) {
                setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
                // Update unread count only if the deleted notification was unread
                setUnreadCount(prev => {
                    const deletedNotif = notifications.find(n => n.id === notificationId);
                    return deletedNotif && !deletedNotif.lu_le ? Math.max(0, prev - 1) : prev;
                });
            }
        } catch (error) {
            console.error('Erreur lors de la suppression de la notification:', error);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'application_created':
                return '📝';
            case 'application_accepted':
            case 'application_accepte':
                return '✅';
            case 'application_rejected':
            case 'application_refuse':
                return '❌';
            case 'application_en_attente_validation':
            case 'application_en_attente':
                return '⏳';
            case 'training_created':
                return '🎯';
            case 'training_updated':
                return '📝';
            case 'pedagogical_training_started':
                return '🎓';
            case 'pedagogical_training_completed':
                return '🎉';
            case 'pedagogical_dossier_submitted':
            case 'pedagogical_dossier_resubmitted':
                return '📄';
            case 'pedagogical_dossier_accept':
            case 'pedagogical_dossier_accepte':
                return '✅';
            case 'pedagogical_dossier_reject_resubmit':
            case 'pedagogical_dossier_reject_definitif':
            case 'pedagogical_dossier_refuse':
                return '❌';
            case 'promotion_training_started':
            case 'promotion_training_due':
                return '⭐';
            case 'promotion_dossier_submitted':
            case 'promotion_dossier_resubmitted':
                return '📄';
            case 'promotion_dossier_accept':
            case 'promotion_dossier_accepte':
                return '✅';
            case 'promotion_dossier_reject_resubmit':
            case 'promotion_dossier_reject_definitif':
            case 'promotion_dossier_refuse':
                return '❌';
            case 'diploma_issued':
                return '🎓';
            default:
                return '🔔';
        }
    };

    const getNotificationLink = (notification) => {
        switch (notification.type) {
            // Application notifications
            case 'application_created':
            case 'application_accepte':
            case 'application_accepted':
            case 'application_en_attente_validation':
            case 'application_en_attente':
                return '/formateur/candidatures';
            case 'application_rejected':
            case 'application_refuse':
                return '/formateur/candidatures?status=refuse';
            
            // Training notifications
            case 'training_created':
            case 'training_updated':
                return '/formateur/stages/regulier';
            
            // Pedagogical training notifications
            case 'pedagogical_training_started':
            case 'pedagogical_training_completed':
            case 'pedagogical_dossier_submitted':
            case 'pedagogical_dossier_accept':
            case 'pedagogical_dossier_accepte':
            case 'pedagogical_dossier_reject_resubmit':
            case 'pedagogical_dossier_reject_definitif':
            case 'pedagogical_dossier_refuse':
            case 'pedagogical_dossier_resubmitted':
                return '/formateur/stages/pedagogique';
            
            // Promotion training notifications
            case 'promotion_training_started':
            case 'promotion_training_due':
            case 'promotion_dossier_submitted':
            case 'promotion_dossier_accept':
            case 'promotion_dossier_accepte':
            case 'promotion_dossier_reject_resubmit':
            case 'promotion_dossier_reject_definitif':
            case 'promotion_dossier_refuse':
            case 'promotion_dossier_resubmitted':
                // Try to determine if PSP1 or PSP2 from notification data
                if (notification.message && notification.message.includes('10 ans')) {
                    return '/formateur/stages/psp2';
                }
                return '/formateur/stages/psp1';
            
            // Diploma notifications
            case 'diploma_issued':
                return '/formateur/diplomes';
            
            default:
                return '/formateur/dashboard';
        }
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'À l\'instant';
        if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
        if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)}h`;
        return `Il y a ${Math.floor(diffInMinutes / 1440)}j`;
    };

    const filteredNotifications = notifications.filter(notification => {
        if (filter === 'unread') return !notification.lu_le;
        if (filter === 'read') return notification.lu_le;
        return true;
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#161615]">
            <NavigationFormateur />
            
            <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8">
                <div className="bg-white dark:bg-[#1b1b18] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="px-3 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                    Notifications
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
                                    {unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto sm:justify-end min-w-0">
                                <button
                                    onClick={fetchNotifications}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-2 shrink-0 px-3 py-2 sm:px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors font-medium text-xs sm:text-sm"
                                    title="Actualiser les notifications"
                                >
                                    <svg 
                                        className={`w-4 h-4 shrink-0 ${loading ? 'animate-spin' : ''}`} 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Actualiser
                                </button>
                                <select
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="min-w-0 max-w-full px-2.5 sm:px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                >
                                    <option value="all">Toutes</option>
                                    <option value="unread">Non lues</option>
                                    <option value="read">Lues</option>
                                </select>
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={markAllAsRead}
                                        className="px-3 py-2 sm:px-4 bg-[#2F80ED] hover:bg-[#4C9CFF] text-white rounded-lg transition-colors text-xs sm:text-sm font-medium whitespace-normal text-center max-w-full"
                                        title="Tout marquer comme lu"
                                    >
                                        <span className="sm:hidden">Tout lu</span>
                                        <span className="hidden sm:inline">Tout marquer comme lu</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                Chargement des notifications...
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                {filter === 'unread' ? 'Aucune notification non lue' : 
                                 filter === 'read' ? 'Aucune notification lue' : 
                                 'Aucune notification'}
                            </div>
                        ) : (
                            filteredNotifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                                        !notification.lu_le ? 'bg-[#2F80ED]/10' : ''
                                    }`}
                                >
                                    <div className="flex items-start space-x-4">
                                        <span className="text-3xl flex-shrink-0">
                                            {getNotificationIcon(notification.type)}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white min-w-0 break-words pr-0 sm:pr-2">
                                                    {notification.titre || notification.title}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 shrink-0">
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        {formatTimeAgo(notification.created_at)}
                                                    </span>
                                                    {!notification.lu_le && (
                                                        <button
                                                            onClick={() => markAsRead(notification.id)}
                                                            className="text-sm text-[#2F80ED] hover:text-[#4C9CFF] transition-colors"
                                                        >
                                                            Marquer comme lu
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteNotification(notification.id)}
                                                        className="text-sm text-red-500 hover:text-red-700 transition-colors"
                                                        title="Supprimer"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-300 mt-2">
                                                {notification.message}
                                            </p>
                                            <div className="mt-4">
                                                <Link
                                                    to={getNotificationLink(notification)}
                                                    className="inline-flex items-center text-sm text-[#2F80ED] hover:text-[#4C9CFF] transition-colors"
                                                >
                                                    Voir les détails
                                                    <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
