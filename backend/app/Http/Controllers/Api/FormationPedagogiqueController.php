<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Formateur;
use App\Models\Formation;
use App\Models\FormationPedagogique;
use App\Models\User;
use App\Models\Notification;
use App\Models\EmploiDuTemps;
use App\Models\Dossier;
use App\Mail\PedagogicalTrainingStarted;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class FormationPedagogiqueController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user() || !$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        try {
            // Get all formateurs with their pedagogical formations
            $trainers = Formateur::with(['utilisateur', 'formationPedagogique.formation'])
                ->get()
                ->map(function($trainer) {
                    $utilisateur = $trainer->utilisateur;
                    $formationPed = $trainer->formationPedagogique;
                    $formation = $formationPed?->formation; // Accéder à la formation de base via CTI
                    
                    // Vérifier et mettre à jour automatiquement le statut si la date de fin est dépassée
                    if ($formation) {
                        $formation->checkAndUpdateStatus();
                        $trainer->refresh();
                        $formationPed = $trainer->formationPedagogique;
                        $formation = $formationPed?->formation;
                    }
                    
                    $hasPedagogicalTraining = !is_null($formation);
                    
                    return [
                        'id' => $trainer->id,
                        'user_id' => $trainer->utilisateur_id,
                        'teacher_name' => $utilisateur ? ($utilisateur->nom ?? $trainer->nom) : $trainer->nom,
                        'email' => $utilisateur ? $utilisateur->email : null,
                        'formateur_id' => $trainer->id_formateur,
                        'has_pedagogical_training' => $hasPedagogicalTraining,
                        'has_pedagogical_schedule_file' => $trainer->edtPedagogique()->exists(),
                        'formation_pedagogique' => $formation ? [
                            'id' => $formation->id,
                            'titre' => $formation->titre ?? null,
                            'description' => $formation->description ?? null,
                            'date_deb' => $formation->date_deb ? $formation->date_deb->format('Y-m-d') : null,
                            'date_fin' => $formation->date_fin ? $formation->date_fin->format('Y-m-d') : null,
                            'lieu' => $formation->lieu ?? null,
                            'statut' => $formation->statut,
                        ] : null,
                    ];
                })
                ->values();

            return response()->json([
                'data' => $trainers,
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des formations pédagogiques: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Erreur lors de la récupération des formations pédagogiques',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Créer une nouvelle formation pédagogique
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
            'date_deb' => 'required|date',
            'date_fin' => 'required|date|after_or_equal:date_deb',
            'lieu' => 'nullable|string|max:255',
            'statut' => 'required|in:en_attente,en_cours,termine',
            'emploi_du_temps' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png|max:10240',
            // Métadonnées EDT comme pour les formations optionnelles
            'edt_annee_scolaire' => 'nullable|integer',
            'edt_etablissement' => 'nullable|string|max:255',
            'edt_departement' => 'nullable|string|max:255',
            'edt_specialite' => 'nullable|string|max:255',
        ]);

        $trainer = Formateur::with('utilisateur')->findOrFail($validated['formateur_id']);

        // Vérifier si la formation pédagogique existe déjà pour ce formateur
        $existingFormationPed = FormationPedagogique::where('formateur_id', $trainer->id)->first();

        if ($existingFormationPed) {
            return response()->json([
                'message' => 'La formation pédagogique existe déjà pour ce formateur.',
                'formation_id' => $existingFormationPed->formation_id,
            ], 409);
        }

        // CTI: Créer d'abord la formation de base
        $training = Formation::create([
            'type' => 'pedagogique',
            'titre' => $validated['titre'],
            'description' => $validated['description'] ?? null,
            'date_deb' => $validated['date_deb'],
            'date_fin' => $validated['date_fin'],
            'lieu' => $validated['lieu'] ?? null,
            'statut' => $validated['statut'],
        ]);

        // CTI: Créer ensuite l'enregistrement dans la sous-classe
        FormationPedagogique::create([
            'formation_id' => $training->id,
            'formateur_id' => $trainer->id,
        ]);

        // Gérer l'upload de l'emploi du temps si fourni
        if ($request->hasFile('emploi_du_temps')) {
            $file = $request->file('emploi_du_temps');
            $filename = 'edt_pedagogique_' . $trainer->id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('emplois_du_temps/pedagogique', $filename, 'public');

            // Supprimer l'ancien emploi du temps s'il existe
            $oldEdt = EmploiDuTemps::where('formateur_id', $trainer->id)
                ->where('type', 'pedagogique')
                ->first();
            
            if ($oldEdt) {
                if (Storage::disk('public')->exists($oldEdt->fichier)) {
                    Storage::disk('public')->delete($oldEdt->fichier);
                }
                $oldEdt->delete();
            }

            // Créer le nouvel emploi du temps (avec métadonnées)
            EmploiDuTemps::create([
                'formateur_id'   => $trainer->id,
                'type'           => 'pedagogique',
                'annee_scolaire' => $validated['edt_annee_scolaire'] ?? now()->year,
                'etablissement'  => $validated['edt_etablissement'] ?? null,
                'departement'    => $validated['edt_departement'] ?? null,
                'specialite'     => $validated['edt_specialite'] ?? null,
                'fichier'        => $path,
                'uploaded_by'    => $request->user()->id,
            ]);
        }

        // Créer une notification si le statut est en_cours
        if ($validated['statut'] === 'en_cours' && $trainer->utilisateur) {
            Notification::create([
                'utilisateur_id' => $trainer->utilisateur_id,
                'type' => 'pedagogical_training_started',
                'titre' => 'Formation Pédagogique Démarrée',
                'message' => "Votre formation pédagogique a été démarrée: {$validated['titre']}. Dates: du {$validated['date_deb']} au {$validated['date_fin']}.",
            ]);
        }

        // Charger les relations CTI
        $training->load(['formationPedagogique.formateur.utilisateur']);

        return response()->json([
            'message' => 'Formation pédagogique créée avec succès!',
            'formation' => $training,
        ], 201);
    }

    /**
     * Mettre à jour une formation pédagogique
     */
    public function updateFormation(Request $request, $id)
    {
        if (!$request->user() || !$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        // CTI: Utiliser FormationPedagogique avec relation vers Formation
        $formationPedagogique = FormationPedagogique::with(['formation', 'formateur'])
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
        $formationPedagogique->formation->update([
            'titre' => $validated['titre'],
            'description' => $validated['description'] ?? null,
            'date_deb' => $validated['date_deb'],
            'date_fin' => $validated['date_fin'],
            'lieu' => $validated['lieu'] ?? null,
            'statut' => $validated['statut'],
        ]);

        // Mettre à jour l'emploi du temps si un nouveau fichier est fourni
        if ($request->hasFile('emploi_du_temps')) {
            $trainer = $formationPedagogique->formateur;
            if ($trainer) {
                $oldEdt = EmploiDuTemps::where('formateur_id', $trainer->id)->where('type', 'pedagogique')->first();
                if ($oldEdt) {
                    if (Storage::disk('public')->exists($oldEdt->fichier)) {
                        Storage::disk('public')->delete($oldEdt->fichier);
                    }
                    $oldEdt->delete();
                }
                $file = $request->file('emploi_du_temps');
                $filename = 'edt_pedagogique_' . $trainer->id . '_' . time() . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs('emplois_du_temps/pedagogique', $filename, 'public');
                EmploiDuTemps::create([
                    'formateur_id'   => $trainer->id,
                    'type'           => 'pedagogique',
                    'annee_scolaire' => $validated['edt_annee_scolaire'] ?? null,
                    'etablissement'  => $validated['edt_etablissement'] ?? '',
                    'departement'    => $validated['edt_departement'] ?? '',
                    'specialite'     => $validated['edt_specialite'] ?? '',
                    'fichier'        => $path,
                    'uploaded_by'    => $request->user()->id,
                ]);
            }
        }

        $formationPedagogique->refresh();
        $formationPedagogique->load(['formation', 'formateur.utilisateur']);

        return response()->json([
            'message' => 'Formation pédagogique modifiée avec succès!',
            'formation' => $formationPedagogique,
        ], 200);
    }

    /**
     * Annuler/Supprimer une formation pédagogique
     */
    public function destroy(Request $request, $id)
    {
        if (!$request->user() || !$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $formationPed = FormationPedagogique::with(['formation', 'formateur.utilisateur'])
            ->where('formation_id', $id)
            ->firstOrFail();
        $formation = $formationPed->formation;
        $trainer = $formationPed->formateur;

        if (!$trainer) {
            return response()->json([
                'message' => 'Formateur non trouvé.',
            ], 404);
        }

        // Supprimer l'emploi du temps associé si existe
        $edt = EmploiDuTemps::where('formateur_id', $trainer->id)
            ->where('type', 'pedagogique')
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
                'type' => 'pedagogical_training_cancelled',
                'titre' => 'Formation Pédagogique Annulée',
                'message' => "Votre formation pédagogique \"{$formation->titre}\" a été annulée.",
            ]);
        }

        // CTI: Supprimer la formation de base (cascade supprimera la sous-classe)
        $formation->delete();

        return response()->json([
            'message' => 'Formation pédagogique annulée avec succès!',
        ], 200);
    }

    /**
     * Start pedagogical training - change status to "en_cours" and notify formateur
     */
    public function startTraining(Request $request, $id)
    {
        if (!$request->user() || !$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $trainer = Formateur::with('utilisateur')->findOrFail($id);

        $validated = $request->validate([
            'pedagogical_training_start_date' => 'required|date',
            'pedagogical_training_end_date' => 'required|date|after:pedagogical_training_start_date',
        ]);

        // CTI: Vérifier si la formation pédagogique existe déjà
        $formationPed = FormationPedagogique::where('formateur_id', $trainer->id)->first();
        
        if ($formationPed) {
            // Mettre à jour la formation de base
            $formationPed->formation->update([
                'statut' => 'en_cours',
                'date_deb' => $validated['pedagogical_training_start_date'],
                'date_fin' => $validated['pedagogical_training_end_date'],
            ]);
        } else {
            // CTI: Créer la formation de base
            $formation = Formation::create([
                'type' => 'pedagogique',
                'statut' => 'en_cours',
                'date_deb' => $validated['pedagogical_training_start_date'],
                'date_fin' => $validated['pedagogical_training_end_date'],
            ]);
            
            // CTI: Créer la sous-classe
            $formationPed = FormationPedagogique::create([
                'formation_id' => $formation->id,
                'formateur_id' => $trainer->id,
            ]);
        }

        // Notify formateur that training has started
        if ($trainer->utilisateur) {
            Notification::create([
                'utilisateur_id' => $trainer->utilisateur_id,
                'type' => 'pedagogical_training_started',
                'titre' => 'Formation Pédagogique Démarrée',
                'message' => "Votre formation pédagogique a été démarrée. Dates: du {$validated['pedagogical_training_start_date']} au {$validated['pedagogical_training_end_date']}.",
            ]);
        }

        return response()->json([
            'message' => 'Formation démarrée avec succès! Le formateur a été notifié.',
            'formation' => $formationPed->fresh(['formateur.utilisateur']),
        ]);
    }

    /**
     * Cancel pedagogical training - reset status to "en_attente" and remove dates
     */
    public function cancelTraining(Request $request, $id)
    {
        if (!$request->user() || !$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $trainer = Formateur::with('utilisateur')->findOrFail($id);
        $formationPed = $trainer->formationPedagogique;

        if (!$formationPed) {
            return response()->json([
                'message' => 'Formation pédagogique non trouvée.',
            ], 404);
        }

        // Check if training can be cancelled (only if status is en_cours)
        if ($formationPed->statut !== 'en_cours') {
            return response()->json([
                'message' => 'Cette formation ne peut pas être annulée dans son état actuel.',
            ], 400);
        }

        // Reset formation to "en_attente" and remove dates
        $formationPed->update([
            'statut' => 'en_attente',
            'date_deb' => null,
            'date_fin' => null,
        ]);

        // No need to update formateur table - data is now in formations_pedagogiques table

        // Delete associated schedule if exists
        $edt = $trainer->edtPedagogique()->first();
        if ($edt) {
            if (Storage::disk('public')->exists($edt->fichier)) {
                Storage::disk('public')->delete($edt->fichier);
            }
            $edt->delete();
        }

        // Notify formateur
        if ($trainer->utilisateur) {
            Notification::create([
                'utilisateur_id' => $trainer->utilisateur_id,
                'type' => 'pedagogical_training_cancelled',
                'titre' => 'Formation pédagogique annulée',
                'message' => 'Votre formation pédagogique a été annulée par l\'administrateur.',
            ]);
        }

        return response()->json([
            'message' => 'Formation annulée avec succès!',
            'formation' => $formationPed->fresh(['formateur.utilisateur']),
        ]);
    }

    public function getMyTraining(Request $request)
    {
        $user = $request->user();
        
        if (!$user || $user->role !== 'formateur') {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $trainer = Formateur::with(['formationPedagogique'])->where('utilisateur_id', $user->id)->first();

        if (!$trainer) {
            return response()->json([
                'data' => [
                    'id' => null,
                    'pedagogical_training_status' => 'en_attente',
                    'pedagogical_training_start_date' => null,
                    'pedagogical_training_end_date' => null,
                    'pedagogical_schedule_file' => null,
                    'has_schedule_file' => false,
                ],
            ]);
        }

        $formationPed = $trainer->formationPedagogique;
        // CTI: Le statut est maintenant dans la formation de base
        $formation = $formationPed?->formation;
        $status = $formation?->statut ?? 'en_attente';
        
        // Normalize status
        if (empty($status) || $status === null || $status === '' || !is_string($status)) {
            $status = 'en_attente';
        } else {
            $status = strtolower(trim($status));
            if ($status === 'pending') $status = 'en_attente';
            if ($status === 'encour') $status = 'en_cours';
            if ($status === 'completed') $status = 'termine';
            
            // Allowed statuses
            $allowedStatuses = ['en_attente', 'en_cours', 'termine'];
            if (!in_array($status, $allowedStatuses)) {
                $status = 'en_attente';
            }
        }

        // Dossier information no longer needed
        $dossierData = null;

        // Return formation base id if exists, otherwise trainer id
        $formationId = $formation?->id ?? null;
        $trainerId = $trainer->id;
        $formationPedId = $formationPed?->id ?? null;

        return response()->json([
            'data' => [
                'id' => $formationId ?? $trainerId, // Use formation base ID if exists, otherwise trainer ID
                'formation_pedagogique_id' => $formationPedId, // ID de la sous-classe
                'formateur_id' => $trainerId,
                'pedagogical_training_status' => $status,
                // CTI: Les dates sont maintenant dans la formation de base
                'pedagogical_training_start_date' => $formation?->date_deb ? ($formation->date_deb instanceof \Carbon\Carbon ? $formation->date_deb->format('Y-m-d') : $formation->date_deb) : null,
                'pedagogical_training_end_date' => $formation?->date_fin ? ($formation->date_fin instanceof \Carbon\Carbon ? $formation->date_fin->format('Y-m-d') : $formation->date_fin) : null,
                'pedagogical_schedule_file' => $trainer->edtPedagogique()->first()?->fichier,
                'has_schedule_file' => $trainer->edtPedagogique()->exists(),
                'dossier_pedagogique' => $dossierData,
            ],
        ]);
    }

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

        $edt = $trainer->edtPedagogique()->first();
        
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

        $filePath = Storage::disk('public')->path($edt->fichier);
        $originalName = basename($edt->fichier);

        return response()->download($filePath, $originalName);
    }

    /**
     * Admin télécharge un emploi du temps de formation pédagogique pour un formateur spécifique
     */
    public function downloadScheduleAdmin(Request $request, $id)
    {
        if (!$request->user() || !$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $trainer = Formateur::findOrFail($id);
        $edt = $trainer->edtPedagogique()->first();

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

        $filePath = Storage::disk('public')->path($edt->fichier);
        $originalName = basename($edt->fichier);

        return response()->download($filePath, $originalName);
    }

    /**
     * Formateur submits dossier for pedagogical training
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

        // Get formation pedagogique
        $formationPed = $trainer->formationPedagogique;
        
        // Delete old dossier if exists

        // Upload new dossier
        $dossierFile = $request->file('dossier');
        $filename = 'dossier_pedagogique_' . $trainer->id . '_' . time() . '.' . $dossierFile->getClientOriginalExtension();
        $path = $dossierFile->storeAs('dossiers/pedagogical', $filename, 'public');

        // Create dossier
        $dossier = Dossier::create([
            'formateur_id' => $trainer->id,
            'fichier' => $path,
            'statut' => 'en_attente',
        ]);

        // CTI: Update or create formation pedagogique
        if ($formationPed) {
            $formationPed->formation->update(['statut' => 'en_cours']);
        } else {
            // CTI: Créer la formation de base
            $formation = Formation::create([
                'type' => 'pedagogique',
                'statut' => 'en_cours',
                'cre_par' => $user->id,
            ]);
            
            // CTI: Créer la sous-classe
            $formationPed = FormationPedagogique::create([
                'formation_id' => $formation->id,
                'formateur_id' => $trainer->id,
            ]);
        }

        // Notify admins
        $adminUsers = User::whereIn('role', ['admin', 'gestionaire'])->get();
        foreach ($adminUsers as $admin) {
            Notification::create([
                'utilisateur_id' => $admin->id,
                'type' => 'pedagogical_dossier_submitted',
                'titre' => 'Dossier pédagogique soumis',
                'message' => "{$user->nom} a soumis son dossier pour la formation pédagogique.",
            ]);
        }

        return response()->json([
            'message' => 'Dossier soumis avec succès!',
            'dossier' => $dossier,
        ]);
    }

    /**
     * Gestionaire verifies dossier
     */
    public function verifyDossier(Request $request, $id)
    {
        if (!$request->user() || !$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $trainer = Formateur::findOrFail($id);

        return response()->json(['message' => 'Les dossiers ne sont plus utilisés pour les formations pédagogiques'], 400);

        $validated = $request->validate([
            'dossier_action' => 'required|in:accept,reject_resubmit,reject_definitif',
            'commentaire' => 'nullable|string|max:1000',
        ]);

        if ($validated['dossier_action'] === 'accept') {
            $dossier->update([
                'commentaire' => $validated['commentaire'] ?? null,
                'statut' => 'accepte',
            ]);
            // Accepting dossier: formation stays "en_attente" but dossier is accepted
            // Admin will need to click "accept formation" button separately (like regular formations)
            // Don't automatically change statut to "en_cours" - wait for separate acceptance
        } elseif ($validated['dossier_action'] === 'reject_resubmit') {
            $dossier->update([
                'statut' => 'resubmit_requested',
                'commentaire' => $validated['commentaire'] ?? null,
            ]);
        } elseif ($validated['dossier_action'] === 'reject_definitif') {
            $dossier->update([
                'commentaire' => $validated['commentaire'] ?? null,
                'statut' => 'refuse_definitif',
            ]);
            // Status is updated in formations_pedagogiques table
            $formationPed = $trainer->formationPedagogique;
            if ($formationPed) {
                $formationPed->update(['statut' => 'en_attente']);
            }
        }

        // Notify formateur
        if ($trainer->utilisateur) {
            if ($validated['dossier_action'] === 'accept') {
                Notification::create([
                    'utilisateur_id' => $trainer->utilisateur_id,
                    'type' => 'pedagogical_dossier_accepte',
                    'titre' => 'Dossier accepté',
                    'message' => 'Votre dossier pédagogique a été accepté. Votre formation est en cours d\'examen.',
                ]);
            } elseif ($validated['dossier_action'] === 'reject_resubmit') {
                Notification::create([
                    'utilisateur_id' => $trainer->utilisateur_id,
                    'type' => 'pedagogical_dossier_reject_resubmit',
                    'titre' => 'Dossier nécessite des corrections',
                    'message' => 'Votre dossier pédagogique nécessite des corrections. Veuillez le resoumettre.',
                ]);
            } elseif ($validated['dossier_action'] === 'reject_definitif') {
                Notification::create([
                    'utilisateur_id' => $trainer->utilisateur_id,
                    'type' => 'pedagogical_dossier_refuse',
                    'titre' => 'Dossier refusé',
                    'message' => 'Votre dossier pédagogique a été refusé définitivement.',
                ]);
            }
        }

        return response()->json([
            'message' => 'Dossier vérifié avec succès!',
            'dossier' => $dossier->fresh(),
        ]);
    }

    /**
     * Formateur resubmits dossier
     */
    public function resubmitDossier(Request $request)
    {
        $user = $request->user();
        
        if (!$user || $user->role !== 'formateur') {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $trainer = Formateur::where('utilisateur_id', $user->id)->first();

        if (!$trainer) {
            return response()->json(['message' => 'Formateur non trouvé'], 404);
        }

        return response()->json(['message' => 'Les dossiers ne sont plus utilisés pour les formations pédagogiques'], 400);

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
        $filename = 'dossier_pedagogique_' . $trainer->id . '_' . time() . '.' . $dossierFile->getClientOriginalExtension();
        $path = $dossierFile->storeAs('dossiers/pedagogical', $filename, 'public');

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
                'type' => 'pedagogical_dossier_resubmitted',
                'titre' => 'Dossier pédagogique resoumis',
                'message' => "{$user->nom} a resoumis son dossier pour la formation pédagogique.",
            ]);
        }

        return response()->json([
            'message' => 'Dossier resoumis avec succès!',
            'dossier' => $dossier->fresh(),
        ]);
    }

    /**
     * Accept pedagogical formation after dossier is accepted (similar to acceptCandidat for regular formations)
     */
    public function acceptFormation(Request $request, $id)
    {
        if (!$request->user() || !$request->user()->isGestionaire()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $trainer = Formateur::findOrFail($id);
        $formationPed = $trainer->formationPedagogique;

        if (!$formationPed) {
            return response()->json([
                'message' => 'Formation pédagogique non trouvée.',
            ], 404);
        }

        // No dossier check needed anymore
        $formationPed = $trainer->formationPedagogique;

        // Accept the formation - set status to "en_cours"
        $formationPed->update(['statut' => 'en_cours']);
        // Status is updated in formations_pedagogiques table

        // Notify formateur
        if ($trainer->utilisateur) {
            Notification::create([
                'utilisateur_id' => $trainer->utilisateur_id,
                'type' => 'pedagogical_training_started',
                'titre' => 'Formation Pédagogique Acceptée',
                'message' => 'Votre formation pédagogique a été acceptée et a commencé.',
            ]);

            // Send email after response so the endpoint is never blocked by SMTP.
            if ($formationPed->date_deb && $formationPed->date_fin && $trainer->utilisateur->email) {
                $targetEmail = $trainer->utilisateur->email;
                $startDate = $formationPed->date_deb->format('Y-m-d');
                $endDate = $formationPed->date_fin->format('Y-m-d');

                app()->terminating(function () use ($targetEmail, $trainer, $startDate, $endDate) {
                    try {
                        Mail::to($targetEmail)->send(new PedagogicalTrainingStarted($trainer, $startDate, $endDate));
                    } catch (\Throwable $e) {
                        Log::error('Failed to send pedagogical training email', [
                            'email' => $targetEmail,
                            'error' => $e->getMessage(),
                            'exception' => get_class($e),
                        ]);
                    }
                });
            }
        }

        return response()->json([
            'message' => 'Formation pédagogique acceptée avec succès!',
            'formation' => $formationPed->fresh(['formateur.utilisateur']),
        ]);
    }

    /**
     * Download dossier
     */
    public function downloadDossier(Request $request, $id = null)
    {
        $user = $request->user();
        
        // If id provided, admin downloading
        if ($id) {
            if (!$user->isGestionaire()) {
                return response()->json(['message' => 'Non autorisé'], 403);
            }
            $trainer = Formateur::with('formationPedagogique')->findOrFail($id);
        } else {
            // Formateur downloading their own
            if (!$user || $user->role !== 'formateur') {
                return response()->json(['message' => 'Non autorisé'], 403);
            }
            $trainer = Formateur::with('formationPedagogique')->where('utilisateur_id', $user->id)->first();
        }

        if (!$trainer) {
            return response()->json(['message' => 'Formateur non trouvé'], 404);
        }

        // Get dossier from formation pedagogique
        return response()->json(['message' => 'Les dossiers ne sont plus utilisés pour les formations pédagogiques'], 400);

        if (!Storage::disk('public')->exists($dossier->fichier)) {
            return response()->json(['message' => 'Fichier introuvable'], 404);
        }

        $filePath = Storage::disk('public')->path($dossier->fichier);
        $originalName = basename($dossier->fichier);

        return response()->download($filePath, $originalName);
    }
}


