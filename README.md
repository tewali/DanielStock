# Portfolio-Cockpit

React-Web-App für Depotgewichtung, Kaufzonen, Optionen, Kaufplanung und Watchlists. Die interaktiven Anpassungen sowie aktuelle und historische Kurse werden in PostgreSQL gespeichert.

## Lokal starten

1. `.env.example` als `.env.local` kopieren und `DATABASE_URL` mit einer PostgreSQL-Verbindungs-URL befüllen. In der lokalen Entwicklungsumgebung kann das eingebaute Testpasswort verwendet werden; `DASHBOARD_PASSWORD` überschreibt es.
2. `npm install`
3. `npm run dev`

Die Tabellen werden beim ersten API-Aufruf idempotent angelegt. Die gleichen Schemata liegen zusätzlich unter `db/migrations/`.

## Kursdaten

Der Kursabgleich nutzt serverseitig das freie, inoffizielle Yahoo-Finance-Interface über `yahoo-finance2`; ein API-Key ist nicht erforderlich. Aktuelle Kurse werden nach einer Plausibilitätsprüfung in das Modell übernommen. Beim Öffnen eines Titels lädt das Cockpit dessen tägliche Ein-Jahres-Historie und speichert sie für zwölf Stunden in PostgreSQL zwischen.

Yahoo garantiert weder Verfügbarkeit noch Aktualität dieses nicht offiziell unterstützten Interfaces. Die Kurse dienen deshalb der Portfolioübersicht, nicht der Orderausführung. Manuelle Kurswerte und das Zurücksetzen auf die Arbeitsmappe bleiben verfügbar.

Ohne `DATABASE_URL` bleibt das Cockpit vollständig bedienbar, weist aber oben auf den lokalen, nicht persistenten Modus hin.

## MCP für die Portfolioverwaltung

Der Streamable-HTTP-Endpunkt liegt unter `/api/mcp` und wird unabhängig vom Dashboard-Login mit `Authorization: Bearer <MCP_API_KEY>` geschützt. In der Produktion muss deshalb eine lange, zufällige Laufzeitvariable `MCP_API_KEY` gesetzt werden. Beispiel für einen lokalen MCP-Client:

```json
{
  "url": "http://127.0.0.1:3000/api/mcp",
  "headers": {
    "Authorization": "Bearer <MCP_API_KEY>"
  }
}
```

Der Server stellt `list_stocks`, `get_stock`, `add_stock`, `remove_stock`, `update_stock_analytics` und `refresh_stock_market_data` bereit. Hinzufügungen und Analytics-Änderungen erscheinen nach spätestens 60 Sekunden im geöffneten Dashboard; beim Neuladen sofort.

Alle schreibenden Eingabeschemas sind strikt und enthalten kein Feld für den aktuellen Marktpreis. Zusätzliche Felder wie `price` oder `currentPrice` werden abgewiesen. `add_stock` und `refresh_stock_market_data` beziehen den aktuellen Kurs ausschließlich serverseitig von Yahoo Finance. Fair Value sowie Kauf-, Halte- und Verkaufsschwellen sind bewusst editierbare Research-Annahmen und keine Marktpreise.

## Deployment

Die Produktionsanwendung läuft als Next.js-Node-Server auf Coolify. Sie nutzt
eine private PostgreSQL-Datenbank im gleichen Coolify-Netzwerk; der
`DATABASE_URL` wird ausschließlich als serverseitige Laufzeitvariable gesetzt.
`DASHBOARD_PASSWORD` ist in Produktion verpflichtend und wird ebenfalls nur als
verschlüsselte Coolify-Laufzeitvariable gesetzt; das lokale Testpasswort wird
außerhalb der Entwicklungsumgebung nicht akzeptiert.
Coolify prüft `/api/health`; der Endpunkt meldet nur dann HTTP 200, wenn die
Anwendung PostgreSQL erreichen kann.
