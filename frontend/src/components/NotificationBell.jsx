import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function ClocheNotification({ showDropdown, onToggle }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [buttonRef, setButtonRef] = useState(null);
    const { user, isAdmin, isGestionaire } = useAuth();
    
    // Determine the notifications route based on user role
    const getNotificationsRoute = () => {
        if (isAdmin) {
            return '/admin/dashboard';
        } else if (isGestionaire) {
            return '/gestionaire/notifications';
        } else {
            return '/formateur/notifications';
        }
    };
    
    // Determine the dashboard route based on user role
    const getDashboardRoute = () => {
        if (isAdmin) {
            return '/admin/dashboard';
        } else if (isGestionaire) {
            return '/gestionaire/dashboard';
        } else {
            return '/formateur/dashboard';
        }
    };

    const fetchNotifications = useCallback(async (showLoading = false) => {
        if (!user) return;
        
        if (showLoading) {
            setLoading(true);
        }
        try {
            const response = await axios.get('/api/notifications');
            const data = response.data;
            setNotifications(data.data || []);
            setUnreadCount(data.data?.filter(n => !n.lu_le).length || 0);
        } catch (error) {
            console.error('Erreur lors du chargement des notifications:', error);
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchNotifications(true); // Chargement initial avec spinner
            // Rafraîchir les notifications toutes les 30 secondes
            const interval = setInterval(() => {
                fetchNotifications(false); // Rafraîchissement silencieux
            }, 30000);
            
            // Écouter les événements de mise à jour des notifications
            const handleNotificationsUpdated = () => {
                fetchNotifications(false);
            };
            window.addEventListener('notificationsUpdated', handleNotificationsUpdated);
            
            return () => {
                clearInterval(interval);
                window.removeEventListener('notificationsUpdated', handleNotificationsUpdated);
            };
        }
    }, [user, fetchNotifications]);

    const markAsRead = async (notificationId) => {
        try {
            await axios.put(`/api/notifications/${notificationId}/read`);
            // Mettre à jour l'état local
            setNotifications(prev => 
                prev.map(n => 
                    n.id === notificationId ? { ...n, lu_le: new Date().toISOString() } : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            // Rafraîchir les notifications pour s'assurer que le compteur est à jour
            fetchNotifications(false);
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
            // Rafraîchir les notifications pour s'assurer que le compteur est à jour
            fetchNotifications(false);
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
            case 'application_accepte':
            case 'application_accepted':
                return '📝';
            case 'application_rejected':
            case 'application_refuse':
                return '❌';
            case 'application_en_attente_validation':
            case 'application_en_attente':
                return '⏳';
            case 'dossier_accepte':
            case 'dossier_resubmitted':
            case 'dossier_resubmit_requested':
                return '📄';
            case 'training_created':
                return '🎯';
            case 'training_updated':
                return '📝';
            case 'pedagogical_training_started':
            case 'pedagogical_training_cancelled':
                return '🎓';
            case 'pedagogical_training_completed':
                return '🎉';
            case 'pedagogical_dossier_submitted':
            case 'pedagogical_dossier_resubmitted':
                return '📄';
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
            case 'promotion_dossier_accepte':
                return '✅';
            case 'promotion_dossier_refuse':
                return '❌';
            case 'diploma_issued':
                return '🎓';
            default:
                return '🔔';
        }
    };

    const getNotificationLink = (notification) => {
        // Base routes based on user role
        const baseRoute = isAdmin ? '/admin' : isGestionaire ? '/gestionaire' : '/formateur';
        
        switch (notification.type) {
            // Application notifications
            case 'application_created':
            case 'application_accepte':
            case 'application_accepted':
            case 'application_rejected':
            case 'application_refuse':
            case 'application_en_attente_validation':
            case 'application_en_attente':
            case 'dossier_accepte':
            case 'dossier_resubmitted':
            case 'dossier_resubmit_requested':
                return `${baseRoute}/candidatures`;
            
            // Training notifications
            case 'training_created':
            case 'training_updated':
                return `${baseRoute}/stages/regulier`;
            
            // Pedagogical training notifications
            case 'pedagogical_training_started':
            case 'pedagogical_training_completed':
            case 'pedagogical_training_cancelled':
            case 'pedagogical_dossier_submitted':
            case 'pedagogical_dossier_accepte':
            case 'pedagogical_dossier_reject_resubmit':
            case 'pedagogical_dossier_reject_definitif':
            case 'pedagogical_dossier_refuse':
            case 'pedagogical_dossier_resubmitted':
                return `${baseRoute}/stages/pedagogique`;
            
            // Promotion training notifications
            case 'promotion_training_started':
            case 'promotion_training_due':
            case 'promotion_dossier_submitted':
            case 'promotion_dossier_accepte':
            case 'promotion_dossier_refuse':
            case 'promotion_dossier_resubmitted':
                // Try to determine if PSP1 or PSP2 from notification message
                if (notification.message && (notification.message.includes('10 ans') || notification.message.includes('10_ans'))) {
                    return `${baseRoute}/stages/psp2`;
                }
                return `${baseRoute}/stages/psp1`;
            
            // Diploma notifications
            case 'diploma_issued':
                return `${baseRoute}/diplomes`;
            
            default:
                return getDashboardRoute();
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

    return (
        <div className="relative">
            <button
                ref={setButtonRef}
                onClick={onToggle}
                className="relative p-2 text-white/80 hover:text-white transition-colors"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#d4af37] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {showDropdown && buttonRef && createPortal(
                <div 
                    data-dropdown="notification"
                    className="fixed w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 z-[99999] overflow-hidden"
                    style={{
                        top: buttonRef.getBoundingClientRect().bottom + 8,
                        right: window.innerWidth - buttonRef.getBoundingClientRect().right
                    }}
                >
                    {/* En-tête Moderne */}
                    <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">
                                        Notifications
                                    </h3>
                                    {unreadCount > 0 && (
                                        <p className="text-[10px] text-white/80">
                                            {unreadCount} non {unreadCount > 1 ? 'lues' : 'lue'}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="px-2 py-1 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-lg text-[10px] font-semibold transition-all duration-300 border border-white/30"
                                >
                                    Tout lire
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-6 text-center">
                                <div className="inline-flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Chargement...</span>
                                </div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                </div>
                                <p className="text-sm text-gray-900 dark:text-white font-semibold mb-1">Aucune notification</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Vous êtes à jour ! 🎉</p>
                            </div>
                        ) : (
                            <div className="p-1.5">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`group relative mb-1.5 rounded-xl transition-all duration-300 ${
                                            !notification.lu_le 
                                                ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200/50 dark:border-blue-800/50' 
                                                : 'bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
                                        }`}
                                    >
                                        <Link
                                            to={getNotificationLink(notification)}
                                            onClick={() => {
                                                if (!notification.lu_le) {
                                                    markAsRead(notification.id);
                                                }
                                                onToggle();
                                            }}
                                            className="block p-2.5"
                                        >
                                            <div className="flex items-start gap-2">
                                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-lg shadow-md">
                                                    {getNotificationIcon(notification.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-1 mb-0.5">
                                                        <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                                                            {notification.titre}
                                                        </p>
                                                        {!notification.lu_le && (
                                                            <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full animate-pulse mt-0.5"></span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug mb-1">
                                                        {notification.message}
                                                    </p>
                                                    <div className="flex items-center gap-1">
                                                        <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                        </svg>
                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                                            {formatTimeAgo(notification.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                deleteNotification(notification.id);
                                            }}
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-all duration-300 shadow-md"
                                            title="Supprimer"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="p-2.5 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700">
                            <Link
                                to={getNotificationsRoute()}
                                className="group flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                onClick={() => onToggle()}
                            >
                                <span>Voir toutes</span>
                                <svg className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Link>
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}
