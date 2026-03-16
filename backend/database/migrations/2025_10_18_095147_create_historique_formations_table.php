<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration: Création de la table de l'historique des formations
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('historique_formations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('formateur_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('formation_id')->nullable()->constrained('formations')->onDelete('cascade');
            $table->date('date_comp')->nullable();
            $table->string('url_cert')->nullable();
            $table->integer('note')->nullable();
            $table->text('commentaire')->nullable();
            $table->string('action')->nullable();
            $table->text('description')->nullable();
            $table->string('anc_valeur')->nullable();
            $table->string('nv_valeur')->nullable();
            $table->string('titre_form')->nullable();
            $table->foreignId('utilisateur_id')->nullable()->constrained('users')->onDelete('cascade');
            
            // Index pour améliorer les performances des requêtes
            $table->index('formateur_id');
            $table->index('formation_id');
            $table->index('action');
            $table->index('date_comp');
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('historique_formations');
    }
};
