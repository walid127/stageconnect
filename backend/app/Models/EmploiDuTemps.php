<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmploiDuTemps extends Model
{
    use HasFactory;

    protected $table = 'emplois_du_temps';

    protected $fillable = [
        // Métadonnées académiques
        'annee_scolaire',
        'etablissement',
        'departement',
        'specialite',
        // Fichier
        'fichier',
        // Colonnes de liaison existantes dans l'app
        'type',
        'formateur_id',
        'demande_formation_id',
        'formation_id',
        'uploaded_by',
    ];

    // Relations
    public function formateur()
    {
        return $this->belongsTo(Formateur::class, 'formateur_id');
    }

    public function demandeFormation()
    {
        return $this->belongsTo(DemandeFormation::class, 'demande_formation_id');
    }

    public function formation()
    {
        return $this->belongsTo(Formation::class, 'formation_id');
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
