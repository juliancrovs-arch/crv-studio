-- =============================================================
-- CRV Studio - D1 Schema - Workflow Maestro de Agentes
-- =============================================================

-- Tabla principal del workflow de cada proyecto
CREATE TABLE IF NOT EXISTS proyecto_workflow (
  proyecto_id       TEXT PRIMARY KEY,             -- UUID generado al crear
  cliente           TEXT NOT NULL,                -- slug del cliente (ej: og-barber)
  nombre_proyecto   TEXT NOT NULL,
  brief             TEXT NOT NULL,                -- brief original del cliente
  stage             INTEGER NOT NULL DEFAULT 0,  -- 0=nuevo, 1-7=agente, 8=completo
  status            TEXT NOT NULL DEFAULT 'pending', -- pending|running|error|complete|paused
  error_msg         TEXT,                         -- descripción del último error
  -- outputs de cada agente (JSON serializado)
  discovery_output    TEXT,
  planning_output     TEXT,
  architecture_output TEXT,
  components_output   TEXT,
  code_output         TEXT,
  qa_output           TEXT,
  deploy_output       TEXT,
  -- metadata
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at      TEXT
);

-- Logs de cada ejecución de agente
CREATE TABLE IF NOT EXISTS agent_logs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  proyecto_id   TEXT NOT NULL REFERENCES proyecto_workflow(proyecto_id),
  agente        TEXT NOT NULL,      -- discovery|planning|architecture|components|code|qa|deploy
  estado        TEXT NOT NULL,      -- started|completed|error|retrying
  intento       INTEGER NOT NULL DEFAULT 1,
  duracion_ms   INTEGER,            -- duración real en ms
  tokens_entrada INTEGER,
  tokens_salida  INTEGER,
  modelo        TEXT,               -- claude-haiku-4-5|claude-sonnet-4-6
  error_msg     TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Componentes generados en proyectos (candidatos a reutilizar en CRV OS)
CREATE TABLE IF NOT EXISTS componentes_generados (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  proyecto_id   TEXT NOT NULL REFERENCES proyecto_workflow(proyecto_id),
  nombre        TEXT NOT NULL,      -- ej: booking-card
  ruta          TEXT NOT NULL,      -- ej: componentes/booking-card/
  archivos      TEXT NOT NULL,      -- JSON array de nombres de archivo
  descripcion   TEXT,
  reutilizable  INTEGER DEFAULT 0,  -- 1 si ya fue integrado en CRV OS
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Uso de tokens y costo por agente (para control de costos)
CREATE TABLE IF NOT EXISTS token_usage (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  proyecto_id     TEXT NOT NULL REFERENCES proyecto_workflow(proyecto_id),
  agente          TEXT NOT NULL,
  modelo          TEXT NOT NULL,
  tokens_entrada  INTEGER NOT NULL DEFAULT 0,
  tokens_salida   INTEGER NOT NULL DEFAULT 0,
  tokens_cache_read INTEGER NOT NULL DEFAULT 0,
  costo_usd       REAL NOT NULL DEFAULT 0,  -- calculado al guardar
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Rate limiting por cliente (proyectos nuevos por día)
CREATE TABLE IF NOT EXISTS rate_limits (
  cliente       TEXT NOT NULL,
  fecha         TEXT NOT NULL,      -- YYYY-MM-DD
  proyectos_hoy INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (cliente, fecha)
);

-- =============================================================
-- Índices para performance
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_workflow_cliente
  ON proyecto_workflow(cliente);

CREATE INDEX IF NOT EXISTS idx_workflow_status
  ON proyecto_workflow(status);

CREATE INDEX IF NOT EXISTS idx_workflow_stage
  ON proyecto_workflow(stage);

CREATE INDEX IF NOT EXISTS idx_logs_proyecto
  ON agent_logs(proyecto_id);

CREATE INDEX IF NOT EXISTS idx_logs_agente
  ON agent_logs(agente, estado);

CREATE INDEX IF NOT EXISTS idx_tokens_proyecto
  ON token_usage(proyecto_id);

CREATE INDEX IF NOT EXISTS idx_componentes_proyecto
  ON componentes_generados(proyecto_id);

-- =============================================================
-- Vistas
-- =============================================================

-- Resumen de proyectos con costo total y estado legible
CREATE VIEW IF NOT EXISTS v_proyectos_resumen AS
SELECT
  pw.proyecto_id,
  pw.cliente,
  pw.nombre_proyecto,
  pw.stage,
  pw.status,
  CASE pw.stage
    WHEN 0 THEN 'Nuevo'
    WHEN 1 THEN 'Discovery'
    WHEN 2 THEN 'Planning'
    WHEN 3 THEN 'Architecture'
    WHEN 4 THEN 'Components'
    WHEN 5 THEN 'Code'
    WHEN 6 THEN 'QA'
    WHEN 7 THEN 'Deploy'
    WHEN 8 THEN 'Completo'
  END AS stage_nombre,
  COALESCE(SUM(tu.costo_usd), 0) AS costo_total_usd,
  COALESCE(SUM(tu.tokens_entrada + tu.tokens_salida), 0) AS tokens_totales,
  pw.created_at,
  pw.updated_at
FROM proyecto_workflow pw
LEFT JOIN token_usage tu ON pw.proyecto_id = tu.proyecto_id
GROUP BY pw.proyecto_id;

-- Costo agregado por modelo
CREATE VIEW IF NOT EXISTS v_costos_por_modelo AS
SELECT
  modelo,
  COUNT(DISTINCT proyecto_id) AS proyectos,
  SUM(tokens_entrada)  AS total_tokens_entrada,
  SUM(tokens_salida)   AS total_tokens_salida,
  ROUND(SUM(costo_usd), 4) AS costo_total_usd
FROM token_usage
GROUP BY modelo;

-- Duración promedio por agente
CREATE VIEW IF NOT EXISTS v_performance_agentes AS
SELECT
  agente,
  COUNT(*)                          AS total_ejecuciones,
  ROUND(AVG(duracion_ms) / 1000.0, 1) AS duracion_promedio_s,
  SUM(CASE WHEN estado = 'error' THEN 1 ELSE 0 END) AS total_errores,
  ROUND(
    100.0 * SUM(CASE WHEN estado = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 1
  ) AS tasa_exito_pct
FROM agent_logs
GROUP BY agente;
