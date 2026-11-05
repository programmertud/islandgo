#!/bin/sh
set -e

# Cache configuration, routes, and views
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# Run database migrations and seed default data
php artisan migrate --force || true
php artisan db:seed --force || true

# Ensure local storage symlink exists (if local fallback is used)
php artisan storage:link || true

# Start PHP-FPM in background
php-fpm -D

# Start Nginx in foreground
exec nginx -g "daemon off;"
