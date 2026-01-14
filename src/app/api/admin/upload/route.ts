import { NextRequest, NextResponse } from 'next/server';

// Erlaubte Dateitypen
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

// In-Memory Speicher für Demo (in Produktion: R2)
const mediaStore: Array<{
  id: number;
  url: string;
  filename: string;
  category: string;
  type: string;
  alt_text: string;
  created_at: string;
}> = [];

let nextId = 1;

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

    // Größen-Check
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: `Bild zu groß (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: 10 MB` },
        { status: 400 }
      );
    }

    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { error: `Video zu groß (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: 100 MB` },
        { status: 400 }
      );
    }

    // Eindeutiger Dateiname
    const ext = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `${timestamp}-${randomId}.${ext}`;

    // TODO: In Produktion zu R2 hochladen
    // Für jetzt: Speichere in Memory und gib eine Platzhalter-URL zurück
    const url = `/images/${category}/${filename}`;

    const mediaItem = {
      id: nextId++,
      url,
      filename,
      category,
      type: isVideo ? 'video' : 'image',
      alt_text: altText,
      created_at: new Date().toISOString(),
    };

    mediaStore.push(mediaItem);

    // Hinweis: Bei Cloudflare Pages müssen Bilder zu R2 hochgeladen werden
    // Diese Route speichert momentan nur Metadaten

    return NextResponse.json({
      success: true,
      message: 'Datei erfolgreich registriert. Hinweis: Für Produktion muss R2 eingerichtet werden.',
      ...mediaItem,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: `Upload fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ media: mediaStore });
}
