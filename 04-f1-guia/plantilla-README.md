<!-- Plantilla de README para tu repo de F1. Borra los comentarios al rellenar. -->
# 🏎️ <Título que sea la pregunta: "¿Cuánto se degradan los neumáticos en Monza?">

<!-- Una frase: qué responde el proyecto y la conclusión principal con un número. -->
> **TL;DR:** <conclusión principal con dato>.

![Gráfica principal](figures/principal.png)

## Pregunta
<!-- Qué quieres saber y por qué es interesante (2-3 frases). -->

## Datos
- Fuente: [FastF1](https://github.com/theOehrly/Fast-F1) (datos de cronometraje oficiales de F1).
- Sesiones: <GP, año, sesión>.
- Filtros aplicados: <vueltas de box, SC/VSC, vuelta 1, vueltas >107 %…> y por qué.

## Método
1. <paso>
2. <paso>

## Resultados
| <métrica> | <piloto/compuesto> | ... |
|---|---|---|

<!-- 2-3 gráficas con una frase debajo de cada una explicando qué se ve. -->

## Limitaciones
- <p. ej. el efecto combustible no está separado de la degradación>
- <tamaño de la muestra>

## Cómo reproducirlo
```bash
git clone https://github.com/davidcormar/<repo>.git
cd <repo>
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
jupyter notebook notebooks/analisis.ipynb
```

## Estructura
```
├── notebooks/analisis.ipynb
├── src/            # funciones reutilizables
├── figures/        # gráficas del README
├── requirements.txt
└── README.md
```

## Qué he aprendido
- <técnico>
- <de F1>

## Autor
David Cortés · [LinkedIn](<url>) · [GitHub](https://github.com/davidcormar)
