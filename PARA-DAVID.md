# Para David · resumen de la noche (3 → 4 nov 2026)

Buenos días. Las **19 ideas** tienen su carpeta, con README (qué es, cómo usarlo, qué falta y decisiones). Todo está subido a la rama **`claude/amazing-heisenberg-dlbnt1`** (no a `main`: era la rama asignada a esta sesión). Para tenerlo en `main`, abre un *pull request* desde esa rama y fusiónalo.

## ⚠️ Lo urgente (esta semana)
1. **Vacunas para India:** pide cita ya en el Centro de Vacunación Internacional (A Coruña). Algunas pautas llevan varias dosis y en diciembre hay lista de espera. → `13-india-woxsen/`
2. **Londres (19-22 nov):** necesitas **pasaporte** y la **ETA británica** (obligatoria para ciudadanos de la UE; solo en la app o la web de gov.uk). → `19-londres/`
3. **Choque de fechas:** si para el visado indio hay que **dejar el pasaporte** en el centro de solicitudes, no lo hagas entre ~12 y 23 de noviembre. Pregunta también a Woxsen si tienes que registrarte en el portal **Study in India** (desde 2025 da un SII-ID para el visado e-Student).
4. Reserva vuelos y albergues de Londres ya si quieres quedarte en ~300 €.

## Lo mejor que ha salido
| | Qué | Por qué merece la pena |
|---|---|---|
| 🛩️ **06 + 07** | Túnel de viento neuronal + generador de alas | Método de paneles propio validado (NACA 0012 a 5° → Cl 0,599), red ×1.600 más rápida (MAE Cl 0,002) y un **VAE condicional escrito en NumPy** que genera perfiles UIUC 100 % válidos con el Cl que pides. Es la base real de tu "Suite aero" |
| 🏃 **02** | Running tools | Con tu 27:58 sale VDOT 33,5 y ritmos que **coinciden con tus ritmos reales**. Plan hasta el 28-dic exportado a `.ics` para Google Calendar |
| 🤖 **01** | 12 skills de Claude | Listas para instalar, con validador y empaquetador `.zip` para claude.ai |
| 📱 **10, 11, 15** | Gym tracker, finanzas, hábitos | Apps de un fichero, funcionan con doble clic y en el móvil, probadas en Chromium |
| 🛰️ **08** | Barcos oscuros | Dossier + pipeline CFAR → AIS funcionando sobre una escena SAR sintética |

## Qué probar primero (30 minutos)
1. `02-running-tools`: `python -m runtools ritmos 27:58 --objetivo 27:00` e importa `salida/plan-5k.ics` en un calendario nuevo.
2. Abre `10-gym-tracker/index.html` en el móvil (mejor con GitHub Pages; instrucciones en su README) y registra el próximo entrenamiento.
3. Instala `organizador-diario` y `frances-sesion` (`01-claude-skills/README.md`) y úsalas esta noche.
4. Mira `07-generador-alas/figuras/perfiles_generados.png`: es lo más vistoso para tu compañero.

## Decisiones que te tocan a ti
- **Proyecto con tu compañero:** la comparativa sale casi empatada (38 vs 36). Propongo un *spike* de 2 semanas antes de decidir. → `05-presentacion-companero/`
- **Francés:** de cero a B2 en ~9 meses es el límite bajo de horas. El control de marzo es el punto de decisión: B2 en verano, o B1 en verano y B2 en diciembre. → `09-frances-delf/estructura-delf.md`
- **Servidor en casa:** ¿antes o después de India? Recomiendo después. → `18-servidor-casa/`
- **Skill `escribir-como-yo`:** necesita 10-15 textos tuyos para funcionar. → `01-claude-skills/escribir-como-yo/COMO-RELLENARLA.md`
- **Woxsen:** las coordenadas del campus en el mapa (12) son aproximadas; corrígelas arrastrando el marcador.

## Límites de esta noche (para que no te pillen por sorpresa)
- La red del entorno bloqueaba varias webs: UIUC (saqué los perfiles del paquete `aerosandbox` de PyPI), los datos en vivo de F1 (la chuleta de FastF1 está comprobada con la librería instalada, no con datos reales) y webs oficiales (todo lleva enlace para que lo verifiques).
- **No había PyTorch**: los modelos usan scikit-learn y NumPy puro.
- Los datos de salud, visados y precios son **información general**: compruébalos en las fuentes oficiales enlazadas.
- **F1 (04):** solo guía, sin código del análisis, como pediste. Nada de la UIE.

Bitácora detallada (horas, problemas): [`BITACORA.md`](BITACORA.md). Índice: [`README.md`](README.md).
