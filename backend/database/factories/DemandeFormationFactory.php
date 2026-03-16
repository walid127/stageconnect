<?php

namespace Database\Factories;

use App\Models\DemandeFormation;
use App\Models\Formation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class DemandeFormationFactory extends Factory
{
    protected $model = DemandeFormation::class;

    public function definition(): array
    {
        return [
            'formation_id' => Formation::factory(),
            'formateur_id' => User::factory(),
            'statut' => 'en_attente',
            'date_demande' => now(),
        ];
    }

    public function accepte()
    {
        return $this->state(function (array $attributes) {
            return [
                'statut' => 'accepte',
            ];
        });
    }

    public function refuse()
    {
        return $this->state(function (array $attributes) {
            return [
                'statut' => 'refuse',
            ];
        });
    }
}
