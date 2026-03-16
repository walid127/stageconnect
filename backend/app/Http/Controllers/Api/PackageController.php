<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class PackageController extends Controller
{
    /**
     * Liste des paquets installés (Admin uniquement)
     */
    public function index(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé. Seuls les administrateurs peuvent gérer les paquets.',
            ], 403);
        }

        try {
            $composerLockPath = base_path('composer.lock');
            
            if (!File::exists($composerLockPath)) {
                return response()->json([
                    'message' => 'Fichier composer.lock introuvable.',
                ], 404);
            }

            $composerLock = json_decode(File::get($composerLockPath), true);
            $packages = [];

            if (isset($composerLock['packages'])) {
                foreach ($composerLock['packages'] as $package) {
                    $packages[] = [
                        'name' => $package['name'] ?? null,
                        'version' => $package['version'] ?? null,
                        'description' => $package['description'] ?? null,
                        'type' => $package['type'] ?? null,
                    ];
                }
            }

            return response()->json([
                'packages' => $packages,
                'total' => count($packages),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la récupération des paquets.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Installer un paquet (Admin uniquement)
     */
    public function install(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        $validated = $request->validate([
            'package' => 'required|string',
            'version' => 'nullable|string',
        ]);

        try {
            $package = $validated['package'];
            $version = $validated['version'] ?? null;

            // Échapper les arguments pour la sécurité de la commande shell
            $packageEscaped = escapeshellarg($package);
            
            // Changer vers le répertoire du projet avant d'exécuter composer
            $basePath = base_path();
            $command = $version 
                ? "cd {$basePath} && composer require {$packageEscaped}:" . escapeshellarg($version)
                : "cd {$basePath} && composer require {$packageEscaped}";

            $output = [];
            $returnVar = 0;
            exec($command . ' 2>&1', $output, $returnVar);

            if ($returnVar !== 0) {
                return response()->json([
                    'message' => 'Erreur lors de l\'installation du paquet.',
                    'error' => implode("\n", $output),
                ], 500);
            }

            return response()->json([
                'message' => 'Paquet installé avec succès!',
                'output' => implode("\n", $output),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de l\'installation.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mettre à jour un paquet (Admin uniquement)
     */
    public function update(Request $request, $package)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        try {
            // Laravel décode déjà automatiquement les paramètres d'URL
            // Échapper le nom du paquet pour la sécurité de la commande shell
            $packageEscaped = escapeshellarg($package);
            
            // Changer vers le répertoire du projet avant d'exécuter composer
            $basePath = base_path();
            $command = "cd {$basePath} && composer update {$packageEscaped}";
            
            $output = [];
            $returnVar = 0;
            exec($command . ' 2>&1', $output, $returnVar);

            if ($returnVar !== 0) {
                \Log::error('Composer update failed', [
                    'package' => $package,
                    'command' => $command,
                    'output' => $output,
                    'return_var' => $returnVar
                ]);
                
                return response()->json([
                    'message' => 'Erreur lors de la mise à jour du paquet.',
                    'error' => implode("\n", $output),
                    'package' => $package,
                ], 500);
            }

            return response()->json([
                'message' => 'Paquet mis à jour avec succès!',
                'output' => implode("\n", $output),
            ]);
        } catch (\Exception $e) {
            \Log::error('Exception in package update', [
                'package' => $package ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Erreur lors de la mise à jour.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Désinstaller un paquet (Admin uniquement)
     */
    public function uninstall(Request $request, $package)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        try {
            // Laravel décode déjà automatiquement les paramètres d'URL
            // Échapper le nom du paquet pour la sécurité de la commande shell
            $packageEscaped = escapeshellarg($package);
            
            // Changer vers le répertoire du projet avant d'exécuter composer
            $basePath = base_path();
            $command = "cd {$basePath} && composer remove {$packageEscaped}";
            
            $output = [];
            $returnVar = 0;
            exec($command . ' 2>&1', $output, $returnVar);

            if ($returnVar !== 0) {
                \Log::error('Composer remove failed', [
                    'package' => $package,
                    'command' => $command,
                    'output' => $output,
                    'return_var' => $returnVar
                ]);
                
                return response()->json([
                    'message' => 'Erreur lors de la désinstallation du paquet.',
                    'error' => implode("\n", $output),
                    'package' => $package,
                ], 500);
            }

            return response()->json([
                'message' => 'Paquet désinstallé avec succès!',
                'output' => implode("\n", $output),
            ]);
        } catch (\Exception $e) {
            \Log::error('Exception in package uninstall', [
                'package' => $package ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Erreur lors de la désinstallation.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mettre à jour tous les paquets (Admin uniquement)
     */
    public function updateAll(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Accès non autorisé.',
            ], 403);
        }

        try {
            // Changer vers le répertoire du projet avant d'exécuter composer
            $basePath = base_path();
            $command = "cd {$basePath} && composer update";
            $output = [];
            $returnVar = 0;
            exec($command . ' 2>&1', $output, $returnVar);

            if ($returnVar !== 0) {
                return response()->json([
                    'message' => 'Erreur lors de la mise à jour des paquets.',
                    'error' => implode("\n", $output),
                ], 500);
            }

            return response()->json([
                'message' => 'Tous les paquets ont été mis à jour avec succès!',
                'output' => implode("\n", $output),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la mise à jour.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
