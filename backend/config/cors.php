<?php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'https://stageconnect-lyart.vercel.app', // Current Vercel frontend URL
        'https://stageconnect.vercel.app', // Alternative Vercel URL
        'http://localhost:5173', // Local dev
    ],

    'allowed_origins_patterns' => [
        '/https:\/\/.*\.vercel\.app/', // Allow all Vercel preview URLs
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];


