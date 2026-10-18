// Große, scharfe Bilder aus Cloudflare Images (Briefing 18.10.2026).
//
// Cloudflare liefert jedes Bild in benannten Varianten aus. Neben „public“
// richtet das Admin Center beim Laden einmalig diese Größen ein
// (src/lib/server/imageVariants.ts, Ergebnis in site_settings.imageVariants):
// thumb 640, medium 1280, large 1920, hero 2560 px — jeweils höchstens so
// groß wie das Original, Format (AVIF/WebP) wählt Cloudflare je Browser.
// Solange die Varianten fehlen, bleibt es bei „public“.

export const IMAGE_VARIANTS = [
  { name: 'thumb', width: 640 },
  { name: 'medium', width: 1280 },
  { name: 'large', width: 1920 },
  { name: 'hero', width: 2560 },
] as const;

export type ImageVariant = (typeof IMAGE_VARIANTS)[number]['name'];

const DELIVERY = /^(https:\/\/imagedelivery\.net\/[^/]+\/[^/]+)\/[^/?#]+$/;

export function isCloudflareImage(url: string): boolean {
  return DELIVERY.test(url);
}

/** Adresse einer Variante; andere Adressen bleiben unverändert */
export function cfVariant(url: string, variant: ImageVariant | 'public'): string {
  const match = DELIVERY.exec(url);
  return match ? `${match[1]}/${variant}` : url;
}

export interface ResponsiveSource {
  src: string;
  srcSet?: string;
}

/**
 * src und srcSet für <img>. `max` begrenzt die größte Variante (Kacheln
 * brauchen kein 2560er-Bild), `base` ist die Variante für Browser ohne srcset.
 */
export function responsiveSource(
  url: string,
  enabled: boolean,
  max: ImageVariant = 'large',
  base: ImageVariant = 'medium',
): ResponsiveSource {
  if (!enabled || !isCloudflareImage(url)) return { src: url };
  const limit = IMAGE_VARIANTS.find((v) => v.name === max)?.width ?? 1920;
  return {
    src: cfVariant(url, base),
    srcSet: IMAGE_VARIANTS.filter((v) => v.width <= limit)
      .map((v) => `${cfVariant(url, v.name)} ${v.width}w`)
      .join(', '),
  };
}
