#!/usr/bin/env bash
# Run every test suite in the repo. Usage: ./ejecutar_tests.sh   (needs: python deps of each folder, node ≥ 18)
set -u
cd "$(dirname "$0")"
fail=0
for d in 01-claude-skills 02-running-tools 03-ml-andrew-ng 06-tunel-viento-neuronal 07-generador-alas 08-barcos-oscuros 09-frances-delf 15-habitos 20-efecto-suelo 22-escalera-ironman 23-finanzas-sistema; do
  if [ -d "$d/tests" ]; then
    echo "== pytest $d"
    (cd "$d" && python -m pytest -q tests) || fail=1
  fi
done
for d in 10-gym-tracker 11-finanzas 12-mapa-viajes 15-habitos 21-idiomas-plan 25-habilidades/mecanografia 26-ritmo 27-paso 28-panel-vida 29-importar-salud; do
  echo "== node --test $d"
  (cd "$d" && node --test tests/*.test.js >/dev/null && echo ok) || { echo "FAIL $d"; fail=1; }
done
[ $fail -eq 0 ] && echo "✅ todos los tests pasan" || echo "❌ hay fallos"
exit $fail
