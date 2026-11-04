# 05 · Presentar las ideas de proyecto al compañero (23-29 nov)

Material para proponer un proyecto conjunto: un *one-pager* por idea, una comparativa honesta y una presentación de 13 diapositivas en Markdown (Marp).

## Qué hay
| Fichero | Contenido |
|---|---|
| [one-pager-suite-aero.md](one-pager-suite-aero.md) | Túnel de viento neuronal + generador de alas: problema, por qué importa, qué se construye, datos, stack, riesgos, hitos 3/6 meses, qué aprende cada uno |
| [one-pager-barcos-oscuros.md](one-pager-barcos-oscuros.md) | Detección SAR + cruce AIS, misma estructura |
| [comparativa.md](comparativa.md) | 10 criterios puntuados (38 vs 36) y lectura honesta |
| [presentacion.md](presentacion.md) | 13 diapositivas Marp (con figuras reales de 06 y 07) |

## Cómo usarlo
**Ver/exportar la presentación (gratis):**
- VS Code + extensión **Marp for VS Code** → abrir `presentacion.md` → vista previa → *Export Slide Deck* (PDF/PPTX/HTML).
- O por terminal (necesita Node):
```bash
npx @marp-team/marp-cli@latest presentacion.md --pdf
```
```bash
npx @marp-team/marp-cli@latest presentacion.md --pptx
```

**Antes de la reunión (23-29 nov):**
1. Revisa los números de los prototipos `06-` y `07-` y actualiza la diapositiva 4 si cambian.
2. Decide qué parte te pedirías tú en cada idea (te lo va a preguntar).
3. Lleva el one-pager de cada idea impreso o en PDF para que se lo quede.

## Qué está hecho
- 💡 Los cuatro documentos, listos para usar.

## Qué falta / siguientes pasos
- ✅ Añadida diapositiva con los resultados y la figura del generador (07). Si exportas a PDF desde otra carpeta, mantén las rutas relativas `../07-generador-alas/...`.
- Adaptar los "qué aprende cada uno" cuando sepas qué le interesa a tu compañero.

## Decisiones
- **Marp** en lugar de PowerPoint: es Markdown (versionable en Git) y se exporta a PDF/PPTX.
- **Comparativa con un casi empate**: lo he puntuado honestamente; la decisión debe depender de la motivación de los dos. Propongo un *spike* de 2 semanas para decidir con datos.
- Datos de impacto con fuente: Paolo et al. (2024), *Nature* (ver fuentes).

## Fuentes
- Paolo, F. et al. (2024). *Satellite mapping reveals extensive industrial activity at sea*. Nature 625, 85-91. https://www.nature.com/articles/s41586-023-06825-8
- xView3-SAR: Paolo et al. (2022), NeurIPS Datasets & Benchmarks. https://iuu.xview.us/
- AirfRANS: Bonnet et al. (2022), NeurIPS Datasets & Benchmarks. https://github.com/Extrality/AirfRANS
- NeuralFoil: https://github.com/peterdsharpe/NeuralFoil
- UIUC Airfoil Coordinates Database: https://m-selig.ae.illinois.edu/ads/coord_database.html
- Marp: https://marp.app/
