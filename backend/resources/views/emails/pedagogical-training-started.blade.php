<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formation Pédagogique Démarrée - {{ $appName }}</title>
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
            border-bottom: 2px solid #4299e1;
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
            background: linear-gradient(135deg, #4299e1, #3182ce);
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
            <h1 class="title">📚 Formation Pédagogique Démarrée</h1>
        </div>

        <div class="content">
            <p>Bonjour <strong>{{ $trainer->utilisateur->nom ?? $trainer->nom }}</strong>,</p>
            
            <p>Nous avons le plaisir de vous informer que votre formation pédagogique a commencé.</p>

            <div class="highlight">
                <h3>✅ Formation en Cours</h3>
                <p>Votre formation pédagogique est maintenant active.</p>
            </div>

            <div class="training-info">
                <h3>📅 Détails de la Formation</h3>
                <p><strong>Date de début :</strong> {{ \Carbon\Carbon::parse($startDate)->format('d/m/Y') }}</p>
                <p><strong>Date de fin :</strong> {{ \Carbon\Carbon::parse($endDate)->format('d/m/Y') }}</p>
                @if($trainer->pedagogical_schedule_file)
                    <p><strong>📎 Emploi du temps :</strong> Pièce jointe dans cet email</p>
                @endif
            </div>

            <p>Nous vous souhaitons une excellente formation !</p>
        </div>

        <div class="footer">
            <p>L'équipe {{ $appName }}</p>
        </div>
    </div>
</body>
</html>











