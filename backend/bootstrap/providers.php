<?php

/**
 * Configuration des fournisseurs de services de l'application.
 * 
 * Ce fichier définit tous les fournisseurs de services qui seront chargés
 * par l'application Laravel. Les fournisseurs de services sont responsables
 * de l'enregistrement des services, des bindings, et de la configuration
 * de l'application.
 */
return [
    App\Providers\AppServiceProvider::class,
    App\Providers\AuthServiceProvider::class,
];
