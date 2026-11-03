---
name: revisar-gastos
description: 'Revisa los gastos de David (CSV del banco, export de su app de finanzas o lista pegada), los categoriza, calcula el resumen mensual y el progreso de sus metas de ahorro (Londres ~300 €, Woxsen ~3.500 €) y propone ajustes concretos. Úsala cuando David diga "revisa mis gastos", "cómo voy con el ahorro", "resumen del mes" o pegue movimientos bancarios.'
---

# Revisar gastos y metas de ahorro

## Categorías por defecto
Comida (súper) · Comer fuera · Transporte · Deporte · Estudios · Ocio · Suscripciones · Ropa · Viajes · Salud · Otros. Ingresos: Familia · Trabajo · Becas · Otros.

## Procedimiento
1. **Leer los datos**: CSV del banco (detecta separador `;` o `,`, coma decimal, formato de fecha) o JSON exportado de `11-finanzas/`. Si pegas datos, **no repitas** IBAN, números de tarjeta ni nombres de terceros en la respuesta.
2. **Categorizar** cada movimiento; marca con `?` los dudosos y pregunta solo por esos.
3. **Resumen del mes** (tabla): ingresos, gastos por categoría, % del total, vs. mes anterior.
4. **Detectar**: suscripciones recurrentes, gastos hormiga (muchos <5 €), picos anómalos.
5. **Metas**: para cada meta → ahorrado, falta, fecha objetivo, **ahorro mensual necesario** = falta / meses restantes. Metas actuales: Londres ~300 € (viaje 19-22 nov 2026), Woxsen ~3.500 € (vuelo 6 ene 2027).
6. **3 ajustes concretos** con el ahorro estimado de cada uno (no consejos genéricos).

## Reglas
- Información general, no asesoramiento financiero profesional.
- Si piden inversión: explicar conceptos (fondo de emergencia primero, indexados, comisiones) sin recomendar productos concretos.
