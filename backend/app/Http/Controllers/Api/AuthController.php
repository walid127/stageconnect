<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetLink;
use App\Models\User;
use App\Models\Formateur;
use App\Models\HistoriqueFormation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    /**
     * Inscription d'un nouveau formateur avec validation de formateur_id
     */
    public function register(Request $request)
    {
        // Journaliser la requête entrante pour le débogage
        \Log::info('Requête d\'inscription reçue', [
            'data' => [
                'formateur_id' => $request->input('formateur_id'),
                'email' => $request->input('email'),
                'has_password' => $request->has('password'),
                'has_password_confirmation' => $request->has('password_confirmation'),
                'phone' => $request->input('phone'),
            ]
        ]);

        $rules = [
            'formateur_id' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'required|string|regex:/^[0-9]{10}$/|unique:users,telephone',
        ];

        try {
            $validated = $request->validate($rules, [
            'formateur_id.required' => 'L\'ID formateur est requis.',
            'email.required' => 'L\'email est requis.',
            'email.email' => 'L\'email doit être une adresse email valide.',
            'email.unique' => 'Cet email est déjà utilisé.',
            'password.required' => 'Le mot de passe est requis.',
            'password.min' => 'Le mot de passe doit contenir au moins 8 caractères.',
            'password.confirmed' => 'Les mots de passe ne correspondent pas.',
            'phone.required' => 'Le numéro de téléphone est requis.',
            'phone.unique' => 'Ce numéro de téléphone est déjà utilisé.',
            'phone.regex' => 'Le numéro de téléphone doit contenir exactement 10 chiffres (ex: 0672587841).',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Journaliser les erreurs de validation pour le débogage
            \Log::error('Échec de la validation d\'inscription', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            
            // Retourner les erreurs de validation dans un format convivial
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors(),
            ], 422);
        }

        // Vérifier que le formateur_id existe et n'a pas déjà été utilisé
        $trainer = Formateur::where('id_formateur', $validated['formateur_id'])
            ->whereNull('utilisateur_id') // Ne doit pas encore avoir de compte utilisateur
            ->first();

        if (!$trainer) {
            return response()->json([
                'message' => 'ID formateur invalide ou déjà utilisé. Veuillez contacter l\'administrateur.',
                'errors' => [
                    'formateur_id' => ['ID formateur invalide ou déjà utilisé.']
                ]
            ], 400);
        }

        // Nettoyer le numéro de téléphone (garder uniquement les chiffres)
        $phone = preg_replace('/[^0-9]/', '', $validated['phone']);

        // Créer l'utilisateur avec le nom du profil formateur
        $user = User::create([
            'nom' => $trainer->nom, // Utiliser le nom du profil formateur
            'email' => $validated['email'],
            'mdp' => Hash::make($validated['password']),
            'telephone' => $phone,
            'role' => 'formateur',
            'statut' => 'en_attente', // En attente de validation admin
        ]);

        // Lier le profil formateur existant au compte utilisateur
        $trainer->update([
            'utilisateur_id' => $user->id,
        ]);

        // Recharger le formateur avec les relations
        $trainer->refresh();

        return response()->json([
            'message' => 'Inscription réussie! Votre compte est en attente de validation par un administrateur.',
            'user' => [
                'id' => $user->id,
                'name' => $user->nom,
                'email' => $user->email,
                'role' => $user->role,
                'statut' => $user->statut,
            ],
            'formateur' => $trainer,
        ], 201);
    }

    /**
     * Connexion utilisateur
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->mdp)) {
            throw ValidationException::withMessages([
                'email' => ['Les identifiants fournis sont incorrects.'],
            ]);
        }

        // Vérifier si le compte est validé
        if ($user->statut === 'en_attente') {
            return response()->json([
                'message' => 'Votre compte est en attente de validation par un administrateur.',
            ], 403);
        }

        if ($user->statut === 'inactif') {
            return response()->json([
                'message' => 'Votre compte a été désactivé. Contactez un administrateur.',
            ], 403);
        }

        // Supprimer les anciens jetons
        $user->tokens()->delete();

        // Créer un nouveau jeton
        $token = $user->createToken('jeton-authentification')->plainTextToken;

        // Recharger l'utilisateur avec les relations
        if ($user->isFormateur()) {
            $user->load('formateur.specialite', 'formateur.grade');
        } else {
            $user->load('formateur');
        }
        
        return response()->json([
            'message' => 'Connexion réussie!',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Déconnexion utilisateur
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Déconnexion réussie!',
        ]);
    }

    /**
     * Obtenir l'utilisateur authentifié
     */
    public function me(Request $request)
    {
        $user = $request->user();
        
        // Charger les relations nécessaires
        if ($user->isFormateur()) {
            $user->load('formateur.specialite', 'formateur.grade');
        }

        return response()->json([
            'user' => $user,
        ]);
    }

    /**
     * Mettre à jour le profil
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:20',
            'email' => [
                'sometimes',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'phone' => [
                'sometimes',
                'required',
                'string',
                'regex:/^[0-9]{10}$/',
                Rule::unique('users', 'telephone')->ignore($user->id),
            ],
            'institution' => 'sometimes|nullable|string|max:255',
            'diploma' => 'sometimes|nullable|string|max:255',
            'city' => 'sometimes|nullable|string|max:255',
        ], [
            'phone.unique' => 'Ce numéro de téléphone est déjà utilisé.',
            'phone.required' => 'Le numéro de téléphone est requis.',
            'phone.regex' => 'Le numéro de téléphone doit contenir exactement 10 chiffres.',
            'email.unique' => 'Cet email est déjà utilisé.',
        ]);

        // Mettre à jour user
        if (isset($validated['name'])) {
            $user->nom = $validated['name'];
        }
        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }
        if (isset($validated['phone'])) {
            $user->telephone = $validated['phone'];
        }
        $user->save();

        // Mettre à jour profil formateur si formateur
        // Note: Les formateurs ne peuvent pas modifier leur spécialité - seul le gestionaire peut le faire
        if ($user->isFormateur() && $user->formateur) {
            $trainerData = [];
            
            // Gérer les autres champs (sans specialite_id)
            $champsFormateur = [
                'institution' => 'institution',
                'diplome' => 'diploma',
                'ville' => 'city',
            ];
            
            foreach ($champsFormateur as $champDb => $champRequest) {
                if (isset($validated[$champRequest])) {
                    $trainerData[$champDb] = $validated[$champRequest];
                }
            }

            if (!empty($trainerData)) {
                $user->formateur->update($trainerData);
            }
        }

        // Recharger l'utilisateur avec toutes les relations
        $user->refresh();
        if ($user->isFormateur()) {
            $user->load('formateur.specialite', 'formateur.grade');
        } else {
            $user->load('formateur');
        }

        // Créer un enregistrement dans l'historique
        HistoriqueFormation::create([
            'utilisateur_id' => $user->id,
            'formateur_id' => $user->id,
            'formation_id' => null,
            'action' => 'profile_updated',
            'description' => 'Profil mis à jour',
            'titre_form' => null,
            'date_comp' => null,
        ]);

        return response()->json([
            'message' => 'Profil mis à jour avec succès!',
            'user' => $user,
        ]);
    }

    /**
     * Changer le mot de passe
     */
    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => 'required',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->mdp)) {
            throw ValidationException::withMessages([
                'current_password' => ['Le mot de passe actuel est incorrect.'],
            ]);
        }

        $user->update([
            'mdp' => Hash::make($validated['password']),
        ]);

        return response()->json([
            'message' => 'Mot de passe modifié avec succès!',
        ]);
    }

    /**
     * Demande de réinitialisation du mot de passe (envoi du lien par email)
     */
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ], [
            'email.required' => 'L\'adresse email est requise.',
            'email.email' => 'L\'adresse email doit être valide.',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // Ne pas révéler si l'email existe ou non (sécurité)
            return response()->json([
                'message' => 'Si cette adresse est enregistrée, vous recevrez un email avec le lien de réinitialisation.',
            ], 200);
        }

        $token = Str::random(64);
        $email = $request->email;

        try {
            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $email],
                ['token' => Hash::make($token), 'created_at' => now()]
            );
        } catch (\Throwable $e) {
            \Log::error('Forgot password token persistence failed', [
                'email' => $email,
                'error' => $e->getMessage(),
                'exception' => get_class($e),
            ]);
        }

        // Respond quickly to the client, then attempt email sending during terminate phase.
        app()->terminating(function () use ($email, $token) {
            try {
                Mail::to($email)->send(new PasswordResetLink($token, $email));
            } catch (\Throwable $e) {
                \Log::error('Forgot password mail send failed', [
                    'email' => $email,
                    'error' => $e->getMessage(),
                    'exception' => get_class($e),
                ]);
            }
        });

        return response()->json([
            'message' => 'Si cette adresse est enregistrée, vous recevrez un email avec le lien de réinitialisation.',
        ], 200);
    }

    /**
     * Réinitialiser le mot de passe avec le token reçu par email
     */
    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ], [
            'email.required' => 'L\'adresse email est requise.',
            'token.required' => 'Le lien de réinitialisation est invalide ou expiré.',
            'password.required' => 'Le mot de passe est requis.',
            'password.min' => 'Le mot de passe doit contenir au moins 8 caractères.',
            'password.confirmed' => 'Les mots de passe ne correspondent pas.',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $validated['email'])
            ->first();

        if (!$record || !Hash::check($validated['token'], $record->token)) {
            return response()->json([
                'message' => 'Lien invalide ou expiré. Veuillez demander un nouveau lien.',
            ], 400);
        }

        // Lien valide 60 minutes
        $createdAt = \Carbon\Carbon::parse($record->created_at);
        if ($createdAt->diffInMinutes(now()) > 60) {
            DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();
            return response()->json([
                'message' => 'Ce lien a expiré. Veuillez demander un nouveau lien.',
            ], 400);
        }

        $user = User::where('email', $validated['email'])->first();
        if (!$user) {
            return response()->json([
                'message' => 'Utilisateur introuvable.',
            ], 404);
        }

        $user->update(['mdp' => Hash::make($validated['password'])]);
        DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();

        return response()->json([
            'message' => 'Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.',
        ], 200);
    }
}
