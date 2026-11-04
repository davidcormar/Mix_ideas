# 19 · Viaje a Birmingham y Londres (19-22 nov 2026)

Itinerario orientativo con presupuesto ajustado (~300 €), transporte (contactless/Oyster), sitios gratuitos (museos) y una **ruta de 7 km para correr en Londres** el sábado 21 en GPX.

## Qué hay
| Fichero | Contenido |
|---|---|
| [guia-viaje.md](guia-viaje.md) | ⚠️ documentación (pasaporte + ETA), presupuesto, transporte, itinerario día a día, ruta |
| [ruta-hyde-park-7km.gpx](ruta-hyde-park-7km.gpx) | 7,1 km por Hyde Park y Kensington Gardens, 15 puntos de paso |
| `generar_ruta.py` | regenera el GPX (cambia los puntos de paso si quieres otra ruta) |

## Cómo usarlo
```bash
cd 19-londres
python generar_ruta.py                                      # regenerar el GPX
# (el GPX es una ruta sin tiempos: no se analiza con runtools)
```
Importa el GPX en Strava (*Rutas → Importar*) o en tu reloj.

## Qué está hecho
- 💡 Guía e itinerario.
- ✅ Ruta GPX generada y medida (7,09 km en línea recta entre puntos).

## Qué falta / siguientes pasos
- **Esta semana:** ETA, vuelos y albergues (el precio sube cada día).
- Ajustar el itinerario a las horas reales de los vuelos.

## Decisiones
- **Birmingham primero, Londres después**: así el último día estás cerca de los aeropuertos con más vuelos baratos.
- La ruta es un **bucle sin cruzar calles grandes** (solo dentro de los parques), empieza y acaba en metro (Marble Arch, Central line) y termina cerca de los museos de South Kensington por el lado sur.
- Puntos dibujados a mano a partir de coordenadas conocidas de los parques: revisa en el mapa antes de correr.
