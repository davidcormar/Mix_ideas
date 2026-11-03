# Barcos oscuros: detectar en radar los barcos que apagan el AIS

> **En una frase:** detectar barcos en imágenes de radar de satélite (Sentinel-1, gratis) y señalar los que **no** emiten su posición AIS: pesca ilegal, flota en la sombra, amenazas a cables submarinos.

## Problema
- Los barcos grandes deben emitir AIS (posición, identidad). Muchos lo apagan o lo falsean.
- El radar de apertura sintética (SAR) ve a través de nubes y de noche: un barco metálico es un punto brillante sobre el mar oscuro.
- Cruzar detecciones SAR con AIS permite encontrar los "barcos oscuros".

## Por qué importa
- Global Fishing Watch (Paolo et al., *Nature*, 2024) estimó que alrededor de **tres cuartas partes** de los barcos de pesca industrial no aparecen en los sistemas públicos de seguimiento.
- Actualidad: "flota en la sombra" de petroleros y daños a cables submarinos en el Báltico; vigilancia marítima es un área donde convergen ML, espacio y defensa.

## Qué se construye
1. **Pipeline de escenas Sentinel-1** (GRD, VV+VH): calibración, recorte en *tiles*, máscara de tierra.
2. **Detector** (CNN tipo U-Net/CenterNet o Faster R-CNN) entrenado con **xView3-SAR**: detecta objetos, distingue barco/no barco, pesca/no pesca y estima eslora.
3. **Cruce con AIS** (datos abiertos: Global Fishing Watch, MarineCadastre en EE. UU., Danish Maritime Authority): emparejar detecciones con posiciones AIS interpoladas a la hora de la imagen.
4. **Mapa** de detecciones "oscuras" en una zona de interés (p. ej. Galicia o el estrecho de Ormuz) con informe.

## Datos
| Fuente | Qué | Coste |
|---|---|---|
| xView3-SAR (GFW + DIU) | ~1.000 escenas Sentinel-1 etiquetadas | gratis (registro) |
| Copernicus Data Space | todas las escenas Sentinel-1 | gratis (registro) |
| AIS abierto (DMA, NOAA MarineCadastre, GFW) | posiciones de barcos | gratis |

## Stack
Python · PyTorch · rasterio/GDAL · SNAP o `sarpy` · GeoPandas · Leaflet/Folium · GPU (Colab/Kaggle: 30 h/semana gratis).

## Riesgos
| Riesgo | Mitigación |
|---|---|
| Escenas enormes (~1 GB cada una) | trabajar con un subconjunto y *tiles*; Kaggle/Colab |
| Mucha gente ya ha trabajado en xView3 (2021-22) | aportar el cruce AIS en una zona nueva y el análisis, no solo el detector |
| AIS europeo abierto limitado | DMA (Dinamarca) es abierto y masivo; empezar ahí |
| Tema sensible (defensa) | usar solo datos públicos, objetivo de transparencia y conservación |

## Hitos
- **3 meses:** detector entrenado sobre un subconjunto de xView3 con métrica oficial (F1 de detección) razonable; inferencia sobre una escena nueva de Copernicus.
- **6 meses:** cruce con AIS de Dinamarca; mapa de "barcos oscuros" de un mes; informe y repo público.

## Qué aprende cada uno
- **David:** visión por computador en imágenes no ópticas, detección de objetos, datos geoespaciales.
- **Compañero:** procesamiento SAR y geoespacial (proyecciones, GDAL), ingeniería de datos (AIS: millones de filas).
- **Ambos:** proyecto con impacto social claro y muy "contable" en entrevistas.
