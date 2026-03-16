<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: Création de la table unifiée des emplois du temps (fichiers EDT)
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('emplois_du_temps', function (Blueprint $table) {
            $table->id();
            // Année scolaire (année uniquement, ex: 2025)
            $table->unsignedSmallInteger('annee_scolaire')->nullable();

            // Informations établissement
            $table->string('etablissement');
            $table->string('departement');
            $table->string('specialite');

            // Fichier associé à l'emploi du temps
            $table->string('fichier')->nullable();

            // Colonnes utilisées par le reste de l'application
            // (pour les emplois du temps liés aux formations pédagogiques / promotions / demandes)
            $table->enum('type', ['pedagogique', 'promotion', 'demande_formation'])->nullable();
            $table->foreignId('formateur_id')->nullable()->constrained('formateurs')->nullOnDelete();
            $table->foreignId('demande_formation_id')->nullable()->constrained('demandes_de_formation')->nullOnDelete();
            $table->foreignId('formation_id')->nullable()->constrained('formations')->nullOnDelete();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();

            // Index pour les requêtes fréquentes
            $table->index('type');
            $table->index('formateur_id');
            $table->index('formation_id');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('emplois_du_temps');
    }
};
