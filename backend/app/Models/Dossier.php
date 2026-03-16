<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Dossier extends Model
{
    use HasFactory;

    protected $fillable = [
        'formateur_id',
        'fichier',
        'statut',
        'commentaire',
    ];

    // Relations
    public function formateur()
    {
        return $this->belongsTo(Formateur::class, 'formateur_id');
    }

    public function demandeFormation()
    {
        return $this->hasOne(DemandeFormation::class, 'dossier_id');
    }
    
    // Alias pour compatibilité
    public function candidature()
    {
        return $this->demandeFormation();
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
        return $this->statut === 'refuse_definitif' || $this->statut === 'resubmit_requested';
    }

    public function isResubmitRequested()
    {
        return $this->statut === 'resubmit_requested';
    }

    public function isDefinitivelyRejected()
    {
        return $this->statut === 'refuse_definitif';
    }
}
