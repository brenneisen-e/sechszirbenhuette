import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

// Erlaubte Dateitypen
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB (Cloudflare Worker Limit)

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Multipart form-data erforderlich' },
        { status: 400 }
      );
    }

    const formData = await request.formData();

    const file = formData.get('file') as File;
    const category = formData.get('category') as string;
    const altText = formData.get('altText') as string || '';

    if (!file || !category) {
      return NextResponse.json(
        { error: 'Datei und Kategorie erforderlich' },
        { status: 400 }
      );
    }

    // Validierung
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: `Dateityp ${file.type} nicht erlaubt. Erlaubt: JPG, PNG, WebP, GIF, MP4, WebM` },
        { status: 400 }
      );
    }

    // Größen-Check (Worker Limit)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Datei zu groß (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: 25 MB. Bitte komprimieren Sie die Datei.` },
        { status: 400 }
      );
    }

    // Eindeutiger Dateiname
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `${category}/${timestamp}-${randomId}.${ext}`;

    try {
      // R2 Binding holen
      const { env } = getRequestContext();
      const r2 = env.R2;

      if (!r2) {
        // Fallback wenn R2 nicht verfügbar (z.B. lokal)
        return NextResponse.json({
          success: true,
          message: 'R2 nicht konfiguriert - Datei nicht hochgeladen',
          url: `/images/${category}/placeholder.jpg`,
          filename,
          category,
          type: isVideo ? 'video' : 'image',
        });
      }

      // Datei zu R2 hochladen
      const arrayBuffer = await file.arrayBuffer();

      await r2.put(filename, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
        },
        customMetadata: {
          originalName: file.name,
          category: category,
          altText: altText,
        },
      });

      // Öffentliche URL (erfordert Public Access auf dem Bucket)
      const publicUrl = env.PUBLIC_R2_URL
        ? `${env.PUBLIC_R2_URL}/${filename}`
        : `https://media.sechszirbenhuette.com/${filename}`;

      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename,
        category,
        type: isVideo ? 'video' : 'image',
        size: file.size,
      });

    } catch (r2Error) {
      console.error('R2 Upload error:', r2Error);
      return NextResponse.json(
        { error: `R2 Upload fehlgeschlagen: ${r2Error instanceof Error ? r2Error.message : 'Unbekannter Fehler'}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: `Upload fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}` },
      { status: 500 }
    );
  }
}
