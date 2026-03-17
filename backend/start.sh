#!/bin/bash
set -e

# Ensure app key is present (Render provides env vars at runtime; .env may not exist in image build).
if [ -z "$APP_KEY" ]; then
  php artisan key:generate --force
fi

# Cache config at runtime so it uses current env vars.
php artisan config:cache

# Run migrations + seeders (idempotent)
php artisan migrate --force
php artisan db:seed --force

# Start queue worker in background so queued jobs (notifications, emails, etc.) are processed.
php artisan queue:work --sleep=3 --tries=3 &

# Start the web server in foreground.
php artisan serve --host 0.0.0.0 --port 10000