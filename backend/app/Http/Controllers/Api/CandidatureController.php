<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DemandeFormation;
use App\Models\Formation;
use App\Models\Notification;
use App\Models\HistoriqueFormation;
use App\Models\EmploiDuTemps;
use App\Models\Dossier;
use App\Mail\ApplicationAccepted;
use App\Mail\ApplicationRejected;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

class CandidatureController extends Controller
{
    /**
     * Liste des demandes de formation
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = DemandeFormation::with(['formation', 'formateur.formateur', 'examinateur', 'emploiDuTemps', 'dossier']);

        // Si formateur, voir uniquement ses demandes de formation (toujours visibles, pas de masquage)
        if ($user->isFormateur()) {
            $query->where('formateur_id', $user->id);
        }

        // Si gestionaire, ne pas afficher les demandes "supprimées" (masquées) de leur liste
        if ($user->isGestionaire()) {
            $query->whereNull('masquee_gestionnaire_at');
        }

        // Filtres
        if ($request->has('status')) {
            $query->where('statut', $request->status);
        }

        if ($request->has('formation_id')) {
            $query->where('formation_id', $request->formation_id);
        }

        $applications = $query->orderBy('date_demande', 'desc')
            ->paginate($request->get('per_page', 15));

        // Ajouter fichier_emploi_temps à chaque demande et s'assurer que formateur.formateur est chargé
        $applications->getCollection()->transform(function ($application) {
            // Priorité à l'EDT spécifique à la demande ; sinon, utiliser l'EDT de la formation (type demande_formation)
            $schedule = $application->emploiDuTemps;
            if (!$schedule && $application->formation) {
                $schedule = $application->formation->emploisDuTemps()
                    ->where('type', 'demande_formation')
                    ->first();
            }
            $application->fichier_emploi_temps = $schedule ? true : null;
            // S'assurer que la relation formateur.formateur est chargée
            if ($application->formateur && !$application->formateur->relationLoaded('formateur')) {
                $application->formateur->load('formateur');
            }
            // Ajouter la ville directement dans formateur pour faciliter l'accès
            if ($application->formateur && $application->formateur->formateur) {
                $application->formateur->ville = $application->formateur->formateur->ville;
            }
            return $application;
        });

        return response()->json($applications);
    }

    /**
     * Créer une nouvelle demande de formation
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'formation_id' => 'required|exists:formations,id',
            'dossier' => $this->dossierFileRules(),
        ]);

        // Vérifier que l'utilisateur est formateur
        if (!$request->user()->isFormateur()) {
            return response()->json([
                'message' => 'Seuls les formateurs peuvent postuler aux formations.',
            ], 403);
        }

        // Vérifier si la formation existe
        $training = Formation::findOrFail($validated['formation_id']);

        // Vérifier s'il reste des places
        if ($training->isFull()) {
            return response()->json([
                'message' => 'Cette formation est complète.',
            ], 400);
        }

        // Vérifier si l'utilisateur a déjà postulé
        $existingApplication = DemandeFormation::where('formation_id', $validated['formation_id'])
            ->where('formateur_id', $request->user()->id)
            ->first();

        if ($existingApplication) {
            return response()->json([
                'message' => 'Vous avez déjà postulé à cette formation.',
            ], 400);
        }

        // Upload dossier file
        $dossierFile = $request->file('dossier');
        $filename = 'dossier_candidature_' . $request->user()->id . '_' . $validated['formation_id'] . '_' . time() . '.' . $dossierFile->getClientOriginalExtension();
        $path = $dossierFile->storeAs('dossiers/candidatures', $filename, 'public');

        // Get formateur model
        $formateur = $request->user()->formateur;

        // Create dossier
        $dossier = Dossier::create([
            'formateur_id' => $formateur->id,
            'fichier' => $path,
            'statut' => 'en_attente',
        ]);

        // Créer la demande de formation
        $application = DemandeFormation::create([
            'formation_id' => $validated['formation_id'],
            'formateur_id' => $request->user()->id,
            'date_demande' => now(),
            'statut' => 'en_attente',
            'dossier_id' => $dossier->id,
        ]);

        // Dossier is linked to demande de formation via candidatures.dossier_id (foreign key)

        // Créer une notification pour l'utilisateur
        Notification::create([
            'utilisateur_id' => $request->user()->id,
            'type' => 'application_created',
            'titre' => 'Demande de formation envoyée',
            'message' => "Votre demande pour la formation \"{$training->titre}\" a été envoyée avec succès.",
        ]);

        // Créer une notification pour les administrateurs et gestionnaires
        $adminUsers = \App\Models\User::whereIn('role', ['admin', 'gestionaire'])->get();
        foreach ($adminUsers as $admin) {
            Notification::create([
                'utilisateur_id' => $admin->id,
                'type' => 'application_created',
                'titre' => 'Nouvelle demande de formation',
                'message' => "{$request->user()->nom} a postulé à la formation \"{$training->titre}\".",
            ]);
        }

        // Créer un enregistrement dans l'historique
        HistoriqueFormation::create([
            'utilisateur_id' => $request->user()->id,
            'formateur_id' => $request->user()->id,
            'formation_id' => $training->id,
            'action' => 'application_submitted',
            'description' => "Demande de formation envoyée pour la formation \"{$training->titre}\"",
            'titre_form' => $training->titre,
            'date_comp' => $training->date_fin,
        ]);

        return response()->json([
            'message' => 'Demande de formation envoyée avec succès!',
            'demande_formation' => $application->load(['formation', 'formateur']),
            'candidature' => $application->load(['formation', 'formateur']), // Alias pour compatibilité
        ], 201);
    }

    /**
     * Afficher une demande de formation spécifique
     */
    public function show(Request $request, $id)
    {
        $application = DemandeFormation::with(['formation', 'formateur.formateur', 'examinateur'])
            ->findOrFail($id);

        // Vérifier les permissions
        $user = $request->user();
        if ($user->isFormateur() && $application->formateur_id !== $user->id) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        return response()->json($application);
    }

    /**
     * Mettre à jour une demande de formation
     */
    public function update(Request $request, $id)
    {
        $application = DemandeFormation::with('formation.emploisDuTemps')->findOrFail($id);

        // Vérifier que c'est le formateur propriétaire et que le statut est pending
        if ($application->formateur_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        if ($application->statut !== 'en_attente') {
            return response()->json([
                'message' => 'Vous ne pouvez plus modifier cette demande de formation.',
            ], 400);
        }

        // Pas de champs à mettre à jour pour l'instant
        // La méthode update reste pour compatibilité future

        return response()->json([
            'message' => 'Demande de formation mise à jour avec succès!',
            'candidature' => $application->load(['formation', 'formateur.formateur']),
        ]);
    }

    /**
     * Supprimer une demande de formation (retirer sa demande)
     */
    /**
     * Supprimer une demande de formation
     * - Formateur: peut supprimer uniquement ses propres demandes de formation si elles ne sont pas acceptées
     * - Gestionaire: peut supprimer n'importe quelle demande de formation
     */
    public function destroy(Request $request, $id)
    {
        $application = DemandeFormation::with(['dossier', 'emploiDuTemps'])->findOrFail($id);
        $user = $request->user();

        // Gestionaire: masquer la demande de leur liste uniquement (ne pas supprimer en base)
        // Le formateur conserve sa demande (acceptée/refusée) inchangée.
        if ($user->isGestionaire()) {
            $application->update(['masquee_gestionnaire_at' => now()]);

            return response()->json([
                'message' => 'Demande de formation retirée de la liste avec succès!',
            ]);
        }

        // Formateur can only delete their own demandes de formation if not accepted
        if ($application->formateur_id !== $user->id) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        // Formateur cannot cancel if already accepted
        if ($application->statut === 'accepte') {
            return response()->json([
                'message' => 'Vous ne pouvez pas annuler une demande de formation acceptée.',
            ], 400);
        }

        // Delete associated dossier if exists
        if ($application->dossier) {
            if (Storage::disk('public')->exists($application->dossier->fichier)) {
                Storage::disk('public')->delete($application->dossier->fichier);
            }
            $application->dossier->delete();
        }

        // Delete associated schedule if exists
        if ($application->emploiDuTemps) {
            if (Storage::disk('public')->exists($application->emploiDuTemps->fichier)) {
                Storage::disk('public')->delete($application->emploiDuTemps->fichier);
            }
            $application->emploiDuTemps->delete();
        }

        $application->delete();

        return response()->json([
            'message' => 'Demande de formation annulée avec succès!',
        ]);
    }

    /**
     * Changer le statut d'une demande de formation (Admin uniquement)
     */
    public function updateStatus(Request $request, $id)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json([
                'message' => 'Accès non autorisé. Seuls les administrateurs peuvent modifier le statut.',
            ], 403);
        }

        // If dossier_action is provided, status is optional. Otherwise, status is required.
        $rules = [
            'fichier_edt' => 'nullable|file|mimes:pdf,doc,docx,xls,xlsx|max:5120', // Max 5MB
            'dossier_action' => 'nullable|in:accept,reject_resubmit,reject_definitif',
            'commentaire' => 'nullable|string|max:1000',
        ];

        if ($request->has('dossier_action')) {
            $rules['status'] = 'nullable|in:en_attente,accepte,refuse,en_attente_validation';
        } else {
            $rules['status'] = 'required|in:en_attente,accepte,refuse,en_attente_validation';
        }

        $validated = $request->validate($rules);

        $application = DemandeFormation::with('dossier')->findOrFail($id);

        // Verify dossier if action is provided
        if ($request->has('dossier_action') && $application->dossier) {
            $dossierAction = $validated['dossier_action'];
            
            if ($dossierAction === 'accept') {
                $application->dossier->update([
                    'commentaire' => null,
                    'statut' => 'accepte',
                ]);
                // Accepting dossier: demande de formation stays "en_attente" but dossier is accepted
                // Admin will need to click "accept candidat" button separately
                $dataToUpdate = [
                    'statut' => 'en_attente', // Keep as pending, waiting for admin to accept candidat
                ];
                
                // Notify formateur that dossier is accepted
                Notification::create([
                    'utilisateur_id' => $application->formateur_id,
                    'type' => 'dossier_accepte',
                    'titre' => 'Dossier accepté',
                    'message' => "Votre dossier pour la formation \"{$application->formation->titre}\" a été accepté. Votre demande de formation est en cours d'examen.",
                ]);
            } elseif ($dossierAction === 'reject_resubmit') {
                $application->dossier->update([
                    'commentaire' => $validated['commentaire'] ?? null,
                    'statut' => 'resubmit_requested',
                ]);
                // Keep demande de formation as pending, waiting for resubmission
                $dataToUpdate = [
                    'statut' => 'en_attente',
                ];
                
                // Notify formateur to resubmit dossier
                Notification::create([
                    'utilisateur_id' => $application->formateur_id,
                    'type' => 'dossier_resubmit_requested',
                    'titre' => 'Dossier nécessite des corrections',
                    'message' => "Votre dossier pour la formation \"{$application->formation->titre}\" nécessite des corrections. Veuillez le resoumettre.",
                ]);
            } elseif ($dossierAction === 'reject_definitif') {
                $commentaire = !empty($validated['commentaire']) ? $validated['commentaire'] : null;
                $application->dossier->update([
                    'commentaire' => $commentaire,
                    'statut' => 'refuse_definitif',
                ]);
                // Reject demande de formation definitively
                $dataToUpdate = [
                    'statut' => 'refuse',
                ];
            }
        } else {
            // Legacy status update (without dossier verification)
        $dataToUpdate = [
            'statut' => $validated['status'],
        ];
        }

        // Supprimer le fichier d'emploi du temps si le statut est changé à refusé
        $newStatus = isset($dataToUpdate['statut']) ? $dataToUpdate['statut'] : ($validated['status'] ?? null);
        if ($newStatus === 'refuse') {
            $edt = $application->emploiDuTemps;
            if ($edt) {
                if (Storage::disk('public')->exists($edt->fichier)) {
                    Storage::disk('public')->delete($edt->fichier);
                }
                $edt->delete();
            }
        }

        $application->update($dataToUpdate);
        
        // Recharger toutes les relations
        $application->load(['formation', 'formateur.formateur', 'emploiDuTemps']);

        // Créer une notification pour le formateur
        $finalStatus = isset($dataToUpdate['statut']) ? $dataToUpdate['statut'] : ($validated['status'] ?? null);
        $statusMessages = [
            'accepte' => 'Félicitations! Votre demande de formation a été acceptée.',
            'refuse' => 'Votre demande de formation a été refusée.',
            'en_attente_validation' => 'Votre demande de formation est en attente de validation.',
            'en_attente' => 'Votre demande de formation est en attente.',
        ];

        if ($finalStatus && isset($statusMessages[$finalStatus])) {
            Notification::create([
                'utilisateur_id' => $application->formateur_id,
                'type' => 'application_' . $finalStatus,
                'titre' => 'Statut de demande de formation mis à jour',
                'message' => $statusMessages[$finalStatus] . " Formation: \"{$application->formation->titre}\"",
            ]);

            // Créer un enregistrement dans l'historique
            HistoriqueFormation::create([
                'utilisateur_id' => $application->formateur_id,
                'formateur_id' => $application->formateur_id,
                'formation_id' => $application->formation_id,
                'action' => 'application_' . $finalStatus,
                'description' => $statusMessages[$finalStatus],
                'titre_form' => $application->formation->titre,
                'date_comp' => $application->formation->date_fin,
            ]);
        }

        // Envoyer l'email après la réponse pour éviter tout blocage utilisateur.
        if (($finalStatus === 'accepte' || $finalStatus === 'refuse') && $application->formateur?->email) {
            $targetEmail = $application->formateur->email;
            $mailable = $finalStatus === 'accepte'
                ? new ApplicationAccepted($application)
                : new ApplicationRejected($application);

            app()->terminating(function () use ($targetEmail, $mailable, $finalStatus) {
                try {
                    Mail::to($targetEmail)->send($mailable);
                } catch (\Throwable $e) {
                    \Log::error('Failed to send candidature status email', [
                        'email' => $targetEmail,
                        'status' => $finalStatus,
                        'error' => $e->getMessage(),
                        'exception' => get_class($e),
                    ]);
                }
            });
        }

        // Recharger toutes les relations
        $application->load(['formation', 'formateur.formateur', 'examinateur', 'emploiDuTemps', 'dossier']);
        
        // Ajouter fichier_emploi_temps à la réponse
        $applicationData = $application->toArray();
        $applicationData['fichier_emploi_temps'] = $application->emploiDuTemps ? true : null;
        
        // Ajouter la ville directement dans formateur pour faciliter l'accès
        if ($application->formateur && $application->formateur->formateur) {
            $applicationData['formateur']['ville'] = $application->formateur->formateur->ville;
        }
        
        return response()->json([
            'message' => 'Statut de la demande de formation mis à jour avec succès!',
            'candidature' => $applicationData,
        ]);
    }

    /**
     * Accept candidat after dossier is accepted (Admin only)
     */
    public function acceptCandidat(Request $request, $id)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json([
                'message' => 'Accès non autorisé. Seuls les administrateurs peuvent accepter les candidats.',
            ], 403);
        }

        $application = DemandeFormation::with(['dossier', 'formation'])->findOrFail($id);

        // Check if dossier is accepted
        if (!$application->dossier || !$application->dossier->isAccepted()) {
            return response()->json([
                'message' => 'Le dossier doit être accepté avant d\'accepter le candidat.',
            ], 400);
        }

        // Check if formation is full
        if ($application->formation->isFull()) {
            return response()->json([
                'message' => 'Cette formation est complète, vous ne pouvez plus accepter de candidats.',
            ], 400);
        }

        // Accept demande de formation
        $application->update([
            'statut' => 'accepte',
        ]);

        // Notify formateur
        Notification::create([
            'utilisateur_id' => $application->formateur_id,
            'type' => 'application_accepte',
            'titre' => 'Demande de formation acceptée',
            'message' => "Félicitations! Votre demande pour la formation \"{$application->formation->titre}\" a été acceptée.",
        ]);

        // Send email after response to avoid blocking this endpoint.
        if ($application->formateur?->email) {
            $targetEmail = $application->formateur->email;
            app()->terminating(function () use ($targetEmail, $application) {
                try {
                    Mail::to($targetEmail)->send(new ApplicationAccepted($application));
                } catch (\Throwable $e) {
                    \Log::error('Failed to send accepted candidature email', [
                        'email' => $targetEmail,
                        'error' => $e->getMessage(),
                        'exception' => get_class($e),
                    ]);
                }
            });
        }

        // Create history record
        HistoriqueFormation::create([
            'utilisateur_id' => $application->formateur_id,
            'formateur_id' => $application->formateur_id,
            'formation_id' => $application->formation_id,
            'action' => 'application_accepte',
            'description' => "Demande de formation acceptée pour la formation \"{$application->formation->titre}\"",
            'titre_form' => $application->formation->titre,
            'date_comp' => $application->formation->date_fin,
        ]);

        // Recharger toutes les relations
        $application->load(['formation', 'formateur.formateur', 'examinateur', 'dossier', 'emploiDuTemps']);

        return response()->json([
            'message' => 'Candidat accepté avec succès!',
            'candidature' => $application,
        ]);
    }

    /**
     * Resubmit dossier for a demande de formation
     */
    public function resubmitDossier(Request $request, $id)
    {
        $application = DemandeFormation::with('dossier')->findOrFail($id);

        // Verify ownership
        if ($application->formateur_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        // Verify dossier can be resubmitted
        if (!$application->dossier || !$application->dossier->isResubmitRequested()) {
            return response()->json([
                'message' => 'Ce dossier ne peut pas être resoumis.',
            ], 400);
        }

        $validated = $request->validate([
            'dossier' => $this->dossierFileRules(),
        ]);

        // Delete old dossier file
        if (Storage::disk('public')->exists($application->dossier->fichier)) {
            Storage::disk('public')->delete($application->dossier->fichier);
        }

        // Upload new dossier
        $dossierFile = $request->file('dossier');
        $filename = 'dossier_candidature_' . $application->id . '_' . time() . '.' . $dossierFile->getClientOriginalExtension();
        $path = $dossierFile->storeAs('dossiers/candidatures', $filename, 'public');

        // Update dossier (reset to pending when resubmitted)
        $application->dossier->update([
            'fichier' => $path,
            'statut' => 'en_attente',
            'commentaire' => null,
        ]);

        // Reset application status to pending
        $application->update([
            'statut' => 'en_attente',
        ]);

        // Notify admins
        $adminUsers = \App\Models\User::whereIn('role', ['admin', 'gestionaire'])->get();
        foreach ($adminUsers as $admin) {
            Notification::create([
                'utilisateur_id' => $admin->id,
                'type' => 'dossier_resubmitted',
                'titre' => 'Dossier resoumis',
                'message' => "{$request->user()->nom} a resoumis son dossier pour la formation \"{$application->formation->titre}\".",
            ]);
        }

        return response()->json([
            'message' => 'Dossier resoumis avec succès!',
            'candidature' => $application->load(['formation', 'formateur.formateur', 'dossier']),
        ]);
    }

    /**
     * Download dossier file
     */
    public function downloadDossier($id)
    {
        $application = DemandeFormation::with('dossier')->findOrFail($id);
        
        $user = auth()->user();
        if ($application->formateur_id !== $user->id && !$user->isGestionaire()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        if (!$application->dossier) {
            return response()->json([
                'message' => 'Aucun dossier disponible.',
            ], 404);
        }

        if (!Storage::disk('public')->exists($application->dossier->fichier)) {
            return response()->json([
                'message' => 'Le fichier dossier est introuvable.',
            ], 404);
        }

        $filePath = Storage::disk('public')->path($application->dossier->fichier);
        $originalName = basename($application->dossier->fichier);

        return response()->download($filePath, $originalName);
    }

    /**
     * Obtenir les statistiques des demandes de formation (Admin)
     */
    public function statistics(Request $request)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        // Obtenir le paramètre année, par défaut l'année en cours
        $year = $request->query('year', date('Y'));

        // Construire la requête avec le filtre année (exclure les demandes masquées de la liste gestionaire)
        $applicationQuery = DemandeFormation::whereYear('created_at', $year)->whereNull('masquee_gestionnaire_at');

        $stats = [
            'total' => (clone $applicationQuery)->count(),
            'en_attente' => (clone $applicationQuery)->where('statut', 'en_attente')->count(),
            'accepte' => (clone $applicationQuery)->where('statut', 'accepte')->count(),
            'refuse' => (clone $applicationQuery)->where('statut', 'refuse')->count(),
            'en_attente_validation' => (clone $applicationQuery)->where('statut', 'en_attente_validation')->count(),
        ];

        return response()->json($stats);
    }

    /**
     * Télécharger le fichier d'emploi du temps pour une demande de formation
     */
    public function downloadSchedule($id)
    {
        $application = DemandeFormation::findOrFail($id);
        
        // Vérifier si l'utilisateur est le formateur de cette demande de formation ou un admin
        $user = auth()->user();
        if ($application->formateur_id !== $user->id && !$user->isGestionaire()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        // D'abord EDT spécifique à la demande, sinon EDT de la formation (type demande_formation)
        $edt = $application->emploiDuTemps;
        if (!$edt && $application->formation) {
            $edt = $application->formation->emploisDuTemps()
                ->where('type', 'demande_formation')
                ->first();
        }
        
        if (!$edt) {
            return response()->json([
                'message' => 'Aucun emploi du temps disponible pour cette demande de formation.',
            ], 404);
        }

        // Vérifier si le fichier existe dans le stockage
        if (!Storage::disk('public')->exists($edt->fichier)) {
            return response()->json([
                'message' => 'Le fichier emploi du temps est introuvable.',
            ], 404);
        }

        // Obtenir le chemin complet et le nom de fichier original
        $filePath = Storage::disk('public')->path($edt->fichier);
        $originalName = basename($edt->fichier);

        return response()->download($filePath, $originalName);
    }

    /**
     * Supprimer l'emploi du temps d'une demande de formation
     */
    public function deleteSchedule(Request $request, $id)
    {
        if (!$request->user()->isGestionaire()) {
            return response()->json([
                'message' => 'Accès non autorisé. Seuls les administrateurs peuvent supprimer l\'emploi du temps.',
            ], 403);
        }

        $application = Candidature::with('emploiDuTemps')->findOrFail($id);

        if (!$application->emploiDuTemps) {
            return response()->json([
                'message' => 'Aucun emploi du temps trouvé pour cette demande de formation.',
            ], 404);
        }

        $edt = $application->emploiDuTemps;

        // Supprimer le fichier du stockage
        if (Storage::disk('public')->exists($edt->fichier)) {
            Storage::disk('public')->delete($edt->fichier);
        }

        // Supprimer l'enregistrement de la base de données
        $edt->delete();

        return response()->json([
            'message' => 'Emploi du temps supprimé avec succès!',
        ]);
    }

    /**
     * Validation rules for dossier uploads. Extension-based checks are more reliable than
     * mimes alone (browsers/OSes report inconsistent MIME types for pdf/zip/rar).
     *
     * @return array<int, mixed>
     */
    private function dossierFileRules(): array
    {
        return [
            'required',
            'file',
            'max:10240',
            function (string $attribute, mixed $value, \Closure $fail): void {
                if (!$value instanceof \Illuminate\Http\UploadedFile) {
                    $fail('Un fichier dossier est requis.');
                    return;
                }
                if (!$value->isValid()) {
                    $fail('Le fichier est invalide ou dépasse la limite d\'envoi du serveur (réduisez la taille, max. 10 Mo).');
                    return;
                }
                $ext = strtolower($value->getClientOriginalExtension());
                if (! in_array($ext, ['pdf', 'zip', 'rar'], true)) {
                    $fail('Le dossier doit être un fichier PDF, ZIP ou RAR.');
                }
            },
        ];
    }
}

