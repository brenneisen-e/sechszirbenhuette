import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let isLoading = false;
let ffmpegSupported: boolean | null = null;

/**
 * Check if FFmpeg.wasm is supported in this browser/environment
 * FFmpeg.wasm requires SharedArrayBuffer which needs COOP/COEP headers
 */
function isFFmpegSupported(): boolean {
  if (ffmpegSupported !== null) {
    return ffmpegSupported;
  }

  // Check for SharedArrayBuffer support (required by FFmpeg.wasm)
  if (typeof SharedArrayBuffer === 'undefined') {
    console.warn('FFmpeg.wasm nicht verfügbar: SharedArrayBuffer wird nicht unterstützt. COOP/COEP Header erforderlich.');
    ffmpegSupported = false;
    return false;
  }

  // Additional check: crossOriginIsolated must be true for SharedArrayBuffer to work
  if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
    console.warn('FFmpeg.wasm nicht verfügbar: Seite ist nicht cross-origin isoliert. COOP/COEP Header erforderlich.');
    ffmpegSupported = false;
    return false;
  }

  ffmpegSupported = true;
  return true;
}

/**
 * Video quality presets for adaptive streaming
 */
export const VIDEO_QUALITIES = {
  high: { width: 1280, height: 720, bitrate: '2500k', suffix: '720p' },
  medium: { width: 854, height: 480, bitrate: '1200k', suffix: '480p' },
  low: { width: 640, height: 360, bitrate: '600k', suffix: '360p' },
} as const;

export type VideoQuality = keyof typeof VIDEO_QUALITIES;

export interface MultiQualityResult {
  files: { quality: VideoQuality; file: File }[];
  thumbnail: File | null;
  originalName: string;
}

/**
 * Load FFmpeg WASM - only loads once
 * Returns null if FFmpeg is not supported in this environment
 */
async function loadFFmpeg(onProgress?: (message: string) => void): Promise<FFmpeg | null> {
  // Check if FFmpeg is supported before attempting to load
  if (!isFFmpegSupported()) {
    onProgress?.('Video-Konvertierung nicht verfügbar (COOP/COEP Header fehlen)');
    return null;
  }

  if (ffmpeg && ffmpeg.loaded) {
    return ffmpeg;
  }

  if (isLoading) {
    // Wait for existing load to complete
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (ffmpeg && ffmpeg.loaded) {
      return ffmpeg;
    }
  }

  isLoading = true;
  onProgress?.('FFmpeg wird geladen...');

  try {
    ffmpeg = new FFmpeg();

    // Load from CDN
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    onProgress?.('FFmpeg geladen!');
    return ffmpeg;
  } catch (error) {
    console.error('Failed to load FFmpeg:', error);
    throw new Error('FFmpeg konnte nicht geladen werden');
  } finally {
    isLoading = false;
  }
}

export interface ConversionProgress {
  stage: 'loading' | 'converting' | 'done' | 'error';
  message: string;
  percent?: number;
  quality?: string;
}

/**
 * Convert video to Safari-compatible format with faststart
 * This ensures the moov atom is at the beginning of the file
 */
export async function convertVideoForSafari(
  file: File,
  onProgress?: (progress: ConversionProgress) => void
): Promise<File> {
  // Skip if not a video
  if (!file.type.startsWith('video/')) {
    return file;
  }

  try {
    onProgress?.({ stage: 'loading', message: 'Video-Konverter wird geladen...' });

    const ff = await loadFFmpeg((msg) => {
      onProgress?.({ stage: 'loading', message: msg });
    });

    // If FFmpeg is not supported, return original file
    if (!ff) {
      onProgress?.({
        stage: 'done',
        message: 'Video wird ohne Konvertierung hochgeladen (FFmpeg nicht verfügbar)',
        percent: 100
      });
      return file;
    }

    const inputName = 'input' + getExtension(file.name);
    const outputName = 'output.mp4';

    onProgress?.({ stage: 'converting', message: 'Video wird für Safari optimiert...', percent: 0 });

    // Set up progress handler
    ff.on('progress', ({ progress }) => {
      const percent = Math.round(progress * 100);
      onProgress?.({
        stage: 'converting',
        message: `Video wird konvertiert... ${percent}%`,
        percent
      });
    });

    // Write input file
    await ff.writeFile(inputName, await fetchFile(file));

    // Convert with faststart flag for Safari compatibility
    // -movflags +faststart moves the moov atom to the beginning
    // -c:v libx264 -profile:v main ensures broad compatibility
    // -preset fast balances speed and compression
    // -crf 23 is a good quality/size tradeoff
    await ff.exec([
      '-i', inputName,
      '-c:v', 'libx264',
      '-profile:v', 'main',
      '-level', '4.0',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y',
      outputName
    ]);

    // Read output file
    const data = await ff.readFile(outputName);

    // Clean up
    await ff.deleteFile(inputName);
    await ff.deleteFile(outputName);

    onProgress?.({ stage: 'done', message: 'Video erfolgreich konvertiert!', percent: 100 });

    // Create new File object - use Uint8Array directly with spread
    const uint8Array = data as Uint8Array;
    const blob = new Blob([new Uint8Array(uint8Array)], { type: 'video/mp4' });
    const convertedFile = new File(
      [blob],
      file.name.replace(/\.[^.]+$/, '.mp4'),
      { type: 'video/mp4' }
    );

    return convertedFile;

  } catch (error) {
    console.error('Video conversion error:', error);
    onProgress?.({
      stage: 'error',
      message: 'Konvertierung fehlgeschlagen - Original wird verwendet'
    });
    // Return original file if conversion fails
    return file;
  }
}

/**
 * Convert video to multiple quality levels for adaptive streaming
 */
export async function convertVideoMultiQuality(
  file: File,
  onProgress?: (progress: ConversionProgress) => void
): Promise<MultiQualityResult> {
  // Skip if not a video
  if (!file.type.startsWith('video/')) {
    return { files: [{ quality: 'high', file }], thumbnail: null, originalName: file.name };
  }

  const results: { quality: VideoQuality; file: File }[] = [];
  const qualities: VideoQuality[] = ['high', 'medium', 'low'];
  const baseName = file.name.replace(/\.[^.]+$/, '');
  let thumbnail: File | null = null;

  try {
    onProgress?.({ stage: 'loading', message: 'Video-Konverter wird geladen...' });

    const ff = await loadFFmpeg((msg) => {
      onProgress?.({ stage: 'loading', message: msg });
    });

    // If FFmpeg is not supported, return original file without conversion
    if (!ff) {
      onProgress?.({
        stage: 'done',
        message: 'Video wird ohne Konvertierung hochgeladen (FFmpeg nicht verfügbar)',
        percent: 100
      });
      // Try to extract thumbnail using canvas instead
      let thumbnail: File | null = null;
      try {
        thumbnail = await extractThumbnailAtTime(file, 1);
      } catch {
        // Ignore thumbnail extraction errors
      }
      return { files: [{ quality: 'high', file }], thumbnail, originalName: baseName };
    }

    const inputName = 'input' + getExtension(file.name);

    // Write input file once
    await ff.writeFile(inputName, await fetchFile(file));

    // Extract thumbnail from first second of video
    onProgress?.({
      stage: 'converting',
      message: 'Extrahiere Vorschaubild...',
      percent: 0,
      quality: 'thumbnail'
    });

    try {
      const thumbnailName = 'thumbnail.jpg';
      await ff.exec([
        '-i', inputName,
        '-ss', '00:00:01',  // Seek to 1 second
        '-vframes', '1',    // Extract 1 frame
        '-q:v', '2',        // High quality JPEG
        '-vf', 'scale=1280:-2',  // Scale to 720p width
        '-y',
        thumbnailName
      ]);

      const thumbData = await ff.readFile(thumbnailName);
      const thumbUint8 = thumbData as Uint8Array;
      const thumbBlob = new Blob([new Uint8Array(thumbUint8)], { type: 'image/jpeg' });
      thumbnail = new File(
        [thumbBlob],
        `${baseName}-thumbnail.jpg`,
        { type: 'image/jpeg' }
      );

      await ff.deleteFile(thumbnailName);
    } catch (thumbError) {
      console.warn('Thumbnail extraction failed:', thumbError);
      // Continue without thumbnail
    }

    // Convert to each quality
    for (let i = 0; i < qualities.length; i++) {
      const quality = qualities[i];
      const preset = VIDEO_QUALITIES[quality];
      const outputName = `output_${preset.suffix}.mp4`;

      onProgress?.({
        stage: 'converting',
        message: `Konvertiere ${preset.suffix}...`,
        percent: Math.round(((i + 1) / (qualities.length + 1)) * 100),
        quality: preset.suffix
      });

      // Set up progress handler for this quality
      const progressHandler = ({ progress }: { progress: number }) => {
        const basePercent = ((i + 1) / (qualities.length + 1)) * 100;
        const qualityPercent = (progress * 100) / (qualities.length + 1);
        const totalPercent = Math.round(basePercent + qualityPercent);
        onProgress?.({
          stage: 'converting',
          message: `Konvertiere ${preset.suffix}... ${Math.round(progress * 100)}%`,
          percent: totalPercent,
          quality: preset.suffix
        });
      };

      ff.on('progress', progressHandler);

      // Convert with specific quality settings
      await ff.exec([
        '-i', inputName,
        '-c:v', 'libx264',
        '-profile:v', 'main',
        '-level', '4.0',
        '-preset', 'fast',
        '-vf', `scale=${preset.width}:-2`,
        '-b:v', preset.bitrate,
        '-maxrate', preset.bitrate,
        '-bufsize', `${parseInt(preset.bitrate) * 2}k`,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        outputName
      ]);

      // Read output file
      const data = await ff.readFile(outputName);

      // Create new File object
      const uint8Array = data as Uint8Array;
      const blob = new Blob([new Uint8Array(uint8Array)], { type: 'video/mp4' });
      const convertedFile = new File(
        [blob],
        `${baseName}-${preset.suffix}.mp4`,
        { type: 'video/mp4' }
      );

      results.push({ quality, file: convertedFile });

      // Clean up output
      await ff.deleteFile(outputName);
    }

    // Clean up input
    await ff.deleteFile(inputName);

    onProgress?.({ stage: 'done', message: 'Alle Qualitätsstufen erstellt!', percent: 100 });

    return { files: results, thumbnail, originalName: baseName };

  } catch (error) {
    console.error('Video conversion error:', error);
    onProgress?.({
      stage: 'error',
      message: 'Konvertierung fehlgeschlagen - Original wird verwendet'
    });
    // Return original file if conversion fails
    return { files: [{ quality: 'high', file }], thumbnail: null, originalName: file.name.replace(/\.[^.]+$/, '') };
  }
}

function getExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0] : '.mp4';
}

/**
 * Check if a video file needs conversion
 * Returns true if the file might not be Safari-compatible
 */
export function needsConversion(file: File): boolean {
  if (!file.type.startsWith('video/')) {
    return false;
  }

  // Always convert videos to ensure faststart is set
  // Even mp4 files might not have the moov atom at the start
  return true;
}

/**
 * Extract a thumbnail from a video at a specific timestamp
 * Uses canvas for client-side extraction (fast, no FFmpeg needed)
 */
export async function extractThumbnailAtTime(
  videoFile: File,
  timeInSeconds: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Set canvas size to match video dimensions (720p max)
      const scale = Math.min(1, 1280 / video.videoWidth);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;

      // Seek to the specified time
      video.currentTime = Math.min(timeInSeconds, video.duration - 0.1);
    };

    video.onseeked = () => {
      // Draw the current frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const baseName = videoFile.name.replace(/\.[^.]+$/, '');
            const thumbnailFile = new File(
              [blob],
              `${baseName}-thumbnail.jpg`,
              { type: 'image/jpeg' }
            );
            resolve(thumbnailFile);
          } else {
            reject(new Error('Failed to create thumbnail blob'));
          }

          // Cleanup
          URL.revokeObjectURL(video.src);
        },
        'image/jpeg',
        0.92 // High quality
      );
    };

    video.onerror = () => {
      reject(new Error('Failed to load video for thumbnail extraction'));
      URL.revokeObjectURL(video.src);
    };

    // Load the video file
    video.src = URL.createObjectURL(videoFile);
    video.load();
  });
}
