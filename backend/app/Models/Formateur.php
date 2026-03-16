<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Formateur extends Model
{
    use HasFactory;

    protected $table = 'formateurs';

    protected $fillable = [
        'utilisateur_id',
        'specialite_id',
        'grade_id',
        'id_formateur',
        'nom',
        'biographie',
        'institution',
        'annees_exp',
        'diplome',
        'ville',
        'date_insc',
    ];

    protected $casts = [
        'date_insc' => 'date',
    ];

    // Ajouter identifiant_formateur aux attributs JSON
    protected $appends = ['identifiant_formateur'];

    // Accessor pour mapper id_formateur à identifiant_formateur pour la compatibilité avec le frontend
    public function getIdentifiantFormateurAttribute()
    {
        return $this->id_formateur;
    }

    // Relations
    public function utilisateur()
    {
        return $this->belongsTo(User::class, 'utilisateur_id');
    }

    public function specialite()
    {
        return $this->belongsTo(Specialiste::class, 'specialite_id');
    }

    public function grade()
    {
        return $this->belongsTo(Grade::class, 'grade_id');
    }

    public function demandesFormation()
    {
        return $this->hasMany(DemandeFormation::class, 'formateur_id');
    }
    
    // Alias pour compatibilité
    public function candidatures()
    {
        return $this->demandesFormation();
    }

    // Relations avec les emplois du temps
    public function emploisDuTemps()
    {
        return $this->hasMany(EmploiDuTemps::class, 'formateur_id');
    }

    public function edtPedagogique()
    {
        return $this->hasMany(EmploiDuTemps::class, 'formateur_id')
            ->where('type', 'pedagogique');
    }

    public function edtPromotion()
    {
        return $this->hasMany(EmploiDuTemps::class, 'formateur_id')
            ->where('type', 'promotion');
    }

    // Relations avec les dossiers
    public function dossiers()
    {
        return $this->hasMany(Dossier::class, 'formateur_id');
    }

    // Relations avec les formations (CTI)
    public function formationPedagogique()
    {
        return $this->hasOne(FormationPedagogique::class, 'formateur_id')
            ->with('formation');
    }

    public function formationsPromotion()
    {
        return $this->hasMany(FormationPromotion::class, 'formateur_id')
            ->with('formation');
    }

    public function promotion5Ans()
    {
        return $this->hasOne(FormationPromotion::class, 'formateur_id')
            ->where('type_promotion', '5_ans')
            ->with('formation');
    }

    public function promotion10Ans()
    {
        return $this->hasOne(FormationPromotion::class, 'formateur_id')
            ->where('type_promotion', '10_ans')
            ->with('formation');
    }
}

