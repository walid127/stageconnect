<?php

namespace Database\Factories;

use App\Models\Message;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class MessageFactory extends Factory
{
    protected $model = Message::class;

    public function definition(): array
    {
        return [
            'expediteur_id' => User::factory(),
            'destinataire_id' => User::factory(),
            'sujet' => $this->faker->sentence(),
            'corps' => $this->faker->paragraph(),
            'lu_le' => null,
        ];
    }

    public function read()
    {
        return $this->state(function (array $attributes) {
            return [
                'lu_le' => now(),
            ];
        });
    }

    public function unread()
    {
        return $this->state(function (array $attributes) {
            return [
                'lu_le' => null,
            ];
        });
    }
}
