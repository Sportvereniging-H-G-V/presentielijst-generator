# Benodigde CI/CD Variabelen

## GitHub Actions

De GitHub Actions deploy-workflow vereist de volgende instellingen in **GitHub → Settings → Secrets and variables → Actions**.

### Secrets (verplicht)

| Naam | Omschrijving |
|------|--------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API-token met *Cloudflare Pages: Edit*-recht. Aanmaken via [Cloudflare Dashboard → Mijn profiel → API-tokens](https://dash.cloudflare.com/profile/api-tokens). |
| `CLOUDFLARE_ACCOUNT_ID` | Je Cloudflare account-ID. Te vinden rechtsonder in het Cloudflare Dashboard. |

### Variables (verplicht)

| Naam | Omschrijving |
|------|--------------|
| `CF_PAGES_PROJECT` | Naam van het Cloudflare Pages-project (bijv. `presentielijst-generator`). |

### Variables (optioneel)

| Naam | Omschrijving |
|------|--------------|
| `CF_PAGES_PRODUCTION_DOMAIN` | Eigen productiedomein (bijv. `presentie.hgvhengelo.nl`). Als dit niet is ingesteld, wordt `<project>.pages.dev` gebruikt. |

> **Let op:** Zijn `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` of `CF_PAGES_PROJECT` niet ingesteld, dan slaat de preview-deployment de Cloudflare-stap over (met een waarschuwing) en mislukt de productie-deployment met een duidelijke foutmelding.

---

## GitLab CI/CD Variabelen

Deze pipeline vereist de volgende variabelen in GitLab CI/CD Settings.

## Verplichte Variabelen

### 1. Kubernetes Agent Configuratie

**Variabele:** `CI_KUBERNETES_AGENT`  
**Type:** Variable  
**Scope:** Project  
**Environments:** All environments  
**Waarde:** `presentie-generator-hgv`  
**Beschrijving:** De naam van de GitLab Kubernetes Agent zoals geconfigureerd in `.gitlab/agents/presentie-generator-hgv/config.yaml`

---

### 2. Docker Registry Authenticatie

**Variabele:** `CI_REGISTRY_USER`  
**Type:** Variable  
**Scope:** Project  
**Environments:** All environments  
**Waarde:** Je GitLab username of deploy token username  
**Beschrijving:** Username voor authenticatie met GitLab Container Registry

**Variabele:** `CI_REGISTRY_PASSWORD`  
**Type:** Variable (Masked & Protected)  
**Scope:** Project  
**Environments:** All environments  
**Waarde:** Je GitLab personal access token of deploy token met `read_registry` en `write_registry` rechten  
**Beschrijving:** Password/token voor authenticatie met GitLab Container Registry

---

## Optionele Variabelen (meestal automatisch)

De volgende variabelen worden meestal automatisch ingesteld door GitLab, maar kunnen indien nodig worden overschreven:

- `CI_REGISTRY` - GitLab Container Registry URL (automatisch: `registry.gitlab.com`)
- `CI_REGISTRY_IMAGE` - Volledige image naam (automatisch: `registry.gitlab.com/hgv-hengelo/presentielijst-generator`)
- `KUBERNETES_NAMESPACE` - Kubernetes namespace (standaard: `presentielijst-generator`, maar kan in pipeline variabelen worden overschreven)

---

## Optionele Variabelen voor Security Scanning

De volgende variabelen kunnen worden ingesteld om security scanning jobs te configureren:

### DAST (Dynamic Application Security Testing)

**Variabele:** `DAST_WEBSITE`  
**Type:** Variable  
**Scope:** Project of Environment (production)  
**Environments:** Production (optioneel)  
**Waarde:** `https://presentie.hgvhengelo.nl` (alleen voor productie)  
**Beschrijving:** Voor productie deployments. Voor review environments wordt automatisch de review URL gebruikt.  
**Opmerking:** Dit is alleen nodig als je DAST wilt uitvoeren op productie. Voor merge requests wordt automatisch de review environment URL gebruikt.

### Code Quality (optioneel)

**Variabele:** `CODE_QUALITY_IMAGE`  
**Type:** Variable (optioneel)  
**Scope:** Project  
**Beschrijving:** Custom code quality image indien je een andere versie wilt gebruiken dan de standaard.

### Performance Testing (optioneel)

**Variabele:** `PERFORMANCE_TARGET`  
**Type:** Variable (optioneel)  
**Scope:** Project  
**Beschrijving:** Target URL voor performance testing. Standaard wordt de review/production URL gebruikt.

---

## Waar variabelen instellen?

1. Ga naar je GitLab project
2. Navigeer naar **Settings** → **CI/CD** → **Variables**
3. Klik op **Add variable**
4. Voer de naam, waarde en scope in zoals hierboven beschreven

---

## Scopes en Environments

- **Project scope:** Variabele is beschikbaar voor alle pipelines in dit project
- **Protected:** Alleen beschikbaar voor protected branches/tags (aanbevolen voor productie credentials)
- **Masked:** Waarde wordt verborgen in job logs (aanbevolen voor wachtwoorden/tokens)

---

## Testen van variabelen

Na het instellen van de variabelen, test de pipeline door een merge request te openen of te pushen naar de `main` branch.

