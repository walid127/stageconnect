<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\DemandeFormation;
use App\Models\Formation;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class StatistiqueController extends Controller
{
    /**
     * Obtenir toutes les années disponibles dans la base de données
     */
    public function getAvailableYears()
    {
        try {
            // Get years from applications (demandes de formation)
            $applicationYears = DemandeFormation::selectRaw('YEAR(created_at) as year')
                ->distinct()
                ->pluck('year')
                ->toArray();

            // Get years from trainings
            $trainingYears = Formation::selectRaw('YEAR(created_at) as year')
                ->distinct()
                ->pluck('year')
                ->toArray();

            // Get years from users
            $userYears = User::selectRaw('YEAR(created_at) as year')
                ->distinct()
                ->pluck('year')
                ->toArray();

            // Merge all years and sort in descending order
            $allYears = array_unique(array_merge($applicationYears, $trainingYears, $userYears));
            rsort($allYears);

            // Ensure current year is included
            $currentYear = date('Y');
            if (!in_array($currentYear, $allYears)) {
                array_unshift($allYears, $currentYear);
            }

            return response()->json([
                'years' => array_values($allYears)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Échec de la récupération des années',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}

