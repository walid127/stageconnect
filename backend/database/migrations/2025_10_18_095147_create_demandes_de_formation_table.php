<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: Création de la table des demandes de formation
// (anciennement candidatures, renommée selon le diagramme UML)
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('demandes_de_formation', function (Blueprint $table) {
            $table->id();
            $table->foreignId('formation_id')->constrained('formations')->onDelete('cascade');
            $table->foreignId('formateur_id')->constrained('users')->onDelete('cascade');
            $table->enum('statut', ['en_attente', 'accepte', 'refuse', 'en_attente_validation'])->default('en_attente');
            $table->date('date_demande'); // Renommé de date_cand
            $table->foreignId('dossier_id')->nullable()->constrained('dossiers')->onDelete('set null');
            
            // Un formateur ne peut postuler qu'une seule fois par formation
            $table->unique(['formation_id', 'formateur_id']);
            
            // Index pour améliorer les performances
            $table->index('statut');
            $table->index('date_demande');

            $table->timestamps();
            $table->timestamp('masquee_gestionnaire_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('demandes_de_formation');
    }
};
