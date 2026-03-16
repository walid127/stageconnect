<?php

namespace Database\Factories;

use App\Models\Dossier;
use App\Models\Formateur;
use Illuminate\Database\Eloquent\Factories\Factory;

class DossierFactory extends Factory
{
    protected $model = Dossier::class;

    public function definition(): array
    {
        return [
            'formateur_id' => Formateur::factory(),
            'fichier' => 'dossiers/test.pdf',
            'statut' => 'en_attente',
        ];
    }

    public function accepted()
    {
        return $this->state(function (array $attributes) {
            return [
                'statut' => 'accepte',
            ];
        });
    }

    public function rejected()
    {
        return $this->state(function (array $attributes) {
            return [
                'statut' => 'refuse',
            ];
        });
    }
}
