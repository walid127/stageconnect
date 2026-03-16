<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Réinitialisation mot de passe - StageConnect</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; }
        .container { background: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1a365d; }
        .logo { font-size: 28px; font-weight: bold; color: #1a365d; }
        .content { margin: 20px 0; }
        .btn { display: inline-block; padding: 14px 28px; background: linear-gradient(to right, #1a365d, #2d3748); color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .btn:hover { opacity: 0.9; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096; }
        .warning { font-size: 13px; color: #718096; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">StageConnect</div>
        </div>
        <div class="content">
            <p>Bonjour,</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe pour l'adresse <strong>{{ $userEmail }}</strong>.</p>
            <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
            <p style="text-align: center;">
                <a href="{{ $resetUrl }}" class="btn">Réinitialiser mon mot de passe</a>
            </p>
            <p class="warning">Ce lien expire dans 60 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        </div>
        <div class="footer">
            <p>StageConnect – Plateforme de gestion des stages</p>
        </div>
    </div>
</body>
</html>
