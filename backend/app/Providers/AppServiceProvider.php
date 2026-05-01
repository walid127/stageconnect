<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Forcer https sur Render même si APP_ENV n'est pas "production", et en prod classique.
        if ($this->app->runningInConsole()) {
            return;
        }

        $host = request()->getHost();
        if (str_ends_with($host, '.onrender.com') || $this->app->environment('production')) {
            URL::forceScheme('https');
        }
    }
}
