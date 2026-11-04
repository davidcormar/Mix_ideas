# Atajo «Salud → Mix ideas» (iPhone, 5 minutos, una vez)

El Atajo lee de **Salud** tus pasos de hoy y tu última noche (vengan del Watch, de Bevel o de Strava) y lo deja en el portapapeles con este formato:

```
d=2026-11-04;steps=8420;bed=23:40;wake=07:25
```

Luego abres **Importar salud** (`29-importar-salud/`) y pulsas **«Pegar del Atajo»** → «Importar».

> Si abres las apps desde un icono de la pantalla de inicio, usa siempre «Pegar del Atajo»: iOS guarda los datos de las webs instaladas **separados** de los de Safari, así que abrir una URL desde el Atajo los mandaría a Safari y no a tu app instalada.

## Crear el Atajo
App **Atajos** → **+** → nómbralo «Salud → Mix ideas». Añade estas acciones en orden (busca su nombre en la barra de acciones):

1. **Buscar muestras de salud** → *Tipo:* **Pasos** · *Fecha de inicio:* **es hoy**. → **Calcular estadísticas** → **Suma**. Renombra la variable a *Pasos* (toca el resultado → Renombrar).
2. **Buscar muestras de salud** → *Tipo:* **Análisis del sueño** · *Fecha de inicio:* **está en los últimos 1 días** · añade el filtro *Valor* **no es Despierto** · *Ordenar por* **Fecha de inicio**, *Orden* **más antiguas primero**.
3. **Obtener elemento de la lista** → **Primer elemento** → **Obtener detalles de muestras de salud** → **Fecha de inicio** → **Formatear fecha** → *Personalizado* `HH:mm`. Renombra a *Acostarme*.
4. Repite con el resultado del paso 2: **Obtener elemento de la lista** → **Último elemento** → **Fecha de finalización** → **Formatear fecha** `HH:mm`. Renombra a *Levantarme*.
5. **Fecha actual** → **Formatear fecha** → *Personalizado* `yyyy-MM-dd`. Renombra a *Día*.
6. **Texto**: `d=`*Día*`;steps=`*Pasos*`;bed=`*Acostarme*`;wake=`*Levantarme* (inserta las variables tocando el campo).
7. **Copiar al portapapeles** (el Texto).
8. *(Opcional)* **Mostrar notificación** «Listo: abre Importar salud y pulsa Pegar».

### Que se haga solo cada noche
Atajos → **Automatización** → **+** → **Hora del día** → 22:30, diariamente → **Ejecutar inmediatamente** → elige tu Atajo. Cuando abras las apps, «Pegar del Atajo».

## Notas
- **Sueño:** con el Atajo es aproximado (primera y última muestra no «Despierto»). Para tu historial completo y más preciso usa el `export.xml` (elige la fuente con más sueño de cada noche).
- **Entrenos:** el Atajo no los envía; llegan con el `export.xml` de Salud o el `activities.csv` de Strava (sin duplicar).
- **Bevel:** su recuperación y esfuerzo no están en Salud; apúntalos en *Panel → Hoy*.
- Si una noche no llevaste el reloj, el Atajo manda solo los pasos; la página lo acepta.
- **Modo Safari** (si usas las apps en Safari y no instaladas): en vez de copiar, termina el Atajo con **Abrir URL** `https://davidcormar.github.io/Mix_ideas/29-importar-salud/#/atajos?`+ el Texto con `&` en lugar de `;`.
