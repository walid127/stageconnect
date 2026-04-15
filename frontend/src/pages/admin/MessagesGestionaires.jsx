import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import NavigationAdmin from '../../components/AdminNav';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import axios from 'axios';
import { useSearchParams, Link } from 'react-router-dom';

export default function AdminMessagesGestionaires() {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [messages, setMessages] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState(null);
    const [showConversationDeleteConfirm, setShowConversationDeleteConfirm] = useState(false);
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    useEffect(() => {
        fetchMessages();
        fetchUsers();
    }, []);

    // Handle URL parameter to auto-select user
    useEffect(() => {
        const userId = searchParams.get('user');
        if (userId && users.length > 0) {
            const userToSelect = users.find(u => u.id == userId);
            if (userToSelect) {
                setSelectedUser(userToSelect);
            }
        }
    }, [searchParams, users]);

    const fetchMessages = async (skipCache = false, silent = false) => {
        try {
            const response = await axios.get('/api/admin/messages-gestionaires');
            setMessages(response.data.data || []);
        } catch (error) {
            console.error('Erreur lors du chargement des messages:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await axios.get('/api/admin/messages-gestionaires/users');
            setUsers(response.data.data || []);
        } catch (error) {
            console.error('Erreur lors du chargement des gestionaires:', error);
        }
    };


    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;

        try {
            setSending(true);
            await axios.post('/api/messages', {
                destinataire_id: selectedUser.id,
                corps: newMessage.trim()
            });
            
            setNewMessage('');
            fetchMessages();
        } catch (error) {
            console.error('Erreur lors de l\'envoi du message:', error);
            setMessage('❌ Erreur lors de l\'envoi du message');
            setMessageType('error');
            setShowMessage(true);
            setTimeout(() => setShowMessage(false), 3000);
        } finally {
            setSending(false);
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'À l\'instant';
        if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
        if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)}h`;
        return date.toLocaleDateString();
    };

    const getConversationWithUser = (userId) => {
        return messages.filter(msg => 
            (msg.expediteur_id === user.id && msg.destinataire_id === userId) ||
            (msg.expediteur_id === userId && msg.destinataire_id === user.id)
        ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    };

    const getLastMessageWithUser = (userId) => {
        const conversation = getConversationWithUser(userId);
        return conversation[conversation.length - 1];
    };

    const getUnreadCount = (userId) => {
        return messages.filter(msg => 
            msg.expediteur_id === userId && 
            msg.destinataire_id === user.id && 
            !msg.lu_le
        ).length;
    };

    const handleUserSelect = (userItem) => {
        setSelectedUser(userItem);
        // Mark messages as read when conversation is opened
        markMessagesAsRead(userItem.id);
    };

    const markMessagesAsRead = async (userId) => {
        try {
            // Get conversation to mark messages as read
            await axios.get(`/api/messages/conversation/${userId}`);
            // Refresh messages
            fetchMessages();
            // Déclencher un événement pour rafraîchir le MessageBell
            window.dispatchEvent(new CustomEvent('messagesUpdated'));
        } catch (error) {
            console.error('Erreur lors du marquage des messages comme lus:', error);
        }
    };

    const showMessagePopup = (message, type) => {
        setMessage(message);
        setMessageType(type);
        setShowMessage(true);
        setTimeout(() => setShowMessage(false), 4000);
    };

    const handleDeleteMessage = (message) => {
        setMessageToDelete(message);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteMessage = async () => {
        if (!messageToDelete) return;

        try {
            // Mettre à jour immédiatement l'état local AVANT l'appel API
            setMessages(prev => prev.filter(msg => msg.id !== messageToDelete.id));
            
            // Ensuite, faire l'appel API
            await axios.delete(`/api/messages/${messageToDelete.id}`);
            
            showMessagePopup('Message supprimé avec succès', 'success');
            
            // Rafraîchir silencieusement en arrière-plan
            setTimeout(() => {
                fetchMessages(true, true);
            }, 500);
        } catch (error) {
            // En cas d'erreur, restaurer l'état précédent
            fetchMessages(true, true);
            console.error('Erreur lors de la suppression du message:', error);
            showMessagePopup('Erreur lors de la suppression du message', 'error');
        } finally {
            setShowDeleteConfirm(false);
            setMessageToDelete(null);
        }
    };

    const cancelDeleteMessage = () => {
        setShowDeleteConfirm(false);
        setMessageToDelete(null);
    };

    const handleDeleteConversation = () => {
        setShowConversationDeleteConfirm(true);
    };

    const confirmDeleteConversation = async () => {
        if (!selectedUser) return;

        try {
            // Mettre à jour immédiatement l'état local AVANT l'appel API
            setMessages(prev => prev.filter(msg => 
                !((msg.expediteur_id === user.id && msg.destinataire_id === selectedUser.id) ||
                  (msg.expediteur_id === selectedUser.id && msg.destinataire_id === user.id))
            ));
            
            // Ensuite, faire l'appel API
            await axios.delete(`/api/messages/conversation/${selectedUser.id}`);
            
            showMessagePopup('Conversation supprimée avec succès', 'success');
            setSelectedUser(null);
            
            // Rafraîchir silencieusement en arrière-plan
            setTimeout(() => {
                fetchMessages(true, true);
            }, 500);
        } catch (error) {
            // En cas d'erreur, restaurer l'état précédent
            fetchMessages(true, true);
            console.error('Erreur lors de la suppression de la conversation:', error);
            showMessagePopup('Erreur lors de la suppression de la conversation', 'error');
        } finally {
            setShowConversationDeleteConfirm(false);
        }
    };

    const cancelDeleteConversation = () => {
        setShowConversationDeleteConfirm(false);
    };

    return (
        <div className="app-container">
            <NavigationAdmin />
            
            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    <div className="text-center">
                        <h1 className="hero-title">
                            Messages des Gestionaires
                        </h1>
                        <Link 
                            to="/admin/dashboard" 
                            className="btn btn-primary"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Retour au Dashboard
                        </Link>
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
                <div className="bg-white/80 dark:bg-[#161615]/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-[#3E3E3A]/50 overflow-hidden">

                    <div className="flex min-h-0 h-[min(600px,calc(100dvh-12rem))] md:h-[600px]">
                        {/* Users List */}
                        <div className="w-1/3 min-w-0 border-r border-gray-200 dark:border-gray-700 bg-gradient-to-b from-gray-50/80 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-900/80 flex flex-col min-h-0">
                            <div className="px-3 py-2.5 sm:px-4 sm:py-3 md:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-[#1a365d] to-[#2d3748]">
                                <h3 className="font-bold text-white text-sm sm:text-base md:text-lg leading-tight">Conversations</h3>
                                <p className="text-white/80 text-[11px] sm:text-xs md:text-sm mt-0.5 sm:mt-1 leading-snug">Sélectionnez un gestionaire</p>
                            </div>
                            
                            {/* Search Bar */}
                            <div className="p-2.5 sm:p-3 md:p-4 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Rechercher par nom ou gestionaire..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full px-3 py-1.5 sm:py-2 pl-9 sm:pl-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-[#1a365d] focus:border-[#1a365d] transition-all"
                                    />
                                    <svg className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex-1 min-h-0 overflow-y-auto">
                                {users.filter(u => {
                                    // Filter out current user
                                    if (u.id === user.id) return false;
                                    
                                    // Filter by search query
                                    if (searchQuery.trim()) {
                                        const query = searchQuery.toLowerCase().trim();
                                        const userName = (u.nom || '').toLowerCase();
                                        const userRole = (u.role || '').toLowerCase();
                                        
                                        // Search by name or role (gestionaire)
                                        return userName.includes(query) || 
                                               userRole.includes(query) ||
                                               (query === 'gestionaire' && userRole === 'gestionaire');
                                    }
                                    
                                    return true;
                                }).map((userItem) => {
                                    const lastMessage = getLastMessageWithUser(userItem.id);
                                    const unreadCount = getUnreadCount(userItem.id);
                                    
                                    return (
                                        <div
                                            key={userItem.id}
                                            onClick={() => handleUserSelect(userItem)}
                                            className={`min-w-0 p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-200 ${
                                                selectedUser?.id === userItem.id ? 'bg-gradient-to-r from-[#1a365d]/10 to-[#2d3748]/10 border-l-4 border-l-[#1a365d] shadow-lg' : ''
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2 min-w-0">
                                                <div className="flex min-w-0 flex-1 items-center space-x-3">
                                                    <div className="min-w-0">
                                                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                                            {userItem.nom}
                                                        </h4>
                                                    </div>
                                                </div>
                                                {unreadCount > 0 && (
                                                    <span className="bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-white text-xs rounded-full px-3 py-1 font-semibold shadow-lg">
                                                        {unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                            {lastMessage && (
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 min-w-0 break-words [overflow-wrap:anywhere] line-clamp-2">
                                                    {lastMessage.corps}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 flex flex-col min-h-0 min-w-0">
                            {selectedUser ? (
                                <>
                                    {/* Chat Header */}
                                    <div className="px-3 py-2.5 sm:px-4 sm:py-3 md:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-[#1a365d] to-[#2d3748]">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-white text-sm sm:text-base md:text-lg truncate">
                                                        {selectedUser.nom}
                                                    </h3>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleDeleteConversation}
                                                className="shrink-0 px-2.5 py-1 sm:px-3 bg-red-600 hover:bg-red-700 text-white rounded-md transition-all duration-200 font-medium text-[11px] sm:text-xs shadow-sm"
                                            >
                                                Supprimer
                                            </button>
                                        </div>
                                    </div>

                                    {/* Messages */}
                                    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                                        {getConversationWithUser(selectedUser.id).map((message) => (
                                            <div
                                                key={message.id}
                                                className={`flex min-w-0 w-full ${message.expediteur_id === user.id ? 'justify-end' : 'justify-start'} group`}
                                            >
                                                <div className="flex min-w-0 max-w-full items-end gap-2">
                                                    <div
                                                        className={`min-w-0 max-w-[min(20rem,calc(100vw-5rem))] sm:max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-lg ${
                                                        message.expediteur_id === user.id
                                                            ? 'bg-gradient-to-r from-[#1a365d] to-[#2d3748] text-white'
                                                            : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                                                        }`}
                                                    >
                                                        <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]">{message.corps}</p>
                                                        <p className={`text-xs mt-1 ${
                                                            message.expediteur_id === user.id
                                                                ? 'text-white/70'
                                                                : 'text-gray-500 dark:text-gray-400'
                                                        }`}>
                                                            {formatTime(message.created_at)}
                                                        </p>
                                                    </div>
                                                    {message.expediteur_id === user.id && (
                                                        <button
                                                            onClick={() => handleDeleteMessage(message)}
                                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[#EB5757] transition-all"
                                                            title="Supprimer votre message"
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Message Input */}
                                    <form onSubmit={sendMessage} className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-900/80">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3">
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                placeholder="Tapez votre message..."
                                                className="min-w-0 flex-1 px-4 py-3 sm:px-6 border border-white/20 dark:border-[#3E3E3A]/50 rounded-xl bg-white/50 dark:bg-[#161615]/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#1a365d] focus:border-[#1a365d] transition-all shadow-lg"
                                                disabled={sending}
                                            />
                                            <button
                                                type="submit"
                                                disabled={!newMessage.trim() || sending}
                                                className="shrink-0 w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-[#1a365d] to-[#2d3748] text-white rounded-xl hover:from-[#2d3748] hover:to-[#1a365d] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl font-semibold flex items-center justify-center gap-2"
                                            >
                                                {sending ? (
                                                    <>
                                                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                        <span>Envoi...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                        </svg>
                                                        <span>Envoyer</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50">
                                    <div className="text-center">
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                            Sélectionnez une conversation
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400 text-lg">
                                            Choisissez un gestionaire pour commencer à discuter
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Message Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={showDeleteConfirm}
                onClose={cancelDeleteMessage}
                onConfirm={confirmDeleteMessage}
                message="Vous ne pouvez supprimer que vos propres messages"
                itemName="ce message"
                itemDetails={
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-[#78786c] dark:text-[#9D9D99] mb-2">Message à supprimer :</p>
                        <p className="text-[#1b1b18] dark:text-[#EDEDEC] font-medium">
                            {messageToDelete?.corps}
                        </p>
                    </div>
                }
            />

            {/* Delete Conversation Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={showConversationDeleteConfirm}
                onClose={cancelDeleteConversation}
                onConfirm={confirmDeleteConversation}
                itemName={selectedUser?.nom || 'N/A'}
                itemDetails={
                    <p className="text-sm text-[#78786c] dark:text-[#9D9D99] mt-1">
                        Tous les messages seront supprimés
                    </p>
                }
                confirmButtonText="Supprimer tout"
                itemIcon={
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                        <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                    </svg>
                }
            />

            {/* Message Popup */}
            {showMessage && (
                <div className="fixed top-4 right-4 z-50 animate-slide-in">
                    <div className={`px-6 py-3 rounded-xl shadow-lg ${
                        messageType === 'success' 
                            ? 'bg-[#6FCF97] text-white' 
                            : 'bg-[#EB5757] text-white'
                    }`}>
                        <div className="flex items-center space-x-2">
                            <span className="text-lg">
                                {messageType === 'success' ? '✅' : '❌'}
                            </span>
                            <span className="font-medium">{message}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

