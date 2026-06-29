#!/usr/bin/env node
// =============================================================
// CRV Studio — process-client-data.js
// Convierte el JSON de onboarding en archivos listos para Claude Code
//
// Uso:
//   node scripts/process-client-data.js ruta/al/archivo.json
//   node scripts/process-client-data.js ruta/al/archivo.json --output=./salida/
// =============================================================

const fs   = require('fs');
const path = require('path');

// --- Argumentos ---
const args    = process.argv.slice(2);
const archivo = args.find(a => !a.startsWith('--'));
const outputArg = (args.find(a => a.startsWith('--output=')) || '').replace('--output=', '');

if (!archivo) {
  console.error('❌ Uso: node scripts/process-client-data.js <archivo.json> [--output=directorio/]');
  process.exit(1);
}

// --- Leer JSON ---
let datos;
try {
  datos = JSON.parse(fs.readFileSync(path.resolve(archivo), 'utf8'));
} catch (e) {
  console.error(`❌ No se pudo leer ${archivo}: ${e.message}`);
  process.exit(1);
}

const { negocio, contacto, marca, servicios, proyecto } = datos;
const slug     = (negocio.nombre || 'cliente').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
const outputDir = outputArg || path.join(path.dirname(path.resolve(archivo)), `${slug}-crv`);
fs.mkdirSync(outputDir, { recursive: true });

// =============================================================
// GENERAR prompt.md
// =============================================================
function generarHorariosTexto(horarios) {
  if (!horarios) return 'No especificados';
  return Object.entries(horarios).map(([dia, val]) =>
    val === 'cerrado' ? `${dia}: Cerrado` : `${dia}: ${val.desde} a ${val.hasta}`
  ).join('\n');
}

function generarPrompt() {
  const horariosTexto = generarHorariosTexto(negocio.horarios);
  const productosTexto = (servicios.productos || []).map(p => `- ${p}`).join('\n');
  const redesTexto = Object.entries(contacto.redes || {})
    .filter(([, v]) => v)
    .map(([red, url]) => `- ${red}: ${url}`)
    .join('\n') || '- (No especificadas)';

  return `# Prompt para Claude Code — ${negocio.nombre}

> Generado por CRV Studio Onboarding System
> Fecha: ${new Date().toLocaleDateString('es-AR')}
> Proyecto: ${slug}

---

## ROL

Actuá como arquitecto de CRV Studio. Tu tarea es construir el sitio web completo para el siguiente cliente.

Seguí los estándares de CRV Studio:
- Stack: HTML/CSS/JS vanilla + Cloudflare Workers + D1
- Sin frameworks ni librerías externas innecesarias
- Mobile-first, Lighthouse >90
- Comentarios en español
- Código limpio, funciones <50 líneas

---

## CLIENTE

**Nombre:** ${negocio.nombre}
**Tipo:** ${negocio.tipo}
**Descripción:** ${negocio.descripcion}
**Ubicación:** ${negocio.ubicacion}

---

## CONTACTO

- **Responsable:** ${contacto.responsable}
- **Teléfono/WhatsApp:** ${contacto.telefono}
- **Email:** ${contacto.email}

**Redes sociales:**
${redesTexto}

---

## HORARIOS

\`\`\`
${horariosTexto}
\`\`\`

---

## MARCA

- **Color primario:** ${marca.color_primario}
- **Color secundario:** ${marca.color_secundario || 'A definir'}
- **Estilo visual:** ${marca.estilo || 'No especificado'}
- **Logo:** ${marca.tiene_logo}
${marca.referencias ? `- **Referencias:** ${marca.referencias}` : ''}

---

## PRODUCTOS Y SERVICIOS

${productosTexto}

---

## FUNCIONALIDADES REQUERIDAS

| Feature | Requerido |
|---|---|
| Sistema de turnos/reservas | ${servicios.necesita_turnos === 'si' ? '✅ Sí' : servicios.necesita_turnos === 'quizas' ? '⚠️ A evaluar' : '❌ No'} |
| Carrito / pagos online | ${servicios.necesita_pagos !== 'no' ? `✅ ${servicios.necesita_pagos}` : '❌ No'} |
| Panel de administración | ${servicios.necesita_admin !== 'no' ? `✅ ${servicios.necesita_admin}` : '❌ No'} |

---

## PROYECTO

- **Presupuesto:** ${proyecto.presupuesto || 'A definir'}
- **Deadline:** ${proyecto.deadline || 'No especificado'}
- **Dominio propio:** ${proyecto.dominio}
${proyecto.requisitos ? `- **Requisitos especiales:** ${proyecto.requisitos}` : ''}
${proyecto.notas ? `- **Notas adicionales:** ${proyecto.notas}` : ''}

---

## TAREA

Con toda la información anterior, construí el proyecto completo:

### 1. Estructura de carpetas
Seguí la estructura estándar de CRV OS:
\`\`\`
proyectos/${slug}/
├── index.html          ← Landing principal
├── src/
│   ├── css/main.css
│   ├── js/app.js
│   └── workers/api.js
├── wrangler.toml
├── package.json
└── README.md
\`\`\`

### 2. index.html
Landing page completa con:
- Hero section con nombre y descripción del negocio
- Sección de servicios/productos
- Horarios de atención
- Ubicación con dirección
- Datos de contacto y redes sociales
- Formulario de contacto básico
- Footer

**Paleta de colores:**
- Primario: \`${marca.color_primario}\`
- Secundario: \`${marca.color_secundario || '#111111'}\`
- Fondo: \`#0a0a0a\` o adaptado al estilo ${marca.estilo || 'elegante'}

### 3. Workers API (si aplica)
${servicios.necesita_turnos === 'si' ? '- Endpoint de turnos: POST /api/turnos, GET /api/disponibilidad' : ''}
${servicios.necesita_admin !== 'no' ? '- Admin: GET /api/admin/dashboard (protegido con ADMIN_SECRET)' : ''}
- GET /api/health → {"status": "ok"}

### 4. wrangler.toml
Config para Cloudflare Pages con D1 binding si necesita backend.

### 5. README.md
Instrucciones de setup y deploy para el cliente.

---

Empezá por el \`index.html\` completo y funcional. Luego el resto.
`;
}

// =============================================================
// GENERAR client-brief.md
// =============================================================
function generarBrief() {
  const fecha    = new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'long', year:'numeric' });
  const productos = (servicios.productos || []).map(p => `- ${p}`).join('\n');

  return `# Brief Ejecutivo — ${negocio.nombre}

> CRV Studio · ${fecha}

---

## Resumen

**${negocio.nombre}** es un negocio de tipo **${negocio.tipo}** ubicado en **${negocio.ubicacion}**.

${negocio.descripcion}

---

## Contacto principal

| Campo | Valor |
|---|---|
| Responsable | ${contacto.responsable} |
| Teléfono | ${contacto.telefono} |
| Email | ${contacto.email} |

---

## Oferta comercial

${productos}

---

## Identidad visual

- Color primario: **${marca.color_primario}**
- Color secundario: **${marca.color_secundario || 'sin definir'}**
- Estilo: ${marca.estilo || 'a definir'}
- Logo: ${marca.tiene_logo}

---

## Alcance del proyecto

| Feature | Estado |
|---|---|
| Landing page | ✅ Incluido |
| Turnos/reservas | ${servicios.necesita_turnos === 'si' ? '✅ Incluido' : servicios.necesita_turnos === 'quizas' ? '⚠️ A evaluar' : '➖ No incluido'} |
| Pagos online | ${servicios.necesita_pagos !== 'no' ? '✅ Incluido' : '➖ No incluido'} |
| Panel admin | ${servicios.necesita_admin !== 'no' ? '✅ Incluido' : '➖ No incluido'} |

---

## Estimación

- **Presupuesto:** ${proyecto.presupuesto || 'A definir con el cliente'}
- **Deadline:** ${proyecto.deadline || 'A definir'}
- **Dominio:** ${proyecto.dominio}

${proyecto.requisitos ? `## Requisitos especiales\n\n${proyecto.requisitos}` : ''}

${proyecto.notas ? `## Notas\n\n${proyecto.notas}` : ''}

---

*Generado automáticamente por CRV Studio Onboarding System*
`;
}

// =============================================================
// ESCRIBIR ARCHIVOS
// =============================================================
const promptPath = path.join(outputDir, 'prompt.md');
const briefPath  = path.join(outputDir, 'client-brief.md');
const jsonPath   = path.join(outputDir, 'datos-originales.json');

fs.writeFileSync(promptPath, generarPrompt());
fs.writeFileSync(briefPath,  generarBrief());
fs.writeFileSync(jsonPath,   JSON.stringify(datos, null, 2));

console.log(`
✅ Archivos generados en: ${outputDir}

  📄 prompt.md          → Pasalo a Claude Code para arrancar el proyecto
  📋 client-brief.md    → Resumen ejecutivo del cliente
  🗂️  datos-originales.json → Copia del JSON de onboarding

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRÓXIMO PASO:

  Abrí Claude Code y pegá el contenido de:
  ${promptPath}

  O iniciá el workflow maestro:
  node scripts/init-project.js \\
    --cliente=${slug} \\
    --nombre="${negocio.nombre}" \\
    --brief-file=${briefPath}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
