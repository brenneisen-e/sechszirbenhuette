import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let isLoading = false;

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
  originalName: string;
}

/**
 * Load FFmpeg WASM - only loads once
 */
async function loadFFmpeg(onProgress?: (message: string) => void): Promise<FFmpeg> {
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
    return { files: [{ quality: 'high', file }], originalName: file.name };
  }

  const results: { quality: VideoQuality; file: File }[] = [];
  const qualities: VideoQuality[] = ['high', 'medium', 'low'];
  const baseName = file.name.replace(/\.[^.]+$/, '');

  try {
    onProgress?.({ stage: 'loading', message: 'Video-Konverter wird geladen...' });

    const ff = await loadFFmpeg((msg) => {
      onProgress?.({ stage: 'loading', message: msg });
    });

    const inputName = 'input' + getExtension(file.name);

    // Write input file once
    await ff.writeFile(inputName, await fetchFile(file));

    // Convert to each quality
    for (let i = 0; i < qualities.length; i++) {
      const quality = qualities[i];
      const preset = VIDEO_QUALITIES[quality];
      const outputName = `output_${preset.suffix}.mp4`;

      onProgress?.({
        stage: 'converting',
        message: `Konvertiere ${preset.suffix}...`,
        percent: Math.round((i / qualities.length) * 100),
        quality: preset.suffix
      });

      // Set up progress handler for this quality
      const progressHandler = ({ progress }: { progress: number }) => {
        const basePercent = (i / qualities.length) * 100;
        const qualityPercent = (progress * 100) / qualities.length;
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

    return { files: results, originalName: baseName };

  } catch (error) {
    console.error('Video conversion error:', error);
    onProgress?.({
      stage: 'error',
      message: 'Konvertierung fehlgeschlagen - Original wird verwendet'
    });
    // Return original file if conversion fails
    return { files: [{ quality: 'high', file }], originalName: file.name.replace(/\.[^.]+$/, '') };
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
