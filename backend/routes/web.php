<?php

use Illuminate\Support\Facades\Route;

// Welcome route for API-only backend
Route::get('/', function () {
    return response()->json([
        'message' => 'StageConnect API',
        'version' => '1.0.0',
        'status' => 'active',
        'docs' => '/api/health'
    ]);
});

