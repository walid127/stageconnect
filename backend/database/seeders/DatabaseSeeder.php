<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Call other seeders
        $this->call([
            SpecialistSeeder::class, // Must run first to create specialites
            GradeSeeder::class, // Must run before creating formateurs
            AdminSeeder::class,
            TrainingSeeder::class,
            TrainingHistorySeeder::class,
            EmploiDuTempsSeeder::class,
        ]);
    }
}
