<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

// Migration: Création de la table des formations
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('formations', function (Blueprint $table) {
            $table->id();
            
            // ============================================
            // ATTRIBUTS DE LA CLASSE DE BASE (formations)
            // ============================================
            // Attributs communs à TOUTES les formations selon le diagramme UML
            // (Class Table Inheritance - CTI)
            $table->string('titre');
            $table->text('description');
            $table->date('date_deb');
            $table->date('date_fin');
            // Note: duree_hrs est dans formations_optionnelles selon le diagramme UML
            $table->string('lieu')->nullable();
            // Lien vers la spécialité de la formation
            $table->foreignId('specialite_id')->nullable()->constrained('specialites')->nullOnDelete();
            $table->enum('statut', ['en_attente', 'en_cours', 'termine'])->default('en_cours');
            $table->foreignId('cre_par')->nullable()->constrained('users')->onDelete('set null');
            
            // Discriminateur pour l'héritage (type de formation)
            $table->enum('type', ['optionnelle', 'pedagogique', 'promotion'])->default('optionnelle');
            
            // Index pour améliorer les performances des requêtes
            $table->index('type');
            $table->index('statut');
            $table->index('date_deb');
            $table->index('date_fin');
            
            $table->timestamps();
        });
        
        // Contrainte CHECK pour s'assurer que date_fin >= date_deb
        // Note: MySQL 8.0.16+ supporte les contraintes CHECK, mais SQLite ne supporte pas ALTER TABLE avec CHECK
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE formations ADD CONSTRAINT check_date_fin_after_date_deb CHECK (date_fin >= date_deb)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('formations');
    }
};

