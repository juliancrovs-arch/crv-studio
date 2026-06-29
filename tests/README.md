# tests/

Tests de CRV OS. Deben pasar antes de cualquier commit a main (`npm test`).

## Estructura

```
tests/
├── componentes/    ← Tests de componentes UI
├── agentes/        ← Tests de lógica de agentes
└── workers/        ← Tests de Cloudflare Workers
```

## Convenciones

- Un archivo de test por módulo: `{nombre}.test.js`
- Nombrar tests en español, descriptivos
- Cubrir: caso feliz, caso de error, edge cases

## Correr tests

```bash
npm test              # Todos los tests
npm test -- --watch   # Modo watch (desarrollo)
```

## Antes de cada commit

```bash
npm test && npm run lint
```
