<?php

namespace App\Mail;

use App\Models\DemandeFormation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ApplicationAccepted extends Mailable
{
    use Queueable, SerializesModels;

    public $application;

    /**
     * Créer une nouvelle instance de message.
     * Accepte désormais une DemandeFormation (nouveau modèle).
     */
    public function __construct(DemandeFormation $application)
    {
        $this->application = $application;
    }

    /**
     * Obtenir l'enveloppe du message.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Demande de formation Acceptée - StageConnect',
        );
    }

    /**
     * Obtenir la définition du contenu du message.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.application-accepted',
            with: [
                'application' => $this->application,
                'appName' => 'StageConnect',
            ]
        );
    }

    /**
     * Obtenir les pièces jointes du message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
