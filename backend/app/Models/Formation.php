<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Modèle Formation (Généralisé)
 * 
 * Classe de base pour tous les types de formations selon le diagramme UML.
 * Héritage: Formation optionnelle, formations_pedagogiques, formations_promotion
 */
class Formation extends Model
{
    use HasFactory;

    protected $table = 'formations';

    protected $fillable = [
        'type',
        'titre',
        'description',
        'date_deb',
        'date_fin',
        // Note: duree_hrs est maintenant dans formations_optionnelles selon le diagramme UML
        'lieu',
        'specialite_id',
        'statut',
        'cre_par',
    ];

    protected $casts = [
        'date_deb' => 'date',
        'date_fin' => 'date',
    ];

    // Relations
    public function createur()
    {
        return $this->belongsTo(User::class, 'cre_par');
    }

    public function specialite()
    {
        return $this->belongsTo(Specialiste::class, 'specialite_id');
    }

    // Relations CTI (Class Table Inheritance)
    public function formationOptionnelle()
    {
        return $this->hasOne(FormationOptionnelle::class, 'formation_id');
    }

    public function formationPedagogique()
    {
        return $this->hasOne(FormationPedagogique::class, 'formation_id');
    }

    public function formationPromotion()
    {
        return $this->hasOne(FormationPromotion::class, 'formation_id');
    }

    // Relations conditionnelles selon le type
    public function demandesFormation()
    {
        // Seulement pour les formations optionnelles
        // Note: Le filtre where sur 'type' ne fonctionne pas ici car 'type' est dans formations, pas dans demandes_de_formation
        // On filtre au niveau application dans les contrôleurs
        return $this->hasMany(DemandeFormation::class, 'formation_id');
    }
    
    // Alias pour compatibilité
    public function candidatures()
    {
        return $this->demandesFormation();
    }
    
    // Accessor pour obtenir les attributs spécifiques selon le type
    public function getPartMaxAttribute()
    {
        if ($this->isOptionnelle() && $this->relationLoaded('formationOptionnelle')) {
            return $this->formationOptionnelle->part_max ?? null;
        }
        return null;
    }

    public function getPrerequisAttribute()
    {
        if ($this->isOptionnelle() && $this->relationLoaded('formationOptionnelle')) {
            return $this->formationOptionnelle->prerequis ?? null;
        }
        return null;
    }

    public function getDureeHrsAttribute()
    {
        if ($this->isOptionnelle() && $this->relationLoaded('formationOptionnelle')) {
            return $this->formationOptionnelle->duree_hrs ?? null;
        }
        return null;
    }

    public function getFormateurIdAttribute()
    {
        if ($this->isPedagogique() && $this->relationLoaded('formationPedagogique')) {
            return $this->formationPedagogique->formateur_id ?? null;
        }
        if ($this->isPromotion() && $this->relationLoaded('formationPromotion')) {
            return $this->formationPromotion->formateur_id ?? null;
        }
        return null;
    }

    public function getTypePromotionAttribute()
    {
        if ($this->isPromotion() && $this->relationLoaded('formationPromotion')) {
            return $this->formationPromotion->type_promotion ?? null;
        }
        return null;
    }

    // Relation avec formateur (pour pédagogique et promotion)
    public function formateur()
    {
        if ($this->isPedagogique()) {
            return $this->hasOneThrough(Formateur::class, FormationPedagogique::class, 'formation_id', 'id', 'id', 'formateur_id');
        }
        if ($this->isPromotion()) {
            return $this->hasOneThrough(Formateur::class, FormationPromotion::class, 'formation_id', 'id', 'id', 'formateur_id');
        }
        return null;
    }

    public function emploisDuTemps()
    {
        return $this->hasMany(EmploiDuTemps::class, 'formation_id');
    }

    public function historique()
    {
        return $this->hasMany(HistoriqueFormation::class, 'formation_id');
    }

    public function diplomes()
    {
        return $this->hasMany(Diplome::class, 'formation_id');
    }

    // Helper methods pour déterminer le type
    public function isOptionnelle()
    {
        return $this->type === 'optionnelle';
    }
    
    public function isPedagogique()
    {
        return $this->type === 'pedagogique';
    }
    
    public function isPromotion()
    {
        return $this->type === 'promotion';
    }
    
    public function is5Years()
    {
        if ($this->isPromotion() && $this->relationLoaded('formationPromotion')) {
            return $this->formationPromotion->type_promotion === '5_ans';
        }
        return false;
    }
    
    public function is10Years()
    {
        if ($this->isPromotion() && $this->relationLoaded('formationPromotion')) {
            return $this->formationPromotion->type_promotion === '10_ans';
        }
        return false;
    }

    // Helper methods
    public function isActive()
    {
        if ($this->isOptionnelle()) {
            return $this->statut === 'en_cours';
        }
        return in_array($this->statut, ['en_attente', 'en_cours']);
    }
    
    public function isPending()
    {
        return in_array($this->type, ['pedagogique', 'promotion']) 
            && $this->statut === 'en_attente';
    }

    public function isFull()
    {
        // Seulement pour les formations optionnelles
        if (!$this->isOptionnelle()) {
            return false;
        }
        
        $this->load('formationOptionnelle');
        if (!$this->formationOptionnelle || !$this->formationOptionnelle->part_max) {
            return false;
        }
        
        return $this->formationOptionnelle->isFull();
    }

    public function remainingSlots()
    {
        // Seulement pour les formations optionnelles
        if (!$this->isOptionnelle()) {
            return null;
        }
        
        $this->load('formationOptionnelle');
        if (!$this->formationOptionnelle) {
            return null;
        }
        
        return $this->formationOptionnelle->remainingSlots();
    }
    
    // Scopes pour filtrer par type
    public function scopeOptionnelles($query)
    {
        return $query->where('type', 'optionnelle');
    }
    
    public function scopePedagogiques($query)
    {
        return $query->where('type', 'pedagogique');
    }
    
    public function scopePromotions($query)
    {
        return $query->where('type', 'promotion');
    }

    /**
     * Vérifie et met à jour automatiquement le statut si la date de fin est dépassée
     */
    public function checkAndUpdateStatus()
    {
        if ($this->isOptionnelle()) {
            if ($this->statut === 'en_cours' && $this->date_fin && $this->date_fin->isPast()) {
                $this->update(['statut' => 'termine']);
                return true;
            }
        } else {
            // Pédagogique ou Promotion
            if (in_array($this->statut, ['en_attente', 'en_cours']) 
                && $this->date_fin && $this->date_fin->isPast()) {
                $this->update(['statut' => 'termine']);
                return true;
            }
        }
        return false;
    }
}

