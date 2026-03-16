<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compte Désactivé - {{ $appName }}</title>
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
            border-bottom: 2px solid #e53e3e;
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
            background: linear-gradient(135deg, #e53e3e, #c53030);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
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
            <h1 class="title">⚠️ Votre compte a été désactivé</h1>
        </div>

        <div class="content">
            <p>Bonjour <strong>{{ $user->nom }}</strong>,</p>
            
            <p>Nous vous informons que votre compte sur la plateforme {{ $appName }} a été désactivé.</p>

            <div class="highlight">
                <h3>❌ Compte Désactivé</h3>
                <p>Vous n'avez plus accès aux fonctionnalités de la plateforme.</p>
            </div>

            <p>Votre compte a été désactivé pour les raisons suivantes :</p>
            <ul>
                <li>Violation des conditions d'utilisation</li>
                <li>Comportement inapproprié</li>
                <li>Demande administrative</li>
            </ul>

            <p>Si vous pensez qu'il s'agit d'une erreur, veuillez contacter l'équipe administrative pour plus d'informations.</p>
        </div>

        <div class="footer">
            <p>Merci d'avoir utilisé {{ $appName }}.</p>
            <p>Pour toute question, contactez-nous.</p>
        </div>
    </div>
</body>
</html>
