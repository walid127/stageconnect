<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetLink extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public string $resetUrl;
    public string $userEmail;

    /**
     * Create a new message instance.
     */
    public function __construct(string $token, string $email)
    {
        $this->userEmail = $email;
        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');
        $this->resetUrl = $frontendUrl . '/reset-password?token=' . urlencode($token) . '&email=' . urlencode($email);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Réinitialisation de votre mot de passe - StageConnect',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.password-reset-link',
        );
    }
}
