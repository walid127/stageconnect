import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const tokenFromUrl = searchParams.get('token') || '';
    const emailFromUrl = searchParams.get('email') || '';

    const [formData, setFormData] = useState({
        email: emailFromUrl,
        token: tokenFromUrl,
        password: '',
        password_confirmation: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

    useEffect(() => {
        setFormData((prev) => ({
            ...prev,
            email: emailFromUrl,
            token: tokenFromUrl,
        }));
    }, [emailFromUrl, tokenFromUrl]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.token || !formData.email) {
            setError('Lien invalide ou expiré. Demandez un nouveau lien depuis la page « Mot de passe oublié ».');
            return;
        }
        setLoading(true);
        setError('');

        try {
            await axios.post('/api/auth/reset-password', {
                email: formData.email,
                token: formData.token,
                password: formData.password,
                password_confirmation: formData.password_confirmation,
            });
            setError('');
            navigate('/login', { state: { message: 'Mot de passe réinitialisé. Vous pouvez vous connecter.' } });
        } catch (err) {
            const msg = err.response?.data?.message || (err.response?.data?.errors && Object.values(err.response.data.errors).flat().join(', ')) || 'Une erreur est survenue.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const missingParams = !tokenFromUrl || !emailFromUrl;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-[#0a0a0a] dark:via-gray-900 dark:to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="flex justify-center mb-1">
                        <img src="/StageConnect-logo.png" alt="StageConnect Logo" className="h-32 w-auto object-contain" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-3">
                        Nouveau mot de passe
                    </h2>
                    <p className="text-sm text-[#78786c] dark:text-[#9D9D99]">
                        Choisissez un nouveau mot de passe pour votre compte
                    </p>
                </div>

                <form className="mt-8 space-y-6 bg-white/90 dark:bg-[#161615]/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 dark:border-[#3E3E3A]/50 p-8" onSubmit={handleSubmit}>
                    {error && <div className="message message-error">{error}</div>}

                    {missingParams ? (
                        <div className="space-y-4">
                            <p className="text-sm text-[#78786c] dark:text-[#9D9D99]">
                                Ce lien est invalide ou incomplet. Utilisez le lien reçu par email ou demandez-en un nouveau.
                            </p>
                            <Link
                                to="/forgot-password"
                                className="block w-full text-center px-4 py-3 rounded-xl font-medium text-white transition-all"
                                style={{ background: 'linear-gradient(to right, #1a365d, #2d3748)' }}
                            >
                                Demander un nouveau lien
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="form-group">
                                <label htmlFor="email" className="form-label">Email</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="form-input"
                                    readOnly
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="password" className="form-label">Nouveau mot de passe</label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        minLength={8}
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="form-input pr-10"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    >
                                        {showPassword ? '🙈' : '👁'}
                                    </button>
                                </div>
                                <p className="text-xs text-[#78786c] dark:text-[#9D9D99] mt-1">Minimum 8 caractères</p>
                            </div>
                            <div className="form-group">
                                <label htmlFor="password_confirmation" className="form-label">Confirmer le mot de passe</label>
                                <div className="relative">
                                    <input
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        type={showPasswordConfirmation ? 'text' : 'password'}
                                        required
                                        value={formData.password_confirmation}
                                        onChange={handleChange}
                                        className="form-input pr-10"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    >
                                        {showPasswordConfirmation ? '🙈' : '👁'}
                                    </button>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn w-full flex items-center justify-center text-white"
                                style={{ background: loading ? '#9ca3af' : 'linear-gradient(to right, #1a365d, #2d3748)' }}
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Enregistrement...
                                    </span>
                                ) : (
                                    'Réinitialiser le mot de passe'
                                )}
                            </button>
                        </>
                    )}

                    <div className="text-center">
                        <Link to="/login" className="text-sm text-[#1a365d] hover:text-[#2d3748] dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors">
                            ← Retour à la connexion
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
