<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

/**
 * Configuration principale de l'application Laravel.
 * 
 * Ce fichier configure l'application, les routes, les middlewares,
 * et la gestion des exceptions.
 */
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        // Routes web (pour les vues Blade si nécessaire)
        web: __DIR__.'/../routes/web.php',
        // Routes API (toutes les routes API de l'application)
        api: __DIR__.'/../routes/api.php',
        // Routes de console (commandes Artisan)
        commands: __DIR__.'/../routes/console.php',
        // Route de vérification de santé de l'application
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Configuration des middlewares pour les routes API
        // Ajout du middleware CORS pour permettre les requêtes cross-origin
        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);
    })
    ->withSchedule(function (\Illuminate\Console\Scheduling\Schedule $schedule): void {
        // Mettre à jour automatiquement le statut des formations chaque jour à minuit
        $schedule->command('formations:update-status')
            ->daily()
            ->at('00:00')
            ->timezone('Africa/Casablanca')
            ->withoutOverlapping()
            ->runInBackground();
        
        // Supprimer automatiquement les notifications de plus de 30 jours chaque jour à 1h00
        $schedule->command('notifications:delete-old')
            ->daily()
            ->at('01:00')
            ->timezone('Africa/Casablanca')
            ->withoutOverlapping()
            ->runInBackground();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Configuration personnalisée de la gestion des exceptions
        // Peut être utilisée pour personnaliser le comportement des erreurs
    })->create();
