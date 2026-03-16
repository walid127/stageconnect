<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Demande de formation Acceptée - {{ $appName }}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #38a169;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #1a365d;
            margin-bottom: 10px;
        }
        .title {
            color: #2d3748;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .content {
            margin-bottom: 30px;
        }
        .highlight {
            background: linear-gradient(135deg, #38a169, #2f855a);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        }
        .stage-info {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #38a169, #2f855a);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #718096;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">{{ $appName }}</div>
            <h1 class="title">🎉 Félicitations ! Votre demande de formation a été acceptée</h1>
        </div>

        <div class="content">
            <p>Bonjour <strong>{{ $application->formateur->nom }}</strong>,</p>
            
            <p>Nous avons le plaisir de vous informer que votre demande pour la formation a été acceptée !</p>

            <div class="highlight">
                <h3>✅ Demande de formation Acceptée</h3>
                <p>Vous avez été sélectionné(e) pour participer à cette formation.</p>
            </div>

            <div class="stage-info">
                <h3>📚 Détails de la Formation</h3>
                <p><strong>Titre :</strong> {{ $application->formation->titre }}</p>
                <p><strong>Spécialité :</strong> {{ $application->formation->categorie }}</p>
                <p><strong>Début :</strong> {{ \Carbon\Carbon::parse($application->formation->date_deb)->format('d/m/Y') }}</p>
                <p><strong>Fin :</strong> {{ \Carbon\Carbon::parse($application->formation->date_fin)->format('d/m/Y') }}</p>
                <p><strong>Lieu :</strong> {{ $application->formation->lieu }}</p>
            </div>

            <p>Prochaines étapes :</p>
            <ul>
                <li>Vous recevrez des instructions détaillées par email</li>
                <li>Préparez-vous pour le début de la formation</li>
                <li>Contactez l'équipe si vous avez des questions</li>
            </ul>

            <div style="text-align: center;">
                <a href="{{ url('/formateur/formations') }}" class="button">Voir mes formations</a>
            </div>
        </div>

        <div class="footer">
            <p>Félicitations et bienvenue dans cette formation !</p>
            <p>L'équipe {{ $appName }}</p>
        </div>
    </div>
</body>
</html>
