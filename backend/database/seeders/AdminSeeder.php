<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Specialiste;
use App\Models\Grade;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Créer l'utilisateur admin avec toutes les informations
        $admin = User::firstOrCreate(
            ['email' => 'admin@stageconnect.com'],
            [
                'nom' => 'Mohammed Alami',
                'mdp' => Hash::make('password123'),
                'telephone' => '+212612345678',
                'role' => 'admin',
                'statut' => 'actif',
            ]
        );

        // Créer le premier formateur avec toutes les informations
        $formateur1 = User::firstOrCreate(
            ['email' => 'ahmed.benali@stageconnect.com'],
            [
                'nom' => 'Ahmed Benali',
                'mdp' => Hash::make('password123'),
                'telephone' => '+212611111111',
                'role' => 'formateur',
                'statut' => 'actif',
            ]
        );

        if (!$formateur1->formateur) {
            $specialite1 = Specialiste::where('nom', 'Développement Web')->first();
            $grade1 = Grade::where('nom', 'Professeur Formateur Professionnel')->first();
            if ($specialite1 && $grade1) {
                $formateur1->formateur()->create([
                    'id_formateur' => 'FORM-001',
                    'nom' => 'Ahmed Benali',
                    'grade_id' => $grade1->id,
                    'specialite_id' => $specialite1->id,
                    'biographie' => 'Formateur expérimenté en développement web et mobile avec plus de 8 ans d\'expérience. Spécialisé en React, Node.js, et architectures modernes. Passionné par l\'enseignement et le partage de connaissances.',
                    'institution' => 'Université Mohammed V - Rabat',
                    'annees_exp' => 8,
                    'diplome' => 'Master en Génie Informatique',
                    'ville' => 'Rabat',
                    'date_insc' => now()->subYears(3)->format('Y-m-d'),
                ]);
            }
        }

        // Créer le deuxième formateur avec toutes les informations
        $formateur2 = User::firstOrCreate(
            ['email' => 'fatima.alami@stageconnect.com'],
            [
                'nom' => 'Fatima Alami',
                'mdp' => Hash::make('password123'),
                'telephone' => '+212622222222',
                'role' => 'formateur',
                'statut' => 'actif',
            ]
        );

        if (!$formateur2->formateur) {
            $specialite2 = Specialiste::where('nom', 'Data Science')->first();
            $grade2 = Grade::where('nom', 'Professeur Spécialisé Formateur Professionnel')->first();
            if ($specialite2 && $grade2) {
                $formateur2->formateur()->create([
                    'id_formateur' => 'FORM-002',
                    'nom' => 'Fatima Alami',
                    'grade_id' => $grade2->id,
                    'specialite_id' => $specialite2->id,
                    'biographie' => 'Docteure en Intelligence Artificielle et Data Science. Plus de 12 ans d\'expérience dans l\'enseignement supérieur et la recherche. Expert en Machine Learning, Deep Learning et analyse de données.',
                    'institution' => 'École Nationale Supérieure d\'Informatique - Rabat',
                    'annees_exp' => 12,
                    'diplome' => 'Doctorat en Intelligence Artificielle',
                    'ville' => 'Casablanca',
                    'date_insc' => now()->subYears(5)->format('Y-m-d'),
                ]);
            }
        }

        // Créer le troisième formateur avec toutes les informations
        $formateur3 = User::firstOrCreate(
            ['email' => 'youssef.idrissi@stageconnect.com'],
            [
                'nom' => 'Youssef Idrissi',
                'mdp' => Hash::make('password123'),
                'telephone' => '+212633333333',
                'role' => 'formateur',
                'statut' => 'actif',
            ]
        );

        if (!$formateur3->formateur) {
            $specialite3 = Specialiste::where('nom', 'Cybersécurité')->first();
            $grade3 = Grade::where('nom', 'Professeur Responsable Génie Pédagogique')->first();
            if ($specialite3 && $grade3) {
                $formateur3->formateur()->create([
                    'id_formateur' => 'FORM-003',
                    'nom' => 'Youssef Idrissi',
                    'grade_id' => $grade3->id,
                    'specialite_id' => $specialite3->id,
                    'biographie' => 'Expert en cybersécurité et sécurité des systèmes d\'information. Certifié CISSP et CEH. Plus de 10 ans d\'expérience dans la protection des infrastructures critiques et la formation en sécurité informatique.',
                    'institution' => 'Institut Supérieur de Commerce et d\'Administration des Entreprises - Casablanca',
                    'annees_exp' => 10,
                    'diplome' => 'Master en Sécurité des Systèmes d\'Information',
                    'ville' => 'Marrakech',
                    'date_insc' => now()->subMonths(6)->format('Y-m-d'),
                ]);
            }
        }

        // Créer un compte gestionaire
        $gestionaire = User::firstOrCreate(
            ['email' => 'gestionaire@stageconnect.com'],
            [
                'nom' => 'Sara Bennani',
                'mdp' => Hash::make('password123'),
                'telephone' => '+212644444444',
                'role' => 'gestionaire',
                'statut' => 'actif',
            ]
        );

        echo "✅ Base de données réinitialisée avec succès!\n\n";
        echo "👤 ADMIN:\n";
        echo "   📧 Email: admin@stageconnect.com\n";
        echo "   🔑 Mot de passe: password123\n";
        echo "   👤 Nom: Mohammed Alami\n";
        echo "   📞 Téléphone: +212612345678\n\n";
        echo "👩‍💼 GESTIONAIRE:\n";
        echo "   📧 Email: gestionaire@stageconnect.com\n";
        echo "   🔑 Mot de passe: password123\n";
        echo "   👤 Nom: Sara Bennani\n";
        echo "   📞 Téléphone: +212644444444\n\n";
        echo "👨‍🏫 FORMATEUR 1:\n";
        echo "   📧 Email: ahmed.benali@stageconnect.com\n";
        echo "   🔑 Mot de passe: password123\n";
        echo "   👤 Nom: Ahmed Benali\n";
        echo "   🆔 ID: FORM-001\n";
        echo "   📚 Spécialité: Développement Web\n";
        echo "   🎓 Grade: professeur de formation professionnelle\n\n";
        echo "👩‍🏫 FORMATEUR 2:\n";
        echo "   📧 Email: fatima.alami@stageconnect.com\n";
        echo "   🔑 Mot de passe: password123\n";
        echo "   👤 Nom: Fatima Alami\n";
        echo "   🆔 ID: FORM-002\n";
        echo "   📚 Spécialité: Data Science\n";
        echo "   🎓 Grade: professeur spécialisé en formation professionnelle\n\n";
        echo "👨‍🏫 FORMATEUR 3:\n";
        echo "   📧 Email: youssef.idrissi@stageconnect.com\n";
        echo "   🔑 Mot de passe: password123\n";
        echo "   👤 Nom: Youssef Idrissi\n";
        echo "   🆔 ID: FORM-003\n";
        echo "   📚 Spécialité: Cybersécurité\n";
        echo "   🎓 Grade: professeur responsable du génie pédagogique\n";
    }
}
