<?php

namespace App\Mail;

use App\Models\Formateur;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class PedagogicalTrainingStarted extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $trainer;
    public $startDate;
    public $endDate;

    /**
     * Créer une nouvelle instance de message.
     */
    public function __construct(Formateur $trainer, $startDate, $endDate)
    {
        $this->trainer = $trainer;
        $this->startDate = $startDate;
        $this->endDate = $endDate;
    }

    /**
     * Obtenir l'enveloppe du message.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Formation Pédagogique Démarrée - StageConnect',
        );
    }

    /**
     * Obtenir la définition du contenu du message.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.pedagogical-training-started',
            with: [
                'trainer' => $this->trainer,
                'startDate' => $this->startDate,
                'endDate' => $this->endDate,
                'appName' => 'StageConnect',
            ]
        );
    }

    /**
     * Obtenir les pièces jointes du message.
     */
    public function attachments(): array
    {
        $attachments = [];
        
        // Joindre le fichier d'emploi du temps s'il existe
        $edt = $this->trainer->edtPedagogique()->first();
        if ($edt && Storage::disk('public')->exists($edt->fichier)) {
            $attachments[] = Attachment::fromStorageDisk('public', $edt->fichier)
                ->as(basename($edt->fichier) ?: 'emploi_temps.pdf');
        }
        
        return $attachments;
    }
}
