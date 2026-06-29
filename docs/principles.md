# CRV Studio - Principios Técnicos

Estos principios guían **cada decisión** en CRV Studio.

## 1. Arquitectura & Código

### Modularidad
- Un componente = una responsabilidad
- Si hace 2 cosas → dividir en 2
- Los componentes viven en `componentes/{nombre}/`

### Sin duplicación
- Si copias código → está mal
- Si hay 2 veces algo → es un componente
- Las funciones reutilizables van a `utils/`

### Documentación actualizada
- Si cambias código → actualizas doc
- Cada componente tiene `README.md`
- Cada agente tiene instrucciones
- Cada arquitectura tiene diagrama

## 2. Performance

### Rendimiento primero
- CSS antes de JS
- JS vanilla antes de librerías
- Librerías antes de frameworks
- Comprimir imágenes (WebP preferido)
- Cero requests innecesarios

### Velocidad de deploy
- Push a main = live en <30s
- Sin build steps lentos
- Sin compilación
- Cloudflare auto-invalida caché

### Optimización de tokens
- Haiku para tareas simples
- Sonnet para análisis
- Nunca Opus sin justificación
- Cache API keys en D1/KV

## 3. IA y Agentes

### Los agentes automatizan solo lo mecánico
- ✅ Verificar disponibilidad
- ✅ Generar reporte
- ✅ Responder FAQ
- ✅ Recomendar opciones
- ❌ Decidir por el usuario
- ❌ Cambiar datos sin aprobación
- ❌ Interactuar con dinero sin revisión

### Rate limiting obligatorio
- Máx X llamadas/hora por usuario
- Máx Y tokens/mes por proyecto
- Máx Z llamadas/día al agente
- Monitorear uso en D1

### Contexto claro
- El agente debe saber qué es CRV
- El agente debe saber qué proyecto es
- El agente debe saber qué puede hacer
- El agente debe saber qué NO puede hacer

## 4. Seguridad

### Credenciales
- **NUNCA** en repo
- **NUNCA** en .env
- Variables de entorno en Cloudflare
- Secrets en D1 encriptados
- Rotar cada 90 días

### APIs
- Validar SIEMPRE input del usuario
- Rate limit por IP
- CORS configurado estrictamente
- Logs en D1 (quién, qué, cuándo)

### Datos
- Encriptar datos sensibles
- Backup automático en D1
- No guardar más de lo necesario
- GDPR: borrar datos viejos (>1 año)

## 5. Testing

### Antes de push
```bash
npm test              # Tests unitarios
npm run lint          # Lint
npm run build         # Build (si aplica)
```

### En D1
- Tests de schema
- Validación de migraciones
- Rollback plan documentado

### En Production
- Monitoreo en tiempo real
- Alertas si error rate >1%
- Rollback automático si QUERY ERROR

## 6. Deploy

### Proceso
1. Commit a main
2. GitHub Actions valida
3. Deploy automático a Cloudflare
4. Health check (no errores HTTP 5xx)
5. Si error → rollback automático

### Versioning
- Git tags para releases: `v1.0.0`
- Changelog en `CHANGELOG.md`
- Documentar breaking changes

### Monitoreo
- CloudFlare Analytics
- D1 Query monitoring
- Error logs guardados 90 días
- Alertas en Discord webhook

## 7. Calidad

### Código
- Comentarios en español
- Nombres de variables descriptivos
- Funciones <50 líneas
- Máximo nesting: 3 niveles

### Componentes
- Reutilizable (testeable en 2+ proyectos)
- Sin dependencias externas si es posible
- Accesible (ARIA, keyboard nav)
- Responsive (mobile first)

### Performance Lighthouse
- Performance: >90
- Accessibility: >95
- Best Practices: >90
- SEO: >90

## 8. Documentación

### Estructura
```
proyecto/
├── README.md              ← Cómo empezar
├── ARCHITECTURE.md        ← Estructura técnica
├── API.md                 ← Endpoints documentados
├── AGENTES.md             ← Agentes disponibles
└── docs/
    ├── setup.md
    ├── deployment.md
    └── troubleshooting.md
```

### Contenido
- Ejemplos funcionales
- Screenshots si necesario
- Comandos copy-paste listos
- Troubleshooting incluido

## 9. Comunicación

### Con clientes
- Repositorio privado (si necesario)
- Documentación en inglés/español
- Demo video antes de deploy
- SLA: respuesta en <24h

### Entre equipo
- Decisiones arquitectónicas en Issues
- PRs con descripción clara
- Reviews antes de merge
- Postmortems si hay bugs

## 10. Evolución

### Cada proyecto suma a CRV
- Nuevo componente → `componentes/`
- Nuevo agente → `agentes/`
- Nuevo patrón → documentado
- Nueva herramienta → actualizar CLAUDE.md

### Backlog de mejoras
- Mantener `TODO.md` en root
- Priorizar por impacto
- Documentar por qué se hace

### Feedback loop
- Recolectar datos (analytics, feedback)
- Analizar qué funcionó
- Iterar basado en datos
- Documentar aprendizaje

---

**Los principios guían. El código los implementa.**
