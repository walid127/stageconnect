<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compte Activé - {{ $appName }}</title>
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
            border-bottom: 2px solid #1a365d;
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
            background: linear-gradient(135deg, #1a365d, #2d3748);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #1a365d, #2d3748);
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
            <h1 class="title">🎉 Votre compte a été activé !</h1>
        </div>

        <div class="content">
            <p>Bonjour <strong>{{ $user->nom }}</strong>,</p>
            
            <p>Nous avons le plaisir de vous informer que votre compte sur la plateforme {{ $appName }} a été activé avec succès.</p>

            <div class="highlight">
                <h3>✅ Compte Activé</h3>
                <p>Vous pouvez maintenant accéder à toutes les fonctionnalités de la plateforme.</p>
            </div>

            <p>Vous pouvez désormais :</p>
            <ul>
                <li>Consulter les formations disponibles</li>
                <li>Postuler aux formations qui vous intéressent</li>
                <li>Gérer votre profil</li>
                <li>Communiquer avec les administrateurs</li>
            </ul>

            <div style="text-align: center;">
                <a href="{{ config('app.url') }}/login" class="button">Accéder à la plateforme</a>
            </div>
        </div>

        <div class="footer">
            <p>Merci d'utiliser {{ $appName }} !</p>
            <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        </div>
    </div>
</body>
</html>
