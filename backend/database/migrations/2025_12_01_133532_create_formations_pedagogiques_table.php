<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Création de la table formations_pedagogiques
 * Class Table Inheritance (CTI) - Sous-classe de formations
 * Contient les attributs spécifiques aux formations pédagogiques
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('formations_pedagogiques', function (Blueprint $table) {
            $table->id();
            
            // Foreign key vers la table de base formations (CTI)
            $table->foreignId('formation_id')->unique()->constrained('formations')->onDelete('cascade');
            
            // Attributs spécifiques à "Formation pédagogique" (pas dans la classe de base)
            $table->foreignId('formateur_id')->constrained('formateurs')->onDelete('cascade');
            
            // Index pour améliorer les performances
            $table->index('formateur_id');
            
            // Un formateur ne peut avoir qu'une seule formation pédagogique
            $table->unique('formateur_id');
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('formations_pedagogiques');
    }
};
