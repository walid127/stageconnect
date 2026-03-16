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
        if (Schema::hasTable('dossiers')) {
            return;
        }
        
        Schema::create('dossiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('formateur_id')->nullable()->constrained('formateurs')->onDelete('cascade');
            $table->string('fichier'); // Path to the dossier file
            $table->enum('statut', ['en_attente', 'accepte', 'refuse_definitif', 'resubmit_requested'])->default('en_attente');
            $table->text('commentaire')->nullable(); // Admin comment when rejecting
            $table->timestamps();
            
            // Indexes
            $table->index('formateur_id');
            $table->index('statut');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dossiers');
    }
};
