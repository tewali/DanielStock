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

### Täglicher Kursabgleich

Der geschützte Endpunkt `POST /api/cron/market-data` aktualisiert die aktuellen
Kurse aller im Cockpit beobachteten Titel sowie aller aktiven MCP-Titel. Er
akzeptiert ausschließlich `Authorization: Bearer <CRON_SECRET>`, nimmt keine
Kurswerte entgegen und bezieht die Preise immer direkt von Yahoo Finance.
Währungsabweichungen und Sprünge von mehr als 35 Prozent zum letzten Kurs werden
nicht in den Portfoliozustand übernommen.

In Coolify wird unter **Configuration → Scheduled Tasks** folgende Aufgabe
angelegt:

- Name: `Täglicher Kursabgleich`
- Command: `npm run cron:refresh-prices`
- Frequency: `0 7 * * *`
- Timeout: `300`

Coolify wertet den Ausdruck in der Zeitzone seines Servers aus. Für 07:00 Uhr
lokaler Zeit muss der Server auf `Europe/Madrid` stehen. Zusätzlich müssen
`APP_URL` und ein unabhängiges, langes `CRON_SECRET` als Laufzeitvariablen der
Anwendung gesetzt sein. Nach der Einrichtung sollte die Aufgabe einmal über
**Execute Now** getestet werden.

## MCP für die Portfolioverwaltung

Der Streamable-HTTP-Endpunkt liegt unter `/api/mcp` und verwendet OAuth 2.1 Authorization Code mit PKCE. ChatGPT entdeckt den Autorisierungsserver über RFC-9728-Metadaten, registriert sich dynamisch und öffnet anschließend die DanielStock-Freigabeseite. Das bestehende Dashboard-Passwort bestätigt dort den Zugriff. Access Tokens gelten eine Stunde; Refresh Tokens werden bei jeder Verwendung rotiert und nach 30 Tagen ungültig.

Für die Produktion müssen `APP_URL=https://danielstock.apps.tewali.de`, `DATABASE_URL`, `DASHBOARD_PASSWORD` und `CRON_SECRET` gesetzt sein. `MCP_API_KEY` ist nur noch eine optionale Übergangslösung für bereits verbundene Clients und kann entfernt werden, sobald diese auf OAuth umgestellt wurden.

In ChatGPT Desktop wird der Server als Streamable HTTP mit OAuth hinzugefügt:

```json
{
  "name": "DanielStock",
  "url": "https://danielstock.apps.tewali.de/api/mcp",
  "authentication": "OAuth"
}
```

Nach dem Speichern startet ChatGPT automatisch die Anmeldung. Auf der Freigabeseite wird ausschließlich das Dashboard-Passwort eingegeben; es wird niemals an ChatGPT übermittelt.

Der Server stellt neben der Titelverwaltung folgende Portfoliofunktionen bereit:

- Positionen und Auswertungen: `list_positions`, `get_portfolio_summary`,
  `get_performance`, `get_allocation` und `get_investment_opportunities`
- Transaktionen: `list_transactions`, `add_transaction`, `update_transaction`
  und `delete_transaction`
- CSV-Import mit Bestätigung: `preview_transaction_import` und
  `commit_transaction_import`
- Research und Watchlist: `add_research_note`, `list_research_notes`,
  `manage_watchlist` und `list_watchlist`
- Detaillierte Bewertungsmatrix: `get_stock_evaluation` und
  `update_stock_evaluation` für alle 14 Faktoren auf der Skala 1–6; der
  Durchschnitt wird serverseitig neu berechnet. `evaluationCoverage` macht
  sichtbar, ob eine Matrix vollständig, teilweise oder noch gar nicht bewertet
  ist.
- Portfolio-Regeln und Planung: `get_portfolio_settings`,
  `update_portfolio_settings`, `get_purchase_plan` und
  `run_portfolio_scenario`; Szenarien verändern weder gespeicherte Annahmen
  noch Yahoo-Kurse
- Screening und Methodik: `search_screening_universe`,
  `get_screening_stock` und `get_screening_methodology` für das vollständige
  250-Titel-Universum, Growing 50, Bewertungsdaten und Research-Regeln
- Historie und Audit: `get_price_history` liefert unveränderbare
  Yahoo-OHLCV-Tagesdaten, `list_change_history` die unveränderbare Historie
  von Aktien-, Transaktions-, Einstellungs-, Watchlist- und Research-Änderungen
- Kursbetrieb: `list_market_refreshes`, `retry_failed_refreshes` und
  `refresh_stock_market_data`

Die ursprünglichen Depotbestände werden einmalig als Eröffnungspositionen in
PostgreSQL angelegt. Da die Quelldaten keine historischen Anschaffungskosten
enthalten, bleiben Einstandspreis und darauf basierende Renditen für diese
Positionen ausdrücklich unbekannt, bis vollständige Transaktionen importiert
werden. Es werden keine Anschaffungspreise erfunden.

Der CSV-Import erwartet mindestens die Spalten `date`, `type` und `currency`.
Je nach Typ werden zusätzlich `ticker`, `quantity`, `execution_price` oder
`cash_amount` benötigt. Unterstützte Typen sind `opening`, `buy`, `sell`,
`dividend`, `fee`, `tax`, `deposit` und `withdrawal`. Optionale Spalten sind
`fees`, `notes` und `external_id`. Der Preview-Schritt verändert das Depot
nicht; erst ein separater Commit übernimmt eine fehlerfreie Vorschau. Doppelte
`external_id`-Werte oder identische CSV-Zeilen werden übersprungen.

Hinzufügungen und Analytics-Änderungen erscheinen nach spätestens 60 Sekunden
im geöffneten Dashboard; beim Neuladen sofort.

Alle schreibenden Eingabeschemas sind strikt und enthalten kein Feld für den aktuellen Marktpreis. Zusätzliche Felder wie `price` oder `currentPrice` werden abgewiesen. `add_stock` lädt automatisch den aktuellen Kurs und die tägliche Ein-Jahres-Historie; `refresh_stock_market_data` aktualisiert beides erneut. Diese Marktdaten kommen ausschließlich serverseitig von Yahoo Finance. Fair Value sowie Kauf-, Halte- und Verkaufsschwellen sind bewusst editierbare Research-Annahmen und keine Marktpreise.

Optionale Research- und Bewertungsfelder können über `clearFields` explizit
geleert werden; einzelne Matrixfaktoren über `clearScores`. Ein versehentlich
fehlendes Feld in einem Update löscht dagegen weiterhin keine Daten.

## Deployment

Die Produktionsanwendung läuft als schlankes, mehrstufig gebautes
Next.js-Standalone-Image auf Coolify. Sie nutzt
eine private PostgreSQL-Datenbank im gleichen Coolify-Netzwerk; der
`DATABASE_URL` wird ausschließlich als serverseitige Laufzeitvariable gesetzt.
`DASHBOARD_PASSWORD` ist in Produktion verpflichtend und wird ebenfalls nur als
verschlüsselte Coolify-Laufzeitvariable gesetzt; das lokale Testpasswort wird
außerhalb der Entwicklungsumgebung nicht akzeptiert.
Coolify prüft `/api/health`; der Endpunkt meldet nur dann HTTP 200, wenn die
Anwendung PostgreSQL erreichen kann.
