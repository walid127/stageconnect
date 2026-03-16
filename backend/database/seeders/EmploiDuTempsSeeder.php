<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\EmploiDuTemps;

class EmploiDuTempsSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $currentYear = now()->year;
        $samples = [
            [
                'annee_scolaire' => $currentYear,
                'etablissement'  => 'Institut Supérieur StageConnect',
                'departement'    => 'Informatique',
                'specialite'     => 'Développement Web',
                'fichier'        => 'emplois/2025-2026/edt_dev_web.pdf',
            ],
            [
                'annee_scolaire' => $currentYear,
                'etablissement'  => 'Institut Supérieur StageConnect',
                'departement'    => 'Informatique',
                'specialite'     => 'Réseaux & Systèmes',
                'fichier'        => 'emplois/2025-2026/edt_reseaux.pdf',
            ],
            [
                'annee_scolaire' => $currentYear - 1,
                'etablissement'  => 'Institut Supérieur StageConnect',
                'departement'    => 'Management',
                'specialite'     => 'Gestion de Projet',
                'fichier'        => 'emplois/2024-2025/edt_gestion_projet.pdf',
            ],
        ];

        foreach ($samples as $data) {
            EmploiDuTemps::create($data);
        }

        $this->command->info(count($samples) . ' emplois du temps créés avec succès.');
    }
}

