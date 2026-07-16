#!/usr/bin/env bash
# Menjalankan proyek MOV dalam mode development.
# Menyalakan: server Laravel, queue worker, log tail (pail), dan Vite dev server.
# Mode produksi sederhana: ./start.sh --prod (build aset lalu serve tanpa Vite).
set -euo pipefail
cd "$(dirname "$0")"

[ -d vendor ] || { echo "vendor/ belum ada — jalankan ./install.sh dulu."; exit 1; }
[ -f .env ]   || { echo ".env belum ada — jalankan ./install.sh dulu."; exit 1; }

if command -v bun >/dev/null; then
  JS_RUN="bun run"
  NPX="bunx"
else
  JS_RUN="npm run"
  NPX="npx"
fi

if [ "${1:-}" = "--prod" ]; then
  echo "[INFO] Build aset produksi..."
  $JS_RUN build
  echo "[INFO] Serve di http://127.0.0.1:8000"
  exec php artisan serve
fi

echo "[INFO] Mode dev: server + queue + logs + vite (Ctrl+C untuk berhenti)"
exec $NPX concurrently -c "#93c5fd,#c4b5fd,#fb7185,#fdba74" \
  "php artisan serve" \
  "php artisan queue:listen --tries=1" \
  "php artisan pail --timeout=0" \
  "$JS_RUN dev" \
  --names=server,queue,logs,vite --kill-others
