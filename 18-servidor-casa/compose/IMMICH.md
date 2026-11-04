# Immich

Immich publica su propio `docker-compose.yml` y `.env` de ejemplo con cada versión (incluye servidor, machine learning, PostgreSQL y Redis). **Usa siempre el oficial** de la versión actual en lugar de uno copiado:

```bash
mkdir -p ~/servicios/immich && cd ~/servicios/immich
wget -O docker-compose.yml https://github.com/immich-app/immich/releases/latest/download/docker-compose.yml
wget -O .env https://github.com/immich-app/immich/releases/latest/download/example.env
# edita .env: UPLOAD_LOCATION=/srv/fotos  DB_PASSWORD=<aleatoria>
docker compose up -d
```
Después: `http://<servidor>:2283` → crea el usuario administrador → app de Immich en el móvil → copia de seguridad automática.
