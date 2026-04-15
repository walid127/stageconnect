import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import ClocheNotificationFormateur from './FormateurNotificationBell';
import ClocheMessageFormateur from './FormateurMessageBell';

export default function NavigationFormateur() {
    const { user, logout } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
    const [showMessageDropdown, setShowMessageDropdown] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const dropdownRef = useRef(null);

    const handleLogout = async () => {
        await logout();
        window.location.href = '/login';
    };

    const handleNotificationToggle = () => {
        setShowNotificationDropdown(!showNotificationDropdown);
        setShowMessageDropdown(false); // Close message dropdown
        setShowDropdown(false); // Close user dropdown
    };

    const handleMessageToggle = () => {
        setShowMessageDropdown(!showMessageDropdown);
        setShowNotificationDropdown(false); // Close notification dropdown
        setShowDropdown(false); // Close user dropdown
    };

    const handleUserToggle = () => {
        setShowDropdown(!showDropdown);
        setShowNotificationDropdown(false); // Close notification dropdown
        setShowMessageDropdown(false); // Close message dropdown
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (event.target.closest('[data-bell-toggle]')) {
                return;
            }
            // Check if click is outside the navigation area and not in any dropdown
            const isClickInNav = dropdownRef.current && dropdownRef.current.contains(event.target);
            const isClickInDropdown = event.target.closest('[data-dropdown="notification"]') || 
                                    event.target.closest('[data-dropdown="message"]');
            
            if (!isClickInNav && !isClickInDropdown) {
                setShowDropdown(false);
                setShowNotificationDropdown(false);
                setShowMessageDropdown(false);
            }
        };

        if (showDropdown || showNotificationDropdown || showMessageDropdown) {
            // Add a small delay to prevent immediate closing
            const timeoutId = setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 100);
            
            return () => {
                clearTimeout(timeoutId);
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [showDropdown, showNotificationDropdown, showMessageDropdown]);

    return (
        <nav className="sticky top-0 z-50 bg-gradient-to-r from-[#1a365d] to-[#2d3748] shadow-lg sm:shadow-xl border-b border-[#4a5568] backdrop-blur-sm">
            <div className="w-full px-3 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-14 sm:h-16 lg:h-20 w-full">
                    {/* Left side - Logo */}
                    <Link to="/formateur/dashboard" className="flex items-center group shrink-0">
                        <div className="bg-[#d4af37] px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-lg shadow-md sm:shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                            <img src="/StageConnect-logo.png" alt="StageConnect" className="h-7 w-auto max-h-8 sm:h-10 md:h-12 object-contain" />
                        </div>
                    </Link>

                    {/* Hamburger - visible on small screens */}
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="lg:hidden flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl text-white hover:bg-white/10 transition-colors"
                        aria-label="Menu"
                    >
                        {mobileMenuOpen ? (
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        ) : (
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        )}
                    </button>
                    
                    {/* Center - Navigation Links (desktop) */}
                    <div className="hidden lg:flex items-center space-x-1 bg-[#4a5568]/30 rounded-2xl p-1 backdrop-blur-sm">
                        <Link to="/formateur/dashboard" className="px-4 py-2 text-sm font-medium text-white/90 hover:text-white hover:bg-[#d4af37]/20 rounded-xl transition-all duration-200 whitespace-nowrap">
                            Accueil
                        </Link>
                        <Link to="/formateur/stages" className="px-4 py-2 text-sm font-medium text-white/90 hover:text-white hover:bg-[#d4af37]/20 rounded-xl transition-all duration-200 whitespace-nowrap">
                            Formations
                        </Link>
                        <Link to="/formateur/history" className="px-4 py-2 text-sm font-medium text-white/90 hover:text-white hover:bg-[#d4af37]/20 rounded-xl transition-all duration-200 whitespace-nowrap">
                            Historique
                        </Link>
                        <Link to="/formateur/diplomes" className="px-4 py-2 text-sm font-medium text-white/90 hover:text-white hover:bg-[#d4af37]/20 rounded-xl transition-all duration-200 whitespace-nowrap">
                            🎓 Mes Diplômes
                        </Link>
                    </div>
                    
                    {/* Right side - Notifications, User */}
                    <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                        {/* Notification and Message Bells */}
                        <div className="flex items-center gap-1 sm:gap-2 bg-[#4a5568]/30 rounded-xl sm:rounded-2xl p-0.5 sm:p-1 backdrop-blur-sm">
                            <ClocheNotificationFormateur 
                                showDropdown={showNotificationDropdown}
                                onToggle={handleNotificationToggle}
                            />
                            <ClocheMessageFormateur 
                                showDropdown={showMessageDropdown}
                                onToggle={handleMessageToggle}
                            />
                        </div>
                        
                        {/* User Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={handleUserToggle}
                                className="flex items-center space-x-2 sm:space-x-3 bg-[#4a5568]/30 hover:bg-[#4a5568]/50 rounded-xl sm:rounded-2xl px-2 py-1.5 sm:px-4 sm:py-2 transition-all duration-200 backdrop-blur-sm"
                            >
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#d4af37] to-[#b8860b] rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-sm sm:text-lg shadow-md sm:shadow-lg">
                                    {user?.nom?.charAt(0)?.toUpperCase() || 'F'}
                                </div>
                                <div className="text-left hidden sm:block">
                                    <div className="text-white font-semibold text-sm">{user?.nom || 'Formateur'}</div>
                                </div>
                                <svg className="w-5 h-5 text-white/70 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {showDropdown && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[9999] overflow-hidden">
                                    <div className="py-2">
                                        <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">{user?.nom || 'Formateur'}</div>
                                        </div>
                                        <Link
                                            to="/formateur/profile"
                                            className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                                            onClick={() => setShowDropdown(false)}
                                        >
                                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            Mon Profil
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                                        >
                                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                            </svg>
                                            Déconnexion
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile menu panel */}
            {mobileMenuOpen && (
                <>
                    <div className="lg:hidden fixed inset-0 bg-black/50 z-40 top-14 sm:top-16" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
                    <div className="lg:hidden fixed top-14 sm:top-16 left-0 right-0 z-50 max-h-[calc(100vh-3.5rem)] sm:max-h-[calc(100vh-4rem)] overflow-y-auto bg-gradient-to-b from-[#1a365d] to-[#2d3748] border-b border-[#4a5568] shadow-2xl">
                        <div className="px-3 py-3 sm:px-4 sm:py-4 space-y-0.5 sm:space-y-1">
                            <Link to="/formateur/dashboard" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-white/90 hover:text-white hover:bg-white/10 font-medium text-sm sm:text-base">Accueil</Link>
                            <Link to="/formateur/stages" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-white/90 hover:text-white hover:bg-white/10 font-medium text-sm sm:text-base">Formations</Link>
                            <Link to="/formateur/history" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-white/90 hover:text-white hover:bg-white/10 font-medium text-sm sm:text-base">Historique</Link>
                            <Link to="/formateur/diplomes" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-white/90 hover:text-white hover:bg-white/10 font-medium text-sm sm:text-base">🎓 Mes Diplômes</Link>
                            <Link to="/formateur/profile" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-white/90 hover:text-white hover:bg-white/10 font-medium text-sm sm:text-base">Mon Profil</Link>
                        </div>
                    </div>
                </>
            )}
        </nav>
    );
}
