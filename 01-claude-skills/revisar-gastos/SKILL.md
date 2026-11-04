---
name: revisar-gastos
description: 'Revisa los gastos de David (CSV del banco, export de su app de finanzas o lista pegada), los categoriza, calcula el resumen mensual y el progreso de sus metas de ahorro (Londres ~300 €, Woxsen ~3.500 €) y propone ajustes concretos. Úsala cuando David diga "revisa mis gastos", "cómo voy con el ahorro", "resumen del mes" o pegue movimientos bancarios.'
---

# Revisar gastos y metas de ahorro

## Filosofía de David (de su *Visión Finanzas*) — úsala para juzgar
- El dinero es una **herramienta para la libertad**; **cada euro tiene un trabajo**.
- **Gasta sin culpa** en lo que le importa: **hobbies, colecciones y viajes**. **No** le sugieras recortar ahí salvo que se salga de su parte.
- **Malgastar** para él es: dinero **parado sin motivo**, **suscripciones olvidadas**, **comisiones**, **compras por impulso** que no usa y **no saber dónde se va el dinero**. Esto es lo que debes cazar.
- **Hasta el primer sueldo (prácticas, enero 2028) solo ahorra para viajes y caprichos.** No le propongas fondo de emergencia ni inversión todavía; desde el primer sueldo, su sistema de **4 cuentas** (corriente · remunerada para colchón y gastos <3-5 años · inversión activa · inversión pasiva para jubilación). Simulador en `23-finanzas-sistema/`.
- Nada de deuda para consumo.

## Categorías por defecto
Comida (súper) · Comer fuera · Transporte · Deporte · Estudios · Ocio · **Hobbies y colecciones** · Suscripciones · Comisiones · Ropa · Viajes · Salud · Otros. Ingresos: Familia · Trabajo · Becas · Otros.

## Procedimiento
1. **Leer los datos**: CSV del banco (detecta separador `;` o `,`, coma decimal, formato de fecha) o JSON exportado de `11-finanzas/`. Si pegas datos, **no repitas** IBAN, números de tarjeta ni nombres de terceros en la respuesta.
2. **Categorizar** cada movimiento; marca con `?` los dudosos y pregunta solo por esos.
3. **Resumen del mes** (tabla): ingresos, gastos por categoría, % del total, vs. mes anterior.
4. **Detectar** (lo que él llama malgastar): suscripciones recurrentes (¿las usa?), **comisiones** bancarias o de cambio, compras por impulso, gastos hormiga, y dinero acumulado en la cuenta corriente **sin trabajo asignado**.
5. **Metas**: para cada meta → ahorrado, falta, fecha objetivo, **ahorro mensual necesario** = falta / meses restantes. Metas actuales: Londres ~300 € (viaje 19-22 nov 2026), Woxsen ~3.500 € (vuelo 6 ene 2027).
6. **3 ajustes concretos** con el ahorro estimado de cada uno, **sin tocar hobbies, colecciones ni viajes** salvo que él lo pida.

## Reglas
- Información general, no asesoramiento financiero profesional.
- Si piden inversión: explicar conceptos (fondo de emergencia primero, indexados, comisiones) sin recomendar productos concretos.
