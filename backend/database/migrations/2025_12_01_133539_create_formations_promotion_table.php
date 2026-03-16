<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Création de la table formations_promotion
 * Class Table Inheritance (CTI) - Sous-classe de formations
 * Contient les attributs spécifiques aux formations de promotion
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('formations_promotion', function (Blueprint $table) {
            $table->id();
            
            // Foreign key vers la table de base formations (CTI)
            $table->foreignId('formation_id')->unique()->constrained('formations')->onDelete('cascade');
            
            // Attributs spécifiques à "Formation promotion" (pas dans la classe de base)
            $table->foreignId('formateur_id')->constrained('formateurs')->onDelete('cascade');
            $table->enum('type_promotion', ['5_ans', '10_ans']); // PSP1 ou PSP2
            
            // Index pour améliorer les performances
            $table->index('formateur_id');
            $table->index('type_promotion');
            
            // Un formateur peut avoir une promotion 5 ans ET une promotion 10 ans
            // Mais pas deux promotions du même type
            $table->unique(['formateur_id', 'type_promotion']);
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('formations_promotion');
    }
};
