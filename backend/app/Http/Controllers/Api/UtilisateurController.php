<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Formateur;
use App\Mail\UserActivated;
use App\Mail\UserDeactivated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class UtilisateurController extends Controller
{
    /**
     * Liste des utilisateurs (Admin uniquement)
     */
    public function index(Request $request)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        $query = User::with('formateur');

        // Gestionaires ne peuvent pas voir les admins et gestionaires
        if ($request->user()->isGestionaire()) {
            $query->whereNotIn('role', ['admin', 'gestionaire']);
        }

        // Filtres
        if ($request->has('role')) {
            // Gestionaires ne peuvent pas filtrer par admin ou gestionaire
            if ($request->user()->isGestionaire() && in_array($request->role, ['admin', 'gestionaire'])) {
                return response()->json([
                    'message' => 'Accès non autorisé. Vous ne pouvez pas voir les administrateurs et gestionaires.',
                ], 403);
            }
            $query->where('role', $request->role);
        }

        if ($request->has('status')) {
            $query->where('statut', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nom', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('telephone', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($users);
    }

    /**
     * Afficher un utilisateur spécifique
     */
    public function show(Request $request, $id)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        $user = User::with(['formateur', 'candidatures.formation', 'historiqueFormations'])
            ->findOrFail($id);

        // Seul l'admin peut voir les détails des gestionaires et admins
        if (in_array($user->role, ['gestionaire', 'admin']) && !$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé. Seuls les administrateurs peuvent voir les détails des gestionaires et administrateurs.',
            ], 403);
        }

        return response()->json($user);
    }

    /**
     * Changer le statut d'un utilisateur
     */
    public function updateStatus(Request $request, $id)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:actif,inactif,en_attente',
            'note' => 'nullable|string',
        ]);

        $user = User::findOrFail($id);

        // Ne pas permettre de modifier son propre statut
        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'Vous ne pouvez pas modifier votre propre statut.',
            ], 400);
        }

        // Seul l'admin peut modifier le statut des gestionaires et admins
        if (in_array($user->role, ['gestionaire', 'admin']) && !$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé. Seuls les administrateurs peuvent modifier le statut des gestionaires et administrateurs.',
            ], 403);
        }

        $oldStatus = $user->statut;
        $user->update(['statut' => $validated['status']]);

        // Envoyer l'email après la réponse pour éviter les blocages SMTP.
        if ($user->email && $validated['status'] === 'actif' && $oldStatus !== 'actif') {
            $targetEmail = $user->email;
            app()->terminating(function () use ($targetEmail, $user) {
                try {
                    Mail::to($targetEmail)->send(new UserActivated($user));
                } catch (\Throwable $e) {
                    \Log::error('Failed to send user activated email', [
                        'email' => $targetEmail,
                        'error' => $e->getMessage(),
                        'exception' => get_class($e),
                    ]);
                }
            });
        } elseif ($user->email && $validated['status'] === 'inactif' && $oldStatus !== 'inactif') {
            $targetEmail = $user->email;
            app()->terminating(function () use ($targetEmail, $user) {
                try {
                    Mail::to($targetEmail)->send(new UserDeactivated($user));
                } catch (\Throwable $e) {
                    \Log::error('Failed to send user deactivated email', [
                        'email' => $targetEmail,
                        'error' => $e->getMessage(),
                        'exception' => get_class($e),
                    ]);
                }
            });
        }

        return response()->json([
            'message' => 'Statut de l\'utilisateur mis à jour avec succès!',
            'user' => $user,
        ]);
    }

    /**
     * Supprimer un utilisateur (Soft delete)
     * Pour les formateurs : supprime uniquement le compte User et garde le profil Trainer
     */
    public function destroy(Request $request, $id)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        $user = User::findOrFail($id);

        // Seul l'admin peut supprimer les gestionaires et admins
        if (in_array($user->role, ['gestionaire', 'admin']) && !$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé. Seuls les administrateurs peuvent supprimer les gestionaires et administrateurs.',
            ], 403);
        }

        // Ne pas permettre de supprimer son propre compte
        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'Vous ne pouvez pas supprimer votre propre compte.',
            ], 400);
        }

        // Si c'est un formateur, garder le profil Formateur et juste délier le compte Utilisateur
        if ($user->role === 'formateur' && $user->formateur) {
            // Mettre utilisateur_id à null dans le Formateur pour qu'il redevienne un formateur sans compte
            $user->formateur->update(['utilisateur_id' => null]);
        }

        // Supprimer uniquement le compte Utilisateur
        $user->delete();

        return response()->json([
            'message' => 'Compte utilisateur supprimé avec succès! Le profil formateur a été conservé.',
        ]);
    }

    /**
     * Créer un formateur (Admin et Gestionaire) - Crée seulement le profil Formateur, pas de compte Utilisateur
     */
    public function store(Request $request)
    {
        // Gestionaires peuvent créer des formateurs
        if (!$request->user()->isGestionaire()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:20',
            // Champs du profil Formateur
            'formateur_id' => 'required|string|max:255|unique:formateurs,id_formateur',
            'grade_id' => 'required|exists:grades,id',
            'specialite_id' => 'required|exists:specialites,id',
            'institution' => 'required|string|max:255',
            'diploma' => 'required|string|max:255',
            'city' => 'required|string|max:255',
            'pedagogical_training_status' => 'nullable|string|in:en_attente,en_cours,termine',
        ], [
            'name.required' => 'Le nom est requis.',
            'name.string' => 'Le nom doit être une chaîne de caractères.',
            'name.max' => 'Le nom ne peut pas dépasser 20 caractères.',
            'formateur_id.required' => 'L\'identifiant formateur est requis.',
            'formateur_id.string' => 'L\'identifiant formateur doit être une chaîne de caractères.',
            'formateur_id.max' => 'L\'identifiant formateur ne peut pas dépasser 255 caractères.',
            'formateur_id.unique' => 'Cet identifiant formateur est déjà utilisé.',
            'grade_id.required' => 'Le grade est requis.',
            'grade_id.exists' => 'Le grade sélectionné n\'est pas valide.',
            'specialite_id.required' => 'La spécialité est requise.',
            'specialite_id.exists' => 'La spécialité sélectionnée n\'est pas valide.',
            'institution.required' => 'L\'institution est requise.',
            'institution.string' => 'L\'institution doit être une chaîne de caractères.',
            'institution.max' => 'L\'institution ne peut pas dépasser 255 caractères.',
            'diploma.required' => 'Le diplôme est requis.',
            'diploma.string' => 'Le diplôme doit être une chaîne de caractères.',
            'diploma.max' => 'Le diplôme ne peut pas dépasser 255 caractères.',
            'city.required' => 'La ville est requise.',
            'city.string' => 'La ville doit être une chaîne de caractères.',
            'city.max' => 'La ville ne peut pas dépasser 255 caractères.',
            'pedagogical_training_status.in' => 'Le statut de formation pédagogique sélectionné n\'est pas valide.',
        ]);
        
        // Déterminer le statut de formation pédagogique
        // Utiliser le statut fourni ou 'en_attente' par défaut
            $pedagogicalStatus = $validated['pedagogical_training_status'] ?? 'en_attente';
        
        // Créer uniquement le profil Formateur (sans compte Utilisateur)
        $trainer = Formateur::create([
            'utilisateur_id' => null, // Sera défini lorsque le formateur s'inscrit
            'id_formateur' => $validated['formateur_id'],
            'nom' => $validated['name'],
            'grade_id' => $validated['grade_id'],
            'specialite_id' => $validated['specialite_id'],
            'institution' => $validated['institution'] ?? null,
            'diplome' => $validated['diploma'] ?? null,
            'ville' => $validated['city'] ?? null,
            'statut_form_ped' => $pedagogicalStatus,
            'date_insc' => now()->format('Y-m-d'), // Définir la date d'inscription
        ]);

        return response()->json([
            'message' => 'Formateur créé avec succès! Le formateur devra s\'inscrire avec son ID: ' . $validated['formateur_id'],
            'formateur' => $trainer,
            'formateur_id' => $validated['formateur_id'],
        ], 201);
    }

    /**
     * Mettre à jour un utilisateur
     */
    public function update(Request $request, $id)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        $user = User::findOrFail($id);

        // Seul l'admin peut modifier les gestionaires et admins
        if (in_array($user->role, ['gestionaire', 'admin']) && !$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé. Seuls les administrateurs peuvent modifier les gestionaires et administrateurs.',
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $id,
            'phone' => 'sometimes|required|string|regex:/^[0-9]{10}$/|unique:users,telephone,' . $id,
            'role' => 'sometimes|in:admin,formateur,gestionaire',
            'status' => 'sometimes|in:actif,inactif,en_attente',
            'specialite_id' => 'sometimes|nullable|exists:specialites,id',
        ], [
            'phone.unique' => 'Ce numéro de téléphone est déjà utilisé.',
            'phone.required' => 'Le numéro de téléphone est requis.',
            'phone.regex' => 'Le numéro de téléphone doit contenir exactement 10 chiffres.',
            'email.unique' => 'Cet email est déjà utilisé.',
        ]);

        // Seul l'admin peut changer le rôle vers gestionaire ou admin
        if (isset($validated['role']) && in_array($validated['role'], ['gestionaire', 'admin']) && !$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé. Seuls les administrateurs peuvent créer ou modifier des gestionaires et administrateurs.',
            ], 403);
        }

        // Update user basic info
        $updateData = [];
        if (isset($validated['name'])) $updateData['nom'] = $validated['name'];
        if (isset($validated['email'])) $updateData['email'] = $validated['email'];
        if (isset($validated['phone'])) $updateData['telephone'] = $validated['phone'];
        if (isset($validated['role'])) $updateData['role'] = $validated['role'];
        if (isset($validated['status'])) $updateData['statut'] = $validated['status'];
        $user->update($updateData);

        // Update trainer specialization if provided and user is a formateur
        if (isset($validated['specialite_id']) && $user->isFormateur()) {
            if ($user->formateur) {
                $user->formateur->update(['specialite_id' => $validated['specialite_id']]);
            } else {
                // Create trainer record if it doesn't exist
                $user->formateur()->create(['specialite_id' => $validated['specialite_id']]);
            }
        }

        // Reload user with trainer relationship
        $user->load('formateur');

        return response()->json([
            'message' => 'Utilisateur mis à jour avec succès!',
            'user' => $user,
        ]);
    }

    /**
     * Réinitialiser le mot de passe d'un utilisateur
     */
    public function resetPassword(Request $request, $id)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        $validated = $request->validate([
            'password' => 'required|string|min:8',
        ]);

        $user = User::findOrFail($id);

        // Seul l'admin peut réinitialiser le mot de passe des gestionaires et admins
        if (in_array($user->role, ['gestionaire', 'admin']) && !$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé. Seuls les administrateurs peuvent réinitialiser le mot de passe des gestionaires et administrateurs.',
            ], 403);
        }

        $user->update([
            'mdp' => Hash::make($validated['password']),
        ]);

        return response()->json([
            'message' => 'Mot de passe réinitialisé avec succès!',
        ]);
    }

    /**
     * Statistiques des utilisateurs (Admin)
     */
    public function statistics(Request $request)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        // Get year parameter, default to current year
        $year = $request->query('year', date('Y'));

        // Build query with year filter
        $userQuery = User::whereYear('created_at', $year);

        // Gestionaires ne peuvent pas voir les stats des admins et gestionaires
        if ($request->user()->isGestionaire()) {
            $userQuery->whereNotIn('role', ['admin', 'gestionaire']);
        }

        $stats = [
            'total_users' => (clone $userQuery)->count(),
            'total_formateurs' => (clone $userQuery)->where('role', 'formateur')->count(),
            'pending_users' => (clone $userQuery)->where('statut', 'en_attente')->count(),
            'active_users' => (clone $userQuery)->where('statut', 'actif')->count(),
            'inactive_users' => (clone $userQuery)->where('statut', 'inactif')->count(),
        ];

        // Seul l'admin peut voir les statistiques des admins et gestionaires
        if ($request->user()->isAdmin()) {
            $adminQuery = User::whereYear('created_at', $year);
            $stats['total_admin'] = (clone $adminQuery)->where('role', 'admin')->count();
            $stats['total_gestionaires'] = (clone $adminQuery)->where('role', 'gestionaire')->count();
        }

        return response()->json($stats);
    }
}

