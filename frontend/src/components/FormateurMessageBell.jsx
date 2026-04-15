import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function ClocheMessageFormateur({ showDropdown, onToggle }) {
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [buttonRef, setButtonRef] = useState(null);
    const { user } = useAuth();

    const fetchMessages = useCallback(async (showLoading = false) => {
        if (!user) return;
        
        if (showLoading) {
            setLoading(true);
        }
        try {
            const response = await axios.get('/api/messages');
            
            if (response.data) {
                // Afficher uniquement les messages où l'utilisateur actuel est le DESTINATAIRE
                const receivedMessages = response.data.data?.filter(m => m.destinataire_id === user.id) || [];
                setMessages(receivedMessages);
                setUnreadCount(receivedMessages.filter(m => !m.lu_le).length);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des messages:', error);
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchMessages(true); // Chargement initial avec spinner
            // Rafraîchir les messages toutes les 30 secondes
            const interval = setInterval(() => {
                fetchMessages(false); // Rafraîchissement silencieux
            }, 30000);
            
            // Écouter les événements de mise à jour des messages
            const handleMessagesUpdated = () => {
                fetchMessages(false);
            };
            window.addEventListener('messagesUpdated', handleMessagesUpdated);
            
            return () => {
                clearInterval(interval);
                window.removeEventListener('messagesUpdated', handleMessagesUpdated);
            };
        }
    }, [user, fetchMessages]);

    const markAsRead = async (messageId) => {
        try {
            const response = await axios.put(`/api/messages/${messageId}/read`);
            
            if (response.data) {
                setMessages(prev => 
                    prev.map(msg => 
                        msg.id === messageId ? { ...msg, lu_le: new Date().toISOString() } : msg
                    )
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
                // Rafraîchir les messages pour s'assurer que le compteur est à jour
                fetchMessages(false);
            }
        } catch (error) {
            console.error('Erreur lors du marquage du message comme lu:', error);
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'À l\'instant';
        if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`;
        if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)}h`;
        return date.toLocaleDateString('fr-FR');
    };

    return (
        <div className="relative">
            <button
                ref={setButtonRef}
                onClick={onToggle}
                className="relative p-2 text-white/80 hover:text-white transition-colors"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#d4af37] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {showDropdown && buttonRef && createPortal(
                <div 
                    data-dropdown="message"
                    className="fixed flex max-h-[min(24rem,calc(100dvh-5rem))] w-[min(20rem,calc(100vw-1rem))] flex-col bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 z-[99999] overflow-hidden"
                    style={{
                        top: buttonRef.getBoundingClientRect().bottom + 8,
                        right: window.innerWidth - buttonRef.getBoundingClientRect().right
                    }}
                >
                    {/* En-tête Moderne */}
                    <div className="shrink-0 bg-gradient-to-r from-[#1a365d] to-[#2d3748] p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">
                                        Messages
                                    </h3>
                                    {unreadCount > 0 && (
                                        <p className="text-[10px] text-white/80">
                                            {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-6 text-center">
                                <div className="inline-flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Chargement...</span>
                                </div>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-900/20 dark:to-teal-900/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-gray-900 dark:text-white font-semibold mb-1">Aucun message</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Votre boîte est vide 📭</p>
                            </div>
                        ) : (
                            <div className="p-1.5">
                                {messages.slice(0, 5).map((message) => (
                                    <Link
                                        key={message.id}
                                        to={`/formateur/messages?user=${message.expediteur_id}`}
                                        className={`group relative mb-1.5 rounded-xl transition-all duration-300 block ${
                                            !message.lu_le 
                                                ? 'bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-200/50 dark:border-green-800/50' 
                                                : 'bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
                                        }`}
                                        onClick={() => {
                                            if (!message.lu_le) {
                                                markAsRead(message.id);
                                            }
                                            onToggle();
                                        }}
                                    >
                                        <div className="p-2.5">
                                            <div className="flex items-start gap-2">
                                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center text-lg shadow-md">
                                                    💬
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-1 mb-0.5">
                                                        <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight truncate">
                                                            {message.expediteur?.nom || 'Utilisateur'}
                                                        </p>
                                                        {!message.lu_le && (
                                                            <span className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full animate-pulse mt-0.5"></span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug mb-1 truncate">
                                                        {message.corps}
                                                    </p>
                                                    <div className="flex items-center gap-1">
                                                        <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                        </svg>
                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                                            {formatTime(message.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {messages.length > 0 && (
                        <div className="shrink-0 p-2.5 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700">
                            <Link
                                to="/formateur/messages"
                                className="group flex items-center justify-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                                onClick={() => onToggle()}
                            >
                                <span>Voir tous</span>
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
