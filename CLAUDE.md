# CLAUDE.md

Projekt-Notizen für Claude Code. Kurz halten, stur befolgen.

## Harte Regeln

- **Build muss immer perfekt sein.** Kein Commit/Push, solange `npm run build` eine Warning, eine Deprecation oder einen Fehler zeigt. Lockfile-Patches, die Next.js beim Build vornimmt, gehören ins Repo (committen).
- **Typecheck muss grün sein.** `npm run typecheck` läuft auch im pre-commit Hook (lefthook) — nicht umgehen.
- Vor dem Push immer `npm run build` laufen lassen, nicht nur Typecheck.
- Keine `--no-verify` Commits, keine Hook-Skips.

## Commands

```bash
npm run dev          # Lokaler Dev-Server
npm run build        # Produktions-Build (MUSS warning-free sein)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint (aktuell defekt wegen Flat-Config, nicht blockierend)
npm run preview      # Cloudflare Workers Preview (opennextjs-cloudflare + wrangler)
```

## Stack-Kurzfassung

- Next.js 15 (App Router, `'use client'` häufig) auf Cloudflare Pages/Workers via `@opennextjs/cloudflare`
- D1 (SQLite) als DB — Zugriff über `getCloudflareContext().env.DB`
- Cloudflare Images für Uploads (über `/api/admin/media`)
- Tailwind + framer-motion + lucide-react

## Admin-Auth

- Eigener Login mit Admin-Passwort → Session-Cookie `szh_admin_session` (`src/lib/server/adminAuth.ts`)
  - Passwort als PBKDF2-Hash in `settings.admin_code_hash` — setzen im Admin Center (Tab System) oder mit `npm run set-admin-password` (wirkt sofort)
  - Notfall-Passwort als Cloudflare Pages Secret `ADMIN_PASSWORD` — greift erst ab dem nächsten Deployment
  - Sessions serverseitig in `admin_auth_sessions`, gespeichert nur der SHA-256-Hash des Tokens
- **WICHTIG:** `src/middleware.ts` schützt jede Route unter `/api/admin`. Öffentlich nur `/api/admin/auth` und `/api/admin/media/file/…` (Website-Bilder). Endpunkte für Dritte (Beds24-Webhook, Buchungsschluss) gehören NICHT unter `/api/admin`.

## Beds24

- Admin-Tab „Beds24“: `src/components/admin/Beds24Panel.tsx` + `Beds24Cockpit.tsx`, API `src/app/api/admin/beds24/route.ts`, Server-Lib `src/lib/server/beds24*.ts`
- Beds24-Konto wird mit der Natberger Hütte geteilt → alles auf `settings.beds24_property_id` beschränkt (serverseitig erzwungen)
- Webhook: `src/app/api/beds24-webhook/route.ts`, Buchungsschluss: `src/app/api/booking-cutoff/route.ts` + `.github/workflows/buchungsschluss.yml`

## Wichtige Pfade

- **Blog-Editor (Admin):** `src/components/admin/BlogEditor.tsx` + `src/components/admin/blog-editor/*`
- **Öffentliche Blog-Seite:** `src/app/blog/[slug]/page.tsx`
- **Blog-API:** `src/app/api/blog/route.ts` (GET/POST/PUT/DELETE)
- **Media-API:** `src/app/api/admin/media/route.ts` (Upload) + `src/app/api/media/route.ts` (lesen)
- **DB-Schema:** `db/schema.sql`, Migrations: `migrations/`

## Blog-Layouts

- `standard` — Rich-Text + optionale Galerie-Bilder (`blog_post_images`)
- `carousel` — Slides mit Bild/Titel/Beschreibung (`blog_post_images`)
- `tabs` — Content ist JSON in `blog_posts.content`: `{ intro, tabs: [{ title, type, sectionTitle, slides: [...] }] }`
  - Tab-Typen: `undefined` (Standard), `dog-carousel`, `kids-accordion`
  - `dog-carousel` Slides haben `image_url` direkt auf dem Slide (bevorzugt) — Fallback über `DOG_TRIP_CATEGORIES` aus der globalen `media`-Tabelle (Legacy).

## Git / Branching

- Feature-Branches: `claude/<topic>-<random>`
- Nie direkt auf `main` pushen.
- PRs nur auf explizite Anfrage erstellen.
