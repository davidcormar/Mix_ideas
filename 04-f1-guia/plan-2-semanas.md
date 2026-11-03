# Plan hasta publicar el 15 de noviembre

Bloques de **45-90 min** (mejor en tu franja 20:00-23:00). Cada día termina con un `git commit`.

| Día | Fecha | Objetivo del día | "Hecho" cuando… |
|---|---|---|---|
| 1 | mié 4 nov | Entorno | repo creado, venv, `pip install fastf1 pandas matplotlib jupyter`, caché funcionando, `.gitignore` |
| 2 | jue 5 nov | Explorar | cargas 1 sesión, imprimes `session.laps.columns`, entiendes 10 columnas (apúntalas) |
| 3 | vie 6 nov | Elegir pregunta | eliges 1 pregunta de `preguntas-analisis.md` y escribes en el README: pregunta, hipótesis, datos |
| 4 | sáb 7 nov | Datos limpios | función propia que devuelve las vueltas "limpias" de una sesión (y sabes justificar cada filtro) |
| 5 | dom 8 nov | Primera gráfica | 1 gráfica fea pero correcta que ya responde algo |
| 6 | lun 9 nov | Ampliar | misma gráfica para 2-3 carreras o pilotos → ¿se mantiene la conclusión? |
| 7 | mar 10 nov | Profundizar | 2.ª gráfica o tabla con números (medias, pendientes, diferencias) |
| 8 | mié 11 nov | Refactor | código del notebook pasado a funciones en `src/`, notebook limpio que se ejecuta de arriba abajo |
| 9 | jue 12 nov | Conclusiones | escribes 3-5 conclusiones con números y **limitaciones** honestas |
| 10 | vie 13 nov | Pulir | gráficas finales (títulos, ejes con unidades, leyenda, colores de equipo), `requirements.txt` |
| 11 | sáb 14 nov | README | README con la plantilla, imágenes en `figures/`, prueba en un entorno limpio |
| 12 | dom 15 nov | **Publicar** 🚀 | checklist completa, repo público, post en LinkedIn (opcional) |

## Reglas de autonomía (es tu prueba)
- Atascado >30 min → docs de FastF1 → ejemplos oficiales → issues de GitHub → **solo entonces** pregunta (a una persona o a Claude como tutor, pidiendo pistas, no código).
- Si vas con retraso, **recorta alcance** (menos carreras, menos gráficas), no la fecha.
- Apunta cada día en una línea qué hiciste: luego sirve para el README y para entrevistas.

## Preguntas de control (respóndelas tú antes de publicar)
1. ¿Por qué filtras cada tipo de vuelta?
2. ¿Qué parte de tu conclusión podría ser ruido?
3. Si alguien clona el repo, ¿se ejecuta sin tocar nada?
