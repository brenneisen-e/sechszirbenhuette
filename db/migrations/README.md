# Datenbankmigrationen

## Textanpassungen Migration

Um die Textanpassungs-Tabelle in der D1-Datenbank anzulegen, führen Sie folgendes aus:

```bash
# Lokale Entwicklungsumgebung
wrangler d1 execute DB --local --file=./db/migrations/add_text_customizations.sql

# Produktionsumgebung
wrangler d1 execute DB --file=./db/migrations/add_text_customizations.sql
```

## Verwendung der Textanpassungen

1. Navigieren Sie zu `/admin/text-customizations` im Admin-Bereich
2. Wählen Sie einen Textbereich aus (z.B. "Hero - Titel")
3. Bearbeiten Sie den Text in Deutsch und Englisch
4. Passen Sie Schriftgröße, Farbe, Schriftart und Schriftstärke an
5. Speichern Sie die Änderungen
6. Die Änderungen werden sofort auf der Homepage sichtbar
