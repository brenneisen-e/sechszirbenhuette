// Bricht `npm run pages:build` im Git-Build von Cloudflare Pages ab (dort ist
// CF_PAGES=1). Dessen eigener wrangler bündelt _worker.js mit einem Ersatz für
// node:timers, den Next.js 16 nicht verträgt — die Website liefe auf 500.
// Veröffentlicht wird über GitHub Actions (.github/workflows/deploy.yml).
if (process.env.CF_PAGES === '1') {
  console.error(
    'Abbruch: Deployment läuft über GitHub Actions (.github/workflows/deploy.yml), ' +
      'nicht über den Git-Build von Cloudflare Pages.',
  );
  process.exit(1);
}
