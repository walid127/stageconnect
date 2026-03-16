#!/bin/bash
echo "Starting Laravel Queue Worker..."
echo ""
echo "This will process queued emails in the background."
echo "Press Ctrl+C to stop the queue worker."
echo ""
php artisan queue:work


