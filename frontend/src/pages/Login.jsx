import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [successMessage] = useState(location.state?.message || '');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await login(formData.email, formData.password);
            
            // Rediriger selon le rôle
            if (response.user.role === 'admin') {
                navigate('/admin/dashboard');
            } else if (response.user.role === 'gestionaire') {
                navigate('/gestionaire/dashboard');
            } else {
                navigate('/formateur/dashboard');
            }
        } catch (err) {
            // Gérer les erreurs avec message (de AuthContext) ou réponse directe
            let messageErreur = err.message || err.response?.data?.message || 'Une erreur est survenue lors de la connexion';
            
            // Si c'est une erreur de validation, extraire les messages
            if (err.response?.data?.errors) {
                const errors = err.response.data.errors;
                messageErreur = Object.values(errors).flat().join(', ') || messageErreur;
            }
            
            setError(messageErreur);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-[#0a0a0a] dark:via-gray-900 dark:to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <div className="flex justify-center mb-1 relative" style={{ perspective: '1000px' }}>
                        <div className="relative">
                            <img 
                                src="/StageConnect-logo.png" 
                                alt="StageConnect Logo" 
                                className="h-48 w-auto object-contain animate-[float3d_4s_ease-in-out_infinite] hover:scale-110 transition-all duration-500 relative z-10"
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
                        Connexion
                    </h2>
                    <p className="text-sm text-[#78786c] dark:text-[#9D9D99]">
                        Bienvenue! Connectez-vous à votre compte
                    </p>
                </div>

                {/* Form */}
                <form className="mt-8 space-y-6 bg-white/90 dark:bg-[#161615]/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 dark:border-[#3E3E3A]/50 p-8" onSubmit={handleSubmit}>
                    {successMessage && (
                        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm border border-green-200 dark:border-green-800">
                            {successMessage}
                        </div>
                    )}
                    {error && (
                        <div className="message message-error">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Email */}
                        <div className="form-group">
                            <label htmlFor="email" className="form-label">
                                Adresse email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="walid@gmail.com"
                            />
                        </div>

                        {/* Password */}
                        <div className="form-group">
                            <label htmlFor="password" className="form-label">
                                Mot de passe
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
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
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn w-full flex items-center justify-center text-white"
                        style={{background: loading ? '#9ca3af' : 'linear-gradient(to right, #1a365d, #2d3748)'}}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Connexion...
                            </span>
                        ) : (
                            'Se connecter'
                        )}
                    </button>

                    {/* Links */}
                    <div className="text-center space-y-2">
                        <p className="text-sm text-[#78786c] dark:text-[#9D9D99]">
                            <Link to="/forgot-password" className="text-[#1a365d] hover:text-[#2d3748] dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors">
                                Mot de passe oublié ?
                            </Link>
                        </p>
                        <p className="text-sm text-[#78786c] dark:text-[#9D9D99]">
                            Pas encore de compte?{' '}
                            <Link to="/register" className="text-[#1a365d] hover:text-[#2d3748] font-semibold transition-colors">
                                S'inscrire
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}

