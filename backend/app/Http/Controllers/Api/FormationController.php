<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use App\Models\EmploiDuTemps;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class FormationController extends Controller
{
    /**
     * Liste des formations
     */
    public function index(Request $request)
    {
        $query = Formation::with(['createur']);
        
        // Filtrer par type si spécifié
        if ($request->has('type')) {
            $query->where('type', $request->type);
            // Charger les relations CTI selon le type
            if ($request->type === 'optionnelle') {
                $query->with('formationOptionnelle');
            } elseif ($request->type === 'pedagogique') {
                $query->with('formationPedagogique.formateur');
            } elseif ($request->type === 'promotion') {
                $query->with('formationPromotion.formateur');
            }
        } else {
            // Par défaut, ne montrer que les formations optionnelles
            $query->where('type', 'optionnelle')
                  ->with('formationOptionnelle');
        }
        
        // Charger les demandes de formation seulement pour les formations optionnelles
        if (!$request->has('type') || $request->type === 'optionnelle') {
            $query->with('demandesFormation');
        }

        // Filtre année
        if ($request->has('year')) {
            $query->whereYear('created_at', $request->year);
        }

        // Filtres
        if ($request->has('status')) {
            $query->where('statut', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('titre', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('lieu', 'like', "%{$search}%");
            });
        }

        // Tri
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        
        // Valider que sortBy est une colonne valide
        $validSortColumns = ['created_at', 'date_deb', 'date_fin', 'titre', 'statut'];
        if (!in_array($sortBy, $validSortColumns)) {
            $sortBy = 'created_at';
        }
        
        // Valider que sortOrder est valide
        $sortOrder = strtolower($sortOrder) === 'asc' ? 'asc' : 'desc';
        
        $query->orderBy($sortBy, $sortOrder);

        // Valider per_page
        $perPage = $request->get('per_page', 15);
        $perPage = is_numeric($perPage) && $perPage > 0 && $perPage <= 100 ? (int)$perPage : 15;
        
        $trainings = $query->paginate($perPage);

        // Automatically update status to 'termine' for trainings past their end date
        $today = now()->toDateString();
        Formation::where('statut', 'en_cours')
                ->where('date_fin', '<', $today)
                ->update(['statut' => 'termine']);

        // Ajouter les places restantes et le nombre de candidats acceptés (seulement pour optionnelles)
        $trainings->getCollection()->transform(function ($training) {
            if ($training->isOptionnelle()) {
                $training->load('formationOptionnelle');
                $training->remaining_slots = $training->remainingSlots();
                $training->is_full = $training->isFull();
                $training->accepted_count = $training->demandesFormation()->where('statut', 'accepte')->count();
                // Ajouter duree_hrs, part_max et prerequis pour compatibilité frontend
                if ($training->relationLoaded('formationOptionnelle') && $training->formationOptionnelle) {
                    $training->duree_hrs = $training->formationOptionnelle->duree_hrs;
                    $training->part_max = $training->formationOptionnelle->part_max;
                    $training->prerequis = $training->formationOptionnelle->prerequis;
                }
            } elseif ($training->isPedagogique()) {
                $training->load('formationPedagogique.formateur');
                $training->formateur_name = $training->formationPedagogique?->formateur?->nom;
            } elseif ($training->isPromotion()) {
                $training->load('formationPromotion.formateur');
                $training->formateur_name = $training->formationPromotion?->formateur?->nom;
            }
            return $training;
        });

        return response()->json($trainings);
    }

    /**
     * Créer une nouvelle formation (Admin uniquement)
     */
    public function store(Request $request)
    {
        // Check if user is admin
        if (!$request->user() || !$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $validated = $request->validate([
            'titre' => 'required|string|max:255',
            'description' => 'required|string',
            'date_deb' => 'required|date',
            'date_fin' => 'required|date|after:date_deb',
            'duree_hrs' => 'nullable|integer|min:1',
            'lieu' => 'required|string|max:255',
            'part_max' => 'required|integer|min:1|max:100',
            'prerequis' => 'nullable|string',
            'statut' => 'sometimes|in:en_cours,termine',
            // Emploi du temps optionnel pour la formation (avec métadonnées)
            'emploi_du_temps' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx|max:10240',
            // Année scolaire saisie comme année uniquement (ex: 2025)
            'edt_annee_scolaire' => 'nullable|integer',
            'edt_etablissement' => 'nullable|string|max:255',
            'edt_departement' => 'nullable|string|max:255',
            'edt_specialite' => 'nullable|string|max:255',
        ]);

        // CTI: Créer d'abord la formation de base
        $training = Formation::create([
            'type' => 'optionnelle',
            'titre' => $validated['titre'],
            'description' => $validated['description'],
            'date_deb' => $validated['date_deb'],
            'date_fin' => $validated['date_fin'],
            'lieu' => $validated['lieu'],
            'statut' => $validated['statut'] ?? 'en_cours',
            'cre_par' => $request->user()->id,
        ]);

        // CTI: Créer ensuite l'enregistrement dans la sous-classe
        \App\Models\FormationOptionnelle::create([
            'formation_id' => $training->id,
            'duree_hrs' => $validated['duree_hrs'] ?? null,
            'part_max' => $validated['part_max'],
            'prerequis' => $validated['prerequis'] ?? null,
        ]);

        // Si un emploi du temps est fourni, l'enregistrer pour cette formation
        if ($request->hasFile('emploi_du_temps')) {
            $file = $request->file('emploi_du_temps');
            $filename = 'edt_formation_' . $training->id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('emplois_du_temps/formations', $filename, 'public');

            EmploiDuTemps::create([
                'formation_id' => $training->id,
                'type' => 'demande_formation', // EDT utilisé pour les demandes reliées à cette formation
                'annee_scolaire' => $validated['edt_annee_scolaire'] ?? null,
                'etablissement' => $validated['edt_etablissement'] ?? '',
                'departement' => $validated['edt_departement'] ?? '',
                'specialite' => $validated['edt_specialite'] ?? '',
                'fichier' => $path,
                'uploaded_by' => $request->user()->id,
            ]);
        }

        // Créer une notification pour tous les formateurs
        $formateurUsers = \App\Models\User::where('role', 'formateur')->get();
        foreach ($formateurUsers as $formateur) {
            \App\Models\Notification::create([
                'utilisateur_id' => $formateur->id,
                'type' => 'training_created',
                'titre' => 'Nouvelle formation disponible',
                'message' => "Une nouvelle formation \"{$training->titre}\" est maintenant disponible dans votre spécialité.",
            ]);
        }

        // Charger la relation CTI
        $training->load(['createur', 'formationOptionnelle']);
        
        // Ajouter duree_hrs, part_max et prerequis pour compatibilité frontend
        if ($training->relationLoaded('formationOptionnelle')) {
            $training->duree_hrs = $training->formationOptionnelle->duree_hrs;
            $training->part_max = $training->formationOptionnelle->part_max;
            $training->prerequis = $training->formationOptionnelle->prerequis;
        }

        return response()->json([
            'message' => 'Formation créée avec succès!',
            'formation' => $training,
        ], 201);
    }

    /**
     * Afficher une formation spécifique
     */
    public function show($id)
    {
        $training = Formation::with(['createur', 'demandesFormation.formateur', 'emploisDuTemps']);
        
        // Charger la relation CTI selon le type
        $training = $training->findOrFail($id);
        if ($training->isOptionnelle()) {
            $training->load('formationOptionnelle');
        } elseif ($training->isPedagogique()) {
            $training->load('formationPedagogique.formateur');
        } elseif ($training->isPromotion()) {
            $training->load('formationPromotion.formateur');
        }

        $training->remaining_slots = $training->remainingSlots();
        $training->is_full = $training->isFull();
        $training->accepted_count = $training->demandesFormation()->where('statut', 'accepte')->count();
        
        // Ajouter duree_hrs, part_max et prerequis pour les formations optionnelles (pour compatibilité frontend)
        if ($training->isOptionnelle() && $training->relationLoaded('formationOptionnelle')) {
            $training->duree_hrs = $training->formationOptionnelle->duree_hrs;
            $training->part_max = $training->formationOptionnelle->part_max;
            $training->prerequis = $training->formationOptionnelle->prerequis;
        }

        return response()->json($training);
    }

    /**
     * Mettre à jour une formation (Admin uniquement)
     */
    public function update(Request $request, $id)
    {
        $training = Formation::findOrFail($id);
        
        // Débogage : Journaliser les informations utilisateur
        \Log::info('Utilisateur tentant de mettre à jour la formation:', [
            'user_id' => auth()->id(),
            'user_role' => auth()->user()->role ?? 'inconnu',
            'is_admin' => auth()->user()->isGestionaire() ?? false,
            'training_id' => $id,
            'training_title' => $training->titre
        ]);
        
        // Vérifier si l'utilisateur est authentifié
        if (!auth()->check()) {
            return response()->json([
                'success' => false,
                'message' => 'Non authentifié.',
            ], 401);
        }
        
        // Vérifier si l'utilisateur est admin
        if (!auth()->user()->isGestionaire()) {
            return response()->json([
                'success' => false,
                'message' => 'Vous n\'avez pas les permissions pour modifier cette formation.',
            ], 403);
        }
        
        // Vérifier l'autorisation (commenté pour le débogage)
        // $this->authorize('update', $training);

        // FormData peut envoyer duree_hrs en chaîne vide ; nullable|integer exige null, pas ''
        if ($request->has('duree_hrs') && $request->input('duree_hrs') === '') {
            $request->merge(['duree_hrs' => null]);
        }

        $validated = $request->validate([
            'titre' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'date_deb' => 'sometimes|date',
            'date_fin' => 'sometimes|date',
            'duree_hrs' => 'sometimes|nullable|integer|min:1',
            'lieu' => 'sometimes|string|max:255',
            'part_max' => 'sometimes|integer|min:1|max:100',
            'prerequis' => 'sometimes|nullable|string',
            'statut' => 'sometimes|in:en_cours,termine',
            'emploi_du_temps' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx|max:10240',
            'edt_annee_scolaire' => 'nullable|integer',
            'edt_etablissement' => 'nullable|string|max:255',
            'edt_departement' => 'nullable|string|max:255',
            'edt_specialite' => 'nullable|string|max:255',
        ]);

        // Validate date_fin is after date_deb (use new date_deb if provided, otherwise existing)
        if (isset($validated['date_fin'])) {
            $dateDebut = $validated['date_deb'] ?? $training->date_deb;
            if ($dateDebut && $validated['date_fin'] <= $dateDebut) {
                return response()->json([
                    'success' => false,
                    'message' => 'La date de fin doit être postérieure à la date de début.',
                ], 422);
            }
        }

        try {
            // Supprimer l'EDT si le statut change à "terminé" ou "en_attente"
            if (isset($validated['statut']) && in_array($validated['statut'], ['termine', 'en_attente'])) {
                $oldEdts = $training->emploisDuTemps;
                foreach ($oldEdts as $oldEdt) {
                    if (Storage::disk('public')->exists($oldEdt->fichier)) {
                        Storage::disk('public')->delete($oldEdt->fichier);
                    }
                    $oldEdt->delete();
                }
                if ($oldEdts->count() > 0) {
                    Log::info('EDT(s) de formation supprimé(s) car statut changé à: ' . $validated['statut'], [
                        'formation_id' => $training->id,
                        'edts_count' => $oldEdts->count()
                    ]);
                }
            }

            // Vérifier que c'est une formation optionnelle
            if (!$training->isOptionnelle()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cette méthode ne peut mettre à jour que les formations optionnelles.',
                ], 400);
            }

            // Séparer les champs de la classe de base et de la sous-classe
            $baseFields = ['titre', 'description', 'date_deb', 'date_fin', 'lieu', 'statut'];
            $optionnelleFields = ['duree_hrs', 'part_max', 'prerequis'];
            
            $baseData = array_intersect_key($validated, array_flip($baseFields));
            $optionnelleData = array_intersect_key($validated, array_flip($optionnelleFields));
            
            // Mettre à jour la classe de base
            if (!empty($baseData)) {
                $training->update($baseData);
            }
            
            // Mettre à jour la sous-classe
            if (!empty($optionnelleData)) {
                $formationOptionnelle = $training->formationOptionnelle;
                if ($formationOptionnelle) {
                    $formationOptionnelle->update($optionnelleData);
                } else {
                    // Créer si n'existe pas (ne devrait pas arriver)
                    \App\Models\FormationOptionnelle::create([
                        'formation_id' => $training->id,
                        ...$optionnelleData
                    ]);
                }
            }
            
            // Mettre à jour l'emploi du temps si un nouveau fichier est fourni
            if ($request->hasFile('emploi_du_temps')) {
                $training->load('emploisDuTemps');
                foreach ($training->emploisDuTemps as $oldEdt) {
                    if (Storage::disk('public')->exists($oldEdt->fichier)) {
                        Storage::disk('public')->delete($oldEdt->fichier);
                    }
                    $oldEdt->delete();
                }
                $file = $request->file('emploi_du_temps');
                $filename = 'edt_formation_' . $training->id . '_' . time() . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs('emplois_du_temps/formations', $filename, 'public');
                EmploiDuTemps::create([
                    'formation_id' => $training->id,
                    'type' => 'demande_formation',
                    'annee_scolaire' => $validated['edt_annee_scolaire'] ?? null,
                    'etablissement' => $validated['edt_etablissement'] ?? '',
                    'departement' => $validated['edt_departement'] ?? '',
                    'specialite' => $validated['edt_specialite'] ?? '',
                    'fichier' => $path,
                    'uploaded_by' => $request->user()->id,
                ]);
            }

            // Refresh to get updated data
            $training->refresh();
            $training->load(['createur', 'formationOptionnelle', 'emploisDuTemps']);
            
            // Ajouter duree_hrs, part_max et prerequis pour compatibilité frontend
            if ($training->relationLoaded('formationOptionnelle')) {
                $training->duree_hrs = $training->formationOptionnelle->duree_hrs;
                $training->part_max = $training->formationOptionnelle->part_max;
                $training->prerequis = $training->formationOptionnelle->prerequis;
            }

            return response()->json([
                'success' => true,
                'message' => 'Formation mise à jour avec succès!',
                'formation' => $training,
            ]);
        } catch (\Exception $e) {
            \Log::error('Erreur lors de la mise à jour de la formation: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de la mise à jour de la formation: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Supprimer une formation (Admin uniquement)
     */
    public function destroy($id)
    {
        try {
            $training = Formation::findOrFail($id);
            
            // Débogage : Journaliser les informations utilisateur
            \Log::info('Utilisateur tentant de supprimer la formation:', [
                'user_id' => auth()->id(),
                'user_role' => auth()->user()->role ?? 'inconnu',
                'is_admin' => auth()->user()->isGestionaire() ?? false,
                'training_id' => $id,
                'training_title' => $training->titre
            ]);
            
            // Vérifier si l'utilisateur est authentifié
            if (!auth()->check()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non authentifié.',
                ], 401);
            }
            
            // Vérifier si l'utilisateur est admin
            if (!auth()->user()->isGestionaire()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous n\'avez pas les permissions pour supprimer cette formation.',
                ], 403);
            }
            
            // Vérifier l'autorisation (commenté pour le débogage)
            // $this->authorize('delete', $training);

            // Supprimer d'abord les enregistrements liés pour éviter les contraintes de clé étrangère
            $training->candidatures()->delete();
            $training->emploisDuTemps()->delete();
            $training->historique()->delete();
            
            // Supprimer la formation
            $training->delete();

            return response()->json([
                'success' => true,
                'message' => 'Formation supprimée avec succès!',
            ]);
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Vous n\'avez pas les permissions pour supprimer cette formation.',
            ], 403);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Formation non trouvée.',
            ], 404);
        } catch (\Exception $e) {
            \Log::error('Erreur lors de la suppression de la formation: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de la formation: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtenir les spécialités disponibles pour les formations
     */
    public function categories()
    {
        $specialites = \App\Models\Specialiste::orderBy('nom')
            ->get(['id', 'nom']);

        return response()->json($specialites);
    }

    /**
     * Obtenir les statistiques d'une formation
     */
    public function statistics($id)
    {
        $training = Formation::with(['candidatures'])->findOrFail($id);

        $stats = [
            'total_applications' => $training->demandesFormation->count(),
            'en_attente' => $training->demandesFormation->where('statut', 'en_attente')->count(),
            'accepte' => $training->demandesFormation->where('statut', 'accepte')->count(),
            'refuse' => $training->demandesFormation->where('statut', 'refuse')->count(),
            'en_attente_validation' => $training->demandesFormation->where('statut', 'en_attente_validation')->count(),
            'remaining_slots' => $training->remainingSlots(),
            'is_full' => $training->isFull(),
        ];

        return response()->json($stats);
    }
}

