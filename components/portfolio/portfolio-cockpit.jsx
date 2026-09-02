"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  BadgeDollarSign, BarChart3, Briefcase, Check, ClipboardList,
  Clock3, Copy, Database, Eye, LayoutDashboard, Plug, RefreshCw,
  Settings, SlidersHorizontal, Sparkles, Target, TrendingUp, X,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import portfolioArtifactData from "@/lib/portfolio-artifact-data.json";

const D = portfolioArtifactData;

/* ── Tokens ───────────────────────────────────────────────────────────── */
const T = {
  paper: "#EDEFEA",
  panel: "#FFFFFF",
  ink: "#17211E",
  muted: "#5F6C68",
  faint: "#8A958F",
  line: "#D5DAD3",
  buy: "#10684C",
  hold: "#46595F",
  reduce: "#A96F16",
  sell: "#98392D",
  accent: "#27407F",
  buyBg: "#DCEBE2",
  holdBg: "#E4E8E7",
  reduceBg: "#F3E7D0",
  sellBg: "#F1DDD8",
};

const STATUS = {
  NACHKAUFEN: { c: T.buy, bg: T.buyBg },
  KAUFEN: { c: T.buy, bg: T.buyBg },
  "STARK KAUFEN": { c: T.buy, bg: T.buyBg },
  HALTEN: { c: T.hold, bg: T.holdBg },
  REDUZIEREN: { c: T.reduce, bg: T.reduceBg },
  VERKAUFEN: { c: T.sell, bg: T.sellBg },
  "VERKAUF PRÜFEN": { c: T.sell, bg: T.sellBg },
  "NICHT AUFSTOCKEN": { c: T.reduce, bg: T.reduceBg },
  ÜBERGEWICHTET: { c: T.reduce, bg: T.reduceBg },
  "ÜBERGEWICHTET / CALL": { c: T.reduce, bg: T.reduceBg },
  "SPERRE: MAX": { c: T.reduce, bg: T.reduceBg },
  "WARTEN: ZIEL": { c: T.hold, bg: T.holdBg },
  WARTEN: { c: T.hold, bg: T.holdBg },
  PRÜFEN: { c: T.hold, bg: T.holdBg },
  PUT: { c: T.buy, bg: T.buyBg },
  "COVERED CALL": { c: T.reduce, bg: T.reduceBg },
};
const sc = (s) => STATUS[s] || { c: T.muted, bg: "#E9ECE9" };

const CSS = `
.ck { color:${T.ink}; background:linear-gradient(145deg, #F6F8F4 0%, ${T.paper} 48%, #E8ECE6 100%); font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size:14px; line-height:1.45; -webkit-font-smoothing:antialiased; }
.ck * { box-sizing:border-box; }
.ck .num { font-variant-numeric: tabular-nums; }
.ck .tick { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:12px; letter-spacing:-0.01em; }
.ck h1,.ck h2,.ck h3 { margin:0; font-weight:600; letter-spacing:-0.015em; }
.ck button { font:inherit; color:inherit; cursor:pointer; transition:background-color 140ms ease, border-color 140ms ease, color 140ms ease, transform 140ms ease; }
.ck button:active { transform:translateY(1px); }
.ck button:focus-visible, .ck input:focus-visible, .ck select:focus-visible, .ck [tabindex]:focus-visible { outline:2px solid ${T.accent}; outline-offset:2px; }
.ck table { width:100%; border-collapse:collapse; }
.ck th { text-align:left; font-weight:650; font-size:11px; letter-spacing:.025em; text-transform:uppercase; color:${T.muted}; padding:9px 10px; border-bottom:1px solid ${T.line}; white-space:nowrap; background:#FAFBF9; position:sticky; top:0; z-index:2; }
.ck th.s { cursor:pointer; user-select:none; }
.ck th.s:hover { color:${T.ink}; }
.ck td { padding:8px 10px; border-bottom:1px solid #EDF0EC; vertical-align:middle; }
.ck tbody tr:hover td { background:#F5F8F5; }
.ck tbody tr.sel td { background:#EEF2FB; }
.ck .r { text-align:right; }
.ck .scroll { min-width:0; max-width:100%; overflow:auto; overscroll-behavior:contain; scrollbar-gutter:stable; }
.ck .scroll::-webkit-scrollbar { width:10px; height:10px; }
.ck .scroll::-webkit-scrollbar-thumb { background:#C9D0C9; border-radius:6px; border:3px solid ${T.paper}; }
.ck input[type=number], .ck input[type=text], .ck select { border:1px solid ${T.line}; background:${T.panel}; border-radius:7px; padding:5px 8px; font-variant-numeric:tabular-nums; }
.ck input[type=range] { accent-color:${T.accent}; width:100%; }
.ck .navbtn { display:flex; align-items:center; gap:9px; width:100%; text-align:left; background:none; border:1px solid transparent; padding:9px 10px; color:${T.muted}; border-radius:8px; }
.ck .navbtn svg { width:16px; height:16px; flex:0 0 auto; }
.ck .navbtn:hover { color:${T.ink}; background:rgba(255,255,255,.58); }
.ck .navbtn[aria-current=true] { color:${T.accent}; border-color:rgba(39,64,127,.12); background:${T.panel}; box-shadow:0 5px 18px rgba(23,33,30,.06); font-weight:650; }
.ck .pill { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700; letter-spacing:.01em; white-space:nowrap; }
.ck .panel { background:${T.panel}; border:1px solid ${T.line}; border-radius:10px; box-shadow:0 7px 24px rgba(23,33,30,.045); overflow:hidden; }
.ck .panel.scroll { overflow:auto; }
.ck .lbl { font-size:11.5px; color:${T.muted}; }
.ck .dot { transition: r 120ms ease; }
.ck .app-header { background:rgba(255,255,255,.88) !important; backdrop-filter:blur(14px); box-shadow:0 1px 0 rgba(23,33,30,.03); }
.ck .brand { display:flex; align-items:center; gap:10px; }
.ck .brand-mark { display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:9px; background:${T.accent}; color:white; box-shadow:0 7px 18px rgba(39,64,127,.22); }
.ck .brand-mark svg { width:18px; height:18px; }
.ck .syncbtn { display:inline-flex; align-items:center; gap:6px; border-radius:7px !important; background:#F7F9F7 !important; }
.ck .syncbtn:hover { border-color:#AEB8AE !important; background:#F0F3EF !important; }
.ck .syncbtn svg { width:14px; height:14px; }
.ck .status-dot { width:7px; height:7px; border-radius:50%; background:${T.hold}; box-shadow:0 0 0 3px ${T.holdBg}; flex:0 0 auto; }
.ck .status-dot.connected { background:${T.buy}; box-shadow:0 0 0 3px ${T.buyBg}; }
.ck .status-dot.offline { background:${T.reduce}; box-shadow:0 0 0 3px ${T.reduceBg}; }
.ck .market-progress { height:6px; overflow:hidden; background:#E4E8E3; border-radius:999px; }
.ck .market-progress::after { content:""; display:block; width:38%; height:100%; border-radius:inherit; background:${T.accent}; animation:market-progress 1.15s ease-in-out infinite; }
@keyframes market-progress { from { transform:translateX(-105%); } to { transform:translateX(365%); } }
.ck .scenario { margin:0 20px 13px; padding:10px 12px !important; border:1px solid ${T.line}; border-radius:9px; background:#F8FAF7; }
.ck .rail { background:rgba(235,239,233,.82); padding:18px 10px !important; }
.ck .app-main { width:100%; max-width:1640px; margin:0 auto; }
.ck .section-head h2 { font-size:16px !important; }
.ck .kpi-grid { gap:10px; border:0 !important; background:transparent !important; box-shadow:none !important; overflow:visible !important; }
.ck .kpi { border:1px solid ${T.line} !important; border-radius:10px; background:${T.panel}; box-shadow:0 7px 24px rgba(23,33,30,.045); }
.ck .kpi:first-child { background:linear-gradient(145deg, #FFFFFF 0%, #F2F5FA 100%); border-color:#D6DDEA !important; }
.ck .drawer-backdrop { position:fixed; inset:0; z-index:39; border:0; background:rgba(17,25,22,.25); backdrop-filter:blur(2px); }
.ck .drawer-backdrop:active { transform:none; }
.ck .drawer { border-radius:14px 0 0 14px; overflow:hidden; animation:drawer-in 180ms ease-out; }
.ck .settings-button { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; margin-left:auto; border:1px solid ${T.line}; border-radius:9px; background:#F7F9F7; position:relative; }
.ck .settings-button:hover { background:#EEF2EE; border-color:#AEB8AE; }
.ck .settings-button svg { width:18px; height:18px; }
.ck .settings-button .status-dot { position:absolute; right:3px; bottom:3px; width:6px; height:6px; box-shadow:0 0 0 2px ${T.panel}; }
.ck .settings-backdrop { position:fixed; inset:0; z-index:49; border:0; background:rgba(17,25,22,.34); backdrop-filter:blur(3px); }
.ck .settings-backdrop:active { transform:none; }
.ck .settings-modal { position:fixed; z-index:50; top:50%; left:50%; width:min(620px, calc(100vw - 32px)); max-height:min(760px, calc(100dvh - 32px)); margin:0; padding:0; transform:translate(-50%,-50%); display:flex; flex-direction:column; color:inherit; background:${T.panel}; border:1px solid ${T.line}; border-radius:16px; box-shadow:0 24px 80px rgba(17,25,22,.22); overflow:hidden; animation:settings-in 160ms ease-out; }
.ck .settings-modal-header { display:flex; align-items:center; gap:12px; padding:16px 18px; border-bottom:1px solid ${T.line}; }
.ck .settings-modal-body { padding:16px 18px 22px; overflow:auto; }
.ck .settings-card { padding:14px; border:1px solid ${T.line}; border-radius:11px; background:#FAFBF9; }
.ck .settings-card + .settings-card { margin-top:12px; }
.ck .settings-card-head { display:flex; align-items:flex-start; gap:10px; margin-bottom:10px; }
.ck .settings-card-head > svg { width:18px; height:18px; margin-top:1px; color:${T.accent}; flex:0 0 auto; }
.ck .settings-action { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:38px; padding:7px 11px; border:1px solid ${T.line}; border-radius:8px; background:${T.panel}; }
.ck .settings-action:hover { border-color:#AEB8AE; background:#F3F6F2; }
.ck .settings-action svg { width:14px; height:14px; }
.ck .settings-code { display:flex; align-items:center; gap:8px; margin-top:9px; padding:8px 9px; border:1px solid ${T.line}; border-radius:8px; background:${T.panel}; }
.ck .settings-code code { min-width:0; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11.5px; }
.ck .refresh-overview { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; margin:10px 0; }
.ck .refresh-metric { padding:9px 8px; border:1px solid ${T.line}; border-radius:8px; background:${T.panel}; text-align:center; }
.ck .refresh-metric strong { display:block; font-size:18px; line-height:1.15; }
.ck .refresh-history { display:grid; gap:7px; }
.ck .refresh-run { border:1px solid ${T.line}; border-radius:8px; background:${T.panel}; overflow:hidden; }
.ck .refresh-run summary { display:flex; align-items:center; gap:8px; padding:9px 10px; cursor:pointer; list-style:none; }
.ck .refresh-run summary::-webkit-details-marker { display:none; }
.ck .refresh-run summary::after { content:"⌄"; margin-left:auto; color:${T.muted}; font-size:16px; transition:transform 140ms ease; }
.ck .refresh-run[open] summary::after { transform:rotate(180deg); }
.ck .refresh-run-body { padding:0 10px 10px; border-top:1px solid #EDF0EC; }
.ck .refresh-group { margin-top:9px; }
.ck .refresh-tickers { display:flex; flex-wrap:wrap; gap:5px; margin-top:5px; }
.ck .refresh-chip { display:inline-flex; align-items:center; padding:2px 6px; border-radius:6px; background:#EDF3EF; color:${T.buy}; font:11px ui-monospace,SFMono-Regular,Menlo,monospace; }
.ck .refresh-problem { display:grid; grid-template-columns:78px minmax(0,1fr); gap:8px; padding:5px 0; border-bottom:1px solid #EDF0EC; font-size:11.5px; }
.ck .refresh-problem:last-child { border-bottom:0; }
.ck .refresh-problem .tick { color:${T.ink}; }
.ck .refresh-empty { padding:10px 0; color:${T.muted}; font-size:12.5px; }
@keyframes settings-in { from { transform:translate(-50%,-47%); opacity:.65; } to { transform:translate(-50%,-50%); opacity:1; } }
@keyframes drawer-in { from { transform:translateX(20px); opacity:.6; } to { transform:translateX(0); opacity:1; } }
@media (prefers-reduced-motion: reduce) { .ck * { transition:none !important; animation:none !important; } }
@media (max-width: 820px) {
  .ck { width:100%; max-width:100%; min-height:100dvh !important; overflow-x:clip; font-size:13.5px; }
  .ck .app-header,.ck .app-shell,.ck .app-main { width:100%; min-width:0; max-width:100%; }
  .ck .app-main > *,.ck section,.ck section > * { min-width:0; max-width:100%; }
  .ck .panel { min-width:0; max-width:100%; overflow-wrap:anywhere; }
  .ck .app-header { position:relative; }
  .ck .topbar { align-items:flex-start !important; gap:8px 10px !important; padding:12px 12px 10px !important; }
  .ck .topbar h1 { font-size:19px !important; }
  .ck .brand { flex:1 1 auto; min-width:0; }
  .ck .topbar-meta { flex:1 1 calc(100% - 130px); line-height:1.35; }
  .ck .syncbtn { min-height:38px; padding:7px 10px !important; }
  .ck .storagebar { width:100%; margin-left:0 !important; justify-content:space-between; flex-wrap:wrap; gap:7px !important; }
  .ck .storagebar button { min-height:38px; }
  .ck .scenario { display:grid !important; grid-template-columns:auto minmax(0,1fr) auto; gap:8px 10px !important; margin:0 12px 12px; padding:10px 12px 12px !important; }
  .ck .scenario-label { width:auto !important; align-self:center; }
  .ck .scenario input[type=range] { max-width:none !important; min-height:34px; }
  .ck .scenario-value { width:auto !important; align-self:center; }
  .ck .scenario-note { grid-column:1 / -1; }
  .ck .app-shell { flex-direction:column; align-items:stretch !important; min-width:0; }
  .ck .cols2 { width:100%; grid-template-columns:minmax(0,1fr) !important; gap:14px !important; }
  .ck .cols2 > * { min-width:0; max-width:100%; }
  .ck .rail { position:fixed !important; top:auto !important; left:0; right:auto; bottom:0; z-index:30; width:100vw !important; min-width:0 !important; max-width:100vw; height:auto !important; flex:none !important; display:flex !important; overflow-x:auto; overflow-y:hidden; overscroll-behavior-inline:contain; padding:6px 8px calc(6px + env(safe-area-inset-bottom)) !important; border-right:0 !important; border-top:1px solid ${T.line}; border-bottom:0; background:rgba(255,255,255,.94); backdrop-filter:blur(18px); box-shadow:0 -8px 30px rgba(23,33,30,.08); scrollbar-width:none; }
  .ck .rail::-webkit-scrollbar { display:none; }
  .ck .rail .navbtn { width:68px; min-height:54px; flex:0 0 68px; display:flex; flex-direction:column; justify-content:center; gap:3px; padding:5px 4px; border:1px solid transparent; border-radius:9px; white-space:nowrap; font-size:9.5px; text-align:center; }
  .ck .rail .navbtn svg { width:18px; height:18px; }
  .ck .rail .navbtn[aria-current=true] { border-color:rgba(39,64,127,.12); background:#EDF1F8; box-shadow:none; }
  .ck .app-main { flex:none !important; padding:14px 12px 108px !important; overflow-x:clip; }
  .ck section { margin-bottom:20px !important; }
  .ck .section-head { align-items:flex-start !important; flex-direction:column; gap:8px !important; }
  .ck .section-head > * { max-width:100%; }
  .ck .kpi { flex:1 1 50% !important; min-width:50% !important; padding:11px 12px !important; border-bottom:1px solid ${T.line}; }
  .ck .kpi .num { font-size:18px !important; }
  .ck .ladder { width:100%; max-width:100%; contain:inline-size; overflow-x:auto; overflow-y:hidden; -webkit-overflow-scrolling:touch; }
  .ck .ladder svg { width:720px !important; min-width:720px; max-width:none; }
  .ck .panel.scroll { max-height:calc(100dvh - 205px) !important; }
  .ck .scroll { -webkit-overflow-scrolling:touch; overscroll-behavior-inline:contain; }
  .ck .scroll table { min-width:760px; }
  .ck th,.ck td { padding:8px 9px; }
  .ck tbody tr { min-height:44px; }
  .ck input[type=number], .ck input[type=text], .ck select { min-height:40px; font-size:16px; }
  .ck input[type=checkbox] { width:20px; height:20px; }
  .ck .drawer { width:100vw !important; max-width:none !important; border-left:0 !important; border-radius:0 !important; box-shadow:none !important; }
  .ck .drawer-backdrop { display:none; }
  .ck .drawer > div:first-child { padding:12px 14px !important; }
  .ck .drawer > div:first-child button { min-width:44px; min-height:44px; font-size:24px !important; }
  .ck .drawer .scroll { padding:12px 14px 28px !important; }
  .ck .settings-modal { width:100vw; max-height:none; height:100dvh; border:0; border-radius:0; }
  .ck .settings-modal-body { padding:14px 12px calc(28px + env(safe-area-inset-bottom)); }
  .ck .refresh-problem { grid-template-columns:68px minmax(0,1fr); }
}
@media (max-width: 480px) {
  .ck .kpi { flex-basis:100% !important; min-width:100% !important; border-right:0 !important; }
  .ck .topbar-meta { flex-basis:100%; }
  .ck .syncbtn { width:100%; }
  .ck .scenario { grid-template-columns:1fr auto; }
  .ck .scenario-label { grid-column:1 / -1; }
  .ck .scenario input[type=range] { grid-column:1; }
  .ck .scenario-value { grid-column:2; }
  .ck section [style*="grid-template-columns"] { grid-template-columns:minmax(0,1fr) !important; }
  .ck .drawer [style*="grid-template-columns"] { grid-template-columns:minmax(0,1fr) !important; }
  .ck .settings-code { align-items:stretch; flex-direction:column; }
  .ck .settings-code .settings-action { width:100%; }
}
`;

/* ── Formatting ───────────────────────────────────────────────────────── */
const nf = (n, d = 2) =>
  n === null || n === undefined || Number.isNaN(n)
    ? "–"
    : n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
const eur = (n, d = 0) => (n === null || n === undefined ? "–" : nf(n, d) + " €");
const pct = (n, d = 1) => (n === null || n === undefined || Number.isNaN(n) ? "–" : (n * 100).toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d }) + " %");
const sgn = (n, d = 1) => (n > 0 ? "+" : "") + pct(n, d);
const price = (n, c) => (n >= 100 ? nf(n, 0) : n >= 1 ? nf(n, 2) : nf(n, 3)) + (c ? " " + c : "");

function mergeManagedData(managedStocks) {
  if (!managedStocks.length) return D;
  const removed = new Set(managedStocks.filter((s) => s.isRemoved).map((s) => s.ticker));
  const active = new Map(managedStocks.filter((s) => !s.isRemoved).map((s) => [s.ticker, s]));
  const overlay = (base, stock) => ({
    ...base,
    name: stock.name ?? base.name,
    ccy: stock.marketCurrency ?? stock.currency ?? base.ccy,
    price: stock.currentMarketPrice ?? base.price,
    quality: stock.quality ?? base.quality,
    moat: stock.moat ?? base.moat,
    score: stock.score ?? base.score,
    fv: stock.fairValue ?? base.fv,
    buy: stock.buyBelow ?? base.buy,
    hold: stock.holdBelow ?? base.hold,
    sell: stock.sellAbove ?? base.sell,
    g: stock.expectedGrowth ?? base.g,
    src: stock.researchSource ?? base.src,
    managed: true,
  });
  const valuation = D.valuation
    .filter((item) => !removed.has(item.ticker))
    .map((item) => active.has(item.ticker) ? overlay(item, active.get(item.ticker)) : item);
  const existing = new Set(valuation.map((item) => item.ticker));
  active.forEach((stock, ticker) => {
    if (existing.has(ticker) || !stock.currentMarketPrice) return;
    const fair = stock.fairValue ?? stock.currentMarketPrice;
    valuation.push(overlay({
      ticker,
      name: stock.name ?? ticker,
      ccy: stock.marketCurrency ?? stock.currency ?? "USD",
      price: stock.currentMarketPrice,
      quality: stock.quality ?? 0,
      moat: stock.moat ?? 0,
      score: stock.score ?? stock.quality ?? 0,
      fv: fair,
      buy: stock.buyBelow ?? fair * 0.8,
      hold: stock.holdBelow ?? fair * 1.1,
      sell: stock.sellAbove ?? fair * 1.3,
      g: stock.expectedGrowth ?? 0,
      src: stock.researchSource ?? "#",
    }, stock));
  });
  const matrix = { ...D.matrix };
  active.forEach((stock, ticker) => {
    if (!stock.thesis && !stock.risk && !stock.researchDate) return;
    matrix[ticker] = {
      ...matrix[ticker],
      thesis: stock.thesis ?? matrix[ticker]?.thesis,
      risk: stock.risk ?? matrix[ticker]?.risk,
      date: stock.researchDate ?? matrix[ticker]?.date,
    };
  });
  const addedUniverse = [...active.values()]
    .filter((stock) => !D.universe.some((item) => item.ticker === stock.ticker))
    .map((stock) => ({
      u: "MCP",
      ticker: stock.ticker,
      name: stock.name ?? stock.ticker,
      region: stock.region ?? "–",
      sector: stock.sector ?? "–",
      q: stock.quality ?? stock.score ?? 0,
      verdict: "MCP",
      moat: stock.thesis ?? "MCP-verwalteter Titel",
    }));
  return {
    ...D,
    valuation,
    portfolio: D.portfolio.filter((item) => !removed.has(item.ticker)),
    watch: D.watch.filter((item) => !removed.has(item.ticker)),
    gcp: D.gcp.filter((item) => !removed.has(item.ticker)),
    grow: D.grow.filter((item) => !removed.has(item.ticker)),
    universe: [...D.universe.filter((item) => !removed.has(item.ticker)), ...addedUniverse],
    matrix,
  };
}

/* ── Model engine ─────────────────────────────────────────────────────── */
const DEFAULTS = {
  eurusd: D.rules["EUR je USD"],
  optionsCash: D.rules["Options-Cash EUR"],
  cash: D.planParams.cash,
  minQ: D.rules["Mindest-Qualität"],
  minMoat: D.rules["Mindest-Moat"],
  maxWatch: D.rules["Maximale Watchlist"],
  t90: D.rules["Max-Gewicht Qualität ≥90"],
  t85: D.rules["Max-Gewicht Qualität ≥85"],
  t80: D.rules["Max-Gewicht Qualität ≥80"],
  t70: D.rules["Max-Gewicht Qualität ≥70"],
  tRest: D.rules["Max-Gewicht sonst"],
  dayLimit: D.planParams.dayBudgetPct,
  reserve: D.planParams.reserve,
  trHigh: D.planParams.trHigh,
  trMid: D.planParams.trMid,
  trLow: D.planParams.trLow,
  maxBuys: D.planParams.maxBuys,
  minOrder: D.planParams.minOrder,
};

const maxWeightFor = (q, p) =>
  q === null || q === undefined ? p.tRest : q >= 90 ? p.t90 : q >= 85 ? p.t85 : q >= 80 ? p.t80 : q >= 70 ? p.t70 : p.tRest;

function useModel(state, data) {
  const { growth, prices, shock, mos, params: p } = state;
  const mkt = 1 + shock / 100;

  const valuation = useMemo(
    () =>
      data.valuation.map((v) => {
        const g = growth[v.ticker] ?? v.g;
        const f = Math.pow((1 + g) / (1 + v.g), 10);
        const buy = v.buy * f, hold = v.hold * f, sell = v.sell * f, fv = v.fv * f;
        const base = prices[v.ticker] ?? v.price;
        const px = base * mkt;
        const status = px <= buy ? "NACHKAUFEN" : px <= hold ? "HALTEN" : px >= sell ? "VERKAUFEN" : "REDUZIEREN";
        return {
          ...v, g, factor: f, fv, buy, hold, sell, px,
          mult: px / v.price,
          distBuy: px / buy - 1,
          distSell: sell / px - 1,
          status,
          edited: g !== v.g || base !== v.price,
          eligible: v.quality >= p.minQ && v.moat >= p.minMoat,
        };
      }),
    [data.valuation, growth, prices, mkt, p.minQ, p.minMoat]
  );

  const vmap = useMemo(() => Object.fromEntries(valuation.map((v) => [v.ticker, v])), [valuation]);

  const positions = useMemo(() => {
    const rows = data.portfolio.map((q) => {
      const v = vmap[q.ticker];
      const localBase = q.shares > 0 ? q.mv / q.shares : q.priceEur;
      const mult = v ? v.mult : ((prices[q.ticker] ?? localBase) / localBase) * mkt;
      return { ...q, mv: q.mv * mult, px: q.priceEur * mult, v, status: v ? v.status : q.statusFix || "PRÜFEN" };
    });
    const total = rows.reduce((a, r) => a + r.mv, 0);
    return rows.map((r) => {
      const w = r.mv / total;
      const maxW = maxWeightFor(r.quality, p);
      const us = r.ccy === "USD";
      const over = w > maxW * 1.25;
      let action;
      if (r.status === "PRÜFEN") action = "PRÜFEN";
      else if (r.status === "VERKAUFEN") action = "VERKAUF PRÜFEN";
      else if (over)
        action =
          r.status === "NACHKAUFEN" ? "NICHT AUFSTOCKEN"
          : r.status === "HALTEN" ? (r.shares >= 100 && us ? "ÜBERGEWICHTET / CALL" : "ÜBERGEWICHTET")
          : "REDUZIEREN";
      else action = r.status;

      let opt = "", contracts = 0, strike = null, bind = 0, gate = "";
      const buyT = r.v ? r.v.buy : null, sellT = r.v ? r.v.sell : null;
      if (r.status === "NACHKAUFEN" && w < maxW && us && buyT && (buyT * 100) / p.eurusd <= p.optionsCash) {
        opt = "PUT";
        contracts = 1;
        strike = r.cspStrike != null ? r.cspStrike : Math.floor(buyT / 5) * 5;
        bind = (strike * 100) / p.eurusd;
      } else if (over && r.status === "HALTEN" && r.shares >= 100 && us) {
        opt = "COVERED CALL";
        contracts = Math.floor(r.shares / 100);
        strike = sellT ? Math.round(sellT) : null;
      }
      if (opt) gate = r.ticker === "ADBE" ? "EVENT-GATE: Earnings 10.09." : "Live-Kette, Spread und OI prüfen";
      return { ...r, w, maxW, gap: w - maxW, action, opt, contracts, strike, bind, gate, us, buyT, sellT };
    }).sort((a, b) => b.mv - a.mv);
  }, [data.portfolio, vmap, mkt, p, prices]);

  const totals = useMemo(() => {
    const depot = positions.reduce((a, r) => a + r.mv, 0);
    const byAction = {};
    positions.forEach((r) => { byAction[r.status] = (byAction[r.status] || 0) + r.w; });
    const top5 = positions.slice(0, 5).reduce((a, r) => a + r.w, 0);
    return { depot, cash: p.cash, byAction, top5, largest: positions[0] };
  }, [positions, p.cash]);

  const gcRows = useMemo(
    () =>
      data.gcp.map((r0) => {
        const r = { ...r0, mosBuy: mos[r0.ticker] ?? r0.mosBuy };
        const meta = data.grow.find((g) => g.ticker === r.ticker) || {};
        const px = (prices[r0.ticker] ?? r.price) * mkt;
        const strong = r.fv * (1 - Math.max(r.mosStrong, r.mosBuy)), buy = r.fv * (1 - r.mosBuy), red = r.fv * (1 + r.prem);
        const signal = px <= strong ? "STARK KAUFEN" : px <= buy ? "KAUFEN" : px >= red ? "REDUZIEREN" : "HALTEN";
        return { ...r, px, strong, buy, red, signal, dist: px / buy - 1, score: meta.score, sector: meta.sector, region: meta.region, arche: meta.arche, dyn: meta.dyn, risk: meta.risk, lastSignal: meta.signal, g: meta.g };
      }),
    [data.gcp, data.grow, mkt, mos, prices]
  );

  const plan = useMemo(() => {
    const assets = totals.depot + p.cash;
    const trancheFor = (src, conf) => (src === "DEPOT" || conf === "Hoch" ? p.trHigh : conf === "Mittel" ? p.trMid : p.trLow);
    const cand = [];
    positions.forEach((r) => {
      if (!["NACHKAUFEN", "VERKAUFEN", "REDUZIEREN"].includes(r.status)) return;
      const conf = r.quality >= 85 ? "Hoch" : r.quality >= 75 ? "Mittel" : "Niedrig";
      cand.push({
        src: "DEPOT", ticker: r.ticker, name: r.name, signal: r.status, px: r.v ? r.v.px : r.px,
        ccy: r.v ? r.v.ccy : "EUR", dist: r.v ? r.v.distBuy : null, quality: r.quality, conf,
        cur: r.w, target: r.maxW * 0.8, max: r.maxW,
      });
    });
    gcRows.forEach((r) => {
      if (!["KAUFEN", "STARK KAUFEN", "REDUZIEREN"].includes(r.signal)) return;
      const conf = r.conf || "Mittel";
      cand.push({
        src: "GROWING 50", ticker: r.ticker, name: r.name, signal: r.signal, px: r.px, ccy: r.ccy,
        dist: r.dist, quality: r.score, conf, cur: 0,
        target: conf === "Hoch" ? 0.025 : conf === "Mittel" ? 0.02 : 0.0125,
        max: conf === "Hoch" ? 0.04 : conf === "Mittel" ? 0.03 : 0.02,
      });
    });

    const rank = { Hoch: 0, Mittel: 1, Niedrig: 2 };
    const sells = cand.filter((c) => ["VERKAUFEN", "REDUZIEREN"].includes(c.signal));
    const buys = cand.filter((c) => !["VERKAUFEN", "REDUZIEREN"].includes(c.signal));
    buys.sort((a, b) =>
      state.priority === "qualitaet" ? b.quality - a.quality
      : state.priority === "konfidenz" ? rank[a.conf] - rank[b.conf] || (a.dist ?? 9) - (b.dist ?? 9)
      : (a.dist ?? 9) - (b.dist ?? 9)
    );

    const budget = p.cash * p.dayLimit;
    let spent = 0, orders = 0;
    const rows = [...sells, ...buys].map((c) => {
      const isSell = ["VERKAUFEN", "REDUZIEREN"].includes(c.signal);
      let rule = isSell ? "VERKAUF PRÜFEN" : c.cur >= c.max ? "SPERRE: MAX" : c.cur >= c.target ? "WARTEN: ZIEL" : "KAUFEN";
      let base = 0, today = 0;
      if (rule === "KAUFEN") {
        base = Math.min(Math.max(0, (c.target - c.cur) * assets), assets * trancheFor(c.src, c.conf));
        const left = budget - spent;
        if (orders < p.maxBuys && left >= p.minOrder) {
          today = Math.min(base, left);
          if (today > 0) { spent += today; orders += 1; }
        }
      }
      return { ...c, rule, base, today };
    });
    return { rows, budget, spent, orders, assets };
  }, [positions, gcRows, p, totals.depot, state.priority]);

  const options = useMemo(() => positions.filter((r) => r.opt), [positions]);

  const checks = useMemo(() => {
    const wl = data.watch.filter((w) => w.quality >= p.minQ).length;
    const overBuys = plan.rows.filter((r) => r.today > 0 && r.cur >= r.max).length;
    const putCash = options.filter((o) => o.opt === "PUT").reduce((a, o) => a + o.bind, 0);
    return [
      { k: "Watchlist-Grenze", is: data.watch.length, soll: p.maxWatch, ok: data.watch.length <= p.maxWatch, note: "Harte Obergrenze" },
      { k: "Mindestqualität Watchlist", is: wl, soll: data.watch.length, ok: wl === data.watch.length, note: "Nur aktive Watchlist" },
      { k: "Options-Budget alle Puts", is: putCash, soll: p.optionsCash, ok: putCash <= p.optionsCash, note: "volle Cashdeckung", money: true },
      { k: "Tagesbudget eingehalten", is: plan.spent, soll: plan.budget, ok: plan.spent <= plan.budget + 0.01, note: "Vorgeschlagene Käufe ≤ Tagesbudget", money: true },
      { k: "Max. Käufe eingehalten", is: plan.orders, soll: p.maxBuys, ok: plan.orders <= p.maxBuys, note: "Anzahl Orders" },
      { k: "Keine Käufe über Max-Gewicht", is: overBuys, soll: 0, ok: overBuys === 0, note: "Heute EUR muss null sein" },
      { k: "Offene Depotbewertungen", is: positions.filter((r) => r.status === "PRÜFEN").length, soll: 0, ok: positions.every((r) => r.status !== "PRÜFEN"), note: "keine grauen Positionen" },
    ];
  }, [data.watch, plan, options, p, positions]);

  return { valuation, vmap, positions, totals, gcRows, plan, options, checks };
}

/* ── Small components ─────────────────────────────────────────────────── */
const Pill = ({ s }) => {
  if (!s) return null;
  const { c, bg } = sc(s);
  return <span className="pill" style={{ color: c, background: bg }}>{s}</span>;
};

const Lbl = ({ children }) => <div className="lbl">{children}</div>;

function Kpi({ label, value, sub, tone }) {
  return (
    <div className="kpi" style={{ padding: "12px 16px", borderRight: `1px solid ${T.line}`, flex: "1 1 150px", minWidth: 150 }}>
      <Lbl>{label}</Lbl>
      <div className="num" style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em", color: tone || T.ink, marginTop: 2 }}>{value}</div>
      {sub && <div className="lbl" style={{ marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* Price against its own zones: green ≤ Kauf, slate ≤ Halten, ochre bis Verkauf, rot darüber */
function Rail({ v, h = 8, showTicks = false }) {
  if (!v) return <div style={{ height: h }} />;
  const lo = Math.min(v.buy * 0.82, v.px * 0.96);
  const hi = Math.max(v.sell * 1.06, v.px * 1.04);
  const x = (n) => Math.max(0, Math.min(100, ((n - lo) / (hi - lo)) * 100));
  const seg = (a, b, col) => <div style={{ position: "absolute", left: x(a) + "%", width: Math.max(0, x(b) - x(a)) + "%", top: 0, bottom: 0, background: col }} />;
  return (
    <div style={{ position: "relative", height: h, background: "#EFF1EE", borderRadius: 1, minWidth: 90 }}>
      {seg(lo, v.buy, T.buyBg)}
      {seg(v.buy, v.hold, T.holdBg)}
      {seg(v.hold, v.sell, T.reduceBg)}
      {seg(v.sell, hi, T.sellBg)}
      <div style={{ position: "absolute", left: x(v.buy) + "%", top: -1, bottom: -1, width: 1, background: T.buy, opacity: 0.5 }} />
      <div style={{ position: "absolute", left: x(v.sell) + "%", top: -1, bottom: -1, width: 1, background: T.sell, opacity: 0.5 }} />
      <div
        title={"Kurs " + price(v.px, v.ccy)}
        style={{ position: "absolute", left: `calc(${x(v.px)}% - 1.5px)`, top: -3, bottom: -3, width: 3, background: sc(v.status).c, borderRadius: 1 }}
      />
      {showTicks && (
        <div className="num" style={{ position: "absolute", top: h + 3, left: 0, right: 0, display: "flex", justifyContent: "space-between", fontSize: 10.5, color: T.faint }}>
          <span>{price(v.buy, "")}</span><span>{price(v.hold, "")}</span><span>{price(v.sell, "")}</span>
        </div>
      )}
    </div>
  );
}

function WeightBar({ w, maxW }) {
  const scale = Math.max(w, maxW) * 1.25;
  const over = w > maxW;
  return (
    <div style={{ position: "relative", height: 8, background: "#EFF1EE", minWidth: 70 }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: (w / scale) * 100 + "%", background: over ? T.reduce : T.hold, opacity: over ? 0.75 : 0.55 }} />
      <div style={{ position: "absolute", left: (maxW / scale) * 100 + "%", top: -2, bottom: -2, width: 1, background: T.ink }} />
    </div>
  );
}

function SortTh({ id, sort, setSort, children, right, w }) {
  const active = sort.k === id;
  return (
    <th className="s" style={{ textAlign: right ? "right" : "left", width: w }} onClick={() => setSort({ k: id, d: active ? -sort.d : id === "name" || id === "ticker" ? 1 : -1 })}>
      {children}
      <span style={{ opacity: active ? 1 : 0.25 }}>{active ? (sort.d > 0 ? " ▲" : " ▼") : " ▵"}</span>
    </th>
  );
}

const useSorted = (rows, sort) =>
  useMemo(() => {
    const r = [...rows];
    r.sort((a, b) => {
      const x = a[sort.k], y = b[sort.k];
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === "string" ? x.localeCompare(y, "de") : x - y) * sort.d;
    });
    return r;
  }, [rows, sort]);

function Num({ value, onChange, step = 1, min, max, suffix, width = 78 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <input className="num" type="number" value={value} step={step} min={min} max={max} style={{ width }} onChange={(e) => onChange(e.target.value === "" ? "" : parseFloat(e.target.value))} />
      {suffix && <span className="lbl">{suffix}</span>}
    </span>
  );
}

function Section({ title, note, children, right }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <div className="section-head" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 8 }}>
        <div>
          <h2 style={{ fontSize: 15 }}>{title}</h2>
          {note && <div className="lbl" style={{ maxWidth: 78 + "ch", marginTop: 3 }}>{note}</div>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

/* ── Hero: distance to each title's own buy target ────────────────────── */
function Ladder({ rows, onPick, selected }) {
  const W = 1000, LO = -0.35, HI = 0.7;
  const lanes = [];
  const placed = useMemo(() => {
    const out = [];
    [...rows].sort((a, b) => a.distBuy - b.distBuy).forEach((r) => {
      const x = ((Math.max(LO, Math.min(HI, r.distBuy)) - LO) / (HI - LO)) * W;
      let lane = 0;
      while (lanes[lane] !== undefined && x - lanes[lane] < 62) lane++;
      lanes[lane] = x;
      out.push({ r, x, lane });
    });
    return out;
  }, [rows]);
  const rowsN = Math.max(...placed.map((p) => p.lane)) + 1;
  const H = 34 + rowsN * 21;
  const zeroX = ((0 - LO) / (HI - LO)) * W;
  const ticks = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];
  return (
    <div className="panel ladder" style={{ padding: "10px 12px 4px" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Abstand jedes Titels zu seinem Kaufziel">
        <rect x={0} y={16} width={zeroX} height={H - 30} fill={T.buyBg} opacity={0.55} />
        {ticks.map((t) => {
          const x = ((t - LO) / (HI - LO)) * W;
          return (
            <g key={t}>
              <line x1={x} x2={x} y1={16} y2={H - 14} stroke={t === 0 ? T.buy : T.line} strokeWidth={t === 0 ? 1.5 : 1} />
              <text x={x} y={11} textAnchor="middle" fontSize={10} fill={t === 0 ? T.buy : T.faint}>{(t * 100).toFixed(0)}%</text>
            </g>
          );
        })}
        {placed.map(({ r, x, lane }) => {
          const y = 30 + lane * 21;
          const on = selected === r.ticker;
          return (
            <g key={r.ticker} style={{ cursor: "pointer" }} onClick={() => onPick(r.ticker)}>
              <circle className="dot" cx={x} cy={y} r={on ? 5 : 3.5} fill={sc(r.status).c} />
              <text x={x + 7} y={y + 3.5} fontSize={11} fill={on ? T.ink : T.muted} fontWeight={on ? 700 : 500}>{r.ticker}</text>
              <title>{r.name + " · " + sgn(r.distBuy) + " zum Kaufziel · " + r.status}</title>
            </g>
          );
        })}
      </svg>
      <div className="lbl" style={{ padding: "2px 0 6px" }}>Links der Linie: Kurs unter deinem Kaufziel. Klick öffnet den Titel.</div>
    </div>
  );
}

/* ── View: Cockpit ────────────────────────────────────────────────────── */
function Cockpit({ m, open, selected, go }) {
  const { totals, positions, plan, checks, valuation } = m;
  const dist = ["NACHKAUFEN", "HALTEN", "REDUZIEREN", "VERKAUFEN", "PRÜFEN"].map((s) => ({ s, w: totals.byAction[s] || 0 })).filter((d) => d.w > 0);
  const buys = plan.rows.filter((r) => r.today > 0);
  return (
    <>
      <div className="panel kpi-grid" style={{ display: "flex", flexWrap: "wrap", marginBottom: 22 }}>
        <Kpi label="Depotwert" value={eur(totals.depot)} sub={"Cash " + eur(totals.cash)} />
        <Kpi label="Größte Position" value={pct(totals.largest.w)} sub={totals.largest.name} tone={totals.largest.w > totals.largest.maxW ? T.reduce : T.ink} />
        <Kpi label="Top-5-Gewicht" value={pct(totals.top5)} sub="fünf größte Positionen" />
        <Kpi label="Kaufsignale" value={valuation.filter((v) => v.status === "NACHKAUFEN").length + " von " + valuation.length} sub="Kurs in der Kaufzone" tone={T.buy} />
        <Kpi label="Heute vorgeschlagen" value={eur(plan.spent)} sub={buys.length + " Order(s) · Budget " + eur(plan.budget)} tone={plan.spent > 0 ? T.buy : T.muted} />
      </div>

      <Section title="Preis gegen deine eigenen Zonen" note="Jeder bewertete Titel nach Abstand zum Kaufziel. Wachstumsannahmen im Blatt Wachstum verschieben die Punkte sofort.">
        <Ladder rows={valuation} onPick={(t) => { open(t); }} selected={selected} />
      </Section>

      <div className="cols2" style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 22 }}>
        <Section title="Portfolio nach Bewertung" note="Gewichtsanteile je Signal.">
          <div style={{ display: "flex", height: 22, border: `1px solid ${T.line}` }}>
            {dist.map((d) => (
              <div key={d.s} title={d.s + " " + pct(d.w)} style={{ width: d.w * 100 + "%", background: sc(d.s).bg, borderRight: `1px solid ${T.panel}` }} />
            ))}
          </div>
          <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
            {dist.map((d) => (
              <div key={d.s} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 9, height: 9, background: sc(d.s).c, display: "inline-block" }} /> {d.s}
                </span>
                <span className="num">{pct(d.w)}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <Lbl>Größte Positionen gegen ihr Maximalgewicht</Lbl>
            <div className="scroll">
              <table style={{ marginTop: 6 }}>
                <tbody>
                  {positions.slice(0, 8).map((r) => (
                    <tr key={r.ticker} style={{ cursor: "pointer" }} onClick={() => open(r.ticker)}>
                      <td style={{ padding: "5px 8px 5px 0", width: 130 }}>{r.name}</td>
                      <td style={{ padding: "5px 8px 5px 0" }}><WeightBar w={r.w} maxW={r.maxW} /></td>
                      <td className="num r" style={{ padding: "5px 0", width: 100, color: r.w > r.maxW ? T.reduce : T.muted }}>
                        {pct(r.w)} / {pct(r.maxW)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        <Section title="Prüfungen" note="Laufen live gegen die aktuellen Annahmen.">
          <div className="panel">
            {checks.map((c) => (
              <div key={c.k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: `1px solid #EBEEEA` }}>
                <span style={{ width: 8, height: 8, borderRadius: 8, background: c.ok ? T.buy : T.sell, flex: "0 0 auto" }} />
                <span style={{ flex: 1 }}>{c.k}<span className="lbl"> · {c.note}</span></span>
                <span className="num" style={{ color: c.ok ? T.muted : T.sell }}>
                  {c.money ? eur(c.is) : nf(c.is, 0)} / {c.money ? eur(c.soll) : nf(c.soll, 0)}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <Lbl>Heute vorgeschlagene Tranchen</Lbl>
            {buys.length === 0 ? (
              <div style={{ padding: "10px 0", color: T.muted }}>Kein Kauf vorgeschlagen. Budget, Zielgewichte oder Annahmen im Kaufplan anpassen.</div>
            ) : (
              <div className="scroll">
                <table style={{ marginTop: 6 }}>
                  <tbody>
                    {buys.map((r) => (
                      <tr key={r.ticker}>
                        <td className="tick" style={{ padding: "5px 0", width: 74 }}>{r.ticker}</td>
                        <td style={{ padding: "5px 0" }}>{r.name}</td>
                        <td className="num r" style={{ padding: "5px 0", fontWeight: 600 }}>{eur(r.today)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button onClick={() => go("plan")} style={{ marginTop: 10, background: "none", border: `1px solid ${T.line}`, padding: "5px 10px", borderRadius: 3 }}>Kaufplan öffnen</button>
          </div>
        </Section>
      </div>
    </>
  );
}

/* ── View: Depot ──────────────────────────────────────────────────────── */
function Depot({ m, open, selected }) {
  const [sort, setSort] = useState({ k: "mv", d: -1 });
  const [f, setF] = useState("ALLE");
  const rows = useSorted(m.positions.filter((r) => f === "ALLE" || r.status === f), sort);
  const filters = ["ALLE", "NACHKAUFEN", "HALTEN", "REDUZIEREN", "VERKAUFEN", "PRÜFEN"];
  return (
    <Section
      title="Depot"
      note="Gewichtung zuerst: Die Bewertung sagt, ob ein Titel attraktiv ist – das Maximalgewicht sagt, ob du trotzdem nicht aufstocken solltest."
      right={
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {filters.map((x) => (
            <button key={x} onClick={() => setF(x)} style={{ border: `1px solid ${f === x ? T.ink : T.line}`, background: f === x ? T.ink : "transparent", color: f === x ? T.paper : T.muted, padding: "3px 8px", borderRadius: 3, fontSize: 12 }}>{x}</button>
          ))}
        </div>
      }
    >
      <div className="panel scroll" style={{ maxHeight: "62vh" }}>
        <table>
          <thead>
            <tr>
              <SortTh id="ticker" sort={sort} setSort={setSort} w={80}>Ticker</SortTh>
              <SortTh id="name" sort={sort} setSort={setSort}>Unternehmen</SortTh>
              <SortTh id="shares" sort={sort} setSort={setSort} right w={70}>Stück</SortTh>
              <SortTh id="mv" sort={sort} setSort={setSort} right w={104}>Marktwert</SortTh>
              <SortTh id="w" sort={sort} setSort={setSort} right w={72}>Gewicht</SortTh>
              <th style={{ width: 110 }}>gegen Max</th>
              <SortTh id="quality" sort={sort} setSort={setSort} right w={70}>Qualität</SortTh>
              <th style={{ width: 120 }}>Kurs in Zone</th>
              <SortTh id="status" sort={sort} setSort={setSort} w={112}>Bewertung</SortTh>
              <SortTh id="action" sort={sort} setSort={setSort} w={150}>Portfolio-Aktion</SortTh>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ticker} className={selected === r.ticker ? "sel" : ""} onClick={() => open(r.ticker)} style={{ cursor: "pointer" }}>
                <td className="tick">{r.ticker}</td>
                <td>{r.name}</td>
                <td className="num r">{nf(r.shares, 0)}</td>
                <td className="num r">{eur(r.mv)}</td>
                <td className="num r" style={{ color: r.w > r.maxW ? T.reduce : T.ink }}>{pct(r.w)}</td>
                <td><WeightBar w={r.w} maxW={r.maxW} /></td>
                <td className="num r">{nf(r.quality, 1)}</td>
                <td>{r.v ? <Rail v={r.v} /> : <span className="lbl">nicht modelliert</span>}</td>
                <td><Pill s={r.status} /></td>
                <td><Pill s={r.action} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ── View: Kaufzonen ──────────────────────────────────────────────────── */
function Zonen({ m, open, selected }) {
  const [sort, setSort] = useState({ k: "distBuy", d: 1 });
  const [onlyBuy, setOnlyBuy] = useState(false);
  const rows = useSorted(m.valuation.filter((v) => (!onlyBuy || v.status === "NACHKAUFEN") && v.eligible), sort);
  const excluded = m.valuation.filter((v) => !v.eligible);
  return (
    <Section
      title="Kaufzonen"
      note="Nur vollständig bewertete Titel oberhalb der Qualitäts- und Moat-Schwelle. Sortiert nach Abstand zum Kaufziel: negativ heißt, der Kurs ist bereits in der Zone."
      right={
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
          <input type="checkbox" checked={onlyBuy} onChange={(e) => setOnlyBuy(e.target.checked)} /> nur Kaufzone
        </label>
      }
    >
      <div className="panel scroll" style={{ maxHeight: "64vh" }}>
        <table>
          <thead>
            <tr>
              <SortTh id="ticker" sort={sort} setSort={setSort} w={80}>Ticker</SortTh>
              <SortTh id="name" sort={sort} setSort={setSort}>Unternehmen</SortTh>
              <SortTh id="quality" sort={sort} setSort={setSort} right w={66}>Qual.</SortTh>
              <SortTh id="moat" sort={sort} setSort={setSort} right w={62}>Moat</SortTh>
              <SortTh id="px" sort={sort} setSort={setSort} right w={92}>Kurs</SortTh>
              <SortTh id="buy" sort={sort} setSort={setSort} right w={86}>Kaufziel</SortTh>
              <SortTh id="sell" sort={sort} setSort={setSort} right w={86}>Verkauf ab</SortTh>
              <th style={{ width: 150 }}>Zone</th>
              <SortTh id="distBuy" sort={sort} setSort={setSort} right w={92}>Abstand Kauf</SortTh>
              <SortTh id="distSell" sort={sort} setSort={setSort} right w={96}>Puffer Verkauf</SortTh>
              <SortTh id="status" sort={sort} setSort={setSort} w={110}>Status</SortTh>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.ticker} className={selected === v.ticker ? "sel" : ""} onClick={() => open(v.ticker)} style={{ cursor: "pointer" }}>
                <td className="tick">{v.ticker}{v.edited && <span title="angepasste Annahme" style={{ color: T.accent }}> ●</span>}</td>
                <td>{v.name}</td>
                <td className="num r">{nf(v.quality, 1)}</td>
                <td className="num r">{nf(v.moat, 0)}</td>
                <td className="num r">{price(v.px, v.ccy)}</td>
                <td className="num r">{price(v.buy, "")}</td>
                <td className="num r">{price(v.sell, "")}</td>
                <td style={{ paddingBottom: 14 }}><Rail v={v} showTicks /></td>
                <td className="num r" style={{ color: v.distBuy <= 0 ? T.buy : T.ink, fontWeight: v.distBuy <= 0 ? 600 : 400 }}>{sgn(v.distBuy)}</td>
                <td className="num r" style={{ color: v.distSell < 0.1 ? T.sell : T.muted }}>{sgn(v.distSell)}</td>
                <td><Pill s={v.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {excluded.length > 0 && (
        <div className="lbl" style={{ marginTop: 8, maxWidth: "80ch" }}>
          Unter der Qualitäts- oder Moat-Schwelle und deshalb hier ausgeblendet: {excluded.map((e) => e.ticker).join(", ")}. Im Depot bleiben diese Titel sichtbar, für neue Käufe zählen sie nicht.
        </div>
      )}
    </Section>
  );
}

/* ── View: Wachstum (die einzige Modelleingabe) ───────────────────────── */
function Wachstum({ m, state, set, data }) {
  const [q, setQ] = useState("");
  const rows = m.valuation.filter((v) => (v.name + v.ticker).toLowerCase().includes(q.toLowerCase()));
  const nChanged = Object.keys(state.growth).length;
  return (
    <Section
      title="Wachstumsannahmen"
      note="Deine einzige Modelleingabe. Eine Änderung skaliert Fair Value, Kauf-, Halte- und Verkaufszone mit dem relativen Zehnjahres-Zinseszinseffekt; alle übrigen DCF-, Moat- und Risikoparameter bleiben konstant."
      right={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="text" placeholder="Titel suchen" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 150 }} />
          <button disabled={!nChanged} onClick={() => set({ growth: {} })} style={{ border: `1px solid ${T.line}`, background: "none", padding: "4px 9px", borderRadius: 3, opacity: nChanged ? 1 : 0.4 }}>
            {nChanged ? nChanged + " Annahme(n) zurücksetzen" : "keine Änderung"}
          </button>
        </div>
      }
    >
      <div className="panel scroll" style={{ maxHeight: "66vh" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 78 }}>Ticker</th>
              <th>Unternehmen</th>
              <th className="r" style={{ width: 74 }}>Basis</th>
              <th style={{ width: 210 }}>Deine Annahme 10J</th>
              <th className="r" style={{ width: 74 }}>Faktor</th>
              <th className="r" style={{ width: 84 }}>Kaufziel</th>
              <th className="r" style={{ width: 84 }}>Halten bis</th>
              <th className="r" style={{ width: 84 }}>Verkauf ab</th>
              <th style={{ width: 112 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => {
              const base = data.valuation.find((x) => x.ticker === v.ticker);
              const baseStatus = (() => {
                const px = (state.prices[v.ticker] ?? base.price) * (1 + state.shock / 100);
                return px <= base.buy ? "NACHKAUFEN" : px <= base.hold ? "HALTEN" : px >= base.sell ? "VERKAUFEN" : "REDUZIEREN";
              })();
              const on = state.growth[v.ticker] !== undefined;
              return (
                <tr key={v.ticker}>
                  <td className="tick">{v.ticker}</td>
                  <td>{v.name}</td>
                  <td className="num r" style={{ color: T.muted }}>{pct(base.g, 1)}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="range" min={0} max={0.3} step={0.005} value={v.g}
                        onChange={(e) => set({ growth: { ...state.growth, [v.ticker]: parseFloat(e.target.value) } })}
                        aria-label={"Wachstum " + v.name}
                      />
                      <span className="num" style={{ width: 52, textAlign: "right", color: on ? T.accent : T.ink, fontWeight: on ? 600 : 400 }}>{pct(v.g, 1)}</span>
                      {on && (
                        <button title="zurücksetzen" onClick={() => { const g = { ...state.growth }; delete g[v.ticker]; set({ growth: g }); }} style={{ border: 0, background: "none", color: T.faint, padding: 0 }}>↺</button>
                      )}
                    </div>
                  </td>
                  <td className="num r" style={{ color: v.factor === 1 ? T.faint : T.accent }}>{nf(v.factor, 2)}×</td>
                  <td className="num r">{price(v.buy, "")}</td>
                  <td className="num r">{price(v.hold, "")}</td>
                  <td className="num r">{price(v.sell, "")}</td>
                  <td>
                    <Pill s={v.status} />
                    {v.status !== baseStatus && <span className="lbl" style={{ display: "block", color: T.accent }}>war {baseStatus}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="lbl" style={{ marginTop: 8, maxWidth: "80ch" }}>
        Die Annahmen sind subjektive Szenarioschätzungen, keine Prognosen. Kurse und Zonen bleiben Research-Urteile – kein Signal löst automatisch eine Order aus.
      </div>
    </Section>
  );
}

/* ── View: Optionen ───────────────────────────────────────────────────── */
function Optionen({ m, state, set, open }) {
  const p = state.params;
  const puts = m.options.filter((o) => o.opt === "PUT");
  const calls = m.options.filter((o) => o.opt === "COVERED CALL");
  const bound = puts.reduce((a, o) => a + o.bind, 0);
  return (
    <Section
      title="Puts und Covered Calls"
      note="Puts nur bei Kaufzone, Untergewicht und voller Cashdeckung. Calls nur bei Übergewicht, Halten-Signal und mindestens 100 Aktien. Vor jeder Order die Live-Kette prüfen."
    >
      <div className="panel" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 22, padding: "10px 14px", marginBottom: 14 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="lbl">Options-Cash</span>
          <Num value={p.optionsCash} step={1000} onChange={(v) => set({ params: { ...p, optionsCash: v || 0 } })} suffix="€" width={92} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="lbl">EUR je USD</span>
          <Num value={p.eurusd} step={0.005} onChange={(v) => set({ params: { ...p, eurusd: v || 1 } })} width={72} />
        </label>
        <div><span className="lbl">Gebundenes Cash </span><span className="num" style={{ fontWeight: 600, color: bound > p.optionsCash ? T.sell : T.ink }}>{eur(bound)}</span></div>
        <div><span className="lbl">Kandidaten </span><span className="num">{puts.length} Put · {calls.length} Call</span></div>
      </div>

      <div className="panel scroll">
        <table>
          <thead>
            <tr>
              <th style={{ width: 116 }}>Strategie</th>
              <th style={{ width: 78 }}>Ticker</th>
              <th>Unternehmen</th>
              <th className="r" style={{ width: 76 }}>Gewicht</th>
              <th className="r" style={{ width: 76 }}>Max</th>
              <th style={{ width: 106 }}>Bewertung</th>
              <th className="r" style={{ width: 80 }}>Strike</th>
              <th className="r" style={{ width: 80 }}>Kontrakte</th>
              <th className="r" style={{ width: 110 }}>Cashbindung</th>
              <th style={{ width: 210 }}>Gate</th>
            </tr>
          </thead>
          <tbody>
            {m.options.length === 0 && (
              <tr><td colSpan={10} style={{ padding: 18, color: T.muted }}>Aktuell kein Kandidat. Erst wenn ein Titel in seine Kaufzone fällt oder ein Übergewicht entsteht, erscheint hier eine Strategie.</td></tr>
            )}
            {m.options.map((o) => (
              <tr key={o.ticker} onClick={() => open(o.ticker)} style={{ cursor: "pointer" }}>
                <td><Pill s={o.opt} /></td>
                <td className="tick">{o.ticker}</td>
                <td>{o.name}</td>
                <td className="num r">{pct(o.w)}</td>
                <td className="num r" style={{ color: T.muted }}>{pct(o.maxW)}</td>
                <td><Pill s={o.status} /></td>
                <td className="num r">{o.strike != null ? nf(o.strike, 0) + " " + o.ccy : "–"}</td>
                <td className="num r">{o.contracts}</td>
                <td className="num r">{o.bind ? eur(o.bind) : "–"}</td>
                <td style={{ color: o.gate.startsWith("EVENT") ? T.sell : T.muted, fontSize: 12.5 }}>{o.gate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="lbl" style={{ marginTop: 10, maxWidth: "80ch" }}>
        Cash-secured heißt nicht risikolos: Bei einem Kurssturz kann ein Put fast den gesamten Strike verlieren, ein Covered Call begrenzt die Chance oberhalb des Strikes. Kandidaten sind ein Vorfilter – keine Order ohne Bid/Ask, Volumen, Open Interest, Earnings-Termin und Vertragsprüfung.
      </div>
    </Section>
  );
}

/* ── View: Kaufplan ───────────────────────────────────────────────────── */
function Kaufplan({ m, state, set, open }) {
  const p = state.params;
  const { rows, budget, spent, orders, assets } = m.plan;
  const upd = (k) => (v) => set({ params: { ...p, [k]: v === "" ? 0 : v } });
  return (
    <Section
      title="Kaufplan"
      note="Das Signal allein löst keinen Kauf aus: erst Bewertungszone, dann Zielgewicht, Konzentrationslimit, Cashreserve und Tagesbudget. Die Reihenfolge bestimmt, wer das Budget zuerst bekommt."
    >
      <div className="panel" style={{ padding: "12px 14px", marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))", gap: "12px 20px" }}>
        <label><Lbl>Cash</Lbl><Num value={p.cash} step={1000} onChange={upd("cash")} suffix="€" width={92} /></label>
        <label><Lbl>Tageslimit vom Cash</Lbl><Num value={+(p.dayLimit * 100).toFixed(2)} step={1} onChange={(v) => upd("dayLimit")((v || 0) / 100)} suffix="%" width={64} /></label>
        <label><Lbl>Max. Orders pro Tag</Lbl><Num value={p.maxBuys} step={1} min={0} onChange={upd("maxBuys")} width={56} /></label>
        <label><Lbl>Mindestorder</Lbl><Num value={p.minOrder} step={50} onChange={upd("minOrder")} suffix="€" width={78} /></label>
        <label><Lbl>Tranche hoch / mittel / niedrig</Lbl>
          <span style={{ display: "flex", gap: 5 }}>
            <Num value={+(p.trHigh * 100).toFixed(2)} step={0.05} onChange={(v) => upd("trHigh")((v || 0) / 100)} width={56} />
            <Num value={+(p.trMid * 100).toFixed(2)} step={0.05} onChange={(v) => upd("trMid")((v || 0) / 100)} width={56} />
            <Num value={+(p.trLow * 100).toFixed(2)} step={0.05} onChange={(v) => upd("trLow")((v || 0) / 100)} suffix="%" width={56} />
          </span>
        </label>
        <label><Lbl>Priorisierung</Lbl>
          <select value={state.priority} onChange={(e) => set({ priority: e.target.value })}>
            <option value="abstand">Abstand zum Kaufziel</option>
            <option value="qualitaet">Qualität</option>
            <option value="konfidenz">Konfidenz</option>
          </select>
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 22, marginBottom: 12, alignItems: "baseline" }}>
        <div><Lbl>Depot + Cash</Lbl><span className="num" style={{ fontSize: 17, fontWeight: 600 }}>{eur(assets)}</span></div>
        <div><Lbl>Tagesbudget</Lbl><span className="num" style={{ fontSize: 17, fontWeight: 600 }}>{eur(budget)}</span></div>
        <div><Lbl>Heute verplant</Lbl><span className="num" style={{ fontSize: 17, fontWeight: 600, color: spent > 0 ? T.buy : T.muted }}>{eur(spent)}</span><span className="lbl"> in {orders} Order(s)</span></div>
        <div><Lbl>Cashreserve nach Kauf</Lbl><span className="num" style={{ fontSize: 17, fontWeight: 600, color: p.cash - spent < p.cash * p.reserve ? T.sell : T.ink }}>{eur(p.cash - spent)}</span><span className="lbl"> Soll ≥ {eur(p.cash * p.reserve)}</span></div>
      </div>

      <div className="panel scroll" style={{ maxHeight: "56vh" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 34 }}>#</th>
              <th style={{ width: 96 }}>Quelle</th>
              <th style={{ width: 78 }}>Ticker</th>
              <th>Unternehmen</th>
              <th style={{ width: 106 }}>Signal</th>
              <th className="r" style={{ width: 92 }}>Abstand</th>
              <th className="r" style={{ width: 68 }}>Qual.</th>
              <th className="r" style={{ width: 76 }}>Gewicht</th>
              <th className="r" style={{ width: 76 }}>Ziel</th>
              <th style={{ width: 130 }}>Regel</th>
              <th className="r" style={{ width: 96 }}>Tranche</th>
              <th className="r" style={{ width: 96 }}>Heute</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.src + r.ticker} onClick={() => open(r.ticker)} style={{ cursor: "pointer" }}>
                <td className="num" style={{ color: T.faint }}>{i + 1}</td>
                <td className="lbl">{r.src}</td>
                <td className="tick">{r.ticker}</td>
                <td>{r.name}</td>
                <td><Pill s={r.signal} /></td>
                <td className="num r" style={{ color: r.dist != null && r.dist <= 0 ? T.buy : T.ink }}>{r.dist != null ? sgn(r.dist) : "–"}</td>
                <td className="num r">{r.quality != null ? nf(r.quality, 0) : "–"}</td>
                <td className="num r">{r.cur ? pct(r.cur) : "–"}</td>
                <td className="num r" style={{ color: T.muted }}>{pct(r.target)}</td>
                <td><Pill s={r.rule} /></td>
                <td className="num r" style={{ color: T.muted }}>{r.base ? eur(r.base) : "–"}</td>
                <td className="num r" style={{ fontWeight: r.today ? 700 : 400, color: r.today ? T.buy : T.faint }}>{r.today ? eur(r.today) : "0 €"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
        {D.planLegend.map(([k, v]) => (
          <div key={k} style={{ borderTop: `2px solid ${sc(k).c}`, paddingTop: 6 }}>
            <div style={{ fontWeight: 600, fontSize: 12.5, color: sc(k).c }}>{k}</div>
            <div className="lbl">{v}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── View: Watchlist & Universum ──────────────────────────────────────── */
function Watchlist({ data }) {
  const [tab, setTab] = useState("watch");
  const [q, setQ] = useState("");
  const [reg, setReg] = useState("ALLE");
  const [sort, setSort] = useState({ k: "q", d: -1 });
  const uni = data.universe;
  const regions = ["ALLE", ...Array.from(new Set(uni.map((u) => u.region).filter(Boolean))).sort()];
  const filtered = uni.filter((u) => (reg === "ALLE" || u.region === reg) && (u.name + u.ticker + (u.sector || "")).toLowerCase().includes(q.toLowerCase()));
  const uniSorted = useSorted(filtered, sort);
  const held = new Set(data.portfolio.map((p) => p.ticker));

  return (
    <Section
      title={tab === "watch" ? "Watchlist" : "Screening-Universum"}
      note={tab === "watch" ? "Mitgliedschaft ist preisunabhängig. „Ausstehend“ heißt nicht kaufen: Erst nach DCF, Szenarien und Sicherheitsmarge entsteht ein Kaufsignal." : "250 Titel aus den beiden Qualitätsscreens. Score ist ein Research-Urteil, kein Messwert – und enthält bewusst keine Bewertung."}
      right={
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {[["watch", "Watchlist 40"], ["uni", "Universum " + uni.length]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ border: `1px solid ${tab === k ? T.ink : T.line}`, background: tab === k ? T.ink : "transparent", color: tab === k ? T.paper : T.muted, padding: "3px 9px", borderRadius: 3, fontSize: 12 }}>{l}</button>
          ))}
          {tab === "uni" && (
            <>
              <input type="text" placeholder="suchen" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 140 }} />
              <select value={reg} onChange={(e) => setReg(e.target.value)}>{regions.map((r) => <option key={r}>{r}</option>)}</select>
            </>
          )}
        </div>
      }
    >
      {tab === "watch" ? (
        <div className="panel scroll" style={{ maxHeight: "66vh" }}>
          <table>
            <thead><tr><th style={{ width: 34 }}>#</th><th style={{ width: 96 }}>Ticker</th><th>Unternehmen</th><th className="r" style={{ width: 70 }}>Qualität</th><th style={{ width: 150 }}>Herkunft</th><th>Kern des Burggrabens</th><th style={{ width: 130 }}>Research</th></tr></thead>
            <tbody>
              {data.watch.map((w) => (
                <tr key={w.ticker}>
                  <td className="num" style={{ color: T.faint }}>{w.rank}</td>
                  <td className="tick">{w.ticker}</td>
                  <td>{w.name}</td>
                  <td className="num r" style={{ fontWeight: 600 }}>{nf(w.quality, 1)}</td>
                  <td className="lbl">{w.origin}</td>
                  <td style={{ color: T.muted, fontSize: 13 }}>{w.moat}</td>
                  <td className="lbl">{w.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel scroll" style={{ maxHeight: "66vh" }}>
          <table>
            <thead>
              <tr>
                <SortTh id="ticker" sort={sort} setSort={setSort} w={96}>Ticker</SortTh>
                <SortTh id="name" sort={sort} setSort={setSort}>Unternehmen</SortTh>
                <SortTh id="sector" sort={sort} setSort={setSort} w={150}>Sektor</SortTh>
                <SortTh id="region" sort={sort} setSort={setSort} w={110}>Region</SortTh>
                <SortTh id="q" sort={sort} setSort={setSort} right w={72}>Score</SortTh>
                <SortTh id="verdict" sort={sort} setSort={setSort} w={120}>Ergebnis</SortTh>
                <th>Kern des Burggrabens</th>
              </tr>
            </thead>
            <tbody>
              {uniSorted.map((u, i) => (
                <tr key={u.ticker + i}>
                  <td className="tick">{u.ticker}{held.has(u.ticker) && <span title="im Depot" style={{ color: T.buy }}> ◆</span>}</td>
                  <td>{u.name}</td>
                  <td className="lbl">{u.sector}</td>
                  <td className="lbl">{u.region}</td>
                  <td className="num r" style={{ fontWeight: 600 }}>{nf(u.q, 1)}</td>
                  <td className="lbl">{u.verdict}</td>
                  <td style={{ color: T.muted, fontSize: 13 }}>{u.moat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

/* ── View: Growing Compounders ────────────────────────────────────────── */
function Growing({ m, state, set }) {
  const [sort, setSort] = useState({ k: "dist", d: 1 });
  const [only, setOnly] = useState(false);
  const rows = useSorted(m.gcRows.filter((r) => !only || r.signal === "KAUFEN" || r.signal === "STARK KAUFEN"), sort);
  const [openRow, setOpenRow] = useState(null);
  return (
    <>
      <Section
        title="Growing Compounders"
        note="Qualitätskandidaten von morgen: Der Score misst, ob die Qualität schneller wächst als die Größe. Fair Value ist ein gerundeter Screening-Wert aus normalisierter Ertragskraft – kein vollständiger DCF. Die Sicherheitsmarge ist editierbar."
        right={<label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} /> nur Kaufsignale</label>}
      >
        <div className="panel scroll" style={{ maxHeight: "60vh" }}>
          <table>
            <thead>
              <tr>
                <SortTh id="ticker" sort={sort} setSort={setSort} w={88}>Ticker</SortTh>
                <SortTh id="name" sort={sort} setSort={setSort}>Unternehmen</SortTh>
                <SortTh id="sector" sort={sort} setSort={setSort} w={140}>Sektor</SortTh>
                <SortTh id="score" sort={sort} setSort={setSort} right w={64}>Score</SortTh>
                <SortTh id="px" sort={sort} setSort={setSort} right w={92}>Kurs</SortTh>
                <SortTh id="fv" sort={sort} setSort={setSort} right w={86}>Fair Value</SortTh>
                <th style={{ width: 132 }}>Sicherheitsmarge</th>
                <SortTh id="buy" sort={sort} setSort={setSort} right w={86}>Kaufpreis</SortTh>
                <SortTh id="dist" sort={sort} setSort={setSort} right w={88}>Abstand</SortTh>
                <SortTh id="signal" sort={sort} setSort={setSort} w={120}>Signal</SortTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ticker} onClick={() => setOpenRow(openRow === r.ticker ? null : r.ticker)} style={{ cursor: "pointer" }}>
                  <td className="tick">{r.ticker}</td>
                  <td>{r.name}</td>
                  <td className="lbl">{r.sector}</td>
                  <td className="num r" style={{ fontWeight: 600 }}>{nf(r.score, 0)}</td>
                  <td className="num r">{price(r.px, r.ccy)}</td>
                  <td className="num r">{price(r.fv, "")}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      className="num" type="number" step={5} min={0} max={90} value={+(r.mosBuy * 100).toFixed(0)} style={{ width: 62 }}
                      onChange={(e) => { const v = parseFloat(e.target.value); set({ mos: { ...state.mos, [r.ticker]: isNaN(v) ? 0 : v / 100 } }); }}
                      aria-label={"Sicherheitsmarge " + r.name}
                    /> <span className="lbl">%</span>
                  </td>
                  <td className="num r">{price(r.buy, "")}</td>
                  <td className="num r" style={{ color: r.dist <= 0 ? T.buy : T.ink, fontWeight: r.dist <= 0 ? 600 : 400 }}>{sgn(r.dist)}</td>
                  <td><Pill s={r.signal} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {openRow && (() => {
          const r = m.gcRows.find((x) => x.ticker === openRow);
          return (
            <div className="panel" style={{ padding: "12px 14px", marginTop: 10 }}>
              <div style={{ fontWeight: 600 }}>{r.name} <span className="tick" style={{ color: T.muted }}>{r.ticker}</span></div>
              <div className="lbl" style={{ marginTop: 2 }}>{r.arche} · {r.region} · Qualitätsdynamik {r.dyn} · Konfidenz {r.conf}</div>
              <div style={{ marginTop: 8, maxWidth: "78ch" }}>{r.lastSignal}</div>
              <div style={{ marginTop: 6, color: T.sell, maxWidth: "78ch" }}>Risiko: {r.risk}</div>
              <div className="lbl" style={{ marginTop: 6 }}>Methode: {r.method} · stark kaufen ab {price(r.strong, r.ccy)} · reduzieren ab {price(r.red, r.ccy)}</div>
            </div>
          );
        })()}
      </Section>

      <Section title="Prüfregeln" note="Was gemessen wird und wann ein Kandidat neu geprüft oder entfernt wird.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 14 }}>
          <div className="panel" style={{ padding: "10px 14px" }}>
            {D.gcConcept.factors.map(([f, pts, was, warn]) => (
              <div key={f} style={{ padding: "7px 0", borderBottom: `1px solid #EEF0EC` }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: 13 }}><span>{f}</span><span className="num" style={{ color: T.muted }}>{pts}</span></div>
                <div className="lbl">{was}</div>
                <div className="lbl" style={{ color: T.sell }}>Warnsignal: {warn}</div>
              </div>
            ))}
          </div>
          <div className="panel" style={{ padding: "10px 14px" }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Kill-Kriterien</div>
            <ol style={{ margin: 0, paddingLeft: 18, color: T.muted }}>
              {D.gcConcept.kill.map((k, i) => <li key={i} style={{ marginBottom: 6 }}>{k}</li>)}
            </ol>
            <div style={{ fontWeight: 600, fontSize: 13, margin: "12px 0 6px" }}>Quartalsworkflow</div>
            <ol style={{ margin: 0, paddingLeft: 18, color: T.muted }}>
              {D.gcConcept.workflow.map(([a, b], i) => <li key={i} style={{ marginBottom: 4 }}>{String(a).replace(/^\d+\.\s*/, "")}: {b}</li>)}
            </ol>
          </div>
        </div>
      </Section>
    </>
  );
}

/* ── View: Regeln ─────────────────────────────────────────────────────── */
function Regeln({ state, set, reset, m }) {
  const p = state.params;
  const upd = (k) => (v) => set({ params: { ...p, [k]: v === "" ? 0 : v } });
  const tiers = [["t90", "Qualität ≥ 90"], ["t85", "Qualität ≥ 85"], ["t80", "Qualität ≥ 80"], ["t70", "Qualität ≥ 70"], ["tRest", "darunter"]];
  return (
    <>
      <Section title="Regeln" note="Diese Werte begrenzen jede Entscheidung im Cockpit. Ändere sie hier, und alle Tabellen rechnen sofort neu.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          <div className="panel" style={{ padding: "12px 14px" }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Maximalgewicht je Position</div>
            {tiers.map(([k, l]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
                <span className="lbl">{l}</span>
                <Num value={+(p[k] * 100).toFixed(2)} step={0.25} onChange={(v) => upd(k)((v || 0) / 100)} suffix="%" width={64} />
              </div>
            ))}
          </div>
          <div className="panel" style={{ padding: "12px 14px" }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Aufnahme und Cash</div>
            {[["minQ", "Mindestqualität", 1, ""], ["minMoat", "Mindest-Moat", 1, ""], ["maxWatch", "Maximale Watchlist", 1, "Titel"], ["optionsCash", "Options-Cash", 1000, "€"], ["cash", "Cash", 1000, "€"], ["eurusd", "EUR je USD", 0.005, ""]].map(([k, l, st, sfx]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
                <span className="lbl">{l}</span>
                <Num value={p[k]} step={st} onChange={upd(k)} suffix={sfx} width={sfx === "€" ? 92 : 72} />
              </div>
            ))}
          </div>
          <div className="panel" style={{ padding: "12px 14px" }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Wirkung gerade jetzt</div>
            <div className="lbl">Positionen über Maximalgewicht</div>
            <div className="num" style={{ fontSize: 19, fontWeight: 600, color: m.positions.filter((r) => r.w > r.maxW).length ? T.reduce : T.buy }}>
              {m.positions.filter((r) => r.w > r.maxW).length} von {m.positions.length}
            </div>
            <div className="lbl" style={{ marginTop: 10 }}>Titel in der Kaufzone</div>
            <div className="num" style={{ fontSize: 19, fontWeight: 600, color: T.buy }}>{m.valuation.filter((v) => v.status === "NACHKAUFEN").length}</div>
            <div className="lbl" style={{ marginTop: 10 }}>Optionskandidaten</div>
            <div className="num" style={{ fontSize: 19, fontWeight: 600 }}>{m.options.length}</div>
            <button onClick={reset} style={{ marginTop: 14, border: `1px solid ${T.line}`, background: "none", padding: "6px 10px", borderRadius: 3 }}>Alle Eingaben auf Ausgangsstand zurücksetzen</button>
          </div>
        </div>
      </Section>

      <Section title="Archetypen und Frühindikatoren" note="Welcher Indikator einen Kandidaten zuerst verrät.">
        <div className="panel scroll">
          <table>
            <thead><tr><th style={{ width: 190 }}>Archetyp</th><th style={{ width: 300 }}>Primärer Frühindikator</th><th>Mindestprüfung</th></tr></thead>
            <tbody>{D.gcConcept.arche.map(([a, b, c]) => <tr key={a}><td style={{ fontWeight: 600 }}>{a}</td><td style={{ color: T.muted }}>{b}</td><td style={{ color: T.muted }}>{c}</td></tr>)}</tbody>
          </table>
        </div>
      </Section>

      <Section title="Evidenzbasis" note="Worauf die Qualitätslogik aufbaut – und wo ihre Grenze liegt.">
        <div className="panel" style={{ padding: "6px 14px 12px" }}>
          {D.gcConcept.evidence.map(([q, s, url]) => (
            <div key={q} style={{ padding: "9px 0", borderBottom: `1px solid #EEF0EC` }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{q}</div>
              <div className="lbl" style={{ maxWidth: "80ch" }}>{s}</div>
              {url && <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: T.accent }}>Quelle</a>}
            </div>
          ))}
          <div style={{ paddingTop: 10, color: T.muted, maxWidth: "80ch" }}>
            Scores sind strukturierte Research-Urteile, keine statistisch kalibrierten Kaufwahrscheinlichkeiten. Dieses Cockpit ist Entscheidungsunterstützung, keine Anlageberatung, und führt keine Order aus.
          </div>
        </div>
      </Section>
    </>
  );
}

/* ── Kursabgleich ─────────────────────────────────────────────────────── */
const QUOTE_UNIVERSE = (data) => {
  const list = [];
  const seen = new Set();
  data.valuation.forEach((v) => { seen.add(v.ticker); list.push({ ticker: v.ticker, name: v.name, ccy: v.ccy, base: v.price, group: "Bewertung" }); });
  data.portfolio.forEach((p) => {
    if (seen.has(p.ticker)) return;
    seen.add(p.ticker);
    if (p.ccy === "EUR") list.push({ ticker: p.ticker, name: p.name, ccy: "EUR", base: p.priceEur, group: "Depot" });
  });
  data.gcp.forEach((g) => { if (seen.has(g.ticker)) return; seen.add(g.ticker); list.push({ ticker: g.ticker, name: g.name, ccy: g.ccy, base: g.price, group: "Growing" }); });
  return list;
};

const DEV_LIMIT = 0.35;

function Kurse({ state, set, data }) {
  const uni = useMemo(() => QUOTE_UNIVERSE(data), [data]);
  const [scope, setScope] = useState("bewertung");
  const [running, setRunning] = useState(false);
  const [res, setRes] = useState({});
  const [err, setErr] = useState("");
  const [withFx, setWithFx] = useState(true);
  const [fxRes, setFxRes] = useState(null);

  const targets = uni.filter((u) =>
    scope === "bewertung" ? u.group !== "Growing" : scope === "growing" ? u.group === "Growing" : true
  );

  const run = async () => {
    setErr(""); setRes({}); setFxRes(null); setRunning(true);
    try {
      const symbols = targets.map((target) => target.ticker);
      if (withFx) symbols.push("EURUSD=X");
      const response = await fetch("/api/market-data/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbols }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Kursdienst nicht erreichbar");

      const add = {};
      (payload.quotes || []).forEach((quote) => {
        if (quote.ticker === "EURUSD=X") {
          if (quote.price > 0.5 && quote.price < 2) {
            setFxRes({
              rate: quote.price,
              asof: quote.priceAt,
              source: quote.source,
              delayMinutes: quote.delayMinutes,
            });
          }
          return;
        }
        const target = targets.find((item) => item.ticker === quote.ticker);
        if (!target || !(quote.price > 0)) return;
        const dev = quote.price / target.base - 1;
        const ccyOk = quote.currency === target.ccy;
        add[target.ticker] = {
          ...target,
          price: quote.price,
          dev,
          asof: quote.priceAt,
          fetchedAt: quote.fetchedAt,
          source: quote.source,
          exchange: quote.exchange,
          delayMinutes: quote.delayMinutes,
          marketState: quote.marketState,
          status: !ccyOk ? "waehrung" : Math.abs(dev) > DEV_LIMIT ? "abweichung" : "ok",
          returnedCcy: quote.currency,
          accept: ccyOk && Math.abs(dev) <= DEV_LIMIT,
        };
      });
      setRes(add);
      if (payload.errors?.length) {
        const first = payload.errors.slice(0, 3).map((item) => item.ticker).join(", ");
        setErr(`${payload.errors.length} Titel ohne Kurs${first ? ` (${first}${payload.errors.length > 3 ? ", …" : ""})` : ""}`);
      } else if (payload.cacheWarning) {
        setErr(`${payload.cacheWarning}; die Kurse können trotzdem übernommen werden`);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kursdienst nicht erreichbar");
    } finally {
      setRunning(false);
    }
  };

  const rows = Object.values(res).sort((a, b) => Math.abs(b.dev) - Math.abs(a.dev));
  const accepted = rows.filter((r) => r.accept);
  const apply = () => {
    const px = { ...state.prices };
    accepted.forEach((r) => { px[r.ticker] = r.price; });
    const patch = { prices: px, quoteMeta: { at: new Date().toISOString(), n: accepted.length } };
    if (fxRes && fxRes.apply !== false) patch.params = { ...state.params, eurusd: fxRes.rate };
    set(patch);
    setRes({}); setFxRes(null);
  };
  const revert = () => {
    set({ prices: {}, quoteMeta: null, params: { ...state.params, eurusd: DEFAULTS.eurusd } });
    setRes({});
  };
  const live = Object.keys(state.prices).length;

  return (
    <>
      <Section
        title="Kurse abgleichen"
        note="Aktuelle Kurse kommen kostenlos über Yahoo Finance und werden serverseitig in PostgreSQL zwischengespeichert. Die Daten können je nach Börse verzögert sein; vor einer Order gilt weiterhin der Brokerkurs."
      >
        <div className="panel" style={{ padding: "12px 14px", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="lbl">Umfang</span>
            <select value={scope} onChange={(e) => setScope(e.target.value)} disabled={running}>
              <option value="bewertung">Depot und bewertete Titel</option>
              <option value="growing">Growing Compounders</option>
              <option value="alle">alle Titel</option>
            </select>
          </label>
          <span className="lbl">{targets.length} Titel · keine API-Kosten</span>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" checked={withFx} onChange={(e) => setWithFx(e.target.checked)} disabled={running} /> EUR/USD mitziehen
          </label>
          <button
            onClick={run}
            disabled={running}
            style={{ border: 0, background: running ? T.hold : T.ink, color: T.paper, padding: "7px 14px", borderRadius: 3, fontWeight: 600 }}
          >
            {running ? "Kurse werden geladen …" : "Kurse holen"}
          </button>
          {live > 0 && (
            <button onClick={revert} style={{ border: `1px solid ${T.line}`, background: "none", padding: "6px 11px", borderRadius: 3 }}>
              {live} Kurs(e) auf Arbeitsmappe zurücksetzen
            </button>
          )}
        </div>

        {running && (
          <div style={{ marginTop: 12 }}>
            <div className="market-progress" />
            <div className="lbl" style={{ marginTop: 5 }}>Yahoo Finance wird abgefragt und der neue Kursstand in PostgreSQL gespeichert.</div>
          </div>
        )}
        {err && <div style={{ marginTop: 10, color: T.reduce }}>{err}. Nicht gefundene Titel behalten ihren bisherigen Kurs.</div>}

        {rows.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "16px 0 8px", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600 }}>{accepted.length} von {rows.length} Kursen zur Übernahme markiert</span>
              <span className="lbl">Abweichungen über {pct(DEV_LIMIT, 0)} und falsche Währungen sind abgewählt – prüfe sie einzeln.</span>
              <button onClick={apply} disabled={!accepted.length && !fxRes} style={{ marginLeft: "auto", border: 0, background: accepted.length || fxRes ? T.buy : "#B9C3BC", color: "#fff", padding: "7px 14px", borderRadius: 3, fontWeight: 600 }}>
                Übernehmen
              </button>
              <button onClick={() => { setRes({}); setFxRes(null); }} style={{ border: `1px solid ${T.line}`, background: "none", padding: "6px 11px", borderRadius: 3 }}>Verwerfen</button>
            </div>

            {fxRes && (
              <label className="panel" style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 12px", marginBottom: 10 }}>
                <input type="checkbox" checked={fxRes.apply !== false} onChange={(e) => setFxRes({ ...fxRes, apply: e.target.checked })} />
                <span>EUR/USD <span className="num" style={{ fontWeight: 600 }}>{nf(fxRes.rate, 4)}</span> statt {nf(state.params.eurusd, 4)}</span>
                <span className="lbl">Stand {fxRes.asof ? new Date(fxRes.asof).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "–"} · {fxRes.source}</span>
              </label>
            )}

            <div className="panel scroll" style={{ maxHeight: "52vh" }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>Übern.</th>
                    <th style={{ width: 88 }}>Ticker</th>
                    <th>Unternehmen</th>
                    <th className="r" style={{ width: 96 }}>Arbeitsmappe</th>
                    <th className="r" style={{ width: 96 }}>Neu</th>
                    <th className="r" style={{ width: 84 }}>Δ</th>
                    <th style={{ width: 104 }}>Kursstand</th>
                    <th style={{ width: 170 }}>Quelle</th>
                    <th style={{ width: 130 }}>Hinweis</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.ticker}>
                      <td><input type="checkbox" checked={r.accept} onChange={(e) => setRes((s) => ({ ...s, [r.ticker]: { ...s[r.ticker], accept: e.target.checked } }))} aria-label={"Kurs " + r.ticker + " übernehmen"} /></td>
                      <td className="tick">{r.ticker}</td>
                      <td>{r.name}</td>
                      <td className="num r" style={{ color: T.muted }}>{price(r.base, r.ccy)}</td>
                      <td className="num r" style={{ fontWeight: 600 }}>{price(r.price, r.returnedCcy || r.ccy)}</td>
                      <td className="num r" style={{ color: r.dev < 0 ? T.buy : r.dev > 0 ? T.sell : T.muted }}>{sgn(r.dev)}</td>
                      <td className="lbl">{r.asof ? new Date(r.asof).toLocaleDateString("de-DE") : "–"}</td>
                      <td className="lbl" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{r.source}{r.delayMinutes ? ` · ${r.delayMinutes} Min. verzögert` : ""}</td>
                      <td>
                        {r.status === "ok" ? <span className="lbl">plausibel</span>
                          : r.status === "waehrung" ? <Pill s="VERKAUFEN" />
                          : <Pill s="REDUZIEREN" />}
                        {r.status === "waehrung" && <div className="lbl">{r.returnedCcy} statt {r.ccy}</div>}
                        {r.status === "abweichung" && <div className="lbl">große Abweichung</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      <Section title="Wie der Abgleich funktioniert" note="Damit du weißt, worauf du dich verlässt.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
          {[
            ["Woher die Kurse kommen", "Der Next.js-Server fragt Yahoo Finance direkt ab. Zugangsdaten sind nicht nötig; Browser und Datenbank sprechen nie direkt mit Yahoo."],
            ["Was automatisch geprüft wird", "Kurse in einer anderen Währung als der Hauptnotiz und Sprünge über 35 Prozent gegen den letzten Stand kommen abgewählt an. Titel ohne belastbaren Treffer behalten ihren Kurs aus der Arbeitsmappe."],
            ["Was gespeichert wird", "Aktuelle Kurse und die einjährige Tageshistorie landen in PostgreSQL. Übernommene Kurse aktualisieren Zonen, Abstände, Gewichte, Optionskandidaten und Kaufplan."],
            ["Grenzen", "Yahoo stellt keine offizielle Entwickler-API oder Verfügbarkeitsgarantie bereit. Verzögerte Kurse und Zweitnotierungen bleiben mögliche Fehlerquellen; für eine Order zählt der Broker."],
          ].map(([h, t]) => (
            <div key={h} style={{ borderTop: `2px solid ${T.line}`, paddingTop: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{h}</div>
              <div className="lbl" style={{ marginTop: 3 }}>{t}</div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

/* ── Detail drawer ────────────────────────────────────────────────────── */
function PriceHistoryChart({ ticker, expectedCurrency }) {
  const [history, setHistory] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setHistory(null);
    fetch(`/api/market-data/history/${encodeURIComponent(ticker)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Historie nicht verfügbar");
        if (active) {
          setHistory(payload);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => { active = false; };
  }, [ticker]);

  const chart = useMemo(() => {
    const bars = history?.bars || [];
    if (bars.length < 2) return null;
    const closes = bars.map((bar) => bar.close).filter(Number.isFinite);
    if (closes.length < 2) return null;
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const spread = max - min || Math.max(max * 0.02, 1);
    const first = closes[0];
    const last = closes[closes.length - 1];
    return {
      bars, min, max, spread, first, last,
      change: last / first - 1,
      firstDate: bars[0].date,
      lastDate: bars[bars.length - 1].date,
    };
  }, [history]);

  if (status === "loading") {
    return (
      <div style={{ borderBottom: `1px solid ${T.line}`, paddingBottom: 14, marginBottom: 14 }}>
        <Lbl>1 Jahr Kursverlauf</Lbl>
        <div className="market-progress" style={{ marginTop: 12 }} />
      </div>
    );
  }
  if (status === "error" || !chart) {
    return (
      <div style={{ borderBottom: `1px solid ${T.line}`, paddingBottom: 12, marginBottom: 14 }}>
        <Lbl>1 Jahr Kursverlauf</Lbl>
        <div className="lbl" style={{ marginTop: 5 }}>Für dieses Symbol konnte keine Historie geladen werden.</div>
      </div>
    );
  }

  const lineColor = chart.change >= 0 ? T.buy : T.sell;
  return (
    <div style={{ borderBottom: `1px solid ${T.line}`, paddingBottom: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <Lbl>1 Jahr Kursverlauf</Lbl>
        <span className="num" style={{ fontWeight: 700, color: lineColor }}>{sgn(chart.change)}</span>
      </div>
      <ChartContainer
        config={{ close: { label: "Kurs", color: lineColor } }}
        style={{ width: "100%", height: 142, marginTop: 6 }}
        initialDimension={{ width: 390, height: 142 }}
        aria-label={`Kursverlauf ${ticker}`}
      >
        <AreaChart data={chart.bars} margin={{ top: 8, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id="priceHistoryFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-close)" stopOpacity={0.24} />
              <stop offset="100%" stopColor="var(--color-close)" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#E9EDE8" />
          <XAxis dataKey="date" hide />
          <YAxis domain={[chart.min - chart.spread * 0.04, chart.max + chart.spread * 0.04]} hide />
          <ChartTooltip
            cursor={{ stroke: T.line }}
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? new Date(payload[0].payload.date).toLocaleDateString("de-DE") : ""}
                formatter={(value) => <span className="num" style={{ fontWeight: 700 }}>{price(Number(value), history.currency)}</span>}
              />
            }
          />
          <Area dataKey="close" type="monotone" fill="url(#priceHistoryFill)" stroke="var(--color-close)" strokeWidth={2.2} dot={false} activeDot={{ r: 3 }} />
        </AreaChart>
      </ChartContainer>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: -4 }}>
        <span className="lbl">{new Date(chart.firstDate).toLocaleDateString("de-DE", { month: "short", year: "2-digit" })}</span>
        <span className="lbl num">Tief {price(chart.min, history.currency)} · Hoch {price(chart.max, history.currency)}</span>
        <span className="lbl">{new Date(chart.lastDate).toLocaleDateString("de-DE", { month: "short", year: "2-digit" })}</span>
      </div>
      {expectedCurrency && history.currency !== expectedCurrency && (
        <div style={{ color: T.reduce, fontSize: 11.5, marginTop: 6 }}>Yahoo meldet {history.currency} statt {expectedCurrency}; Kurs vor Übernahme prüfen.</div>
      )}
      <div className="lbl" style={{ marginTop: 6 }}>Quelle: {history.source} · täglich · in PostgreSQL zwischengespeichert</div>
    </div>
  );
}

function Drawer({ ticker, m, state, set, close, data }) {
  const v = m.vmap[ticker];
  const pos = m.positions.find((p) => p.ticker === ticker);
  const mx = data.matrix[ticker];
  const wl = data.watch.find((w) => w.ticker === ticker);
  const gc = m.gcRows.find((g) => g.ticker === ticker);
  const base = data.valuation.find((x) => x.ticker === ticker);
  const name = v?.name || pos?.name || wl?.name || gc?.name || ticker;
  useEffect(() => {
    const h = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [close]);

  return (
    <>
      <button className="drawer-backdrop" onClick={close} aria-label="Details schließen" />
      <aside
      className="drawer"
      style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(430px, 94vw)", background: T.panel, borderLeft: `1px solid ${T.line}`, boxShadow: "-14px 0 34px rgba(20,30,26,.10)", zIndex: 40, display: "flex", flexDirection: "column" }}
      role="dialog" aria-label={"Detail " + name}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "14px 16px", borderBottom: `1px solid ${T.line}` }}>
        <div>
          <div className="tick" style={{ color: T.muted }}>{ticker}{v ? " · " + v.ccy : ""}</div>
          <h2 style={{ fontSize: 18, marginTop: 2 }}>{name}</h2>
        </div>
        <button onClick={close} aria-label="schließen" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", border: 0, background: "none", color: T.muted }}><X size={19} /></button>
      </div>

      <div className="scroll" style={{ padding: "14px 16px", overflowY: "auto" }}>
        <PriceHistoryChart ticker={ticker} expectedCurrency={v?.ccy} />
        {v && (
          <>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 14 }}>
              <div><Lbl>Kurs</Lbl><div className="num" style={{ fontSize: 19, fontWeight: 600 }}>{price(v.px, v.ccy)}</div></div>
              <div><Lbl>Status</Lbl><div style={{ marginTop: 3 }}><Pill s={v.status} /></div></div>
              <div><Lbl>Qualität / Moat</Lbl><div className="num" style={{ fontSize: 19, fontWeight: 600 }}>{nf(v.quality, 1)} / {nf(v.moat, 0)}</div></div>
            </div>

            <Lbl>Kurs in deinen Zonen</Lbl>
            <div style={{ margin: "8px 0 26px" }}><Rail v={v} h={14} showTicks /></div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px", marginBottom: 16 }}>
              {[["Fair Value", v.fv], ["Kaufziel", v.buy], ["Halten bis", v.hold], ["Verkauf ab", v.sell]].map(([l, n]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid #EFF1EE`, padding: "4px 0" }}>
                  <span className="lbl">{l}</span><span className="num">{price(n, "")}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid #EFF1EE`, padding: "4px 0" }}>
                <span className="lbl">Abstand Kauf</span><span className="num" style={{ color: v.distBuy <= 0 ? T.buy : T.ink }}>{sgn(v.distBuy)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid #EFF1EE`, padding: "4px 0" }}>
                <span className="lbl">Puffer Verkauf</span><span className="num">{sgn(v.distSell)}</span>
              </div>
            </div>

            <Lbl>Wachstumsannahme 10 Jahre</Lbl>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0 4px" }}>
              <input type="range" min={0} max={0.3} step={0.005} value={v.g} onChange={(e) => set({ growth: { ...state.growth, [ticker]: parseFloat(e.target.value) } })} aria-label="Wachstumsannahme" />
              <span className="num" style={{ width: 54, textAlign: "right", fontWeight: 600, color: v.g !== base.g ? T.accent : T.ink }}>{pct(v.g, 1)}</span>
            </div>
            <div className="lbl" style={{ marginBottom: 16 }}>
              Basis {pct(base.g, 1)} · Zonenfaktor {nf(v.factor, 2)}×
              {v.g !== base.g && <button onClick={() => { const g = { ...state.growth }; delete g[ticker]; set({ growth: g }); }} style={{ marginLeft: 8, border: 0, background: "none", color: T.accent, padding: 0 }}>zurücksetzen</button>}
            </div>

            <Lbl>Kurs testen</Lbl>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 18px" }}>
              <Num value={+((state.prices[ticker] ?? base.price)).toFixed(2)} step={base.price > 100 ? 5 : 0.5} onChange={(x) => set({ prices: { ...state.prices, [ticker]: x || base.price } })} suffix={v.ccy} width={96} />
              {(state.prices[ticker] ?? base.price) !== base.price && (
                <button onClick={() => { const q = { ...state.prices }; delete q[ticker]; set({ prices: q }); }} style={{ border: 0, background: "none", color: T.accent, padding: 0 }}>auf {price(base.price, "")} zurück</button>
              )}
            </div>
          </>
        )}

        {pos && (
          <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Im Depot</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="lbl">Stück</span><span className="num">{nf(pos.shares, 0)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="lbl">Marktwert</span><span className="num">{eur(pos.mv)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="lbl">Gewicht</span><span className="num" style={{ color: pos.w > pos.maxW ? T.reduce : T.ink }}>{pct(pos.w)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="lbl">Maximal</span><span className="num">{pct(pos.maxW)}</span></div>
            </div>
            <div style={{ margin: "10px 0 8px" }}><WeightBar w={pos.w} maxW={pos.maxW} /></div>
            <Pill s={pos.action} />
            {pos.opt && (
              <div style={{ marginTop: 10, background: sc(pos.opt).bg, padding: "8px 10px" }}>
                <div style={{ fontWeight: 600, color: sc(pos.opt).c }}>{pos.opt}</div>
                <div className="num" style={{ fontSize: 13 }}>Strike {nf(pos.strike, 0)} {pos.ccy} · {pos.contracts} Kontrakt(e){pos.bind ? " · " + eur(pos.bind) + " gebunden" : ""}</div>
                <div className="lbl">{pos.gate}</div>
              </div>
            )}
          </div>
        )}

        {mx && (
          <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Bewertungsmatrix</span>
              <span className="lbl">Ø {nf(mx.avg, 2)} · 1 sehr gut, 6 sehr schlecht</span>
            </div>
            {Object.entries(mx.scores).map(([k, s]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
                <span className="lbl" style={{ width: 118 }}>{k}</span>
                <span style={{ flex: 1, display: "flex", gap: 2 }}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <span key={i} style={{ flex: 1, height: 7, background: i <= s ? (s <= 2 ? T.buy : s <= 3 ? T.hold : s <= 4 ? T.reduce : T.sell) : "#EFF1EE" }} />
                  ))}
                </span>
                <span className="num" style={{ width: 14, textAlign: "right", color: T.muted }}>{s}</span>
              </div>
            ))}
            <div style={{ marginTop: 10 }}>{mx.thesis}</div>
            <div style={{ marginTop: 6, color: T.sell }}>Risiko: {mx.risk}</div>
            <div className="lbl" style={{ marginTop: 4 }}>geprüft {mx.date}</div>
          </div>
        )}

        {wl && (
          <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Watchlist · Platz {wl.rank}</div>
            <div style={{ marginTop: 4 }}>{wl.moat}</div>
            <div className="lbl" style={{ marginTop: 4 }}>{wl.origin} · {wl.status} · Kaufzone {wl.zone}</div>
          </div>
        )}

        {gc && (
          <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Growing Compounders · Score {nf(gc.score, 0)}</div>
            <div style={{ marginTop: 4 }}>{gc.lastSignal}</div>
            <div className="lbl" style={{ marginTop: 4 }}>Kaufpreis {price(gc.buy, gc.ccy)} · Signal {gc.signal}</div>
          </div>
        )}

        {v && (
          <a href={v.src} target="_blank" rel="noreferrer" style={{ color: T.accent, fontSize: 12.5, wordBreak: "break-all" }}>Quelle: Investor Relations</a>
        )}
      </div>
      </aside>
    </>
  );
}

const refreshTime = (value) => value
  ? new Date(value).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })
  : "–";

function RefreshRunDetails({ run, retrying, onRetry }) {
  const updated = run.items.filter((item) => item.status === "updated");
  const failed = run.items.filter((item) => item.status === "failed");
  const skipped = run.items.filter((item) => item.status === "skipped");
  const retryable = failed.length;

  return (
    <div className="refresh-run-body">
      {updated.length > 0 && (
        <div className="refresh-group">
          <div className="lbl">Aktualisiert · {updated.length}</div>
          <div className="refresh-tickers">
            {updated.map((item) => <span className="refresh-chip" key={item.ticker}>{item.ticker}</span>)}
          </div>
        </div>
      )}
      {failed.length > 0 && (
        <div className="refresh-group">
          <div className="lbl" style={{ color: T.sell }}>Fehlgeschlagen · {failed.length}</div>
          {failed.map((item) => (
            <div className="refresh-problem" key={item.ticker}>
              <span className="tick">{item.ticker}</span><span style={{ color: T.sell }}>{item.reason || "Unbekannter Fehler"}</span>
            </div>
          ))}
        </div>
      )}
      {skipped.length > 0 && (
        <div className="refresh-group">
          <div className="lbl" style={{ color: T.reduce }}>Übersprungen · {skipped.length}</div>
          {skipped.map((item) => (
            <div className="refresh-problem" key={item.ticker}>
              <span className="tick">{item.ticker}</span><span style={{ color: T.reduce }}>{item.reason || "Prüfung nicht bestanden"}</span>
            </div>
          ))}
        </div>
      )}
      {run.error && <div style={{ marginTop: 9, color: T.sell, fontSize: 12 }}>{run.error}</div>}
      {retryable > 0 && (
        <button className="settings-action" onClick={() => onRetry(run.id)} disabled={retrying} style={{ marginTop: 10 }}>
          <RefreshCw aria-hidden="true" />{retrying ? "Wird erneut versucht …" : `${retryable} fehlgeschlagene Titel erneut versuchen`}
        </button>
      )}
    </div>
  );
}

function SettingsModal({ close, storageStatus, saved, openQuotes, refreshPortfolio }) {
  const mcpUrl = "https://danielstock.apps.tewali.de/api/mcp";
  const [copied, setCopied] = useState(false);
  const [refreshData, setRefreshData] = useState({ lastAutomatic: null, runs: [] });
  const [refreshLoading, setRefreshLoading] = useState(true);
  const [refreshError, setRefreshError] = useState("");
  const [retrying, setRetrying] = useState(null);

  const loadRefreshHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/market-data/refreshes", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Aktualisierungsverlauf nicht erreichbar");
      setRefreshData({ lastAutomatic: payload.lastAutomatic || null, runs: payload.runs || [] });
      setRefreshError("");
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "Aktualisierungsverlauf nicht erreichbar");
    } finally {
      setRefreshLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch("/api/market-data/refreshes", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Aktualisierungsverlauf nicht erreichbar");
        setRefreshData({ lastAutomatic: payload.lastAutomatic || null, runs: payload.runs || [] });
      })
      .catch((error) => setRefreshError(error instanceof Error ? error.message : "Aktualisierungsverlauf nicht erreichbar"))
      .finally(() => setRefreshLoading(false));
    const onKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [close, loadRefreshHistory]);

  const copyMcpUrl = async () => {
    await navigator.clipboard.writeText(mcpUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const retryRun = async (runId) => {
    setRetrying(runId);
    setRefreshError("");
    try {
      const response = await fetch("/api/market-data/refreshes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Erneuter Versuch fehlgeschlagen");
      await Promise.all([loadRefreshHistory(), refreshPortfolio()]);
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "Erneuter Versuch fehlgeschlagen");
    } finally {
      setRetrying(null);
    }
  };

  const statusText = storageStatus === "connecting"
    ? "PostgreSQL wird verbunden"
    : storageStatus === "saving"
      ? "Änderungen werden gespeichert …"
      : storageStatus === "offline"
        ? "Lokaler Modus · Datenbank nicht verbunden"
        : "PostgreSQL verbunden";

  return (
    <>
      <button className="settings-backdrop" onClick={close} aria-label="Einstellungen schließen" />
      <dialog open className="settings-modal" aria-labelledby="settings-title">
        <div className="settings-modal-header">
          <span className="brand-mark"><Settings aria-hidden="true" /></span>
          <div style={{ flex: 1 }}>
            <h2 id="settings-title" style={{ fontSize: 17 }}>Einstellungen</h2>
            <div className="lbl">Datenquellen, Automatisierung und Verbindungen</div>
          </div>
          <button onClick={close} aria-label="Einstellungen schließen" style={{ width: 40, height: 40, border: 0, borderRadius: 8, background: "none" }}><X aria-hidden="true" /></button>
        </div>

        <div className="settings-modal-body">
          <section className="settings-card">
            <div className="settings-card-head">
              <RefreshCw aria-hidden="true" />
              <div>
                <h3 style={{ fontSize: 14 }}>Kursabgleich</h3>
                <div className="lbl">Aktuelle Kurse kommen ausschließlich von Yahoo Finance.</div>
              </div>
            </div>
            <button className="settings-action" onClick={openQuotes}><RefreshCw aria-hidden="true" />Manuellen Kursabgleich öffnen</button>
          </section>

          <section className="settings-card">
            <div className="settings-card-head">
              <Clock3 aria-hidden="true" />
              <div>
                <h3 style={{ fontSize: 14 }}>Automatische Aktualisierung</h3>
                <div className="lbl">Täglich um 07:00 Uhr · Coolify-Serverzeit Europe/Madrid</div>
              </div>
            </div>
            <div style={{ fontSize: 12.5 }}>Der tägliche Job aktualisiert alle beobachteten und MCP-verwalteten Titel. Währungsfehler und Kurssprünge über 35&nbsp;% werden nicht übernommen.</div>
            {refreshLoading ? (
              <div className="refresh-empty">Aktualisierungsstatus wird geladen …</div>
            ) : refreshData.lastAutomatic ? (
              <>
                <div style={{ marginTop: 11, fontWeight: 600, fontSize: 12.5 }}>Letzter erfolgreicher automatischer Lauf</div>
                <div className="lbl">{refreshTime(refreshData.lastAutomatic.finishedAt)}</div>
                <div className="refresh-overview">
                  <div className="refresh-metric"><strong style={{ color: T.buy }}>{refreshData.lastAutomatic.updated}</strong><span className="lbl">aktualisiert</span></div>
                  <div className="refresh-metric"><strong style={{ color: refreshData.lastAutomatic.failed ? T.sell : T.muted }}>{refreshData.lastAutomatic.failed}</strong><span className="lbl">fehlgeschlagen</span></div>
                  <div className="refresh-metric"><strong style={{ color: refreshData.lastAutomatic.skipped ? T.reduce : T.muted }}>{refreshData.lastAutomatic.skipped}</strong><span className="lbl">übersprungen</span></div>
                </div>
              </>
            ) : (
              <div className="refresh-empty">Noch kein automatischer Lauf gespeichert. Nach dem ersten Cron-Lauf erscheint hier sein Ergebnis.</div>
            )}
            {refreshError && <div style={{ marginTop: 8, color: T.sell, fontSize: 12 }}>{refreshError}</div>}
          </section>

          <section className="settings-card">
            <div className="settings-card-head">
              <Clock3 aria-hidden="true" />
              <div>
                <h3 style={{ fontSize: 14 }}>Letzte Aktualisierungen</h3>
                <div className="lbl">Ticker, Fehlergründe und übersprungene Plausibilitätsprüfungen</div>
              </div>
            </div>
            {!refreshLoading && refreshData.runs.length === 0 ? (
              <div className="refresh-empty">Noch kein Verlauf vorhanden.</div>
            ) : (
              <div className="refresh-history">
                {refreshData.runs.map((run, index) => (
                  <details className="refresh-run" key={run.id} open={index === 0}>
                    <summary aria-label={`${run.trigger === "cron" ? "Automatischer Lauf" : "Erneuter Versuch"} vom ${refreshTime(run.finishedAt || run.startedAt)}`}>
                      <span className={`status-dot ${run.status === "success" ? "connected" : run.status === "failed" ? "offline" : ""}`} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontWeight: 600, fontSize: 12.5 }}>{run.trigger === "cron" ? "Automatisch" : "Erneuter Versuch"} · {refreshTime(run.finishedAt || run.startedAt)}</span>
                        <span className="lbl">{run.updated} aktualisiert · {run.failed} fehlgeschlagen · {run.skipped} übersprungen</span>
                      </span>
                    </summary>
                    <RefreshRunDetails run={run} retrying={retrying === run.id} onRetry={retryRun} />
                  </details>
                ))}
              </div>
            )}
          </section>

          <section className="settings-card">
            <div className="settings-card-head">
              <Database aria-hidden="true" />
              <div>
                <h3 style={{ fontSize: 14 }}>Datenspeicher</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                  <span className={`status-dot ${storageStatus === "connected" ? "connected" : storageStatus === "offline" ? "offline" : ""}`} />
                  <span className="lbl" style={{ color: storageStatus === "offline" ? T.reduce : T.muted }}>{saved || statusText}</span>
                </div>
              </div>
            </div>
            <div className="lbl">Portfolioänderungen werden automatisch gespeichert.</div>
          </section>

          <section className="settings-card">
            <div className="settings-card-head">
              <Plug aria-hidden="true" />
              <div>
                <h3 style={{ fontSize: 14 }}>MCP-Verbindung</h3>
                <div className="lbl">Streamable HTTP · OAuth 2.1 · Marktpreise sind schreibgeschützt</div>
              </div>
            </div>
            <div className="settings-code">
              <code>{mcpUrl}</code>
              <button className="settings-action" onClick={copyMcpUrl} aria-label="MCP-Adresse kopieren">
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {copied ? "Kopiert" : "Kopieren"}
              </button>
            </div>
            <div className="lbl" style={{ marginTop: 8 }}>In ChatGPT als benutzerdefinierten Connector mit OAuth hinzufügen. Das Dashboard-Passwort wird erst auf der Freigabeseite eingegeben.</div>
          </section>
        </div>
      </dialog>
    </>
  );
}

/* ── App ──────────────────────────────────────────────────────────────── */
const TABS = [
  { key: "cockpit", label: "Cockpit", icon: LayoutDashboard },
  { key: "depot", label: "Depot", icon: Briefcase },
  { key: "zonen", label: "Kaufzonen", icon: Target },
  { key: "wachstum", label: "Wachstum", icon: TrendingUp },
  { key: "optionen", label: "Optionen", icon: BadgeDollarSign },
  { key: "plan", label: "Kaufplan", icon: ClipboardList },
  { key: "growing", label: "Growing 50", icon: Sparkles },
  { key: "watchlist", label: "Watchlist", icon: Eye },
  { key: "regeln", label: "Regeln", icon: SlidersHorizontal },
];

const INITIAL = { growth: {}, prices: {}, mos: {}, shock: 0, priority: "abstand", quoteMeta: null, params: { ...DEFAULTS } };

export default function PortfolioCockpit() {
  const [state, setState] = useState(INITIAL);
  const [managedStocks, setManagedStocks] = useState([]);
  const [tab, setTab] = useState("cockpit");
  const [sel, setSel] = useState(null);
  const [saved, setSaved] = useState("");
  const [storageStatus, setStorageStatus] = useState("connecting");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    void (async () => {
      try {
        const [response, stocksResponse] = await Promise.all([
          fetch("/api/portfolio", { cache: "no-store" }),
          fetch("/api/stocks", { cache: "no-store" }),
        ]);
        if (!response.ok || !stocksResponse.ok) throw new Error("storage unavailable");
        const [payload, stocksPayload] = await Promise.all([response.json(), stocksResponse.json()]);
        if (payload.state) {
          setState((s) => ({ ...s, ...payload.state, params: { ...DEFAULTS, ...payload.state.params } }));
        } else {
          const initialSave = await fetch("/api/portfolio", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ state: INITIAL }),
          });
          if (!initialSave.ok) throw new Error("initial save failed");
        }
        setManagedStocks(stocksPayload.stocks || []);
        setStorageStatus("connected");
      } catch {
        setStorageStatus("offline");
      }
      loaded.current = true;
    })();
  }, []);

  useEffect(() => {
    const refresh = async () => {
      try {
        const response = await fetch("/api/stocks", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        setManagedStocks(payload.stocks || []);
      } catch {
        // Keep the last managed-stock snapshot during a transient outage.
      }
    };
    const timer = setInterval(refresh, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(async () => {
      try {
        setStorageStatus("saving");
        const response = await fetch("/api/portfolio", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ state }),
        });
        if (!response.ok) throw new Error("save failed");
        setStorageStatus("connected");
        setSaved("in PostgreSQL gespeichert");
        setTimeout(() => setSaved(""), 1400);
      } catch {
        setStorageStatus("offline");
      }
    }, 600);
    return () => clearTimeout(t);
  }, [state]);

  const set = (patch) => setState((s) => ({ ...s, ...patch }));
  const reset = async () => {
    setState(INITIAL);
    try {
      const response = await fetch("/api/portfolio", { method: "DELETE" });
      if (!response.ok) throw new Error("reset failed");
      setStorageStatus("connected");
    } catch {
      setStorageStatus("offline");
    }
  };
  const refreshPortfolio = async () => {
    const response = await fetch("/api/portfolio", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Portfolio konnte nicht neu geladen werden");
    if (payload.state) {
      setState((current) => ({ ...current, ...payload.state, params: { ...DEFAULTS, ...payload.state.params } }));
    }
  };
  const data = useMemo(() => mergeManagedData(managedStocks), [managedStocks]);
  const m = useModel(state, data);
  const open = (t) => setSel(t);

  return (
    <div className="ck" style={{ minHeight: "100vh" }}>
      <style>{CSS}</style>

      <header className="app-header" style={{ borderBottom: `1px solid ${T.line}`, background: T.panel }}>
        <div className="topbar" style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 14, padding: "14px 20px 10px" }}>
          <div className="brand">
            <span className="brand-mark"><BarChart3 aria-hidden="true" /></span>
            <h1 style={{ fontSize: 20 }}>Portfolio-Cockpit</h1>
          </div>
          <span className="lbl topbar-meta">
            {state.quoteMeta
              ? `Kurse abgeglichen ${new Date(state.quoteMeta.at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })} · ${state.quoteMeta.n} Titel`
              : `Kursstand ${data.kpi.lastRun} aus der Arbeitsmappe`}
            {" · keine automatische Orderausführung"}
          </span>
          <button className="settings-button" onClick={() => setSettingsOpen(true)} aria-label="Einstellungen öffnen" title="Einstellungen">
            <Settings aria-hidden="true" />
            <span className={`status-dot ${storageStatus === "connected" ? "connected" : storageStatus === "offline" ? "offline" : ""}`} />
          </button>
        </div>
        <div className="scenario" style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 20px 12px", flexWrap: "wrap" }}>
          <span className="lbl scenario-label" style={{ width: 128 }}>Marktszenario</span>
          <input type="range" min={-40} max={40} step={1} value={state.shock} onChange={(e) => set({ shock: parseInt(e.target.value, 10) })} style={{ maxWidth: 320 }} aria-label="Alle Kurse verschieben" />
          <span className="num scenario-value" style={{ width: 64, fontWeight: 600, color: state.shock === 0 ? T.muted : state.shock < 0 ? T.buy : T.sell }}>
            {state.shock > 0 ? "+" : ""}{state.shock} %
          </span>
          <span className="lbl scenario-note">verschiebt alle Kurse gleichzeitig – zum Testen, was ein Rücksetzer für Zonen, Gewichte und Kaufplan bedeutet</span>
        </div>
      </header>

      <div className="app-shell" style={{ display: "flex", alignItems: "flex-start" }}>
        <nav className="rail" style={{ position: "sticky", top: 0, width: 168, flex: "0 0 auto", padding: "16px 0", borderRight: `1px solid ${T.line}`, height: "100vh" }}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} className="navbtn" aria-current={tab === key} onClick={() => setTab(key)} title={label}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <main className="app-main" style={{ flex: 1, minWidth: 0, padding: "20px 22px 60px" }}>
          {tab === "cockpit" && <Cockpit m={m} open={open} selected={sel} go={setTab} />}
          {tab === "depot" && <Depot m={m} open={open} selected={sel} />}
          {tab === "zonen" && <Zonen m={m} open={open} selected={sel} />}
          {tab === "wachstum" && <Wachstum m={m} state={state} set={set} data={data} />}
          {tab === "optionen" && <Optionen m={m} state={state} set={set} open={open} />}
          {tab === "plan" && <Kaufplan m={m} state={state} set={set} open={open} />}
          {tab === "growing" && <Growing m={m} state={state} set={set} />}
          {tab === "kurse" && <Kurse state={state} set={set} data={data} />}
          {tab === "watchlist" && <Watchlist data={data} />}
          {tab === "regeln" && <Regeln state={state} set={set} reset={reset} m={m} />}
        </main>
      </div>

      {sel && <Drawer ticker={sel} m={m} state={state} set={set} data={data} close={() => setSel(null)} />}
      {settingsOpen && (
        <SettingsModal
          close={() => setSettingsOpen(false)}
          storageStatus={storageStatus}
          saved={saved}
          openQuotes={() => { setSettingsOpen(false); setTab("kurse"); }}
          refreshPortfolio={refreshPortfolio}
        />
      )}
    </div>
  );
}
