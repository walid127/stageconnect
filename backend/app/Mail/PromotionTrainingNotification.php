<?php

namespace App\Mail;

use App\Models\Formateur;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PromotionTrainingNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $trainer;
    public $promotionType;
    public $yearsSinceRegistration;

    /**
     * Créer une nouvelle instance de message.
     */
    public function __construct(Formateur $trainer, $promotionType, $yearsSinceRegistration)
    {
        $this->trainer = $trainer;
        $this->promotionType = $promotionType;
        $this->yearsSinceRegistration = $yearsSinceRegistration;
    }

    /**
     * Obtenir l'enveloppe du message.
     */
    public function envelope(): Envelope
    {
        $promotionTypeLabel = $this->promotionType === '10_years' 
            ? 'Formation de Promotion (10 ans)'
            : 'Formation de Promotion (5 ans)';
            
        return new Envelope(
            subject: "{$promotionTypeLabel} Disponible - StageConnect",
        );
    }

    /**
     * Obtenir la définition du contenu du message.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.promotion-training-notification',
            with: [
                'trainer' => $this->trainer,
                'promotionType' => $this->promotionType,
                'promotionTypeLabel' => $this->promotionType === '10_years' 
                    ? 'Formation de Promotion (10 ans)'
                    : 'Formation de Promotion (5 ans)',
                'yearsSinceRegistration' => $this->yearsSinceRegistration,
                'appName' => 'StageConnect',
            ]
        );
    }

    /**
     * Obtenir les pièces jointes du message.
     */
    public function attachments(): array
    {
        return [];
    }
}
