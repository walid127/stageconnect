<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Diplome extends Model
{
    use HasFactory;

    protected $table = 'diplomes';

    protected $fillable = [
        'formation_id',
        'formateur_id',
        'titre',
        'fichier_diplome',
        'num_diplome',
        'date_deliv',
        'notes',
        'ann_adm',
        'ref_decision',
        'deliv_par',
    ];

    protected $casts = [
        'date_deliv' => 'date',
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

    public function delivrant()
    {
        return $this->belongsTo(User::class, 'deliv_par');
    }

    // Helper methods
    public function hasFile()
    {
        return !empty($this->fichier_diplome);
    }

    // Accessor pour obtenir l'URL complète du fichier
    public function getFichierDiplomeUrlAttribute()
    {
        if (!$this->fichier_diplome) {
            return null;
        }

        return Storage::disk('public')->url($this->fichier_diplome);
    }
}

