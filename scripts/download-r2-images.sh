#!/bin/bash
#
# Migration Script: Download all images from Cloudflare R2 to GitHub
#
# Usage: ./scripts/download-r2-images.sh
#
# This script will:
# 1. List all objects in the R2 bucket
# 2. Download each image to public/images/gallery/{category}/
# 3. Create a manifest.json with all image metadata
#

set -e

# Configuration - Set these environment variables before running:
# export R2_ACCOUNT_ID="your-account-id"
# export R2_ACCESS_KEY_ID="your-access-key-id"
# export R2_SECRET_ACCESS_KEY="your-secret-access-key"

ACCOUNT_ID="${R2_ACCOUNT_ID:-}"
BUCKET_NAME="sechszirbenhuette-media"
R2_ENDPOINT="https://${ACCOUNT_ID}.r2.cloudflarestorage.com"

# Validate required environment variables
if [ -z "$R2_ACCOUNT_ID" ] || [ -z "$R2_ACCESS_KEY_ID" ] || [ -z "$R2_SECRET_ACCESS_KEY" ]; then
    echo "❌ Missing required environment variables!"
    echo ""
    echo "Please set the following environment variables:"
    echo "  export R2_ACCOUNT_ID=\"your-account-id\""
    echo "  export R2_ACCESS_KEY_ID=\"your-access-key-id\""
    echo "  export R2_SECRET_ACCESS_KEY=\"your-secret-access-key\""
    echo ""
    exit 1
fi

OUTPUT_DIR="public/images/gallery"

echo "🚀 R2 → GitHub Migration"
echo "========================"
echo ""
echo "Bucket: $BUCKET_NAME"
echo "Output: $OUTPUT_DIR"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Function to list objects using AWS CLI with R2
list_objects() {
    AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
    AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
    aws s3api list-objects-v2 \
        --bucket "$BUCKET_NAME" \
        --endpoint-url "$R2_ENDPOINT" \
        --output json 2>/dev/null
}

# Function to download a single object
download_object() {
    local key="$1"
    local category=$(dirname "$key")
    local filename=$(basename "$key")

    # Handle root-level files
    if [ "$category" == "." ]; then
        category="other"
    fi

    local output_path="$OUTPUT_DIR/$category/$filename"

    # Create category directory
    mkdir -p "$OUTPUT_DIR/$category"

    # Skip if file exists
    if [ -f "$output_path" ]; then
        echo "  ⏭️  Skipping (exists): $key"
        return
    fi

    echo "  ⬇️  Downloading: $key"

    AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
    AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
    aws s3 cp \
        "s3://$BUCKET_NAME/$key" \
        "$output_path" \
        --endpoint-url "$R2_ENDPOINT" \
        --quiet 2>/dev/null

    if [ $? -eq 0 ]; then
        echo "  ✅ Saved: $output_path"
    else
        echo "  ❌ Failed: $key"
    fi
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is required but not installed."
    echo ""
    echo "Install with:"
    echo "  macOS: brew install awscli"
    echo "  Linux: sudo apt install awscli"
    echo "  Windows: https://aws.amazon.com/cli/"
    echo ""
    echo "Or use the Node.js script instead:"
    echo "  npx tsx scripts/migrate-r2-to-github.ts"
    exit 1
fi

echo "📋 Listing objects in R2 bucket..."
echo ""

# Get object list
objects_json=$(list_objects)

if [ -z "$objects_json" ] || [ "$objects_json" == "null" ]; then
    echo "❌ No objects found or error accessing bucket"
    exit 1
fi

# Parse and download objects
echo "$objects_json" | jq -r '.Contents[]?.Key // empty' | while read -r key; do
    if [ -n "$key" ]; then
        download_object "$key"
    fi
done

echo ""
echo "✨ Migration complete!"
echo ""
echo "Files saved to: $OUTPUT_DIR"
echo ""
echo "Next steps:"
echo "  1. Review the downloaded images"
echo "  2. Commit and push: git add . && git commit -m 'Add gallery images' && git push"
