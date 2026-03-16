<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('email')->unique();
            $table->string('mdp');
            $table->enum('role', ['admin', 'formateur', 'gestionaire'])->default('formateur');
            $table->enum('statut', ['actif', 'inactif', 'en_attente'])->default('en_attente');
            $table->string('telephone')->unique();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('utilisateur_id')->nullable()->index();
            $table->string('adresse_ip', 45)->nullable();
            $table->text('agent_utilisateur')->nullable();
            $table->longText('donnees');
            $table->integer('derniere_activite')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
