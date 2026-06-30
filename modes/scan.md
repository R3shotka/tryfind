# Modo: scan — Portal Scanner

Escanea portales de empleo en busca de ofertas que coincidan con el perfil. Niveles de découverte del 0 al 3 para minimizar tokens.

## Estrategia de découverte (4 niveles)

### Level 0 — Local Parser (zero-token)
- Ejecuta scripts configurados para empresas con páginas HTML/SSR estables
- Si `local_parser_ok` → no repetir en Level 1 ni Level 2
- Registrar en `local_parser_ok` set si el parser termina con éxito

### Level 1 — Playwright (primario)
- Navegación directa a `careers_url` de cada empresa en `portals.yml`
- Leer DOM, extraer títulos + URLs de ofertas
- Aplicar `title_filter` y `location_filter` de `portals.yml`

### Level 2 — ATS APIs (complementario)
- APIs estructuradas de ATS públicas:
  - **Greenhouse:** `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs`
  - **Ashby:** `https://jobs.ashbyhq.com/api/non-user-facing/posting-board/job-postings?organizationHostedJobsPageName={slug}`
  - **Lever:** `https://api.lever.co/v0/postings/{slug}?mode=json`
  - **BambooHR:** `https://{company}.bamboohr.com/careers/list`
  - **Teamtailor:** `https://api.teamtailor.com/v1/jobs` (requiere key)
  - **Workday:** `https://{company}.wd{N}.myworkdayjobs.com/wday/cxs/{slug}/External_Career_Site/jobs`

### Level 3 — WebSearch (descubrimiento amplio)
- Queries de WebSearch para encontrar nuevas empresas
- Filtrar resultados de empresas ya cubiertas en Level 0/1/2
- **Verificación obligatoria:** Las ofertas de WebSearch pasan por liveness check con Playwright antes de añadir al pipeline (Google cachea resultados semanas/meses)

## Reglas clave

- **Deduplicación:** Nunca añadir la misma URL dos veces (check en scan-history.tsv, pipeline.md, applications.md)
- **Filtro de título:** Al menos un keyword positivo; rechazar si hay keyword negativo
- **Filtro de ubicación:** `always_allow` anula cualquier bloqueo; `block` excluye; `allow` requiere match
- **SSRF protection:** Nunca fetchear IPs privadas o localhost

## Patrones de API por ATS

```
# Greenhouse
GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
Response: { jobs: [{ id, title, location: { name }, absolute_url }] }

# Ashby
GET https://jobs.ashbyhq.com/api/non-user-facing/posting-board/job-postings?organizationHostedJobsPageName={slug}
Response: { jobPostings: [{ id, title, teamNames, locationName, jobPostingUrl }] }

# Lever
GET https://api.lever.co/v0/postings/{slug}?mode=json
Response: [{ id, text, categories: { location }, hostedUrl }]

# BambooHR
GET https://{company}.bamboohr.com/careers/list
Response: { result: [{ id, jobOpeningName, location, url }] }
```

## Output

- Nuevas ofertas → `data/pipeline.md` (sección ## Pendientes)
- Registro completo → `data/scan-history.tsv`
  - Columnas: `date\tcompany\ttitle\turl\tstatus`
  - Status values: `added`, `skipped_title`, `skipped_dup`, `skipped_location`, `skipped_expired`

## Ejecución

```bash
node scan.mjs                    # escanear todas las empresas habilitadas
node scan.mjs --dry-run          # preview sin escribir
node scan.mjs --company Stripe   # escanear solo Stripe
node scan.mjs --verify           # verificar liveness con Playwright
```
