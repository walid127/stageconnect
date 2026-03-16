<?php

namespace Database\Factories;

use App\Models\Formation;
use App\Models\FormationOptionnelle;
use Illuminate\Database\Eloquent\Factories\Factory;

class FormationOptionnelleFactory extends Factory
{
    protected $model = FormationOptionnelle::class;

    public function definition(): array
    {
        return [
            'formation_id' => Formation::factory(),
            'duree_hrs' => $this->faker->numberBetween(20, 100),
            'part_max' => $this->faker->numberBetween(10, 50),
            'prerequis' => $this->faker->optional()->paragraph(),
        ];
    }
}
