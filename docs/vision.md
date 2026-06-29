# CRV Studio - Visión

CRV Studio no es una agencia web tradicional.

Es un estudio de desarrollo que utiliza IA, automatización y procesos inteligentes para crear productos digitales de máxima calidad.

## Objetivo Principal

No es hacer páginas rápidamente.

Es construir un **sistema de producción escalable** donde:

- Cada proyecto **mejora la infraestructura**
- Cada componente es **reutilizable**
- Cada automatización **reduce trabajo humano**
- Todo es **modular y documentado**

## Cómo funciona

1. **Cliente nuevo** → Se usa la arquitectura existente
2. **Desarrollo** → Se crean componentes reutilizables
3. **Deploy** → Automático via Cloudflare + Git
4. **Mantenimiento** → Agentes hacen el trabajo

## Principio Core

Cualquier tarea que se repita más de 2 veces → se convierte en:
- Un componente reutilizable, O
- Una automatización, O
- Un agente que lo haga

## Clientes que usan el sistema CRV

- **OG Barber Studio**: Booking con agente conversacional
- **Los Crovas**: Catálogo + Asesor inteligente
- **22 Patagonia Sushi**: Menú dinámico
- **Café La Z**: QR digital + analytics
- **GIRSU**: Fleet tracking + análisis predictivo

Cada uno mejoró la base. El siguiente tendrá todo mejor.

## Stack Elegido

- **Frontend**: HTML/CSS/JS vanilla (sin build step, rápido deploy)
- **Backend**: Cloudflare Workers (serverless, bajo costo, global)
- **Base de datos**: D1 (SQLite, integrado en CF)
- **Storage**: Cloudflare KV (caché, tokens, sesiones)
- **Deploy**: Cloudflare Pages + GitHub (push = live)
- **IA**: Claude API (agentes, análisis, generación)
- **Agentes**: Anthropic API + Tools + MCP servers
- **Email**: Resend (SMTP confiable)

## Por qué este stack

| Necesidad | Solución | Razón |
|-----------|----------|-------|
| **Bajo costo** | Cloudflare | Gratis hasta 100k req/mes |
| **Rápido desarrollo** | Vanilla JS | Sin compilación, deploy en 30s |
| **IA integrada** | Claude API | Mejor modelo, mejor price |
| **Automatización** | Workers + Cron | Sin servidor, scheduled tasks |
| **Escalable** | Cloudflare global | 200+ datacenters |
| **No maintenance** | Managed services | Zero DevOps |

## Archivos que definen CRV

- `docs/vision.md` ← Esta página (propósito)
- `docs/principles.md` ← Estándares técnicos
- `docs/architecture.md` ← Estructura de código
- `CLAUDE.md` ← Instrucciones para Claude Code
- `componentes/` ← Bloques reutilizables
- `agentes/` ← Inteligencia automatizada
- `prompts/` ← Templates para IA

## Rol de los agentes

Los agentes **no reemplazan** al humano.

Los agentes **automatizan lo mecánico**:

- Verificar datos
- Generar reportes
- Responder preguntas comunes
- Recomendar opciones
- Analizar datos
- Ejecutar tareas repetitivas

El humano decide, apruebavalida, innova.

---

**Construimos sistemas. No páginas.**
