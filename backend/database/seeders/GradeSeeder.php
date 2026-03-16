<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GradeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $grades = [
            [
                'code' => 'prof_form_pro',
                'nom' => 'professeur de formation professionnelle',
                'description' => 'Professeur de formation professionnelle nécessitant une formation pédagogique',
            ],
            [
                'code' => 'prof_spec_form_pro',
                'nom' => 'professeur spécialisé en formation professionnelle',
                'description' => 'Professeur spécialisé en formation professionnelle',
            ],
            [
                'code' => 'prof_resp_genie_ped',
                'nom' => 'professeur responsable du génie pédagogique',
                'description' => 'Professeur responsable du génie pédagogique',
            ],
        ];

        foreach ($grades as $grade) {
            DB::table('grades')->insert(array_merge($grade, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
