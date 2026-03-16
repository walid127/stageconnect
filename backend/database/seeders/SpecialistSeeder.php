<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Specialiste;

class SpecialistSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $specialists = [
            [
                'nom' => 'Développement Web',
                'description' => 'Création et maintenance de sites web et applications web',
            ],
            [
                'nom' => 'Développement Mobile',
                'description' => 'Développement d\'applications mobiles iOS et Android',
            ],
            [
                'nom' => 'Data Science',
                'description' => 'Analyse de données et intelligence artificielle',
            ],
            [
                'nom' => 'Cybersécurité',
                'description' => 'Protection des systèmes informatiques et des données',
            ],
            [
                'nom' => 'Marketing Digital',
                'description' => 'Stratégies de marketing en ligne et réseaux sociaux',
            ],
            [
                'nom' => 'Gestion de Projet',
                'description' => 'Planification et coordination de projets',
            ],
            [
                'nom' => 'Comptabilité',
                'description' => 'Gestion financière et comptable',
            ],
            [
                'nom' => 'Ressources Humaines',
                'description' => 'Gestion du personnel et développement des talents',
            ],
            [
                'nom' => 'Design Graphique',
                'description' => 'Création visuelle et communication graphique',
            ],
            [
                'nom' => 'Langues Étrangères',
                'description' => 'Enseignement des langues étrangères',
            ]
        ];

        foreach ($specialists as $specialist) {
            Specialiste::firstOrCreate(
                ['nom' => $specialist['nom']],
                $specialist
            );
        }
    }
}
