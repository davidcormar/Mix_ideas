# 23 · Sistema financiero (idea nueva, de tu *Visión Finanzas* y *Habilidades*)

Dos herramientas para tu forma de ver el dinero ("cada euro tiene un trabajo"):

1. **Simulador de las 4 cuentas** desde tu primer sueldo (prácticas, enero de 2028): corriente · remunerada (colchón + metas < 3-5 años: coche, entrada de la casa) · inversión activa (tu laboratorio) · inversión pasiva (jubilación, no se toca). Aplica tus principios: **primero me pago a mí**, **la mitad de cada subida al ahorro**, coche **modesto y al contado**, lo de < 3-5 años **no va a bolsa**.
2. **Lectura de resultados de empresas** (lo tenías en *Habilidades*): guía de 30 minutos + `ratios.py`, que calcula 13 ratios con lectura en lenguaje claro.

## Cómo usarlo
```bash
cd 23-finanzas-sistema
pip install -r requirements.txt
python simulador.py                                  # salida/simulacion.md (edita supuestos.yaml)
python ratios.py ejemplos/empresa-ficticia.json      # lectura de una empresa INVENTADA de práctica
python -m pytest -q tests                            # 8 tests
```

## Qué dice la simulación con los supuestos por defecto
(800 €/mes de prácticas en 2028 · 1.900 € netos desde julio de 2028 con +5 %/año · con tus padres hasta 2030 · 150 €/mes sin culpa para hobbies y viajes · casa de 250.000 € en 2036 con 30 % de entrada)
- Fondo de emergencia: **julio de 2028**. Coche de 9.000 € al contado: **julio de 2029** ✅.
- Entrada de la casa en junio de 2036: **no llega**; harían falta **~490 €/mes más** de ahorro desde el primer trabajo, o más sueldo, o una casa más barata, o más tarde. (Es un techo: el simulador no pasa a la casa el dinero ya invertido.)
- **Tensión real** entre "aportar a la jubilación cada mes" y "entrada de la casa": si la casa es prioridad, la pasiva crece poco. Es una decisión tuya; el simulador te deja probar.
- Todos los números son **supuestos editables**, no una previsión.

## Qué está hecho
- ✅ Simulador mensual con hitos, saldos anuales, sensibilidad a la rentabilidad y cálculo del ahorro extra necesario para la casa.
- ✅ Calculadora de ratios + guía + ejemplo ficticio. 8 tests.

## Qué falta / siguientes pasos
- Aportación mínima fija a la pasiva como parámetro (para probar "jubilación todos los meses").
- Simular el paso del dinero invertido a la cuenta remunerada 5 años antes de la casa.
- Rellenar el JSON de una empresa real que te guste y repetirlo cada trimestre.

## Decisiones
- **Orden de reparto**: fondo de emergencia → metas en la remunerada → inversión (70/30 o lo que digas: por defecto 80 % pasiva / 20 % activa).
- **La casa empieza a ahorrarse en la remunerada 5 años antes** (tu principio 4); antes, el excedente se invierte.
- **Semáforos de ratios orientativos** y avisados como tales: dependen del sector.
- Sin bancos concretos ni productos: eso lo decides tú al montar el sistema.

> Información general y educativa, no asesoramiento financiero.
