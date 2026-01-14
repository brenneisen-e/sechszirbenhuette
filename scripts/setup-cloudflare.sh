#!/bin/bash
# Cloudflare Workers Setup Script for Sechszirbenhuette
# Dieses Script erstellt alle notwendigen Cloudflare Ressourcen

set -e

echo "=== Sechszirbenhuette Cloudflare Setup ==="
echo ""

# Pruefen ob API Token gesetzt ist
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "Fehler: CLOUDFLARE_API_TOKEN ist nicht gesetzt."
    echo "Bitte zuerst ausführen: export CLOUDFLARE_API_TOKEN=\"dein-token-hier\""
    exit 1
fi

# Pruefen ob wrangler installiert ist
if ! command -v npx &> /dev/null; then
    echo "Fehler: npx nicht gefunden. Bitte Node.js installieren."
    exit 1
fi

echo "1. Erstelle D1 Datenbank..."
D1_OUTPUT=$(npx wrangler d1 create sechszirbenhuette-db 2>&1 || true)
echo "$D1_OUTPUT"

# D1 Database ID extrahieren
D1_ID=$(echo "$D1_OUTPUT" | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2 || true)
if [ -z "$D1_ID" ]; then
    # Versuche alternative Extraktion
    D1_ID=$(echo "$D1_OUTPUT" | grep -oP '(?<=database_id = ")[^"]+' || true)
fi

echo ""
echo "2. Erstelle KV Namespace..."
KV_OUTPUT=$(npx wrangler kv:namespace create KV 2>&1 || true)
echo "$KV_OUTPUT"

# KV ID extrahieren
KV_ID=$(echo "$KV_OUTPUT" | grep -o 'id = "[^"]*"' | head -1 | cut -d'"' -f2 || true)
if [ -z "$KV_ID" ]; then
    KV_ID=$(echo "$KV_OUTPUT" | grep -oP '(?<=id = ")[^"]+' | head -1 || true)
fi

echo ""
echo "3. Erstelle R2 Bucket..."
R2_OUTPUT=$(npx wrangler r2 bucket create sechszirbenhuette-media 2>&1 || true)
echo "$R2_OUTPUT"

echo ""
echo "=== Ressourcen erstellt ==="
echo ""
echo "Gefundene IDs:"
echo "  D1 Database ID: ${D1_ID:-'Nicht gefunden - bitte manuell aus Output extrahieren'}"
echo "  KV Namespace ID: ${KV_ID:-'Nicht gefunden - bitte manuell aus Output extrahieren'}"
echo ""

# wrangler.toml aktualisieren wenn IDs gefunden
if [ -n "$D1_ID" ] && [ -n "$KV_ID" ]; then
    echo "4. Aktualisiere wrangler.toml..."
    sed -i "s/YOUR_DATABASE_ID_HERE/$D1_ID/" wrangler.toml
    sed -i "s/YOUR_KV_NAMESPACE_ID_HERE/$KV_ID/" wrangler.toml
    echo "   wrangler.toml wurde aktualisiert!"
else
    echo "4. Bitte wrangler.toml manuell aktualisieren mit den oben genannten IDs:"
    echo "   - database_id = \"DEINE_D1_ID\""
    echo "   - id = \"DEINE_KV_ID\""
fi

echo ""
echo "5. Wende Datenbankschema an..."
if [ -n "$D1_ID" ]; then
    npx wrangler d1 execute sechszirbenhuette-db --file=./db/schema.sql
    echo "   Schema wurde angewendet!"
else
    echo "   Bitte manuell ausführen:"
    echo "   npx wrangler d1 execute sechszirbenhuette-db --file=./db/schema.sql"
fi

echo ""
echo "6. Admin-Passwort setzen:"
echo "   Bitte manuell ausführen (erfordert Eingabe):"
echo "   npx wrangler secret put ADMIN_PASSWORD"
echo ""
echo "=== Setup abgeschlossen ==="
echo ""
echo "Naechste Schritte:"
echo "1. Prüfe wrangler.toml auf korrekte IDs"
echo "2. Setze ADMIN_PASSWORD Secret"
echo "3. Deploy mit: npx wrangler pages deploy .next"
