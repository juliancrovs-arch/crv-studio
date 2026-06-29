# Flujo de Onboarding de Clientes — CRV Studio

Cómo pasar de "cliente nuevo" a "proyecto lanzado" en el menor tiempo posible.

---

## Visión general

```
Cliente llena form  →  Vos descargás JSON  →  Script genera prompt
       ↓
Claude Code genera web  →  Vos ajustás  →  Deploy en Cloudflare
```

---

## Paso a paso

### Paso 1 — Cliente llena el formulario

Mandar al cliente a:
```
http://localhost:3456/src/client-onboarding.html
```
(o la URL de producción cuando esté deployed)

El form tiene 5 pasos:
1. **Negocio** — nombre, tipo, descripción, ubicación, horarios
2. **Contacto** — responsable, teléfono, email, redes
3. **Marca** — colores, estilo visual, logo
4. **Servicios** — productos, turnos, pagos, admin
5. **Proyecto** — presupuesto, deadline, requisitos especiales

Al finalizar, el cliente descarga un archivo `crv-onboarding-{nombre}.json`.

---

### Paso 2 — Recibís el JSON

El cliente te manda el archivo por WhatsApp, email o lo llenás vos con él durante una llamada.

El JSON tiene esta estructura:
```json
{
  "meta": { "generado": "...", "version": "1.0" },
  "negocio": { "nombre": "...", "tipo": "...", "horarios": {...} },
  "contacto": { "responsable": "...", "email": "...", "redes": {...} },
  "marca": { "color_primario": "#...", "estilo": "..." },
  "servicios": { "productos": [...], "necesita_turnos": "..." },
  "proyecto": { "presupuesto": "...", "deadline": "..." }
}
```

---

### Paso 3 — Ejecutás el script de procesamiento

```bash
node scripts/process-client-data.js ruta/al/crv-onboarding-cliente.json
```

Esto genera automáticamente en `{nombre-cliente}-crv/`:

| Archivo | Contenido |
|---|---|
| `prompt.md` | Prompt completo listo para Claude Code |
| `client-brief.md` | Resumen ejecutivo del proyecto |
| `datos-originales.json` | Copia del JSON original |

---

### Paso 4 — Revisás el prompt.md

Antes de pasarlo a Claude, revisá rápido:
- ¿Los datos del cliente están completos?
- ¿El scope tiene sentido con el presupuesto?
- ¿Hay algún requisito inusual que necesite aclaración?

Si algo está mal, corregilo directamente en `prompt.md` o volvé a hablar con el cliente.

---

### Paso 5 — Iniciás el proyecto con Claude Code

**Opción A — Workflow maestro (automatizado):**
```bash
node scripts/init-project.js \
  --cliente=nombre-cliente \
  --nombre="Nombre del Negocio" \
  --brief-file=nombre-cliente-crv/client-brief.md
```
Esto arranca el pipeline de 7 agentes y genera el código completo.

**Opción B — Claude Code directo (manual):**
```bash
# En Claude Code, pegás el contenido de prompt.md
cat nombre-cliente-crv/prompt.md
# → copiás y pegás en Claude Code
```

---

### Paso 6 — Claude genera la web

Dependiendo del tipo de proyecto:

| Tipo | Tiempo estimado | Costo IA |
|---|---|---|
| Landing simple | 10-20 min | ~$0.05 |
| Con panel admin | 30-60 min | ~$0.20 |
| Con agente IA | 60-90 min | ~$0.50 |

Claude genera:
- `index.html` completo con el estilo del cliente
- `src/workers/api.js` si hay backend
- `wrangler.toml` configurado
- `README.md` con instrucciones

---

### Paso 7 — Vos ajustás como gerente

Claude hace el 80% del trabajo. El 20% restante es tuyo:

**Revisión técnica:**
- [ ] El HTML renderiza bien en mobile y desktop
- [ ] Los colores son los del cliente
- [ ] Los datos (horarios, productos, contacto) son correctos
- [ ] Los links a redes sociales funcionan

**Ajustes de contenido:**
- [ ] Los textos suenan bien (Claude puede ser muy formal)
- [ ] Las imágenes están en su lugar (o hay placeholders claros)
- [ ] El formulario de contacto funciona

**Pre-deploy:**
```bash
npm test          # Tests pasan
npm run lint      # Sin errores
# Lighthouse >90 en Performance, Accessibility, SEO
```

---

### Paso 8 — Deploy en Cloudflare

```bash
# Crear proyecto en Cloudflare Pages (primera vez)
wrangler pages deploy . --project-name=nombre-cliente

# Configurar dominio del cliente (si tiene)
# → Cloudflare Dashboard → Pages → Custom Domains
```

El cliente recibe:
- URL de Cloudflare Pages (inmediata)
- Dominio personalizado (si corresponde, tarda 24-48hs DNS)

---

## Resumen de tiempos

| Actividad | Tiempo |
|---|---|
| Cliente llena el form | 10-15 min |
| Vos procesás el JSON | 2 min |
| Revisás el prompt | 5 min |
| Claude genera el código | 15-60 min |
| Vos ajustás y revisás | 30-60 min |
| Deploy | 5 min |
| **TOTAL** | **1-2 horas** |

---

## Archivos involucrados

```
src/client-onboarding.html       ← Form para el cliente
scripts/process-client-data.js   ← Procesa JSON y genera prompt
docs/client-onboarding-flow.md   ← Este archivo
```
