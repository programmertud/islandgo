FROM php:8.3-fpm-alpine

# Install system dependencies, Nginx, tools, and PHP extensions
RUN apk add --no-cache \
    nginx \
    curl \
    libpng-dev \
    libxml2-dev \
    zip \
    unzip \
    git \
    oniguruma-dev \
    libzip-dev \
    icu-dev \
    linux-headers \
    mysql-client \
    dos2unix \
    ca-certificates

RUN docker-php-ext-install pdo pdo_mysql mbstring exif pcntl bcmath gd intl zip opcache

# Copy Composer from official image
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# Copy composer definition and install dependencies
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

# Copy the rest of the application
COPY . .

# Finish composer setup
RUN composer dump-autoload --optimize --no-dev

# Set permissions for storage and bootstrap cache
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache \
    && chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# Copy Nginx config and entrypoint
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# Fix Windows CRLF if committed from Windows and grant execute permissions
RUN dos2unix /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
