# Repository Cleanup Guide — Sechszirbenhuette

Tailored cleanup plan for this Next.js 15 + Cloudflare Workers project,
based on the 2025/2026 full-stack monorepo playbook.

---

## Status: What's been done

- [x] **TSConfig hardened** — Added beyond-strict flags: `noUncheckedIndexedAccess`,
      `noFallthroughCasesInSwitch`, `noImplicitReturns`, `noImplicitOverride`,
      `forceConsistentCasingInFileNames`, `moduleDetection: "force"`, target bumped to ES2022
- [x] **Prettier configured** — `.prettierrc` + `.prettierignore` added
- [x] **EditorConfig added** — `.editorconfig` for consistent whitespace
- [x] **package.json cleaned** — `@types/*` moved to `devDependencies`,
      `typecheck`/`format`/`format:check` scripts added
- [x] **.gitignore updated** — Added `.open-next/` build artifacts

---

## Priority 1: File size violations (high impact, medium effort)

These files far exceed the 500-line hard limit:

| File                     | Lines | Action                                            |
| ------------------------ | ----- | ------------------------------------------------- |
| `GuestDatabase.tsx`      | 2,151 | Split into sub-components: filters, table, modals |
| `BookingWizard.tsx`      | 1,734 | Extract step components, validation logic         |
| `BookingDetail.tsx`      | 1,248 | Extract sections into sub-components              |
| `ImageManager.tsx`       | 1,159 | Extract upload, gallery, modal components         |
| `FinanceOverview.tsx`    | 1,146 | Extract charts, summary cards, tables             |
| `blog/[slug]/page.tsx`   | 1,014 | Extract content renderer, sidebar, metadata       |
| `financeCalculations.ts` | 900   | Split by domain: tax, revenue, expense utils      |
| `GuestAppEditor.tsx`     | 815   | Extract form sections into sub-components         |
| `BlogEditorForm.tsx`     | 788   | Extract toolbar, preview, media picker            |

**Approach**: Extract sub-components into sibling files within the same directory.
Import directly — do NOT create new barrel files.

---

## Priority 2: Barrel file removal (high impact, low effort)

13 barrel files (`index.ts`) exist. These hurt HMR performance and obscure
dependency chains. Remove them from application code:

```
src/components/admin/index.ts
src/components/admin/blog-editor/index.ts
src/components/admin/expense-panel/index.ts
src/components/admin/finance-overview/index.ts
src/components/admin/guest-database/index.ts
src/components/admin/guest-database/hooks/index.ts
src/components/admin/guest-database/tabs/index.ts
src/components/admin/guest-database/admin-calendar/index.ts
src/components/admin/image-manager/index.ts
src/components/admin/utility-costs/index.ts
src/components/admin/positions/index.ts
src/components/sections/index.ts
src/components/layout/index.ts
```

**How**: Update all import sites to use direct file paths instead of barrel imports.
Then delete the `index.ts` files.

---

## Priority 3: ESLint flat config (high impact, medium effort)

Currently ESLint is **disabled** (`ignoreDuringBuilds: true` in next.config.js).
Set up a proper flat config:

1. Install: `npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react
eslint-plugin-react-hooks eslint-plugin-simple-import-sort
eslint-config-prettier globals`
2. Create `eslint.config.js` with `strictTypeChecked` + `stylisticTypeChecked`
3. Remove `ignoreDuringBuilds: true` from next.config.js
4. Add `lint` step to CI

---

## Priority 4: Dependency audit (high impact, low effort)

```bash
# Detect unused dependencies
npx knip --dependencies

# Audit for security issues
npm audit --audit-level=high

# Check for outdated packages (staged approach)
npx ncu --target patch
npx ncu --target minor
```

**Known candidates for review**:

- `jszip` — verify if still used or can be lazy-loaded
- `hls.js` — should be lazy-loaded (video streaming, not needed at startup)
- `framer-motion` — large library, verify usage scope
- `@anthropic-ai/sdk` — should only be in server bundles

---

## Priority 5: Bundle optimization

```bash
# Analyze the bundle
npx @next/bundle-analyzer

# Or use source-map-explorer
npx source-map-explorer .next/static/**/*.js
```

**Quick wins**:

- Lazy-load admin components (they're behind auth)
- Lazy-load Tiptap editor (only used in admin)
- Lazy-load `hls.js` (only used when video plays)
- Lazy-load `jszip` (only used for downloads)
- Use `next/dynamic` for heavy admin panel components

---

## Priority 6: Binary files in git ✅

`Zeichnung Hütte 2.png` moved to `public/images/zeichnung-huette.png`.
`Welcome_Guide.pdf` moved to `public/welcome-guide.pdf`.

---

## Priority 7: CI quality gates

The current CI (`.github/workflows/setup-cloudflare.yml`) only handles deployment.
Add a quality pipeline:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run format:check
      - run: npm run lint
      - run: npm run build
```

---

## Priority 8: Git hooks with Lefthook

```bash
npm install -D lefthook
npx lefthook install
```

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    format:
      glob: '*.{ts,tsx,js,jsx,json,css,md,yaml}'
      run: npx prettier --write {staged_files}
      stage_fixed: true
    typecheck:
      run: npx tsc --noEmit
```

---

## Priority 9: Environment variable validation

Create `src/lib/env.ts` with Zod schema validation for all required env vars
and Cloudflare bindings. Fail fast on missing configuration.

---

## Notes

- This is a **single Next.js app**, not a monorepo. The apps/ + packages/
  pattern from the guide does not apply unless the project grows significantly.
- **pnpm migration** is recommended but not urgent — npm works fine for a
  single-app project. Consider migrating when/if adding a second app.
- **Naming conventions** are already mostly correct (kebab-case files,
  PascalCase components). A few files use PascalCase filenames
  (e.g., `DuplicatesModal.tsx`) — migrate to kebab-case gradually.
