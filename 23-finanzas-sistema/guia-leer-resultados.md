---
tipo: recurso
area: finanzas
estado: activo
fecha: "2026-11-04"
tags: [inversion, contabilidad]
---

# Cómo leer los resultados de una empresa (en 30 minutos)

> [!info] Resumen en 30 segundos
> Tres estados: **cuenta de resultados** (¿gana dinero?), **balance** (¿qué tiene y qué debe?), **flujo de caja** (¿el beneficio es caja de verdad?).
> Cinco preguntas: ¿crece? ¿es rentable? ¿convierte beneficio en caja? ¿está endeudada? ¿cuánto pago por ella?
> Herramienta: `python ratios.py <empresa>.json`. Es tu **laboratorio** de la cuenta de inversión activa (Visión Finanzas).

## Dónde están los datos (gratis)
- **Informe anual** e **informes trimestrales** en la web de relaciones con inversores de cada empresa (*Investors* / *Accionistas e inversores*).
- España: **CNMV** (cnmv.es) → información regulada de cotizadas. EE. UU.: **SEC EDGAR** (formularios 10-K anual y 10-Q trimestral).
- Presentaciones de resultados (*earnings presentation*) y la transcripción de la llamada con analistas: explican el *porqué*.

## Los tres estados
| Estado | Pregunta | Líneas clave |
|---|---|---|
| **Cuenta de resultados** | ¿gana dinero? | ingresos → margen bruto → EBITDA → EBIT → beneficio neto |
| **Balance** | ¿qué tiene y qué debe? | activo (corriente / no corriente), deuda financiera, caja, patrimonio neto |
| **Estado de flujos de efectivo** | ¿entra caja de verdad? | flujo de operaciones, capex (inversión), **flujo de caja libre = operaciones − capex** |

## Las cinco preguntas (en este orden)
1. **¿Crece?** Ingresos de los últimos 5 años; ¿crecimiento orgánico o por compras?
2. **¿Es rentable?** Márgenes y, sobre todo, **ROIC** (rentabilidad del capital invertido). Un ROIC alto y estable durante años suele indicar una ventaja competitiva.
3. **¿Convierte beneficio en caja?** FCF / beneficio ≈ 1 o más. Si siempre es mucho menor, desconfía del beneficio.
4. **¿Está endeudada?** Deuda neta / EBITDA y cobertura de intereses.
5. **¿Cuánto pago?** PER, EV/EBITDA, rentabilidad por FCF. Barato o caro **respecto a su historia y a sus competidores**, nunca en abstracto.

## Señales de alarma
- Beneficio que crece y caja que no.
- Deuda creciendo más que el EBITDA.
- Muchos "ajustes" (*adjusted EBITDA*) que siempre suben el resultado.
- Cuentas por cobrar o inventarios creciendo mucho más rápido que las ventas.
- Cambios de auditor o retrasos en las cuentas.

## Cómo practicar (sin dinero)
1. Elige **una empresa de un sector que te guste** (aviación, F1, defensa, semiconductores).
2. Pasa al JSON las cifras de los 3 últimos años (copia `ejemplos/empresa-ficticia.json`).
3. `python ratios.py` para cada año y escribe 5 líneas: qué ha cambiado y por qué.
4. Compara con 2 competidores.
5. Repite cada trimestre con su informe nuevo: es la mejor escuela.

**Recursos gratuitos:** cursos de contabilidad financiera básica en Coursera/edX (modo oyente), la *Guía del inversor* de la CNMV y los apartados educativos de la CNMV.

> Educativo. Las decisiones de inversión son tuyas; para dudas importantes, un asesor (como dice tu propia visión).

## Relacionado

- **Sube:** [[Vision Finanzas]]
- **Puentes:** [[Roadmap Financiero]] · [[Control Finanzas]]
