FROM php:8.2-apache

RUN apt-get update && apt-get install -y \
    libzip-dev \
    unzip \
    git \
    curl \
    && docker-php-ext-install zip pdo pdo_mysql

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

COPY docker/php/uploads.ini /usr/local/etc/php/conf.d/99-uploads.ini

RUN composer install --no-dev --optimize-autoloader

# Defer key generation and config caching to container startup so runtime env vars are used.
# During image build, .env may not exist (Render injects env vars at runtime).
# This avoids warnings like: file_get_contents(/var/www/html/.env): No such file or directory

COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

RUN chown -R www-data:www-data storage bootstrap/cache

EXPOSE 10000

CMD ["/usr/local/bin/start.sh"]