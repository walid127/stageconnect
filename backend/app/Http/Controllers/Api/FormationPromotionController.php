<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Formateur;
use App\Models\Formation;
use App\Models\FormationPromotion;
use App\Models\User;
use App\Models\Notification;
use App\Models\EmploiDuTemps;
use App\Models\Specialiste;
use App\Models\Dossier;
use App\Mail\PromotionTrainingNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class FormationPromotionController extends Controller
{
    /**
     * Obtenir tous les formateurs (pour PSP1/PSP2)
     */
    public function index(Request $request)
    {
        // Vérifier si l'utilisateur est admin
        if (!$request->user() || !$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        // Filtrer par type de promotion si spécifié (5_ans pour PSP1, 10_ans pour PSP2)
        $typePromotionFilter = $request->query('type_promotion');
        
        // Filtrer par grade si spécifié (pour PSP1 ou PSP2)
        $gradeFilter = $request->query('grade');
        $query = Formateur::with(['utilisateur', 'grade', 'formationsPromotion' => function($q) use ($typePromotionFilter) {
            if ($typePromotionFilter) {
                $q->where('type_promotion', $typePromotionFilter);
            }
        }, 'formationsPromotion']);
        
        if ($gradeFilter) {
            // Filtrer par nom de grade
            $query->whereHas('grade', function($q) use ($gradeFilter) {
                $q->where('nom', $gradeFilter);
            });
        }

        // Obtenir tous les formateurs
        $trainers = $query->get()
            ->map(function($trainer) use ($typePromotionFilter) {
                // Filtrer les formations de promotion par type si spécifié
                $formationsPromotion = $trainer->formationsPromotion;
                if ($typePromotionFilter && $formationsPromotion->isNotEmpty()) {
                    $formationsPromotion = $formationsPromotion->filter(function($formation) use ($typePromotionFilter) {
                        return $formation->type_promotion === $typePromotionFilter;
                    });
                }
                
                // CTI: Charger les formations de base pour chaque formation de promotion
                $formationsPromotion->load('formation');
                
                // Vérifier et mettre à jour automatiquement le statut si la date de fin est dépassée
                foreach ($formationsPromotion as $formationPromo) {
                    $formationPromo->checkAndUpdateStatus();
                }
                
                // Recharger les formations après la mise à jour
                $trainer->refresh();
                $formationsPromotion = $trainer->formationsPromotion;
                $formationsPromotion->load('formation');
                
                if ($typePromotionFilter && $formationsPromotion->isNotEmpty()) {
                    $formationsPromotion = $formationsPromotion->filter(function($formationPromo) use ($typePromotionFilter) {
                        return $formationPromo->type_promotion === $typePromotionFilter;
                    });
                }
                
                // Vérifier si une formation de promotion existe pour le type spécifié
                $hasPromotionTraining = $formationsPromotion->isNotEmpty();
                
                // Obtenir les détails de la formation de promotion du bon type
                $formationPromotion = $formationsPromotion->first();
                $formation = $formationPromotion?->formation;

                return [
                    'id' => $trainer->id,
                    'user_id' => $trainer->utilisateur_id,
                    'teacher_name' => $trainer->utilisateur->nom ?? $trainer->nom ?? 'N/A',
                    'email' => $trainer->utilisateur->email ?? null,
                    'formateur_id' => $trainer->id_formateur,
                    'grade' => $trainer->grade ? $trainer->grade->nom : null,
                    'has_promotion_schedule_file' => $trainer->edtPromotion()->exists(),
                    'has_promotion_training' => $hasPromotionTraining,
                    'formation_promotion' => $formationPromotion && $formation ? [
                        'id' => $formation->id, // ID de la formation de base
                        'formation_promotion_id' => $formationPromotion->id, // ID de la sous-classe
                        'titre' => $formation->titre,
                        'description' => $formation->description,
                        'type_promotion' => $formationPromotion->type_promotion,
                        'date_deb' => $formation->date_deb ? $formation->date_deb->format('Y-m-d') : null,
                        'date_fin' => $formation->date_fin ? $formation->date_fin->format('Y-m-d') : null,
                        'lieu' => $formation->lieu,
                        'statut' => $formation->statut,
                    ] : null,
                ];
            })
            ->values();

        return response()->json([
            'data' => $trainers,
        ]);
    }

    /**
     * Créer une nouvelle formation de promotion
     */
    public function store(Request $request)
    {
        if (!$request->user() || !$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $validated = $request->validate([
            'formateur_id' => 'required|exists:formateurs,id',
            'titre' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type_promotion' => 'required|in:5_years,10_years',
            'date_deb' => 'required|date',
            'date_fin' => 'required|date|after_or_equal:date_deb',
            'lieu' => 'nullable|string|max:255',
            'statut' => 'required|in:en_attente,en_cours,termine',
            'emploi_du_temps' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png|max:10240',
            // Métadonnées EDT comme pour les formations optionnelles/pédagogiques
            'edt_annee_scolaire' => 'nullable|integer',
            'edt_etablissement' => 'nullable|string|max:255',
            'edt_departement' => 'nullable|string|max:255',
            'edt_specialite' => 'nullable|string|max:255',
        ]);

        $trainer = Formateur::with('utilisateur')->findOrFail($validated['formateur_id']);

        // Convertir 5_years -> 5_ans et 10_years -> 10_ans pour correspondre à l'ENUM de la base de données
        $promotionTypeDb = $validated['type_promotion'] === '10_years' ? '10_ans' : '5_ans';
        $promotionTypeLabel = $validated['type_promotion'] === '10_years' ? '10 ans' : '5 ans';

        // Vérifier si la formation de promotion existe déjà pour ce formateur et ce type
        $existingFormationPromo = FormationPromotion::where('formateur_id', $trainer->id)
            ->where('type_promotion', $promotionTypeDb)
            ->first();

        if ($existingFormationPromo) {
            return response()->json([
                'message' => 'La formation de promotion existe déjà pour ce formateur.',
                'formation_id' => $existingFormationPromo->formation_id,
            ], 409);
        }

        // CTI: Créer la formation de base
        $training = Formation::create([
            'type' => 'promotion',
            'titre' => $validated['titre'],
            'description' => $validated['description'] ?? null,
            'date_deb' => $validated['date_deb'],
            'date_fin' => $validated['date_fin'],
            // La colonne 'lieu' est NOT NULL en base, donc stocker une chaîne vide si aucun lieu n'est fourni
            'lieu' => $validated['lieu'] ?? '',
            'statut' => $validated['statut'],
        ]);

        // CTI: Créer la sous-classe
        FormationPromotion::create([
            'formation_id' => $training->id,
            'formateur_id' => $trainer->id,
            'type_promotion' => $promotionTypeDb,
        ]);

        // Gérer l'upload de l'emploi du temps si fourni
        if ($request->hasFile('emploi_du_temps')) {
            $file = $request->file('emploi_du_temps');
            $filename = 'edt_promotion_' . $trainer->id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('emplois_du_temps/promotion', $filename, 'public');

            // Supprimer l'ancien emploi du temps s'il existe
            $oldEdt = EmploiDuTemps::where('formateur_id', $trainer->id)
                ->where('type', 'promotion')
                ->first();
            
            if ($oldEdt) {
                if (Storage::disk('public')->exists($oldEdt->fichier)) {
                    Storage::disk('public')->delete($oldEdt->fichier);
                }
                $oldEdt->delete();
            }

            // Créer le nouvel emploi du temps avec métadonnées (comme pour pédagogique)
            EmploiDuTemps::create([
                'formateur_id'   => $trainer->id,
                'type'           => 'promotion',
                'annee_scolaire' => $validated['edt_annee_scolaire'] ?? now()->year,
                'etablissement'  => $validated['edt_etablissement'] ?? null,
                'departement'    => $validated['edt_departement'] ?? null,
                'specialite'     => $validated['edt_specialite'] ?? null,
                'fichier'        => $path,
                'uploaded_by'    => $request->user()->id,
            ]);
        }

        // Créer une notification si le statut est en_cours
        if ($validated['statut'] === 'en_cours' && $trainer->utilisateur_id) {
            Notification::create([
                'utilisateur_id' => $trainer->utilisateur_id,
                'type' => 'promotion_training_started',
                'titre' => 'Formation de Promotion Démarrée',
                'message' => "Votre Formation de Promotion ({$promotionTypeLabel}) a été démarrée: {$validated['titre']}.",
            ]);
        }

        // Charger les relations pertinentes pour la réponse (via la sous-classe de promotion)
        $training->load(['formationPromotion.formateur.utilisateur']);

        return response()->json([
            'message' => 'Formation de promotion créée avec succès!',
            'formation' => $training,
        ], 201);
    }

    /**
     * Mettre à jour une formation de promotion
     */
    public function update(Request $request, $id)
    {
        if (!$request->user() || !$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $formationPromotion = FormationPromotion::with(['formation', 'formateur'])
            ->where('formation_id', $id)
            ->firstOrFail();

        $validated = $request->validate([
            'titre' => 'required|string|max:255',
            'description' => 'nullable|string',
            'date_deb' => 'required|date',
            'date_fin' => 'required|date|after_or_equal:date_deb',
            'lieu' => 'nullable|string|max:255',
            'statut' => 'required|in:en_attente,en_cours,termine',
            'emploi_du_temps' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png|max:10240',
            'edt_annee_scolaire' => 'nullable|integer',
            'edt_etablissement' => 'nullable|string|max:255',
            'edt_departement' => 'nullable|string|max:255',
            'edt_specialite' => 'nullable|string|max:255',
        ]);

        // CTI: Mettre à jour la formation de base
        $formationPromotion->formation->update([
            'titre' => $validated['titre'],
            'description' => $validated['description'] ?? null,
            'date_deb' => $validated['date_deb'],
            'date_fin' => $validated['date_fin'],
            'lieu' => $validated['lieu'] ?? null,
            'statut' => $validated['statut'],
        ]);

        // Mettre à jour l'emploi du temps si un nouveau fichier est fourni
        if ($request->hasFile('emploi_du_temps')) {
            $trainer = $formationPromotion->formateur;
            if ($trainer) {
                $oldEdt = EmploiDuTemps::where('formateur_id', $trainer->id)->where('type', 'promotion')->first();
                if ($oldEdt) {
                    if (Storage::disk('public')->exists($oldEdt->fichier)) {
                        Storage::disk('public')->delete($oldEdt->fichier);
                    }
                    $oldEdt->delete();
                }
                $file = $request->file('emploi_du_temps');
                $filename = 'edt_promotion_' . $trainer->id . '_' . time() . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs('emplois_du_temps/promotion', $filename, 'public');
                EmploiDuTemps::create([
                    'formateur_id'   => $trainer->id,
                    'type'           => 'promotion',
                    'annee_scolaire' => $validated['edt_annee_scolaire'] ?? null,
                    'etablissement'  => $validated['edt_etablissement'] ?? '',
                    'departement'    => $validated['edt_departement'] ?? '',
                    'specialite'     => $validated['edt_specialite'] ?? '',
                    'fichier'        => $path,
                    'uploaded_by'    => $request->user()->id,
                ]);
            }
        }

        $formationPromotion->refresh();
        $formationPromotion->load(['formation', 'formateur.utilisateur']);

        return response()->json([
            'message' => 'Formation de promotion modifiée avec succès!',
            'formation' => $formationPromotion,
        ], 200);
    }

    /**
     * Annuler/Supprimer une formation de promotion
     */
    public function destroy(Request $request, $id)
    {
        if (!$request->user() || !$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        // CTI: $id est l'ID de la formation de base
        $formationPromo = FormationPromotion::with(['formation', 'formateur.utilisateur'])
            ->where('formation_id', $id)
            ->firstOrFail();
        $formation = $formationPromo->formation;
        $trainer = $formationPromo->formateur;

        if (!$trainer) {
            return response()->json([
                'message' => 'Formateur non trouvé.',
            ], 404);
        }

        // Supprimer l'emploi du temps associé si existe (spécifique à cette formation)
        $edt = EmploiDuTemps::where('formateur_id', $trainer->id)
            ->where('type', 'promotion')
            ->first();
        if ($edt) {
            if (Storage::disk('public')->exists($edt->fichier)) {
                Storage::disk('public')->delete($edt->fichier);
            }
            $edt->delete();
        }


        // Notifier le formateur
        if ($trainer->utilisateur) {
            Notification::create([
                'utilisateur_id' => $trainer->utilisateur_id,
                'type' => 'promotion_training_cancelled',
                'titre' => 'Formation de promotion annulée',
                'message' => "Votre formation de promotion \"{$formation->titre}\" a été annulée par l'administrateur.",
            ]);
        }

        // CTI: Supprimer la formation de base (cascade supprimera la sous-classe)
        $formation->delete();

        return response()->json([
            'message' => 'Formation de promotion annulée avec succès!',
        ]);
    }

    /**
     * Envoyer un email de notification de promotion au formateur
     */
    public function notify(Request $request, $id)
    {
        // Vérifier si l'utilisateur est admin
        if (!$request->user() || !$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $trainer = Formateur::with('utilisateur')->findOrFail($id);

        // Créer une notification
        if ($trainer->utilisateur_id) {
            Notification::create([
                'utilisateur_id' => $trainer->utilisateur_id,
                'type' => 'promotion_training_due',
                'titre' => 'Formation de Promotion Disponible',
                'message' => "Une formation de promotion est disponible pour vous.",
            ]);
        }

        // Envoyer l'email après la réponse pour éviter un blocage côté client.
        if ($trainer->utilisateur?->email) {
            $targetEmail = $trainer->utilisateur->email;
            app()->terminating(function () use ($targetEmail, $trainer) {
                try {
                    Mail::to($targetEmail)->send(new PromotionTrainingNotification($trainer, null, null));
                } catch (\Throwable $e) {
                    Log::error('Failed to send promotion notification email', [
                        'email' => $targetEmail,
                        'error' => $e->getMessage(),
                        'exception' => get_class($e),
                    ]);
                }
            });
        }

        return response()->json([
            'message' => 'Notification de promotion envoyée avec succès!',
            'formateur' => [
                'id' => $trainer->id,
                'nom_formateur' => $trainer->utilisateur->nom ?? $trainer->nom,
            ],
        ]);
    }

    /**
     * Obtenir les informations de formation de promotion de l'utilisateur actuel (pour formateur)
     */
    public function getMyPromotion(Request $request)
    {
        $user = $request->user();
        
        if (!$user || $user->role !== 'formateur') {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        try {
            $trainer = Formateur::where('utilisateur_id', $user->id)
                ->with(['formationsPromotion'])
                ->first();

            if (!$trainer) {
                return response()->json([
                    'data' => null,
                ]);
            }

            // CTI: Charger les formations de base
            $trainer->load('formationsPromotion.formation');
            
            // Vérifier et mettre à jour automatiquement le statut si la date de fin est dépassée
            foreach ($trainer->formationsPromotion as $formationPromo) {
                $formationPromo->checkAndUpdateStatus();
            }

            // Recharger les formations après la mise à jour
            $trainer->refresh();
            $trainer->load('formationsPromotion.formation');

            // Séparer les formations de promotion par type
            $promotion5Ans = $trainer->formationsPromotion()
                ->where('type_promotion', '5_ans')
                ->with('formation')
                ->first();
            
            $promotion10Ans = $trainer->formationsPromotion()
                ->where('type_promotion', '10_ans')
                ->with('formation')
                ->first();

            // Vérifier si un emploi du temps existe (pour les deux types)
            $hasScheduleFile = $trainer->edtPromotion()->exists();

            return response()->json([
                'data' => [
                    'id' => $trainer->id,
                    'has_schedule_file' => $hasScheduleFile,
                    'has_promotion_training' => $promotion5Ans !== null || $promotion10Ans !== null,
                    'has_promotion_training_5' => $promotion5Ans !== null,
                    'has_promotion_training_10' => $promotion10Ans !== null,
                    'promotion_type' => $promotion5Ans ? '5_years' : ($promotion10Ans ? '10_years' : null),
                    'formation_promotion_5' => $promotion5Ans && $promotion5Ans->formation ? [
                        'id' => $promotion5Ans->formation->id, // ID de la formation de base
                        'formation_promotion_id' => $promotion5Ans->id, // ID de la sous-classe
                        'titre' => $promotion5Ans->formation->titre,
                        'description' => $promotion5Ans->formation->description,
                        'type_promotion' => $promotion5Ans->type_promotion,
                        'date_deb' => $promotion5Ans->formation->date_deb ? $promotion5Ans->formation->date_deb->format('Y-m-d') : null,
                        'date_fin' => $promotion5Ans->formation->date_fin ? $promotion5Ans->formation->date_fin->format('Y-m-d') : null,
                        'lieu' => $promotion5Ans->formation->lieu,
                        'statut' => $promotion5Ans->formation->statut,
                    ] : null,
                    'formation_promotion_10' => $promotion10Ans && $promotion10Ans->formation ? [
                        'id' => $promotion10Ans->formation->id, // ID de la formation de base
                        'formation_promotion_id' => $promotion10Ans->id, // ID de la sous-classe
                        'titre' => $promotion10Ans->formation->titre,
                        'description' => $promotion10Ans->formation->description,
                        'type_promotion' => $promotion10Ans->type_promotion,
                        'date_deb' => $promotion10Ans->formation->date_deb ? $promotion10Ans->formation->date_deb->format('Y-m-d') : null,
                        'date_fin' => $promotion10Ans->formation->date_fin ? $promotion10Ans->formation->date_fin->format('Y-m-d') : null,
                        'lieu' => $promotion10Ans->formation->lieu,
                        'statut' => $promotion10Ans->formation->statut,
                    ] : null,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Erreur dans getMyPromotion: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Erreur lors de la récupération des données',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Admin télécharge un emploi du temps de formation de promotion pour un formateur spécifique
     */
    public function uploadSchedule(Request $request, $id)
    {
        if (!$request->user() || !$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        try {
            $request->validate([
                'promotion_schedule_file' => 'required|file|max:10240', // 10 MB
            ]);

            if (!$request->hasFile('promotion_schedule_file')) {
                return response()->json(['message' => 'Aucun fichier reçu'], 422);
            }

            $trainer = Formateur::findOrFail($id);

            // Supprimer l'ancien EDT s'il existe
            $oldEdt = $trainer->edtPromotion()->first();
            if ($oldEdt) {
                if (Storage::disk('public')->exists($oldEdt->fichier)) {
                    Storage::disk('public')->delete($oldEdt->fichier);
                }
                $oldEdt->delete();
            }

            $file = $request->file('promotion_schedule_file');
            $path = $file->store('schedules/promotion', 'public');
            
            // Créer un nouvel EDT dans la table
            EmploiDuTemps::create([
                'formateur_id' => $trainer->id,
                'fichier' => $path,
            ]);

            return response()->json([
                'message' => 'Emploi du temps de promotion téléchargé avec succès',
                'file' => $path,
            ]);
        } catch (\Throwable $e) {
            Log::error('Échec du téléchargement de l\'emploi du temps de promotion: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur serveur lors du téléchargement de l\'emploi du temps',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Formateur télécharge son emploi du temps de formation de promotion
     */
    public function downloadSchedule(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'formateur') {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $trainer = Formateur::where('utilisateur_id', $user->id)->first();
        if (!$trainer) {
            return response()->json(['message' => 'Formateur non trouvé'], 404);
        }

        $edt = $trainer->edtPromotion()->first();
        if (!$edt) {
            return response()->json(['message' => 'Aucun fichier disponible'], 404);
        }

        if (!Storage::disk('public')->exists($edt->fichier)) {
            return response()->json(['message' => 'Fichier introuvable'], 404);
        }

        return Storage::disk('public')->download($edt->fichier, basename($edt->fichier));
    }

    /**
     * Admin télécharge un emploi du temps de formation de promotion pour un formateur spécifique
     */
    public function downloadScheduleAdmin(Request $request, $id)
    {
        if (!$request->user() || !$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $trainer = Formateur::findOrFail($id);
        $edt = $trainer->edtPromotion()->first();

        if (!$edt) {
            return response()->json([
                'message' => 'Aucun emploi du temps disponible pour cette formation.',
            ], 404);
        }

        if (!Storage::disk('public')->exists($edt->fichier)) {
            return response()->json([
                'message' => 'Le fichier emploi du temps est introuvable.',
            ], 404);
        }

        return Storage::disk('public')->download($edt->fichier, basename($edt->fichier));
    }

    /**
     * Supprimer l'emploi du temps de promotion d'un formateur (Admin uniquement)
     */
    public function deleteSchedule(Request $request, $id)
    {
        if (!$request->user() || !$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $trainer = Formateur::findOrFail($id);
        $edt = $trainer->edtPromotion()->first();

        if (!$edt) {
            return response()->json([
                'message' => 'Aucun emploi du temps trouvé pour ce formateur.',
            ], 404);
        }

        // Supprimer le fichier du stockage
        if (Storage::disk('public')->exists($edt->fichier)) {
            Storage::disk('public')->delete($edt->fichier);
        }

        // Supprimer l'enregistrement de la base de données
        $edt->delete();

        return response()->json([
            'message' => 'Emploi du temps de promotion supprimé avec succès!',
        ]);
    }

    /**
     * Démarrer une formation de promotion pour un formateur (créer la formation virtuelle)
     */
    public function startPromotion(Request $request, $id)
    {
        if (!$request->user() || !$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $trainer = Formateur::with('utilisateur')->findOrFail($id);

        // Get promotion type from request
        $validated = $request->validate([
            'promotion_type' => 'required|in:5_years,10_years',
        ]);

        $promotionType = $validated['promotion_type'];
        // Convertir 5_years -> 5_ans et 10_years -> 10_ans pour correspondre à l'ENUM de la base de données
        $promotionTypeDb = $promotionType === '10_years' ? '10_ans' : '5_ans';
        $promotionTypeLabel = $promotionType === '10_years' ? '10 ans' : '5 ans';

        // Vérifier si la formation de promotion existe déjà pour ce formateur et ce type
        $existingTraining = Formation::where('formateur_id', $trainer->id)
            ->where('type', 'promotion')
            ->where('type_promotion', $validated['type_promotion'])
            ->where('type_promotion', $promotionTypeDb)
            ->first();

        if ($existingTraining) {
            return response()->json([
                'message' => 'La formation de promotion existe déjà pour ce formateur.',
                'formation_id' => $existingTraining->id,
            ], 409);
        }

        // Créer la formation de promotion dans la nouvelle table
        $training = Formation::create([
            'type' => 'promotion',
            'formateur_id' => $trainer->id,
            'type_promotion' => $promotionTypeDb,
            'statut' => 'en_cours',
            'date_deb' => now()->toDateString(),
            'date_fin' => now()->toDateString(),
        ]);

        // Créer une notification
        if ($trainer->utilisateur_id) {
            Notification::create([
                'utilisateur_id' => $trainer->utilisateur_id,
                'type' => 'promotion_training_started',
                'titre' => 'Formation de Promotion Démarrée',
                'message' => "Votre Formation de Promotion ({$promotionTypeLabel}) a été démarrée. Veuillez soumettre votre dossier.",
            ]);
        }

        // Send email after response to keep endpoint fast and reliable.
        if ($trainer->utilisateur?->email) {
            $targetEmail = $trainer->utilisateur->email;
            app()->terminating(function () use ($targetEmail, $trainer, $promotionType) {
                try {
                    Mail::to($targetEmail)->send(new PromotionTrainingNotification($trainer, $promotionType, null));
                } catch (\Throwable $e) {
                    Log::error('Failed to send promotion start email', [
                        'email' => $targetEmail,
                        'promotion_type' => $promotionType,
                        'error' => $e->getMessage(),
                        'exception' => get_class($e),
                    ]);
                }
            });
        }

        return response()->json([
            'message' => 'Formation de promotion démarrée avec succès!',
            'formation' => $training,
            'formateur' => [
                'id' => $trainer->id,
                'nom_formateur' => $trainer->utilisateur->nom ?? $trainer->nom,
                'type_promotion' => $promotionTypeLabel,
            ],
        ]);
    }

    /**
     * Formateur submits dossier for promotion training
     */
    public function submitDossier(Request $request)
    {
        $user = $request->user();
        
        if (!$user || $user->role !== 'formateur') {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $trainer = Formateur::where('utilisateur_id', $user->id)->first();

        if (!$trainer) {
            return response()->json(['message' => 'Formateur non trouvé'], 404);
        }

        $validated = $request->validate([
            'dossier' => 'required|file|mimes:pdf,zip,rar|max:10240',
        ]);

        // Delete old dossier if exists
        if ($trainer->dossier_promotion_id) {
            $oldDossier = Dossier::find($trainer->dossier_promotion_id);
            if ($oldDossier && Storage::disk('public')->exists($oldDossier->fichier)) {
                Storage::disk('public')->delete($oldDossier->fichier);
            }
            if ($oldDossier) {
                $oldDossier->delete();
            }
        }

        // Upload new dossier
        $dossierFile = $request->file('dossier');
        $filename = 'dossier_promotion_' . $trainer->id . '_' . time() . '.' . $dossierFile->getClientOriginalExtension();
        $path = $dossierFile->storeAs('dossiers/promotion', $filename, 'public');

        // Create dossier
        $dossier = Dossier::create([
            'formateur_id' => $trainer->id,
            'fichier' => $path,
            'statut' => 'en_attente',
        ]);

        // Link dossier to formateur and formation promotion
        $trainer->update(['dossier_promotion_id' => $dossier->id]);
        
        // Update formation promotion if exists
        $formationPromo = $trainer->formationsPromotion()->first();
        if ($formationPromo) {
            $formationPromo->update(['dossier_promotion_id' => $dossier->id]);
        }

        // Notify admins
        $adminUsers = User::whereIn('role', ['admin', 'gestionaire'])->get();
        foreach ($adminUsers as $admin) {
            Notification::create([
                'utilisateur_id' => $admin->id,
                'type' => 'promotion_dossier_submitted',
                'titre' => 'Dossier de promotion soumis',
                'message' => "{$user->nom} a soumis son dossier pour la formation de promotion.",
            ]);
        }

        return response()->json([
            'message' => 'Dossier soumis avec succès!',
            'dossier' => $dossier,
        ]);
    }

    /**
     * Gestionaire verifies promotion dossier
     */
    public function verifyDossier(Request $request, $id)
    {
        if (!$request->user() || !$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $trainer = Formateur::findOrFail($id);

        return response()->json(['message' => 'Les dossiers ne sont plus utilisés pour les formations de promotion'], 400);

        $validated = $request->validate([
            'dossier_action' => 'required|in:accept,reject_resubmit,reject_definitif',
            'commentaire' => 'nullable|string|max:1000',
        ]);

        if ($validated['dossier_action'] === 'accept') {
            $dossier->update([
                'commentaire' => $validated['commentaire'] ?? null,
                'statut' => 'accepte',
            ]);
            // Update formation promotion status
            $formationPromo = $trainer->formationsPromotion()->first();
            if ($formationPromo) {
                $formationPromo->update(['statut' => 'en_cours']);
            }
        } elseif ($validated['dossier_action'] === 'reject_resubmit') {
            $dossier->update([
                'commentaire' => $validated['commentaire'] ?? null,
                'statut' => 'resubmit_requested',
            ]);
        } elseif ($validated['dossier_action'] === 'reject_definitif') {
            $dossier->update([
                'commentaire' => $validated['commentaire'] ?? null,
                'statut' => 'refuse_definitif',
            ]);
            // Update formation promotion status
            $formationPromo = $trainer->formationsPromotion()->first();
            if ($formationPromo) {
                $formationPromo->update(['statut' => 'en_attente']);
            }
        }

        // Notify formateur
        if ($trainer->utilisateur && $trainer->utilisateur_id) {
            $messages = [
                'accept' => 'Votre dossier de promotion a été accepté!',
                'reject_resubmit' => 'Votre dossier nécessite des corrections. Veuillez le resoumettre.',
                'reject_definitif' => 'Votre dossier a été refusé définitivement.',
            ];
            Notification::create([
                'utilisateur_id' => $trainer->utilisateur_id,
                'type' => 'promotion_dossier_' . $validated['dossier_action'],
                'titre' => 'Dossier de promotion vérifié',
                'message' => $messages[$validated['dossier_action']],
            ]);
        }

        return response()->json([
            'message' => 'Dossier vérifié avec succès!',
            'dossier' => $dossier->fresh(),
        ]);
    }

    /**
     * Formateur resubmits promotion dossier
     */
    public function resubmitDossier(Request $request)
    {
        $user = $request->user();
        
        if (!$user || $user->role !== 'formateur') {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $trainer = Formateur::where('utilisateur_id', $user->id)->first();

        if (!$trainer || !$trainer->dossier_promotion_id) {
            return response()->json(['message' => 'Aucun dossier trouvé'], 404);
        }

        $dossier = Dossier::findOrFail($trainer->dossier_promotion_id);

        if (!$dossier->isResubmitRequested()) {
            return response()->json(['message' => 'Ce dossier ne peut pas être resoumis'], 400);
        }

        $validated = $request->validate([
            'dossier' => 'required|file|mimes:pdf,zip,rar|max:10240',
        ]);

        // Delete old file
        if (Storage::disk('public')->exists($dossier->fichier)) {
            Storage::disk('public')->delete($dossier->fichier);
        }

        // Upload new dossier
        $dossierFile = $request->file('dossier');
        $filename = 'dossier_promotion_' . $trainer->id . '_' . time() . '.' . $dossierFile->getClientOriginalExtension();
        $path = $dossierFile->storeAs('dossiers/promotion', $filename, 'public');

        // Update dossier (reset to pending when resubmitted)
        $dossier->update([
            'fichier' => $path,
            'statut' => 'en_attente',
            'commentaire' => null,
        ]);

        // Notify admins
        $adminUsers = User::whereIn('role', ['admin', 'gestionaire'])->get();
        foreach ($adminUsers as $admin) {
            Notification::create([
                'utilisateur_id' => $admin->id,
                'type' => 'promotion_dossier_resubmitted',
                'titre' => 'Dossier de promotion resoumis',
                'message' => "{$user->nom} a resoumis son dossier pour la formation de promotion.",
            ]);
        }

        return response()->json([
            'message' => 'Dossier resoumis avec succès!',
            'dossier' => $dossier->fresh(),
        ]);
    }

    /**
     * Download promotion dossier
     */
    public function downloadDossier(Request $request, $id = null)
    {
        $user = $request->user();
        
        // If id provided, admin downloading
        if ($id) {
            if (!$user->isGestionaire()) {
                return response()->json(['message' => 'Non autorisé'], 403);
            }
            $trainer = Formateur::findOrFail($id);
        } else {
            // Formateur downloading their own
            if (!$user || $user->role !== 'formateur') {
                return response()->json(['message' => 'Non autorisé'], 403);
            }
            $trainer = Formateur::where('utilisateur_id', $user->id)->first();
        }

        if (!$trainer || !$trainer->dossier_promotion_id) {
            return response()->json(['message' => 'Aucun dossier trouvé'], 404);
        }

        $dossier = Dossier::findOrFail($trainer->dossier_promotion_id);

        if (!Storage::disk('public')->exists($dossier->fichier)) {
            return response()->json(['message' => 'Fichier introuvable'], 404);
        }

        $filePath = Storage::disk('public')->path($dossier->fichier);
        $originalName = basename($dossier->fichier);

        return response()->download($filePath, $originalName);
    }
}

