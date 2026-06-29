# componentes/

Bloques de UI reutilizables de CRV OS. Cada componente funciona de forma independiente y puede integrarse en cualquier proyecto cliente.

## Estructura por componente

```
componentes/{nombre}/
├── index.html    ← Demo autocontenida
├── style.css     ← Estilos encapsulados
└── README.md     ← Uso, props, ejemplos
```

## Reglas

- Sin dependencias externas (vanilla JS/CSS)
- Probado en ≥ 2 proyectos antes de declararlo oficial
- Mobile-first, Lighthouse >90
- Comentarios en español

## Componentes planificados

| Componente     | Estado     | Descripción                        |
|----------------|------------|------------------------------------|
| cards/         | pendiente  | Cards de portfolio/servicios       |
| botones/       | pendiente  | Sistema de botones con variantes   |
| formularios/   | pendiente  | Formularios de contacto/booking    |

## Agregar un componente

1. `mkdir componentes/{nombre}`
2. Crear `index.html`, `style.css`, `README.md`
3. Testear en 2 proyectos reales
4. Documentar en `CHANGELOG.md`
