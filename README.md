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

`service_role`-nyckeln hör bara hemma i serverjobb. `.env` innehåller medvetet bara
publika värden (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_JWKS_URL`).
Kör [supabase/schema.sql](supabase/schema.sql) i Supabase → SQL Editor för att skapa
tabellerna (`projects`, `chats`, `messages`, `skills`, `mcp_servers`, `model_usage`) med RLS.

### Konto vid första start

Första gången appen öppnas visas en konto-grind: **Continue with Google**, **Continue with
Apple** eller e-post med för- och efternamn. Förnamnets första bokstav blir avataren längst
ner i railen och namnet sparas på kontot (`full_name`).

### Slå på Google och Apple

Projektets värden (används i båda konsolerna):

| Värde | URL |
| --- | --- |
| Supabase-projekt | `https://hplgqjcysvwpwdyraihy.supabase.co` |
| Redirect URI hos leverantören | `https://hplgqjcysvwpwdyraihy.supabase.co/auth/v1/callback` |
| Appens URL (dev) | `http://localhost:4317` |

**Google**

1. Google Cloud Console → APIs & Services → *OAuth consent screen* (External, namn + e-post).
2. *Credentials* → *Create credentials* → *OAuth client ID* → **Web application**.
   - Authorized JavaScript origins: `http://localhost:4317`
   - Authorized redirect URIs: `https://hplgqjcysvwpwdyraihy.supabase.co/auth/v1/callback`
3. Kopiera **Client ID** och **Client secret**.
4. Supabase → Authentication → **Providers → Google** → Enable, klistra in ID + secret, Save.

**Apple** (kräver Apple Developer Program)

1. Apple Developer → *Identifiers* → **Services IDs** → ny, t.ex. `com.modexa.web`.
2. Kryssa *Sign in with Apple* → Configure: Domain `hplgqjcysvwpwdyraihy.supabase.co`,
   Return URL `https://hplgqjcysvwpwdyraihy.supabase.co/auth/v1/callback`.
3. *Keys* → ny nyckel med *Sign in with Apple* → ladda ner `.p8` (bara en gång), notera
   **Key ID** och **Team ID**.
4. Supabase → **Providers → Apple** → Service ID, Team ID, Key ID och den privata `.p8`-nyckeln.

**Till sist:** Supabase → Authentication → **URL Configuration** → Site URL `http://localhost:4317`
och samma adress under *Redirect URLs*. Utan det avvisas inloggningen även om providern är på.

I desktop-skalet är Google/Apple avstängda tills en deep-link-callback finns; e-post fungerar
överallt. Efter inloggning hämtas all data från databasen och nya chattar, projekt,
meddelanden, skills, MCP-servrar och daglig användningstid skrivs dit.

## Modeller

Katalogen ligger i [models.js](models.js) och driver model pickern.

| Modell | Leverantör | Endpoint | Förbrukning |
| --- | --- | --- | --- |
| DeepSeek V4.1 Flash | NVIDIA | `https://integrate.api.nvidia.com/v1` | **3x** |
| Nemotron 3.5 Super VL 120B | NVIDIA | `https://integrate.api.nvidia.com/v1` | **5x** |
| Nemotron 3.5 Lightning 30B | NVIDIA | `https://integrate.api.nvidia.com/v1` | **2x** |
| GPT-6.1 Terra Pro | OpenRouter | `https://openrouter.ai/api/v1` | **10x** |
| Gemma 4 26B | OpenRouter | `https://openrouter.ai/api/v1` | **1x** |

Multiplarna räknas mot de 21 timmarna per dag: en minut med en 10x-modell drar tio minuter
av dagens tid. Modeller med `cost: 0` visas som *Free*.

Nycklarna ligger i [.env](.env) **utan** `VITE_`-prefix, så Vite bundlar dem inte in i appen
(`models.js` refererar dem bara via `keyEnv`). En nyckel som ändå bäddas in i en klientapp kan
alltid läsas ut – när chatten kopplas på ska anropen gå via en liten proxy (t.ex. en Cloudflare
Worker) som håller nyckeln server-side. Rotera nycklarna, de har skickats i klartext.

### Proxy för modellanrop

Provider-nycklarna används bara av Workern [proxy/worker.js](proxy/worker.js) – appen skickar
`{ modelId, messages, stream: true }` och får tillbaka svaret som en SSE-ström
(`data: {"delta": "…"}` … `data: {"done": true}`). [chat.js](chat.js) läser strömmen och
[app.js](app.js) skriver ut texten medan den kommer, med en blinkande markör tills svaret är klart.
Strömmen har 90 s idle-timeout på klientsidan och Workern ger upp om leverantören inte svarar
med headers inom 30 s. `stream: false` i bodyn ger fortfarande ett helt svar som JSON.

- Worker: `https://modexa-proxy.hoby123456-123.workers.dev` (config i
  [proxy/wrangler.jsonc](proxy/wrangler.jsonc), deploy med `npx wrangler deploy --config proxy/wrangler.jsonc`).
- Hemligheter i Workern: `NVIDIA_API_KEY_DEEPSEEK`, `NVIDIA_API_KEY_NEMOTRON_SUPER`,
  `NVIDIA_API_KEY_NEMOTRON_LIGHTNING`, `OPENROUTER_API_KEY_TERRA`, `OPENROUTER_API_KEY_GEMMA`,
  `PROXY_TOKEN`. Sätt dem med `npx wrangler secret bulk <fil>`; de ligger aldrig i git.
- Appen använder `VITE_PROXY_URL` och `VITE_PROXY_TOKEN` från `.env`. Proxy-token kan läsas ut ur
  appbygget, så den begränsar bara slöseri – provider-nycklarna är det som skyddas.
- Workern accepterar bara kända `modelId` och de webbläsarursprung som listas i `ALLOWED_ORIGINS`
  (`localhost:4317`, `http://tauri.localhost`, `https://modexa-site…workers.dev`).

## Säkerhet

- **CSP** i [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json): bara egna skript, Supabase
  och GitHub-API:t får anropas; `object-src`, `frame-src` och `base-uri` är stängda.
- **PKCE** på auth-klienten, så OAuth-koden inte kan avlyssnas.
- **Lösenordskrav:** minst 8 tecken med både bokstäver och siffror, kontrolleras före anrop.
- **RLS** på alla tabeller (se `supabase/schema.sql`); varje rad ägs av `auth.uid()`.
- Meddelanden och namn skrivs med `textContent`, aldrig som HTML.
- Inga hemliga nycklar i appen – bara den publika nyckeln.

## Automatiska uppdateringar

Appen använder `tauri-plugin-updater` med GitHub Releases som källa:

- Endpoint: `https://github.com/appbuildersweden/modexa/releases/latest/download/latest.json`
- Signeringsnyckel: `.tauri/modexa.key` (privat, gitignorerad) + `.tauri/modexa.key.pub`
  (publik, ligger i `src-tauri/tauri.conf.json`).
- Uppdateringen kontrolleras när appen startar och under **Inställningar → Updates**,
  där du också kan installera och starta om.

### Släpp en ny version

1. Höj versionen i `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`,
   `src-tauri/Cargo.toml` och `src-tauri/Cargo.lock` (samma nummer på alla fem).
2. Committa och tagga: `git tag v0.2.0 && git push origin main v0.2.0`.
3. GitHub Actions ([release.yml](.github/workflows/release.yml)) bygger Windows, macOS och
   Linux, signerar uppdateringarna och publicerar releasen med `latest.json`.

Hemligheter som måste finnas i GitHub → Settings → Secrets and variables → Actions:

| Secret | Värde |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | innehållet i `.tauri/modexa.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | lösenordet för nyckeln (tomt om ingen) |
| `VITE_SUPABASE_URL` | Supabase-projektets URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | publik nyckel |
| `VITE_PROXY_URL` | `https://modexa-proxy.hoby123456-123.workers.dev` |
| `VITE_PROXY_TOKEN` | `PROXY_TOKEN`-värdet från Workern (samma som i `.env`) |

Tappa aldrig bort den privata nyckeln – utan den kan inga uppdateringar signeras.

## Nedladdningssida

[site/](site/) är den publika sidan (logga, funktioner, om appen, FAQ, nedladdning) och
[deploy/](deploy/) är Worker-manifestet som publicerar den. Sidan hämtar `releases/latest`
från GitHub när den laddas, så version, datum, filnamn och nedladdningslänkar uppdateras av
sig själva vid varje release.

Sidan ligger live på två adresser – helt utan koppling till skolzonerna
(`eldaskola.cc.cd` / `elda.cc.cd`):

- https://modexa-site.hoby123456-123.workers.dev (Worker `modexa-site`, eget Cloudflare-konto)
- https://site-a094e49dad55457a9a5df45991e3101d.freebuff.page (Freebuff Sites, production)

`modexa.cc.cd` är registrerad men **inte delegerad** – posterna ligger som CNAME i stället för
NS. Lägg till zonen i Cloudflare och peka registrarens namnservrar dit, så kopplas den in.

Publicera om den på ditt eget konto med `npx wrangler deploy` (config i
[wrangler.jsonc](wrangler.jsonc)). Ta bort Workern igen med `npx wrangler delete modexa-site`.
