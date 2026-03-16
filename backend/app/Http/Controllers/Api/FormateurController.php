<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Formateur;
use Illuminate\Http\Request;

class FormateurController extends Controller
{ 
    public function validateFormateurId(Request $request, $formateur_id)
    { 
        $formateur_id = urldecode($formateur_id);
        
        $trainer = Formateur::with('specialite')
            ->where('id_formateur', $formateur_id)
            ->whereNull('utilisateur_id') 
            ->first();

        if (!$trainer) {
            return response()->json([
                'valid' => false,
                'message' => 'ID formateur invalide ou déjà utilisé.',
            ], 404);
        }
        return response()->json([
            'valid' => true,
            'formateur' => [
                'id_formateur' => $trainer->id_formateur,
                'nom' => $trainer->nom,
                'email' => null,
                'telephone' => null,
                'specialite' => $trainer->specialite ? $trainer->specialite->nom : null,
                'institution' => $trainer->institution,
                'diplome' => $trainer->diplome,
                'ville' => $trainer->ville,
                'grade' => $trainer->grade ? $trainer->grade->nom : null,
                'grade_id' => $trainer->grade_id,
            ],
        ]);
    }

    /**
     * Liste de tous les formateurs (Admin et Gestionaire)
     * Exclut les formateurs dont l'utilisateur associé a le rôle 'admin' ou 'gestionaire'
     */
    public function index(Request $request)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        $query = Formateur::with(['utilisateur', 'specialite', 'grade']);

        // Exclure les formateurs dont l'utilisateur associé a le rôle 'admin' ou 'gestionaire'
        $query->where(function($q) {
            $q->whereNull('utilisateur_id') // Formateurs sans compte utilisateur
              ->orWhereHas('utilisateur', function($userQuery) {
                  // Formateurs avec compte utilisateur qui n'est PAS admin ou gestionaire
                  $userQuery->whereNotIn('role', ['admin', 'gestionaire'])
                            ->orWhereNull('role'); // Au cas où role serait null
              });
        });

        // Filtres
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('id_formateur', 'like', "%{$search}%")
                  ->orWhere('nom', 'like', "%{$search}%")
                  ->orWhereHas('specialite', function($specQuery) use ($search) {
                      $specQuery->where('nom', 'like', "%{$search}%");
                  })
                  ->orWhere('ville', 'like', "%{$search}%")
                  ->orWhere('institution', 'like', "%{$search}%")
                  ->orWhereHas('utilisateur', function($userQuery) use ($search) {
                      $userQuery->where('email', 'like', "%{$search}%")
                                ->orWhere('telephone', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->has('specialization')) {
            $query->whereHas('specialite', function($specQuery) use ($request) {
                $specQuery->where('nom', $request->specialization);
            });
        }

        // Filter by account status (has_account = true/false)
        if ($request->has('has_account')) {
            $hasAccount = filter_var($request->has_account, FILTER_VALIDATE_BOOLEAN);
            if ($hasAccount) {
                $query->whereNotNull('utilisateur_id')
                      ->whereHas('utilisateur', function($userQuery) {
                          $userQuery->where('role', '!=', 'admin');
                      });
            } else {
                $query->whereNull('utilisateur_id');
            }
        }

        $trainers = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($trainers);
    }

    /**
     * Afficher un formateur spécifique
     */
    public function show(Request $request, $id)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        $trainer = Formateur::with(['utilisateur', 'specialite', 'grade'])->findOrFail($id);
        return response()->json($trainer);
    }

    /**
     * Mettre à jour un formateur (Admin et Gestionaire)
     */
    public function update(Request $request, $id)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        $trainer = Formateur::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:20',
            'formateur_id' => 'sometimes|string|max:255|unique:formateurs,id_formateur,' . $id,
            'grade_id' => 'nullable|exists:grades,id',
            'specialite_id' => 'nullable|exists:specialites,id',
            'institution' => 'nullable|string|max:255',
            'diploma' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'pedagogical_training_status' => 'nullable|string|in:en_attente,en_cours,termine',
        ]);

        // Déterminer le statut de formation pédagogique en fonction du grade
        $pedagogicalStatus = $trainer->statut_form_ped; // Keep existing if not provided
        
        if (isset($validated['pedagogical_training_status'])) {
            $pedagogicalStatus = $validated['pedagogical_training_status'];
        } elseif (isset($validated['pedagogical_training_status'])) {
            $pedagogicalStatus = $validated['pedagogical_training_status'];
        }

        $updateData = [];
        if (isset($validated['name'])) {
            $updateData['nom'] = $validated['name'];
        }
        if (isset($validated['formateur_id'])) {
            $updateData['id_formateur'] = $validated['formateur_id'];
        }
        if (isset($validated['grade_id'])) {
            $updateData['grade_id'] = $validated['grade_id'];
            $updateData['statut_form_ped'] = $pedagogicalStatus;
        }
        if (isset($validated['specialite_id'])) {
            $updateData['specialite_id'] = $validated['specialite_id'];
        }
        if (isset($validated['institution'])) {
            $updateData['institution'] = $validated['institution'];
        }
        if (isset($validated['diploma'])) {
            $updateData['diplome'] = $validated['diploma'];
        }
        if (isset($validated['city'])) {
            $updateData['ville'] = $validated['city'];
        }
        if (isset($validated['pedagogical_training_status']) && !isset($validated['grade_id'])) {
            $updateData['statut_form_ped'] = $pedagogicalStatus;
        }

        $trainer->update($updateData);

        return response()->json([
            'message' => 'Formateur mis à jour avec succès!',
            'formateur' => $trainer->fresh(),
        ]);
    }

    /**
     * Supprimer un formateur (Admin et Gestionaire)
     */
    public function destroy(Request $request, $id)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        $trainer = Formateur::findOrFail($id);
        
        // Si le formateur a un compte utilisateur, supprimer aussi le compte utilisateur
        if ($trainer->utilisateur_id) {
            $user = \App\Models\User::find($trainer->utilisateur_id);
            if ($user) {
                // Ne pas permettre de supprimer son propre compte
                if ($user->id === $request->user()->id) {
                    return response()->json([
                        'message' => 'Vous ne pouvez pas supprimer votre propre compte via la suppression du formateur.',
                    ], 400);
                }
                
                // Supprimer le compte utilisateur
                $user->delete();
            }
        }
        
        // Supprimer le formateur
        $trainer->delete();

        return response()->json([
            'message' => 'Formateur et compte utilisateur associé supprimés avec succès!',
        ]);
    }
}


