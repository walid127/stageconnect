<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Grade;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class GradeController extends Controller
{
    /**
     * Liste de tous les grades (actifs et inactifs pour gestion)
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $grades = Grade::orderBy('nom')->get();

            return response()->json([
                'success' => true,
                'data' => $grades,
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Erreur lors de la récupération des grades: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des grades.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Créer un nouveau grade
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'nom' => 'required|string|max:255',
                'description' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erreur de validation.',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $grade = Grade::create($validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Grade créé avec succès.',
                'data' => $grade,
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Erreur lors de la création du grade: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création du grade.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mettre à jour un grade
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $grade = Grade::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'nom' => 'required|string|max:255',
                'description' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erreur de validation.',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $grade->update($validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Grade mis à jour avec succès.',
                'data' => $grade,
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Grade non trouvé.',
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Erreur lors de la mise à jour du grade: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour du grade.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Supprimer un grade
     */
    public function destroy($id): JsonResponse
    {
        try {
            $grade = Grade::findOrFail($id);

            // Vérifier si le grade est utilisé par des formateurs
            if ($grade->formateurs()->count() > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce grade ne peut pas être supprimé car il est utilisé par des formateurs.',
                ], 400);
            }

            $grade->delete();

            return response()->json([
                'success' => true,
                'message' => 'Grade supprimé avec succès.',
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Grade non trouvé.',
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Erreur lors de la suppression du grade: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression du grade.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Afficher un grade spécifique
     */
    public function show($id): JsonResponse
    {
        try {
            $grade = Grade::findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $grade,
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Grade non trouvé.',
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Erreur lors de la récupération du grade: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du grade.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

