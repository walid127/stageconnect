<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: Création de la table des diplômes
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('diplomes', function (Blueprint $table) {
            $table->id();
            // Toutes les formations (optionnelle, pédagogique, promotion) sont maintenant dans la table formations
            $table->foreignId('formation_id')->constrained('formations')->onDelete('cascade');
            $table->foreignId('formateur_id')->constrained('users')->onDelete('cascade');
            $table->string('titre')->nullable();
            $table->string('fichier_diplome')->nullable();
            $table->string('num_diplome')->nullable()->unique();
            $table->date('date_deliv');
            $table->text('notes')->nullable();
            // Nouveaux attributs demandés
            $table->integer('ann_adm')->nullable();       // Année d'admission
            $table->integer('ref_decision')->nullable();  // Référence de la décision
            $table->foreignId('deliv_par')->nullable()->constrained('users')->onDelete('set null');
            
            // Index pour améliorer les performances des requêtes
            $table->index('formateur_id');
            $table->index('formation_id');
            $table->index('date_deliv');
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('diplomes');
    }
};
