# Portfolio-Cockpit

React-Web-App für Depotgewichtung, Kaufzonen, Optionen, Kaufplanung und Watchlists. Die interaktiven Anpassungen werden in PostgreSQL gespeichert.

## Lokal starten

1. `.env.example` als `.env.local` kopieren und `DATABASE_URL` mit einer PostgreSQL-Verbindungs-URL befüllen. Für die bereitgestellte Cloudflare-Laufzeit sollte der Anbieter HTTP/WebSocket-Verbindungen unterstützen (z. B. Neon).
2. `npm install`
3. `npm run dev`

Die Tabelle wird beim ersten API-Aufruf idempotent angelegt. Das gleiche Schema liegt zusätzlich unter `db/migrations/0001_portfolio_state.sql`.

Ohne `DATABASE_URL` bleibt das Cockpit vollständig bedienbar, weist aber oben auf den lokalen, nicht persistenten Modus hin.
