# Dossier técnico · Barcos oscuros (SAR + AIS)

## 1. Física básica del SAR (lo mínimo para no perderse)
| Concepto | Qué es | Por qué importa para detectar barcos |
|---|---|---|
| **SAR** (radar de apertura sintética) | radar activo lateral; sintetiza una antena larga con el movimiento del satélite | ve **de noche y con nubes** |
| **Banda C** (Sentinel-1, 5,405 GHz, λ ≈ 5,5 cm) | longitud de onda | el mar en calma es oscuro; el metal brilla mucho |
| **σ⁰ (sigma nought)** | retrodispersión calibrada por unidad de área, en dB | mar ≈ −15 a −25 dB; barco ≫ 0 dB (reflectores diédricos/triédricos de la superestructura) |
| **Speckle** | ruido **multiplicativo** por interferencia coherente; intensidad ~ exponencial (1 *look*) o gamma (L *looks*) | genera falsos positivos; por eso se usa CFAR con estadística del entorno y no un umbral fijo |
| **Polarización VV / VH** | emite V y recibe V (co-pol) u H (cross-pol) | **VH**: el mar devuelve muy poco → mejor contraste para barcos; **VV**: más señal pero más *clutter* de oleaje. Se usan las dos |
| **Ángulo de incidencia** (IW: ~29-46°) | ángulo con la vertical | a mayor incidencia, mar más oscuro → mejor detección en el *far range* |
| **Viento** | rugosidad del mar | viento fuerte = mar brillante = más falsas alarmas |
| **Ambigüedades de acimut** | "fantasmas" de objetos muy brillantes desplazados en acimut | falsos positivos típicos cerca de barcos grandes o de costa |
| **Desplazamiento Doppler** | un barco en movimiento aparece **desplazado** de su estela en acimut | afecta al cruce con AIS (decenas a cientos de metros) |

## 2. Cómo conseguir Sentinel-1 gratis
| Vía | Qué ofrece | Cuenta |
|---|---|---|
| **Copernicus Data Space Ecosystem** — https://dataspace.copernicus.eu | catálogo completo (GRD, SLC), Copernicus Browser, APIs OData/STAC, procesado en la nube (openEO, Sentinel Hub con cuota gratuita) | gratuita (la creas tú) |
| **ASF Vertex** (Alaska Satellite Facility) — https://search.asf.alaska.edu | espejo de Sentinel-1, búsqueda cómoda, productos RTC | NASA Earthdata (gratuita) |
| **Microsoft Planetary Computer** — colección `sentinel-1-grd` / `sentinel-1-rtc` | acceso STAC, ideal con Python (`pystac-client`), lectura por trozos (COG) sin descargar la escena entera | acceso a datos sin cuenta (con SAS token público) |
| **Google Earth Engine** — `COPERNICUS/S1_GRD` | ya calibrado y ortorrectificado en dB; perfecto para explorar | gratuita para uso no comercial/investigación |

**Producto a usar:** *Level-1 GRD, modo IW, polarización VV+VH*, píxel de 10 m (resolución ~20×22 m). Una escena IW cubre ~250 km de ancho y pesa ~1 GB.
**Satélites:** Sentinel-1A en órbita desde 2014; 1B falló en diciembre de 2021; 1C lanzado en diciembre de 2024 (consulta el estado actual de la constelación y de 1D en la web de la ESA). Revisita de ~6-12 días según la zona.

**Preprocesado estándar** (SNAP de la ESA, gratuito, o `pyroSAR`/`sarsen` en Python): *Apply orbit file → Thermal noise removal → Calibration (σ⁰) → (Speckle filter opcional) → Terrain correction → dB*.

## 3. xView3-SAR: qué es y cómo pedirlo
- Reto de 2021-22 de **DIU** (Defense Innovation Unit) y **Global Fishing Watch** para detectar actividad pesquera ilegal (IUU) con Sentinel-1.
- **Datos:** casi 1.000 escenas Sentinel-1 completas (VV y VH, ya preprocesadas a 10 m) + capas auxiliares (batimetría, velocidad y dirección del viento, máscaras de tierra/hielo). Etiquetas por objeto: posición, `is_vessel`, `is_fishing`, `vessel_length_m`, confianza; generadas combinando AIS y revisión manual.
- **Tamaño:** varios TB en total; hay un subconjunto *tiny* y escenas sueltas para empezar.
- **Cómo pedirlo:** web del reto https://iuu.xview.us/ → registro gratuito (lo haces tú) → aceptar la licencia (CC BY-NC-SA 4.0, uso no comercial) → descarga.
- **Métrica oficial:** combinación de F1 de detección, F1 de detección cerca de costa, F1 barco/no barco, F1 pesca/no pesca y error relativo de eslora.
- Artículo: Paolo et al. (2022), *xView3-SAR: Detecting Dark Fishing Activity Using Synthetic Aperture Radar Imagery*, NeurIPS Datasets & Benchmarks. https://arxiv.org/abs/2206.00897

## 4. Arquitecturas base (lo que funcionó en xView3)
| Enfoque | Idea | Notas |
|---|---|---|
| **CFAR clásico** (este repo) | umbral adaptativo a la estadística local del mar | baseline sin entrenamiento; muchas falsas alarmas con viento, ambigüedades y costa |
| **Detección por centros (tipo CenterNet)** | la red predice un *heatmap* de centros de objeto + regresión de eslora + clasificación (barco/pesca) en cada píxel | enfoque de las soluciones punteras; encaja con objetos pequeños (unos pocos píxeles) |
| **Segmentación U-Net + post-proceso** | máscara de "barco" y luego componentes conexas | sencillo y robusto |
| **Faster R-CNN / YOLO** sobre *tiles* | detectores de cajas clásicos | peor con objetos de 2-5 píxeles si no se adapta el *stride* |

Claves que compartían las mejores soluciones: entrenar sobre ***tiles*** (512-2048 px) con solape; entrada **VV + VH + capas auxiliares** (batimetría, viento); normalización por escena; encoders preentrenados (EfficientNet, ConvNeXt…); *test-time augmentation*; y fusión de detecciones de tiles solapados. El código del 1.er puesto (Eugene Khvedchenya, "BloodAxe") y de otros finalistas es público en GitHub: úsalo como referencia para el *spike*.

## 5. Cruce con AIS (fuentes abiertas)
| Fuente | Cobertura | Acceso |
|---|---|---|
| **Danish Maritime Authority** — http://web.ais.dk/aisdata/ | aguas danesas (Báltico, mar del Norte), histórico diario en CSV | libre, sin cuenta |
| **NOAA MarineCadastre** — https://hub.marinecadastre.gov/pages/vesseltraffic | aguas de EE. UU. | libre |
| **Global Fishing Watch** — https://globalfishingwatch.org/our-apis/ | global, actividad pesquera y detecciones SAR ya hechas | API gratuita no comercial (registro) |
| AISHub / receptores propios | variable | intercambio de datos |

**Algoritmo de cruce:**
1. Filtrar AIS a la ventana temporal de la imagen (±30-60 min) y a la huella de la escena.
2. **Interpolar** cada trayectoria AIS a la hora exacta de adquisición (lineal o con rumbo/velocidad). A 15 nudos un barco recorre ~460 m por minuto.
3. Corregir el **desplazamiento Doppler** si la velocidad radial es grande (opcional al principio).
4. **Asignación óptima** detección↔AIS (algoritmo húngaro) con una puerta de distancia (300-1.000 m según el desfase temporal).
5. Detección sin pareja = **candidato a barco oscuro** (o falsa alarma, o barco pequeño sin obligación de AIS → filtrar por eslora estimada > 15 m).
6. AIS sin detección = barco no visto (demasiado pequeño, fuera de la imagen o AIS falseado → también interesante: *spoofing*).

## 6. Esqueleto del pipeline (implementado en `sarpipe/`)
```
escena GRD (VV/VH, σ⁰) ──► máscara de tierra ──► tiles 512 px (solape 64)
     ──► detector (CA-CFAR hoy; CNN mañana) ──► componentes conexas
     ──► fusión de duplicados ──► eslora por PCA ──► cruce AIS (húngaro + puerta)
     ──► tabla de detecciones + mapa (verde con AIS / rojo oscuro)
```

## 7. Ética y límites
- Solo datos públicos; el objetivo es transparencia y conservación (pesca ilegal), no vigilancia de personas.
- Un barco "oscuro" no es automáticamente ilegal (barcos pequeños no obligados, fallos de cobertura AIS por satélite).
