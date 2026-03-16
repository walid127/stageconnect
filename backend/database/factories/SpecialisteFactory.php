<?php

namespace Database\Factories;

use App\Models\Specialiste;
use Illuminate\Database\Eloquent\Factories\Factory;

class SpecialisteFactory extends Factory
{
    protected $model = Specialiste::class;

    public function definition(): array
    {
        return [
            'nom' => $this->faker->words(2, true),
            'categorie' => $this->faker->randomElement(['Informatique', 'Gestion', 'Langues', 'Sciences']),
        ];
    }
}
