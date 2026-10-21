#!/usr/bin/env bash
# Compila y publica la app en la rama gh-pages (GitHub Pages).
set -euo pipefail
cd "$(dirname "$0")"
npm test
npm run build
tmp=$(mktemp -d)
cp -R dist/. "$tmp"
touch "$tmp/.nojekyll"
git -C "$tmp" init -q -b gh-pages
git -C "$tmp" add -A
git -C "$tmp" -c user.name="$(git config user.name)" -c user.email="$(git config user.email)" commit -q -m "Despliegue $(date '+%Y-%m-%d %H:%M')"
git -C "$tmp" push -f "$(git remote get-url origin)" gh-pages
rm -rf "$tmp"
echo "Publicado. En 1-2 minutos: https://$(gh api user -q .login).github.io/cuentakal/"
