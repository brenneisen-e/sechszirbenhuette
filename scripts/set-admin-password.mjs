/**
 * Admin-Passwort setzen
 * ============================================================================
 *
 * Schreibt das Admin-Passwort als PBKDF2-Hash nach D1 (settings.admin_code_hash).
 *
 * Der Weg ohne Deployment: Ein Cloudflare-Secret (ADMIN_PASSWORD) greift erst
 * ab dem nächsten Build, dieser Eintrag sofort. Damit ist das Script auch der
 * Weg zurück, wenn das Passwort verloren ist — vorausgesetzt, wrangler ist
 * angemeldet.
 *
 * Verwendung:
 *   npm run set-admin-password                     (fragt interaktiv ab)
 *   npm run set-admin-password -- "mein-passwort"  (nicht-interaktiv)
 *
 * Voraussetzung: wrangler ist angemeldet (`npx wrangler login`).
 */

import { execFileSync } from 'node:child_process';
import { webcrypto as crypto } from 'node:crypto';
import { createInterface } from 'node:readline/promises';

const DB_NAME = 'sechszirbenhuette-db';
const MIN_LENGTH = 10;
// Muss zu PBKDF2_ITERATIONS in src/lib/server/adminAuth.ts passen, sonst schlägt die Prüfung fehl
const PBKDF2_ITERATIONS = 150_000;

/** Erzeugt `pbkdf2$<runden>$<salt>$<hash>` — gleiches Format wie src/lib/server/adminAuth.ts */
async function hashAdminCode(code) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(code),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  const b64 = (bytes) => Buffer.from(bytes).toString('base64');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}

async function readCode() {
  const fromArgs = process.argv.slice(2).join(' ').trim();
  if (fromArgs) return fromArgs;

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Neues Admin-Passwort (mind. 10 Zeichen): ');
  rl.close();
  return answer.trim();
}

const code = await readCode();

if (code.length < MIN_LENGTH) {
  console.error(`\nAbgebrochen: Das Passwort braucht mindestens ${MIN_LENGTH} Zeichen.`);
  process.exit(1);
}

const hash = await hashAdminCode(code);

// Der Hash besteht nur aus Base64 und '$' — keine Anführungszeichen, die aus
// dem SQL-String ausbrechen könnten. Trotzdem prüfen, statt es anzunehmen.
if (!/^pbkdf2\$\d+\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/.test(hash)) {
  console.error('Abgebrochen: unerwartetes Hash-Format.');
  process.exit(1);
}

const sql = `INSERT INTO settings (key, value, updated_at)
             VALUES ('admin_code_hash', '${hash}', datetime('now'))
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now');`;

console.log('\nSchreibe den Hash nach D1 ...');
try {
  execFileSync('npx', ['wrangler', 'd1', 'execute', DB_NAME, '--remote', '--command', sql], {
    stdio: 'inherit',
  });
} catch {
  console.error('\nFehlgeschlagen. Ist wrangler angemeldet? `npx wrangler login`');
  process.exit(1);
}

console.log('\nFertig. Das Admin-Passwort gilt sofort — kein Deployment nötig.');
