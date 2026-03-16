<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Foundation\Testing\RefreshDatabase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['role' => 'formateur']);
    }

    /** @test */
    public function user_can_get_notifications()
    {
        Notification::factory()->count(3)->create([
            'utilisateur_id' => $this->user->id,
        ]);

        $token = $this->user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->getJson('/api/notifications');

        $response->assertStatus(200)
                 ->assertJsonCount(3, 'data');
    }

    /** @test */
    public function user_can_get_unread_notifications_count()
    {
        // Créer des notifications non lues
        Notification::factory()->create([
            'utilisateur_id' => $this->user->id,
            'lu_le' => null,
        ]);

        Notification::factory()->create([
            'utilisateur_id' => $this->user->id,
            'lu_le' => null,
        ]);

        // Créer une notification lue
        Notification::factory()->create([
            'utilisateur_id' => $this->user->id,
            'lu_le' => now(),
        ]);

        $token = $this->user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->getJson('/api/notifications/unread-count');

        $response->assertStatus(200);
        $responseData = $response->json();
        $this->assertEquals(2, $responseData['count'] ?? 0);
    }

    /** @test */
    public function user_can_mark_notification_as_read()
    {
        $notification = Notification::factory()->create([
            'utilisateur_id' => $this->user->id,
            'lu_le' => null,
        ]);

        $token = $this->user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->putJson("/api/notifications/{$notification->id}/read");

        $response->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'id' => $notification->id,
        ]);

        $notification->refresh();
        $this->assertNotNull($notification->lu_le);
    }

    /** @test */
    public function marking_notification_as_read_persists_after_refresh()
    {
        $notification = Notification::factory()->create([
            'utilisateur_id' => $this->user->id,
            'lu_le' => null,
        ]);

        $token = $this->user->createToken('test-token')->plainTextToken;

        // Marquer comme lu
        $this->withHeader('Authorization', 'Bearer ' . $token)
             ->putJson("/api/notifications/{$notification->id}/read")
             ->assertStatus(200);

        // Vérifier que lu_le est bien enregistré
        $notification->refresh();
        $this->assertNotNull($notification->lu_le);

        // Vérifier que le compteur de non lues ne compte plus cette notification
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->getJson('/api/notifications/unread-count');

        $response->assertStatus(200);
        $responseData = $response->json();
        $this->assertEquals(0, $responseData['count'] ?? 0);
    }

    /** @test */
    public function user_can_mark_all_notifications_as_read()
    {
        Notification::factory()->count(3)->create([
            'utilisateur_id' => $this->user->id,
            'lu_le' => null,
        ]);

        $token = $this->user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->putJson('/api/notifications/mark-all-read');

        $response->assertStatus(200);

        // Vérifier que toutes les notifications sont marquées comme lues
        $unreadCount = Notification::where('utilisateur_id', $this->user->id)
                                   ->whereNull('lu_le')
                                   ->count();

        $this->assertEquals(0, $unreadCount);
    }
}
