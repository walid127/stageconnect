<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FormationPedagogique extends Model
{
    use HasFactory;

    protected $table = 'formations_pedagogiques';

    protected $fillable = [
        'formation_id',
        'formateur_id',
    ];


    // Relation avec la classe de base (CTI)
    public function formation()
    {
        return $this->belongsTo(Formation::class, 'formation_id');
    }

    // Relations
    public function formateur()
    {
        return $this->belongsTo(Formateur::class, 'formateur_id');
    }

    public function diplomes()
    {
        return $this->hasMany(Diplome::class, 'formation_id');
    }

    // Helper methods
    public function isPending()
    {
        $this->load('formation');
        return $this->formation?->statut === 'en_attente';
    }

    public function isInProgress()
    {
        $this->load('formation');
        return $this->formation?->statut === 'en_cours';
    }

    public function isCompleted()
    {
        $this->load('formation');
        return $this->formation?->statut === 'termine';
    }

    /**
     * Vérifie et met à jour automatiquement le statut si la date de fin est dépassée
     */
    public function checkAndUpdateStatus()
    {
        $this->load('formation');
        if ($this->formation && in_array($this->formation->statut, ['en_attente', 'en_cours']) 
            && $this->formation->date_fin && $this->formation->date_fin->isPast()) {
            $this->formation->update(['statut' => 'termine']);
            return true;
        }
        return false;
    }
}
