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
