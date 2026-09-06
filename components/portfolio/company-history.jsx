'use client';

import { useEffect, useState } from 'react';

const labels = { buyback: 'Buybacks', insider: 'Insider', product: 'Produkte' };
const evidence = {
  reported: 'Berichtet',
  estimate: 'Schätzung',
  assumption: 'Annahme',
};
const basis = { revenue: 'Umsatz', units: 'Stückzahl', users: 'Nutzer' };
const types = {
  open_market: 'Börsentransaktion',
  exercise: 'Optionsausübung',
  planned: 'Geplanter Handel',
  other: 'Sonstige Transaktion',
};
const format = (value, unit = '') =>
  value === undefined
    ? '–'
    : `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2, notation: 'compact' }).format(value)} ${unit}`.trim();
const percent = (value) =>
  value === undefined
    ? '–'
    : `${(value * 100).toLocaleString('de-DE', { maximumFractionDigits: 2 })} %`;

export default function CompanyHistory({ ticker }) {
  const [kind, setKind] = useState('buyback');
  const [offset, setOffset] = useState(0);
  const [response, setResponse] = useState(null);
  const [retry, setRetry] = useState(0);
  const key = `${ticker}:${kind}:${offset}:${retry}`;
  useEffect(() => {
    const controller = new AbortController();
    fetch(
      `/api/fundamentals/${encodeURIComponent(ticker)}/company-history?kind=${kind}&offset=${offset}`,
      { signal: controller.signal, cache: 'no-store' },
    )
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setResponse({ key, data }))
      .catch((error) => {
        if (error.name !== 'AbortError') setResponse({ key, error: true });
      });
    return () => controller.abort();
  }, [ticker, kind, offset, key]);
  const current = response?.key === key ? response : null;
  return (
    <div className="fund-shell" style={{ overflowWrap: 'anywhere' }}>
      <h3 style={{ fontSize: 13 }}>Unternehmen im Zeitverlauf</h3>
      <div
        className="fund-toggle"
        style={{ marginTop: 10, width: 'fit-content', flexWrap: 'wrap' }}
      >
        {Object.entries(labels).map(([value, label]) => (
          <button
            key={value}
            aria-pressed={kind === value}
            className={kind === value ? 'active' : ''}
            style={{ minHeight: 44 }}
            onClick={() => {
              setKind(value);
              setOffset(0);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {!current && <output className="lbl">Historie wird geladen …</output>}
      {current?.error && (
        <p className="lbl">
          Historie nicht verfügbar.{' '}
          <button onClick={() => setRetry(retry + 1)}>Erneut versuchen</button>
        </p>
      )}
      {current?.data?.records.length === 0 && (
        <p className="fund-empty">
          Noch keine {labels[kind]}-Details gespeichert. Quelldaten können über
          MCP hinzugefügt werden.
        </p>
      )}
      {kind === 'buyback' && (
        <p className="lbl">
          Rückkaufdetails ergänzen die aggregierten Beträge in der
          Kapitalallokation.
        </p>
      )}
      {current?.data?.records.map((record) => (
        <article
          key={record.revision}
          style={{ padding: '12px 0', borderBottom: '1px solid #E2E6E1' }}
        >
          <div className="lbl">
            {record.periodStart ? `${record.periodStart} – ` : ''}
            {record.date}
          </div>
          {kind === 'buyback' && (
            <>
              <div style={{ fontWeight: 650 }}>
                {format(record.amount, record.currency)} zurückgekauft
              </div>
              <div className="lbl">
                {record.sharesRepurchased !== undefined &&
                  `${format(record.sharesRepurchased)} Aktien · `}
                {record.programName || 'Aktienrückkauf'}
              </div>
            </>
          )}
          {kind === 'insider' && (
            <>
              <div
                style={{
                  fontWeight: 650,
                  color: record.direction === 'buy' ? '#10684C' : '#98392D',
                }}
              >
                {record.direction === 'buy' ? 'Kauf' : 'Verkauf'} ·{' '}
                {record.insiderName}
              </div>
              <div>
                {format(record.shares)} Aktien
                {record.transactionValue !== undefined &&
                  ` · ${format(record.transactionValue, record.currency)}`}
              </div>
              <div className="lbl">
                {record.role && `${record.role} · `}
                {types[record.transactionType]}
                {record.filedAt && ` · Gemeldet ${record.filedAt}`}
              </div>
            </>
          )}
          {kind === 'product' && (
            <>
              <div style={{ fontWeight: 650 }}>
                {record.product}{' '}
                <span
                  className={`fund-tag ${record.evidence === 'assumption' ? 'assumption' : ''}`}
                >
                  {evidence[record.evidence]}
                </span>
              </div>
              <div className="lbl">
                {record.market} · {record.region} · Basis: {basis[record.basis]}
              </div>
              <div className="fund-kpis">
                {record.marketShare !== undefined && (
                  <div className="fund-kpi">
                    <div className="lbl">Marktanteil</div>
                    <strong>{percent(record.marketShare)}</strong>
                    <div
                      style={{ height: 5, background: '#E2E6E1', marginTop: 5 }}
                    >
                      <div
                        style={{
                          width: `${record.marketShare * 100}%`,
                          height: '100%',
                          background: '#27407F',
                        }}
                      />
                    </div>
                  </div>
                )}
                {record.growth !== undefined && (
                  <div className="fund-kpi">
                    <div className="lbl">
                      Wachstum ·{' '}
                      {record.growthComparison === 'yoy'
                        ? 'zum Vorjahr'
                        : 'zum Vorquartal'}
                    </div>
                    <strong>{percent(record.growth)}</strong>
                  </div>
                )}
              </div>
              {record.revenue !== undefined && (
                <div>Umsatz: {format(record.revenue, record.currency)}</div>
              )}
              {record.units !== undefined && (
                <div>
                  {basis[record.basis]}: {format(record.units)}
                </div>
              )}
            </>
          )}
          {record.notes && <p className="lbl">{record.notes}</p>}
          <a
            href={record.sourceUrl}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 11, color: '#27407F' }}
          >
            {record.sourceName} ↗
          </a>
        </article>
      ))}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 8,
        }}
      >
        {offset > 0 && (
          <button onClick={() => setOffset(Math.max(0, offset - 30))}>
            Neuere Einträge
          </button>
        )}
        {current?.data?.nextOffset !== null &&
          current?.data?.nextOffset !== undefined && (
            <button onClick={() => setOffset(current.data.nextOffset)}>
              Ältere Einträge
            </button>
          )}
      </div>
    </div>
  );
}
