import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            await axios.post('/api/auth/forgot-password', { email }, { timeout: 15000 });
            setSuccess(true);
        } catch (err) {
            // If backend mail transport is slow, don't leave the form stuck.
            if (err.code === 'ECONNABORTED') {
                setSuccess(true);
                return;
            }
            const msg = err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Une erreur est survenue.';
            setError(msg);
            if (err.response?.status === 500) {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-[#0a0a0a] dark:via-gray-900 dark:to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="flex justify-center mb-1 relative" style={{ perspective: '1000px' }}>
                        <img
                            src="/StageConnect-logo.png"
                            alt="StageConnect Logo"
                            className="h-32 w-auto object-contain"
                        />
                    </div>
                    <h2 className="text-2xl font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-3">
                        Mot de passe oublié
                    </h2>
                    <p className="text-sm text-[#78786c] dark:text-[#9D9D99]">
                        Entrez votre adresse email pour recevoir un lien de réinitialisation
                    </p>
                </div>

                <form className="mt-8 space-y-6 bg-white/90 dark:bg-[#161615]/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 dark:border-[#3E3E3A]/50 p-8" onSubmit={handleSubmit}>
                    {error && (
                        <div className="message message-error">{error}</div>
                    )}
                    {success && (
                        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm border border-green-200 dark:border-green-800">
                            Si cette adresse est enregistrée, vous recevrez un email avec le lien de réinitialisation. Vérifiez aussi vos spams.
                        </div>
                    )}

                    {!success && (
                        <>
                            <div className="form-group">
                                <label htmlFor="email" className="form-label">
                                    Adresse email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="form-input"
                                    placeholder="votre@email.com"
                                />
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
                                        Envoi...
                                    </span>
                                ) : (
                                    'Envoyer le lien'
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
