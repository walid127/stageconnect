<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $promotionTypeLabel }} Disponible - {{ $appName }}</title>
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
            border-bottom: 2px solid #d4af37;
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
            background: linear-gradient(135deg, #d4af37, #b8860b);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        }
        .training-info {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
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
            <h1 class="title">🎓 {{ $promotionTypeLabel }}</h1>
        </div>

        <div class="content">
            <p>Bonjour <strong>{{ $trainer->utilisateur->nom ?? $trainer->nom }}</strong>,</p>
            
            <p>Félicitations ! Vous êtes maintenant éligible pour une formation de promotion.</p>

            <div class="highlight">
                <h3>✨ Formation de Promotion Disponible</h3>
                <p>Vous avez complété <strong>{{ $yearsSinceRegistration }} ans</strong> de service !</p>
            </div>

            <div class="training-info">
                <h3>📊 Informations</h3>
                <p><strong>Type de formation :</strong> {{ $promotionTypeLabel }}</p>
                <p><strong>Années de service :</strong> {{ $yearsSinceRegistration }} ans</p>
                @if($promotionType === '10_years')
                    <p><strong>🎉 Félicitations pour votre décennie de service !</strong></p>
                @else
                    <p><strong>🎊 Excellent travail pour vos 5 années de service !</strong></p>
                @endif
            </div>

            <p>Cette formation est une excellente opportunité pour continuer à développer vos compétences et progresser dans votre carrière.</p>

            <p>Nous vous encourageons à vous inscrire dès que possible pour réserver votre place.</p>
        </div>

        <div class="footer">
            <p>Félicitations pour votre dévouement et votre travail acharné !</p>
            <p>L'équipe {{ $appName }}</p>
        </div>
    </div>
</body>
</html>











