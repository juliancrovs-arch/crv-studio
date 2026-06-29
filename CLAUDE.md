# CLAUDE.md - CRV Studio Operating System

Este archivo define cómo Claude Code debe trabajar en CRV Studio.

## Visión

CRV Studio no hace webs. Construye un **sistema de producción escalable** donde cada proyecto mejora la infraestructura, cada componente es reutilizable, y la IA automatiza lo repetitivo.

Ver `docs/vision.md` para la visión completa.

## Stack

- **Frontend**: HTML/CSS/Vanilla JS (sin build step)
- **Backend**: Cloudflare Workers + Wrangler
- **Database**: D1 (SQLite integrado)
- **Storage**: Cloudflare KV
- **Deploy**: Cloudflare Pages + GitHub (push = live)
- **IA**: Claude API (Haiku por defecto, Sonnet para análisis)
- **Email**: Resend
- **Agentes**: Anthropic API + MCP

## Estructura de carpetas

```
crv-studio/
├── docs/                          ← Documentación
│   ├── vision.md                 
│   ├── principles.md             
│   └── architecture.md           
├── componentes/                   ← Bloques reutilizables
│   ├── cards/
│   ├── botones/
│   └── formularios/
├── agentes/                       ← Inteligencia automatizada
│   ├── project-manager/
│   ├── asesor-cliente/
│   └── analyzer/
├── prompts/                       ← Templates de IA
│   ├── system.md
│   └── templates/
├── src/                           ← Código main
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── workers/
│       ├── api.js
│       └── rate-limit.js
├── tests/                         ← Tests unitarios
├── scripts/                       ← Helpers (SQL, deploy, etc)
├── CHANGELOG.md
├── TODO.md
└── wrangler.toml                  ← Config Cloudflare
```

## Antes de cada commit

```bash
npm test          # Tests deben pasar
npm run lint      # Sin errores de linting
npm run build     # Si hay compilación
```

## Estándares de código

### Componentes
- Viven en `componentes/{nombre}/`
- Tienen `README.md` con ejemplos
- Reutilizables en 2+ proyectos
- Sin dependencias externas (si es posible)

### Funciones
- Máximo 50 líneas
- Máximo 3 niveles de nesting
- Comentarios en español
- Nombres descriptivos

### Agentes
- Viven en `agentes/{nombre}/`
- Tienen `agent.js`, `tools.js`, `config.js`, `README.md`
- Validar SIEMPRE input del usuario
- Rate limit obligatorio
- Logs en D1

### Performance
- CSS antes de JS
- Compress imágenes (WebP)
- Cero requests innecesarios
- Lighthouse >90 en todas las métricas

## Modelos IA a usar

- **Haiku**: Tareas simples, rate limiting (bajo costo)
- **Sonnet**: Análisis, generación de contenido
- **Nunca Opus**: Demasiado caro para el caso

## Decisiones arquitectónicas importantes

### Rate Limiting
Todo agente expuesto públicamente debe tener:
- Máx X llamadas/hora por usuario
- Máx Y tokens/mes total
- Monitoreo en D1

### Seguridad
- Credenciales en variables de entorno Cloudflare
- NUNCA en repo
- NUNCA en .env
- Validar SIEMPRE input
- CORS restrictivo

### Deploy
- Push a main = deploy automático
- GitHub Actions valida antes
- Health check post-deploy
- Rollback automático si error

## Comandos útiles

```bash
npm test              # Correr tests
npm run dev           # Dev local
npm run deploy        # Deploy a Cloudflare
npm run lint          # Lint (prettier)
```

## Clientes actuales (CRV OS en acción)

- **OG Barber Studio**: Booking system + agente conversacional
- **Los Crovas**: Catálogo de pipas + asesor + admin
- **22 Patagonia Sushi**: Menú digital
- **Café La Z**: QR menu + analytics
- **GIRSU**: Fleet monitoring + análisis

Cada uno usa componentes y agentes de CRV OS.

## Si necesitás agregar algo

### Nuevo componente
1. Crear `componentes/{nombre}/`
2. Incluir `index.html`, `style.css`, `README.md`
3. Testear en 2 proyectos antes de oficial
4. Documentar en `CHANGELOG.md`

### Nuevo agente
1. Crear `agentes/{nombre}/`
2. Incluir prompt en `prompts/system.md`
3. Implementar rate limiting
4. Documentar en `agentes/{nombre}/README.md`
5. Agregar tests

### Nueva herramienta
1. Actualizar este archivo (CLAUDE.md)
2. Documentar en `docs/architecture.md`
3. Actualizar `wrangler.toml` si es necesario

## Si hay un problema

1. Revisar `docs/principles.md`
2. Revisar logs en D1
3. Revisar error en Cloudflare Analytics
4. Escalate a Julián si no es claro

## Performance targets

- **Lighthouse**: >90 (Perf, Accesibility, Best Practices, SEO)
- **First Contentful Paint**: <1.5s
- **Cumulative Layout Shift**: <0.1
- **Time to Interactive**: <3.5s

## Rate limits recomendados

| Agente | Límite | Ventana |
|--------|--------|---------|
| Project Manager | 100 req | por día |
| Asesor Cliente | 500 req | por hora |
| Analyzer | 10 req | por hora |
| Support | 1000 req | por día |

## Alertas automáticas

Si sucede algo de esto → generar alert:
- Error HTTP 5xx tasa >1%
- D1 query >500ms
- Timeout de Worker >30s
- Rate limit breached

Guardar logs en D1 por 90 días.

---

## WORKFLOW MAESTRO

Pipeline de 7 agentes que construye un proyecto completo desde un brief hasta el deploy.

### Agentes y orden

```
Discovery → Planning → Architecture → Components → Code → QA → Deploy
```

| Agente       | Modelo  | Output                                       |
|--------------|---------|----------------------------------------------|
| Discovery    | Haiku   | JSON: objetivos, tipo, restricciones         |
| Planning     | Haiku   | JSON: fases, tareas, estimaciones            |
| Architecture | Haiku   | JSON: carpetas, endpoints, tablas D1         |
| Components   | Haiku   | JSON: componentes a reutilizar/crear         |
| Code         | Sonnet  | JSON: código real de los archivos críticos   |
| QA           | Haiku   | JSON: score, checklist, issues               |
| Deploy       | Haiku   | JSON: comandos, variables, health check      |

### Método 1: CLI (init-project.js)

```bash
node scripts/init-project.js \
  --cliente=og-barber \
  --nombre="OG Barber Studio" \
  --brief="Sistema de booking con agente conversacional para barbería premium en Patagonia"
```

Esto crea la carpeta `proyectos/og-barber/`, los archivos base y llama al endpoint.

### Método 2: Claude Code prompt

```
Iniciá el workflow maestro para el cliente "cafe-laz".
Brief: "Menú digital QR con analytics y panel admin para cafetería en Neuquén"
Llamá a POST /api/workflow/start con cliente=cafe-laz y el brief.
Mostrá el projectId y monitoreá el progreso.
```

### Monitorear progreso

```bash
# Status de un proyecto
curl http://localhost:8787/api/workflow/status/{projectId}

# Lista todos los proyectos
curl http://localhost:8787/api/workflow/list

# Dashboard visual
open http://localhost:3456/src/admin/workflow.html
```

### Reintentar si hay error

```bash
curl -X POST http://localhost:8787/api/workflow/retry/{projectId}
```

### Rate limits

| Recurso                      | Límite | Ventana    |
|------------------------------|--------|------------|
| Proyectos nuevos por cliente | 10     | por día    |
| Tokens por proyecto          | 500K   | por proyecto|
| Reintentos por agente        | 3      | por agente |

### Costos estimados

| Proyecto simple (solo Haiku) | ~$0.02 |
| Proyecto completo (con Code) | ~$0.20 |
| Proyecto complejo (brief largo) | ~$0.50 |

### Troubleshooting

**El orchestrator no responde**
→ Verificar que el Worker esté corriendo: `wrangler dev src/workers/orchestrator.js`

**Agente devuelve JSON inválido**
→ El agente reintenta hasta 3 veces. Si sigue fallando, revisar el prompt en `orchestrator.js > construirSystemPrompt()`

**Error de rate limit (429)**
→ El cliente alcanzó 10 proyectos/día. Esperar hasta mañana o aumentar `MAX_PROYECTOS_DIA` en `orchestrator.js`

**Stage se queda en "running" sin avanzar**
→ El Worker de Cloudflare puede haber caído. Revisar logs en Dashboard CF y reintentar con `/retry`

**Ver el workflow completo documentado:**
`docs/workflow-maestro.md`

---

**Construir sistemas. No páginas. 🚀**
