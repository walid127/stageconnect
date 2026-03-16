<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FormationController;
use App\Http\Controllers\Api\CandidatureController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\UtilisateurController;
use App\Http\Controllers\Api\FormateurController;
use App\Http\Controllers\Api\SpecialisteController;
use App\Http\Controllers\Api\HistoriqueFormationController;
use App\Http\Controllers\Api\StatistiqueController;
use App\Http\Controllers\Api\FormationPedagogiqueController;
use App\Http\Controllers\Api\FormationPromotionController;
use App\Http\Controllers\Api\DiplomeController;
use App\Http\Controllers\Api\GestionaireController;
use App\Http\Controllers\Api\DatabaseController;
use App\Http\Controllers\Api\PackageController;
use App\Http\Controllers\Api\GradeController;
use Illuminate\Support\Facades\Route;

// ============================================
// ROUTES PUBLIQUES
// ============================================

// Vérification de santé
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now()->toDateTimeString(),
        'version' => '1.0.0',
    ]);
});

// Routes d'authentification
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

// Listes publiques de formations
Route::get('/formations', [FormationController::class, 'index']);
Route::get('/formations/{id}', [FormationController::class, 'show']);
Route::get('/formations-categories', [FormationController::class, 'categories']);

// Spécialistes publics (pour le formulaire d'inscription)
Route::get('/specialistes', [SpecialisteController::class, 'index']);

// Grades publics (pour les formulaires)
Route::get('/grades', [GradeController::class, 'index']);

// Valider l'ID formateur (public - pour l'inscription)
Route::get('/formateurs/validate/{formateur_id}', [FormateurController::class, 'validateFormateurId']);

// Années de statistiques (publiques pour l'instant, peuvent être protégées si nécessaire)
Route::get('/statistics/years', [StatistiqueController::class, 'getAvailableYears']);

// ============================================
// ROUTES PROTÉGÉES (Nécessitent une authentification)
// ============================================

Route::middleware('auth:sanctum')->group(function () {
    
    // Authentification
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::put('/auth/change-password', [AuthController::class, 'changePassword']);

    // Formations (Admin : créer, mettre à jour, supprimer | Tous : voir)
    Route::post('/formations', [FormationController::class, 'store']);
    Route::match(['put', 'post'], '/formations/{id}', [FormationController::class, 'update']);
    Route::delete('/formations/{id}', [FormationController::class, 'destroy']);
    Route::get('/formations/{id}/statistics', [FormationController::class, 'statistics']);

    // Candidatures
    Route::prefix('candidatures')->group(function () {
        Route::get('/', [CandidatureController::class, 'index']);
        Route::post('/', [CandidatureController::class, 'store']);
        Route::get('/stats/overview', [CandidatureController::class, 'statistics']);
        Route::get('/{id}/schedule/download', [CandidatureController::class, 'downloadSchedule']);
        Route::delete('/{id}/schedule', [CandidatureController::class, 'deleteSchedule']);
        Route::get('/{id}/dossier/download', [CandidatureController::class, 'downloadDossier']);
        Route::post('/{id}/dossier/resubmit', [CandidatureController::class, 'resubmitDossier']);
        Route::post('/{id}/accept-candidat', [CandidatureController::class, 'acceptCandidat']);
        Route::get('/{id}', [CandidatureController::class, 'show']);
        Route::put('/{id}', [CandidatureController::class, 'update']);
        Route::delete('/{id}', [CandidatureController::class, 'destroy']);
        Route::put('/{id}/status', [CandidatureController::class, 'updateStatus']);
        Route::post('/{id}/status', [CandidatureController::class, 'updateStatus']); // Pour les téléchargements de fichiers
    });

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::put('/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::put('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
        Route::delete('/{id}', [NotificationController::class, 'destroy']);
    });

    // Messages
    Route::prefix('messages')->group(function () {
        Route::get('/', [MessageController::class, 'index']);
        Route::post('/', [MessageController::class, 'store']);
        Route::get('/users', [MessageController::class, 'getUsers']);
        Route::get('/unread-count', [MessageController::class, 'unreadCount']);
        Route::get('/stats', [MessageController::class, 'stats']);
        Route::get('/{id}', [MessageController::class, 'show']);
        Route::put('/{id}/read', [MessageController::class, 'markAsRead']);
        Route::delete('/{id}', [MessageController::class, 'destroy']);
        Route::get('/conversation/{userId}', [MessageController::class, 'getConversation']);
        Route::delete('/conversation/{userId}', [MessageController::class, 'deleteConversation']);
    });

    // Admin Messages from Gestionaires only
    Route::prefix('admin/messages-gestionaires')->group(function () {
        Route::get('/', [MessageController::class, 'indexAdminGestionaires']);
        Route::get('/users', [MessageController::class, 'getGestionaires']);
    });

    // Historique des Formations
    Route::get('/historique-formations', [HistoriqueFormationController::class, 'index']);
    Route::delete('/historique-formations/{id}', [HistoriqueFormationController::class, 'destroy']);
    Route::delete('/historique-formations', [HistoriqueFormationController::class, 'destroyMultiple']);

    // Gestion des Utilisateurs (Admin uniquement) - Comptes Formateurs (Utilisateurs avec Formateur)
    Route::prefix('admin/formateur-accounts')->group(function () {
        Route::get('/', [UtilisateurController::class, 'index']);
        Route::get('/statistics', [UtilisateurController::class, 'statistics']);
        Route::get('/{id}', [UtilisateurController::class, 'show']);
        Route::put('/{id}', [UtilisateurController::class, 'update']);
        Route::delete('/{id}', [UtilisateurController::class, 'destroy']);
        Route::put('/{id}/status', [UtilisateurController::class, 'updateStatus']);
        Route::put('/{id}/reset-password', [UtilisateurController::class, 'resetPassword']);
    });

    // Gestion des Formateurs (Admin uniquement) - Formateurs (Formateurs sans comptes utilisateur)
    Route::prefix('admin/formateurs')->group(function () {
        Route::get('/', [FormateurController::class, 'index']);
        Route::post('/', [UtilisateurController::class, 'store']); // Créer un formateur (depuis UtilisateurController)
        Route::get('/{id}', [FormateurController::class, 'show']);
        Route::put('/{id}', [FormateurController::class, 'update']);
        Route::delete('/{id}', [FormateurController::class, 'destroy']);
    });

    // Gestion des Spécialistes (Admin uniquement)
    Route::prefix('admin/specialistes')->group(function () {
        Route::get('/', [SpecialisteController::class, 'index']);
        Route::post('/', [SpecialisteController::class, 'store']);
        Route::get('/categories', [SpecialisteController::class, 'categories']);
        Route::get('/{id}', [SpecialisteController::class, 'show']);
        Route::put('/{id}', [SpecialisteController::class, 'update']);
        Route::delete('/{id}', [SpecialisteController::class, 'destroy']);
    });

    // Gestion des Grades (Admin et Gestionaire)
    Route::prefix('grades')->group(function () {
        Route::get('/', [GradeController::class, 'index']);
        Route::post('/', [GradeController::class, 'store']);
        Route::get('/{id}', [GradeController::class, 'show']);
        Route::put('/{id}', [GradeController::class, 'update']);
        Route::delete('/{id}', [GradeController::class, 'destroy']);
    });

    // Gestion des Formations Pédagogiques (Admin uniquement)
    Route::prefix('admin/formations-pedagogiques')->group(function () {
        Route::post('/', [FormationPedagogiqueController::class, 'store']); // Créer une formation pédagogique
        Route::get('/', [FormationPedagogiqueController::class, 'index']);
        Route::delete('/{id}', [FormationPedagogiqueController::class, 'destroy']); // Annuler une formation pédagogique
        Route::match(['put', 'post'], '/{id}', [FormationPedagogiqueController::class, 'updateFormation']); // Modifier (PUT JSON ou POST FormData pour EDT)
        Route::post('/{id}/start', [FormationPedagogiqueController::class, 'startTraining']);
        Route::post('/{id}/cancel', [FormationPedagogiqueController::class, 'cancelTraining']);
        Route::get('/{id}/emploi-du-temps/telecharger', [FormationPedagogiqueController::class, 'downloadScheduleAdmin']);
        Route::post('/{id}/dossier/verify', [FormationPedagogiqueController::class, 'verifyDossier']);
        Route::post('/{id}/accept-formation', [FormationPedagogiqueController::class, 'acceptFormation']);
        Route::get('/{id}/dossier/download', [FormationPedagogiqueController::class, 'downloadDossier']);
    });

    // Formation Pédagogique pour Formateurs (Obtenir leurs propres informations)
    Route::prefix('formation-pedagogique')->group(function () {
        Route::get('/ma-formation', [FormationPedagogiqueController::class, 'getMyTraining']);
        Route::get('/emploi-du-temps/telecharger', [FormationPedagogiqueController::class, 'downloadSchedule']);
        Route::post('/dossier/submit', [FormationPedagogiqueController::class, 'submitDossier']);
        Route::post('/dossier/resubmit', [FormationPedagogiqueController::class, 'resubmitDossier']);
        Route::get('/dossier/download', [FormationPedagogiqueController::class, 'downloadDossier']);
    });

    // Formation de Promotion pour Formateurs (Obtenir leurs propres informations)
    Route::prefix('formation-promotion')->group(function () {
        Route::get('/ma-promotion', [FormationPromotionController::class, 'getMyPromotion']);
        Route::get('/emploi-du-temps/telecharger', [FormationPromotionController::class, 'downloadSchedule']);
        Route::post('/dossier/submit', [FormationPromotionController::class, 'submitDossier']);
        Route::post('/dossier/resubmit', [FormationPromotionController::class, 'resubmitDossier']);
        Route::get('/dossier/download', [FormationPromotionController::class, 'downloadDossier']);
    });

    // Gestion des Formations de Promotion (Admin uniquement)
    Route::prefix('admin/formations-promotion')->group(function () {
        Route::post('/', [FormationPromotionController::class, 'store']); // Créer une formation de promotion
        Route::get('/', [FormationPromotionController::class, 'index']);
        Route::match(['put', 'post'], '/{id}', [FormationPromotionController::class, 'update']); // Modifier (PUT JSON ou POST FormData pour EDT)
        Route::delete('/{id}', [FormationPromotionController::class, 'destroy']); // Annuler/Supprimer une formation de promotion
        Route::post('/{id}/notifier', [FormationPromotionController::class, 'notify']);
        Route::post('/{id}/demarrer', [FormationPromotionController::class, 'startPromotion']);
        Route::post('/{id}/emploi-du-temps', [FormationPromotionController::class, 'uploadSchedule']);
        Route::get('/{id}/emploi-du-temps/telecharger', [FormationPromotionController::class, 'downloadScheduleAdmin']);
        Route::delete('/{id}/emploi-du-temps', [FormationPromotionController::class, 'deleteSchedule']);
        Route::post('/{id}/dossier/verify', [FormationPromotionController::class, 'verifyDossier']);
        Route::get('/{id}/dossier/download', [FormationPromotionController::class, 'downloadDossier']);
    });

    // Diplômes pour Formateurs (Obtenir leurs propres diplômes)
    Route::prefix('diplomes')->group(function () {
        Route::get('/mes-diplomes', [DiplomeController::class, 'myDiplomas']);
        Route::get('/{id}', [DiplomeController::class, 'show']);
        Route::get('/{id}/download', [DiplomeController::class, 'download']);
    });

    // Gestion des Diplômes (Admin uniquement)
    Route::prefix('admin/diplomes')->group(function () {
        Route::get('/', [DiplomeController::class, 'index']);
        Route::post('/', [DiplomeController::class, 'store']);
        Route::get('/formateurs', [DiplomeController::class, 'getFormateurs']);
        Route::get('/formateurs/{trainerId}/formations-terminees', [DiplomeController::class, 'getCompletedTrainingsForFormateur']);
        Route::get('/formations-terminees', [DiplomeController::class, 'getCompletedTrainings']);
        Route::get('/formations/{trainingId}/formateurs', [DiplomeController::class, 'getTrainersForTraining']);
        Route::get('/{id}', [DiplomeController::class, 'show']);
        Route::put('/{id}', [DiplomeController::class, 'update']);
        Route::post('/{id}', [DiplomeController::class, 'update']); // Pour les téléchargements de fichiers
        Route::delete('/{id}', [DiplomeController::class, 'destroy']);
    });

    // Gestion des Gestionaires (Admin uniquement)
    Route::prefix('admin/gestionaires')->group(function () {
        Route::get('/', [GestionaireController::class, 'index']);
        Route::post('/', [GestionaireController::class, 'store']);
        Route::get('/{id}', [GestionaireController::class, 'show']);
        Route::put('/{id}', [GestionaireController::class, 'update']);
        Route::delete('/{id}', [GestionaireController::class, 'destroy']);
    });

    // Gestion de la Base de Données (Admin uniquement)
    Route::prefix('admin/database')->group(function () {
        Route::post('/backup', [DatabaseController::class, 'backup']);
        Route::get('/backups', [DatabaseController::class, 'listBackups']);
        Route::get('/backups/{filename}/download', [DatabaseController::class, 'downloadBackup']);
        Route::post('/restore', [DatabaseController::class, 'restore']);
        Route::delete('/backups/{filename}', [DatabaseController::class, 'deleteBackup']);
    });

    // Gestion des Paquets (Admin uniquement)
    Route::prefix('admin/packages')->group(function () {
        Route::get('/', [PackageController::class, 'index']);
        Route::post('/install', [PackageController::class, 'install']);
        Route::post('/update-all', [PackageController::class, 'updateAll']);
        // Routes avec paramètres doivent être après les routes fixes
        Route::put('/{package}/update', [PackageController::class, 'update'])->where('package', '.*');
        Route::delete('/{package}/uninstall', [PackageController::class, 'uninstall'])->where('package', '.*');
    });

});

