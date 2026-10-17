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
- **WICHTIG:** `src/middleware.ts` schützt jede Route unter `/api/admin`. Öffentlich nur `/api/admin/auth` und `/api/admin/media/file/…` (Website-Bilder). Endpunkte für Dritte (Beds24-Webhook, Buchungsschluss, Partner-Verbindung `/api/partner`) gehören NICHT unter `/api/admin`.

## Beds24

- Admin-Tab „Beds24“: `src/components/admin/Beds24Panel.tsx` + `Beds24Cockpit.tsx`, API `src/app/api/admin/beds24/route.ts`, Server-Lib `src/lib/server/beds24*.ts`
- Beds24-Konto wird mit der Natberger Hütte geteilt → alles auf `settings.beds24_property_id` beschränkt (serverseitig erzwungen)
- Webhook: `src/app/api/beds24-webhook/route.ts`, Buchungsschluss: `src/app/api/booking-cutoff/route.ts` + `.github/workflows/buchungsschluss.yml`

## Verbindung zur Natberger Hütte und Preisübersicht

- Beide Admin Center sind gekoppelt („Partner“): `src/lib/server/partner.ts`, Gegenstück `lib/server/partner.ts` im Repo `natbergerhuette` — **gleiches Protokoll, Änderungen immer in beiden Repos**
  - Kopplung per Code im Tab „Preisübersicht“; Adresse und gemeinsamer Schlüssel in `settings` (`partner_url`, `partner_secret`, `partner_name`, `partner_hut`)
  - `/api/partner`: Aufrufe von Server zu Server, HMAC-signiert (Zeitstempel, Einmalwert in `partner_nonces`, Body) — keine Admin-Session
  - Umschalter im Kopf (`src/components/admin/PartnerSwitch.tsx`): einmaliges Ticket, direkte Anmeldung nur mit `settings.partner_sso_allowed = 1`
- Tab „Preisübersicht“: `src/components/admin/PriceOverview.tsx` + `price-overview/*`, API `src/app/api/admin/price-overview/route.ts`
- Rechenlogik `src/lib/pricing/dynamicPricing.ts` liegt **identisch** im Repo `natbergerhuette`; Nachfrage je Nacht aus `src/lib/demand/*` (Kopie aus `natbergerhuette/lib/demand`, angepasst an `noUncheckedIndexedAccess`)
- Saisonpreise eines Jahres mit einem Klick: `src/lib/pricing/seasonPlan.ts` (identisch in beiden Repos, derzeit nur Natberger Hütte 2027), Vorschau und Übernahme in `price-overview/SeasonPlanPanel.tsx`
- Server `src/lib/server/priceOverview.ts`: nur Zimmer der gewählten Unterkunft (`settings.beds24_property_id`), schreibt nur `price1`/`minStay`, vorher Sicherung (`beds24Snapshots.ts`); Regeln in `settings.price_rules`
- Schreibt die Preisübersicht Preise, weichen sie danach ggf. von den Saisonpreisen im Tab „Mietpreise“ ab (Beds24SeasonSync zeigt das an)

## Corporate Design (öffentliche Website)

- Grundlage: Corporate Design „Zirbenzweig und Fassadenbraun“ V3 + Claude-Code-Briefing (15.10.2026)
- Tokens/Bausteine: `src/styles/brand.css`, Tailwind-Farben `zirbe`, `leinen`, `fassadenbraun`, `fensterladenrot`, `on-red`, `rinde`, `moos`, `holz`
- Komponenten: `src/components/brand/*` (BrandLogo, BookingCTA, FacadeBand = M1, HutChapters = M2, ZirbenMark/HostGreeting = M3, MotionToggle), Bewegungspräferenz `src/contexts/MotionContext.tsx`
- Regeln: Schrift nie rot; Rot nur als Hintergrund des Buchen-Buttons; Braun nur im Fassadenband; keine Herzen; Northwell nur kurz, Grün/Leinen, nie über Video/Fotos; Hero-Video bleibt
- Platzhalter bis zum Designpaket: Gill Sans Nova (lokale Gill Sans/Systemschrift), Northwell (Autography), Fugenband-Geometrie, Logo/Zweig aus `public/images/logo.svg` abgeleitet

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
