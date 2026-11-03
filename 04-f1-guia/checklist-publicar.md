# Checklist para publicar en GitHub

## Repositorio
- [ ] Nombre descriptivo en kebab-case (`f1-tyre-degradation`, no `proyecto1`)
- [ ] Descripción corta + *topics* (`formula1`, `fastf1`, `pandas`, `data-analysis`, `python`)
- [ ] `README.md` con la plantilla, gráfica principal arriba
- [ ] `requirements.txt` con versiones (`pip freeze | grep -iE "fastf1|pandas|matplotlib|numpy"`)
- [ ] `.gitignore` con `cache/`, `.venv/`, `__pycache__/`, `.ipynb_checkpoints/`
- [ ] Licencia (MIT es lo habitual)
- [ ] **Sin** la caché de FastF1 ni ficheros >50 MB (`du -sh *`)

## Código
- [ ] El notebook se ejecuta de arriba abajo en limpio (*Kernel → Restart & Run All*)
- [ ] Sin rutas absolutas de tu ordenador (`/Users/david/...`)
- [ ] Funciones con nombres claros; sin celdas muertas ni prints de depuración
- [ ] Gráficas con título, ejes con unidades y leyenda
- [ ] Prueba final: clonar en otra carpeta, crear venv, instalar y ejecutar

## Historia de git
- [ ] Commits pequeños con mensajes claros (no un único "final")
- [ ] Nada de claves, tokens ni datos personales

## Difusión (opcional)
- [ ] Fijar el repo en tu perfil de GitHub (*Customize your pins*)
- [ ] Post de LinkedIn: pregunta → gráfica → 2 conclusiones → enlace (usa la skill `linkedin-perfil` para revisarlo, no para escribirlo)
- [ ] Añadirlo a tu portfolio (`14-portfolio-linkedin/`)
