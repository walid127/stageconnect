<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class GestionaireController extends Controller
{
    /**
     * Liste des gestionaires (Admin uniquement)
     */
    public function index(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé. Seuls les administrateurs peuvent gérer les gestionaires.',
            ], 403);
        }

        $gestionaires = User::where('role', 'gestionaire')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($gestionaires);
    }

    /**
     * Créer un gestionaire (Admin uniquement)
     */
    public function store(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé. Seuls les administrateurs peuvent créer des gestionaires.',
            ], 403);
        }

        $validated = $request->validate([
            'nom' => 'required|string|max:20',
            'email' => 'required|string|email|max:255|unique:users,email',
            'telephone' => 'required|string|regex:/^[0-9]{10}$/|unique:users,telephone',
            'mdp' => ['required', 'string', 'min:8'],
            'statut' => 'sometimes|in:actif,inactif,en_attente',
        ], [
            'mdp.required' => 'Le mot de passe est requis.',
            'mdp.string' => 'Le mot de passe doit être une chaîne de caractères.',
            'mdp.min' => 'Le mot de passe doit contenir au moins 8 caractères.',
            'telephone.required' => 'Le numéro de téléphone est requis.',
            'telephone.unique' => 'Ce numéro de téléphone est déjà utilisé.',
            'telephone.regex' => 'Le numéro de téléphone doit contenir exactement 10 chiffres.',
            'email.unique' => 'Cet email est déjà utilisé.',
        ]);

        $gestionaire = User::create([
            'nom' => $validated['nom'],
            'email' => $validated['email'],
            'telephone' => $validated['telephone'] ?? null,
            'mdp' => Hash::make($validated['mdp']),
            'role' => 'gestionaire',
            'statut' => $validated['statut'] ?? 'actif',
        ]);

        return response()->json([
            'message' => 'Gestionaire créé avec succès!',
            'gestionaire' => $gestionaire,
        ], 201);
    }

    /**
     * Afficher un gestionaire (Admin uniquement)
     */
    public function show(Request $request, $id)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        $gestionaire = User::where('role', 'gestionaire')->findOrFail($id);

        return response()->json($gestionaire);
    }

    /**
     * Mettre à jour un gestionaire (Admin uniquement)
     */
    public function update(Request $request, $id)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé. Seuls les administrateurs peuvent modifier les gestionaires.',
            ], 403);
        }

        $gestionaire = User::where('role', 'gestionaire')->findOrFail($id);

        $validated = $request->validate([
            'nom' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $id,
            // Téléphone optionnel et plus tolérant (la mise en forme est gérée côté frontend)
            'telephone' => 'sometimes|nullable|string|max:20|unique:users,telephone,' . $id,
            'mdp' => 'sometimes|nullable|string|min:8',
            'statut' => 'sometimes|in:actif,inactif,en_attente',
        ], [
            'telephone.unique' => 'Ce numéro de téléphone est déjà utilisé.',
            'email.unique' => 'Cet email est déjà utilisé.',
        ]);
        
        // Filtrer les valeurs vides pour mdp
        if (isset($validated['mdp']) && (empty($validated['mdp']) || trim($validated['mdp']) === '')) {
            unset($validated['mdp']);
        }

        $updateData = [];
        if (isset($validated['nom'])) {
            $updateData['nom'] = $validated['nom'];
        }
        if (isset($validated['email'])) {
            $updateData['email'] = $validated['email'];
        }
        if (isset($validated['telephone']) && $validated['telephone'] !== null && trim($validated['telephone']) !== '') {
            $updateData['telephone'] = $validated['telephone'];
        }
        if (isset($validated['mdp'])) {
            $updateData['mdp'] = Hash::make($validated['mdp']);
        }
        if (isset($validated['statut'])) {
            $updateData['statut'] = $validated['statut'];
        }

        $gestionaire->update($updateData);

        return response()->json([
            'message' => 'Gestionaire mis à jour avec succès!',
            'gestionaire' => $gestionaire->fresh(),
        ]);
    }

    /**
     * Supprimer un gestionaire (Admin uniquement)
     */
    public function destroy(Request $request, $id)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé. Seuls les administrateurs peuvent supprimer les gestionaires.',
            ], 403);
        }

        $gestionaire = User::where('role', 'gestionaire')->findOrFail($id);

        // Ne pas permettre de supprimer son propre compte
        if ($gestionaire->id === $request->user()->id) {
            return response()->json([
                'message' => 'Vous ne pouvez pas supprimer votre propre compte.',
            ], 400);
        }

        $gestionaire->delete();

        return response()->json([
            'message' => 'Gestionaire supprimé avec succès!',
        ]);
    }
}
