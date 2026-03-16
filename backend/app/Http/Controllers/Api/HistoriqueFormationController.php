<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HistoriqueFormation;
use Illuminate\Http\Request;

class HistoriqueFormationController extends Controller
{
    /**
     * Obtenir l'historique des formations pour l'utilisateur authentifié
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        $query = HistoriqueFormation::where('utilisateur_id', $user->id)
            ->orderBy('created_at', 'desc');

        // Filter by action type if provided
        if ($request->has('action') && $request->action !== 'all') {
            $query->where('action', $request->action);
        }

        // Filter by date range if provided
        if ($request->has('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->where('created_at', '<=', $request->date_to);
        }

        // Search in description and training title
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('titre_form', 'like', "%{$search}%");
            });
        }

        $history = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $history
        ]);
    }

    /**
     * Supprimer un enregistrement d'historique
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        
        $history = HistoriqueFormation::where('id', $id)
            ->where('utilisateur_id', $user->id)
            ->first();

        if (!$history) {
            return response()->json([
                'success' => false,
                'message' => 'Historique non trouvé'
            ], 404);
        }

        $history->delete();

        return response()->json([
            'success' => true,
            'message' => 'Historique supprimé avec succès'
        ]);
    }

    /**
     * Supprimer plusieurs enregistrements d'historique
     */
    public function destroyMultiple(Request $request)
    {
        $user = $request->user();
        
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:historique_formations,id'
        ]);

        $deletedCount = HistoriqueFormation::where('utilisateur_id', $user->id)
            ->whereIn('id', $request->ids)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => "{$deletedCount} éléments supprimés avec succès"
        ]);
    }
}

