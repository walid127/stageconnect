import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CacheProvider } from './context/CacheContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import FormateurDashboard from './pages/formateur/TableauDeBord';
import Formations from './pages/formateur/Formations';
import StageRegulier from './pages/formateur/StageRegulier';
import StagePedagogique from './pages/formateur/StagePedagogique';
import PSP1 from './pages/formateur/PSP1';
import PSP2 from './pages/formateur/PSP2';
import CandidaturesFormateur from './pages/formateur/Candidatures';
import FormateurProfile from './pages/formateur/Profil';
import FormateurNotifications from './pages/formateur/Notifications';
import FormateurMessages from './pages/formateur/Messages';
import Historique from './pages/formateur/Historique';
import FormateurDiplomas from './pages/formateur/Diplomes';
import AdminDashboard from './pages/admin/TableauDeBord';
import AdminMessagesGestionaires from './pages/admin/MessagesGestionaires';
import Gestionaires from './pages/admin/Gestionaires';
import AdminProfile from './pages/admin/Profil';
import Database from './pages/admin/Database';
import Packages from './pages/admin/Packages';
import GestionaireDashboard from './pages/gestionaire/TableauDeBord';
import StatistiquesGestionaire from './pages/gestionaire/Statistiques';
import UtilisateursGestionaire from './pages/gestionaire/Utilisateurs';
import GestionaireFormateurs from './pages/gestionaire/Formateurs';
import FormationsGestionaire from './pages/gestionaire/Formations';
import StageRegulierGestionaire from './pages/gestionaire/StageRegulier';
import StagePedagogiqueGestionaire from './pages/gestionaire/StagePedagogique';
import PSP1Gestionaire from './pages/gestionaire/PSP1';
import PSP2Gestionaire from './pages/gestionaire/PSP2';
import CandidaturesGestionaire from './pages/gestionaire/Candidatures';
import SpecialistesGestionaire from './pages/gestionaire/Specialistes';
import GradesGestionaire from './pages/gestionaire/Grades';
import CreerFormationGestionaire from './pages/gestionaire/CreerFormation';
import GestionaireNotifications from './pages/gestionaire/Notifications';
import GestionaireMessages from './pages/gestionaire/Messages';
import GestionaireDiplomas from './pages/gestionaire/Diplomes';
import GestionaireProfile from './pages/gestionaire/Profil';

// Composant Page de Déconnexion
function LogoutPage() {
    const { logout } = useAuth();
    
    useEffect(() => {
        const performLogout = async () => {
            await logout();
            // Rediriger vers la connexion après la déconnexion
            window.location.href = '/login';
        };
        performLogout();
    }, [logout]);
    
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFDFC] dark:bg-[#0a0a0a]">
            <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#f53003] mx-auto"></div>
                <p className="mt-4 text-[#78786c] dark:text-[#9D9D99]">Déconnexion...</p>
            </div>
        </div>
    );
}

// Composant Route Protégée
function ProtectedRoute({ children, requireAdmin = false, requireAdminOnly = false, requireGestionaire = false }) {
    const { user, loading, isAdmin, isGestionaire } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFDFC] dark:bg-[#0a0a0a]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#f53003] mx-auto"></div>
                    <p className="mt-4 text-[#78786c] dark:text-[#9D9D99]">Chargement...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    // requireAdminOnly: Seul l'admin peut accéder (pas les gestionaires)
    if (requireAdminOnly && !isAdmin) {
        return <Navigate to="/formateur/dashboard" />;
    }

    // requireGestionaire: Seul le gestionaire peut accéder (bloquer l'admin)
    if (requireGestionaire) {
        if (!isGestionaire) {
            return <Navigate to="/formateur/dashboard" />;
        }
        // Bloquer l'admin des routes gestionaire
        if (isAdmin) {
            return <Navigate to="/admin/dashboard" />;
        }
    }

    // requireAdmin: Admin ou gestionaire peuvent accéder
    if (requireAdmin && !isAdmin && !isGestionaire) {
        return <Navigate to="/formateur/dashboard" />;
    }

    return children;
}

// Composant Route Publique (rediriger si authentifié)
function PublicRoute({ children }) {
    const { user, loading, isAdmin } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFDFC] dark:bg-[#0a0a0a]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#f53003] mx-auto"></div>
                    <p className="mt-4 text-[#78786c] dark:text-[#9D9D99]">Chargement...</p>
                </div>
            </div>
        );
    }

    if (user) {
        if (isAdmin) {
            return <Navigate to="/admin/dashboard" />;
        }
        if (user.role === 'gestionaire') {
            return <Navigate to="/gestionaire/dashboard" />;
        }
        return <Navigate to="/formateur/dashboard" />;
    }

    return children;
}

function AppContent() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route 
                path="/login" 
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                } 
            />
            <Route 
                path="/register" 
                element={
                    <PublicRoute>
                        <Register />
                    </PublicRoute>
                } 
            />
            <Route 
                path="/forgot-password" 
                element={
                    <PublicRoute>
                        <ForgotPassword />
                    </PublicRoute>
                } 
            />
            <Route 
                path="/reset-password" 
                element={
                    <PublicRoute>
                        <ResetPassword />
                    </PublicRoute>
                } 
            />
            <Route 
                path="/logout" 
                element={<LogoutPage />} 
            />

            {/* Formateur Routes */}
            <Route
                path="/formateur/dashboard"
                element={
                    <ProtectedRoute>
                        <FormateurDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/formateur/stages"
                element={
                    <ProtectedRoute>
                        <Formations />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/formateur/stages/regulier"
                element={
                    <ProtectedRoute>
                        <StageRegulier />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/formateur/stages/pedagogique"
                element={
                    <ProtectedRoute>
                        <StagePedagogique />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/formateur/stages/psp1"
                element={
                    <ProtectedRoute>
                        <PSP1 />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/formateur/stages/psp2"
                element={
                    <ProtectedRoute>
                        <PSP2 />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/formateur/candidatures"
                element={
                    <ProtectedRoute>
                        <CandidaturesFormateur />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/formateur/profile"
                element={
                    <ProtectedRoute>
                        <FormateurProfile />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/formateur/notifications"
                element={
                    <ProtectedRoute>
                        <FormateurNotifications />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/formateur/messages"
                element={
                    <ProtectedRoute>
                        <FormateurMessages />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/formateur/history"
                element={
                    <ProtectedRoute>
                        <Historique />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/formateur/diplomes"
                element={
                    <ProtectedRoute>
                        <FormateurDiplomas />
                    </ProtectedRoute>
                }
            />

            {/* Admin Only Routes - Seul l'admin peut accéder (gestionaires, database, packages) */}
            <Route
                path="/admin/dashboard"
                element={
                    <ProtectedRoute requireAdminOnly>
                        <AdminDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/gestionaires"
                element={
                    <ProtectedRoute requireAdminOnly>
                        <Gestionaires />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/database"
                element={
                    <ProtectedRoute requireAdminOnly>
                        <Database />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/packages"
                element={
                    <ProtectedRoute requireAdminOnly>
                        <Packages />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/profile"
                element={
                    <ProtectedRoute requireAdminOnly>
                        <AdminProfile />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/messages-gestionaires"
                element={
                    <ProtectedRoute requireAdminOnly>
                        <AdminMessagesGestionaires />
                    </ProtectedRoute>
                }
            />

            {/* Gestionaire Routes */}
            <Route
                path="/gestionaire/dashboard"
                element={
                    <ProtectedRoute requireGestionaire>
                        <GestionaireDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/gestionaire/statistics"
                element={
                    <ProtectedRoute requireGestionaire>
                        <StatistiquesGestionaire />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/gestionaire/utilisateurs"
                element={
                    <ProtectedRoute requireGestionaire>
                        <UtilisateursGestionaire />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/gestionaire/formateurs"
                element={
                    <ProtectedRoute requireGestionaire>
                        <GestionaireFormateurs />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/gestionaire/stages"
                element={
                    <ProtectedRoute requireGestionaire>
                        <FormationsGestionaire />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/gestionaire/stages/regulier"
                element={
                    <ProtectedRoute requireGestionaire>
                        <StageRegulierGestionaire />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/gestionaire/stages/pedagogique"
                element={
                    <ProtectedRoute requireGestionaire>
                        <StagePedagogiqueGestionaire />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/gestionaire/stages/psp1"
                element={
                    <ProtectedRoute requireGestionaire>
                        <PSP1Gestionaire />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/gestionaire/stages/psp2"
                element={
                    <ProtectedRoute requireGestionaire>
                        <PSP2Gestionaire />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/gestionaire/candidatures"
                element={
                    <ProtectedRoute requireGestionaire>
                        <CandidaturesGestionaire />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/gestionaire/specialistes"
                element={
                    <ProtectedRoute requireGestionaire>
                        <SpecialistesGestionaire />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/gestionaire/grades"
                element={
                    <ProtectedRoute requireGestionaire>
                        <GradesGestionaire />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/gestionaire/formations/creer"
                element={
                    <ProtectedRoute requireGestionaire>
                        <CreerFormationGestionaire />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/gestionaire/notifications"
                element={
                    <ProtectedRoute requireGestionaire>
                        <GestionaireNotifications />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/gestionaire/messages"
                element={
                    <ProtectedRoute requireGestionaire>
                        <GestionaireMessages />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/gestionaire/diplomes"
                element={
                    <ProtectedRoute requireGestionaire>
                        <GestionaireDiplomas />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/gestionaire/profile"
                element={
                    <ProtectedRoute requireGestionaire>
                        <GestionaireProfile />
                    </ProtectedRoute>
                }
            />

            {/* Redirect root to logout first, then login */}
            <Route path="/" element={<Navigate to="/logout" />} />

            {/* 404 */}
            <Route
                path="*"
                element={
                    <div className="min-h-screen flex items-center justify-center bg-[#FDFDFC] dark:bg-[#0a0a0a]">
                        <div className="text-center">
                            <h1 className="text-6xl font-bold text-[#f53003] mb-4">404</h1>
                            <p className="text-xl text-[#1b1b18] dark:text-[#EDEDEC]">Page non trouvée</p>
                        </div>
                    </div>
                }
            />
        </Routes>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <CacheProvider>
                    <AppContent />
                </CacheProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;
