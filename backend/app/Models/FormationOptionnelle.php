<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Modèle FormationOptionnelle
 * Class Table Inheritance (CTI) - Sous-classe de Formation
 */
class FormationOptionnelle extends Model
{
    use HasFactory;

    protected $table = 'formations_optionnelles';

    protected $fillable = [
        'formation_id',
        'duree_hrs',
        'part_max',
        'prerequis',
    ];

    // Relation avec la classe de base (CTI)
    public function formation()
    {
        return $this->belongsTo(Formation::class, 'formation_id');
    }

    // Helper methods
    public function isFull()
    {
        $acceptedApplications = $this->formation->demandesFormation()
            ->where('statut', 'accepte')
            ->count();
        return $acceptedApplications >= $this->part_max;
    }

    public function remainingSlots()
    {
        $acceptedApplications = $this->formation->demandesFormation()
            ->where('statut', 'accepte')
            ->count();
        return max(0, $this->part_max - $acceptedApplications);
    }
}
