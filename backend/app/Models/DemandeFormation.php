<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Modèle DemandeFormation
 * Remplace Candidature selon le diagramme UML
 * Classe d'association entre formateurs et formations
 */
class DemandeFormation extends Model
{
    use HasFactory;

    protected $table = 'demandes_de_formation';

    protected $fillable = [
        'formation_id',
        'formateur_id',
        'statut',
        'date_demande',
        'dossier_id',
        'masquee_gestionnaire_at',
    ];

    protected $casts = [
        'date_demande' => 'date',
        'masquee_gestionnaire_at' => 'datetime',
    ];

    // Relations
    public function formation()
    {
        return $this->belongsTo(Formation::class, 'formation_id');
    }

    public function formateur()
    {
        return $this->belongsTo(User::class, 'formateur_id');
    }

    /**
     * Examinateur (utilisateur gestionaire/admin qui traite la demande)
     * Gardé pour compatibilité avec l'ancien modèle Candidature.
     */
    public function examinateur()
    {
        return $this->belongsTo(User::class, 'examinateur_id');
    }

    // Relation avec l'emploi du temps
    public function emploiDuTemps()
    {
        return $this->hasOne(EmploiDuTemps::class, 'demande_formation_id');
    }

    // Relation avec le dossier
    public function dossier()
    {
        return $this->belongsTo(Dossier::class, 'dossier_id');
    }

    // Helper methods
    public function isPending()
    {
        return $this->statut === 'en_attente';
    }

    public function isAccepted()
    {
        return $this->statut === 'accepte';
    }

    public function isRejected()
    {
        return $this->statut === 'refuse';
    }

    public function isOnHold()
    {
        return $this->statut === 'en_attente_validation';
    }
    
    // Méthodes du diagramme UML
    public function accepter()
    {
        $this->update(['statut' => 'accepte']);
    }
    
    public function refuser()
    {
        $this->update(['statut' => 'refuse']);
    }
    
    public function mettreEnAttente()
    {
        $this->update(['statut' => 'en_attente_validation']);
    }
}
