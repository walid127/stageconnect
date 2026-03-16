<?php

namespace Database\Factories;

use App\Models\Formation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class FormationFactory extends Factory
{
    protected $model = Formation::class;

    public function definition(): array
    {
        return [
            'type' => 'optionnelle',
            'titre' => $this->faker->sentence(4),
            'description' => $this->faker->paragraph(),
            'date_deb' => $this->faker->dateTimeBetween('now', '+1 month'),
            'date_fin' => $this->faker->dateTimeBetween('+1 month', '+2 months'),
            'lieu' => $this->faker->city(),
            'statut' => 'en_cours',
            'cre_par' => User::factory(),
        ];
    }

    public function optionnelle()
    {
        return $this->state(function (array $attributes) {
            return [
                'type' => 'optionnelle',
            ];
        });
    }

    public function pedagogique()
    {
        return $this->state(function (array $attributes) {
            return [
                'type' => 'pedagogique',
            ];
        });
    }

    public function promotion()
    {
        return $this->state(function (array $attributes) {
            return [
                'type' => 'promotion',
            ];
        });
    }
}
