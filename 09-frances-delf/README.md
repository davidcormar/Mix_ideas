# 09 · Banco de material de francés (camino al DELF B2)

Todo el material de apoyo para el plan de francés: de cero (oct 2026) al **DELF B2 (verano 2027)**, con control **B1 en marzo de 2027**. Pensado para usarse con la skill `frances-sesion` de `01-claude-skills/` (que genera y corrige las sesiones del ciclo de 7).

## Qué hay
| Carpeta / fichero | Contenido |
|---|---|
| [estructura-delf.md](estructura-delf.md) | A2, B1 y B2: las 4 pruebas, duraciones, puntuación, rúbricas, y un aviso realista sobre horas |
| [gramatica/a1-a2.md](gramatica/a1-a2.md) | 6 fichas: presente irregular, artículos/negación, futur proche y passé récent, passé composé, elisión/contracciones, COD/COI (48 ejercicios) |
| [gramatica/a2-b1.md](gramatica/a2-b1.md) | 6 fichas: imparfait vs. passé composé, futur simple, *y/en*, relativos, condicional + *si*, subjuntivo (48 ejercicios) |
| `soluciones/` | soluciones de las 12 fichas, aparte |
| `vocabulario/*.csv` | **8 mazos, 200 tarjetas** `frances;español;ejemplo` por temas del DELF (vida diaria, estudios/trabajo, deporte/salud, viajes, alimentación, medio ambiente, tecnología/medios, opinión y conectores) |
| [escritura/30-temas.md](escritura/30-temas.md) | 10 A2 (60-80 palabras), 10 B1 (160-180), 10 B2 (≥250), adaptados a tu vida |
| [oral/guiones-conversacion.md](oral/guiones-conversacion.md) | guiones para las 3 partes de la PO de A2, B1 y B2, con modelos y expresiones |
| [recursos.md](recursos.md) | 15 recursos gratuitos (TV5Monde, RFI, 1jour1actu, FEI, podcasts…) |

## Cómo usarlo
**Importar los mazos en Anki (escritorio):** *Archivo → Importar →* elige un `.csv`. Anki lee la cabecera (`#separator:Semicolon`, `#columns:…`) y asigna los campos solo. Usa el tipo de nota *Básico (y tarjeta invertida opcional)* si quieres practicar también español → francés. Repite con cada mazo (o crea un mazo por tema).

**En el ciclo de 7 sesiones:**
| Sesión | Material |
|---|---|
| G1 / G2 Gramática | una ficha por sesión, en orden (A1-A2 en nov-dic, A2-B1 en ene-feb) |
| E1 / E2 Escucha | `recursos.md` (TV5Monde, RFI facile) |
| L Lectura | 1jour1actu + preguntas de la skill |
| W Escritura | un tema de `30-temas.md` del nivel actual |
| C Conversación | un guion de `oral/` con Claude como interlocutor |

Tests (formato de los CSV y que cada ficha tenga soluciones):
```bash
cd 09-frances-delf && python -m pytest -q tests
```

## Qué está hecho
- 💡 Material completo para A1→B1 y arranque de B2. Tests de formato en verde.

## Qué falta / siguientes pasos
- Fichas B1-B2 (plus-que-parfait, discours rapporté, gérondif, voz pasiva, concordancia de tiempos) cuando llegues a marzo.
- Mazos de vocabulario B2 (economía, política, ciencia).
- Un simulacro DELF B1 completo con tiempos reales para el control de marzo (usa los *sujets d'exemple* oficiales de FEI).

## Decisiones
- **Ejemplos personalizados** (running, ingeniería, India, Galicia): se recuerda mejor el vocabulario con frases de tu vida.
- **Cabecera de Anki en los CSV** (`#separator`, `#columns`): importación sin configurar nada (Anki ≥ 2.1.55).
- **Duraciones del DELF** de las especificaciones de FEI; el aviso de formato renovado es porque FEI ha ido cambiando los tipos de ejercicio: confírmalo al inscribirte.
- Aviso sincero sobre horas: 1 h/día hasta el verano es justo para B2; el control de marzo sirve para decidir.

## Fuentes
- France Éducation International, DELF tout public: https://www.france-education-international.fr/diplome/delf-tout-public
- Marco Común Europeo de Referencia (Consejo de Europa): https://www.coe.int/en/web/common-european-framework-reference-languages
- Anki manual, importación de texto: https://docs.ankiweb.net/importing/text-files.html
- Grevisse, M. *Le Bon Usage* (referencia gramatical) · Bescherelle *La conjugaison pour tous*.
