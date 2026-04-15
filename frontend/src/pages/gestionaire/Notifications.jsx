import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NavigationGestionaire from '../../components/GestionaireNav';
import axios from 'axios';

export default function GestionaireNotifications() {
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
            const response = await axios.get('/api/notifications');
            const data = response.data;
            setNotifications(data.data || []);
            setUnreadCount(data.data?.filter(n => !n.lu_le).length || 0);
        } catch (error) {
            console.error('Erreur lors du chargement des notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await axios.put(`/api/notifications/${notificationId}/read`);
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId ? { ...n, lu_le: new Date().toISOString() } : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            // Déclencher un événement pour rafraîchir le NotificationBell
            window.dispatchEvent(new CustomEvent('notificationsUpdated'));
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la notification:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await axios.put('/api/notifications/mark-all-read');
            setNotifications(prev =>
                prev.map(n => ({ ...n, lu_le: new Date().toISOString() }))
            );
            setUnreadCount(0);
            // Déclencher un événement pour rafraîchir le NotificationBell
            window.dispatchEvent(new CustomEvent('notificationsUpdated'));
        } catch (error) {
            console.error('Erreur lors de la mise à jour des notifications:', error);
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            await axios.delete(`/api/notifications/${notificationId}`);
            setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Erreur lors de la suppression de la notification:', error);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'application_created':
                return '📝';
            case 'application_accepted':
                return '✅';
            case 'application_rejected':
                return '❌';
            case 'training_created':
                return '🎯';
            case 'training_updated':
                return '📝';
            default:
                return '🔔';
        }
    };

    const getNotificationLink = (notification) => {
        switch (notification.type) {
            case 'application_created':
            case 'application_accepted':
            case 'application_rejected':
                return '/gestionaire/candidatures';
            case 'training_created':
            case 'training_updated':
                return '/gestionaire/stages';
            default:
                return '/gestionaire/dashboard';
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
            <NavigationGestionaire />
            
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
                <div className="bg-white dark:bg-[#1b1b18] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Notifications
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                    {unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={fetchNotifications}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors font-medium text-sm"
                                    title="Actualiser les notifications"
                                >
                                    <svg 
                                        className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
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
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="all">Toutes</option>
                                    <option value="unread">Non lues</option>
                                    <option value="read">Lues</option>
                                </select>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="px-4 py-2 bg-[#2F80ED] hover:bg-[#4C9CFF] text-white rounded-lg transition-colors"
                                    >
                                        Tout marquer comme lu
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
                                        !notification.read_at ? 'bg-[#2F80ED]/10' : ''
                                    }`}
                                >
                                    <div className="flex items-start space-x-4">
                                        <span className="text-3xl flex-shrink-0">
                                            {getNotificationIcon(notification.type)}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {notification.titre}
                                                </h3>
                                                <div className="flex items-center space-x-2">
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
