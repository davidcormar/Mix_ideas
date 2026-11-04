# Guía: montar un servidor en casa (barato y seguro)

## 0. Para qué te sirve
- **Fotos** fuera de Google (Immich) · **pelis/series** propias (Jellyfin) · **Jupyter** siempre encendido para ML ligero · **copias de seguridad** de tu vault de Obsidian y repos · aprender Linux, Docker y redes (suma en un CV de ML Engineer: MLOps).

## 1. Hardware
| Opción | Precio aprox. | Consumo | Pros | Contras |
|---|---|---|---|---|
| **PC/portátil viejo** que ya tengas | 0 € | 20-60 W | gratis, x86 | ruido, consumo; portátil = SAI integrado (batería) |
| **Mini PC usado** (Lenovo M720q / HP EliteDesk 800 G3-G4 mini / Dell OptiPlex Micro, i5 8.ª gen, 8-16 GB) | 80-150 € (segunda mano) | 8-15 W en reposo | silencioso, eficiente, x86, transcodificación por GPU Intel (Quick Sync) | 1 disco de 2,5" + 1 NVMe como mucho |
| Mini PC nuevo N100 | 130-200 € | 6-10 W | muy eficiente, nuevo | poca RAM ampliable en algunos modelos |
| Raspberry Pi 5 (8 GB) + SSD | 120-150 € | 5-8 W | eficiente, comunidad | ARM (algunas imágenes no), transcodificación limitada |

**Recomendación:** mini PC usado con i5 de 8.ª gen o superior, **16 GB de RAM** y un **SSD de 1-2 TB** (fotos) + disco externo USB para copias.

**Coste eléctrico** (≈ 0,15 €/kWh): 10 W × 24 h × 365 = 88 kWh/año ≈ **13 €/año**; un PC viejo a 40 W ≈ **53 €/año**.

## 2. Sistema operativo
- **Ubuntu Server 24.04 LTS** (o Debian 12): estable, mucha documentación.
- Instalación: USB con la imagen (Rufus/balenaEtcher) → instalar con **OpenSSH** marcado → usuario no-root.
- Primeros pasos:
```bash
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y unattended-upgrades ufw htop
sudo dpkg-reconfigure -plow unattended-upgrades   # actualizaciones de seguridad automáticas
sudo ufw allow OpenSSH && sudo ufw enable
```
- SSH con clave (en tu portátil `ssh-keygen -t ed25519` y `ssh-copy-id usuario@servidor`), luego desactiva el login por contraseña en `/etc/ssh/sshd_config` (`PasswordAuthentication no`).
- IP fija: reserva DHCP en el router para la MAC del servidor.

## 3. Docker
```bash
curl -fsSL https://get.docker.com | sh       # script oficial de Docker
sudo usermod -aG docker $USER && newgrp docker
docker run hello-world
```
Organiza todo en `~/servicios/<nombre>/docker-compose.yml` (ver carpeta `compose/` de este repo).

## 4. Acceso desde fuera: **Tailscale** (sin abrir puertos)
- VPN *mesh* basada en WireGuard; plan personal gratuito.
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```
- Instala Tailscale en el móvil y el portátil con la misma cuenta → accedes a `http://servidor:2283` (Immich) desde cualquier sitio, **también desde India**, sin exponer nada a internet.
- **No abras puertos en el router** ni publiques servicios: es el error de seguridad número uno.

## 5. Servicios (orden recomendado)
| # | Servicio | Para qué | Puerto | Dificultad |
|---|---|---|---|---|
| 1 | **Tailscale** | acceso remoto seguro | — | ⭐ |
| 2 | **Immich** | copia automática de fotos del móvil, reconocimiento de caras, mapa | 2283 | ⭐⭐ |
| 3 | **Jupyter Lab** (con tu repo de ML) | notebooks 24/7 desde el portátil o el iPad | 8888 | ⭐ |
| 4 | **Jellyfin** | tu propio "Netflix" con tus archivos | 8096 | ⭐⭐ |
| 5 | **Uptime Kuma** | avisa si algo se cae | 3001 | ⭐ |
| 6 | Syncthing | sincronizar el vault de Obsidian sin nube | 8384 | ⭐⭐ |
| 7 | Vaultwarden | gestor de contraseñas (compatible Bitwarden) — solo cuando domines copias | 8081 | ⭐⭐⭐ |

## 6. Copias de seguridad (regla 3-2-1)
**3 copias, 2 soportes distintos, 1 fuera de casa.**
- Datos: `~/servicios/*/` (configuración) + fotos de Immich + vault de Obsidian.
- Herramienta: **restic** (cifrado, deduplicado, incremental).
```bash
sudo apt install -y restic
restic init --repo /mnt/backup/restic                # disco USB externo
restic -r /mnt/backup/restic backup ~/servicios /srv/fotos
restic -r /mnt/backup/restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
```
- Automatiza con `cron` (a diario a las 3:00) y **prueba a restaurar** una vez al mes (`restic restore latest --target /tmp/prueba`). Una copia que nunca has restaurado no es una copia.
- Copia fuera de casa: un segundo disco en casa de tus padres, o almacenamiento en la nube barato compatible con restic (si decides pagarlo).
- **Immich no es una copia de seguridad** por sí solo: haz copia de su carpeta de fotos y de su base de datos (su documentación explica cómo).

## 7. Plan en 4 fines de semana
| Fin de semana | Objetivo |
|---|---|
| 1 | Hardware + Ubuntu Server + SSH con clave + ufw + actualizaciones automáticas |
| 2 | Docker + Tailscale + Uptime Kuma |
| 3 | Immich (copia del móvil funcionando) + restic al disco externo |
| 4 | Jupyter + Jellyfin; restauración de prueba |

> ⚠️ Antes de irte a India: deja el servidor estable 2-3 semanas, con copias y Uptime Kuma, y alguien en casa que pueda reiniciarlo. Mejor no montarlo justo antes de irte; si no llegas, empiezalo a la vuelta.

## Fuentes
- Ubuntu Server: https://ubuntu.com/server/docs · Docker: https://docs.docker.com/engine/install/ubuntu/
- Tailscale: https://tailscale.com/kb · Immich: https://immich.app/docs · Jellyfin: https://jellyfin.org/docs/
- restic: https://restic.readthedocs.io/ · Uptime Kuma: https://github.com/louislam/uptime-kuma
