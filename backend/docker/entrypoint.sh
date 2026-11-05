#!/bin/sh
set -e

# Clear any stale cached config so env vars are always picked up fresh
php artisan config:clear || true
php artisan cache:clear || true

# Cache configuration, routes, and views with current env vars
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# Run database migrations
php artisan migrate --force || true

# Seed only if DB is empty (the seeder itself checks and exits early if data exists)
php artisan db:seed --force || true

# Ensure local storage symlink exists (if local fallback is used)
php artisan storage:link || true

# Start PHP-FPM in background
php-fpm -D

# Start Nginx in foreground
exec nginx -g "daemon off;"
