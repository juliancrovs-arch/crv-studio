# Workflow Maestro de Agentes - CRV Studio

Pipeline de 7 agentes que automatiza la creación completa de un proyecto desde el brief hasta el deploy.

## Visión general

```
Cliente da brief
       ↓
[1] DISCOVERY  →  [2] PLANNING  →  [3] ARCHITECTURE
                                           ↓
[7] DEPLOY  ←  [6] QA  ←  [5] CODE  ←  [4] COMPONENTS
```

Cada agente:
- Recibe el JSON de salida del agente anterior
- Escribe su output en D1 (`proyecto_workflow`)
- Registra tokens y duración en `agent_logs`
- Si falla → guarda error, detiene pipeline, espera reintento

---

## Los 7 Agentes

### [1] Discovery Agent
**Modelo:** claude-haiku-4-5  
**Input:** Brief del cliente (texto libre)  
**Duración estimada:** 30-60s

Analiza el brief y extrae toda la información necesaria para el proyecto.

```json
{
  "proyecto": "OG Barber Studio",
  "cliente": "og-barber",
  "tipo": "booking + agente conversacional",
  "objetivos": ["sistema de turnos", "asesor de cortes", "admin panel"],
  "publico": "clientes de barbería, 18-40 años",
  "competencia": ["Fresha", "Booksy"],
  "diferenciadores": ["estética premium", "IA conversacional"],
  "restricciones": ["sin pagos online", "WhatsApp integrado"],
  "deadline": "2026-07-30",
  "presupuesto_tokens_usd": 5.00,
  "confianza": 0.92
}
```

---

### [2] Planning Agent
**Modelo:** claude-haiku-4-5  
**Input:** Output de Discovery  
**Duración estimada:** 45-90s

Genera el plan de trabajo con fases, tareas y estimaciones.

```json
{
  "fases": [
    {
      "nombre": "Setup",
      "duracion_dias": 1,
      "tareas": ["init repo", "wrangler config", "D1 schema"],
      "entregables": ["repo listo", "DB creada"]
    },
    {
      "nombre": "Core",
      "duracion_dias": 3,
      "tareas": ["booking system", "admin panel", "email notifs"],
      "entregables": ["CRUD turnos", "login admin"]
    },
    {
      "nombre": "IA",
      "duracion_dias": 2,
      "tareas": ["agente booking", "prompts", "rate limiting"],
      "entregables": ["agente funcional"]
    },
    {
      "nombre": "Deploy",
      "duracion_dias": 1,
      "tareas": ["cloudflare pages", "dominio", "monitoring"],
      "entregables": ["sitio live"]
    }
  ],
  "total_dias": 7,
  "riesgos": ["scope creep en IA", "integración WhatsApp no garantizada"],
  "dependencias_externas": ["Resend API key", "dominio DNS"]
}
```

---

### [3] Architecture Agent
**Modelo:** claude-haiku-4-5  
**Input:** Output de Planning  
**Duración estimada:** 60-120s

Define la estructura técnica completa: carpetas, archivos, endpoints, schema D1.

```json
{
  "estructura": {
    "raiz": ["index.html", "wrangler.toml", "package.json"],
    "src": ["admin/index.html", "css/main.css", "js/app.js"],
    "workers": ["api.js", "rate-limit.js", "booking.js"],
    "agentes": ["asesor/agent.js", "asesor/tools.js", "asesor/config.js"]
  },
  "endpoints": [
    {"metodo": "GET",  "ruta": "/api/turnos",           "desc": "Lista turnos"},
    {"metodo": "POST", "ruta": "/api/turnos",           "desc": "Crear turno"},
    {"metodo": "POST", "ruta": "/api/agente/chat",      "desc": "Chat con asesor"},
    {"metodo": "GET",  "ruta": "/api/admin/dashboard",  "desc": "Métricas admin"}
  ],
  "d1_tablas": ["turnos", "clientes", "servicios", "chat_logs", "admin_users"],
  "kv_namespaces": ["rate_limits", "sessions"],
  "variables_entorno": ["ANTHROPIC_API_KEY", "RESEND_API_KEY", "ADMIN_SECRET"]
}
```

---

### [4] Components Agent
**Modelo:** claude-haiku-4-5  
**Input:** Output de Architecture  
**Duración estimada:** 60-90s

Identifica qué componentes de `componentes/` reutilizar y qué crear nuevos.

```json
{
  "componentes_existentes": [],
  "componentes_nuevos": [
    {
      "nombre": "booking-card",
      "ruta": "componentes/booking-card/",
      "archivos": ["index.html", "style.css"],
      "descripcion": "Card de turno con estado, hora, servicio"
    },
    {
      "nombre": "chat-widget",
      "ruta": "componentes/chat-widget/",
      "archivos": ["index.html", "style.css", "chat.js"],
      "descripcion": "Widget de chat para el agente asesor"
    }
  ],
  "componentes_a_registrar_en_crv": ["booking-card", "chat-widget"]
}
```

---

### [5] Code Agent
**Modelo:** claude-sonnet-4-6  
**Input:** Outputs de Architecture + Components  
**Duración estimada:** 3-8 min

El único agente que usa Sonnet. Genera el código real de cada archivo definido en Architecture.

```json
{
  "archivos_generados": [
    {
      "ruta": "src/workers/api.js",
      "lineas": 180,
      "descripcion": "Router principal de la API"
    },
    {
      "ruta": "src/workers/booking.js",
      "lineas": 120,
      "descripcion": "CRUD de turnos con validaciones"
    }
  ],
  "tests_sugeridos": ["booking-crud.test.js", "rate-limit.test.js"],
  "advertencias": ["revisar CORS antes de deploy", "configurar env vars en CF"]
}
```

---

### [6] QA Agent
**Modelo:** claude-haiku-4-5  
**Input:** Output de Code  
**Duración estimada:** 60-120s

Revisa el código generado contra los principios de CRV. No ejecuta código, hace análisis estático.

```json
{
  "aprobado": true,
  "score": 87,
  "checklist": {
    "tiene_rate_limiting": true,
    "valida_input": true,
    "logs_en_d1": true,
    "cors_configurado": false,
    "sin_credenciales_hardcoded": true,
    "documentado": true,
    "funciones_menos_50_lineas": true
  },
  "issues": [
    {"severidad": "media", "archivo": "api.js", "linea": 45, "msg": "CORS permite * en desarrollo"}
  ],
  "recomendaciones": ["cambiar CORS antes de prod", "agregar test para booking concurrente"]
}
```

---

### [7] Deploy Agent
**Modelo:** claude-haiku-4-5  
**Input:** Outputs de Code + QA  
**Duración estimada:** 30-60s

Genera el checklist final y los comandos de deploy. No ejecuta el deploy (lo hace el humano o CI/CD).

```json
{
  "listo_para_deploy": true,
  "comandos": [
    "wrangler d1 execute crv-db --file=scripts/setup-d1.sql",
    "wrangler pages deploy . --project-name=og-barber-studio",
    "wrangler kv:namespace create rate_limits"
  ],
  "variables_a_configurar": ["ANTHROPIC_API_KEY", "RESEND_API_KEY"],
  "url_preview": "https://og-barber-studio.pages.dev",
  "health_check": "GET /api/health → {status: ok}",
  "rollback": "wrangler deployments rollback"
}
```

---

## D1 como memoria compartida

Todos los agentes leen y escriben en la misma instancia D1:

```
proyecto_workflow   → estado del pipeline, outputs de cada agente
agent_logs          → duración, tokens, errores por agente
componentes_generados → registro de componentes nuevos para CRV
token_usage         → costo real por agente y proyecto
```

Cada agente consulta las salidas anteriores antes de ejecutarse:

```js
const discovery = await db.prepare(
  'SELECT discovery_output FROM proyecto_workflow WHERE proyecto_id = ?'
).bind(projectId).first();
```

---

## Rate limiting

| Recurso                  | Límite           | Ventana   | Storage |
|--------------------------|------------------|-----------|---------|
| Proyectos nuevos por cliente | 10           | por día   | D1      |
| Tokens totales por proyecto  | 500,000      | por proyecto | D1   |
| Reintentos de agente         | 3            | por agente | D1     |
| Requests a /api/workflow     | 100          | por hora  | KV     |

---

## Costo estimado por proyecto

| Agente      | Modelo  | Tokens aprox | Costo USD |
|-------------|---------|-------------|-----------|
| Discovery   | Haiku   | 2,000        | $0.002    |
| Planning    | Haiku   | 3,000        | $0.003    |
| Architecture| Haiku   | 4,000        | $0.004    |
| Components  | Haiku   | 2,000        | $0.002    |
| Code        | Sonnet  | 20,000       | $0.180    |
| QA          | Haiku   | 5,000        | $0.005    |
| Deploy      | Haiku   | 1,000        | $0.001    |
| **TOTAL**   |         | **37,000**   | **~$0.20**|

---

## Manejo de errores

Si un agente falla:
1. Guarda `status = 'error'` y `error_msg` en D1
2. Pipeline se detiene (no avanza al siguiente agente)
3. El dashboard muestra el error con detalle
4. Para reintentar: `POST /api/workflow/retry/{projectId}`
5. Máximo 3 reintentos por agente

---

## Flujo de reintento

```
POST /api/workflow/retry/{projectId}
  → Lee stage actual desde D1
  → Borra output del agente fallido
  → Re-ejecuta desde ese agente
  → Continúa pipeline si OK
```
