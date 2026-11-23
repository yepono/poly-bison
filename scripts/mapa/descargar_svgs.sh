#!/usr/bin/env bash
# Descarga los planos SVG de la Guía Bisonte (La Integral) a scripts/mapa/svg/
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)/svg"
mkdir -p "$DIR"
for f in general plantabaja primerpiso segundopiso edificio3plantabaja edificio3piso1; do
  curl -fsSL "https://laintegral.online/GuiaBisonte/$f.svg" -o "$DIR/$f.svg"
  echo "ok $f.svg"
done
