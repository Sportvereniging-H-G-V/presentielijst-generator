# Changelog

Alle noemenswaardige wijzigingen in dit project.

Het formaat is gebaseerd op [Keep a Changelog](https://keepachangelog.com/nl/1.0.0/),
en dit project volgt [Semantic Versioning](https://semver.org/lang/nl/).

## [1.2.2] - 2025-12-14

### Verwijderd
- GlitchTip/Sentry integratie volledig verwijderd.

### Gewijzigd
- Release job: automatisch committen en pushen van versie-updates naar main (footer versienummer wordt nu automatisch bijgewerkt).
- Update Node.js to v24.12.0

## [1.2.0] - 2025-12-08

### Gewijzigd
- TypeScript configuratie: `moduleResolution` aangepast naar `bundler` voor betere compatibiliteit met Vite en moderne tooling.
- Vite configuratie: gebruikt nu `vitest/config` voor correcte Vitest integratie.
- PostCSS configuratie: bijgewerkt voor Tailwind CSS 4 met `@tailwindcss/postcss` plugin.
- Tailwind configuratie: kleuren expliciet geïmporteerd voor compatibiliteit met Tailwind CSS 4.
- CSS imports: bijgewerkt naar nieuwe Tailwind CSS 4 import syntax.

## [1.1.0] - 2025-10-30
### Toegevoegd
- `.gitlab/auto-deploy-values.yaml` voor Auto DevOps (Traefik ingress, TLS via cert-manager, servicepoort 80).
- HTTPS‑redirect in `nginx.conf` op basis van `X-Forwarded-Proto` (review/preview).
- Striktere security headers: CSP, HSTS, Permissions‑Policy.

### Gewijzigd
- Nginx image gepind naar `nginx:1.27-alpine` (Dockerfile).
- Veilige ID‑generatie met Web Crypto in `TrialsManager.tsx` (vervanging `Math.random`).
- Lint fixes (o.a. trailing comma in `postcss.config.js` en `tailwind.config.js`).

### Verwijderd
- Staging Kubernetes manifests en agent‑config verwijzing (omgeving uitgefaseerd).

## [1.0.0] - 2025-09-xx
### Eerste release
- Initiele app met CSV‑import, datanormalisatie, proeflessers en Excel‑export.

