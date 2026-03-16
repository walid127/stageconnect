<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Diplome;
use App\Models\Formation;
use App\Models\FormationPedagogique;
use App\Models\FormationPromotion;
use App\Models\User;
use App\Models\Candidature;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DiplomeController extends Controller
{
    /**
     * Lister tous les diplômes (Admin uniquement)
     */
    public function index(Request $request)
    {
        try {
            if (!$request->user()->isGestionaire()) {
                return response()->json(['message' => 'Non autorisé'], 403);
            }

            // Charger les relations
            $query = Diplome::with(['formation', 'formateur', 'delivrant']);

            // Filtres
            if ($request->has('formation_id')) {
                $query->where('formation_id', $request->formation_id);
            }

            if ($request->has('formateur_id')) {
                $query->where('formateur_id', $request->formateur_id);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('num_diplome', 'like', "%{$search}%")
                      ->orWhereHas('formation', function($q) use ($search) {
                          $q->where('titre', 'like', "%{$search}%");
                      })
                      ->orWhereHas('formateur', function($q) use ($search) {
                          $q->where('nom', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                      });
                });
            }

            $diplomas = $query->orderBy('date_deliv', 'desc')
                ->paginate($request->get('per_page', 20));

            return response()->json($diplomas);
        } catch (\Exception $e) {
            \Log::error('Erreur lors de la récupération des diplômes: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de la récupération des diplômes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Diplômes du formateur (pour formateur)
     */
    public function myDiplomas(Request $request)
    {
        if (!$request->user()->isFormateur()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

            $diplomas = Diplome::with(['formation', 'delivrant'])
            ->where('formateur_id', $request->user()->id)
            ->orderBy('date_deliv', 'desc')
            ->get();

        return response()->json([
            'data' => $diplomas
        ]);
    }

    /**
     * Créer un nouveau diplôme (Admin uniquement)
     */
    public function store(Request $request)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $validated = $request->validate([
            'formation_id' => 'nullable|exists:formations,id',
            'type_formation' => 'nullable|in:normal,pedagogique,promotion',
            'promotion_type' => 'nullable|in:5_ans,10_ans',
            'formateur_id' => 'required|exists:users,id',
            'fichier_diplome' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:10240',
            'num_diplome' => 'nullable|string|max:255|unique:diplomes,num_diplome',
            'date_deliv' => 'required|date',
            'notes' => 'nullable|string',
            'ann_adm' => 'required|integer',
            'ref_decision' => 'required|integer',
        ]);

        // Initialize variables
        $training = null;
        $trainingId = null;

        // Normal training (avec formation_id)
        if (!empty($validated['formation_id'])) {
            $training = Formation::findOrFail($validated['formation_id']);
            if ($training->statut !== 'termine') {
                return response()->json([
                    'message' => 'Les diplômes ne peuvent être délivrés que pour les formations terminées.',
                ], 400);
            }
            $trainingId = $validated['formation_id'];
        }
        // Formations virtuelles (ancienne méthode pour compatibilité)
        else if (!empty($validated['type_formation'])) {
            $user = User::with('formateur')->findOrFail($validated['formateur_id']);
            $trainer = $user->formateur;
            if (!$trainer) {
                return response()->json([
                    'message' => "Le formateur n'a pas de profil formateur.",
                ], 400);
            }

            if ($validated['type_formation'] === 'pedagogique') {
                $formationPed = $trainer->formationPedagogique;
                if (!$formationPed || $formationPed->statut !== 'termine') {
                    return response()->json([
                        'message' => "La formation pédagogique n'est pas terminée.",
                    ], 400);
                }
                $trainingId = $formationPed->id; // Utiliser l'ID de la formation généralisée
            } else if ($validated['type_formation'] === 'promotion') {
                // Get promotion type from request (required for promotion)
                if (!isset($validated['promotion_type']) || !in_array($validated['promotion_type'], ['5_ans', '10_ans'])) {
                    return response()->json([
                        'message' => "Le type de promotion (5_ans ou 10_ans) est requis.",
                    ], 400);
                }
                $promotionType = $validated['promotion_type'];
                $formationPromo = $trainer->formationsPromotion()
                    ->where('type_promotion', $promotionType)
                    ->first();
                
                if (!$formationPromo || $formationPromo->statut !== 'termine') {
                    return response()->json([
                        'message' => "La formation de promotion n'est pas terminée.",
                    ], 400);
                }
                
                $trainingId = $formationPromo->id; // Utiliser l'ID de la formation généralisée
            }
        } else {
            return response()->json([
                'message' => 'Vous devez fournir soit un formation_id, soit un type_formation.',
            ], 400);
        }

        // Numéro de diplôme si absent
        if (empty($validated['num_diplome'])) {
            $validated['num_diplome'] = 'DIP-' . strtoupper(Str::random(8));
        }

        if (!$training && $trainingId) {
            $training = Formation::findOrFail($trainingId);
        }

        $diplomaTitle = $training ? $training->titre : ($trainingTitle ?: 'Diplôme');

        // Déjà existant ? Vérifier selon le type de formation
        $existingDiploma = null;
        if ($trainingId) {
            $existingDiploma = Diplome::where('formation_id', $trainingId)
                ->where('formateur_id', $validated['formateur_id'])
                ->first();
        }
        
        if ($existingDiploma) {
            return response()->json([
                'message' => "Un diplôme existe déjà pour ce formateur et cette formation. Veuillez le modifier plutôt que d'en créer un nouveau.",
            ], 422);
        }

        $dataToStore = [
            'formation_id' => $trainingId,
            'formateur_id' => $validated['formateur_id'],
            'titre' => $diplomaTitle,
            'num_diplome' => $validated['num_diplome'],
            'date_deliv' => $validated['date_deliv'],
            'notes' => $validated['notes'] ?? null,
            'ann_adm' => $validated['ann_adm'] ?? null,
            'ref_decision' => $validated['ref_decision'] ?? null,
            'deliv_par' => $request->user()->id,
        ];

        // Fichier
        if ($request->hasFile('fichier_diplome')) {
            $file = $request->file('fichier_diplome');
            $fileId = $trainingId;
            $filename = 'diploma_' . $validated['formateur_id'] . '_' . $fileId . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('diplomas', $filename, 'public');
            $dataToStore['fichier_diplome'] = $path;
        }

        $diploma = Diplome::create($dataToStore);

        \App\Models\Notification::create([
            'utilisateur_id' => $validated['formateur_id'],
            'type' => 'diploma_issued',
            'titre' => 'Diplôme délivré',
            'message' => "Un diplôme a été délivré pour la formation \"{$diplomaTitle}\".",
        ]);

        return response()->json([
            'message' => 'Diplôme créé avec succès!',
            'diplome' => $diploma->load(['formation', 'formateur', 'delivrant']),
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $diploma = Diplome::with(['formation', 'formateur', 'delivrant'])
            ->findOrFail($id);

        $user = $request->user();
        if ($user->isFormateur() && $diploma->formateur_id !== $user->id) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        if (!$user->isGestionaire() && !$user->isFormateur()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        return response()->json($diploma);
    }

    public function update(Request $request, $id)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $diploma = Diplome::findOrFail($id);

        $validated = $request->validate([
            'fichier_diplome' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:10240',
            'num_diplome' => 'nullable|string|max:255|unique:diplomes,num_diplome,' . $id,
            'date_deliv' => 'sometimes|date',
            'notes' => 'nullable|string',
        ]);

        $dataToUpdate = [];

        if (isset($validated['num_diplome'])) {
            $dataToUpdate['num_diplome'] = $validated['num_diplome'];
        }
        if (isset($validated['date_deliv'])) {
            $dataToUpdate['date_deliv'] = $validated['date_deliv'];
        }
        if (isset($validated['notes'])) {
            $dataToUpdate['notes'] = $validated['notes'];
        }

        if ($request->hasFile('fichier_diplome')) {
            if ($diploma->fichier_diplome && Storage::disk('public')->exists($diploma->fichier_diplome)) {
                Storage::disk('public')->delete($diploma->fichier_diplome);
            }
            $file = $request->file('fichier_diplome');
            $filename = 'diploma_' . $diploma->formateur_id . '_' . $diploma->formation_id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('diplomas', $filename, 'public');
            $dataToUpdate['fichier_diplome'] = $path;
        }

        $diploma->update($dataToUpdate);

        return response()->json([
            'message' => 'Diplôme mis à jour avec succès!',
            'diplome' => $diploma->load(['formation', 'formateur', 'delivrant']),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $diploma = Diplome::findOrFail($id);

        if ($diploma->fichier_diplome && Storage::disk('public')->exists($diploma->fichier_diplome)) {
            Storage::disk('public')->delete($diploma->fichier_diplome);
        }

        $diploma->delete();

        return response()->json([
            'message' => 'Diplôme supprimé avec succès!',
        ]);
    }

    public function download(Request $request, $id)
    {
        $diploma = Diplome::findOrFail($id);

        $user = $request->user();
        if ($user->isFormateur() && $diploma->formateur_id !== $user->id) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        if (!$diploma->fichier_diplome) {
            return response()->json([
                'message' => 'Aucun fichier diplôme disponible.',
            ], 404);
        }

        if (!Storage::disk('public')->exists($diploma->fichier_diplome)) {
            return response()->json([
                'message' => 'Le fichier diplôme est introuvable.',
            ], 404);
        }

        $filePath = Storage::disk('public')->path($diploma->fichier_diplome);
        $originalName = basename($diploma->fichier_diplome);

        return response()->download($filePath, $originalName);
    }

    public function getCompletedTrainings(Request $request)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $trainings = Formation::where('statut', 'termine')
            ->with(['candidatures' => function($query) {
                $query->where('statut', 'accepte');
            }])
            ->orderBy('date_fin', 'desc')
            ->get();

        return response()->json([
            'data' => $trainings
        ]);
    }

    public function getTrainersForTraining(Request $request, $trainingId)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $training = Formation::findOrFail($trainingId);

        $trainers = User::whereHas('candidatures', function($query) use ($trainingId) {
                $query->where('formation_id', $trainingId)
                      ->where('statut', 'accepte');
            })
            ->with('formateur')
            ->where('role', 'formateur')
            ->get()
            ->map(function($user) use ($trainingId) {
                $hasDiploma = Diplome::where('formation_id', $trainingId)
                    ->where('formateur_id', $user->id)
                    ->exists();
                
                return [
                    'id' => $user->id,
                    'nom' => $user->nom,
                    'email' => $user->email,
                    'formateur_id' => $user->formateur->identifiant_formateur ?? null,
                    'a_diplome' => $hasDiploma,
                ];
            });

        return response()->json([
            'data' => $trainers
        ]);
    }

    public function getFormateurs(Request $request)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $formateurs = User::where('role', 'formateur')
            ->with('formateur')
            ->get()
            ->map(function($user) {
                return [
                    'id' => $user->id,
                    'nom' => $user->nom,
                    'email' => $user->email,
                    'formateur_id' => $user->formateur->identifiant_formateur ?? null,
                ];
            })
            ->sortBy('nom')
            ->values();

        return response()->json([
            'data' => $formateurs
        ]);
    }

    public function getCompletedTrainingsForFormateur(Request $request, $trainerId)
    {
        try {
            if (!$request->user()->isGestionaire()) {
                return response()->json(['message' => 'Non autorisé'], 403);
            }

            $user = User::with(['formateur.formationPedagogique'])->findOrFail($trainerId);
            if ($user->role !== 'formateur') {
                return response()->json(['message' => "L'utilisateur n'est pas un formateur"], 400);
            }

            $trainings = [];

            $normalTrainings = Formation::where('statut', 'termine')
            ->whereHas('candidatures', function($query) use ($trainerId) {
                $query->where('formateur_id', $trainerId)
                      ->where('statut', 'accepte');
            })
            ->orderBy('date_fin', 'desc')
            ->get()
            ->map(function($training) use ($trainerId) {
                $hasDiploma = Diplome::where('formation_id', $training->id)
                    ->where('formateur_id', $trainerId)
                    ->exists();
                
                return [
                    'id' => $training->id,
                    'titre' => $training->titre,
                    'type' => 'normal',
                    'date_fin' => $training->date_fin->format('Y-m-d'),
                    'categorie' => 'Formation', // Default category since table doesn't have categorie column
                    'a_diplome' => $hasDiploma,
                ];
            });

            $trainings = array_merge($trainings, $normalTrainings->toArray());

            // Check if pedagogical training is completed using the new table or fallback to formateurs table
            $formationPed = $user->formateur?->formationPedagogique;
            $pedagogicalStatus = $formationPed?->statut ?? $user->formateur?->statut_form_ped;
            
            // Normalize status to handle any case variations
            $pedagogicalStatusNormalized = strtolower(trim($pedagogicalStatus ?? ''));
            
            \Log::info('Vérification de la formation pédagogique', [
                'has_formationPed' => $formationPed ? 'yes' : 'no',
                'formationPed_statut' => $formationPed?->statut ?? 'null',
                'formateur_statut_form_ped' => $user->formateur?->statut_form_ped ?? 'null',
                'pedagogicalStatus' => $pedagogicalStatus,
                'pedagogicalStatusNormalized' => $pedagogicalStatusNormalized,
                'will_include' => ($pedagogicalStatusNormalized === 'termine') ? 'yes' : 'no'
            ]);
            
            // If no formation_pedagogique exists but formateur has statut_form_ped = 'termine', include it
            if (!$formationPed && $user->formateur && strtolower(trim($user->formateur->statut_form_ped ?? '')) === 'termine') {
                // Create a virtual formation pedagogique entry for display
                $formationPed = (object)[
                    'statut' => $user->formateur->statut_form_ped,
                    'date_deb' => $user->formateur->date_deb_form_ped,
                    'date_fin' => $user->formateur->date_fin_form_ped,
                ];
                \Log::info('Formation pédagogique virtuelle créée', [
                    'statut' => $formationPed->statut,
                    'date_fin' => $formationPed->date_fin
                ]);
            }
            
            // Check if pedagogical training is completed (either in new table or old table)
            // Use normalized comparison to handle any case variations
            if ($pedagogicalStatusNormalized === 'termine') {
                // Try to find the pedagogical training in the formations table (for backward compatibility with diplomas)
                $pedagogicalTrainingTitle = 'Formation Pédagogique - ' . $user->nom;
                $pedagogicalTraining = Formation::where('titre', 'like', '%Formation Pédagogique%')
                    ->first();
                
                // Check if a diploma already exists for this pedagogical training
                $hasPedagogicalDiploma = false;
                if ($pedagogicalTraining) {
                    $hasPedagogicalDiploma = Diplome::where('formation_id', $pedagogicalTraining->id)
                        ->where('formateur_id', $trainerId)
                        ->exists();
                } else {
                    // Check if a diploma exists for pedagogical training
                    $hasPedagogicalDiploma = Diplome::where('formateur_id', $trainerId)
                        ->where(function($query) {
                            $query->whereHas('formation', function($q) {
                                $q->where('titre', 'like', '%Formation Pédagogique%');
                            })
                            ->orWhere(function($q) {
                                // Also check for diplomas without formation_id (virtual diplomas)
                                $q->whereNull('formation_id')
                                  ->where('titre', 'like', '%Formation Pédagogique%');
                            });
                        })
                        ->exists();
                }
                
                // Get date_fin from formationPed or formateur
                $dateFin = null;
                if ($formationPed && isset($formationPed->date_fin)) {
                    $dateFin = $formationPed->date_fin instanceof \Carbon\Carbon 
                        ? $formationPed->date_fin->format('Y-m-d') 
                        : ($formationPed->date_fin ? date('Y-m-d', strtotime($formationPed->date_fin)) : null);
                } elseif ($user->formateur && $user->formateur->date_fin_form_ped) {
                    $dateFin = $user->formateur->date_fin_form_ped instanceof \Carbon\Carbon 
                        ? $user->formateur->date_fin_form_ped->format('Y-m-d') 
                        : date('Y-m-d', strtotime($user->formateur->date_fin_form_ped));
                }
                
                if (!$dateFin) {
                    $dateFin = now()->format('Y-m-d');
                }
                
                // Get date_deb similarly
                $dateDeb = null;
                if ($formationPed && isset($formationPed->date_deb)) {
                    $dateDeb = $formationPed->date_deb instanceof \Carbon\Carbon 
                        ? $formationPed->date_deb->format('Y-m-d') 
                        : ($formationPed->date_deb ? date('Y-m-d', strtotime($formationPed->date_deb)) : null);
                } elseif ($user->formateur && $user->formateur->date_deb_form_ped) {
                    $dateDeb = $user->formateur->date_deb_form_ped instanceof \Carbon\Carbon 
                        ? $user->formateur->date_deb_form_ped->format('Y-m-d') 
                        : date('Y-m-d', strtotime($user->formateur->date_deb_form_ped));
                }
                
                \Log::info('Ajout de la formation pédagogique à la liste', [
                    'date_fin' => $dateFin,
                    'date_deb' => $dateDeb,
                    'has_diploma' => $hasPedagogicalDiploma
                ]);
                
                $trainings[] = [
                    'id' => $pedagogicalTraining ? $pedagogicalTraining->id : null,
                    'titre' => 'Formation Pédagogique',
                    'type' => 'pedagogique',
                    'date_fin' => $dateFin,
                    'categorie' => 'Formation Pédagogique',
                    'a_diplome' => $hasPedagogicalDiploma,
                    'donnees_pedagogiques' => [
                        'date_deb' => $dateDeb,
                        'date_fin' => $dateFin,
                    ],
                ];
            } else {
                \Log::info('Formation pédagogique non incluse', [
                    'pedagogicalStatus' => $pedagogicalStatus,
                    'formationPed_exists' => $formationPed ? 'yes' : 'no',
                    'formationPed_statut' => $formationPed?->statut ?? 'null'
                ]);
            }

            // Check for promotion trainings (both 5 and 10 years) using the new table
            $promotion5 = $user->formateur?->promotion5Ans;
            $promotion10 = $user->formateur?->promotion10Ans;
            
            // For backward compatibility, also check formations table
            $promotionTraining5 = null;
            $promotionTraining10 = null;
            if ($promotion5) {
                $promotionTraining5 = Formation::where('titre', 'like', '%Formation de Promotion (5 ans)% - ' . $user->nom . '%')
                    ->first();
            }
            if ($promotion10) {
                $promotionTraining10 = Formation::where('titre', 'like', '%Formation de Promotion (10 ans)% - ' . $user->nom . '%')
                    ->first();
            }
            
            // Add 5 years promotion if it exists and is completed (check both new table and old data)
            $promotion5Status = $promotion5?->statut;
            if ($promotion5 && ($promotion5->statut === 'termine' || $promotion5Status === 'termine')) {
                $hasPromotion5Diploma = Diplome::where('formateur_id', $trainerId)
                    ->where(function($query) {
                        $query->whereHas('formation', function($q) {
                            $q->where('titre', 'like', '%Formation de Promotion (5 ans)%');
                        })
                        ->orWhere(function($q) {
                            $q->whereNull('formation_id')
                              ->where('titre', 'like', '%Formation de Promotion (5 ans)%');
                        });
                    })
                    ->exists();
                
                // Also check by formation_id if exists
                if ($promotionTraining5) {
                    $hasPromotion5Diploma = $hasPromotion5Diploma || Diplome::where('formation_id', $promotionTraining5->id)
                        ->where('formateur_id', $trainerId)
                        ->exists();
                }
                
                $trainings[] = [
                    'id' => $promotionTraining5 ? $promotionTraining5->id : null,
                    'titre' => 'Formation de Promotion (5 ans)',
                    'type' => 'promotion',
                    'date_fin' => $promotion5->date_fin ? $promotion5->date_fin->format('Y-m-d') : now()->format('Y-m-d'),
                    'categorie' => 'Formation de Promotion',
                    'a_diplome' => $hasPromotion5Diploma,
                    'donnees_promotion' => [
                        'type' => '5_ans',
                    ],
                ];
            }
            
            // Add 10 years promotion if it exists and is completed (check both new table and old data)
            $promotion10Status = $promotion10?->statut;
            if ($promotion10 && ($promotion10->statut === 'termine' || $promotion10Status === 'termine')) {
                $hasPromotion10Diploma = Diplome::where('formateur_id', $trainerId)
                    ->where(function($query) {
                        $query->whereHas('formation', function($q) {
                            $q->where('titre', 'like', '%Formation de Promotion (10 ans)%');
                        })
                        ->orWhere(function($q) {
                            $q->whereNull('formation_id')
                              ->where('titre', 'like', '%Formation de Promotion (10 ans)%');
                        });
                    })
                    ->exists();
                
                // Also check by formation_id if exists
                if ($promotionTraining10) {
                    $hasPromotion10Diploma = $hasPromotion10Diploma || Diplome::where('formation_id', $promotionTraining10->id)
                        ->where('formateur_id', $trainerId)
                        ->exists();
                }
                
                $trainings[] = [
                    'id' => $promotionTraining10 ? $promotionTraining10->id : null,
                    'titre' => 'Formation de Promotion (10 ans)',
                    'type' => 'promotion',
                    'date_fin' => $promotion10->date_fin ? $promotion10->date_fin->format('Y-m-d') : now()->format('Y-m-d'),
                    'categorie' => 'Formation de Promotion',
                    'a_diplome' => $hasPromotion10Diploma,
                    'donnees_promotion' => [
                        'type' => '10_ans',
                    ],
                ];
            }

            \Log::info('Retour des formations', [
                'count' => count($trainings),
                'trainings' => array_map(function($t) {
                    return ['titre' => $t['titre'] ?? 'N/A', 'type' => $t['type'] ?? 'N/A'];
                }, $trainings)
            ]);
            
            return response()->json([
                'data' => $trainings
            ]);
        } catch (\Exception $e) {
            \Log::error('Erreur dans getCompletedTrainingsForFormateur: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erreur lors de la récupération des formations: ' . $e->getMessage(),
                'data' => []
            ], 500);
        }
    }
}


