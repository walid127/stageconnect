import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NavigationGestionaire from '../../components/GestionaireNav';
import axios from 'axios';

export default function CreerFormation() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showMessage, setShowMessage] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('success');
    const [formData, setFormData] = useState({
        titre: '',
        description: '',
        categorie: '',
        date_debut: '',
        date_fin: '',
        duree_heures: '',
        lieu: '',
        participants_max: 30,
        prerequis: '',
        statut: 'active',
    });
    const [edtData, setEdtData] = useState({
        annee_scolaire: '',
        etablissement: '',
        departement: '',
        specialite: '',
        fichier: null,
    });


    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate required fields
        if (!formData.titre || !formData.description || !formData.date_debut || !formData.date_fin || !formData.lieu) {
            setError('Veuillez remplir tous les champs obligatoires');
            setLoading(false);
            return;
        }

        try {
            // Construire FormData pour gérer aussi l'upload d'emploi du temps
            const payload = new FormData();
            payload.append('titre', formData.titre);
            payload.append('description', formData.description);
            payload.append('date_deb', formData.date_debut);
            payload.append('date_fin', formData.date_fin);
            if (formData.duree_heures) {
                payload.append('duree_hrs', parseInt(formData.duree_heures, 10));
            }
            payload.append('lieu', formData.lieu);
            payload.append('part_max', parseInt(formData.participants_max, 10));
            if (formData.prerequis) {
                payload.append('prerequis', formData.prerequis);
            }
            payload.append('statut', formData.statut === 'active' ? 'en_cours' : formData.statut);

            // Ajouter les données d'emploi du temps si fournies
            if (edtData.fichier) {
                payload.append('emploi_du_temps', edtData.fichier);
                if (edtData.annee_scolaire) {
                    payload.append('edt_annee_scolaire', edtData.annee_scolaire);
                }
                if (edtData.etablissement) {
                    payload.append('edt_etablissement', edtData.etablissement);
                }
                if (edtData.departement) {
                    payload.append('edt_departement', edtData.departement);
                }
                if (edtData.specialite) {
                    payload.append('edt_specialite', edtData.specialite);
                }
            }

            const response = await axios.post('/api/formations', payload);
            
            // Show success message
            setMessage('Formation créée avec succès!');
            setMessageType('success');
            setShowMessage(true);
            
            // Redirect after a short delay
            setTimeout(() => {
                navigate('/gestionaire/stages');
            }, 1500);
            
        } catch (err) {
            if (err.response?.data?.errors) {
                const messagesErreur = Object.values(err.response.data.errors).flat();
                setError(messagesErreur.join(', '));
            } else {
                setError(err.response?.data?.message || err.message || 'Erreur lors de la création de la formation');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
        <div className="min-h-screen bg-[#FDFDFC] dark:bg-[#0a0a0a]">
            <NavigationGestionaire />

            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
                <div className="mb-6">
                    <Link to="/gestionaire/stages" className="text-[#f53003] hover:text-[#d42902] flex items-center gap-2">
                        ← Retour à la liste des formations
                    </Link>
                </div>

                {/* Modal */}
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#161615] rounded-2xl shadow-2xl border border-white/20 dark:border-[#3E3E3A]/50 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#1a365d] to-[#2d3748] p-6 text-white rounded-t-2xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold">Créer une Nouvelle Formation</h2>
                                    <p className="text-white/80 text-sm mt-1">Créez une nouvelle formation et proposez-la aux formateurs de votre plateforme</p>
                                </div>
                                <Link
                                    to="/gestionaire/stages"
                                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
                                >
                                    ✕
                                </Link>
                            </div>
                        </div>
                        
                        <div className="p-6 max-h-[70vh] overflow-y-auto">

                    {error && (
                        <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-6 py-4 rounded-xl">
                            {error}
                        </div>
                    )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Titre */}
                                <div>
                                    <label className="block text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC] mb-2">
                                        Titre de la formation *
                                    </label>
                                    <input
                                        type="text"
                                        name="titre"
                                        required
                                        value={formData.titre}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-white/20 dark:border-[#3E3E3A]/50 rounded-xl bg-white/50 dark:bg-[#161615]/50 text-[#1b1b18] dark:text-[#EDEDEC] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20 transition-all"
                                        placeholder="Ex: Formation React Avancé"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC] mb-2">
                                        Description *
                                    </label>
                                    <textarea
                                        name="description"
                                        required
                                        rows="3"
                                        value={formData.description}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-white/20 dark:border-[#3E3E3A]/50 rounded-xl bg-white/50 dark:bg-[#161615]/50 text-[#1b1b18] dark:text-[#EDEDEC] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20 transition-all resize-none"
                                        placeholder="Décrivez la formation en détail..."
                                    />
                                </div>

                                {/* Lieu */}
                                    <div>
                                        <label className="block text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC] mb-2">
                                            Lieu *
                                        </label>
                                        <input
                                            type="text"
                                            name="lieu"
                                            required
                                            value={formData.lieu}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-white/20 dark:border-[#3E3E3A]/50 rounded-xl bg-white/50 dark:bg-[#161615]/50 text-[#1b1b18] dark:text-[#EDEDEC] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20 transition-all"
                                            placeholder="Ex: Casablanca"
                                        />
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC] mb-2">
                                            Date de début *
                                        </label>
                                        <input
                                            type="date"
                                            name="date_debut"
                                            required
                                            value={formData.date_debut}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-white/20 dark:border-[#3E3E3A]/50 rounded-xl bg-white/50 dark:bg-[#161615]/50 text-[#1b1b18] dark:text-[#EDEDEC] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC] mb-2">
                                            Date de fin *
                                        </label>
                                        <input
                                            type="date"
                                            name="date_fin"
                                            required
                                            value={formData.date_fin}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-white/20 dark:border-[#3E3E3A]/50 rounded-xl bg-white/50 dark:bg-[#161615]/50 text-[#1b1b18] dark:text-[#EDEDEC] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Durée et Participants */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC] mb-2">
                                            Durée (heures)
                                        </label>
                                        <input
                                            type="number"
                                            name="duree_heures"
                                            min="1"
                                            value={formData.duree_heures}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-white/20 dark:border-[#3E3E3A]/50 rounded-xl bg-white/50 dark:bg-[#161615]/50 text-[#1b1b18] dark:text-[#EDEDEC] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20 transition-all"
                                            placeholder="Ex: 40"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC] mb-2">
                                            Nombre maximum de participants *
                                        </label>
                                        <input
                                            type="number"
                                            name="participants_max"
                                            required
                                            min="1"
                                            max="100"
                                            value={formData.participants_max}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-white/20 dark:border-[#3E3E3A]/50 rounded-xl bg-white/50 dark:bg-[#161615]/50 text-[#1b1b18] dark:text-[#EDEDEC] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20 transition-all"
                                            placeholder="30"
                                        />
                                    </div>
                                </div>

                                {/* Prérequis */}
                                <div>
                                    <label className="block text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC] mb-2">
                                        Prérequis
                                    </label>
                                    <textarea
                                        name="prerequis"
                                        rows="2"
                                        value={formData.prerequis}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-white/20 dark:border-[#3E3E3A]/50 rounded-xl bg-white/50 dark:bg-[#161615]/50 text-[#1b1b18] dark:text-[#EDEDEC] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20 transition-all resize-none"
                                        placeholder="Ex: Connaissances de base en JavaScript..."
                                    />
                                </div>

                                {/* Emploi du temps (optionnel) - même modèle que Créer une Formation Pédagogique */}
                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50/60 dark:bg-gray-900/40 space-y-3">
                                    <p className="text-sm font-semibold text-[#1b1b18] dark:text-[#EDEDEC]">
                                        Emploi du temps (optionnel)
                                    </p>
                                    <p className="text-xs text-[#78786c] dark:text-[#9D9D99]">
                                        Si vous ajoutez un emploi du temps ici, il sera partagé avec tous les candidats acceptés à cette formation.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99] mb-1">
                                                Année scolaire (année uniquement)
                                            </label>
                                            <input
                                                type="number"
                                                min="1900"
                                                max="2100"
                                                value={edtData.annee_scolaire}
                                                onChange={(e) => setEdtData({ ...edtData, annee_scolaire: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                                                placeholder="2025"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99] mb-1">
                                                Établissement
                                            </label>
                                            <input
                                                type="text"
                                                value={edtData.etablissement}
                                                onChange={(e) => setEdtData({ ...edtData, etablissement: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                                                placeholder="Ex: Institut Supérieur StageConnect"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99] mb-1">
                                                Département
                                            </label>
                                            <input
                                                type="text"
                                                value={edtData.departement}
                                                onChange={(e) => setEdtData({ ...edtData, departement: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                                                placeholder="Ex: Informatique"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99] mb-1">
                                                Spécialité
                                            </label>
                                            <input
                                                type="text"
                                                value={edtData.specialite}
                                                onChange={(e) => setEdtData({ ...edtData, specialite: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-[#1b1b18] dark:text-[#EDEDEC] focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                                                placeholder="Ex: Pédagogie"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[#78786c] dark:text-[#9D9D99] mb-1">
                                            Fichier emploi du temps
                                        </label>
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,.xls,.xlsx"
                                            onChange={(e) => setEdtData({ ...edtData, fichier: e.target.files[0] || null })}
                                            className="block w-full text-sm text-gray-500 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#1a365d] file:text-white hover:file:bg-[#2d3748] file:cursor-pointer cursor-pointer"
                                        />
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Formats acceptés: PDF, DOC, DOCX, XLS, XLSX
                                        </p>
                                        {edtData.fichier && (
                                            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                                                ✓ Fichier sélectionné: {edtData.fichier.name}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Statut */}
                                <div>
                                    <label className="block text-sm font-medium text-[#1b1b18] dark:text-[#EDEDEC] mb-2">
                                        Statut *
                                    </label>
                                    <select
                                        name="statut"
                                        required
                                        value={formData.statut}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-white/20 dark:border-[#3E3E3A]/50 rounded-xl bg-white/50 dark:bg-[#161615]/50 text-[#1b1b18] dark:text-[#EDEDEC] focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/20 transition-all"
                                    >
                                        <option value="active">En cours</option>
                                        <option value="completed">Terminé</option>
                                    </select>
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1a365d] to-[#2d3748] hover:from-[#2d3748] hover:to-[#1a365d] disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Création en cours...
                                            </span>
                                        ) : (
                                            '📚 Créer la formation'
                                        )}
                                    </button>
                                    <Link
                                        to="/gestionaire/stages"
                                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all text-center"
                                    >
                                        Annuler
                                    </Link>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Message */}
            {showMessage && (
                <div className="fixed top-4 right-4 z-50 animate-slide-in">
                    <div className={`px-6 py-4 rounded-xl shadow-lg border-l-4 flex items-center space-x-3 ${
                        messageType === 'success' 
                            ? 'bg-green-50 border-green-500 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                            : 'bg-red-50 border-red-500 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            messageType === 'success' 
                                ? 'bg-green-500' 
                                : 'bg-red-500'
                        }`}>
                            {messageType === 'success' ? (
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <p className="font-semibold">
                                {messageType === 'success' ? 'Succès' : 'Erreur'}
                            </p>
                            <p className="text-sm">{message}</p>
                        </div>
                        <button 
                            onClick={() => setShowMessage(false)}
                            className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
        </>
    );
}

