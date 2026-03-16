<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HistoriqueFormation extends Model
{
    use HasFactory;
    
    protected $table = 'historique_formations';

    protected $fillable = [
        'formateur_id',
        'formation_id',
        'date_comp',
        'url_cert',
        'note',
        'commentaire',
        'action',
        'description',
        'anc_valeur',
        'nv_valeur',
        'titre_form',
        'utilisateur_id',
    ];

    protected $casts = [
        'date_comp' => 'date',
    ];

    // Relations
    public function formateur()
    {
        return $this->belongsTo(User::class, 'formateur_id');
    }

    public function formation()
    {
        return $this->belongsTo(Formation::class, 'formation_id');
    }

    public function utilisateur()
    {
        return $this->belongsTo(User::class, 'utilisateur_id');
    }
}

