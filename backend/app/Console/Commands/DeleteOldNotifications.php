<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Notification;
use Illuminate\Support\Facades\Log;

class DeleteOldNotifications extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'notifications:delete-old';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Supprime automatiquement les notifications de plus de 30 jours';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $cutoffDate = now()->subDays(30);
        
        // Compter les notifications à supprimer
        $count = Notification::where('created_at', '<', $cutoffDate)->count();
        
        if ($count > 0) {
            // Supprimer les notifications de plus de 30 jours
            $deleted = Notification::where('created_at', '<', $cutoffDate)->delete();
            
            $this->info("✅ {$deleted} notification(s) supprimée(s) (plus de 30 jours)");
            
            Log::info("Notifications anciennes supprimées automatiquement", [
                'count' => $deleted,
                'cutoff_date' => $cutoffDate->toDateString()
            ]);
        } else {
            $this->info("ℹ️  Aucune notification à supprimer (toutes sont récentes)");
        }

        return Command::SUCCESS;
    }
}
