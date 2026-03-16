<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Formation;
use App\Models\FormationOptionnelle;
use App\Models\DemandeFormation;
use App\Models\Formateur;
use App\Models\Dossier;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CandidatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->formateur = User::factory()->create(['role' => 'formateur']);
        $this->gestionaire = User::factory()->create(['role' => 'gestionaire']);
        
        // Créer un formateur lié à l'utilisateur (avec spécialité)
        $this->formateurModel = Formateur::factory()->create(['utilisateur_id' => $this->formateur->id]);
    }

    /** @test */
    public function formateur_can_apply_to_formation()
    {
        $formation = Formation::factory()->create([
            'type' => 'optionnelle',
            'statut' => 'en_cours',
        ]);

        FormationOptionnelle::factory()->create([
            'formation_id' => $formation->id,
            'part_max' => 20,
        ]);

        $token = $this->formateur->createToken('test-token')->plainTextToken;

        // Simuler un upload de fichier (dossier requis)
        $file = \Illuminate\Http\UploadedFile::fake()->create('dossier.pdf', 100);
        
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->post('/api/candidatures', [
                             'formation_id' => $formation->id,
                             'dossier' => $file,
                         ]);

        $response->assertStatus(201);
        $responseData = $response->json();
        $this->assertArrayHasKey('data', $responseData);

        $this->assertDatabaseHas('demandes_de_formation', [
            'formation_id' => $formation->id,
            'formateur_id' => $this->formateur->id,
        ]);
    }

    /** @test */
    public function gestionaire_can_accept_candidature()
    {
        $formation = Formation::factory()->create([
            'type' => 'optionnelle',
            'statut' => 'en_cours',
        ]);

        FormationOptionnelle::factory()->create([
            'formation_id' => $formation->id,
            'part_max' => 20,
        ]);

        $candidature = DemandeFormation::factory()->create([
            'formation_id' => $formation->id,
            'formateur_id' => $this->formateur->id,
            'statut' => 'en_attente',
        ]);

        $token = $this->gestionaire->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->postJson("/api/candidatures/{$candidature->id}/accept-candidat");

        $response->assertStatus(200);

        $this->assertDatabaseHas('demandes_de_formation', [
            'id' => $candidature->id,
            'statut' => 'accepte',
        ]);

        // Vérifier qu'une notification a été créée
        $this->assertDatabaseHas('notifications', [
            'utilisateur_id' => $this->formateur->id,
            'type' => 'application_accepte',
        ]);
    }

    /** @test */
    public function formateur_cannot_apply_twice_to_same_formation()
    {
        $formation = Formation::factory()->create([
            'type' => 'optionnelle',
            'statut' => 'en_cours',
        ]);

        FormationOptionnelle::factory()->create([
            'formation_id' => $formation->id,
            'part_max' => 20,
        ]);

        // Créer un dossier pour la première candidature
        $dossier = Dossier::factory()->create([
            'formateur_id' => $this->formateurModel->id,
        ]);

        // Créer une première candidature
        DemandeFormation::factory()->create([
            'formation_id' => $formation->id,
            'formateur_id' => $this->formateur->id,
            'dossier_id' => $dossier->id,
        ]);

        $token = $this->formateur->createToken('test-token')->plainTextToken;

        // Essayer de postuler à nouveau
        $file = \Illuminate\Http\UploadedFile::fake()->create('dossier2.pdf', 100);
        
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->post('/api/candidatures', [
                             'formation_id' => $formation->id,
                             'dossier' => $file,
                         ]);

        $response->assertStatus(400)
                 ->assertJson(['message' => 'Vous avez déjà postulé à cette formation.']);
    }
}
