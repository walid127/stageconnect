<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Formation;
use App\Models\FormationOptionnelle;
use Illuminate\Foundation\Testing\RefreshDatabase;

class FormationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->gestionaire = User::factory()->create(['role' => 'gestionaire']);
    }

    /** @test */
    public function gestionaire_can_create_formation()
    {
        $token = $this->gestionaire->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->postJson('/api/formations', [
                             'titre' => 'Formation Test',
                             'description' => 'Description de test',
                             'date_deb' => '2026-02-01',
                             'date_fin' => '2026-02-28',
                             'lieu' => 'Paris',
                             'statut' => 'en_cours',
                             'duree_hrs' => 40,
                             'part_max' => 20,
                         ]);

        $response->assertStatus(201)
                 ->assertJsonStructure(['formation' => ['id', 'titre']]);

        $this->assertDatabaseHas('formations', [
            'titre' => 'Formation Test',
            'type' => 'optionnelle',
        ]);
    }

    /** @test */
    public function gestionaire_can_update_formation()
    {
        $formation = Formation::factory()->create([
            'type' => 'optionnelle',
            'cre_par' => $this->gestionaire->id,
        ]);

        FormationOptionnelle::factory()->create([
            'formation_id' => $formation->id,
        ]);

        $token = $this->gestionaire->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->putJson("/api/formations/{$formation->id}", [
                             'titre' => 'Formation Modifiée',
                             'description' => 'Nouvelle description',
                             'date_deb' => '2026-02-01',
                             'date_fin' => '2026-02-28',
                             'lieu' => 'Lyon',
                             'statut' => 'en_cours',
                         ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('formations', [
            'id' => $formation->id,
            'titre' => 'Formation Modifiée',
            'lieu' => 'Lyon',
        ]);
    }

    /** @test */
    public function gestionaire_can_delete_formation()
    {
        $formation = Formation::factory()->create([
            'type' => 'optionnelle',
            'cre_par' => $this->gestionaire->id,
        ]);

        $token = $this->gestionaire->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->deleteJson("/api/formations/{$formation->id}");

        $response->assertStatus(200);

        $this->assertDatabaseMissing('formations', [
            'id' => $formation->id,
        ]);
    }

    /** @test */
    public function formateur_can_view_formations()
    {
        $formateur = User::factory()->create(['role' => 'formateur']);
        
        Formation::factory()->count(3)->create([
            'type' => 'optionnelle',
            'statut' => 'en_cours',
        ]);

        $token = $formateur->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->getJson('/api/formations?status=en_cours');

        $response->assertStatus(200);
        $responseData = $response->json();
        $this->assertArrayHasKey('data', $responseData);
    }
}
