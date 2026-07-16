#!/usr/bin/env bash
# Instalasi proyek MOV (Laravel 12 + Inertia React + Vite + SQLite)
set -euo pipefail
cd "$(dirname "$0")"

info()  { printf '\033[1;34m[INFO]\033[0m %s\n' "$*"; }
error() { printf '\033[1;31m[ERROR]\033[0m %s\n' "$*" >&2; exit 1; }

# --- Cek prasyarat ---
command -v php >/dev/null || error "PHP tidak ditemukan. Install PHP >= 8.2 dulu (brew install php)."
php -r 'exit(version_compare(PHP_VERSION, "8.2.0", ">=") ? 0 : 1);' \
  || error "Butuh PHP >= 8.2, terdeteksi $(php -r 'echo PHP_VERSION;')."

# Pilih package manager JS: bun > npm
if command -v bun >/dev/null; then
  JS_INSTALL="bun install"
elif command -v npm >/dev/null; then
  JS_INSTALL="npm install"
else
  error "bun/npm tidak ditemukan. Install Node.js atau Bun dulu."
fi

# Pilih composer: global > phar lokal
if command -v composer >/dev/null; then
  COMPOSER="composer"
elif [ -f composer.phar ]; then
  COMPOSER="php composer.phar"
else
  error "Composer tidak ditemukan dan composer.phar tidak ada."
fi

# --- Dependensi PHP ---
info "Install dependensi PHP ($COMPOSER install)..."
if ! $COMPOSER install; then
  # Beberapa paket di lock file membatasi versi PHP maksimum (mis. ~8.4.0)
  # padahal tetap berjalan normal di PHP yang lebih baru.
  info "Install gagal karena batasan versi platform — coba ulang dengan --ignore-platform-req=php..."
  $COMPOSER install --ignore-platform-req=php
fi

# --- File .env + APP_KEY ---
if [ ! -f .env ]; then
  info "Menyalin .env.example -> .env"
  cp .env.example .env
fi
if ! grep -q '^APP_KEY=base64' .env; then
  info "Generate APP_KEY..."
  php artisan key:generate
fi

# --- Database SQLite + migrasi ---
if [ ! -f database/database.sqlite ]; then
  info "Membuat database/database.sqlite"
  touch database/database.sqlite
fi
info "Menjalankan migrasi..."
php artisan migrate --force

# Seeder opsional: jalankan dengan ./install.sh --seed
if [ "${1:-}" = "--seed" ]; then
  info "Menjalankan seeder..."
  php artisan db:seed --force
fi

# --- Dependensi JS + build aset ---
info "Install dependensi JS ($JS_INSTALL)..."
$JS_INSTALL

# --- Storage link ---
php artisan storage:link 2>/dev/null || true

info "Instalasi selesai."
if ! grep -q '^FIREBASE_API_KEY=.\+' .env; then
  printf '\033[1;33m[PERHATIAN]\033[0m FIREBASE_API_KEY di .env masih kosong — isi jika fitur Firebase dipakai (lihat FIREBASE_SYNC_SETUP.md).\n'
fi
echo "Jalankan aplikasi dengan: ./start.sh"
