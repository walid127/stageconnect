<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Specialiste extends Model
{
    use HasFactory;

    protected $table = 'specialites';

    protected $fillable = [
        'nom',
        'description',
        'is_active',
    ];

    // Relations
    public function formateurs()
    {
        return $this->hasMany(Formateur::class, 'specialite_id');
    }

    public function formations()
    {
        return $this->hasMany(Formation::class, 'specialite_id');
    }

}

