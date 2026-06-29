# scripts/

Scripts de automatización y helpers de CRV OS.

## Contenido planificado

| Script              | Descripción                                      |
|---------------------|--------------------------------------------------|
| `deploy.sh`         | Deploy a Cloudflare Pages con health check       |
| `setup-d1.sql`      | Schema inicial de D1 (tablas, índices)           |
| `seed-d1.sql`       | Datos de prueba para desarrollo local            |
| `migrate.js`        | Migraciones de D1                                |
| `check-lighthouse.js` | Corre Lighthouse y valida que >90 en all métricas |

## Uso

```bash
# Deploy manual
bash scripts/deploy.sh

# Inicializar base de datos local
wrangler d1 execute crv-db --local --file=scripts/setup-d1.sql
```
