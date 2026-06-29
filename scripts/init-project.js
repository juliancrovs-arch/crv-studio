#!/usr/bin/env node
// =============================================================
// CRV Studio - init-project.js
// Inicializa la carpeta y archivos base de un proyecto nuevo
// y arranca el workflow maestro de agentes.
//
// Uso:
//   node scripts/init-project.js --cliente=og-barber --nombre="OG Barber Studio" --brief="Sistema de booking..."
//   node scripts/init-project.js --cliente=og-barber --nombre="OG Barber" --brief-file=brief.txt
// =============================================================

const fs   = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// --- Parsear argumentos de línea de comandos ---
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => {
      const [key, ...vals] = a.slice(2).split('=');
      return [key, vals.join('=')];
    })
);

const CLIENTE  = args.cliente;
const NOMBRE   = args.nombre;
const BRIEF    = args['brief-file']
  ? fs.readFileSync(path.resolve(args['brief-file']), 'utf8').trim()
  : args.brief;
const ENDPOINT = args.endpoint || 'http://localhost:8787/api/workflow/start';
const BASE_DIR = path.resolve(args.dir || `proyectos/${CLIENTE}`);

// --- Validaciones ---
if (!CLIENTE || !NOMBRE || !BRIEF) {
  console.error(`
❌ Faltan argumentos requeridos.

Uso:
  node scripts/init-project.js \\
    --cliente=og-barber \\
    --nombre="OG Barber Studio" \\
    --brief="Sistema de booking con agente conversacional para barbería premium"

Opcionales:
  --brief-file=brief.txt    Leer brief desde archivo
  --endpoint=http://...     URL del orchestrator (default: localhost:8787)
  --dir=ruta/               Directorio base (default: proyectos/{cliente})
`);
  process.exit(1);
}

if (BRIEF.length < 20) {
  console.error('❌ El brief es muy corto. Describe el proyecto con al menos 20 caracteres.');
  process.exit(1);
}

// --- Crear estructura de carpetas ---
function crearEstructura() {
  const dirs = [
    BASE_DIR,
    `${BASE_DIR}/src`,
    `${BASE_DIR}/src/css`,
    `${BASE_DIR}/src/js`,
    `${BASE_DIR}/src/workers`,
    `${BASE_DIR}/agentes`,
    `${BASE_DIR}/componentes`,
    `${BASE_DIR}/docs`,
    `${BASE_DIR}/tests`,
    `${BASE_DIR}/scripts`,
  ];

  dirs.forEach(d => fs.mkdirSync(d, { recursive: true }));
  console.log(`📁 Carpetas creadas en ${BASE_DIR}`);
}

// --- Crear archivos base ---
function crearArchivosBase() {
  const clienteSlug = CLIENTE.toLowerCase().replace(/\s+/g, '-');

  // README.md
  fs.writeFileSync(`${BASE_DIR}/README.md`, `# ${NOMBRE}

Proyecto de CRV Studio para ${CLIENTE}.

## Setup

\`\`\`bash
npm install
npm run dev
\`\`\`

## Deploy

\`\`\`bash
wrangler pages deploy . --project-name=${clienteSlug}
\`\`\`

## Brief original

${BRIEF}

---
Generado por CRV OS el ${new Date().toISOString().split('T')[0]}
`);

  // wrangler.toml
  fs.writeFileSync(`${BASE_DIR}/wrangler.toml`, `name = "${clienteSlug}"
main = "src/workers/api.js"
compatibility_date = "2025-01-01"

[[d1_databases]]
binding = "DB"
database_name = "${clienteSlug}-db"
database_id = "REEMPLAZAR_CON_ID_REAL"

[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "REEMPLAZAR_CON_ID_REAL"

[vars]
ENVIRONMENT = "development"
`);

  // package.json
  fs.writeFileSync(`${BASE_DIR}/package.json`, JSON.stringify({
    name: clienteSlug,
    version: '1.0.0',
    description: NOMBRE,
    scripts: {
      dev:    'wrangler pages dev .',
      deploy: 'wrangler pages deploy . --project-name=' + clienteSlug,
      test:   'node tests/run.js',
      lint:   'echo "lint ok"',
    },
    devDependencies: {
      wrangler: '^3.0.0',
    },
  }, null, 2));

  // .gitignore
  fs.writeFileSync(`${BASE_DIR}/.gitignore`, `node_modules/
.env
.env.local
.wrangler/
dist/
*.log
`);

  // docs/brief.md
  fs.writeFileSync(`${BASE_DIR}/docs/brief.md`, `# Brief - ${NOMBRE}

${BRIEF}

---
Fecha: ${new Date().toISOString().split('T')[0]}
Cliente: ${CLIENTE}
`);

  console.log(`📄 Archivos base creados`);
}

// --- Llamar al orchestrator ---
function llamarOrchestrator() {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      cliente: CLIENTE,
      nombre_proyecto: NOMBRE,
      brief: BRIEF,
    });

    const urlObj = new URL(ENDPOINT);
    const lib    = urlObj.protocol === 'https:' ? https : http;

    const req = lib.request(urlObj, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error || data}`));
          } else {
            resolve(parsed);
          }
        } catch {
          reject(new Error(`Respuesta inválida: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// --- Guardar projectId localmente ---
function guardarProjectId(projectId) {
  const crv = { projectId, cliente: CLIENTE, nombre: NOMBRE, creado: new Date().toISOString() };
  fs.writeFileSync(`${BASE_DIR}/.crv-project.json`, JSON.stringify(crv, null, 2));
  console.log(`💾 ProjectId guardado en ${BASE_DIR}/.crv-project.json`);
}

// --- Main ---
async function main() {
  console.log(`\n🚀 CRV OS — Iniciando proyecto: ${NOMBRE}\n`);
  console.log(`   Cliente:  ${CLIENTE}`);
  console.log(`   Directorio: ${BASE_DIR}`);
  console.log(`   Brief: ${BRIEF.slice(0, 80)}...\n`);

  crearEstructura();
  crearArchivosBase();

  console.log('\n📡 Contactando al Orchestrator...');

  let projectId;
  try {
    const resp = await llamarOrchestrator();
    projectId = resp.projectId;
    guardarProjectId(projectId);
    console.log(`✅ Pipeline iniciado: ${projectId}`);
  } catch (err) {
    console.warn(`⚠️  No se pudo contactar al Orchestrator: ${err.message}`);
    console.warn('   Podés iniciar el pipeline manualmente más tarde.');
    projectId = 'pendiente';
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Proyecto ${NOMBRE} inicializado
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 Directorio: ${BASE_DIR}
🔑 Project ID: ${projectId}

PRÓXIMOS PASOS:

1. Monitorear el pipeline:
   GET ${ENDPOINT.replace('/start', '/status/' + projectId)}

2. Ver dashboard admin:
   http://localhost:3456/src/admin/workflow.html

3. Cuando el pipeline termine:
   - Revisar output en .crv-project.json
   - Configurar env vars en Cloudflare Dashboard
   - Correr: wrangler d1 execute ${CLIENTE}-db --file=scripts/d1-schema.sql
   - Deploy: npm run deploy

4. Si hay error en un agente:
   POST ${ENDPOINT.replace('/start', '/retry/' + projectId)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch(err => {
  console.error('❌ Error fatal:', err.message);
  process.exit(1);
});
