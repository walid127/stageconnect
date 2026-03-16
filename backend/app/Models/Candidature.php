<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Candidature extends Model
{
    use HasFactory;

    protected $table = 'candidatures';

    protected $fillable = [
        'formation_id',
        'formateur_id',
        'statut',
        'date_cand',
        'dossier_id',
    ];

    protected $casts = [
        'date_cand' => 'date',
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

    // Relation avec l'emploi du temps
    public function emploiDuTemps()
    {
        return $this->hasOne(EmploiDuTemps::class, 'candidature_id');
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
}

