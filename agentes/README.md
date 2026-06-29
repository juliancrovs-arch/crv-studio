# agentes/

Agentes de IA de CRV OS. Cada agente encapsula su lógica, tools, configuración y rate limiting.

## Estructura por agente

```
agentes/{nombre}/
├── agent.js      ← Lógica principal (Anthropic API)
├── tools.js      ← Tools disponibles para el agente
├── config.js     ← Rate limits, modelo, parámetros
└── README.md     ← Qué hace, cómo usarlo, endpoints
```

## Reglas obligatorias

- Rate limiting en todos los agentes públicos (ver CLAUDE.md para límites)
- Validar SIEMPRE el input del usuario antes de pasarlo al modelo
- Logs de cada llamada en D1 (90 días de retención)
- CORS restrictivo, credenciales solo en variables de entorno Cloudflare
- Modelo default: Haiku. Sonnet para análisis pesado. Nunca Opus.

## Agentes planificados

| Agente            | Cliente          | Descripción                          |
|-------------------|------------------|--------------------------------------|
| project-manager/  | interno CRV      | Gestión de tareas y proyectos        |
| asesor-cliente/   | OG Barber, otros | Consultas y recomendaciones al usuario|
| analyzer/         | interno CRV      | Análisis de métricas y reportes      |

## Agregar un agente

1. `mkdir agentes/{nombre}`
2. Crear los 4 archivos base
3. Agregar prompt en `prompts/system.md`
4. Implementar rate limiting en `config.js`
5. Agregar tests en `tests/`
6. Documentar en este README
