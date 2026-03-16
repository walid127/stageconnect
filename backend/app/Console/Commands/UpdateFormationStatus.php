<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Formation;
use App\Models\FormationPedagogique;
use App\Models\FormationPromotion;
use Illuminate\Support\Facades\Log;

class UpdateFormationStatus extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'formations:update-status';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Met à jour automatiquement le statut des formations à "terminé" si la date de fin est dépassée';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $today = now()->toDateString();
        $updatedCount = 0;

        // 1. Formations
        $regularFormations = Formation::where('statut', 'en_cours')
            ->whereNotNull('date_fin')
            ->where('date_fin', '<', $today)
            ->get();

        foreach ($regularFormations as $formation) {
            $formation->update(['statut' => 'termine']);
            $updatedCount++;
            Log::info("Formation régulière terminée automatiquement", [
                'formation_id' => $formation->id,
                'titre' => $formation->titre,
                'date_fin' => $formation->date_fin
            ]);
        }

        // 2. Formations Pédagogiques
        $pedagogicalFormations = FormationPedagogique::where('statut', 'en_cours')
            ->whereNotNull('date_fin')
            ->where('date_fin', '<', $today)
            ->get();

        foreach ($pedagogicalFormations as $formation) {
            $formation->update(['statut' => 'termine']);
            $updatedCount++;
            Log::info("Formation pédagogique terminée automatiquement", [
                'formation_id' => $formation->id,
                'formateur_id' => $formation->formateur_id,
                'date_fin' => $formation->date_fin
            ]);
        }

        // 3. Formations Promotion (PSP1 et PSP2)
        $promotionFormations = FormationPromotion::whereIn('statut', ['en_attente', 'en_cours'])
            ->whereNotNull('date_fin')
            ->where('date_fin', '<', $today)
            ->get();

        foreach ($promotionFormations as $formation) {
            $formation->update(['statut' => 'termine']);
            $updatedCount++;
            Log::info("Formation promotion terminée automatiquement", [
                'formation_id' => $formation->id,
                'formateur_id' => $formation->formateur_id,
                'type_promotion' => $formation->type_promotion,
                'date_fin' => $formation->date_fin
            ]);
        }

        if ($updatedCount > 0) {
            $this->info("✅ {$updatedCount} formation(s) mise(s) à jour avec le statut 'terminé'");
        } else {
            $this->info("ℹ️  Aucune formation à mettre à jour");
        }

        return Command::SUCCESS;
    }
}
