// Build für Cloudflare Pages (`npm run pages:build`, auch im Git-Build von
// Cloudflare bei jedem Push auf main).
//
// Der Worker wird hier mit dem wrangler aus package.json fertig gebündelt;
// wrangler.toml sagt Pages mit `no_bundle = true`, dass es _worker.js
// unverändert hochladen soll. Grund: Pages bündelt sonst mit einer eigenen,
// älteren wrangler-Version, deren Ersatz für node:timers schreibgeschützt
// ist — Next.js 16 überschreibt dort setImmediate, jede Seite lieferte 500
// (30.10.2026).
//
// Ablauf:
// 1. OpenNext-Build (.open-next/)
// 2. Worker-Einstieg cloudflare-worker.js (Admin-Schranke) + OpenNext-Worker
//    samt Modulen in einen Arbeitsordner kopieren
// 3. mit wrangler zu einer einzigen Datei bündeln (.open-next/assets/_worker.js/index.js)
// 4. nur Bündel, statische Dateien und _routes.json landen in
//    .open-next/assets (kein Servercode mehr unter öffentlichen Adressen)

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { join } from 'node:path';

const OUT = '.open-next';
const ASSETS = join(OUT, 'assets');
const STAGE = join(OUT, 'pages-stage');
const BUNDLE = join(OUT, 'pages-worker');

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: 'inherit' });
}

// Kompatibilität wie in wrangler.toml (eine Quelle)
const toml = readFileSync('wrangler.toml', 'utf8');
const compatDate = toml.match(/^compatibility_date\s*=\s*"([^"]+)"/m)?.[1];
const compatFlags = [
  ...(toml.match(/^compatibility_flags\s*=\s*\[([^\]]*)\]/m)?.[1] ?? '').matchAll(/"([^"]+)"/g),
].map((m) => m[1]);
if (!compatDate) throw new Error('compatibility_date fehlt in wrangler.toml');

run('npx', ['opennextjs-cloudflare', 'build']);

rmSync(STAGE, { recursive: true, force: true });
rmSync(BUNDLE, { recursive: true, force: true });
mkdirSync(STAGE, { recursive: true });
for (const dir of ['cloudflare', 'middleware', 'server-functions', '.build']) {
  cpSync(join(OUT, dir), join(STAGE, dir), { recursive: true });
}
cpSync(join(OUT, 'worker.js'), join(STAGE, 'opennext-worker.js'));
cpSync('cloudflare-worker.js', join(STAGE, '_worker.js'));

run('npx', [
  'wrangler',
  'pages',
  'functions',
  'build',
  '--build-output-directory',
  STAGE,
  '--outdir',
  BUNDLE,
  '--compatibility-date',
  compatDate,
  ...compatFlags.flatMap((flag) => ['--compatibility-flags', flag]),
]);

// Node-Bausteine ohne Präfix (z. B. "path") als "node:path" importieren —
// ungebündelt nimmt Pages nur Importe an, die die Laufzeit selbst kennt
const builtins = new Set(builtinModules.filter((name) => !name.startsWith('_')));
const worker = readFileSync(join(BUNDLE, '_worker.js'), 'utf8').replace(
  /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)"([^"]+)"/g,
  (match, prefix, spec) => (builtins.has(spec) ? `${prefix}"node:${spec}"` : match),
);
// Als Ordner _worker.js/index.js: den lädt Pages mit no_bundle unverändert
// hoch (eine einzelne _worker.js prüft wrangler im iife-Format, das am
// Top-level-await des Bündels scheitert)
mkdirSync(join(ASSETS, '_worker.js'), { recursive: true });
writeFileSync(join(ASSETS, '_worker.js', 'index.js'), worker);
cpSync(join('public', '_routes.json'), join(ASSETS, '_routes.json'));
rmSync(STAGE, { recursive: true, force: true });
