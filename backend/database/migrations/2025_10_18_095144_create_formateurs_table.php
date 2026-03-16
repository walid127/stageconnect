<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formateurs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('utilisateur_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->foreignId('specialite_id')->constrained('specialites')->onDelete('restrict');
            $table->foreignId('grade_id')->nullable()->constrained('grades')->onDelete('set null');
            $table->string('id_formateur')->unique()->nullable();
            $table->string('nom')->nullable();
            $table->text('biographie')->nullable();
            $table->string('institution')->nullable();
            $table->integer('annees_exp')->nullable();
            $table->string('diplome')->nullable();
            $table->string('ville')->nullable();
            $table->date('date_insc')->nullable();
            
            $table->index('utilisateur_id');
            $table->index('specialite_id');
            $table->index('grade_id');
            $table->index('date_insc');
            
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('formateurs');
    }
};

