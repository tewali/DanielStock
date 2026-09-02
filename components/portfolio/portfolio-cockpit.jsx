"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  BadgeDollarSign, BarChart3, Briefcase, ClipboardList, Eye,
  LayoutDashboard, RefreshCw, SlidersHorizontal, Sparkles,
  Target, TrendingUp, X,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const D = {"kpi":{"depot":247152.487579,"cash":30000.0,"lastRun":"2026-09-01","automatik":"Werktags 22:30","title":"Einfaches Portfolio-Cockpit","sub":"Gewichtung zuerst | Kurse werden werktags 22:30 aktualisiert | Konkrete Kauftranche siehe „Kaufplan“ | Keine automatische Orderausführung"},"rules":{"Mindest-Qualität":70.0,"Mindest-Moat":70.0,"Maximale Watchlist":40.0,"Options-Cash EUR":30000.0,"EUR je USD":1.1596,"Max-Gewicht Qualität ≥90":0.05,"Max-Gewicht Qualität ≥85":0.04,"Max-Gewicht Qualität ≥80":0.035,"Max-Gewicht Qualität ≥70":0.03,"Max-Gewicht sonst":0.02},"valuation":[{"ticker":"1INN.DE","name":"innoscripta","ccy":"EUR","price":84.1,"quality":77.1,"moat":70.0,"score":67.25,"fv":90.0,"buy":65.0,"hold":100.0,"sell":120.0,"g":0.13,"src":"https://www.innoscripta.com/en-de/investors/event-and-publications/financial-calendar"},{"ticker":"690D.DE","name":"Haier Smart Home D","ccy":"EUR","price":1.8,"quality":77.1,"moat":78.0,"score":73.35,"fv":2.35,"buy":1.85,"hold":2.55,"sell":3.0,"g":0.05,"src":"https://www.eqs-news.com/news/corporate/haier-smart-home-reports-h1-2026-results-q2-revenue-grows-year-on-year-net-profit-improves-quarter-on-quarter/be3287e7-f00a-47d0-adfb-04c288b4e981_en"},{"ticker":"AAPL","name":"Apple","ccy":"USD","price":316.85,"quality":92.9,"moat":95.0,"score":72.75,"fv":335.0,"buy":270.0,"hold":370.0,"sell":420.0,"g":0.07,"src":"https://www.apple.com/newsroom/2026/07/apple-reports-third-quarter-results/"},{"ticker":"ADBE","name":"Adobe","ccy":"USD","price":292.79,"quality":91.4,"moat":92.0,"score":85.15,"fv":365.0,"buy":300.0,"hold":410.0,"sell":470.0,"g":0.08,"src":"https://news.adobe.com/news/2026/06/adobe-q2fy26-financial-results"},{"ticker":"AMZN","name":"Amazon","ccy":"USD","price":259.77,"quality":90,"moat":90.0,"score":77.25,"fv":295.0,"buy":235.0,"hold":325.0,"sell":370.0,"g":0.11,"src":"https://ir.aboutamazon.com/news-release/news-release-details/2026/Amazon-com-Announces-Second-Quarter-Results/"},{"ticker":"APTV","name":"Aptiv","ccy":"USD","price":44.76,"quality":70,"moat":62.0,"score":67.3,"fv":55.0,"buy":40.0,"hold":62.0,"sell":75.0,"g":0.05,"src":"https://ir.aptiv.com/news/news-details/2026/Aptiv-Reports-Second-Quarter-2026-Financial-Results/default.aspx"},{"ticker":"ASML","name":"ASML ADR","ccy":"USD","price":1696.01,"quality":94.3,"moat":95.0,"score":74.75,"fv":1810.0,"buy":1450.0,"hold":1950.0,"sell":2250.0,"g":0.1,"src":"https://www.asml.com/news/press-releases/2026/q2-2026-financial-results"},{"ticker":"BELA.AT","name":"Jumbo SA","ccy":"EUR","price":26.0,"quality":81.4,"moat":74.0,"score":73.25,"fv":31.0,"buy":25.0,"hold":35.0,"sell":42.0,"g":0.055,"src":"https://corporate.e-jumbo.gr/en/investor-relations/announcements-press-releases/2026-159258/me-anodo-7-3-ekleise-to-proto-trimino-gia-ton-omilo-jumbo-159279/"},{"ticker":"CDNS","name":"Cadence Design Systems","ccy":"USD","price":338.78,"quality":94.3,"moat":96.0,"score":72.2,"fv":340.0,"buy":285.0,"hold":390.0,"sell":450.0,"g":0.11,"src":"https://investor.cadence.com/news/news-details/2026/Cadence-Reports-Second-Quarter-2026-Financial-Results/default.aspx"},{"ticker":"CRE.L","name":"Conduit Holdings","ccy":"GBP","price":5.3,"quality":58.6,"moat":45.0,"score":52.25,"fv":6.2,"buy":4.8,"hold":6.8,"sell":8.2,"g":0.04,"src":"https://www.conduitreinsurance.com/news-insights/2026/2026-interim-results/"},{"ticker":"CRWD","name":"CrowdStrike","ccy":"USD","price":231.0,"quality":88.6,"moat":88.0,"score":68.35,"fv":210.0,"buy":170.0,"hold":230.0,"sell":260.0,"g":0.16,"src":"https://ir.crowdstrike.com/"},{"ticker":"CSGP","name":"CoStar Group","ccy":"USD","price":32.07,"quality":87.1,"moat":93.0,"score":86.25,"fv":42.0,"buy":34.0,"hold":48.0,"sell":58.0,"g":0.1,"src":"https://investors.costargroup.com/news-releases/news-release-details/costar-group-q2-2026-results-mark-profitability-inflection"},{"ticker":"CSU.TO","name":"Constellation Software","ccy":"CAD","price":3138.72,"quality":88.6,"moat":93.0,"score":78.1,"fv":3000.0,"buy":2400.0,"hold":3600.0,"sell":4300.0,"g":0.065,"src":"https://www.csisoftware.com/constellation-software-inc-announces-results-for-the-second-quarter-ended-june-30-2026-and-declares-quarterly-dividend/"},{"ticker":"CWC.DE","name":"CEWE","ccy":"EUR","price":106.0,"quality":82.9,"moat":80.0,"score":73.45,"fv":125.0,"buy":100.0,"hold":140.0,"sell":165.0,"g":0.055,"src":"https://www.eqs-news.com/company/cewe-stiftung-co-kgaa/reports/5b75a4cd-ea7c-11e8-902f-2c44fd856d8c"},{"ticker":"DHR","name":"Danaher","ccy":"USD","price":213.56,"quality":87.1,"moat":85.0,"score":73.75,"fv":235.0,"buy":190.0,"hold":260.0,"sell":300.0,"g":0.07,"src":"https://investors.danaher.com/2026-07-21-Danaher-Reports-Second-Quarter-2026-Results"},{"ticker":"ETN","name":"Eaton","ccy":"USD","price":401.88,"quality":84.3,"moat":83.0,"score":69.9,"fv":440.0,"buy":350.0,"hold":485.0,"sell":550.0,"g":0.08,"src":"https://www.eaton.com/us/en-us/company/news-insights/news-releases/2026/eaton-reports-record-second-quarter-2026-results.html"},{"ticker":"FICO","name":"Fair Isaac","ccy":"USD","price":1147.21,"quality":88.6,"moat":98.0,"score":75.85,"fv":1250.0,"buy":1000.0,"hold":1450.0,"sell":1650.0,"g":0.1,"src":"https://investors.fico.com/news-releases/news-release-details/fico-announces-earnings-1045-share-third-quarter-fiscal-2026/"},{"ticker":"GOOGL","name":"Alphabet","ccy":"USD","price":339.35,"quality":91.4,"moat":92.0,"score":79.95,"fv":385.0,"buy":310.0,"hold":420.0,"sell":480.0,"g":0.12,"src":"https://abc.xyz/investor/"},{"ticker":"HY9H.F","name":"SK hynix GDR","ccy":"EUR","price":1045.0,"quality":75.7,"moat":86.0,"score":68.45,"fv":1100.0,"buy":800.0,"hold":1200.0,"sell":1450.0,"g":0.09,"src":"https://news.skhynix.com/en/q2-2026-business-results/"},{"ticker":"ISRG","name":"Intuitive Surgical","ccy":"USD","price":376.86,"quality":95.7,"moat":96.0,"score":78.2,"fv":410.0,"buy":330.0,"hold":450.0,"sell":510.0,"g":0.11,"src":"https://isrg.intuitive.com/news-releases/news-release-details/intuitive-announces-second-quarter-earnings-6"},{"ticker":"KSPI","name":"Kaspi.kz","ccy":"USD","price":105.14,"quality":85.7,"moat":82.0,"score":75.65,"fv":125.0,"buy":90.0,"hold":140.0,"sell":165.0,"g":0.1,"src":"https://ir.kaspi.kz/financial-information/"},{"ticker":"MCO","name":"Moody's","ccy":"USD","price":504.64,"quality":92.9,"moat":92.0,"score":74.65,"fv":550.0,"buy":440.0,"hold":605.0,"sell":690.0,"g":0.08,"src":"https://ir.moodys.com/"},{"ticker":"MSFT","name":"Microsoft","ccy":"USD","price":507.29,"quality":95.7,"moat":96.0,"score":77.45,"fv":570.0,"buy":455.0,"hold":625.0,"sell":710.0,"g":0.11,"src":"https://www.microsoft.com/en-us/investor/earnings/fy-2026-q4/press-release-webcast"},{"ticker":"NN.AS","name":"NN Group","ccy":"EUR","price":78.02,"quality":74.3,"moat":70.0,"score":67.2,"fv":80.0,"buy":64.0,"hold":90.0,"sell":105.0,"g":0.045,"src":"https://www.nn-group.com/news/continued-strong-commercial-performance-in-the-first-half-of-2026-resulting-in-5-growth-in-operating-capital-generation/"},{"ticker":"NVDA","name":"NVIDIA","ccy":"USD","price":220.78,"quality":92.9,"moat":94.0,"score":84.65,"fv":245.0,"buy":200.0,"hold":270.0,"sell":305.0,"g":0.16,"src":"https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Announces-Financial-Results-for-Second-Quarter-Fiscal-2027/default.aspx"},{"ticker":"NVO","name":"Novo Nordisk ADR","ccy":"USD","price":45.33,"quality":82.9,"moat":80.0,"score":70.25,"fv":52.0,"buy":42.0,"hold":57.0,"sell":65.0,"g":0.08,"src":"https://www.novonordisk.com/investors/financial-results.html"},{"ticker":"PLTR","name":"Palantir","ccy":"USD","price":186.38,"quality":87.1,"moat":80.0,"score":60.15,"fv":160.0,"buy":125.0,"hold":175.0,"sell":180.0,"g":0.22,"src":"https://investors.palantir.com/"},{"ticker":"PROT.OL","name":"Protector Forsikring","ccy":"NOK","price":477.8,"quality":84.3,"moat":72.0,"score":70.15,"fv":575.0,"buy":460.0,"hold":630.0,"sell":720.0,"g":0.07,"src":"https://investor.protectorforsikring.no/pressreleases/q2-2026-cr-815-earnings-per-share-nok-90-dividend-nok-300-per-share-mrdoao71"},{"ticker":"SNPS","name":"Synopsys","ccy":"USD","price":439.59,"quality":85.7,"moat":92.0,"score":76.65,"fv":500.0,"buy":400.0,"hold":550.0,"sell":625.0,"g":0.1,"src":"https://investor.synopsys.com/news/news-details/2026/Synopsys-Posts-Financial-Results-for-Third-Quarter-Fiscal-Year-2026/default.aspx"},{"ticker":"SPGI","name":"S&P Global","ccy":"USD","price":435.84,"quality":92.9,"moat":94.0,"score":78.55,"fv":490.0,"buy":390.0,"hold":540.0,"sell":610.0,"g":0.08,"src":"https://investor.spglobal.com/quarterly-earnings/"},{"ticker":"SSUN.F","name":"Samsung GDR","ccy":"EUR","price":2885.0,"quality":81.4,"moat":88.0,"score":72.95,"fv":3200.0,"buy":2500.0,"hold":3600.0,"sell":4200.0,"g":0.07,"src":"https://news.samsung.com/global/samsung-electronics-announces-second-quarter-2026-results"},{"ticker":"SU.PA","name":"Schneider Electric","ccy":"EUR","price":300.2,"quality":92.9,"moat":88.0,"score":73.85,"fv":315.0,"buy":250.0,"hold":340.0,"sell":390.0,"g":0.08,"src":"https://www.se.com/ww/en/about-us/investor-relations/financial-results/"},{"ticker":"TMO","name":"Thermo Fisher Scientific","ccy":"USD","price":617.1,"quality":87.1,"moat":90.0,"score":67,"fv":600.0,"buy":500.0,"hold":680.0,"sell":780.0,"g":0.07,"src":"https://ir.thermofisher.com/investors/news-events/news/news-details/2026/Thermo-Fisher-Scientific-Reports-Second-Quarter-2026-Results/"},{"ticker":"TSM","name":"TSMC ADR","ccy":"USD","price":415.32,"quality":92.9,"moat":93.0,"score":77.6,"fv":450.0,"buy":360.0,"hold":500.0,"sell":560.0,"g":0.11,"src":"https://investor.tsmc.com/english/quarterly-results/2026/q2"}],"portfolio":[{"ticker":"PROT.OL","name":"Protector Forsikring","priceEur":44.110044,"mv":23157.773264,"shares":525,"quality":84.3,"ccy":"NOK","statusFix":"HALTEN","cspStrike":null},{"ticker":"690D.DE","name":"Qingdao Haier D","priceEur":1.8,"mv":23222.626697,"shares":12901,"quality":77.1,"ccy":"EUR","statusFix":"NACHKAUFEN","cspStrike":null},{"ticker":"KSPI","name":"Kaspi.kz GDR","priceEur":90.669196,"mv":19947.22318,"shares":220,"quality":85.7,"ccy":"USD","statusFix":"HALTEN","cspStrike":90.0},{"ticker":"NVO","name":"Novo Nordisk","priceEur":39.091066,"mv":19975.539635,"shares":511,"quality":82.9,"ccy":"USD","statusFix":"HALTEN","cspStrike":42.0},{"ticker":"NN.AS","name":"NN Group","priceEur":78.02,"mv":17054.232963,"shares":219,"quality":74.3,"ccy":"EUR","statusFix":"HALTEN","cspStrike":null},{"ticker":"SLYG.DE","name":"Shelly Group","priceEur":61.9,"mv":16182.267019,"shares":261,"quality":78.6,"ccy":"EUR","statusFix":"HALTEN","cspStrike":null},{"ticker":"BELA.AT","name":"Jumbo SA","priceEur":26.0,"mv":14742.0,"shares":567,"quality":81.4,"ccy":"EUR","statusFix":"HALTEN","cspStrike":null},{"ticker":"CWC.DE","name":"CEWE","priceEur":106.0,"mv":12720.0,"shares":120,"quality":82.9,"ccy":"EUR","statusFix":"HALTEN","cspStrike":null},{"ticker":"CRE.L","name":"Conduit Holdings","priceEur":5.294928,"mv":12289.528068,"shares":2321,"quality":58.6,"ccy":"GBP","statusFix":"HALTEN","cspStrike":null},{"ticker":"1INN.DE","name":"innoscripta","priceEur":84.1,"mv":12026.3,"shares":143,"quality":77.1,"ccy":"EUR","statusFix":"HALTEN","cspStrike":null},{"ticker":"MSFT","name":"Microsoft","priceEur":437.469817,"mv":6562.047258,"shares":15,"quality":95.7,"ccy":"USD","statusFix":"HALTEN","cspStrike":455.0},{"ticker":"PLTR","name":"Palantir","priceEur":160.727837,"mv":5786.202139,"shares":36,"quality":87.1,"ccy":"USD","statusFix":"VERKAUFEN","cspStrike":125.0},{"ticker":"GOOGL","name":"Alphabet A","priceEur":292.644015,"mv":5560.236288,"shares":19,"quality":91.4,"ccy":"USD","statusFix":"HALTEN","cspStrike":300.0},{"ticker":"SPGI","name":"S&P Global","priceEur":375.853743,"mv":5261.952397,"shares":14,"quality":92.9,"ccy":"USD","statusFix":"HALTEN","cspStrike":390.0},{"ticker":"ADBE","name":"Adobe","priceEur":252.492239,"mv":5302.337013,"shares":21,"quality":91.4,"ccy":"USD","statusFix":"NACHKAUFEN","cspStrike":280.0},{"ticker":"HY9H.F","name":"SK hynix GDR","priceEur":1045.0,"mv":5225.0,"shares":5,"quality":75.7,"ccy":"EUR","statusFix":"HALTEN","cspStrike":null},{"ticker":"TSM","name":"TSMC","priceEur":358.157986,"mv":5014.211797,"shares":14,"quality":92.9,"ccy":"USD","statusFix":"HALTEN","cspStrike":360.0},{"ticker":"SNPS","name":"Synopsys","priceEur":379.087616,"mv":4928.139013,"shares":13,"quality":85.7,"ccy":"USD","statusFix":"HALTEN","cspStrike":400.0},{"ticker":"DEF.DE","name":"DEFAMA","priceEur":19.85,"mv":4089.1,"shares":206,"quality":65.7,"ccy":"EUR","statusFix":"NACHKAUFEN","cspStrike":null},{"ticker":"ISRG","name":"Intuitive Surgical","priceEur":324.991376,"mv":3899.896516,"shares":12,"quality":95.7,"ccy":"USD","statusFix":"HALTEN","cspStrike":330.0},{"ticker":"SU.PA","name":"Schneider Electric","priceEur":300.2,"mv":3602.4,"shares":12,"quality":92.9,"ccy":"EUR","statusFix":"HALTEN","cspStrike":250.0},{"ticker":"1211.HK","name":"BYD","priceEur":9.44019,"mv":3209.664642,"shares":340,"quality":65.7,"ccy":"HKD","statusFix":"HALTEN","cspStrike":80.0},{"ticker":"ASML","name":"ASML","priceEur":1462.581925,"mv":2925.16385,"shares":2,"quality":94.3,"ccy":"USD","statusFix":"HALTEN","cspStrike":1450.0},{"ticker":"CSGP","name":"CoStar Group","priceEur":27.656088,"mv":2931.54536,"shares":106,"quality":87.1,"ccy":"USD","statusFix":"NACHKAUFEN","cspStrike":30.0},{"ticker":"SSUN.F","name":"Samsung GDR","priceEur":2885.0,"mv":2885.0,"shares":1,"quality":81.4,"ccy":"EUR","statusFix":"HALTEN","cspStrike":null},{"ticker":"NVDA","name":"NVIDIA","priceEur":190.393239,"mv":2094.32563,"shares":11,"quality":92.9,"ccy":"USD","statusFix":"HALTEN","cspStrike":195.0},{"ticker":"CDNS","name":"Cadence Design Systems","priceEur":292.152466,"mv":2045.067265,"shares":7,"quality":94.3,"ccy":"USD","statusFix":"HALTEN","cspStrike":285.0},{"ticker":"ETN","name":"Eaton","priceEur":346.567782,"mv":1732.83891,"shares":5,"quality":84.3,"ccy":"USD","statusFix":"HALTEN","cspStrike":350.0},{"ticker":"APTV","name":"Aptiv","priceEur":38.599517,"mv":1659.784162,"shares":43,"quality":70,"ccy":"USD","statusFix":"HALTEN","cspStrike":null},{"ticker":"AMZN","name":"Amazon","priceEur":224.016902,"mv":1120.084512,"shares":5,"quality":90,"ccy":"USD","statusFix":"HALTEN","cspStrike":235.0}],"matrix":{"APTV":{"scores":{"Markt":2,"Wettbewerb":3,"Regulierung":3,"Bilanz":2,"Marge":2,"ROE":2,"FCF":2,"Management":2,"Eigentümer":3,"Kapitalallokation":3,"Geschäftsmodell":3,"Burggraben":3,"Marke":3,"Produkt":2},"avg":2.5,"thesis":"Nach dem Spin fokussierter auf Advanced Safety und Software; Q2-Marge verbessert sich trotz nur 2% Umsatzwachstum.","risk":"Autozyklus, OEM-Verhandlungsmacht, Launch-/Software-Verzögerungen und gesenkte Guidance.","date":"01.09.2026"},"BELA.AT":{"scores":{"Markt":2,"Wettbewerb":2,"Regulierung":3,"Bilanz":1,"Marge":1,"ROE":1,"FCF":2,"Management":2,"Eigentümer":3,"Kapitalallokation":1,"Geschäftsmodell":2,"Burggraben":3,"Marke":2,"Produkt":2},"avg":1.93,"thesis":"Kostenführerschaft, starke Margen, Net-Cash und hohe Kapitalrenditen; Q1-2026-Umsatz +7,3%.","risk":"Griechenland-/Rumänien-/Zypern-Konzentration, Nahost-Risiko und diskretionärer Konsum.","date":"01.09.2026"},"CRE.L":{"scores":{"Markt":2,"Wettbewerb":4,"Regulierung":3,"Bilanz":3,"Marge":3,"ROE":3,"FCF":3,"Management":2,"Eigentümer":3,"Kapitalallokation":2,"Geschäftsmodell":4,"Burggraben":4,"Marke":4,"Produkt":3},"avg":3.07,"thesis":"Tangible NAV je Aktie stieg auf GBP 5,70; 1H26-Rendite auf Eigenkapital 7,8% und Combined Ratio 92,6%.","risk":"Katastrophen-, Reserve- und Pricing-Zyklus; Raten -6% und kein belastbarer Burggraben.","date":"01.09.2026"},"CSGP":{"scores":{"Markt":1,"Wettbewerb":2,"Regulierung":2,"Bilanz":1,"Marge":2,"ROE":2,"FCF":2,"Management":2,"Eigentümer":2,"Kapitalallokation":2,"Geschäftsmodell":1,"Burggraben":1,"Marke":2,"Produkt":1},"avg":1.64,"thesis":"Proprietäre Immobiliendaten, hohe Wechselkosten, über 95% Abo-Umsatz und rund 90% Verlängerungsquote bilden einen starken Daten-Tollbooth.","risk":"Hohe Investitionen in Homes.com, Wettbewerbsdruck und Ausführungsrisiko trotz Profitabilitätswende.","date":"01.09.2026"},"CWC.DE":{"scores":{"Markt":2,"Wettbewerb":2,"Regulierung":2,"Bilanz":1,"Marge":2,"ROE":2,"FCF":2,"Management":2,"Eigentümer":2,"Kapitalallokation":2,"Geschäftsmodell":2,"Burggraben":2,"Marke":1,"Produkt":2},"avg":1.86,"thesis":"Europäische Photofinishing-Marke mit hoher Kundentreue und Distribution; Fokus nach Verkauf des Online-Print-Geschäfts steigt.","risk":"Saisonalität, Kodak-Moments-Integration, strukturell reifer Fotomarkt und geringe Optionsliquidität.","date":"01.09.2026"},"HY9H.F":{"scores":{"Markt":1,"Wettbewerb":2,"Regulierung":3,"Bilanz":2,"Marge":2,"ROE":2,"FCF":3,"Management":2,"Eigentümer":3,"Kapitalallokation":3,"Geschäftsmodell":3,"Burggraben":2,"Marke":2,"Produkt":1},"avg":2.21,"thesis":"Technologieführung in HBM und langfristige Kundenvereinbarungen schaffen einen starken Produktvorsprung.","risk":"Extrem zyklische Speicherpreise, hoher Capex, Kundenkonzentration und Korea-/Governance-Risiko.","date":"01.09.2026"},"NN.AS":{"scores":{"Markt":2,"Wettbewerb":3,"Regulierung":3,"Bilanz":2,"Marge":2,"ROE":2,"FCF":2,"Management":2,"Eigentümer":3,"Kapitalallokation":2,"Geschäftsmodell":2,"Burggraben":3,"Marke":2,"Produkt":2},"avg":2.29,"thesis":"Solide, diversifizierte Versicherungsplattform; 1H26 OCG +5%, FCF +7% und Solvency-II 224% stützen Ausschüttungen.","risk":"Zins-, Spread-, Regulierungs- und Modellrisiken; kein harter Netzwerk-Burggraben.","date":"01.09.2026"},"SSUN.F":{"scores":{"Markt":1,"Wettbewerb":2,"Regulierung":3,"Bilanz":1,"Marge":2,"ROE":2,"FCF":2,"Management":2,"Eigentümer":3,"Kapitalallokation":3,"Geschäftsmodell":2,"Burggraben":2,"Marke":1,"Produkt":1},"avg":1.93,"thesis":"Globale Skala in Speicher, Foundry und Endgeräten plus starke Bilanz; AI-Memory treibt 2026 außergewöhnliche Ergebnisse.","risk":"Speicherzyklus, Foundry-Ausführung, China-/Exportkontrollen und Konglomerats-Governance.","date":"01.09.2026"}},"watch":[{"rank":1,"ticker":"6861.T","name":"Keyence","origin":"Neue 150er-Recherche","quality":94.0,"zone":"AUSSTEHEND","moat":"Sensorik-Direktvertrieb und extreme Kapitalrendite","status":"Deep Dive nötig"},{"rank":2,"ticker":"MA","name":"Mastercard","origin":"Neue 100er-Recherche","quality":93.9,"zone":"AUSSTEHEND","moat":"Globales Zahlungsnetzwerk","status":"Deep Dive nötig"},{"rank":3,"ticker":"V","name":"Visa","origin":"Neue 100er-Recherche","quality":93.9,"zone":"AUSSTEHEND","moat":"Globales Zahlungsnetzwerk","status":"Deep Dive nötig"},{"rank":4,"ticker":"EL.PA","name":"EssilorLuxottica","origin":"Neue 150er-Recherche","quality":93,"zone":"AUSSTEHEND","moat":"Optik-Plattform, Marken und Distribution","status":"Deep Dive nötig"},{"rank":5,"ticker":"INTU","name":"Intuit","origin":"Neue 150er-Recherche","quality":93.0,"zone":"AUSSTEHEND","moat":"Finanz- und Steuersoftware-Ökosystem","status":"Deep Dive nötig"},{"rank":6,"ticker":"RMS.PA","name":"Hermès","origin":"Neue 100er-Recherche","quality":92.6,"zone":"AUSSTEHEND","moat":"Knappheit, Marke und Handwerkskapazität","status":"Deep Dive nötig"},{"rank":7,"ticker":"VEEV","name":"Veeva Systems","origin":"Neue 100er-Recherche","quality":92.6,"zone":"AUSSTEHEND","moat":"Life-Science-Cloud mit hohen Wechselkosten","status":"Deep Dive nötig"},{"rank":8,"ticker":"AVGO","name":"Broadcom","origin":"Bisherige Watchlist","quality":92,"zone":"AUSSTEHEND","moat":"Bereits im letzten Screening qualifiziert","status":"bestehendes Research"},{"rank":9,"ticker":"6146.T","name":"Disco","origin":"Neue 150er-Recherche","quality":92,"zone":"AUSSTEHEND","moat":"Dicing- und Grinding-Nische","status":"Deep Dive nötig"},{"rank":10,"ticker":"PME.AX","name":"Pro Medicus","origin":"Neue 150er-Recherche","quality":92,"zone":"AUSSTEHEND","moat":"Hochskalierbare Radiologie-Software","status":"Deep Dive nötig"},{"rank":11,"ticker":"MSI","name":"Motorola Solutions","origin":"Neue 150er-Recherche","quality":92.0,"zone":"AUSSTEHEND","moat":"Mission-kritische Funk- und Leitstellensysteme","status":"Deep Dive nötig"},{"rank":12,"ticker":"REA.AX","name":"REA Group","origin":"Neue 150er-Recherche","quality":92.0,"zone":"AUSSTEHEND","moat":"Dominantes Immobilienportal","status":"Deep Dive nötig"},{"rank":13,"ticker":"CPRT","name":"Copart","origin":"Neue 100er-Recherche","quality":91.8,"zone":"AUSSTEHEND","moat":"Auktionsnetzwerk plus schwer replizierbares Landnetz","status":"Deep Dive nötig"},{"rank":14,"ticker":"IDXX","name":"IDEXX Laboratories","origin":"Neue 100er-Recherche","quality":91.6,"zone":"AUSSTEHEND","moat":"Instrumente, Verbrauchsmaterial und Referenzlabore","status":"Deep Dive nötig"},{"rank":15,"ticker":"BKNG","name":"Booking Holdings","origin":"Neue 150er-Recherche","quality":91.0,"zone":"AUSSTEHEND","moat":"Reise-Marktplatz und Nachfrage-Liquidität","status":"Deep Dive nötig"},{"rank":16,"ticker":"MELI","name":"MercadoLibre","origin":"Neue 150er-Recherche","quality":91.0,"zone":"AUSSTEHEND","moat":"Commerce-, Payments- und Logistiknetz","status":"Deep Dive nötig"},{"rank":17,"ticker":"LLY","name":"Eli Lilly","origin":"Neue 150er-Recherche","quality":91,"zone":"AUSSTEHEND","moat":"GLP-1- und Pipeline-Führerschaft","status":"Deep Dive nötig"},{"rank":18,"ticker":"7741.T","name":"Hoya","origin":"Neue 150er-Recherche","quality":91,"zone":"AUSSTEHEND","moat":"Optik- und Medtech-Nischen","status":"Deep Dive nötig"},{"rank":19,"ticker":"ITX.MC","name":"Inditex","origin":"Neue 150er-Recherche","quality":91,"zone":"AUSSTEHEND","moat":"Lieferkette, Marke und Filialproduktivität","status":"Deep Dive nötig"},{"rank":20,"ticker":"600519.SS","name":"Kweichow Moutai","origin":"Bisherige Watchlist","quality":91,"zone":"AUSSTEHEND","moat":"Bereits im letzten Screening qualifiziert","status":"bestehendes Research"},{"rank":21,"ticker":"META","name":"Meta Platforms","origin":"Bisherige Watchlist","quality":91,"zone":"AUSSTEHEND","moat":"Bereits im letzten Screening qualifiziert","status":"bestehendes Research"},{"rank":22,"ticker":"VRTX","name":"Vertex Pharmaceuticals","origin":"Neue 150er-Recherche","quality":91,"zone":"AUSSTEHEND","moat":"CF-Franchise und Pipeline","status":"Deep Dive nötig"},{"rank":23,"ticker":"ATCO-A.ST","name":"Atlas Copco","origin":"Neue 150er-Recherche","quality":91.0,"zone":"AUSSTEHEND","moat":"Kompressoren-Installed-Base und Service","status":"Deep Dive nötig"},{"rank":24,"ticker":"BEAN.SW","name":"Belimo","origin":"Neue 150er-Recherche","quality":91.0,"zone":"AUSSTEHEND","moat":"Gebäudeaktoren-Nische und Innovation","status":"Deep Dive nötig"},{"rank":25,"ticker":"NOW","name":"ServiceNow","origin":"Neue 100er-Recherche","quality":90.3,"zone":"AUSSTEHEND","moat":"Enterprise-Workflow-Plattform","status":"Deep Dive nötig"},{"rank":26,"ticker":"MSCI","name":"MSCI","origin":"Neue 100er-Recherche","quality":90.1,"zone":"AUSSTEHEND","moat":"Indizes und eingebettete Workflows","status":"Deep Dive nötig"},{"rank":27,"ticker":"BSY","name":"Bentley Systems","origin":"Neue 150er-Recherche","quality":90.0,"zone":"AUSSTEHEND","moat":"Infrastruktur-Engineering-Standard","status":"Deep Dive nötig"},{"rank":28,"ticker":"TNE.AX","name":"TechnologyOne","origin":"Neue 150er-Recherche","quality":90.0,"zone":"AUSSTEHEND","moat":"ERP für öffentliche Institutionen","status":"Deep Dive nötig"},{"rank":29,"ticker":"ASSA-B.ST","name":"Assa Abloy","origin":"Neue 150er-Recherche","quality":90,"zone":"AUSSTEHEND","moat":"Zutrittslösungen, Marke und M&A","status":"Deep Dive nötig"},{"rank":30,"ticker":"COLO-B.CO","name":"Coloplast","origin":"Neue 150er-Recherche","quality":90,"zone":"AUSSTEHEND","moat":"Stoma-Verbrauchsmaterial und Kundenbindung","status":"Deep Dive nötig"},{"rank":31,"ticker":"MCD","name":"McDonald's","origin":"Neue 150er-Recherche","quality":90,"zone":"AUSSTEHEND","moat":"Franchise, Immobilien und Marke","status":"Deep Dive nötig"},{"rank":32,"ticker":"REGN","name":"Regeneron","origin":"Neue 150er-Recherche","quality":90,"zone":"AUSSTEHEND","moat":"Antikörperplattform und Forschungskultur","status":"Deep Dive nötig"},{"rank":33,"ticker":"TRI.TO","name":"Thomson Reuters","origin":"Neue 150er-Recherche","quality":90,"zone":"AUSSTEHEND","moat":"Rechts- und Steuer-Workflows","status":"Deep Dive nötig"},{"rank":34,"ticker":"TT","name":"Trane Technologies","origin":"Neue 150er-Recherche","quality":90,"zone":"AUSSTEHEND","moat":"Effizienz, Marke und Service","status":"Deep Dive nötig"},{"rank":35,"ticker":"4519.T","name":"Chugai Pharmaceutical","origin":"Neue 150er-Recherche","quality":90.0,"zone":"AUSSTEHEND","moat":"Antikörperforschung und Roche-Zugang","status":"Deep Dive nötig"},{"rank":36,"ticker":"9983.T","name":"Fast Retailing","origin":"Neue 150er-Recherche","quality":90.0,"zone":"AUSSTEHEND","moat":"Uniqlo-Marke und Supply Chain","status":"Deep Dive nötig"},{"rank":37,"ticker":"6273.T","name":"SMC","origin":"Neue 150er-Recherche","quality":90.0,"zone":"AUSSTEHEND","moat":"Pneumatik-Standard und Vertrieb","status":"Deep Dive nötig"},{"rank":38,"ticker":"TCS.NS","name":"Tata Consultancy Services","origin":"Neue 150er-Recherche","quality":90.0,"zone":"AUSSTEHEND","moat":"Skala, Kundenbindung und Delivery","status":"Deep Dive nötig"},{"rank":39,"ticker":"8035.T","name":"Tokyo Electron","origin":"Neue 150er-Recherche","quality":90.0,"zone":"AUSSTEHEND","moat":"Wafer-Fab-Oligopol","status":"Deep Dive nötig"},{"rank":40,"ticker":"REL.L","name":"RELX","origin":"Neue 100er-Recherche","quality":89.9,"zone":"AUSSTEHEND","moat":"Entscheidungsdaten in Recht, Risiko und Wissenschaft","status":"Deep Dive nötig"}],"watchMeta":{"title":"Watchlist – 40 von 40 Qualitätsplätzen belegt","sub":"Mitgliedschaft ist preisunabhängig. Kaufziele und Options-Strikes werden anschließend im Blatt „Kaufzonen“ ergänzt. Depotwerte bleiben separat.","note":"Die Watchlist ist jetzt vollständig. „AUSSTEHEND“ bedeutet nicht kaufen: Erst nach DCF/Owner-Earnings, Szenarien und Sicherheitsmarge entsteht ein Kaufsignal."},"grow":[{"rank":1,"ticker":"ADYEN.AS","name":"Adyen","sector":"Payments","region":"Europa/Global","arche":"Finanz-Netzwerk","score":92.0,"dyn":"steigend","g":0.13,"zone":"HALTEN","conf":"Hoch","signal":"H1 2026: Nettoerlös +19% (+21% währungsbereinigt), EBITDA-Marge rund 49%.","risk":"Take-rate-Druck, Großkunden und neue Akquisitionen."},{"rank":2,"ticker":"WISE.L","name":"Wise","sector":"Fintech","region":"UK/Global","arche":"Finanz-Netzwerk","score":92.0,"dyn":"stark steigend","g":0.13,"zone":"KAUFEN","conf":"Hoch","signal":"FY26: aktive Kunden +21%, Nettoerlös +19%, Volumen +31%.","risk":"Regulierung, Take-rate-Druck und Governance."},{"rank":3,"ticker":"AXON","name":"Axon Enterprise","sector":"Public-Safety-Tech","region":"USA/Global","arche":"Installed Base + SaaS","score":91.0,"dyn":"stark steigend","g":0.14,"zone":"HALTEN","conf":"Hoch","signal":"Q2 2026: Umsatz +35%, ARR +39%, Net Revenue Retention 126%.","risk":"Hohe Erwartungen, Behördenbudgets und Aktienvergütung."},{"rank":4,"ticker":"DDOG","name":"Datadog","sector":"Cloud Software","region":"USA/Global","arche":"Software-Plattform","score":90.0,"dyn":"stark steigend","g":0.14,"zone":"HALTEN","conf":"Hoch","signal":"Q2 2026: Umsatz +36%, Free Cashflow 279 Mio. USD.","risk":"Großkunden-Nutzung, Hyperscaler und Aktienvergütung."},{"rank":5,"ticker":"NU","name":"Nu Holdings","sector":"Digital Banking","region":"Lateinamerika","arche":"Finanz-Netzwerk","score":90.0,"dyn":"stark steigend","g":0.14,"zone":"HALTEN","conf":"Mittel-Hoch","signal":"Q2 2026: 139 Mio. Kunden, Umsatz +39%, erstmals über 1 Mrd. USD Quartalsgewinn.","risk":"Kreditzyklus, Regulierung, Brasilienkonzentration."},{"rank":6,"ticker":"IOT","name":"Samsara","sector":"Industrial IoT","region":"USA/Global","arche":"Installed Base + SaaS","score":90.0,"dyn":"stark steigend","g":0.15,"zone":"HALTEN","conf":"Mittel-Hoch","signal":"Wachstum über 20% bei deutlich steigender Free-Cashflow-Marge.","risk":"Aktienvergütung, Wettbewerb und noch junge Profitabilität."},{"rank":7,"ticker":"SECT-B.ST","name":"Sectra","sector":"Healthcare IT","region":"Schweden/Global","arche":"Vertical Software","score":89.0,"dyn":"steigend","g":0.11,"zone":"HALTEN","conf":"Hoch","signal":"FY25/26: EBIT-Marge 20,1%; Cloud-Recurring-Erlöse wachsen stark.","risk":"Projekt-Timing, Währung und öffentliche Beschaffung."},{"rank":8,"ticker":"CRDO","name":"Credo Technology","sector":"Semiconductors","region":"USA/Global","arche":"Technologie-Enabler","score":88.0,"dyn":"stark steigend","g":0.16,"zone":"REDUZIEREN","conf":"Mittel","signal":"Q4 FY26: Umsatz +157%, GAAP-Bruttomarge 68,2%, Netto-Cash.","risk":"Extreme Kundenkonzentration und AI-Capex-Zyklus."},{"rank":9,"ticker":"DNP.WA","name":"Dino Polska","sector":"Lebensmitteleinzelhandel","region":"Polen","arche":"Rollout-Compounder","score":88.0,"dyn":"steigend","g":0.12,"zone":"KAUFEN","conf":"Mittel-Hoch","signal":"Dichtes Filial- und Logistiknetz mit langem nationalem Rollout-Pfad.","risk":"Lohnkosten, Preiskampf und sinkende Neubau-Renditen."},{"rank":10,"ticker":"MPWR","name":"Monolithic Power Systems","sector":"Semiconductors","region":"USA/Global","arche":"Technologie-Enabler","score":88.0,"dyn":"steigend","g":0.12,"zone":"HALTEN","conf":"Hoch","signal":"Hohe Bruttomargen und Ausweitung in Automotive, Enterprise Data und Storage.","risk":"China, Kundenkonzentration und Halbleiterzyklus."},{"rank":11,"ticker":"DUOL","name":"Duolingo","sector":"Consumer Software","region":"USA/Global","arche":"Consumer-Netzwerk","score":87.0,"dyn":"gemischt","g":0.12,"zone":"HALTEN","conf":"Mittel","signal":"Nutzerbasis wächst weiter, aber Bookings-Wachstum 2026 verlangsamt sich deutlich.","risk":"AI-Substitution, Monetarisierung und hohe Erwartungen."},{"rank":12,"ticker":"KNSL","name":"Kinsale Capital","sector":"Specialty Insurance","region":"USA","arche":"Finanz-Plattform","score":87.0,"dyn":"steigend","g":0.12,"zone":"KAUFEN","conf":"Hoch","signal":"Technologiegestütztes Underwriting mit hoher Profitabilität im E&S-Markt.","risk":"Schadeninflation, Zyklus und Reservierungsfehler."},{"rank":13,"ticker":"APPF","name":"AppFolio","sector":"Property Software","region":"USA","arche":"Vertical Software","score":86.0,"dyn":"stark steigend","g":0.13,"zone":"HALTEN","conf":"Mittel-Hoch","signal":"Vertikale Plattform mit wachsenden Payments- und Value-added Services.","risk":"Immobilienzyklus, Wettbewerb und Aktienvergütung."},{"rank":14,"ticker":"CAMS.NS","name":"Computer Age Management Services","sector":"Financial Infrastructure","region":"Indien","arche":"Finanz-Infrastruktur","score":86.0,"dyn":"steigend","g":0.11,"zone":"HALTEN","conf":"Mittel-Hoch","signal":"Infrastruktur für Fondsadministration mit hohen Wechselkosten und Asset-Wachstum.","risk":"Regulierung, Gebührenkompression und Marktkonzentration."},{"rank":15,"ticker":"DSG.TO","name":"Descartes Systems","sector":"Logistics Software","region":"Kanada/Global","arche":"Vertical Software","score":86.0,"dyn":"steigend","g":0.1,"zone":"HALTEN","conf":"Hoch","signal":"Wiederkehrende Logistik-Workflows plus disziplinierte Nischenakquisitionen.","risk":"M&A-Preise, Frachtzyklus und Integrationsrisiko."},{"rank":16,"ticker":"GAW.L","name":"Games Workshop","sector":"IP / Consumer","region":"UK/Global","arche":"IP + Community","score":86.0,"dyn":"steigend","g":0.09,"zone":"HALTEN","conf":"Hoch","signal":"Warhammer-IP, Community und Lizenzgeschäft erzeugen außergewöhnliche Margen.","risk":"Franchise-Abhängigkeit und schwankende Lizenzbeiträge."},{"rank":17,"ticker":"6544.T","name":"Japan Elevator Service","sector":"Industrial Services","region":"Japan","arche":"Installed Base + Service","score":86.0,"dyn":"steigend","g":0.12,"zone":"KAUFEN","conf":"Mittel-Hoch","signal":"Unabhängige Wartungsplattform gewinnt Anteil in einem wiederkehrenden Servicemarkt.","risk":"Arbeitskräfte, OEM-Gegenwehr und nationale Konzentration."},{"rank":18,"ticker":"MEDP","name":"Medpace","sector":"Clinical Research","region":"USA/Global","arche":"Spezialisierte Plattform","score":86.0,"dyn":"steigend","g":0.11,"zone":"HALTEN","conf":"Mittel-Hoch","signal":"Organisches CRO-Modell mit hoher Kapitalrendite und fokussierter Ausführung.","risk":"Biotech-Finanzierung, Kundenkonzentration und Auftragsstornos."},{"rank":19,"ticker":"NVMI","name":"Nova Ltd.","sector":"Semiconductor Equipment","region":"Israel/Global","arche":"Technologie-Enabler","score":86.0,"dyn":"steigend","g":0.12,"zone":"HALTEN","conf":"Mittel-Hoch","signal":"Metrologieanteil steigt mit Chip-Komplexität und Advanced Packaging.","risk":"Halbleiterzyklus, China und Kundenkonzentration."},{"rank":20,"ticker":"360.AX","name":"Life360","sector":"Consumer Software","region":"USA/Global","arche":"Consumer-Netzwerk","score":85.0,"dyn":"stark steigend","g":0.14,"zone":"KAUFEN","conf":"Mittel","signal":"Familiennetzwerk monetarisiert Freemium-Nutzer über Abos und Hardware.","risk":"Datenschutz, Plattformabhängigkeit und Churn."},{"rank":21,"ticker":"MNDY","name":"monday.com","sector":"Cloud Software","region":"Israel/Global","arche":"Software-Plattform","score":85.0,"dyn":"steigend","g":0.12,"zone":"KAUFEN","conf":"Mittel-Hoch","signal":"Q2 2026: Umsatz +22%; AI-Produkte gewinnen Net-New-ARR-Anteil.","risk":"Wettbewerb, Billings-Schwäche und Aktienvergütung."},{"rank":22,"ticker":"ONON","name":"On Holding","sector":"Sportswear","region":"Schweiz/Global","arche":"Premium Brand","score":85.0,"dyn":"steigend","g":0.12,"zone":"KAUFEN","conf":"Mittel","signal":"Premium-Positionierung und Direct-to-Consumer-Ausbau bei globaler Expansion.","risk":"Moderisiko, Nike/Adidas und Margendruck durch Expansion."},{"rank":23,"ticker":"TW","name":"Tradeweb Markets","sector":"Market Infrastructure","region":"USA/Global","arche":"Finanz-Netzwerk","score":85.0,"dyn":"steigend","g":0.1,"zone":"KAUFEN","conf":"Hoch","signal":"Elektronische Handelsliquidität verstärkt Netzwerk- und Datenvorteile.","risk":"Volumenschwankungen, Regulierung und Konkurrenz."},{"rank":24,"ticker":"WING","name":"Wingstop","sector":"Restaurants","region":"USA/Global","arche":"Rollout-Compounder","score":85.0,"dyn":"steigend","g":0.11,"zone":"KAUFEN","conf":"Mittel-Hoch","signal":"Asset-light Franchise, starke Unit Economics und internationaler White Space.","risk":"Hühnerpreise, hohe Verschuldung und Franchise-Qualität."},{"rank":25,"ticker":"DPLM.L","name":"Diploma","sector":"Specialty Distribution","region":"UK/Global","arche":"Serial Acquirer","score":84.0,"dyn":"steigend","g":0.1,"zone":"HALTEN","conf":"Hoch","signal":"Nischenprodukte, Pricing und dezentrale M&A-Plattform.","risk":"Akquisitionspreise, Leverage und Integrationsdisziplin."},{"rank":26,"ticker":"FPH.NZ","name":"Fisher & Paykel Healthcare","sector":"Medtech","region":"Neuseeland/Global","arche":"Installed Base + Consumables","score":84.0,"dyn":"steigend","g":0.1,"zone":"HALTEN","conf":"Hoch","signal":"Wachsende installierte Basis treibt wiederkehrende Verbrauchsmaterialerlöse.","risk":"Krankenhausbudgets, FX und Produkt-/Regulierungsrisiko."},{"rank":27,"ticker":"GTK.NZ","name":"Gentrack","sector":"Utility Software","region":"Neuseeland/Global","arche":"Vertical Software","score":84.0,"dyn":"stark steigend","g":0.12,"zone":"KAUFEN","conf":"Mittel","signal":"Utilities modernisieren Billing und Customer Operations in Richtung SaaS.","risk":"Projektkonzentration, Ausführung und kleine Größe."},{"rank":28,"ticker":"NEM.DE","name":"Nemetschek","sector":"AEC Software","region":"Deutschland/Global","arche":"Vertical Software","score":84.0,"dyn":"steigend","g":0.1,"zone":"KAUFEN","conf":"Hoch","signal":"BIM- und Design-Workflows wechseln weiter zu wiederkehrenden Erlösen.","risk":"Cloud-Transition, M&A und Wettbewerb durch Autodesk."},{"rank":29,"ticker":"TOI.V","name":"Topicus.com","sector":"Vertical Software","region":"Europa","arche":"Serial Acquirer","score":84.0,"dyn":"steigend","g":0.11,"zone":"HALTEN","conf":"Mittel-Hoch","signal":"Q2 2026: Umsatz +18%, organisch jedoch nur rund 4%.","risk":"M&A-Abhängigkeit, Governance und niedriger organischer Sockel."},{"rank":30,"ticker":"CAMT","name":"Camtek","sector":"Semiconductor Equipment","region":"Israel/Global","arche":"Technologie-Enabler","score":83.0,"dyn":"steigend","g":0.12,"zone":"HALTEN","conf":"Mittel","signal":"Advanced Packaging erhöht Inspektionsintensität und adressierbaren Markt.","risk":"Halbleiterzyklus, Kundenkonzentration und geopolitisches Risiko."},{"rank":31,"ticker":"FIX","name":"Comfort Systems USA","sector":"Technical Services","region":"USA","arche":"Installed Base + Service","score":83.0,"dyn":"stark steigend","g":0.1,"zone":"REDUZIEREN","conf":"Mittel","signal":"Q2 2026: Umsatz +50%, Backlog 14,1 Mrd. USD; AI-/Rechenzentrumstreiber.","risk":"Zyklischer Capex-Boom, Arbeitskräfte und Peak-Margen."},{"rank":32,"ticker":"PERSISTENT.NS","name":"Persistent Systems","sector":"IT Services","region":"Indien/Global","arche":"Spezialisierte Plattform","score":83.0,"dyn":"steigend","g":0.12,"zone":"HALTEN","conf":"Mittel-Hoch","signal":"Q1 FY27: Umsatz +16,1%, 25. Quartal in Folge Wachstum, EBIT-Marge 16%.","risk":"Personalintensität, Großauftrag und AI-Disruption."},{"rank":33,"ticker":"RYAN","name":"Ryan Specialty","sector":"Insurance Distribution","region":"USA","arche":"Finanz-Plattform","score":83.0,"dyn":"steigend","g":0.11,"zone":"HALTEN","conf":"Mittel-Hoch","signal":"Specialty-Distribution profitiert von Komplexität und E&S-Anteilsgewinnen.","risk":"M&A, Talentbindung und Versicherungszyklus."},{"rank":34,"ticker":"VIT-B.ST","name":"Vitec Software","sector":"Vertical Software","region":"Nordics/Europa","arche":"Serial Acquirer","score":83.0,"dyn":"steigend","g":0.1,"zone":"HALTEN","conf":"Mittel-Hoch","signal":"Mission-kritische Branchensoftware mit wiederkehrenden Erlösen und dezentraler M&A.","risk":"M&A-Preise, Verschuldung und organische Wachstumsgrenze."},{"rank":35,"ticker":"BMI","name":"Badger Meter","sector":"Water Technology","region":"USA/Global","arche":"Installed Base + SaaS","score":82.0,"dyn":"steigend","g":0.09,"zone":"KAUFEN","conf":"Hoch","signal":"Smart Metering verbindet Hardwarebasis mit Software- und Datenumsätzen.","risk":"Kommunalbudgets, Beschaffung und zyklische Projekte."},{"rank":36,"ticker":"GTLB","name":"GitLab","sector":"DevSecOps Software","region":"USA/Global","arche":"Software-Plattform","score":82.0,"dyn":"steigend","g":0.13,"zone":"HALTEN","conf":"Mittel","signal":"Einheitliche DevSecOps-Plattform mit AI-Upsell; Cashflow verbessert sich.","risk":"Microsoft/GitHub, Aktienvergütung und Profitabilität."},{"rank":37,"ticker":"LAGR-B.ST","name":"Lagercrantz","sector":"Industrial Technology","region":"Nordics/Europa","arche":"Serial Acquirer","score":82.0,"dyn":"steigend","g":0.1,"zone":"HALTEN","conf":"Mittel-Hoch","signal":"Dezentrale Nischenplattform mit kleinen Bolt-on-Akquisitionen.","risk":"M&A-Preise, Leverage und Nachfolge."},{"rank":38,"ticker":"NTRA","name":"Natera","sector":"Diagnostics","region":"USA","arche":"Daten + Diagnostik","score":82.0,"dyn":"stark steigend","g":0.14,"zone":"REDUZIEREN","conf":"Mittel","signal":"Signatera und genetische Tests skalieren Datenbasis und klinische Nutzung.","risk":"Erstattung, Rechtsrisiken und noch unbewiesene Kapitalrendite."},{"rank":39,"ticker":"OCL.AX","name":"Objective Corp","sector":"Government Software","region":"Australien/UK","arche":"Vertical Software","score":82.0,"dyn":"steigend","g":0.1,"zone":"HALTEN","conf":"Mittel-Hoch","signal":"Regierungs-Workflows schaffen hohe Wechselkosten und wiederkehrende Erlöse.","risk":"Kleine Größe, öffentliche Budgets und regionale Konzentration."},{"rank":40,"ticker":"ADDT-B.ST","name":"Addtech","sector":"Industrial Technology","region":"Nordics/Europa","arche":"Serial Acquirer","score":81.0,"dyn":"steigend","g":0.1,"zone":"HALTEN","conf":"Mittel-Hoch","signal":"Technische Nischen, dezentrale Führung und disziplinierte Bolt-ons.","risk":"M&A-Preise, Industriezyklus und Verschuldung."},{"rank":41,"ticker":"GMED","name":"Globus Medical","sector":"Medtech","region":"USA/Global","arche":"Installed Base + Consumables","score":81.0,"dyn":"steigend","g":0.1,"zone":"KAUFEN","conf":"Mittel-Hoch","signal":"Robotik, Implantate und Vertriebsintegration verbreitern die Plattform.","risk":"Integration, Krankenhausbudgets und Produkt-/Haftungsrisiken."},{"rank":42,"ticker":"LMN.V","name":"Lumine Group","sector":"Vertical Software","region":"Global","arche":"Serial Acquirer","score":81.0,"dyn":"gemischt","g":0.1,"zone":"KAUFEN","conf":"Mittel","signal":"Q2 2026: Umsatz +28%, organisch aber nur etwa +1%.","risk":"Akquisitionsabhängigkeit, Finanzierung und schwaches organisches Wachstum."},{"rank":43,"ticker":"BEIJ-B.ST","name":"Beijer Ref","sector":"HVAC/R","region":"Europa/Global","arche":"Distribution + Installed Base","score":80.0,"dyn":"steigend","g":0.1,"zone":"HALTEN","conf":"Mittel","signal":"Kältemittel-Regulierung und Wärmepumpen treiben Produktmix und Konsolidierung.","risk":"Bauzyklus, Akquisitionen und Lagerbestände."},{"rank":44,"ticker":"GSHD","name":"Goosehead Insurance","sector":"Insurance Distribution","region":"USA","arche":"Finanz-Plattform","score":80.0,"dyn":"steigend","g":0.11,"zone":"HALTEN","conf":"Mittel","signal":"Franchise-Distribution und Carrier-Netzwerk ermöglichen asset-light Expansion.","risk":"Franchise-Ausführung, Verschuldung und Carrier-Abhängigkeit."},{"rank":45,"ticker":"MTRS.ST","name":"Munters","sector":"Climate Technology","region":"Schweden/Global","arche":"Technologie-Enabler","score":80.0,"dyn":"steigend","g":0.1,"zone":"HALTEN","conf":"Mittel","signal":"Data-Center-Kühlung und energieeffiziente Luftbehandlung bieten strukturellen Rückenwind.","risk":"Projektzyklus, Kundenkonzentration und Capex-Boom."},{"rank":46,"ticker":"QTCO.HE","name":"Qt Group","sector":"Developer Software","region":"Finnland/Global","arche":"Software-Plattform","score":80.0,"dyn":"gemischt","g":0.11,"zone":"HALTEN","conf":"Mittel","signal":"Cross-platform UI-Framework profitiert von Softwareanteil in Geräten und Autos.","risk":"Lizenzmodell, Open Source und schwankende Großabschlüsse."},{"rank":47,"ticker":"RBRK","name":"Rubrik","sector":"Cybersecurity","region":"USA/Global","arche":"Software-Plattform","score":80.0,"dyn":"stark steigend","g":0.14,"zone":"HALTEN","conf":"Mittel-Niedrig","signal":"Cyber-Recovery und Datenresilienz gewinnen mit AI- und Ransomware-Risiken an Bedeutung.","risk":"Noch junge Profitabilität, Aktienvergütung und Plattformwettbewerb."},{"rank":48,"ticker":"STRL","name":"Sterling Infrastructure","sector":"Infrastructure Services","region":"USA","arche":"Spezialisierte Plattform","score":80.0,"dyn":"steigend","g":0.1,"zone":"REDUZIEREN","conf":"Mittel","signal":"Mixverschiebung zu E-Infrastructure verbessert Wachstum und Marge.","risk":"Projektzyklus, Kundendichte und Rechenzentrum-Capex."},{"rank":49,"ticker":"VU.PA","name":"VusionGroup","sector":"Retail Technology","region":"Frankreich/Global","arche":"Installed Base + SaaS","score":79.0,"dyn":"steigend","g":0.11,"zone":"HALTEN","conf":"Mittel-Niedrig","signal":"Elektronische Preisschilder entwickeln sich zur vernetzten Retail-IoT-Plattform.","risk":"Großprojekte, Kundenkonzentration und Hardwaremargen."},{"rank":50,"ticker":"TMDX","name":"TransMedics","sector":"Medtech","region":"USA","arche":"Installed Base + Service","score":78.0,"dyn":"stark steigend","g":0.13,"zone":"HALTEN","conf":"Mittel-Niedrig","signal":"Organ-Care-Plattform erweitert Transplantationskapazität und Logistiknetz.","risk":"Klinische/Erstattungsrisiken, Kapitalintensität und Ausführungsdruck."}],"gcp":[{"ticker":"MNDY","name":"monday.com","ccy":"USD","price":96.33,"fv":150.0,"mosBuy":0.25,"mosStrong":0.4,"prem":0.35,"conf":"Niedrig","method":"Umsatz/FCF zu reifer Marge"},{"ticker":"KNSL","name":"Kinsale Capital","ccy":"USD","price":373.53,"fv":500.0,"mosBuy":0.15,"mosStrong":0.3,"prem":0.25,"conf":"Hoch","method":"Normalisiertes EPS + Underwriting-Qualität"},{"ticker":"WING","name":"Wingstop","ccy":"USD","price":109.555,"fv":140.0,"mosBuy":0.15,"mosStrong":0.3,"prem":0.25,"conf":"Hoch","method":"Franchise-Owner-Earnings + Rollout"},{"ticker":"GMED","name":"Globus Medical","ccy":"USD","price":79.8,"fv":100.0,"mosBuy":0.15,"mosStrong":0.3,"prem":0.25,"conf":"Hoch","method":"Normalisiertes EPS + Medtech-Moat"},{"ticker":"360.AX","name":"Life360","ccy":"AUD","price":20.0,"fv":28.0,"mosBuy":0.25,"mosStrong":0.4,"prem":0.35,"conf":"Niedrig","method":"Abo-Unit-Economics + reife Marge"},{"ticker":"LMN.V","name":"Lumine","ccy":"CAD","price":24.39,"fv":32.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Acquisition Economics + FCF"},{"ticker":"GTK.NZ","name":"Gentrack","ccy":"NZD","price":4.67,"fv":6.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"ARR + reife FCF-Marge"},{"ticker":"TW","name":"Tradeweb","ccy":"USD","price":107.68,"fv":130.0,"mosBuy":0.15,"mosStrong":0.3,"prem":0.25,"conf":"Hoch","method":"Normalisiertes EPS + Netzwerk-Multiple"},{"ticker":"WISE.L","name":"Wise","ccy":"GBP","price":9.496,"fv":12.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Netzwerkökonomie + normalisierte Ertragskraft"},{"ticker":"6544.T","name":"Japan Elevator Service","ccy":"JPY","price":1504.0,"fv":1900.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Service-Installed-Base + normalisiertes EPS"},{"ticker":"ONON","name":"On Holding","ccy":"USD","price":27.81,"fv":35.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Normalisiertes EPS + Markenqualität"},{"ticker":"NEM.DE","name":"Nemetschek","ccy":"EUR","price":67.9,"fv":80.0,"mosBuy":0.15,"mosStrong":0.3,"prem":0.25,"conf":"Hoch","method":"Normalisierter FCF + Software-Multiple"},{"ticker":"BMI","name":"Badger Meter","ccy":"USD","price":131.57,"fv":155.0,"mosBuy":0.15,"mosStrong":0.3,"prem":0.25,"conf":"Hoch","method":"Normalisiertes EPS + Installed Base"},{"ticker":"DNP.WA","name":"Dino Polska","ccy":"PLN","price":36.0,"fv":45.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Rollout-Ökonomie + normalisierte Marge"},{"ticker":"TMDX","name":"TransMedics","ccy":"USD","price":82.77,"fv":110.0,"mosBuy":0.25,"mosStrong":0.4,"prem":0.35,"conf":"Niedrig","method":"Unit Economics + reife Medtech-Marge"},{"ticker":"NU","name":"Nu Holdings","ccy":"USD","price":14.49,"fv":18.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Normalisierte Ertragskraft + Wachstum"},{"ticker":"ADYEN.AS","name":"Adyen","ccy":"EUR","price":1007.0,"fv":1250.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Netzwerkökonomie + normalisierte FCF-Marge"},{"ticker":"VU.PA","name":"VusionGroup","ccy":"EUR","price":128.9,"fv":160.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Normalisiertes EPS + Installed Base"},{"ticker":"OCL.AX","name":"Objective Corporation","ccy":"AUD","price":6.61,"fv":8.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Normalisierter FCF + GovTech-Moat"},{"ticker":"TOI.V","name":"Topicus","ccy":"CAD","price":103.84,"fv":125.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Acquisition Economics + FCF"},{"ticker":"BEIJ-B.ST","name":"Beijer Ref","ccy":"SEK","price":137.0,"fv":155.0,"mosBuy":0.15,"mosStrong":0.3,"prem":0.25,"conf":"Hoch","method":"Normalisiertes EPS + Distribution-Moat"},{"ticker":"VIT-B.ST","name":"Vitec Software","ccy":"SEK","price":275.0,"fv":330.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Recurring FCF + Acquisition Economics"},{"ticker":"CAMS.NS","name":"Computer Age Management Services","ccy":"INR","price":752.0,"fv":900.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Normalisiertes EPS + Infrastruktur-Moat"},{"ticker":"GSHD","name":"Goosehead Insurance","ccy":"USD","price":68.17,"fv":80.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Normalisiertes EPS + Franchise-Ökonomie"},{"ticker":"GAW.L","name":"Games Workshop","ccy":"GBP","price":184.2,"fv":200.0,"mosBuy":0.15,"mosStrong":0.3,"prem":0.25,"conf":"Hoch","method":"Owner Earnings + IP-Qualität"},{"ticker":"GTLB","name":"GitLab","ccy":"USD","price":44.92,"fv":55.0,"mosBuy":0.25,"mosStrong":0.4,"prem":0.35,"conf":"Niedrig","method":"ARR + reife FCF-Marge"},{"ticker":"APPF","name":"AppFolio","ccy":"USD","price":227.27,"fv":260.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"FCF + Payments-Upside"},{"ticker":"RYAN","name":"Ryan Specialty","ccy":"USD","price":42.36,"fv":48.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Normalisiertes EPS + Specialty-Broker-Multiple"},{"ticker":"DUOL","name":"Duolingo","ccy":"USD","price":157.87,"fv":190.0,"mosBuy":0.25,"mosStrong":0.4,"prem":0.35,"conf":"Niedrig","method":"Bookings + reife FCF-Marge"},{"ticker":"IOT","name":"Samsara","ccy":"USD","price":39.025,"fv":46.0,"mosBuy":0.25,"mosStrong":0.4,"prem":0.35,"conf":"Niedrig","method":"ARR + reife FCF-Marge"},{"ticker":"PERSISTENT.NS","name":"Persistent Systems","ccy":"INR","price":5741.0,"fv":6200.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Normalisiertes EPS + Digital-Engineering-Multiple"},{"ticker":"QTCO.HE","name":"Qt Group","ccy":"EUR","price":35.34,"fv":38.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"ARR + normalisierte Software-Marge"},{"ticker":"LAGR-B.ST","name":"Lagercrantz","ccy":"SEK","price":225.0,"fv":220.0,"mosBuy":0.15,"mosStrong":0.3,"prem":0.25,"conf":"Hoch","method":"Owner Earnings + Acquisition Economics"},{"ticker":"ADDT-B.ST","name":"Addtech","ccy":"SEK","price":330.6,"fv":320.0,"mosBuy":0.15,"mosStrong":0.3,"prem":0.25,"conf":"Hoch","method":"Owner Earnings + Acquisition Economics"},{"ticker":"MEDP","name":"Medpace","ccy":"USD","price":584.92,"fv":600.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Normalisiertes EPS + CRO-Qualität"},{"ticker":"DPLM.L","name":"Diploma","ccy":"GBP","price":71.3,"fv":65.0,"mosBuy":0.15,"mosStrong":0.3,"prem":0.25,"conf":"Hoch","method":"Owner Earnings + Acquisition Economics"},{"ticker":"NVMI","name":"Nova","ccy":"USD","price":339.0,"fv":320.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Zyklusnormalisiertes EPS"},{"ticker":"DSG.TO","name":"Descartes Systems","ccy":"CAD","price":112.91,"fv":100.0,"mosBuy":0.15,"mosStrong":0.3,"prem":0.25,"conf":"Hoch","method":"Normalisierter FCF + Vertical-Software-Multiple"},{"ticker":"MTRS.ST","name":"Munters","ccy":"SEK","price":159.55,"fv":150.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Normalisiertes EPS + strukturelles Wachstum"},{"ticker":"CAMT","name":"Camtek","ccy":"USD","price":129.18,"fv":120.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Zyklusnormalisiertes EPS"},{"ticker":"FPH.NZ","name":"Fisher & Paykel Healthcare","ccy":"NZD","price":44.2,"fv":36.0,"mosBuy":0.15,"mosStrong":0.3,"prem":0.25,"conf":"Hoch","method":"Normalisiertes EPS + Medtech-Qualität"},{"ticker":"SECT-B.ST","name":"Sectra","ccy":"SEK","price":287.6,"fv":240.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Normalisierte Ertragskraft + Recurring Mix"},{"ticker":"MPWR","name":"Monolithic Power Systems","ccy":"USD","price":1227.75,"fv":1000.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Normalisiertes EPS + Qualitätsmultiple"},{"ticker":"AXON","name":"Axon Enterprise","ccy":"USD","price":521.92,"fv":450.0,"mosBuy":0.25,"mosStrong":0.4,"prem":0.35,"conf":"Niedrig","method":"Umsatz/ARR zu reifer Marge"},{"ticker":"STRL","name":"Sterling Infrastructure","ccy":"USD","price":457.01,"fv":350.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Zyklusnormalisiertes EPS + FCF"},{"ticker":"FIX","name":"Comfort Systems","ccy":"USD","price":1552.96,"fv":1150.0,"mosBuy":0.2,"mosStrong":0.35,"prem":0.3,"conf":"Mittel","method":"Zyklusnormalisiertes EPS + FCF"},{"ticker":"RBRK","name":"Rubrik","ccy":"USD","price":88.82,"fv":70.0,"mosBuy":0.25,"mosStrong":0.4,"prem":0.35,"conf":"Niedrig","method":"ARR + reife FCF-Marge"},{"ticker":"DDOG","name":"Datadog","ccy":"USD","price":224.23,"fv":170.0,"mosBuy":0.25,"mosStrong":0.4,"prem":0.35,"conf":"Niedrig","method":"Umsatz/FCF zu reifer Marge"},{"ticker":"CRDO","name":"Credo Technology","ccy":"USD","price":212.74,"fv":150.0,"mosBuy":0.25,"mosStrong":0.4,"prem":0.35,"conf":"Niedrig","method":"Zyklusnormalisierte Ertragskraft"},{"ticker":"NTRA","name":"Natera","ccy":"USD","price":323.84,"fv":220.0,"mosBuy":0.25,"mosStrong":0.4,"prem":0.35,"conf":"Niedrig","method":"Umsatz + reife Diagnostik-Marge"}],"plan":[{"src":"DEPOT","ticker":"PLTR","name":"Palantir","signal":"VERKAUFEN","price":186.38,"ccy":"USD","distBuy":0.49104,"quality":60.15,"conf":"Niedrig","reason":"Bewertungsschwelle erreicht – These, Steuern und Teilverkauf prüfen"},{"src":"GROWING 50","ticker":"NTRA","name":"Natera","signal":"REDUZIEREN","price":323.84,"ccy":"USD","distBuy":0.962667,"quality":82.0,"conf":"Niedrig","reason":"Über Reduzieren-Schwelle – keine automatische Liquidation"},{"src":"GROWING 50","ticker":"CRDO","name":"Credo Technology","signal":"REDUZIEREN","price":212.74,"ccy":"USD","distBuy":0.891022,"quality":88.0,"conf":"Niedrig","reason":"Über Reduzieren-Schwelle – keine automatische Liquidation"},{"src":"GROWING 50","ticker":"FIX","name":"Comfort Systems","signal":"REDUZIEREN","price":1552.96,"ccy":"USD","distBuy":0.688,"quality":83.0,"conf":"Mittel","reason":"Über Reduzieren-Schwelle – keine automatische Liquidation"},{"src":"GROWING 50","ticker":"STRL","name":"Sterling Infrastructure","signal":"REDUZIEREN","price":457.01,"ccy":"USD","distBuy":0.632179,"quality":80.0,"conf":"Mittel","reason":"Über Reduzieren-Schwelle – keine automatische Liquidation"},{"src":"GROWING 50","ticker":"KNSL","name":"Kinsale Capital","signal":"KAUFEN","price":373.53,"ccy":"USD","distBuy":-0.121106,"quality":87.0,"conf":"Hoch","reason":"Bewertungssignal und freie Gewichtung"},{"src":"GROWING 50","ticker":"WING","name":"Wingstop","signal":"KAUFEN","price":109.555,"ccy":"USD","distBuy":-0.07937,"quality":85.0,"conf":"Hoch","reason":"Bewertungssignal und freie Gewichtung"},{"src":"DEPOT","ticker":"CSGP","name":"CoStar Group","signal":"NACHKAUFEN","price":32.07,"ccy":"USD","distBuy":-0.056765,"quality":86.25,"conf":"Hoch","reason":"Kaufsignal und Gewichtslücke vorhanden"},{"src":"GROWING 50","ticker":"MNDY","name":"monday.com","signal":"KAUFEN","price":96.33,"ccy":"USD","distBuy":-0.143733,"quality":85.0,"conf":"Niedrig","reason":"Bewertungssignal und freie Gewichtung"},{"src":"GROWING 50","ticker":"WISE.L","name":"Wise","signal":"KAUFEN","price":9.496,"ccy":"GBP","distBuy":-0.010833,"quality":92.0,"conf":"Mittel","reason":"Bewertungssignal und freie Gewichtung"},{"src":"GROWING 50","ticker":"TW","name":"Tradeweb","signal":"KAUFEN","price":107.68,"ccy":"USD","distBuy":-0.02552,"quality":85.0,"conf":"Hoch","reason":"Bewertungssignal und freie Gewichtung"},{"src":"GROWING 50","ticker":"GMED","name":"Globus Medical","signal":"KAUFEN","price":79.8,"ccy":"USD","distBuy":-0.061176,"quality":81.0,"conf":"Hoch","reason":"Bewertungssignal und freie Gewichtung"},{"src":"DEPOT","ticker":"ADBE","name":"Adobe","signal":"NACHKAUFEN","price":292.79,"ccy":"USD","distBuy":-0.024033,"quality":85.15,"conf":"Hoch","reason":"Kaufsignal und Gewichtslücke vorhanden"},{"src":"GROWING 50","ticker":"NEM.DE","name":"Nemetschek","signal":"KAUFEN","price":67.9,"ccy":"EUR","distBuy":-0.001471,"quality":84.0,"conf":"Hoch","reason":"Bewertungssignal und freie Gewichtung"},{"src":"GROWING 50","ticker":"DNP.WA","name":"Dino Polska","signal":"KAUFEN","price":36.0,"ccy":"PLN","distBuy":0.0,"quality":88.0,"conf":"Mittel","reason":"Bewertungssignal und freie Gewichtung"},{"src":"GROWING 50","ticker":"BMI","name":"Badger Meter","signal":"KAUFEN","price":131.57,"ccy":"USD","distBuy":-0.001366,"quality":82.0,"conf":"Hoch","reason":"Bewertungssignal und freie Gewichtung"},{"src":"GROWING 50","ticker":"6544.T","name":"Japan Elevator Service","signal":"KAUFEN","price":1504.0,"ccy":"JPY","distBuy":-0.010526,"quality":86.0,"conf":"Mittel","reason":"Bewertungssignal und freie Gewichtung"},{"src":"GROWING 50","ticker":"GTK.NZ","name":"Gentrack","signal":"KAUFEN","price":4.67,"ccy":"NZD","distBuy":-0.027083,"quality":84.0,"conf":"Mittel","reason":"Bewertungssignal und freie Gewichtung"},{"src":"GROWING 50","ticker":"LMN.V","name":"Lumine","signal":"KAUFEN","price":24.39,"ccy":"CAD","distBuy":-0.047266,"quality":81.0,"conf":"Mittel","reason":"Bewertungssignal und freie Gewichtung"},{"src":"GROWING 50","ticker":"ONON","name":"On Holding","signal":"KAUFEN","price":27.81,"ccy":"USD","distBuy":-0.006786,"quality":85.0,"conf":"Mittel","reason":"Bewertungssignal und freie Gewichtung"},{"src":"GROWING 50","ticker":"360.AX","name":"Life360","signal":"KAUFEN","price":20.0,"ccy":"AUD","distBuy":-0.047619,"quality":85.0,"conf":"Niedrig","reason":"Bewertungssignal und freie Gewichtung"},{"src":"DEPOT","ticker":"690D.DE","name":"Qingdao Haier D","signal":"NACHKAUFEN","price":1.8,"ccy":"EUR","distBuy":-0.027027,"quality":73.35,"conf":"Mittel","reason":"Kaufsignal, aber über Max-Gewicht"},{"src":"DEPOT","ticker":"DEF.DE","name":"DEFAMA","signal":"NACHKAUFEN","price":19.55,"ccy":"EUR","distBuy":null,"quality":60.0,"conf":"Niedrig","reason":"Kaufsignal, aber Zielgewicht bereits erreicht"}],"planParams":{"dayBudgetPct":0.15,"reserve":0.2,"trHigh":0.005,"trMid":0.0035,"trLow":0.0025,"maxBuys":3,"minOrder":500.0,"cash":30000.0},"planLegend":[["KAUFEN","Nur wenn „Heute EUR“ > 0. Als Limit-Order in der Kaufzone; nicht dem Kurs hinterherlaufen."],["SPERRE: MAX","Trotz günstigem Preis nicht aufstocken: Konzentrationsrisiko ist wichtiger als das Bewertungssignal."],["WARTEN: ZIEL","Position ist ausreichend groß. Kurs beobachten, aber kein neues Kapital zuweisen."],["VERKAUF PRÜFEN","These, Steuerwirkung und gewünschtes Zielgewicht prüfen; kein automatischer Komplettverkauf."]],"gcConcept":{"factors":[["Organisches Wachstum",20,"Mehrjährige organische Erlös-/Nutzerentwicklung, nicht nur M&A.","Einmalige Nachfrage, Akquisitionen oder Preis allein."],["Inkrementelle Kapitalrendite",20,"Ertrag auf neu investiertes Kapital; bei Software zusätzlich Unit Economics.","Wachstum verbraucht immer mehr Kapital."],["Margen- und Cash-Trajektorie",15,"Bruttomarge, operative Hebelung, FCF-Konversion.","Adjusted Profit steigt, echter Cashflow nicht."],["Entstehender Burggraben",15,"Retention, Pricing, Daten, Netzwerk, Installed Base, Distribution.","Wachstum nur durch Rabatte oder hohe Akquisekosten."],["Reinvestitions-Runway",15,"Viele Jahre zusätzlicher Produkte, Regionen, Kunden oder Standorte.","TAM-Folie ohne belegte Unit Economics."],["Management/Kapitalallokation",10,"Owner-Mentalität, Anreize, M&A-Disziplin, Kommunikation.","Empire Building, aggressive Bilanzierung."],["Bilanz/Verwässerung",5,"Liquidität, Leverage, Aktienzahl und SBC.",">5% Verwässerung p.a. oder Net Debt/EBITDA >3x."]],"kill":["Drei Jahre sinkende Bruttomarge ohne strategisch nachvollziehbare Investitionsphase.","Aktienzahl steigt nachhaltig >5% p.a. ohne mindestens gleichwertigen Wertzuwachs.","Ein Kunde >25% des Umsatzes und Konzentration nimmt weiter zu.","Wachstum wird überwiegend durch M&A, Finanzierung oder zyklische Peakpreise erzeugt.","Retention, Kohortenrendite oder Same-store Economics verschlechtern sich zwei Perioden.","Bilanzierung, Related Parties oder Governance verhindern verlässliche Eigentümerökonomie."],"arche":[["Software/Netzwerk","Retention, ARR, Nutzung, FCF-Marge","Organisch meist >15%; FCF-Trajektorie positiv."],["Serial Acquirer","Organik plus Rendite neuer Zukäufe","Organik positiv; Leverage und Kaufpreise tragbar."],["Installed Base","Service-/Verbrauchsanteil, installierte Einheiten","ROIC und wiederkehrende Erlöse steigen."],["Rollout/Brand","Store-/Kohortenrendite, Wiederkäufe","Neue Einheiten verwässern die Rendite nicht."],["Finanz-Plattform","Kundenökonomie, Cross-sell, Verlustquote","Wachstum risikobereinigt; keine Kreditillusion."]],"evidence":[["Bessembinder – 64.000 globale Aktien","Langfristrenditen sind extrem rechtsschief; eine kleine Minderheit erzeugt den Großteil des Vermögens.","https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3710251"],["Novy-Marx – Gross Profitability","Hohe Bruttorentabilität enthält relevante Information über künftige Renditen und fundamentale Qualität.","https://www.nber.org/papers/w15940"],["Asness/Frazzini/Pedersen – Quality Minus Junk","Qualität wird über Profitabilität, Wachstum, Sicherheit und Kapitalausschüttung operationalisiert.","https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2312432"],["Mauboussin – Measuring the Moat","Moat = Höhe und Dauer des ROIC-WACC-Spreads plus Reinvestitionsmöglichkeit.","https://www.morganstanley.com/im/en-us/individual-investor/insights/series/consilient-observer.html"]],"workflow":[["1. Aktualisieren","Geschäftsberichte, Ergebnispräsentation, Aktienzahl, Bilanz und operative KPIs aktualisieren."],["2. Dynamik messen","Score heute gegen Vorjahr vergleichen; nicht nur absolutes Niveau betrachten."],["3. Thesis testen","Moat-Signal, Unit Economics und Reinvestitionspfad gegen vorher definierte Kill-Kriterien prüfen."],["4. Bewertung separat","DCF/Reverse-DCF, Sicherheitsmarge und Szenarien; erst dann Kaufzone festlegen."],["5. Positionsgröße","Keine automatische Kaufempfehlung. Unsichere Kandidaten nur als Beobachtung, nicht als Kernposition."]]},"universe":[{"u":"R100","ticker":"V","name":"Visa","sector":"Payments","region":"USA","q":93.9,"verdict":"AUFNEHMEN","moat":"Globales Zahlungsnetzwerk"},{"u":"R100","ticker":"MA","name":"Mastercard","sector":"Payments","region":"USA","q":93.9,"verdict":"AUFNEHMEN","moat":"Globales Zahlungsnetzwerk"},{"u":"R100","ticker":"RMS.PA","name":"Hermès","sector":"Luxus","region":"Frankreich","q":92.6,"verdict":"AUFNEHMEN","moat":"Knappheit, Marke und Handwerkskapazität"},{"u":"R100","ticker":"VEEV","name":"Veeva Systems","sector":"Software/Health","region":"USA","q":92.6,"verdict":"AUFNEHMEN","moat":"Life-Science-Cloud mit hohen Wechselkosten"},{"u":"R100","ticker":"CPRT","name":"Copart","sector":"Plattform","region":"USA","q":91.8,"verdict":"AUFNEHMEN","moat":"Auktionsnetzwerk plus schwer replizierbares Landnetz"},{"u":"R100","ticker":"IDXX","name":"IDEXX Laboratories","sector":"Medtech","region":"USA","q":91.7,"verdict":"AUFNEHMEN","moat":"Instrumente, Verbrauchsmaterial und Referenzlabore"},{"u":"R100","ticker":"NOW","name":"ServiceNow","sector":"Software","region":"USA","q":90.3,"verdict":"AUFNEHMEN","moat":"Enterprise-Workflow-Plattform"},{"u":"R100","ticker":"MSCI","name":"MSCI","sector":"Finanzdaten","region":"USA","q":90.1,"verdict":"AUFNEHMEN","moat":"Indizes und eingebettete Workflows"},{"u":"R100","ticker":"REL.L","name":"RELX","sector":"Daten","region":"UK","q":89.9,"verdict":"AUFNEHMEN","moat":"Entscheidungsdaten in Recht, Risiko und Wissenschaft"},{"u":"R100","ticker":"RACE","name":"Ferrari","sector":"Luxus","region":"Italien","q":89.8,"verdict":"AUFNEHMEN","moat":"Künstliche Knappheit und Personalisierung"},{"u":"R100","ticker":"COST","name":"Costco","sector":"Handel","region":"USA","q":89.8,"verdict":"AUFNEHMEN","moat":"Mitgliedschaft und extreme Kundentreue"},{"u":"R100","ticker":"ARM","name":"Arm Holdings","sector":"Halbleiter-IP","region":"UK","q":89.5,"verdict":"AUFNEHMEN","moat":"CPU-IP-Standard und Lizenzmodell"},{"u":"R100","ticker":"CTAS","name":"Cintas","sector":"Services","region":"USA","q":89.0,"verdict":"AUFNEHMEN","moat":"Routen-Dichte und hohe Kundenbindung"},{"u":"R100","ticker":"CSU.TO","name":"Constellation Software","sector":"Software","region":"Kanada","q":88.9,"verdict":"AUFNEHMEN","moat":"Vertikale Software und außergewöhnliche Kapitalallokation"},{"u":"R100","ticker":"MCO","name":"Moody's","sector":"Finanzdaten","region":"USA","q":88.7,"verdict":"AUFNEHMEN","moat":"Rating-Oligopol und Analytics"},{"u":"R100","ticker":"ROL","name":"Rollins","sector":"Services","region":"USA","q":88.7,"verdict":"AUFNEHMEN","moat":"Lokale Dichte und wiederkehrende Verträge"},{"u":"R100","ticker":"MPWR","name":"Monolithic Power Systems","sector":"Halbleiter","region":"USA","q":88.5,"verdict":"AUFNEHMEN","moat":"Analog-Designkultur und Share Gains"},{"u":"R100","ticker":"DSY.PA","name":"Dassault Systèmes","sector":"Software","region":"Frankreich","q":88.5,"verdict":"AUFNEHMEN","moat":"Engineering-Standards und hohe Wechselkosten"},{"u":"R100","ticker":"TYL","name":"Tyler Technologies","sector":"Gov Software","region":"USA","q":88.4,"verdict":"AUFNEHMEN","moat":"Kommunalsoftware mit extremen Wechselkosten"},{"u":"R100","ticker":"RMV.L","name":"Rightmove","sector":"Plattform","region":"UK","q":88.3,"verdict":"AUFNEHMEN","moat":"Dominantes Immobilienportal"},{"u":"R100","ticker":"WKL.AS","name":"Wolters Kluwer","sector":"Daten","region":"Niederlande","q":88.2,"verdict":"AUFNEHMEN","moat":"Mission-kritische Fachsoftware"},{"u":"R100","ticker":"KLAC","name":"KLA","sector":"Halbleiter","region":"USA","q":88.1,"verdict":"AUFNEHMEN","moat":"Prozesskontroll-Oligopol"},{"u":"R100","ticker":"MTD","name":"Mettler-Toledo","sector":"Instrumente","region":"USA/Schweiz","q":88.0,"verdict":"AUFNEHMEN","moat":"Präzisionsinstrumente, Service und Pricing"},{"u":"R100","ticker":"OR.PA","name":"L'Oréal","sector":"Konsum","region":"Frankreich","q":88,"verdict":"AUFNEHMEN","moat":"Markenportfolio und globale Distribution"},{"u":"R100","ticker":"ROP","name":"Roper Technologies","sector":"Software/Industrie","region":"USA","q":88,"verdict":"AUFNEHMEN","moat":"Nischen-Software und disziplinierte Akquisitionen"},{"u":"R100","ticker":"FICO","name":"Fair Isaac","sector":"Finanzdaten","region":"USA","q":87.7,"verdict":"AUFNEHMEN","moat":"Quasi-Standard bei Kredit-Scores"},{"u":"R100","ticker":"EW","name":"Edwards Lifesciences","sector":"Medtech","region":"USA","q":87.7,"verdict":"AUFNEHMEN","moat":"TAVR-Führerschaft und klinische Evidenz"},{"u":"R100","ticker":"CRWD","name":"CrowdStrike","sector":"Cybersecurity","region":"USA","q":87.7,"verdict":"AUFNEHMEN","moat":"Cloud-native Security-Datenplattform"},{"u":"R100","ticker":"ADP","name":"Automatic Data Processing","sector":"Payroll","region":"USA","q":87.6,"verdict":"AUFNEHMEN","moat":"Payroll-Scale und hohe Kundenbindung"},{"u":"R100","ticker":"FAST","name":"Fastenal","sector":"Industriehandel","region":"USA","q":87.4,"verdict":"AUFNEHMEN","moat":"Onsite-Netz und effiziente Distribution"},{"u":"R100","ticker":"RAA.DE","name":"Rational","sector":"Industrie","region":"Deutschland","q":87.0,"verdict":"AUFNEHMEN","moat":"Küchenstandard, Marke und Service"},{"u":"R100","ticker":"LIFCO-B.ST","name":"Lifco","sector":"Industrie","region":"Schweden","q":87,"verdict":"RESERVE","moat":"Dezentrale Nischen-M&A"},{"u":"R100","ticker":"MMC","name":"Marsh McLennan","sector":"Versicherungsmakler","region":"USA","q":87.0,"verdict":"RESERVE","moat":"Globale Maklerskala und wiederkehrende Kunden"},{"u":"R100","ticker":"RMD","name":"ResMed","sector":"Medtech","region":"USA","q":87.0,"verdict":"RESERVE","moat":"Schlafapnoe-Installed-Base und Masken"},{"u":"R100","ticker":"CME","name":"CME Group","sector":"Börsen","region":"USA","q":86.8,"verdict":"RESERVE","moat":"Netzwerkeffekt in Derivaten"},{"u":"R100","ticker":"HEI","name":"HEICO","sector":"Aerospace","region":"USA","q":86.8,"verdict":"RESERVE","moat":"Zertifizierte Nischenprodukte und M&A"},{"u":"R100","ticker":"HLMA.L","name":"Halma","sector":"Industrie","region":"UK","q":86.7,"verdict":"RESERVE","moat":"Dezentrales Sicherheits-Nischenportfolio"},{"u":"R100","ticker":"ODFL","name":"Old Dominion Freight Line","sector":"Logistik","region":"USA","q":86.5,"verdict":"RESERVE","moat":"Dichtes LTL-Netz und Servicequalität"},{"u":"R100","ticker":"ZTS","name":"Zoetis","sector":"Medtech","region":"USA","q":86.3,"verdict":"RESERVE","moat":"Tiergesundheitsmarken und Distribution"},{"u":"R100","ticker":"MEDP","name":"Medpace","sector":"CRO","region":"USA","q":86.2,"verdict":"RESERVE","moat":"Founder-geführte Midcap-CRO"},{"u":"R100","ticker":"TOI.V","name":"Topicus.com","sector":"Software","region":"Kanada/Europa","q":86.2,"verdict":"RESERVE","moat":"Vertikale Software in Europa"},{"u":"R100","ticker":"FTNT","name":"Fortinet","sector":"Cybersecurity","region":"USA","q":86.2,"verdict":"RESERVE","moat":"ASIC-Vorteil und Security-Plattform"},{"u":"R100","ticker":"PAYX","name":"Paychex","sector":"Payroll","region":"USA","q":86.2,"verdict":"RESERVE","moat":"SMB-Payroll mit wiederkehrenden Erlösen"},{"u":"R100","ticker":"PGR","name":"Progressive","sector":"Versicherung","region":"USA","q":86,"verdict":"RESERVE","moat":"Telematik, Daten und Underwriting-Kultur"},{"u":"R100","ticker":"PANW","name":"Palo Alto Networks","sector":"Cybersecurity","region":"USA","q":86.0,"verdict":"RESERVE","moat":"Breite Security-Plattform"},{"u":"R100","ticker":"VRSK","name":"Verisk Analytics","sector":"Daten","region":"USA","q":85.8,"verdict":"RESERVE","moat":"Proprietäre Versicherungsdaten"},{"u":"R100","ticker":"DDOG","name":"Datadog","sector":"Software","region":"USA","q":85.7,"verdict":"RESERVE","moat":"Observability-Datenplattform"},{"u":"R100","ticker":"BRK.B","name":"Berkshire Hathaway","sector":"Konglomerat","region":"USA","q":85.7,"verdict":"RESERVE","moat":"Versicherungsfloat und Kapitalallokation"},{"u":"R100","ticker":"ICE","name":"Intercontinental Exchange","sector":"Börsen","region":"USA","q":85.6,"verdict":"RESERVE","moat":"Börsen, Clearing und Hypotheken-Workflows"},{"u":"R100","ticker":"WCN","name":"Waste Connections","sector":"Abfall","region":"USA/Kanada","q":85.6,"verdict":"RESERVE","moat":"Lokale Monopole und Deponien"},{"u":"R100","ticker":"LSEG.L","name":"London Stock Exchange Group","sector":"Finanzdaten","region":"UK","q":85.5,"verdict":"RESERVE","moat":"Daten, Indizes, Clearing und Workflows"},{"u":"R100","ticker":"SYK","name":"Stryker","sector":"Medtech","region":"USA","q":85.4,"verdict":"RESERVE","moat":"Chirurgie-Ökosystem und Vertrieb"},{"u":"R100","ticker":"WST","name":"West Pharmaceutical","sector":"Medtech","region":"USA","q":85.1,"verdict":"RESERVE","moat":"Kritische Komponenten für Injektabilia"},{"u":"R100","ticker":"WDAY","name":"Workday","sector":"Software","region":"USA","q":85.0,"verdict":"RESERVE","moat":"HR-/Finance-Cloud mit Wechselkosten"},{"u":"R100","ticker":"G24.DE","name":"Scout24","sector":"Plattform","region":"Deutschland","q":85,"verdict":"RESERVE","moat":"Führendes Immobilienportal"},{"u":"R100","ticker":"AJG","name":"Arthur J. Gallagher","sector":"Versicherungsmakler","region":"USA","q":85,"verdict":"RESERVE","moat":"Broker-Roll-up und Kundenbindung"},{"u":"R100","ticker":"DHR","name":"Danaher","sector":"Life Science","region":"USA","q":85.0,"verdict":"RESERVE","moat":"Danaher Business System und Installed Base"},{"u":"R100","ticker":"INDT.ST","name":"Indutrade","sector":"Industrie","region":"Schweden","q":84.5,"verdict":"RESERVE","moat":"Technischer Handel und dezentrale M&A"},{"u":"R100","ticker":"AME","name":"AMETEK","sector":"Industrie","region":"USA","q":84.5,"verdict":"RESERVE","moat":"Nischeninstrumente und M&A-System"},{"u":"R100","ticker":"WAT","name":"Waters","sector":"Instrumente","region":"USA","q":84.5,"verdict":"RESERVE","moat":"Chromatographie-Installed-Base"},{"u":"R100","ticker":"EXPN.L","name":"Experian","sector":"Daten","region":"UK","q":84,"verdict":"RESERVE","moat":"Kreditdaten und Netzwerkeffekte"},{"u":"R100","ticker":"GWRE","name":"Guidewire Software","sector":"Software","region":"USA","q":84.0,"verdict":"RESERVE","moat":"Kernsysteme für Versicherer"},{"u":"R100","ticker":"DPLM.L","name":"Diploma","sector":"Industrie","region":"UK","q":84.0,"verdict":"RESERVE","moat":"Kritische Komponenten und dezentrale M&A"},{"u":"R100","ticker":"BSX","name":"Boston Scientific","sector":"Medtech","region":"USA","q":83.9,"verdict":"RESERVE","moat":"Breites interventionelles Portfolio"},{"u":"R100","ticker":"FDS","name":"FactSet","sector":"Finanzdaten","region":"USA","q":83.8,"verdict":"RESERVE","moat":"Daten-Workflow mit hohen Wechselkosten"},{"u":"R100","ticker":"CRM","name":"Salesforce","sector":"Software","region":"USA","q":83.7,"verdict":"RESERVE","moat":"CRM-Standard und Ökosystem"},{"u":"R100","ticker":"TDG","name":"TransDigm","sector":"Aerospace","region":"USA","q":83.7,"verdict":"RESERVE","moat":"Sole-source Teile und Pricing Power"},{"u":"R100","ticker":"LRCX","name":"Lam Research","sector":"Halbleiter","region":"USA","q":83.7,"verdict":"RESERVE","moat":"Wafer-Fab-Oligopol und Service"},{"u":"R100","ticker":"ADDT-B.ST","name":"Addtech","sector":"Industrie","region":"Schweden","q":83.5,"verdict":"RESERVE","moat":"Technik-Nischen und dezentrale M&A"},{"u":"R100","ticker":"MC.PA","name":"LVMH","sector":"Luxus","region":"Frankreich","q":83.5,"verdict":"RESERVE","moat":"Einzigartiges Luxusmarken-Portfolio"},{"u":"R100","ticker":"JDG.L","name":"Judges Scientific","sector":"Industrie","region":"UK","q":83.3,"verdict":"RESERVE","moat":"Wissenschaftliche Nischeninstrumente"},{"u":"R100","ticker":"ADSK","name":"Autodesk","sector":"Software","region":"USA","q":83.2,"verdict":"RESERVE","moat":"Designstandard und Abo-Modell"},{"u":"R100","ticker":"PH","name":"Parker Hannifin","sector":"Industrie","region":"USA","q":83.1,"verdict":"RESERVE","moat":"Motion-Control-Installed-Base"},{"u":"R100","ticker":"GGG","name":"Graco","sector":"Industrie","region":"USA","q":82.5,"verdict":"RESERVE","moat":"Fluid-Handling-Nischen und Distribution"},{"u":"R100","ticker":"AON","name":"Aon","sector":"Versicherungsmakler","region":"Irland/UK","q":82.5,"verdict":"RESERVE","moat":"Maklerskala und Kundeneinbettung"},{"u":"R100","ticker":"ITW","name":"Illinois Tool Works","sector":"Industrie","region":"USA","q":82.4,"verdict":"RESERVE","moat":"Nischen, 80/20-System und Pricing"},{"u":"R100","ticker":"WM","name":"Waste Management","sector":"Abfall","region":"USA","q":82.3,"verdict":"RESERVE","moat":"Deponie- und Routennetz"},{"u":"R100","ticker":"TMO","name":"Thermo Fisher","sector":"Life Science","region":"USA","q":82.3,"verdict":"RESERVE","moat":"Skala und Workflow-Breite"},{"u":"R100","ticker":"RSG","name":"Republic Services","sector":"Abfall","region":"USA","q":82.2,"verdict":"RESERVE","moat":"Lokale Dichte und Deponien"},{"u":"R100","ticker":"NET","name":"Cloudflare","sector":"Cloud","region":"USA","q":82.0,"verdict":"RESERVE","moat":"Globales Edge-Netzwerk"},{"u":"R100","ticker":"TEAM","name":"Atlassian","sector":"Software","region":"Australien/USA","q":81.8,"verdict":"RESERVE","moat":"Developer-Workflow und Ökosystem"},{"u":"R100","ticker":"AMAT","name":"Applied Materials","sector":"Halbleiter","region":"USA","q":81.8,"verdict":"RESERVE","moat":"Breites Wafer-Fab-Portfolio"},{"u":"R100","ticker":"TXN","name":"Texas Instruments","sector":"Halbleiter","region":"USA","q":81.7,"verdict":"RESERVE","moat":"Analog-Skala und eigene Fertigung"},{"u":"R100","ticker":"NDSN","name":"Nordson","sector":"Industrie","region":"USA","q":81.5,"verdict":"RESERVE","moat":"Präzisionsdispensing und Installed Base"},{"u":"R100","ticker":"ORLY","name":"O'Reilly Automotive","sector":"Handel","region":"USA","q":81.5,"verdict":"RESERVE","moat":"Distribution und lokale Verfügbarkeit"},{"u":"R100","ticker":"TECH","name":"Bio-Techne","sector":"Life Science","region":"USA","q":81.4,"verdict":"RESERVE","moat":"Nischenreagenzien und Marken"},{"u":"R100","ticker":"NDAQ","name":"Nasdaq","sector":"Börsen","region":"USA","q":81.0,"verdict":"RESERVE","moat":"Marktinfrastruktur und SaaS"},{"u":"R100","ticker":"ROR.L","name":"Rotork","sector":"Industrie","region":"UK","q":80.8,"verdict":"RESERVE","moat":"Actuation-Nische und Service"},{"u":"R100","ticker":"ADI","name":"Analog Devices","sector":"Halbleiter","region":"USA","q":80.7,"verdict":"RESERVE","moat":"Analog-Portfolio und lange Produktzyklen"},{"u":"R100","ticker":"A","name":"Agilent","sector":"Instrumente","region":"USA","q":80.4,"verdict":"RESERVE","moat":"Labor-Installed-Base und Verbrauchsmaterial"},{"u":"R100","ticker":"DXCM","name":"DexCom","sector":"Medtech","region":"USA","q":80.3,"verdict":"RESERVE","moat":"CGM-Ökosystem"},{"u":"R100","ticker":"MONC.MI","name":"Moncler","sector":"Luxus","region":"Italien","q":80.3,"verdict":"RESERVE","moat":"Starke Outerwear-Marke"},{"u":"R100","ticker":"AFX.DE","name":"Carl Zeiss Meditec","sector":"Medtech","region":"Deutschland","q":80.3,"verdict":"RESERVE","moat":"Optik, Marke und Installed Base"},{"u":"R100","ticker":"BC.MI","name":"Brunello Cucinelli","sector":"Luxus","region":"Italien","q":80,"verdict":"RESERVE","moat":"Ultra-Luxus und kontrollierte Distribution"},{"u":"R100","ticker":"SPX.L","name":"Spirax Group","sector":"Industrie","region":"UK","q":79.8,"verdict":"RESERVE","moat":"Dampf-Engineering und Installed Base"},{"u":"R100","ticker":"ALC","name":"Alcon","sector":"Medtech","region":"Schweiz","q":79.5,"verdict":"RESERVE","moat":"Augenchirurgie und Verbrauchsmaterial"},{"u":"R100","ticker":"CSL.AX","name":"CSL","sector":"Biopharma","region":"Australien","q":79.5,"verdict":"RESERVE","moat":"Plasma-Netzwerk und Biologika"},{"u":"R100","ticker":"IQV","name":"IQVIA","sector":"Health Data","region":"USA","q":76.3,"verdict":"RESERVE","moat":"Daten plus Clinical-Research-Skala"},{"u":"R100","ticker":"AZO","name":"AutoZone","sector":"Handel","region":"USA","q":74.8,"verdict":"RESERVE","moat":"Dichtes Filialnetz und Buybacks"},{"u":"R100","ticker":"IMI.L","name":"IMI","sector":"Industrie","region":"UK","q":74.7,"verdict":"RESERVE","moat":"Engineering-Nischen"},{"u":"S150","ticker":"6861.T","name":"Keyence","region":"Japan","sector":"Industrie","q":94.0,"verdict":"TOP 40","moat":"Sensorik-Direktvertrieb und extreme Kapitalrendite"},{"u":"S150","ticker":"EL.PA","name":"EssilorLuxottica","region":"Frankreich","sector":"Medtech/Konsum","q":93,"verdict":"TOP 40","moat":"Optik-Plattform, Marken und Distribution"},{"u":"S150","ticker":"INTU","name":"Intuit","region":"USA","sector":"Software","q":93.0,"verdict":"TOP 40","moat":"Finanz- und Steuersoftware-Ökosystem"},{"u":"S150","ticker":"PME.AX","name":"Pro Medicus","region":"Australien","sector":"Health Software","q":92,"verdict":"TOP 40","moat":"Hochskalierbare Radiologie-Software"},{"u":"S150","ticker":"6146.T","name":"Disco","region":"Japan","sector":"Halbleiter","q":92,"verdict":"TOP 40","moat":"Dicing- und Grinding-Nische"},{"u":"S150","ticker":"MSI","name":"Motorola Solutions","region":"USA","sector":"Daten","q":92.0,"verdict":"TOP 40","moat":"Mission-kritische Funk- und Leitstellensysteme"},{"u":"S150","ticker":"REA.AX","name":"REA Group","region":"Australien","sector":"Plattform","q":92.0,"verdict":"TOP 40","moat":"Dominantes Immobilienportal"},{"u":"S150","ticker":"BKNG","name":"Booking Holdings","region":"USA","sector":"Plattform","q":91.0,"verdict":"TOP 40","moat":"Reise-Marktplatz und Nachfrage-Liquidität"},{"u":"S150","ticker":"MELI","name":"MercadoLibre","region":"Lateinamerika","sector":"Plattform","q":91.0,"verdict":"TOP 40","moat":"Commerce-, Payments- und Logistiknetz"},{"u":"S150","ticker":"LLY","name":"Eli Lilly","region":"USA","sector":"Pharma","q":91,"verdict":"TOP 40","moat":"GLP-1- und Pipeline-Führerschaft"},{"u":"S150","ticker":"ITX.MC","name":"Inditex","region":"Spanien","sector":"Konsum","q":91,"verdict":"TOP 40","moat":"Lieferkette, Marke und Filialproduktivität"},{"u":"S150","ticker":"VRTX","name":"Vertex Pharmaceuticals","region":"USA","sector":"Biopharma","q":91,"verdict":"TOP 40","moat":"CF-Franchise und Pipeline"},{"u":"S150","ticker":"7741.T","name":"Hoya","region":"Japan","sector":"Medtech","q":91,"verdict":"TOP 40","moat":"Optik- und Medtech-Nischen"},{"u":"S150","ticker":"ATCO-A.ST","name":"Atlas Copco","region":"Schweden","sector":"Industrie","q":91.0,"verdict":"TOP 40","moat":"Kompressoren-Installed-Base und Service"},{"u":"S150","ticker":"BEAN.SW","name":"Belimo","region":"Schweiz","sector":"Industrie","q":91.0,"verdict":"TOP 40","moat":"Gebäudeaktoren-Nische und Innovation"},{"u":"S150","ticker":"TNE.AX","name":"TechnologyOne","region":"Australien","sector":"Software","q":90.0,"verdict":"TOP 40","moat":"ERP für öffentliche Institutionen"},{"u":"S150","ticker":"BSY","name":"Bentley Systems","region":"USA","sector":"Software","q":90.0,"verdict":"TOP 40","moat":"Infrastruktur-Engineering-Standard"},{"u":"S150","ticker":"TT","name":"Trane Technologies","region":"Irland/USA","sector":"Klimatechnik","q":90,"verdict":"TOP 40","moat":"Effizienz, Marke und Service"},{"u":"S150","ticker":"ASSA-B.ST","name":"Assa Abloy","region":"Schweden","sector":"Industrie","q":90,"verdict":"TOP 40","moat":"Zutrittslösungen, Marke und M&A"},{"u":"S150","ticker":"COLO-B.CO","name":"Coloplast","region":"Dänemark","sector":"Medtech","q":90,"verdict":"TOP 40","moat":"Stoma-Verbrauchsmaterial und Kundenbindung"},{"u":"S150","ticker":"REGN","name":"Regeneron","region":"USA","sector":"Biopharma","q":90,"verdict":"TOP 40","moat":"Antikörperplattform und Forschungskultur"},{"u":"S150","ticker":"MCD","name":"McDonald's","region":"USA","sector":"Restaurants","q":90,"verdict":"TOP 40","moat":"Franchise, Immobilien und Marke"},{"u":"S150","ticker":"TRI.TO","name":"Thomson Reuters","region":"Kanada","sector":"Daten","q":90,"verdict":"TOP 40","moat":"Rechts- und Steuer-Workflows"},{"u":"S150","ticker":"6273.T","name":"SMC","region":"Japan","sector":"Industrie","q":90.0,"verdict":"TOP 40","moat":"Pneumatik-Standard und Vertrieb"},{"u":"S150","ticker":"8035.T","name":"Tokyo Electron","region":"Japan","sector":"Halbleiter","q":90.0,"verdict":"TOP 40","moat":"Wafer-Fab-Oligopol"},{"u":"S150","ticker":"9983.T","name":"Fast Retailing","region":"Japan","sector":"Konsum","q":90.0,"verdict":"TOP 40","moat":"Uniqlo-Marke und Supply Chain"},{"u":"S150","ticker":"4519.T","name":"Chugai Pharmaceutical","region":"Japan","sector":"Biopharma","q":90.0,"verdict":"TOP 40","moat":"Antikörperforschung und Roche-Zugang"},{"u":"S150","ticker":"TCS.NS","name":"Tata Consultancy Services","region":"Indien","sector":"IT Services","q":90.0,"verdict":"TOP 40","moat":"Skala, Kundenbindung und Delivery"},{"u":"S150","ticker":"BLK","name":"BlackRock","region":"USA","sector":"Asset Management","q":89.0,"verdict":"RESERVE","moat":"Skala, ETFs und Aladdin"},{"u":"S150","ticker":"7974.T","name":"Nintendo","region":"Japan","sector":"Gaming","q":89.0,"verdict":"RESERVE","moat":"Einzigartige IP und Plattform"},{"u":"S150","ticker":"MORN","name":"Morningstar","region":"USA","sector":"Finanzdaten","q":89,"verdict":"RESERVE","moat":"Daten, Ratings und eingebettete Workflows"},{"u":"S150","ticker":"MANH","name":"Manhattan Associates","region":"USA","sector":"Software","q":89,"verdict":"RESERVE","moat":"Warehouse- und Commerce-Standard"},{"u":"S150","ticker":"STMN.SW","name":"Straumann","region":"Schweiz","sector":"Medtech","q":89,"verdict":"RESERVE","moat":"Dentalimplantate-Ökosystem"},{"u":"S150","ticker":"ABT","name":"Abbott Laboratories","region":"USA","sector":"Medtech","q":89,"verdict":"RESERVE","moat":"Diagnostik- und Device-Portfolio"},{"u":"S150","ticker":"CFR.SW","name":"Richemont","region":"Schweiz","sector":"Luxus","q":89,"verdict":"RESERVE","moat":"Cartier und harte Luxusmarken"},{"u":"S150","ticker":"CP","name":"Canadian Pacific Kansas City","region":"Kanada","sector":"Eisenbahn","q":89,"verdict":"RESERVE","moat":"Einzigartiges Nordamerika-Bahnnetz"},{"u":"S150","ticker":"DOL.TO","name":"Dollarama","region":"Kanada","sector":"Handel","q":89,"verdict":"RESERVE","moat":"Kostenführerschaft und Filialökonomie"},{"u":"S150","ticker":"XRO.AX","name":"Xero","region":"Australien","sector":"Software","q":89,"verdict":"RESERVE","moat":"SMB-Accounting-Ökosystem"},{"u":"S150","ticker":"COH.AX","name":"Cochlear","region":"Australien","sector":"Medtech","q":89,"verdict":"RESERVE","moat":"Hörimplantat-Installed-Base"},{"u":"S150","ticker":"GE","name":"GE Aerospace","region":"USA","sector":"Aerospace","q":89.0,"verdict":"RESERVE","moat":"Triebwerks-Installed-Base und Service"},{"u":"S150","ticker":"GEBN.SW","name":"Geberit","region":"Schweiz","sector":"Bauprodukte","q":89.0,"verdict":"RESERVE","moat":"Marke, Installateurbindung und Distribution"},{"u":"S150","ticker":"WEGE3.SA","name":"WEG","region":"Brasilien","sector":"Industrie","q":89.0,"verdict":"RESERVE","moat":"Motoren, Automation und globale Expansion"},{"u":"S150","ticker":"CBOE","name":"Cboe Global Markets","region":"USA","sector":"Börsen","q":88.0,"verdict":"RESERVE","moat":"Optionsnetzwerke und Marktdaten"},{"u":"S150","ticker":"TW","name":"Tradeweb Markets","region":"USA","sector":"Börsen","q":88.0,"verdict":"RESERVE","moat":"Elektronische Fixed-Income-Netzwerke"},{"u":"S150","ticker":"BR","name":"Broadridge","region":"USA","sector":"Finanzinfra","q":88.0,"verdict":"RESERVE","moat":"Proxy- und Post-Trade-Infrastruktur"},{"u":"S150","ticker":"KEYS","name":"Keysight Technologies","region":"USA","sector":"Instrumente","q":88.0,"verdict":"RESERVE","moat":"Test- und Mess-Installed-Base"},{"u":"S150","ticker":"TDY","name":"Teledyne Technologies","region":"USA","sector":"Instrumente","q":88.0,"verdict":"RESERVE","moat":"Bildgebung und Spezialinstrumente"},{"u":"S150","ticker":"LII","name":"Lennox International","region":"USA","sector":"Klimatechnik","q":88.0,"verdict":"RESERVE","moat":"HVAC-Marke und Distribution"},{"u":"S150","ticker":"LAGR-B.ST","name":"Lagercrantz","region":"Schweden","sector":"Industrie","q":88.0,"verdict":"RESERVE","moat":"Nischen-M&A und Dezentralität"},{"u":"S150","ticker":"VACN.SW","name":"VAT Group","region":"Schweiz","sector":"Halbleiter","q":88.0,"verdict":"RESERVE","moat":"Vakuumventil-Quasi-Standard"},{"u":"S150","ticker":"SIKA.SW","name":"Sika","region":"Schweiz","sector":"Chemie","q":88.0,"verdict":"RESERVE","moat":"Bauchemie-Marke und Spezifikation"},{"u":"S150","ticker":"CNI","name":"Canadian National Railway","region":"Kanada","sector":"Eisenbahn","q":88.0,"verdict":"RESERVE","moat":"Unersetzbares Bahnnetz"},{"u":"S150","ticker":"CAR.AX","name":"CAR Group","region":"Australien","sector":"Plattform","q":88.0,"verdict":"RESERVE","moat":"Auto-Marktplätze und Daten"},{"u":"S150","ticker":"AMS.MC","name":"Amadeus IT Group","region":"Spanien","sector":"Reise-IT","q":88.0,"verdict":"RESERVE","moat":"Airline- und Reise-Workflows"},{"u":"S150","ticker":"AXP","name":"American Express","region":"USA","sector":"Payments","q":88,"verdict":"RESERVE","moat":"Closed-loop Zahlungsnetz und Premiumkunden"},{"u":"S150","ticker":"ROG.SW","name":"Roche","region":"Schweiz","sector":"Biopharma","q":88,"verdict":"RESERVE","moat":"Diagnostik plus Biopharma"},{"u":"S150","ticker":"NOVN.SW","name":"Novartis","region":"Schweiz","sector":"Biopharma","q":88,"verdict":"RESERVE","moat":"Fokussiertes innovative-medicines Portfolio"},{"u":"S150","ticker":"AZN","name":"AstraZeneca","region":"UK","sector":"Biopharma","q":88,"verdict":"RESERVE","moat":"Onkologie- und Rare-Disease-Pipeline"},{"u":"S150","ticker":"DPZ","name":"Domino's Pizza","region":"USA","sector":"Restaurants","q":88,"verdict":"RESERVE","moat":"Franchise- und Liefernetz"},{"u":"S150","ticker":"KO","name":"Coca-Cola","region":"USA","sector":"Konsum","q":88,"verdict":"RESERVE","moat":"Marke und Abfüllnetz"},{"u":"S150","ticker":"6367.T","name":"Daikin Industries","region":"Japan","sector":"Klimatechnik","q":88,"verdict":"RESERVE","moat":"Globale HVAC-Skala"},{"u":"S150","ticker":"7309.T","name":"Shimano","region":"Japan","sector":"Konsum/Industrie","q":88,"verdict":"RESERVE","moat":"Fahrradkomponenten-Standard"},{"u":"S150","ticker":"6857.T","name":"Advantest","region":"Japan","sector":"Halbleiter","q":88,"verdict":"RESERVE","moat":"Halbleitertest-Oligopol"},{"u":"S150","ticker":"6098.T","name":"Recruit Holdings","region":"Japan","sector":"Plattform","q":88,"verdict":"RESERVE","moat":"Indeed-Netzwerk und HR-Daten"},{"u":"S150","ticker":"HDFCBANK.NS","name":"HDFC Bank","region":"Indien","sector":"Bank","q":88,"verdict":"RESERVE","moat":"Einlagenfranchise und Underwriting"},{"u":"S150","ticker":"TITAN.NS","name":"Titan Company","region":"Indien","sector":"Konsum","q":88,"verdict":"RESERVE","moat":"Schmuckmarke und Vertrauensvorsprung"},{"u":"S150","ticker":"PIDILITIND.NS","name":"Pidilite Industries","region":"Indien","sector":"Chemie/Konsum","q":88,"verdict":"RESERVE","moat":"Klebstoffmarke und Distribution"},{"u":"S150","ticker":"NTES","name":"NetEase","region":"China","sector":"Gaming","q":88,"verdict":"RESERVE","moat":"Gaming-IP und Entwicklungskultur"},{"u":"S150","ticker":"JKHY","name":"Jack Henry","region":"USA","sector":"Banksoftware","q":88.0,"verdict":"RESERVE","moat":"Kernbank-Software mit Wechselkosten"},{"u":"S150","ticker":"VIT-B.ST","name":"Vitec Software","region":"Schweden","sector":"Software","q":88.0,"verdict":"RESERVE","moat":"Vertikale Software und M&A"},{"u":"S150","ticker":"PTC","name":"PTC","region":"USA","sector":"Software","q":87,"verdict":"RESERVE","moat":"CAD/PLM-Wechselkosten"},{"u":"S150","ticker":"EME","name":"EMCOR Group","region":"USA","sector":"Engineering","q":87,"verdict":"RESERVE","moat":"Technische Gebäudedienstleistungen"},{"u":"S150","ticker":"PWR","name":"Quanta Services","region":"USA","sector":"Infrastruktur","q":87,"verdict":"RESERVE","moat":"Stromnetz-Spezialisten und Backlog"},{"u":"S150","ticker":"ABBN.SW","name":"ABB","region":"Schweiz","sector":"Automation","q":87,"verdict":"RESERVE","moat":"Elektrifizierung und Automation"},{"u":"S150","ticker":"EPI-A.ST","name":"Epiroc","region":"Schweden","sector":"Industrie","q":87,"verdict":"RESERVE","moat":"Mining-Installed-Base und Service"},{"u":"S150","ticker":"MRK","name":"Merck & Co.","region":"USA","sector":"Biopharma","q":87,"verdict":"RESERVE","moat":"Onkologie-Franchise und Pipeline"},{"u":"S150","ticker":"3064.T","name":"MonotaRO","region":"Japan","sector":"Industriehandel","q":87,"verdict":"RESERVE","moat":"B2B-E-Commerce und Daten"},{"u":"S150","ticker":"6758.T","name":"Sony Group","region":"Japan","sector":"Konsum/Tech","q":87,"verdict":"RESERVE","moat":"Gaming-, Musik- und Bildsensor-IP"},{"u":"S150","ticker":"4543.T","name":"Terumo","region":"Japan","sector":"Medtech","q":87,"verdict":"RESERVE","moat":"Interventionelle Devices"},{"u":"S150","ticker":"WSP.TO","name":"WSP Global","region":"Kanada","sector":"Engineering","q":87,"verdict":"RESERVE","moat":"Planungsnetzwerk und M&A"},{"u":"S150","ticker":"BAM","name":"Brookfield Asset Management","region":"Kanada","sector":"Asset Management","q":87,"verdict":"RESERVE","moat":"Fee-bearing capital und Fundraising"},{"u":"S150","ticker":"FI","name":"Fiserv","region":"USA","sector":"Payments","q":87.0,"verdict":"RESERVE","moat":"Merchant- und Bankinfrastruktur"},{"u":"S150","ticker":"YUM","name":"Yum! Brands","region":"USA","sector":"Restaurants","q":87.0,"verdict":"RESERVE","moat":"Franchise-Markenportfolio"},{"u":"S150","ticker":"CMG","name":"Chipotle","region":"USA","sector":"Restaurants","q":87.0,"verdict":"RESERVE","moat":"Marke und Filialökonomie"},{"u":"S150","ticker":"HD","name":"Home Depot","region":"USA","sector":"Handel","q":87.0,"verdict":"RESERVE","moat":"Pro-Kunden, Distribution und Marke"},{"u":"S150","ticker":"PNDORA.CO","name":"Pandora","region":"Dänemark","sector":"Luxus","q":87.0,"verdict":"RESERVE","moat":"Schmuckmarke und vertikale Distribution"},{"u":"S150","ticker":"ATD.TO","name":"Couche-Tard","region":"Kanada","sector":"Handel","q":87.0,"verdict":"RESERVE","moat":"Convenience-M&A und Skaleneffekte"},{"u":"S150","ticker":"AENA.MC","name":"Aena","region":"Spanien","sector":"Flughäfen","q":87.0,"verdict":"RESERVE","moat":"Reguliertes Flughafenmonopol"},{"u":"S150","ticker":"MQG.AX","name":"Macquarie Group","region":"Australien","sector":"Finanzen","q":86.0,"verdict":"RESERVE","moat":"Infrastruktur- und Asset-Management-Plattform"},{"u":"S150","ticker":"SOON.SW","name":"Sonova","region":"Schweiz","sector":"Medtech","q":86,"verdict":"RESERVE","moat":"Hörgeräte-Technologie und Distribution"},{"u":"S150","ticker":"LONN.SW","name":"Lonza","region":"Schweiz","sector":"Life Science","q":86,"verdict":"RESERVE","moat":"Biologika-Auftragsfertigung"},{"u":"S150","ticker":"LOW","name":"Lowe's","region":"USA","sector":"Handel","q":86,"verdict":"RESERVE","moat":"Skala im Heimwerkerhandel"},{"u":"S150","ticker":"TSCO","name":"Tractor Supply","region":"USA","sector":"Handel","q":86,"verdict":"RESERVE","moat":"Ländliche Nische und Kundenbindung"},{"u":"S150","ticker":"PEP","name":"PepsiCo","region":"USA","sector":"Konsum","q":86,"verdict":"RESERVE","moat":"Snacks- und Getränkedistribution"},{"u":"S150","ticker":"6954.T","name":"Fanuc","region":"Japan","sector":"Automation","q":86,"verdict":"RESERVE","moat":"Roboter-Installed-Base"},{"u":"S150","ticker":"4661.T","name":"Oriental Land","region":"Japan","sector":"Freizeit","q":86,"verdict":"RESERVE","moat":"Tokyo-Disney-Standortmonopol"},{"u":"S150","ticker":"6869.T","name":"Sysmex","region":"Japan","sector":"Medtech","q":86,"verdict":"RESERVE","moat":"Hämatologie-Installed-Base"},{"u":"S150","ticker":"INFY.NS","name":"Infosys","region":"Indien","sector":"IT Services","q":86,"verdict":"RESERVE","moat":"Globale Delivery-Skala"},{"u":"S150","ticker":"ASIANPAINT.NS","name":"Asian Paints","region":"Indien","sector":"Konsum","q":86,"verdict":"RESERVE","moat":"Distribution und Marke"},{"u":"S150","ticker":"TCOM","name":"Trip.com Group","region":"China","sector":"Plattform","q":86,"verdict":"RESERVE","moat":"Reiseplattform und Skala"},{"u":"S150","ticker":"WTC.AX","name":"WiseTech Global","region":"Australien","sector":"Software","q":86,"verdict":"RESERVE","moat":"Logistiksoftware und Wechselkosten"},{"u":"S150","ticker":"WSO","name":"Watsco","region":"USA","sector":"Distribution","q":86.0,"verdict":"RESERVE","moat":"HVAC-Distributionsnetz"},{"u":"S150","ticker":"FIX","name":"Comfort Systems USA","region":"USA","sector":"Engineering","q":86.0,"verdict":"RESERVE","moat":"Dichte in mechanischen Gewerken"},{"u":"S150","ticker":"BEIJ-B.ST","name":"Beijer Ref","region":"Schweden","sector":"Distribution","q":86.0,"verdict":"RESERVE","moat":"Kälte-Distributionsplattform"},{"u":"S150","ticker":"ALFA.ST","name":"Alfa Laval","region":"Schweden","sector":"Industrie","q":86.0,"verdict":"RESERVE","moat":"Wärmeübertragung und Service"},{"u":"S150","ticker":"HEXA-B.ST","name":"Hexagon","region":"Schweden","sector":"Software/Industrie","q":85.0,"verdict":"RESERVE","moat":"Mess- und Geodaten-Workflows"},{"u":"S150","ticker":"SCHN.SW","name":"Schindler","region":"Schweiz","sector":"Aufzüge","q":85,"verdict":"RESERVE","moat":"Installed-Base und Service"},{"u":"S150","ticker":"KNEBV.HE","name":"Kone","region":"Finnland","sector":"Aufzüge","q":85,"verdict":"RESERVE","moat":"Installed-Base und Service"},{"u":"S150","ticker":"HCA","name":"HCA Healthcare","region":"USA","sector":"Kliniken","q":85,"verdict":"RESERVE","moat":"Lokale Krankenhausnetzwerke"},{"u":"S150","ticker":"AMGN","name":"Amgen","region":"USA","sector":"Biopharma","q":85,"verdict":"RESERVE","moat":"Biologika-Portfolio"},{"u":"S150","ticker":"NESN.SW","name":"Nestlé","region":"Schweiz","sector":"Konsum","q":85,"verdict":"RESERVE","moat":"Marken und globale Distribution"},{"u":"S150","ticker":"KOTAKBANK.NS","name":"Kotak Mahindra Bank","region":"Indien","sector":"Bank","q":84.0,"verdict":"RESERVE","moat":"Konservative Kreditkultur"},{"u":"S150","ticker":"MKTX","name":"MarketAxess","region":"USA","sector":"Börsen","q":84,"verdict":"RESERVE","moat":"Elektronischer Bond-Handel"},{"u":"S150","ticker":"CPAY","name":"Corpay","region":"USA","sector":"Payments","q":84,"verdict":"RESERVE","moat":"Spezialisierte B2B-Zahlungsrails"},{"u":"S150","ticker":"TRMB","name":"Trimble","region":"USA","sector":"Industriesoftware","q":84,"verdict":"RESERVE","moat":"Positionierung und Bau-Workflows"},{"u":"S150","ticker":"HON","name":"Honeywell","region":"USA","sector":"Industrie","q":84,"verdict":"RESERVE","moat":"Aerospace- und Automation-Installed-Base"},{"u":"S150","ticker":"ROK","name":"Rockwell Automation","region":"USA","sector":"Automation","q":84,"verdict":"RESERVE","moat":"Automation-Installed-Base"},{"u":"S150","ticker":"TREL-B.ST","name":"Trelleborg","region":"Schweden","sector":"Industrie","q":84,"verdict":"RESERVE","moat":"Polymer-Nischen"},{"u":"S150","ticker":"MCK","name":"McKesson","region":"USA","sector":"Distribution","q":84,"verdict":"RESERVE","moat":"Pharmadistributions-Skala"},{"u":"S150","ticker":"GILD","name":"Gilead Sciences","region":"USA","sector":"Biopharma","q":84,"verdict":"RESERVE","moat":"HIV-Franchise und Onkologie"},{"u":"S150","ticker":"ABNB","name":"Airbnb","region":"USA","sector":"Plattform","q":84,"verdict":"RESERVE","moat":"Zweiseitiges Unterkunftsnetzwerk"},{"u":"S150","ticker":"ULVR.L","name":"Unilever","region":"UK","sector":"Konsum","q":84,"verdict":"RESERVE","moat":"Markenportfolio und Distribution"},{"u":"S150","ticker":"BN","name":"Brookfield Corporation","region":"Kanada","sector":"Alternative Assets","q":84,"verdict":"RESERVE","moat":"Kapitalplattform und Sachwerte"},{"u":"S150","ticker":"GMG.AX","name":"Goodman Group","region":"Australien","sector":"Logistikimmobilien","q":84,"verdict":"RESERVE","moat":"Logistikstandorte und Entwicklung"},{"u":"S150","ticker":"RADL3.SA","name":"Raia Drogasil","region":"Brasilien","sector":"Apotheken","q":84,"verdict":"RESERVE","moat":"Apotheken-Skala und Daten"},{"u":"S150","ticker":"EFX","name":"Equifax","region":"USA","sector":"Daten","q":83,"verdict":"RESERVE","moat":"Kreditdaten-Netzwerk"},{"u":"S150","ticker":"LOGN.SW","name":"Logitech","region":"Schweiz","sector":"Hardware","q":83,"verdict":"RESERVE","moat":"Marke und Design"},{"u":"S150","ticker":"DEMANT.CO","name":"Demant","region":"Dänemark","sector":"Medtech","q":83,"verdict":"RESERVE","moat":"Hörgeräte und Distribution"},{"u":"S150","ticker":"BDX","name":"Becton Dickinson","region":"USA","sector":"Medtech","q":83,"verdict":"RESERVE","moat":"Verbrauchsmaterial-Installed-Base"},{"u":"S150","ticker":"COR","name":"Cencora","region":"USA","sector":"Distribution","q":83,"verdict":"RESERVE","moat":"Pharmadistributions-Skala"},{"u":"S150","ticker":"BAJFINANCE.NS","name":"Bajaj Finance","region":"Indien","sector":"Finanzen","q":83,"verdict":"RESERVE","moat":"Datengetriebene Konsumentenkredite"},{"u":"S150","ticker":"PCTY","name":"Paylocity","region":"USA","sector":"Software","q":83.0,"verdict":"RESERVE","moat":"Cloud-HR für Mittelstand"},{"u":"S150","ticker":"PAYC","name":"Paycom","region":"USA","sector":"Software","q":82,"verdict":"RESERVE","moat":"Single-database HR-Software"},{"u":"S150","ticker":"ZBRA","name":"Zebra Technologies","region":"USA","sector":"Industrie-IT","q":82,"verdict":"RESERVE","moat":"Barcode-Installed-Base"},{"u":"S150","ticker":"SAN.PA","name":"Sanofi","region":"Frankreich","sector":"Biopharma","q":82,"verdict":"RESERVE","moat":"Immunologie und Impfstoffe"},{"u":"S150","ticker":"3690.HK","name":"Meituan","region":"China","sector":"Plattform","q":82,"verdict":"RESERVE","moat":"Lokale Commerce- und Liefernetzwerke"},{"u":"S150","ticker":"PDD","name":"PDD Holdings","region":"China","sector":"Plattform","q":82,"verdict":"RESERVE","moat":"Commerce-Effizienz und Temu"},{"u":"S150","ticker":"1810.HK","name":"Xiaomi","region":"China","sector":"Hardware/IoT","q":82,"verdict":"RESERVE","moat":"IoT-Ökosystem und Marke"},{"u":"S150","ticker":"UBER","name":"Uber Technologies","region":"USA","sector":"Plattform","q":82.0,"verdict":"RESERVE","moat":"Mobilitätsnetzwerk"},{"u":"S150","ticker":"HEIA.AS","name":"Heineken","region":"Niederlande","sector":"Konsum","q":82.0,"verdict":"RESERVE","moat":"Biermarken und Distribution"},{"u":"S150","ticker":"DASH","name":"DoorDash","region":"USA","sector":"Plattform","q":81,"verdict":"RESERVE","moat":"Lokale Liefernetzwerke"},{"u":"S150","ticker":"DGE.L","name":"Diageo","region":"UK","sector":"Konsum","q":81,"verdict":"RESERVE","moat":"Spirituosenmarken und Distribution"},{"u":"S150","ticker":"NU","name":"Nu Holdings","region":"Lateinamerika","sector":"Fintech","q":81,"verdict":"RESERVE","moat":"Digitale Bankplattform"},{"u":"S150","ticker":"TRU","name":"TransUnion","region":"USA","sector":"Daten","q":80,"verdict":"RESERVE","moat":"Kreditdaten und Identity"},{"u":"S150","ticker":"SRT3.DE","name":"Sartorius","region":"Deutschland","sector":"Life Science","q":80,"verdict":"RESERVE","moat":"Bioprocess-Installed-Base"},{"u":"S150","ticker":"BF.B","name":"Brown-Forman","region":"USA","sector":"Konsum","q":80,"verdict":"RESERVE","moat":"Whiskey-Marken"},{"u":"S150","ticker":"NKE","name":"Nike","region":"USA","sector":"Konsum","q":80,"verdict":"RESERVE","moat":"Globale Sportmarke"},{"u":"S150","ticker":"RENT3.SA","name":"Localiza","region":"Brasilien","sector":"Mobilität","q":80,"verdict":"RESERVE","moat":"Flotten-Skala und Marke"},{"u":"S150","ticker":"WEX","name":"WEX","region":"USA","sector":"Payments","q":78,"verdict":"RESERVE","moat":"Fleet- und B2B-Payments"},{"u":"S150","ticker":"ADS.DE","name":"Adidas","region":"Deutschland","sector":"Konsum","q":78,"verdict":"RESERVE","moat":"Globale Sportmarke"}]};

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
.ck .scroll { overflow:auto; }
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
@keyframes drawer-in { from { transform:translateX(20px); opacity:.6; } to { transform:translateX(0); opacity:1; } }
@media (prefers-reduced-motion: reduce) { .ck * { transition:none !important; animation:none !important; } }
@media (max-width: 820px) {
  .ck { font-size:13.5px; min-height:100dvh !important; }
  .ck .app-header { position:relative; }
  .ck .topbar { align-items:flex-start !important; gap:8px 10px !important; padding:12px 12px 10px !important; }
  .ck .topbar h1 { width:100%; font-size:19px !important; }
  .ck .topbar-meta { flex:1 1 calc(100% - 130px); line-height:1.35; }
  .ck .syncbtn { min-height:38px; padding:7px 10px !important; }
  .ck .storagebar { width:100%; margin-left:0 !important; justify-content:space-between; flex-wrap:wrap; gap:7px !important; }
  .ck .storagebar button { min-height:38px; }
  .ck .scenario { display:grid !important; grid-template-columns:auto minmax(0,1fr) auto; gap:8px 10px !important; margin:0 12px 12px; padding:10px 12px 12px !important; }
  .ck .scenario-label { width:auto !important; align-self:center; }
  .ck .scenario input[type=range] { max-width:none !important; min-height:34px; }
  .ck .scenario-value { width:auto !important; align-self:center; }
  .ck .scenario-note { grid-column:1 / -1; }
  .ck .app-shell { flex-direction:column; align-items:stretch !important; }
  .ck .cols2 { grid-template-columns:1fr !important; gap:14px !important; }
  .ck .rail { position:fixed !important; top:auto !important; left:0; right:0; bottom:0; z-index:30; width:100% !important; height:auto !important; display:flex !important; overflow-x:auto; padding:6px 8px calc(6px + env(safe-area-inset-bottom)) !important; border-right:0 !important; border-top:1px solid ${T.line}; border-bottom:0; background:rgba(255,255,255,.94); backdrop-filter:blur(18px); box-shadow:0 -8px 30px rgba(23,33,30,.08); scrollbar-width:none; }
  .ck .rail::-webkit-scrollbar { display:none; }
  .ck .rail .navbtn { width:68px; min-height:54px; flex:0 0 68px; display:flex; flex-direction:column; justify-content:center; gap:3px; padding:5px 4px; border:1px solid transparent; border-radius:9px; white-space:nowrap; font-size:9.5px; text-align:center; }
  .ck .rail .navbtn svg { width:18px; height:18px; }
  .ck .rail .navbtn[aria-current=true] { border-color:rgba(39,64,127,.12); background:#EDF1F8; box-shadow:none; }
  .ck .app-main { padding:14px 12px 108px !important; }
  .ck section { margin-bottom:20px !important; }
  .ck .section-head { align-items:flex-start !important; flex-direction:column; gap:8px !important; }
  .ck .section-head > * { max-width:100%; }
  .ck .kpi { flex:1 1 50% !important; min-width:50% !important; padding:11px 12px !important; border-bottom:1px solid ${T.line}; }
  .ck .kpi .num { font-size:18px !important; }
  .ck .ladder { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .ck .ladder svg { min-width:720px; }
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
}
@media (max-width: 480px) {
  .ck .kpi { flex-basis:100% !important; min-width:100% !important; border-right:0 !important; }
  .ck .topbar-meta { flex-basis:100%; }
  .ck .syncbtn { width:100%; }
  .ck .scenario { grid-template-columns:1fr auto; }
  .ck .scenario-label { grid-column:1 / -1; }
  .ck .scenario input[type=range] { grid-column:1; }
  .ck .scenario-value { grid-column:2; }
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
        <div className="panel">
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

/* ── App ──────────────────────────────────────────────────────────────── */
const TABS = [
  { key: "cockpit", label: "Cockpit", icon: LayoutDashboard },
  { key: "depot", label: "Depot", icon: Briefcase },
  { key: "zonen", label: "Kaufzonen", icon: Target },
  { key: "wachstum", label: "Wachstum", icon: TrendingUp },
  { key: "optionen", label: "Optionen", icon: BadgeDollarSign },
  { key: "plan", label: "Kaufplan", icon: ClipboardList },
  { key: "growing", label: "Growing 50", icon: Sparkles },
  { key: "kurse", label: "Kurse", icon: RefreshCw },
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
  const data = useMemo(() => mergeManagedData(managedStocks), [managedStocks]);
  const m = useModel(state, data);
  const open = (t) => setSel(t);

  const dirty =
    Object.keys(state.growth).length + Object.keys(state.prices).length + Object.keys(state.mos).length +
    (state.shock !== 0 ? 1 : 0) +
    Object.keys(DEFAULTS).filter((k) => state.params[k] !== DEFAULTS[k]).length;

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
          <button className="syncbtn" onClick={() => setTab("kurse")} style={{ border: `1px solid ${T.line}`, background: "none", padding: "3px 9px", borderRadius: 3, fontSize: 12 }}><RefreshCw aria-hidden="true" />Kurse abgleichen</button>
          <span className="storagebar" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            {saved && <span className="lbl" style={{ color: T.buy }}>{saved}</span>}
            {!saved && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span className={`status-dot ${storageStatus === "connected" ? "connected" : storageStatus === "offline" ? "offline" : ""}`} />
                <span className="lbl" style={{ color: storageStatus === "offline" ? T.reduce : T.muted }}>
                {storageStatus === "connecting" ? "PostgreSQL wird verbunden" : storageStatus === "saving" ? "speichert …" : storageStatus === "offline" ? "lokaler Modus · Datenbank nicht verbunden" : "PostgreSQL verbunden"}
                </span>
              </span>
            )}
            {dirty > 0 && (
              <button onClick={reset} style={{ border: `1px solid ${T.line}`, background: "none", padding: "4px 9px", borderRadius: 3, fontSize: 12 }}>
                {dirty} Änderung(en) verwerfen
              </button>
            )}
          </span>
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
    </div>
  );
}
