<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Specialiste;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class SpecialisteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Specialiste::query();


        // Active status filter removed - all specialists are shown

        // Search by name
        if ($request->has('search') && $request->search) {
            $query->where('nom', 'like', '%' . $request->search . '%');
        }

        $specialists = $query->orderBy('nom')->get();

        return response()->json([
            'success' => true,
            'data' => $specialists
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255|unique:specialites,nom',
                'description' => 'nullable|string',
                'is_active' => 'nullable|boolean'
            ]);

            $specialist = Specialiste::create([
                'nom' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Spécialité créée avec succès',
                'data' => $specialist
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de la spécialité'
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $specialist = Specialiste::findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $specialist
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Spécialité non trouvée'
            ], 404);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $specialist = Specialiste::findOrFail($id);

            $validated = $request->validate([
                'name' => 'required|string|max:255|unique:specialites,nom,' . $id,
                'description' => 'nullable|string',
                'is_active' => 'nullable|boolean'
            ]);

            $specialist->update([
                'nom' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Spécialité mise à jour avec succès',
                'data' => $specialist
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de la spécialité'
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $specialist = Specialiste::findOrFail($id);
            
            // Vérifier si la spécialité est utilisée par des formateurs
            $formateursCount = $specialist->formateurs()->count();
            if ($formateursCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Impossible de supprimer cette spécialité car elle est utilisée par {$formateursCount} formateur(s). Veuillez d'abord modifier ou supprimer les formateurs associés."
                ], 422);
            }
            
            // Vérifier si la spécialité est utilisée par des formations
            $formationsCount = $specialist->formations()->count();
            if ($formationsCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Impossible de supprimer cette spécialité car elle est utilisée par {$formationsCount} formation(s). Veuillez d'abord modifier ou supprimer les formations associées."
                ], 422);
            }
            
            $specialist->delete();

            return response()->json([
                'success' => true,
                'message' => 'Spécialité supprimée avec succès'
            ]);

        } catch (\Illuminate\Database\QueryException $e) {
            // Erreur de contrainte de clé étrangère
            if ($e->getCode() == 23000) {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible de supprimer cette spécialité car elle est utilisée par des formateurs ou des formations.'
                ], 422);
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de la spécialité: ' . $e->getMessage()
            ], 500);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de la spécialité: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get categories (alias for index)
     */
    public function categories(): JsonResponse
    {
        return $this->index(request());
    }
}

