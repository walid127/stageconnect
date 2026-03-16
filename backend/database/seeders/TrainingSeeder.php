<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Formation;
use App\Models\FormationOptionnelle;
use App\Models\User;
use App\Models\Specialiste;

class TrainingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Obtenir quelques spécialistes pour les formations
        $specialists = Specialiste::all();
        
        if ($specialists->isEmpty()) {
            $this->command->warn('Aucun spécialiste actif trouvé. Veuillez exécuter SpecialistSeeder d\'abord.');
            return;
        }

        // Obtenir quelques utilisateurs formateurs
        $trainers = User::where('role', 'formateur')->get();
        
        if ($trainers->isEmpty()) {
            $this->command->warn('Aucun utilisateur formateur trouvé. Veuillez créer des comptes formateur d\'abord.');
            return;
        }

        $trainings = [
            [
                'titre' => 'Formation React Avancé',
                'description' => 'Formation complète sur React avec hooks, context, et patterns avancés. Apprenez à créer des applications React performantes et maintenables.',
                'specialite_id' => $specialists->where('nom', 'Développement Web')->first()?->id ?? $specialists->first()->id,
                'duree_hrs' => 40,
                'part_max' => 15,
                'date_deb' => now()->addDays(30),
                'date_fin' => now()->addDays(37),
                'lieu' => 'Paris, France',
                'statut' => 'actif',
                'cre_par' => $trainers->first()->id,
                'prerequis' => 'Connaissances de base en JavaScript et HTML/CSS'
            ],
            [
                'titre' => 'Laravel Backend Development',
                'description' => 'Formation complète sur le framework Laravel pour le développement backend. APIs, authentification, bases de données.',
                'specialite_id' => $specialists->where('nom', 'Développement Web')->first()?->id ?? $specialists->first()->id,
                'duree_hrs' => 35,
                'part_max' => 12,
                'date_deb' => now()->addDays(45),
                'date_fin' => now()->addDays(52),
                'lieu' => 'Lyon, France',
                'statut' => 'actif',
                'cre_par' => $trainers->count() > 1 ? $trainers->skip(1)->first()->id : $trainers->first()->id,
                'prerequis' => 'Connaissances de base en PHP et bases de données'
            ],
            [
                'titre' => 'UI/UX Design Fundamentals',
                'description' => 'Apprenez les principes fondamentaux du design d\'interface utilisateur et d\'expérience utilisateur.',
                'specialite_id' => $specialists->where('nom', 'Design Graphique')->first()?->id ?? $specialists->first()->id,
                'duree_hrs' => 25,
                'part_max' => 20,
                'date_deb' => now()->addDays(60),
                'date_fin' => now()->addDays(67),
                'lieu' => 'Marseille, France',
                'statut' => 'actif',
                'cre_par' => $trainers->first()->id,
                'prerequis' => 'Aucun prérequis technique'
            ],
            [
                'titre' => 'Data Science avec Python',
                'description' => 'Formation complète en science des données avec Python, pandas, numpy, et machine learning.',
                'specialite_id' => $specialists->where('nom', 'Data Science')->first()?->id ?? $specialists->first()->id,
                'duree_hrs' => 50,
                'part_max' => 10,
                'date_deb' => now()->addDays(75),
                'date_fin' => now()->addDays(89),
                'lieu' => 'Toulouse, France',
                'statut' => 'actif',
                'cre_par' => $trainers->count() > 2 ? $trainers->skip(2)->first()->id : $trainers->first()->id,
                'prerequis' => 'Connaissances de base en Python et mathématiques'
            ],
            [
                'titre' => 'Cybersécurité pour Développeurs',
                'description' => 'Formation sur les bonnes pratiques de sécurité en développement web et applications.',
                'specialite_id' => $specialists->where('nom', 'Cybersécurité')->first()?->id ?? $specialists->first()->id,
                'duree_hrs' => 30,
                'part_max' => 15,
                'date_deb' => now()->addDays(100),
                'date_fin' => now()->addDays(107),
                'lieu' => 'Nantes, France',
                'statut' => 'actif',
                'cre_par' => $trainers->first()->id,
                'prerequis' => 'Connaissances en développement web'
            ],
            [
                'titre' => 'Gestion de Projet Agile',
                'description' => 'Formation sur les pratiques DevOps, déploiement continu et automatisation.',
                'specialite_id' => $specialists->where('nom', 'Gestion de Projet')->first()?->id ?? $specialists->first()->id,
                'duree_hrs' => 40,
                'part_max' => 12,
                'date_deb' => now()->addDays(120),
                'date_fin' => now()->addDays(127),
                'lieu' => 'Bordeaux, France',
                'statut' => 'actif',
                'cre_par' => $trainers->count() > 1 ? $trainers->skip(1)->first()->id : $trainers->first()->id,
                'prerequis' => 'Connaissances de base en Linux et développement'
            ],
            [
                'titre' => 'Mobile App Development React Native',
                'description' => 'Développement d\'applications mobiles cross-platform avec React Native.',
                'specialite_id' => $specialists->where('nom', 'Développement Mobile')->first()?->id ?? $specialists->first()->id,
                'duree_hrs' => 45,
                'part_max' => 18,
                'date_deb' => now()->addDays(140),
                'date_fin' => now()->addDays(154),
                'lieu' => 'Lille, France',
                'statut' => 'actif',
                'cre_par' => $trainers->first()->id,
                'prerequis' => 'Connaissances de base en JavaScript et React'
            ],
            [
                'titre' => 'Marketing Digital Avancé',
                'description' => 'Formation complète sur les stratégies de marketing digital et réseaux sociaux.',
                'specialite_id' => $specialists->where('nom', 'Marketing Digital')->first()?->id ?? $specialists->first()->id,
                'duree_hrs' => 35,
                'part_max' => 14,
                'date_deb' => now()->addDays(160),
                'date_fin' => now()->addDays(167),
                'lieu' => 'Strasbourg, France',
                'statut' => 'actif',
                'cre_par' => $trainers->count() > 2 ? $trainers->skip(2)->first()->id : $trainers->first()->id,
                'prerequis' => 'Connaissances de base en marketing'
            ]
        ];

        foreach ($trainings as $trainingData) {
            // Extraire les données spécifiques à la formation optionnelle
            $optionnelleData = [
                'duree_hrs' => $trainingData['duree_hrs'],
                'part_max'  => $trainingData['part_max'],
                'prerequis' => $trainingData['prerequis'],
            ];

            // Données de base pour la table formations
            $formationData = [
                'type'         => 'optionnelle',
                'titre'        => $trainingData['titre'],
                'description'  => $trainingData['description'],
                'date_deb'     => $trainingData['date_deb'],
                'date_fin'     => $trainingData['date_fin'],
                'lieu'         => $trainingData['lieu'],
                'statut'       => $trainingData['statut'] === 'actif' ? 'en_cours' : $trainingData['statut'],
                'cre_par'      => $trainingData['cre_par'],
                'specialite_id'=> $trainingData['specialite_id'],
            ];

            $formation = Formation::create($formationData);

            FormationOptionnelle::create(array_merge($optionnelleData, [
                'formation_id' => $formation->id,
            ]));
        }

        $this->command->info(count($trainings) . ' sessions de formation créées avec succès !');
    }
}