<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'nom',
        'email',
        'mdp',
        'role',
        'statut',
        'telephone',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'mdp',
        'remember_token',
    ];

    /**
     * Get the password attribute for authentication.
     * Laravel's authentication expects 'password' attribute
     */
    public function getAuthPassword()
    {
        return $this->mdp;
    }

    /**
     * Get the name attribute (for backward compatibility)
     */
    public function getNameAttribute()
    {
        return $this->attributes['nom'] ?? null;
    }

    /**
     * Set the name attribute (for backward compatibility)
     */
    public function setNameAttribute($value)
    {
        $this->attributes['nom'] = $value;
    }

    /**
     * Get the password attribute (for backward compatibility)
     */
    public function getPasswordAttribute()
    {
        return $this->attributes['mdp'] ?? null;
    }

    /**
     * Set the password attribute (for backward compatibility)
     */
    public function setPasswordAttribute($value)
    {
        $this->attributes['mdp'] = $value;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'mdp' => 'hashed',
        ];
    }

    // Relations
    public function formateur()
    {
        return $this->hasOne(Formateur::class, 'utilisateur_id');
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

    public function notifications()
    {
        return $this->hasMany(Notification::class, 'utilisateur_id');
    }

    public function messagesEnvoyes()
    {
        return $this->hasMany(Message::class, 'expediteur_id');
    }

    public function messagesRecus()
    {
        return $this->hasMany(Message::class, 'destinataire_id');
    }

    public function historiqueFormations()
    {
        return $this->hasMany(HistoriqueFormation::class, 'formateur_id');
    }

    public function diplomes()
    {
        return $this->hasMany(Diplome::class, 'formateur_id');
    }

    public function diplomesDelivres()
    {
        return $this->hasMany(Diplome::class, 'deliv_par');
    }

    // Helper methods
    public function isAdmin()
    {
        return $this->role === 'admin';
    }

    public function isFormateur()
    {
        return $this->role === 'formateur';
    }

    public function isGestionaire()
    {
        return $this->role === 'gestionaire';
    }

    // Check if user is admin or gestionaire (both have administrative privileges)
    public function isAdminOrGestionaire()
    {
        return $this->role === 'admin' || $this->role === 'gestionaire';
    }
}
