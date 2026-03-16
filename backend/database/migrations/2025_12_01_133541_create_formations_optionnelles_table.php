<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Création de la table formations_optionnelles
 * Class Table Inheritance (CTI) - Sous-classe de formations
 * Contient les attributs spécifiques aux formations optionnelles
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('formations_optionnelles', function (Blueprint $table) {
            $table->id();
            
            // Foreign key vers la table de base formations (CTI)
            $table->foreignId('formation_id')->unique()->constrained('formations')->onDelete('cascade');
            
            // Attributs spécifiques à "Formation optionnelle" (pas dans la classe de base)
            // Selon le diagramme UML: duree_hrs, part_max, prerequis
            $table->integer('duree_hrs')->nullable();
            $table->integer('part_max')->default(30);
            $table->text('prerequis')->nullable();
            
            // Index pour améliorer les performances
            $table->index('part_max');
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('formations_optionnelles');
    }
};
