<?php

namespace Database\Factories;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class NotificationFactory extends Factory
{
    protected $model = Notification::class;

    public function definition(): array
    {
        return [
            'utilisateur_id' => User::factory(),
            'type' => 'application_created',
            'titre' => $this->faker->sentence(),
            'message' => $this->faker->paragraph(),
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
