<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * When gestionaire "deletes" a demande, it is only hidden from their list;
     * the formateur still sees their demande (accepted/refused) unchanged.
     */
    public function up(): void
    {
        Schema::table('demandes_de_formation', function (Blueprint $table) {
            $table->timestamp('masquee_gestionnaire_at')->nullable()->after('updated_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('demandes_de_formation', function (Blueprint $table) {
            $table->dropColumn('masquee_gestionnaire_at');
        });
    }
};
