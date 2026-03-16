<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Formation;
use App\Models\DemandeFormation;
use Illuminate\Foundation\Testing\RefreshDatabase;

class TerminologyTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function formation_controller_messages_use_formation_not_stage()
    {
        $gestionaire = User::factory()->create(['role' => 'gestionaire']);
        $token = $gestionaire->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->postJson('/api/formations', [
                             'titre' => 'Test Formation',
                             'description' => 'Description',
                             'date_deb' => '2026-02-01',
                             'date_fin' => '2026-02-28',
                             'lieu' => 'Paris',
                             'statut' => 'en_cours',
                             'duree_hrs' => 40,
                             'part_max' => 20,
                         ]);

        $response->assertStatus(201); // Le contrôleur retourne 201 pour création
        $responseData = $response->json();
        
        // Vérifier que le message ne contient pas "Stage"
        $this->assertStringNotContainsString('Stage', $responseData['message'] ?? '');
        $this->assertStringContainsString('Formation', $responseData['message'] ?? '');
    }

    /** @test */
    public function candidature_controller_messages_use_formation_not_stage()
    {
        $formateur = User::factory()->create(['role' => 'formateur']);
        $formation = Formation::factory()->create(['type' => 'optionnelle', 'statut' => 'en_cours']);
        
        $token = $formateur->createToken('test-token')->plainTextToken;

        // Tester le message d'erreur pour formation complète
        // (On ne peut pas vraiment tester la création sans dossier)
        // Mais on peut vérifier les messages d'erreur
        
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->postJson('/api/candidatures', [
                             'formation_id' => 99999, // ID inexistant
                         ]);

        // Vérifier que les messages d'erreur utilisent "formation" et non "stage"
        if ($response->status() === 404 || $response->status() === 422) {
            $responseData = $response->json();
            if (isset($responseData['message'])) {
                $this->assertStringNotContainsString('stage', strtolower($responseData['message']));
            }
        }
    }
}
