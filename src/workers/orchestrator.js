// =============================================================
// CRV Studio - Orchestrator Worker
// Workflow maestro: ejecuta 7 agentes en secuencia para
// generar un proyecto completo desde un brief del cliente.
// =============================================================

// Modelos según CLAUDE.md: Haiku para tareas simples, Sonnet para Code
const MODELOS = {
  discovery:    'claude-haiku-4-5',
  planning:     'claude-haiku-4-5',
  architecture: 'claude-haiku-4-5',
  components:   'claude-haiku-4-5',
  code:         'claude-sonnet-4-6',
  qa:           'claude-haiku-4-5',
  deploy:       'claude-haiku-4-5',
};

// Costo por millón de tokens (USD) - actualizar si cambian precios
const COSTO_POR_MILLON = {
  'claude-haiku-4-5':   { entrada: 0.80,  salida: 4.00  },
  'claude-sonnet-4-6':  { entrada: 3.00,  salida: 15.00 },
};

const AGENTES = ['discovery', 'planning', 'architecture', 'components', 'code', 'qa', 'deploy'];
const MAX_PROYECTOS_DIA = 10;
const MAX_REINTENTOS = 3;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    // CORS permisivo en dev, restringir en prod con env.ALLOWED_ORIGIN
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    try {
      // POST /api/workflow/start
      if (pathname === '/api/workflow/start' && request.method === 'POST') {
        return await iniciarWorkflow(request, env, headers);
      }

      // GET /api/workflow/status/:projectId
      const matchStatus = pathname.match(/^\/api\/workflow\/status\/([^/]+)$/);
      if (matchStatus && request.method === 'GET') {
        return await obtenerStatus(matchStatus[1], env, headers);
      }

      // POST /api/workflow/retry/:projectId
      const matchRetry = pathname.match(/^\/api\/workflow\/retry\/([^/]+)$/);
      if (matchRetry && request.method === 'POST') {
        return await reintentarWorkflow(matchRetry[1], env, headers);
      }

      // GET /api/workflow/list
      if (pathname === '/api/workflow/list' && request.method === 'GET') {
        return await listarProyectos(url, env, headers);
      }

      // GET /api/health
      if (pathname === '/api/health') {
        return json({ status: 'ok', ts: new Date().toISOString() }, headers);
      }

      return json({ error: 'Ruta no encontrada' }, headers, 404);

    } catch (err) {
      console.error('Error en orchestrator:', err);
      return json({ error: 'Error interno del servidor', detail: err.message }, headers, 500);
    }
  },
};

// =============================================================
// INICIAR WORKFLOW
// =============================================================

async function iniciarWorkflow(request, env, headers) {
  const body = await request.json().catch(() => null);

  if (!body?.cliente || !body?.brief || !body?.nombre_proyecto) {
    return json({ error: 'Se requiere cliente, nombre_proyecto y brief' }, headers, 400);
  }

  const { cliente, brief, nombre_proyecto } = body;

  // Validar input básico
  if (brief.length < 20 || brief.length > 5000) {
    return json({ error: 'El brief debe tener entre 20 y 5000 caracteres' }, headers, 400);
  }

  // Verificar rate limit
  const hoy = new Date().toISOString().split('T')[0];
  const limitOk = await verificarRateLimit(env.DB, cliente, hoy);
  if (!limitOk) {
    return json({
      error: `Límite de ${MAX_PROYECTOS_DIA} proyectos/día alcanzado para el cliente ${cliente}`
    }, headers, 429);
  }

  // Crear registro en D1
  const projectId = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO proyecto_workflow (proyecto_id, cliente, nombre_proyecto, brief, stage, status)
    VALUES (?, ?, ?, ?, 0, 'running')
  `).bind(projectId, cliente, nombre_proyecto, brief).run();

  // Incrementar rate limit
  await env.DB.prepare(`
    INSERT INTO rate_limits (cliente, fecha, proyectos_hoy)
    VALUES (?, ?, 1)
    ON CONFLICT(cliente, fecha) DO UPDATE SET proyectos_hoy = proyectos_hoy + 1
  `).bind(cliente, hoy).run();

  // Ejecutar pipeline en background (Cloudflare Workers admite waitUntil)
  const ctx = { waitUntil: (p) => p }; // fallback si no hay ExecutionContext
  ejecutarPipeline(projectId, brief, env).catch(console.error);

  return json({ projectId, status: 'running', message: 'Pipeline iniciado' }, headers, 201);
}

// =============================================================
// PIPELINE PRINCIPAL
// =============================================================

async function ejecutarPipeline(projectId, brief, env) {
  // Recuperar estado actual (permite reanudar si se interrumpió)
  const row = await env.DB.prepare(
    'SELECT * FROM proyecto_workflow WHERE proyecto_id = ?'
  ).bind(projectId).first();

  if (!row) return;

  // Contexto acumulado: cada agente agrega su output
  const contexto = { brief, cliente: row.cliente, nombre_proyecto: row.nombre_proyecto };

  for (let i = 0; i < AGENTES.length; i++) {
    const agente = AGENTES[i];
    const stageNum = i + 1;
    const outputKey = `${agente}_output`;

    // Si ya tiene output (reintento parcial), saltar
    if (row[outputKey]) {
      contexto[agente] = JSON.parse(row[outputKey]);
      continue;
    }

    // Actualizar stage en D1
    await env.DB.prepare(
      'UPDATE proyecto_workflow SET stage = ?, updated_at = datetime("now") WHERE proyecto_id = ?'
    ).bind(stageNum, projectId).run();

    // Ejecutar agente con reintentos
    const resultado = await ejecutarAgenteConReintentos(agente, contexto, projectId, env);

    if (!resultado.ok) {
      // Error definitivo después de reintentos
      await env.DB.prepare(`
        UPDATE proyecto_workflow
        SET status = 'error', error_msg = ?, updated_at = datetime('now')
        WHERE proyecto_id = ?
      `).bind(resultado.error, projectId).run();
      return;
    }

    // Guardar output en D1
    const outputJson = JSON.stringify(resultado.data);
    await env.DB.prepare(`
      UPDATE proyecto_workflow
      SET ${outputKey} = ?, updated_at = datetime('now')
      WHERE proyecto_id = ?
    `).bind(outputJson, projectId).run();

    contexto[agente] = resultado.data;
  }

  // Pipeline completado
  await env.DB.prepare(`
    UPDATE proyecto_workflow
    SET stage = 8, status = 'complete', completed_at = datetime('now'), updated_at = datetime('now')
    WHERE proyecto_id = ?
  `).bind(projectId).run();
}

// =============================================================
// EJECUTAR UN AGENTE CON REINTENTOS
// =============================================================

async function ejecutarAgenteConReintentos(agente, contexto, projectId, env) {
  for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
    const inicio = Date.now();

    await registrarLogAgente(env.DB, {
      projectId, agente, estado: intento === 1 ? 'started' : 'retrying', intento
    });

    try {
      const resultado = await llamarClaude(agente, contexto, env);
      const duracion = Date.now() - inicio;

      await registrarLogAgente(env.DB, {
        projectId, agente, estado: 'completed', intento,
        duracion, tokens: resultado.usage, modelo: MODELOS[agente]
      });

      await registrarTokenUsage(env.DB, {
        projectId, agente, modelo: MODELOS[agente], usage: resultado.usage
      });

      return { ok: true, data: resultado.data };

    } catch (err) {
      const duracion = Date.now() - inicio;
      console.error(`Agente ${agente} intento ${intento} falló:`, err.message);

      await registrarLogAgente(env.DB, {
        projectId, agente, estado: 'error', intento,
        duracion, errorMsg: err.message
      });

      if (intento === MAX_REINTENTOS) {
        return { ok: false, error: `${agente}: ${err.message} (después de ${MAX_REINTENTOS} intentos)` };
      }

      // Esperar antes de reintentar (backoff simple)
      await sleep(2000 * intento);
    }
  }
}

// =============================================================
// LLAMAR A CLAUDE API
// =============================================================

async function llamarClaude(agente, contexto, env) {
  const modelo = MODELOS[agente];
  const systemPrompt = construirSystemPrompt(agente, contexto);
  const userMessage = construirUserMessage(agente, contexto);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: agente === 'code' ? 8192 : 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errorBody}`);
  }

  const result = await response.json();
  const texto = result.content?.[0]?.text || '';

  // Extraer JSON del texto de respuesta
  const data = extraerJSON(texto);
  if (!data) {
    throw new Error(`El agente ${agente} no devolvió JSON válido. Respuesta: ${texto.slice(0, 200)}`);
  }

  return { data, usage: result.usage };
}

// =============================================================
// SYSTEM PROMPTS POR AGENTE
// =============================================================

function construirSystemPrompt(agente, contexto) {
  const base = `Eres un agente especializado de CRV Studio.
Stack: HTML/CSS/JS vanilla + Cloudflare Workers + D1 + Claude API.
SIEMPRE devuelves un JSON válido. Sin texto adicional antes o después del JSON.
Comentarios en español. Código limpio y modular.`;

  const prompts = {
    discovery: `${base}
Rol: Discovery Agent.
Analiza el brief y extrae TODA la información relevante del proyecto.
Output: JSON con proyecto, tipo, objetivos, público, restricciones, deadline, presupuesto_tokens_usd.`,

    planning: `${base}
Rol: Planning Agent.
Genera el plan de trabajo por fases basándote en el discovery.
Output: JSON con fases (nombre, duracion_dias, tareas, entregables), riesgos, dependencias_externas.`,

    architecture: `${base}
Rol: Architecture Agent.
Define la estructura técnica completa del proyecto.
Output: JSON con estructura de carpetas, endpoints (metodo/ruta/desc), d1_tablas, kv_namespaces, variables_entorno.`,

    components: `${base}
Rol: Components Agent.
Identifica componentes reutilizables de CRV OS y define los nuevos a crear.
Output: JSON con componentes_existentes, componentes_nuevos (nombre/ruta/archivos/descripcion), componentes_a_registrar_en_crv.`,

    code: `${base}
Rol: Code Agent. Eres el más importante del pipeline.
Genera el código REAL de los archivos más críticos del proyecto.
Prioriza: Worker principal, schema D1, index.html, componente principal.
Código completo, funcional, con manejo de errores.
Output: JSON con archivos_generados (ruta/contenido/lineas/descripcion), tests_sugeridos, advertencias.`,

    qa: `${base}
Rol: QA Agent.
Revisa el código generado contra los principios de CRV Studio.
Checklist obligatorio: rate_limiting, validacion_input, logs_d1, cors_configurado, sin_credenciales_hardcoded, documentado.
Output: JSON con aprobado (bool), score (0-100), checklist (bools), issues (severidad/archivo/linea/msg), recomendaciones.`,

    deploy: `${base}
Rol: Deploy Agent.
Genera el checklist y comandos de deploy para Cloudflare Pages.
Output: JSON con listo_para_deploy (bool), comandos (array), variables_a_configurar, health_check, rollback.`,
  };

  return prompts[agente] || base;
}

function construirUserMessage(agente, contexto) {
  const mensajes = {
    discovery: `Analiza este brief y extrae toda la información del proyecto:

Cliente: ${contexto.cliente}
Proyecto: ${contexto.nombre_proyecto}
Brief: ${contexto.brief}

Devuelve JSON con toda la información extraída.`,

    planning: `Con base en este discovery, genera el plan de trabajo:

${JSON.stringify(contexto.discovery, null, 2)}

Devuelve JSON con el plan por fases.`,

    architecture: `Con base en el planning, define la arquitectura técnica:

Discovery: ${JSON.stringify(contexto.discovery, null, 2)}
Planning: ${JSON.stringify(contexto.planning, null, 2)}

Devuelve JSON con estructura de carpetas, endpoints, tablas D1 y variables de entorno.`,

    components: `Con base en la arquitectura, identifica componentes:

Architecture: ${JSON.stringify(contexto.architecture, null, 2)}

Devuelve JSON con componentes existentes y nuevos a crear.`,

    code: `Genera el código de los archivos más importantes del proyecto:

Proyecto: ${contexto.nombre_proyecto}
Architecture: ${JSON.stringify(contexto.architecture, null, 2)}
Components: ${JSON.stringify(contexto.components, null, 2)}

Genera código completo y funcional. Prioriza el Worker principal y la página index.html.
Devuelve JSON con archivos_generados (incluye el contenido completo en "contenido").`,

    qa: `Revisa el código generado:

QA Input:
Architecture: ${JSON.stringify(contexto.architecture, null, 2)}
Code Output: ${JSON.stringify(contexto.code, null, 2)}

Verifica contra principios CRV. Devuelve JSON con aprobado, score, checklist, issues, recomendaciones.`,

    deploy: `Genera el checklist y comandos de deploy:

Proyecto: ${contexto.nombre_proyecto}
Cliente: ${contexto.cliente}
QA: ${JSON.stringify(contexto.qa, null, 2)}
Architecture: ${JSON.stringify(contexto.architecture, null, 2)}

Devuelve JSON con comandos de deploy para Cloudflare Pages, variables a configurar, health check y rollback.`,
  };

  return mensajes[agente] || `Procesa el siguiente contexto: ${JSON.stringify(contexto)}`;
}

// =============================================================
// STATUS Y LISTADO
// =============================================================

async function obtenerStatus(projectId, env, headers) {
  const row = await env.DB.prepare(
    'SELECT * FROM proyecto_workflow WHERE proyecto_id = ?'
  ).bind(projectId).first();

  if (!row) {
    return json({ error: 'Proyecto no encontrado' }, headers, 404);
  }

  // Leer logs del agente actual
  const logs = await env.DB.prepare(
    'SELECT agente, estado, duracion_ms, tokens_entrada, tokens_salida, modelo, error_msg, created_at FROM agent_logs WHERE proyecto_id = ? ORDER BY created_at DESC LIMIT 20'
  ).bind(projectId).all();

  // Leer costo total
  const costos = await env.DB.prepare(
    'SELECT agente, modelo, tokens_entrada, tokens_salida, costo_usd FROM token_usage WHERE proyecto_id = ?'
  ).bind(projectId).all();

  const costoTotal = costos.results?.reduce((sum, r) => sum + (r.costo_usd || 0), 0) || 0;

  return json({
    projectId: row.proyecto_id,
    cliente: row.cliente,
    nombre_proyecto: row.nombre_proyecto,
    stage: row.stage,
    stage_nombre: AGENTES[row.stage - 1] || (row.stage === 0 ? 'nuevo' : 'completo'),
    status: row.status,
    error_msg: row.error_msg,
    agentes_completados: AGENTES.slice(0, Math.max(0, row.stage - 1)),
    costo_total_usd: Math.round(costoTotal * 10000) / 10000,
    logs: logs.results || [],
    token_usage: costos.results || [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
  }, headers);
}

async function listarProyectos(url, env, headers) {
  const cliente = url.searchParams.get('cliente');
  const status = url.searchParams.get('status');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

  let query = 'SELECT proyecto_id, cliente, nombre_proyecto, stage, status, created_at, updated_at FROM proyecto_workflow';
  const params = [];
  const where = [];

  if (cliente) { where.push('cliente = ?'); params.push(cliente); }
  if (status)  { where.push('status = ?');  params.push(status); }
  if (where.length) query += ' WHERE ' + where.join(' AND ');
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const rows = await env.DB.prepare(query).bind(...params).all();
  return json({ proyectos: rows.results || [], total: rows.results?.length || 0 }, headers);
}

async function reintentarWorkflow(projectId, env, headers) {
  const row = await env.DB.prepare(
    'SELECT * FROM proyecto_workflow WHERE proyecto_id = ?'
  ).bind(projectId).first();

  if (!row) return json({ error: 'Proyecto no encontrado' }, headers, 404);
  if (row.status !== 'error') return json({ error: 'El proyecto no está en estado error' }, headers, 400);

  // Limpiar output del agente fallido y reactivar
  const agenteActual = AGENTES[row.stage - 1];
  const outputKey = agenteActual ? `${agenteActual}_output` : null;

  let updateQuery = `UPDATE proyecto_workflow SET status = 'running', error_msg = NULL, updated_at = datetime('now')`;
  if (outputKey) updateQuery += `, ${outputKey} = NULL`;
  updateQuery += ` WHERE proyecto_id = ?`;

  await env.DB.prepare(updateQuery).bind(projectId).run();

  // Re-ejecutar pipeline desde el agente fallido
  const contexto = {
    brief: row.brief,
    cliente: row.cliente,
    nombre_proyecto: row.nombre_proyecto,
    discovery: row.discovery_output ? JSON.parse(row.discovery_output) : null,
    planning: row.planning_output ? JSON.parse(row.planning_output) : null,
    architecture: row.architecture_output ? JSON.parse(row.architecture_output) : null,
    components: row.components_output ? JSON.parse(row.components_output) : null,
    code: row.code_output ? JSON.parse(row.code_output) : null,
    qa: row.qa_output ? JSON.parse(row.qa_output) : null,
  };

  ejecutarPipeline(projectId, row.brief, env, contexto).catch(console.error);

  return json({ projectId, status: 'running', message: `Reintentando desde agente ${agenteActual}` }, headers);
}

// =============================================================
// HELPERS
// =============================================================

async function verificarRateLimit(db, cliente, fecha) {
  const row = await db.prepare(
    'SELECT proyectos_hoy FROM rate_limits WHERE cliente = ? AND fecha = ?'
  ).bind(cliente, fecha).first();
  return !row || row.proyectos_hoy < MAX_PROYECTOS_DIA;
}

async function registrarLogAgente(db, { projectId, agente, estado, intento, duracion, tokens, modelo, errorMsg }) {
  await db.prepare(`
    INSERT INTO agent_logs (proyecto_id, agente, estado, intento, duracion_ms, tokens_entrada, tokens_salida, modelo, error_msg)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    projectId, agente, estado, intento || 1,
    duracion || null,
    tokens?.input_tokens || null,
    tokens?.output_tokens || null,
    modelo || null,
    errorMsg || null
  ).run();
}

async function registrarTokenUsage(db, { projectId, agente, modelo, usage }) {
  const precios = COSTO_POR_MILLON[modelo] || { entrada: 0, salida: 0 };
  const costo = (
    ((usage?.input_tokens || 0) * precios.entrada) +
    ((usage?.output_tokens || 0) * precios.salida)
  ) / 1_000_000;

  await db.prepare(`
    INSERT INTO token_usage (proyecto_id, agente, modelo, tokens_entrada, tokens_salida, tokens_cache_read, costo_usd)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    projectId, agente, modelo,
    usage?.input_tokens || 0,
    usage?.output_tokens || 0,
    usage?.cache_read_input_tokens || 0,
    Math.round(costo * 1_000_000) / 1_000_000
  ).run();
}

function extraerJSON(texto) {
  // Intentar parseo directo
  try { return JSON.parse(texto.trim()); } catch {}
  // Buscar bloque ```json ... ```
  const match = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) { try { return JSON.parse(match[1].trim()); } catch {} }
  // Buscar primer { ... } en el texto
  const start = texto.indexOf('{');
  const end = texto.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(texto.slice(start, end + 1)); } catch {}
  }
  return null;
}

function json(data, headers, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
