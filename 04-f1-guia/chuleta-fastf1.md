# Chuleta de FastF1 (v3.x)

> Fragmentos de **uso de la librería**, no del análisis. El análisis es tuyo.
> Nombres de métodos verificados con `fastf1==3.9.2`.

## Instalación y caché (imprescindible)
```bash
pip install fastf1 pandas matplotlib
```
```python
import fastf1
fastf1.Cache.enable_cache("cache")      # la carpeta debe existir; añádela a .gitignore
```
Sin caché, cada `load()` vuelve a descargar cientos de MB y la API te limita (*rate limit*).

## Calendario y sesiones
```python
schedule = fastf1.get_event_schedule(2024)          # DataFrame de eventos
event = fastf1.get_event(2024, "Monza")              # por nombre, país o nº de ronda
session = fastf1.get_session(2024, "Monza", "Q")     # 'FP1','FP2','FP3','Q','SQ','S','R'
session.load()                                       # todo (lento la 1.ª vez)
session.load(laps=True, telemetry=False, weather=False, messages=False)  # solo lo necesario
```
- Datos de vueltas y telemetría completos desde **2018**. Antes, solo resultados (vía Ergast/Jolpica).
- `session.results` → clasificación (posición, puntos, tiempos Q1/Q2/Q3, equipo, abreviatura).

## Vueltas (`session.laps`, un DataFrame de pandas con superpoderes)
Columnas útiles: `Driver`, `LapNumber`, `LapTime`, `Sector1Time…3`, `Compound`, `TyreLife`, `FreshTyre`, `Stint`, `PitInTime`, `PitOutTime`, `TrackStatus`, `IsAccurate`, `Position`, `Team`, `IsPersonalBest`, `Deleted`.

```python
laps = session.laps
ver = laps.pick_drivers("VER")              # uno o varios: pick_drivers(["VER", "NOR"])
fast = laps.pick_fastest()                  # vuelta más rápida (objeto Lap)
quick = laps.pick_quicklaps()               # quita vueltas >107 % de la mejor
clean = laps.pick_wo_box().pick_track_status("1")   # sin entradas/salidas de box y con bandera verde
soft = laps.pick_compounds("SOFT")
acc = laps.pick_accurate()                  # solo vueltas con tiempos fiables
```

**Tiempos:** son `Timedelta`. Para operar:
```python
laps["LapTime_s"] = laps["LapTime"].dt.total_seconds()
```

## Telemetría
```python
lap = laps.pick_drivers("LEC").pick_fastest()
car = lap.get_car_data().add_distance()     # Speed, RPM, nGear, Throttle, Brake, DRS + Distance
tel = lap.get_telemetry()                   # car data + posición (X, Y, Z) fusionados
pos = lap.get_pos_data()
```
- Frecuencia ~4-5 Hz en car data (no es continua: interpola con cuidado).
- `Brake` es booleano (no da presión de freno).
- Para comparar dos pilotos en el mismo punto de pista usa **distancia**, no tiempo.

## Circuito
```python
info = session.get_circuit_info()
info.corners            # DataFrame: Number, Letter, X, Y, Angle, Distance → marcar curvas en gráficas
info.rotation           # para dibujar el trazado orientado como en TV
```

## Gráficas
```python
import fastf1.plotting
fastf1.plotting.setup_mpl(color_scheme="fastf1")      # estilo + soporte de Timedelta en ejes
color = fastf1.plotting.get_driver_color("VER", session=session)
ccolor = fastf1.plotting.get_compound_color("SOFT", session=session)
```

## Meteorología y mensajes
```python
session.weather_data          # AirTemp, TrackTemp, Humidity, Rainfall, WindSpeed... cada minuto
session.race_control_messages # banderas, safety car, investigaciones
lap.get_weather_data()        # tiempo de la vuelta concreta
```

## Problemas típicos
| Síntoma | Causa | Arreglo |
|---|---|---|
| `DataNotLoadedError` | no llamaste a `load()` o la descarga falló (red/rate limit) | revisa el log; reintenta más tarde; usa caché |
| Muy lento la primera vez | descarga de toda la sesión | `load(telemetry=False)` si no la necesitas |
| `LapTime` es `NaT` | vuelta de salida/entrada a boxes, vuelta borrada o dato perdido | `pick_wo_box()`, `dropna(subset=["LapTime"])` |
| Gráficas raras con tiempos | matplotlib no entiende `Timedelta` | `setup_mpl()` o convertir a segundos |
| Avisos `pick_driver` obsoleto | API antigua | usa `pick_drivers` |
| Vueltas con SC/VSC "contaminan" la degradación | bandera amarilla / safety car | `pick_track_status("1")` (verde) |
| La telemetría no cuadra entre pilotos | muestreo distinto | alinear por `Distance` con `np.interp` |
| Ergast no responde | Ergast cerró en 2024 | FastF1 usa **Jolpica** (`fastf1.ergast`) |
| Repo enorme en GitHub | subiste la caché | `cache/` en `.gitignore` |

## Documentación
- Docs: https://docs.fastf1.dev/
- Ejemplos oficiales: https://docs.fastf1.dev/gen_modules/examples_gallery/index.html
- Repo: https://github.com/theOehrly/Fast-F1
