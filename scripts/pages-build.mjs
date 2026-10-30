// Build für Cloudflare Pages (`npm run pages:build`, auch im Git-Build von
// Cloudflare bei jedem Push auf main).
//
// Problem: Beim Hochladen bündelt Pages _worker.js immer selbst neu — mit
// seinem eigenen wrangler 3.114 (no_bundle wird ignoriert). Der ersetzt
// Node-Bausteine (node:timers, node:module …) durch unvollständige
// Nachbauten aus unenv; Next.js 16 scheitert daran, jede Seite lieferte 500
// (30.10.2026).
//
// Lösung:
// 1. OpenNext-Build (.open-next/)
// 2. Worker-Einstieg cloudflare-worker.js (Admin-Schranke) + OpenNext-Worker
//    mit dem wrangler aus package.json zu einer Datei bündeln
// 3. jeden statischen Import eines Node-Bausteins durch
//    process.getBuiltinModule(…) ersetzen — dann gibt es für den Bündler von
//    Pages nichts mehr zu ersetzen, und zur Laufzeit kommt das echte Modul
//    der Cloudflare-Laufzeit
// 4. Ergebnis als .open-next/assets/_worker.js/index.js; in
//    .open-next/assets liegen sonst nur statische Dateien und _routes.json
//
// Prüfen wie in Produktion: mit wrangler 3.114 bündeln
// (`wrangler deploy --dry-run --outdir …`) und das Ergebnis mit dem
// aktuellen wrangler ungebündelt starten.

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

// Node-Bausteine ohne Präfix (z. B. "path") einheitlich als "node:path"
const builtins = new Set(builtinModules.filter((name) => !name.startsWith('_')));
let worker = readFileSync(join(BUNDLE, '_worker.js'), 'utf8').replace(
  /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)"([^"]+)"/g,
  (match, prefix, spec) => (builtins.has(spec) ? `${prefix}"node:${spec}"` : match),
);

// Statische Importe von Node-Bausteinen → process.getBuiltinModule(…).
// `globalThis["pro" + "cess"]`, damit der Bündler von Pages hier nicht
// seinen process-Nachbau einsetzt.
worker = worker.replace(
  /^import\s+([^;"]+?)\s+from\s*"(node:[^"]+)";?$/gm,
  (statement, clause, spec) => {
    const mod = `__nodeBuiltin(${JSON.stringify(spec)})`;
    const binding = clause.trim();
    if (binding.startsWith('* as ')) return `const ${binding.slice(5).trim()} = ${mod};`;
    if (binding.startsWith('{') && binding.endsWith('}')) {
      const names = binding
        .slice(1, -1)
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => name.replace(/^(\S+)\s+as\s+(\S+)$/, '$1: $2'));
      return `const { ${names.join(', ')} } = ${mod};`;
    }
    if (/^[\w$]+$/.test(binding)) return `const ${binding} = ${mod};`;
    throw new Error(`Unbekannte Importform im Worker: ${statement}`);
  },
);
const leftover = worker.match(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)"node:[^"]+"/);
if (leftover) throw new Error(`Node-Import nicht ersetzt: ${leftover[0]}`);
worker =
  'const __nodeBuiltin = (name) => globalThis["pro" + "cess"].getBuiltinModule(name);\n' + worker;

mkdirSync(join(ASSETS, '_worker.js'), { recursive: true });
writeFileSync(join(ASSETS, '_worker.js', 'index.js'), worker);
cpSync(join('public', '_routes.json'), join(ASSETS, '_routes.json'));
rmSync(STAGE, { recursive: true, force: true });
