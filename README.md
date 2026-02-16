# Presentielijst Generator

Een privacyvriendelijke webapplicatie om presentielijsten (Excel/ZIP) te genereren op basis van CSV-exports van ledenadministratiesystemen zoals AllUnited. Alle verwerking gebeurt volledig in de browser — er worden geen persoonsgegevens verstuurd of opgeslagen op een server.

## Functionaliteiten

- CSV-import via bestandsupload of plakken vanuit Excel, met automatische kolomdetectie
- Automatische groepering van leden en leiding per les
- Per les of voor alle lessen tegelijk een Excel-bestand of ZIP-bundel downloaden
- Proeflessenbeheer per cursuscode
- Instelbare maand, jaar en aantal handtekeningkolommen (opgeslagen in de browser)
- Demo-modus om de werking te bekijken zonder eigen data
- Printvriendelijke weergave

## Tech stack

| Onderdeel | Technologie |
|-----------|-------------|
| Framework | React 19 + TypeScript |
| Bundler | Vite 7 |
| Styling | Tailwind CSS 4 |
| CSV-parsing | PapaParse |
| Excel-export | xlsx-populate |
| ZIP-export | JSZip + file-saver |
| Tests | Vitest |
| Container | Docker (multi-stage, Nginx) |

## Aan de slag

### Vereisten

- Node.js 20 of hoger
- npm 10 of hoger

### Installeren

```bash
git clone https://github.com/jouw-gebruikersnaam/presentielijst-generator.git
cd presentielijst-generator
npm ci
```

### Development server starten

```bash
npm run dev
```

De app draait op `http://localhost:5173`.

### Overige scripts

```bash
npm run build      # productiebuild naar dist/
npm run preview    # lokaal de productiebuild bekijken
npm run test       # tests uitvoeren met Vitest
npm run lint       # linting
```

## Build & deployment

### Statische build

```bash
npm run build
```

De output in `dist/` bestaat uit statische bestanden die je kunt hosten op elke webserver of CDN (Cloudflare Pages, Netlify, etc.).

### Docker

De meegeleverde `Dockerfile` maakt een multi-stage build: Node Alpine bouwt de Vite-app, Nginx Alpine serveert de statische bestanden.

```bash
docker build -t presentielijst-generator .
docker run -d -p 8080:80 presentielijst-generator
```

De app is daarna bereikbaar op `http://localhost:8080`.

## Licentie

MIT — zie [LICENSE](LICENSE).
