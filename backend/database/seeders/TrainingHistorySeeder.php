<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\HistoriqueFormation;
use App\Models\User;
use App\Models\Formation;

class TrainingHistorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Obtenir un utilisateur formateur
        $formateur = User::where('role', 'formateur')->first();
        
        if (!$formateur) {
            $this->command->info('Aucun utilisateur formateur trouvé. Veuillez en créer un d\'abord.');
            return;
        }

        // Obtenir quelques formations
        $trainings = Formation::limit(3)->get();

        if ($trainings->isEmpty()) {
            $this->command->info('Aucune formation trouvée. Veuillez créer des formations d\'abord.');
            return;
        }

        // Créer des enregistrements d'historique d'exemple
        $historyRecords = [
            [
                'utilisateur_id' => $formateur->id,
                'formateur_id' => $formateur->id,
                'formation_id' => $trainings->first()->id,
                'date_comp' => now()->addDays(30),
                'action' => 'application_submitted',
                'description' => 'Demande de formation envoyée pour la formation',
                'titre_form' => $trainings->first()->titre,
                'created_at' => now()->subDays(3),
            ],
            [
                'utilisateur_id' => $formateur->id,
                'formateur_id' => $formateur->id,
                'formation_id' => $trainings->first()->id,
                'date_comp' => now()->addDays(30),
                'action' => 'application_accepted',
                'description' => 'Demande de formation acceptée pour la formation',
                'titre_form' => $trainings->first()->titre,
                'created_at' => now()->subDays(2),
            ],
            [
                'utilisateur_id' => $formateur->id,
                'formateur_id' => $formateur->id,
                'formation_id' => $trainings->skip(1)->first()->id ?? $trainings->first()->id,
                'date_comp' => now()->addDays(30),
                'action' => 'application_submitted',
                'description' => 'Demande de formation envoyée pour la formation',
                'titre_form' => $trainings->skip(1)->first()->titre ?? $trainings->first()->titre,
                'created_at' => now()->subDays(1),
            ],
            [
                'utilisateur_id' => $formateur->id,
                'formateur_id' => $formateur->id,
                'formation_id' => $trainings->first()->id,
                'date_comp' => now()->addDays(30),
                'action' => 'profile_updated',
                'description' => 'Profil mis à jour',
                'anc_valeur' => 'Ancienne spécialité',
                'nv_valeur' => 'Nouvelle spécialité',
                'created_at' => now()->subHours(6),
            ],
        ];

        foreach ($historyRecords as $record) {
            HistoriqueFormation::create($record);
        }

        $this->command->info('Historique des formations peuplé avec succès !');
    }
}
