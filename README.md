# Modexa

Modexa är en skrivbordsapp (Tauri 2 + Vite) för en AI-agent-arbetsyta: chattar, projekt,
skills, MCP-servrar, modellval med daglig användningstid och teman.

## Kom igång

```bash
npm install
npm run dev        # bara UI:t i webbläsaren på http://127.0.0.1:4317
npm run app:dev    # hela Tauri-appen
npm run app:build  # installationsfil + uppdateringspaket
```

## Supabase

Appen pratar med Supabase via `@supabase/supabase-js` ([cloud.js](cloud.js)). Endast
publika nycklar bäddas in i appen:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Den hemliga nyckeln (`SUPABASE_SECRET_KEY`) hör bara hemma i serverjobb och ska aldrig
in i appbygget. Kör [supabase/schema.sql](supabase/schema.sql) i Supabase → SQL Editor
för att skapa tabellerna (`projects`, `chats`, `messages`, `skills`, `mcp_servers`,
`model_usage`) med RLS.

Logga in i appen under **Inställningar → Account → Cloud account**. Efter inloggning
hämtas all data från databasen och nya chattar, projekt, meddelanden, skills, MCP-servrar
och daglig användningstid skrivs dit.

## Automatiska uppdateringar

Appen använder `tauri-plugin-updater` med GitHub Releases som källa:

- Endpoint: `https://github.com/appbuildersweden/modexa/releases/latest/download/latest.json`
- Signeringsnyckel: `.tauri/modexa.key` (privat, gitignorerad) + `.tauri/modexa.key.pub`
  (publik, ligger i `src-tauri/tauri.conf.json`).
- Uppdateringen kontrolleras när appen startar och under **Inställningar → Updates**,
  där du också kan installera och starta om.

### Släpp en ny version

1. Höj versionen i `package.json` och `src-tauri/tauri.conf.json`.
2. Committa och tagga: `git tag v0.1.1 && git push origin v0.1.1`.
3. GitHub Actions ([release.yml](.github/workflows/release.yml)) bygger Windows, macOS och
   Linux, signerar uppdateringarna och publicerar releasen med `latest.json`.

Hemligheter som måste finnas i GitHub → Settings → Secrets and variables → Actions:

| Secret | Värde |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | innehållet i `.tauri/modexa.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | lösenordet för nyckeln (tomt om ingen) |
| `VITE_SUPABASE_URL` | Supabase-projektets URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | publik nyckel |

Tappa aldrig bort den privata nyckeln – utan den kan inga uppdateringar signeras.

## Nedladdningssida

[site/](site/) är den publika sidan (logga, funktioner, nedladdning) och [deploy/](deploy/)
är Worker-manifestet som publicerar den. Sidan hämtar `releases/latest` från GitHub när den
laddas, så version, datum och nedladdningslänkar uppdateras av sig själva vid varje release.
