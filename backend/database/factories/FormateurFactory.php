<?php

namespace Database\Factories;

use App\Models\Formateur;
use App\Models\User;
use App\Models\Specialiste;
use Illuminate\Database\Eloquent\Factories\Factory;

class FormateurFactory extends Factory
{
    protected $model = Formateur::class;

    public function definition(): array
    {
        return [
            'utilisateur_id' => User::factory(),
            'id_formateur' => $this->faker->unique()->numerify('FORM####'),
            'nom' => $this->faker->name(),
            'specialite_id' => Specialiste::factory(),
        ];
    }
}
