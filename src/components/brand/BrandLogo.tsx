// Vollständiges Logo, weiß, auf Dunkelgrün. Originalpfade aus
// public/images/logo.svg ohne Bannerfläche (public/images/brand/logo-weiss.svg).
// Mindestbreite 240 px; Schutzraum (10 % = 24 px) hält der umgebende Rahmen frei.
// Ersetzen durch die Datei „weiss-transparent“ aus dem Designpaket.

/* eslint-disable @next/next/no-img-element -- SVG-Original, keine Optimierung nötig */
export function BrandLogo({ width = 240 }: { width?: number }) {
  const w = Math.max(width, 240);
  return (
    <img
      src="/images/brand/logo-weiss.svg"
      alt="Sechszirbenhütte"
      width={w}
      height={Math.round((w * 82.01) / 267.5)}
      className="block"
      style={{ width: w, height: 'auto' }}
    />
  );
}
