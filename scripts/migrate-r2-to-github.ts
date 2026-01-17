/**
 * Migration Script: Cloudflare R2 → GitHub (public/images/)
 *
 * Downloads all images from R2 bucket and organizes them by category
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

// R2 Configuration - Set these environment variables before running:
// R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = 'sechszirbenhuette-media';
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// Validate required environment variables
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('❌ Missing required environment variables!');
  console.error('');
  console.error('Please set the following environment variables:');
  console.error('  export R2_ACCOUNT_ID="your-account-id"');
  console.error('  export R2_ACCESS_KEY_ID="your-access-key-id"');
  console.error('  export R2_SECRET_ACCESS_KEY="your-secret-access-key"');
  console.error('');
  process.exit(1);
}

// Output directory
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'images', 'gallery');

// Valid categories for organizing images
const CATEGORIES = [
  'hero',
  'header',
  'innen',
  'aussen',
  'umgebung',
  'winter',
  'sommer',
  'living',
  'kitchen',
  'rooms',
  'sauna',
  'bathroom',
  'outdoor',
  'equipment',
  'location'
];

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Required for R2
});

interface MediaFile {
  key: string;
  category: string;
  filename: string;
  size?: number;
}

async function listAllObjects(): Promise<MediaFile[]> {
  const files: MediaFile[] = [];
  let continuationToken: string | undefined;

  console.log('📋 Listing all objects in R2 bucket...\n');

  do {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);

    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key) {
          const parts = object.Key.split('/');
          const category = parts.length > 1 ? parts[0] : 'uncategorized';
          const filename = parts[parts.length - 1];

          files.push({
            key: object.Key,
            category: CATEGORIES.includes(category) ? category : 'other',
            filename,
            size: object.Size,
          });
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return files;
}

async function downloadFile(file: MediaFile): Promise<void> {
  const categoryDir = path.join(OUTPUT_DIR, file.category);

  // Create category directory if it doesn't exist
  if (!fs.existsSync(categoryDir)) {
    fs.mkdirSync(categoryDir, { recursive: true });
  }

  const outputPath = path.join(categoryDir, file.filename);

  // Skip if file already exists
  if (fs.existsSync(outputPath)) {
    console.log(`  ⏭️  Skipping (exists): ${file.key}`);
    return;
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: file.key,
  });

  const response = await s3Client.send(command);

  if (response.Body) {
    const stream = response.Body as Readable;
    const writeStream = fs.createWriteStream(outputPath);

    await new Promise<void>((resolve, reject) => {
      stream.pipe(writeStream);
      stream.on('error', reject);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    console.log(`  ✅ Downloaded: ${file.key} → ${path.relative(process.cwd(), outputPath)}`);
  }
}

async function generateImageManifest(files: MediaFile[]): Promise<void> {
  const manifest: Record<string, { files: string[]; count: number }> = {};

  for (const file of files) {
    if (!manifest[file.category]) {
      manifest[file.category] = { files: [], count: 0 };
    }
    manifest[file.category].files.push(file.filename);
    manifest[file.category].count++;
  }

  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📄 Generated manifest: ${path.relative(process.cwd(), manifestPath)}`);
}

async function main() {
  console.log('🚀 Starting R2 → GitHub Migration\n');
  console.log(`   Bucket: ${R2_BUCKET_NAME}`);
  console.log(`   Output: ${OUTPUT_DIR}\n`);

  try {
    // List all objects
    const files = await listAllObjects();
    console.log(`\n📊 Found ${files.length} files in R2 bucket\n`);

    // Group by category for summary
    const byCategory: Record<string, number> = {};
    for (const file of files) {
      byCategory[file.category] = (byCategory[file.category] || 0) + 1;
    }

    console.log('📁 Files by category:');
    for (const [category, count] of Object.entries(byCategory).sort()) {
      console.log(`   ${category}: ${count} files`);
    }
    console.log('');

    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Download all files
    console.log('⬇️  Downloading files...\n');
    let downloaded = 0;
    let skipped = 0;
    let errors = 0;

    for (const file of files) {
      try {
        const categoryDir = path.join(OUTPUT_DIR, file.category);
        const outputPath = path.join(categoryDir, file.filename);

        if (fs.existsSync(outputPath)) {
          skipped++;
        } else {
          downloaded++;
        }

        await downloadFile(file);
      } catch (error) {
        errors++;
        console.error(`  ❌ Error downloading ${file.key}:`, error);
      }
    }

    // Generate manifest
    await generateImageManifest(files);

    // Summary
    console.log('\n✨ Migration Complete!\n');
    console.log(`   Downloaded: ${downloaded} files`);
    console.log(`   Skipped: ${skipped} files (already existed)`);
    console.log(`   Errors: ${errors} files`);
    console.log(`\n   Images saved to: ${OUTPUT_DIR}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
