import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Register() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [step, setStep] = useState(1); // 1: Saisir identifiant_formateur, 2: Formulaire d'inscription
    const [formateurId, setFormateurId] = useState('');
    const [validatingId, setValidatingId] = useState(false);
    const [formateurData, setFormateurData] = useState(null);
    const [formData, setFormData] = useState({
        formateur_id: '',
        email: '',
        password: '',
        password_confirmation: '',
        phone: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

    const validateFormateurId = async (e) => {
        e.preventDefault();
        setValidatingId(true);
        setError('');

        try {
            const response = await axios.get(`/api/formateurs/validate/${encodeURIComponent(formateurId)}`);
            if (response.data.valid) {
                // L'API retourne 'formateur' maintenant (noms français)
                const formateurInfo = response.data.formateur || response.data.trainer;
                setFormateurData(formateurInfo);
                setFormData(prev => ({
                    ...prev,
                    formateur_id: formateurId,
                }));
                setStep(2); // Passer au formulaire d'inscription
            } else {
                setError(response.data.message || 'ID formateur invalide');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'ID formateur invalide ou déjà utilisé. Veuillez contacter l\'administrateur.');
        } finally {
            setValidatingId(false);
        }
    };

    const formatPhone = (value) => {
        // Garder uniquement les chiffres
        const digits = value.replace(/\D/g, '');
        // Limiter à 10 chiffres
        return digits.slice(0, 10);
    };

    const handleChange = (e) => {
        let value = e.target.value;
        
        // Formater le téléphone si c'est le champ phone
        if (e.target.name === 'phone') {
            value = formatPhone(value);
        }
        
        setFormData({
            ...formData,
            [e.target.name]: value,
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validation
        if (formData.password !== formData.password_confirmation) {
            setError('Les mots de passe ne correspondent pas');
            setLoading(false);
            return;
        }

        try {
            await register(formData);
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            console.error('Erreur d\'inscription:', err);
            
            // Gérer le message d'erreur (peut provenir d'AuthContext ou d'une réponse directe)
            const messageErreur = err.message || err.response?.data?.message || 'Une erreur est survenue lors de l\'inscription';
            
            // S'il y a des erreurs de validation, les formater proprement
            if (err.response?.data?.errors) {
                const errors = err.response.data.errors;
                const messagesErreur = [];
                Object.keys(errors).forEach(key => {
                    if (Array.isArray(errors[key])) {
                        messagesErreur.push(...errors[key]);
                    } else if (errors[key]) {
                        messagesErreur.push(errors[key]);
                    }
                });
                setError(messagesErreur.length > 0 ? messagesErreur.join(', ') : messageErreur);
            } else {
                setError(messageErreur);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBackToId = () => {
        setStep(1);
        setError('');
        setFormateurId('');
        setFormateurData(null);
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-[#0a0a0a] dark:via-gray-900 dark:to-gray-800 flex items-center justify-center py-12 px-4">
                <div className="max-w-md w-full bg-white/90 dark:bg-[#161615]/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 dark:border-[#3E3E3A]/50 p-8 text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h2 className="text-2xl font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-4">
                        Inscription réussie!
                    </h2>
                    <p className="text-[#78786c] dark:text-[#9D9D99] mb-6">
                        Votre compte a été créé avec succès. Il est en attente de validation par un administrateur. Vous serez redirigé vers la page de connexion...
                    </p>
                </div>
            </div>
        );
    }

    // Étape 1 : Saisir l'ID Formateur
    if (step === 1) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-[#0a0a0a] dark:via-gray-900 dark:to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="flex justify-center mb-1 relative" style={{ perspective: '1000px' }}>
                            <div className="relative">
                                <img 
                                    src="/StageConnect-logo.png" 
                                    alt="StageConnect Logo" 
                                    className="h-48 w-auto object-contain max-w-md animate-[float3d_4s_ease-in-out_infinite] hover:scale-110 transition-all duration-500 relative z-10"
                                    style={{
                                        transformStyle: 'preserve-3d'
                                    }}
                                />
                                <div 
                                    className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3/4 h-8 bg-black/50 rounded-full blur-xl animate-[shadow_4s_ease-in-out_infinite]"
                                    style={{ zIndex: 0 }}
                                />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-3">
                            Inscription Formateur
                        </h2>
                        <p className="text-sm text-[#78786c] dark:text-[#9D9D99]">
                            Entrez votre ID formateur pour commencer
                        </p>
                    </div>

                    {/* Form */}
                    <form className="bg-white/90 dark:bg-[#161615]/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 dark:border-[#3E3E3A]/50 p-8" onSubmit={validateFormateurId}>
                        {error && (
                            <div className="mb-6 message message-error">
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">
                                ID Formateur *
                            </label>
                            <input
                                type="text"
                                value={formateurId}
                                onChange={(e) => setFormateurId(e.target.value.toUpperCase())}
                                className="form-input"
                                placeholder="FOR-0001"
                                required
                                autoFocus
                            />
                            <p className="mt-2 text-xs text-[#78786c] dark:text-[#9D9D99]">
                                Entrez l'ID formateur fourni par l'administrateur
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={validatingId || !formateurId}
                            className="btn w-full flex items-center justify-center text-white"
                            style={{background: (validatingId || !formateurId) ? '#9ca3af' : 'linear-gradient(to right, #1a365d, #2d3748)'}}
                        >
                            {validatingId ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Vérification...
                                </span>
                            ) : (
                                'Valider et Continuer'
                            )}
                        </button>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-[#78786c] dark:text-[#9D9D99]">
                                Vous avez déjà un compte?{' '}
                                <Link to="/login" className="text-[#1a365d] hover:text-[#2d3748] font-semibold transition-colors">
                                    Se connecter
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // Step 2: Registration Form (pre-filled with trainer data)
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-[#0a0a0a] dark:via-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="flex justify-center mb-1 relative" style={{ perspective: '1000px' }}>
                        <div className="relative">
                            <img 
                                src="/StageConnect-logo.png" 
                                alt="StageConnect Logo" 
                                className="h-48 w-auto object-contain max-w-md animate-[float3d_4s_ease-in-out_infinite] hover:scale-110 transition-all duration-500 relative z-10"
                                style={{
                                    transformStyle: 'preserve-3d'
                                }}
                            />
                            <div 
                                className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3/4 h-8 bg-black/50 rounded-full blur-xl animate-[shadow_4s_ease-in-out_infinite]"
                                style={{ zIndex: 0 }}
                            />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-3">
                        Inscription Formateur
                    </h2>
                    <p className="text-sm text-[#78786c] dark:text-[#9D9D99]">
                        Complétez vos informations pour créer votre compte
                    </p>
                    {formateurData && (
                        <div className="mt-4 inline-flex items-center gap-2 badge badge-success">
                            <span>✅</span>
                            <span className="text-sm font-medium">
                                ID Formateur Validé !
                            </span>
                        </div>
                    )}
                </div>

                {/* Form */}
                <form className="bg-white/90 dark:bg-[#161615]/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 dark:border-[#3E3E3A]/50 p-8" onSubmit={handleSubmit}>
                    {error && (
                        <div className="mb-6 message message-error">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <p className="font-medium">{error}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setError('')}
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Informations de Base */}
                    <div className="mb-8">
                        <h3 className="text-xl font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-6">
                            Informations à Compléter
                        </h3>
                        <p className="text-sm text-[#78786c] dark:text-[#9D9D99] mb-6">
                            Veuillez remplir les champs suivants pour finaliser votre inscription :
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-group">
                                <label className="form-label">
                                    Téléphone *
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="0672587841"
                                    maxLength="10"
                                    required
                                />
                            </div>

                            <div className="form-group md:col-span-2">
                                <label className="form-label">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="walid@gmail.com"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Mot de passe *
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="form-input pr-10"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Confirmer le mot de passe *
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasswordConfirmation ? "text" : "password"}
                                        name="password_confirmation"
                                        required
                                        value={formData.password_confirmation}
                                        onChange={handleChange}
                                        className="form-input pr-10"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                    >
                                        {showPasswordConfirmation ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profil Professionnel - Lecture Seule */}
                    {formateurData && (
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-6">
                                Votre Profil Professionnel
                            </h3>
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {formateurData.identifiant_formateur && (
                                        <div>
                                            <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                                ID Formateur
                                            </label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC] font-medium">
                                                {formateurData.identifiant_formateur}
                                            </p>
                                        </div>
                                    )}
                                    {formateurData.nom && (
                                        <div>
                                            <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                                Nom
                                            </label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC] font-medium">
                                                {formateurData.nom}
                                            </p>
                                        </div>
                                    )}
                                    {formateurData.grade && (
                                        <div>
                                            <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                                Grade
                                            </label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC] font-medium">
                                                {formateurData.grade}
                                            </p>
                                        </div>
                                    )}
                                    {formateurData.specialite && (
                                        <div>
                                            <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                                Spécialité
                                            </label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC] font-medium">
                                                {formateurData.specialite}
                                            </p>
                                        </div>
                                    )}
                                    {formateurData.ville && (
                                        <div>
                                            <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                                Ville
                                            </label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC] font-medium">
                                                {formateurData.ville}
                                            </p>
                                        </div>
                                    )}
                                    {formateurData.institution && (
                                        <div>
                                            <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                                Institution
                                            </label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC] font-medium">
                                                {formateurData.institution}
                                            </p>
                                        </div>
                                    )}
                                    {formateurData.diplome && (
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                                                Diplôme
                                            </label>
                                            <p className="text-sm text-[#1b1b18] dark:text-[#EDEDEC] font-medium">
                                                {formateurData.diplome}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <p className="mt-4 text-xs text-blue-600 dark:text-blue-400 italic">
                                    ℹ️ Ces informations ont été pré-remplies par l'administrateur et ne peuvent pas être modifiées.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="mt-8 flex gap-4">
                        <button
                            type="button"
                            onClick={handleBackToId}
                            className="btn btn-secondary"
                            style={{flex: 1}}
                        >
                            ← Retour
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn flex items-center justify-center text-white"
                            style={{flex: 1, background: loading ? '#9ca3af' : 'linear-gradient(to right, #1a365d, #2d3748)'}}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Inscription en cours...
                                </span>
                            ) : (
                                'S\'inscrire'
                            )}
                        </button>
                    </div>

                    {/* Link to Login */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-[#78786c] dark:text-[#9D9D99]">
                            Vous avez déjà un compte?{' '}
                            <Link to="/login" className="text-[#1a365d] hover:text-[#2d3748] font-semibold transition-colors">
                                Se connecter
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}

