# 18 · Servidor en casa

Guía paso a paso para montar un servidor casero barato y seguro (mini PC usado o PC viejo + Ubuntu Server + Docker + Tailscale + copias con restic) y qué servicios montar primero (Immich, Jupyter, Jellyfin, Uptime Kuma), con costes y consumo.

## Qué hay
| Fichero | Contenido |
|---|---|
| [guia.md](guia.md) | hardware (tabla de opciones y precios), consumo y coste eléctrico, Ubuntu Server endurecido, Docker, Tailscale, 7 servicios por orden, copias 3-2-1 con restic, plan de 4 fines de semana |
| `compose/` | `docker-compose` de Jupyter, Jellyfin y Uptime Kuma, instrucciones de Immich (usa su compose oficial) y `backup.sh` con restic |

## Cómo usarlo
Sigue `guia.md` en orden. Copia cada fichero de `compose/` a `~/servicios/<nombre>/docker-compose.yml` y ejecuta `docker compose up -d` en esa carpeta.

## Qué está hecho
- 💡 Guía completa + ficheros de configuración (YAML validado, `backup.sh` con sintaxis comprobada; no probados en un servidor real).

## Qué falta / siguientes pasos
- Decidir si lo montas **antes o después de India** (recomiendo después, o con 3 semanas de margen antes de irte).
- Elegir hardware: mira mini PCs usados (M720q, EliteDesk mini, OptiPlex Micro) en Wallapop/eBay.

## Decisiones
- **Tailscale en vez de abrir puertos**: acceso desde cualquier sitio (incluida India) sin exponer servicios a internet.
- **Mini PC usado** frente a Raspberry Pi: x86 (compatibilidad total con imágenes Docker), transcodificación por hardware y precio similar.
- **Immich con su compose oficial**: cambia entre versiones; copiar uno fijo acaba rompiéndose.
- **restic** para copias: cifrado y deduplicado, y la guía insiste en **restaurar de prueba**.
