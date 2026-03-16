<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MessageController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        
        // Get all messages where user is either sender or receiver
        $query = Message::where(function($q) use ($user) {
                $q->where('expediteur_id', $user->id)
                  ->orWhere('destinataire_id', $user->id);
            });
        
        // If user is formateur, only show messages with gestionaires
        if ($user->isFormateur()) {
            $gestionaireIds = User::where('role', 'gestionaire')->pluck('id');
            $query->where(function($q) use ($user, $gestionaireIds) {
                $q->where(function($subQ) use ($user, $gestionaireIds) {
                    // Formateur sends to gestionaire
                    $subQ->where('expediteur_id', $user->id)
                         ->whereIn('destinataire_id', $gestionaireIds);
                })->orWhere(function($subQ) use ($user, $gestionaireIds) {
                    // Formateur receives from gestionaire
                    $subQ->where('destinataire_id', $user->id)
                         ->whereIn('expediteur_id', $gestionaireIds);
                });
            });
        }
        
        $messages = $query->with(['expediteur', 'destinataire'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $messages
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'destinataire_id' => 'required|exists:users,id',
            'corps' => 'required|string|max:1000'
        ]);

        $user = Auth::user();
        $destinataire = User::findOrFail($request->destinataire_id);

        // Validate that formateurs can only message gestionaires
        if ($user->isFormateur() && !$destinataire->isGestionaire()) {
            return response()->json([
                'message' => 'Les formateurs ne peuvent envoyer des messages qu\'aux gestionaires'
            ], 403);
        }

        $message = Message::create([
            'expediteur_id' => Auth::id(),
            'destinataire_id' => $request->destinataire_id,
            'sujet' => 'Message',
            'corps' => $request->corps
        ]);

        $message->load(['expediteur', 'destinataire']);

        return response()->json([
            'data' => $message,
            'message' => 'Message envoyé avec succès'
        ], 201);
    }

    public function show($id)
    {
        $message = Message::with(['expediteur', 'destinataire'])->findOrFail($id);
        
        // Check if user is sender or recipient
        if ($message->expediteur_id !== Auth::id() && $message->destinataire_id !== Auth::id()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        return response()->json([
            'data' => $message
        ]);
    }

    public function markAsRead($id)
    {
        $message = Message::findOrFail($id);
        
        // Check if user is recipient
        if ($message->destinataire_id !== Auth::id()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        // Marquer le message comme lu
        if (!$message->lu_le) {
            $message->update(['lu_le' => now()]);
        }

        $message->load(['expediteur', 'destinataire']);

        return response()->json([
            'data' => $message,
            'message' => 'Message marqué comme lu'
        ]);
    }

    public function getUsers()
    {
        $user = Auth::user();
        
        // Get users with different roles only
        if ($user->isAdmin()) {
            // Admin can message gestionaires (handled by separate endpoint)
            // But also keep formateurs for backward compatibility
            $users = User::where('role', 'formateur')
                ->select('id', 'nom', 'email', 'role')
                ->get();
        } elseif ($user->isGestionaire()) {
            // Gestionaire can message formateurs AND admins
            $users = User::whereIn('role', ['formateur', 'admin'])
                ->select('id', 'nom', 'email', 'role')
                ->get();
        } else {
            // Formateurs can message only gestionaires
            $users = User::where('role', 'gestionaire')
                ->select('id', 'nom', 'email', 'role')
                ->get();
        }

        return response()->json([
            'data' => $users
        ]);
    }

    /**
     * Get messages for admin - only from gestionaires
     */
    public function indexAdminGestionaires()
    {
        $user = Auth::user();
        
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }
        
        // Get gestionaire user IDs
        $gestionaireIds = User::where('role', 'gestionaire')->pluck('id');
        
        // Get all messages where admin is receiver and sender is gestionaire, or admin is sender and receiver is gestionaire
        $messages = Message::where(function($query) use ($user, $gestionaireIds) {
                $query->where(function($q) use ($user, $gestionaireIds) {
                    // Admin receives from gestionaires
                    $q->where('destinataire_id', $user->id)
                      ->whereIn('expediteur_id', $gestionaireIds);
                })->orWhere(function($q) use ($user, $gestionaireIds) {
                    // Admin sends to gestionaires
                    $q->where('expediteur_id', $user->id)
                      ->whereIn('destinataire_id', $gestionaireIds);
                });
            })
            ->with(['expediteur', 'destinataire'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $messages
        ]);
    }

    /**
     * Get gestionaires for admin to message
     */
    public function getGestionaires()
    {
        $user = Auth::user();
        
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }
        
        $users = User::where('role', 'gestionaire')
            ->select('id', 'nom', 'email', 'role')
            ->get();

        return response()->json([
            'data' => $users
        ]);
    }

    public function getConversation($userId)
    {
        $user = Auth::user();
        
        $messages = Message::where(function($query) use ($user, $userId) {
            $query->where('expediteur_id', $user->id)
                  ->where('destinataire_id', $userId);
        })->orWhere(function($query) use ($user, $userId) {
            $query->where('expediteur_id', $userId)
                  ->where('destinataire_id', $user->id);
        })
        ->with(['expediteur', 'destinataire'])
        ->orderBy('created_at', 'asc')
        ->get();

        // Marquer tous les messages non lus de cette conversation comme lus
        Message::where('destinataire_id', $user->id)
            ->where('expediteur_id', $userId)
            ->whereNull('lu_le')
            ->update(['lu_le' => now()]);

        // Recharger les messages pour avoir les dates de lecture à jour
        $messages = Message::where(function($query) use ($user, $userId) {
            $query->where('expediteur_id', $user->id)
                  ->where('destinataire_id', $userId);
        })->orWhere(function($query) use ($user, $userId) {
            $query->where('expediteur_id', $userId)
                  ->where('destinataire_id', $user->id);
        })
        ->with(['expediteur', 'destinataire'])
        ->orderBy('created_at', 'asc')
        ->get();

        return response()->json([
            'data' => $messages
        ]);
    }

    public function unreadCount()
    {
        $user = Auth::user();
        
        // Compter les messages non lus où l'utilisateur est le destinataire
        $unreadCount = Message::where('destinataire_id', $user->id)
            ->whereNull('lu_le')
            ->count();

        return response()->json([
            'unread_count' => $unreadCount
        ]);
    }

    public function destroy($id)
    {
        $message = Message::findOrFail($id);
        
        // Only the sender can delete their own message
        if ($message->expediteur_id !== Auth::id()) {
            return response()->json(['message' => 'Vous ne pouvez supprimer que vos propres messages'], 403);
        }

        $message->delete();

        return response()->json([
            'message' => 'Message supprimé avec succès'
        ]);
    }

    public function deleteConversation($userId)
    {
        $user = Auth::user();
        
        // Delete all messages in the conversation
        $deletedCount = Message::where(function($query) use ($user, $userId) {
            $query->where('expediteur_id', $user->id)
                  ->where('destinataire_id', $userId);
        })->orWhere(function($query) use ($user, $userId) {
            $query->where('expediteur_id', $userId)
                  ->where('destinataire_id', $user->id);
        })->delete();

        return response()->json([
            'message' => 'Conversation supprimée avec succès',
            'deleted_count' => $deletedCount
        ]);
    }

    public function stats()
    {
        $user = Auth::user();
        
        $totalMessages = Message::where(function($query) use ($user) {
            $query->where('expediteur_id', $user->id)
                  ->orWhere('destinataire_id', $user->id);
        })->count();

        $unreadMessages = Message::where('destinataire_id', $user->id)
            ->whereNull('lu_le')
            ->count();

        return response()->json([
            'total' => $totalMessages,
            'unread' => $unreadMessages
        ]);
    }
}