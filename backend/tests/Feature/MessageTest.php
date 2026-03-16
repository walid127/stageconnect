<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Message;
use Illuminate\Foundation\Testing\RefreshDatabase;

class MessageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->formateur = User::factory()->create(['role' => 'formateur']);
        $this->gestionaire = User::factory()->create(['role' => 'gestionaire']);
    }

    /** @test */
    public function authenticated_user_can_send_message()
    {
        $token = $this->formateur->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->postJson('/api/messages', [
                             'destinataire_id' => $this->gestionaire->id,
                             'corps' => 'Test Message Body',
                         ]);

        $response->assertStatus(201)
                 ->assertJsonStructure(['data' => ['id', 'corps']]);

        $this->assertDatabaseHas('messages', [
            'expediteur_id' => $this->formateur->id,
            'destinataire_id' => $this->gestionaire->id,
            'sujet' => 'Message',
            'corps' => 'Test Message Body',
        ]);
    }

    /** @test */
    public function user_can_get_unread_messages_count()
    {
        // Créer des messages non lus
        Message::factory()->create([
            'expediteur_id' => $this->gestionaire->id,
            'destinataire_id' => $this->formateur->id,
            'lu_le' => null,
        ]);

        Message::factory()->create([
            'expediteur_id' => $this->gestionaire->id,
            'destinataire_id' => $this->formateur->id,
            'lu_le' => null,
        ]);

        // Créer un message lu
        Message::factory()->create([
            'expediteur_id' => $this->gestionaire->id,
            'destinataire_id' => $this->formateur->id,
            'lu_le' => now(),
        ]);

        $token = $this->formateur->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->getJson('/api/messages/unread-count');

        $response->assertStatus(200);
        $responseData = $response->json();
        $this->assertEquals(2, $responseData['unread_count'] ?? 0);
    }

    /** @test */
    public function user_can_mark_message_as_read()
    {
        $message = Message::factory()->create([
            'expediteur_id' => $this->gestionaire->id,
            'destinataire_id' => $this->formateur->id,
            'lu_le' => null,
        ]);

        $token = $this->formateur->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->putJson("/api/messages/{$message->id}/read");

        $response->assertStatus(200);

        $this->assertDatabaseHas('messages', [
            'id' => $message->id,
            'lu_le' => now()->format('Y-m-d H:i:s'),
        ]);
    }

    /** @test */
    public function marking_message_as_read_persists_after_refresh()
    {
        $message = Message::factory()->create([
            'expediteur_id' => $this->gestionaire->id,
            'destinataire_id' => $this->formateur->id,
            'lu_le' => null,
        ]);

        $token = $this->formateur->createToken('test-token')->plainTextToken;

        // Marquer comme lu
        $this->withHeader('Authorization', 'Bearer ' . $token)
             ->putJson("/api/messages/{$message->id}/read")
             ->assertStatus(200);

        // Vérifier que lu_le est bien enregistré
        $message->refresh();
        $this->assertNotNull($message->lu_le);

        // Vérifier que le compteur de non lus ne compte plus ce message
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->getJson('/api/messages/unread-count');

        $response->assertStatus(200);
        $responseData = $response->json();
        $this->assertEquals(0, $responseData['unread_count'] ?? 0);
    }

    /** @test */
    public function user_can_get_conversation_and_mark_all_as_read()
    {
        // Créer plusieurs messages dans une conversation
        Message::factory()->count(3)->create([
            'expediteur_id' => $this->gestionaire->id,
            'destinataire_id' => $this->formateur->id,
            'lu_le' => null,
        ]);

        $token = $this->formateur->createToken('test-token')->plainTextToken;

        // Récupérer la conversation (cela devrait marquer tous les messages comme lus)
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->getJson("/api/messages/conversation/{$this->gestionaire->id}");

        $response->assertStatus(200);

        // Vérifier que tous les messages sont marqués comme lus
        $unreadCount = Message::where('destinataire_id', $this->formateur->id)
                              ->where('expediteur_id', $this->gestionaire->id)
                              ->whereNull('lu_le')
                              ->count();

        $this->assertEquals(0, $unreadCount);
    }
}
