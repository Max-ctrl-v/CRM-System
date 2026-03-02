const axios = require('axios');
const cheerio = require('cheerio');
const { PERPLEXITY_API_KEY, FIRECRAWL_API_KEY } = require('../config/env');

const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
};

const NOT_FOUND_PATTERNS = [
  /kein(e|en|er)?\s+\S*\s*jahresabschluss/i,
  /keine\s+\S*\s*(daten|ergebnis|veröffentlichung|eintrag|angaben)/i,
  /nicht\s+(verfügbar|veröffentlicht|gefunden|auffindbar|vorhanden)/i,
  /keine\s+\S*\s*(informationen|ergebnisse|treffer|finanz)/i,
  /konnte\s+(nicht|kein)/i,
  /lieg(t|en)\s+nicht\s+vor/i,
  /nicht\s+im\s+bundesanzeiger/i,
  /keinen\s+(direkten\s+)?zugriff/i,
  /habe\s+keinen\s+zugriff/i,
  /sind\s+keine\s+\S*\s*(daten|jahresabschluss|informationen|angaben)/i,
  /nicht.*zu\s+finden/i,
  /enthalten\s+keine/i,
];

function isNotFoundResponse(content) {
  if (!content || content.trim().length < 80) return true;
  return NOT_FOUND_PATTERNS.some(p => p.test(content));
}

// ---------------------------------------------------------------------------
// Session-based Bundesanzeiger crawler
// ---------------------------------------------------------------------------
class BundesanzeigerSession {
  constructor() {
    this.cookies = new Map();
  }

  _updateCookies(resp) {
    const raw = resp.headers['set-cookie'];
    if (!raw) return;
    for (const c of (Array.isArray(raw) ? raw : [raw])) {
      const [pair] = c.split(';');
      const eq = pair.indexOf('=');
      if (eq > 0) this.cookies.set(pair.substring(0, eq).trim(), pair.substring(eq + 1).trim());
    }
  }

  _cookieStr() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async _get(url, extraHeaders = {}) {
    const full = url.startsWith('http') ? url : `https://www.bundesanzeiger.de${url}`;
    const resp = await axios.get(full, {
      headers: { ...BROWSER_HEADERS, Cookie: this._cookieStr(), ...extraHeaders },
      maxRedirects: 0,
      validateStatus: () => true,
      timeout: 15000,
      responseType: 'text',
    });
    this._updateCookies(resp);
    return resp;
  }

  async _follow(url, extraHeaders = {}, maxHops = 10) {
    let resp = await this._get(url, extraHeaders);
    let finalUrl = url.startsWith('http') ? url : `https://www.bundesanzeiger.de${url}`;
    let hops = 0;
    while ([301, 302, 303, 307, 308].includes(resp.status) && hops < maxHops) {
      const loc = resp.headers.location;
      if (!loc) break;
      finalUrl = loc.startsWith('http') ? loc : `https://www.bundesanzeiger.de${loc}`;
      resp = await this._get(finalUrl, { ...extraHeaders, Referer: finalUrl });
      hops++;
    }
    resp._finalUrl = finalUrl;
    return resp;
  }

  async search(companyName) {
    const startResp = await this._follow('/pub/de/start');
    if (startResp.status !== 200) return { documents: [], totalHits: 0 };

    const $ = cheerio.load(startResp.data);
    const form = $('form').filter((_, el) => $(el).find('input[name="fulltext"]').length > 0).first();
    const formAction = form.attr('action');
    if (!formAction) return { documents: [], totalHits: 0 };

    const params = new URLSearchParams();
    form.find('input, select').each((_, el) => {
      const name = $(el).attr('name');
      if (!name) return;
      if (name === 'fulltext') params.set(name, companyName);
      else if (name === 'search_button') params.set(name, 'Suchen');
      else params.set(name, $(el).attr('value') || '');
    });

    const searchUrl = `${formAction}?${params.toString()}`;
    const searchResp = await this._follow(searchUrl, { Referer: startResp._finalUrl });

    if (searchResp.status !== 200 || /pub\/de\/error/i.test(searchResp._finalUrl)) {
      return { documents: [], totalHits: 0 };
    }

    return this._parseResults(searchResp.data, companyName);
  }

  _parseResults(html, companyName) {
    const $ = cheerio.load(html);
    const documents = [];

    const resultText = $('.result_info, [class*="result_info"]').text().trim();
    const hitsMatch = resultText.match(/(\d+)\s*Treffer/);
    const totalHits = hitsMatch ? parseInt(hitsMatch[1], 10) : 0;

    $('div.row, div.row.back').each((_, el) => {
      const row = $(el);
      const text = row.text().trim().replace(/\s+/g, ' ');
      if (!text || text.length < 20) return;
      if (/^Name\s+Bereich/i.test(text) || /Ergebnisse pro Seite/i.test(text)) return;

      const link = row.find('a[href*="search~table~panel-rows"]').first();
      const info = link.text().trim().replace(/\s+/g, ' ');
      if (!info || !/jahresabschluss/i.test(info)) return;

      const nameCol = row.find('.col-md-3 .first, .col-md-3').first().text().trim().replace(/\s+/g, ' ');
      const dateMatch = text.match(/(\d{2}\.\d{2}\.\d{4})\s*$/);
      const gjMatch = info.match(/vom\s+(\d{2}\.\d{2}\.\d{4})\s+bis\s+zum\s+(\d{2}\.\d{2}\.\d{4})/);

      documents.push({
        companyName: nameCol || companyName,
        info,
        pubDate: dateMatch ? dateMatch[1] : '',
        geschaeftsjahr: gjMatch ? { from: gjMatch[1], to: gjMatch[2] } : null,
      });
    });

    return { documents, totalHits: totalHits || documents.length };
  }
}

// ---------------------------------------------------------------------------
// Firecrawl: Scrape northdata.de for exact financial data
// ---------------------------------------------------------------------------

// Scrape northdata.de company page via Firecrawl and parse financial figures
async function firecrawlScrapeNorthdata(companyName) {
  if (!FIRECRAWL_API_KEY) return null;

  const slug = companyName.replace(/\s+/g, '+');
  const url = `https://www.northdata.de/${slug}`;
  console.log(`[Firecrawl] Scraping northdata: ${url}`);

  try {
    const resp = await axios.post(
      'https://api.firecrawl.dev/v2/scrape',
      { url, formats: ['markdown'] },
      {
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    if (!resp.data?.success || !resp.data.data?.markdown) {
      console.log(`[Firecrawl] Northdata scrape failed for "${companyName}"`);
      return null;
    }

    const md = resp.data.data.markdown;
    if (md.length < 500) {
      console.log(`[Firecrawl] Northdata page too short (${md.length} chars) for "${companyName}"`);
      return null;
    }

    return parseNorthdataMarkdown(md, companyName);
  } catch (err) {
    console.error(`[Firecrawl] Northdata scrape error for "${companyName}":`, err.message);
    return null;
  }
}

// Parse the actual northdata.de markdown format
// Format: "335,3 Mio. € AktivaStand: 31.12.2024"
function parseNorthdataMarkdown(md, companyName) {
  const result = { source: 'northdata.de' };

  // Aktiva / Bilanzsumme — "335,3 Mio. € AktivaStand: 31.12.2024"
  const aktivaMatch = md.match(/([\d.,]+)\s*Mio\.\s*€\s*Aktiva\s*Stand:\s*([\d.]+)/i);
  if (aktivaMatch) {
    result.bilanzsumme = aktivaMatch[1] + ' Mio. €';
    result.stichtag = aktivaMatch[2];
  }

  // Umsatzerlöse — "529,1 Mio. € UmsatzerlöseStand: 31.12.2024"
  const umsatzMatch = md.match(/([\d.,]+)\s*Mio\.\s*€\s*Umsatzerlöse\s*Stand:\s*([\d.]+)/i);
  if (umsatzMatch) result.umsatzerloese = umsatzMatch[1] + ' Mio. €';

  // Passiva — "335,3 Mio. € PassivaStand: 31.12.2024"
  const passivaMatch = md.match(/([\d.,]+)\s*Mio\.\s*€\s*Passiva\s*Stand:\s*([\d.]+)/i);
  if (passivaMatch) result.passiva = passivaMatch[1] + ' Mio. €';

  // Also try Tsd. € format (smaller companies)
  if (!result.bilanzsumme) {
    const m = md.match(/([\d.,]+)\s*Tsd\.\s*€\s*Aktiva\s*Stand:\s*([\d.]+)/i);
    if (m) { result.bilanzsumme = m[1] + ' Tsd. €'; result.stichtag = m[2]; }
  }
  if (!result.umsatzerloese) {
    const m = md.match(/([\d.,]+)\s*Tsd\.\s*€\s*Umsatzerlöse\s*Stand:\s*([\d.]+)/i);
    if (m) result.umsatzerloese = m[1] + ' Tsd. €';
  }

  // Also try plain € format
  if (!result.bilanzsumme) {
    const m = md.match(/([\d.,]+)\s*€\s*Aktiva\s*Stand:\s*([\d.]+)/i);
    if (m) { result.bilanzsumme = m[1] + ' €'; result.stichtag = m[2]; }
  }
  if (!result.umsatzerloese) {
    const m = md.match(/([\d.,]+)\s*€\s*Umsatzerlöse\s*Stand:\s*([\d.]+)/i);
    if (m) result.umsatzerloese = m[1] + ' €';
  }

  // Gegenstand (company purpose — critical for F&E assessment)
  const gegenstandMatch = md.match(/###\s*Gegenstand\s*\n+([^#]+)/i);
  if (gegenstandMatch) {
    result.gegenstand = gegenstandMatch[1].trim().replace(/\s+/g, ' ');
  }

  // Förderungen (research grants) — "Förderung (80.802 €): description"
  const foerderungen = [];
  const foerderRegex = /Förderung\s*\(([\d.,]+)\s*€\):\s*([^\]]+?)(?:\]|\n)/gi;
  let fm;
  while ((fm = foerderRegex.exec(md)) !== null) {
    foerderungen.push({ betrag: fm[1] + ' €', projekt: fm[2].trim() });
  }
  if (foerderungen.length > 0) result.foerderungen = foerderungen;

  // Geschäftsjahr from Stichtag
  if (result.stichtag) {
    const year = result.stichtag.split('.').pop();
    result.geschaeftsjahr = year;
  }

  // Jahresabschluss publications from northdata (with soft hyphens removed)
  const jaMatches = [];
  const jaRegex = /Jah­?res­?ab­?schluss\s+zum\s+(\d{2}\.\d{2}\.\d{4})/gi;
  let jm;
  while ((jm = jaRegex.exec(md)) !== null) {
    const date = jm[1];
    if (!jaMatches.includes(date)) jaMatches.push(date);
  }
  if (jaMatches.length > 0) result.jahresabschluesse = jaMatches.slice(0, 10);

  const hasData = result.bilanzsumme || result.umsatzerloese;
  if (!hasData) {
    console.log(`[Firecrawl] Northdata: no financial figures found for "${companyName}"`);
    return null;
  }

  console.log(`[Firecrawl] Northdata OK for "${companyName}": Bilanz=${result.bilanzsumme || 'n/a'}, Umsatz=${result.umsatzerloese || 'n/a'}, Stichtag=${result.stichtag || 'n/a'}, Förderungen=${foerderungen.length}`);
  return result;
}

// Format northdata-parsed data as markdown
function formatNorthdataData(data, companyName) {
  const lines = [`## Finanzdaten — ${companyName}\n`];
  lines.push(`*Quelle: northdata.de (automatisch extrahiert)*\n`);

  if (data.stichtag) lines.push(`**Stichtag:** ${data.stichtag}\n`);

  const hasFinancials = data.bilanzsumme || data.umsatzerloese || data.passiva;
  if (hasFinancials) {
    lines.push('### Finanzkennzahlen\n');
    lines.push('| Kennzahl | Wert |');
    lines.push('|----------|------|');
    if (data.bilanzsumme) lines.push(`| **Bilanzsumme (Aktiva)** | ${data.bilanzsumme} |`);
    if (data.passiva) lines.push(`| **Passiva** | ${data.passiva} |`);
    if (data.umsatzerloese) lines.push(`| **Umsatzerlöse** | ${data.umsatzerloese} |`);
  }

  if (data.gegenstand) {
    lines.push(`\n### Unternehmensgegenstand\n\n${data.gegenstand}\n`);
  }

  if (data.foerderungen && data.foerderungen.length > 0) {
    lines.push('\n## Forschung & Entwicklung — Förderungen\n');
    for (const f of data.foerderungen) {
      lines.push(`- **${f.betrag}:** ${f.projekt}`);
    }
    lines.push('');
  }

  if (data.jahresabschluesse && data.jahresabschluesse.length > 0) {
    lines.push('\n### Verfügbare Jahresabschlüsse (northdata.de)\n');
    for (const ja of data.jahresabschluesse) {
      lines.push(`- Jahresabschluss zum ${ja}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

async function searchJahresabschluss(companyName, forceRefresh = false) {
  const cacheKey = companyName.toLowerCase().trim();

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  const searchUrl = `https://www.bundesanzeiger.de/pub/de/suchergebnis?words=${encodeURIComponent(companyName)}&area=Rechnungslegung%2FFinanzberichte`;

  // Step 1: Scrape Bundesanzeiger with session-based crawler → document list
  let scraped = { documents: [], totalHits: 0 };
  try {
    const session = new BundesanzeigerSession();
    scraped = await session.search(companyName);
    console.log(`[Bundesanzeiger] Crawler found ${scraped.documents.length} docs (${scraped.totalHits} hits) for "${companyName}"`);
  } catch (err) {
    console.error(`[Bundesanzeiger] Crawler error for "${companyName}":`, err.message);
  }

  const latestDoc = scraped.documents[0];
  const geschaeftsjahr = latestDoc?.geschaeftsjahr || null;
  const hasScrapedDocs = scraped.documents.length > 0;

  // Step 2: Firecrawl — scrape northdata.de for exact financial figures
  let northdataData = null;
  if (FIRECRAWL_API_KEY) {
    northdataData = await firecrawlScrapeNorthdata(companyName);
  }

  // If northdata returned exact financial data, build primary result from it
  if (northdataData) {
    const northdataContent = formatNorthdataData(northdataData, companyName);

    let finalContent = northdataContent;
    if (hasScrapedDocs) {
      const docSummary = scraped.documents.slice(0, 10).map(d =>
        `- ${d.info}${d.pubDate ? ` (veröffentlicht: ${d.pubDate})` : ''}`
      ).join('\n');
      finalContent = `## Im Bundesanzeiger veröffentlichte Jahresabschlüsse\n\n${docSummary}\n\n---\n\n${northdataContent}`;
    }

    const northdataUrl = `https://www.northdata.de/${companyName.replace(/\s+/g, '+')}`;
    const data = {
      companyName,
      found: true,
      content: finalContent,
      citations: [northdataUrl],
      results: [{ title: `Jahresabschluss — ${companyName}`, date: northdataData.stichtag || latestDoc?.pubDate || 'Via Firecrawl', link: searchUrl }],
      searchUrl,
      scrapedDocuments: scraped.documents.slice(0, 5),
      dataSource: 'firecrawl-northdata',
      fetchedAt: new Date().toISOString(),
    };
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  // Step 3: Build context from scraped results for Perplexity fallback
  let scrapeContext = '';
  if (hasScrapedDocs) {
    const docList = scraped.documents.slice(0, 5).map((d, i) =>
      `${i + 1}. ${d.info}${d.pubDate ? ` (veröffentlicht am ${d.pubDate})` : ''}`
    ).join('\n');
    scrapeContext += `\n\nWICHTIG: Die direkte Suche im Bundesanzeiger hat ${scraped.totalHits} Treffer für "${companyName}" ergeben. Die neuesten Jahresabschlüsse:\n${docList}\n\nDer neueste Jahresabschluss ist: ${latestDoc.info}. Finde die Finanzdaten (Bilanzsumme, Eigenkapital, Umsatzerlöse, Jahresüberschuss) für diesen Abschluss aus allen verfügbaren öffentlichen Quellen.`;
  }

  // Step 4: Use Perplexity (sonar-pro, NO domain filter) to find financial details
  if (PERPLEXITY_API_KEY) {
    try {
      const prompt = `Finde die Finanzdaten aus dem neuesten veröffentlichten Jahresabschluss der Firma "${companyName}" (Bundesanzeiger, Rechnungslegung/Finanzberichte).

Suche auf diesen Quellen: northdata.de, firmenwissen.de, companywall.de, implisense.com, unternehmensregister.de und allen anderen öffentlichen Seiten die Bundesanzeiger-Daten indexieren.

Liefere:
1. **Geschäftsjahr** (Zeitraum des Jahresabschlusses)
2. **Bilanzsumme**
3. **Eigenkapital**
4. **Jahresüberschuss / Jahresfehlbetrag**
5. **Umsatzerlöse** (falls im Jahresabschluss veröffentlicht)
6. **Art des Abschlusses** (Einzelabschluss, Konzernabschluss, etc.)

BESONDERS WICHTIG — Forschung und Entwicklung:
Falls im Jahresabschluss Angaben zu **Forschung und Entwicklung (F&E)** enthalten sind (z.B. F&E-Aufwendungen, aktivierte Entwicklungskosten, F&E-Quote, Beschreibung von F&E-Aktivitäten), hebe diese Informationen **besonders hervor** in einem eigenen Abschnitt mit der Überschrift "## Forschung & Entwicklung". Dies ist für die Bewertung der Forschungszulage (FZulG) besonders relevant.

WICHTIG: Liefere NUR verifizierte Daten mit Quellenangabe. Erfinde KEINE Zahlen. Falls du keine konkreten Finanzdaten findest, sage ehrlich dass keine Daten gefunden wurden. Antworte auf Deutsch.${scrapeContext}`;

      const response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'Du bist ein Finanzrecherche-Experte. Finde Jahresabschluss-Daten die im Bundesanzeiger veröffentlicht wurden. Nutze alle verfügbaren öffentlichen Quellen die Bundesanzeiger-Daten indexieren (z.B. northdata.de, firmenwissen.de, companywall.de, implisense.com, Pressemitteilungen). WICHTIG: Erfinde KEINE Zahlen. Liefere nur Daten die du tatsächlich in den Suchergebnissen gefunden hast.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 2000,
        },
        {
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 45000,
        }
      );

      const content = response.data.choices[0].message.content;
      const citations = response.data.citations || [];
      const notFound = isNotFoundResponse(content);

      let finalContent = content;
      if (hasScrapedDocs) {
        const docSummary = scraped.documents.slice(0, 10).map(d =>
          `- ${d.info}${d.pubDate ? ` (veröffentlicht: ${d.pubDate})` : ''}`
        ).join('\n');

        if (notFound) {
          finalContent = `## Im Bundesanzeiger veröffentlichte Jahresabschlüsse\n\nFür **${companyName}** wurden **${scraped.totalHits} Veröffentlichungen** im Bundesanzeiger gefunden:\n\n${docSummary}\n\n---\n\n*Die detaillierten Finanzkennzahlen (Bilanzsumme, Eigenkapital, etc.) konnten nicht automatisch extrahiert werden. Bitte nutzen Sie den Link unten, um den vollständigen Jahresabschluss direkt im Bundesanzeiger einzusehen.*`;
        } else {
          finalContent = `## Im Bundesanzeiger veröffentlichte Jahresabschlüsse\n\n${docSummary}\n\n---\n\n${content}`;
        }
      }

      const data = {
        companyName,
        found: hasScrapedDocs || !notFound,
        content: (hasScrapedDocs || !notFound) ? finalContent : null,
        message: (!hasScrapedDocs && notFound)
          ? `Kein Jahresabschluss für "${companyName}" im Bundesanzeiger gefunden. Bitte prüfen Sie die Schreibweise oder suchen Sie direkt im Bundesanzeiger.`
          : undefined,
        citations,
        results: (hasScrapedDocs || !notFound)
          ? [{ title: `Jahresabschluss — ${companyName}`, date: latestDoc?.pubDate || 'Via KI-Recherche', link: searchUrl }]
          : [],
        searchUrl,
        scrapedDocuments: scraped.documents.slice(0, 5),
        dataSource: 'perplexity',
        fetchedAt: new Date().toISOString(),
      };

      if (data.found) {
        cache.set(cacheKey, { data, timestamp: Date.now() });
      }
      return data;
    } catch (err) {
      console.error(`[Bundesanzeiger] Perplexity error for "${companyName}":`, err.message);
    }
  }

  // Fallback: return scraped document list only
  if (hasScrapedDocs) {
    const docSummary = scraped.documents.slice(0, 10).map(d =>
      `- ${d.info}${d.pubDate ? ` (veröffentlicht: ${d.pubDate})` : ''}`
    ).join('\n');
    const data = {
      companyName,
      found: true,
      content: `## Im Bundesanzeiger veröffentlichte Jahresabschlüsse\n\nFür **${companyName}** wurden **${scraped.totalHits} Veröffentlichungen** im Bundesanzeiger gefunden:\n\n${docSummary}\n\n---\n\n*Bitte nutzen Sie den Link unten, um den vollständigen Jahresabschluss direkt im Bundesanzeiger einzusehen.*`,
      citations: [],
      results: [{ title: `Jahresabschluss — ${companyName}`, date: scraped.documents[0]?.pubDate || '', link: searchUrl }],
      searchUrl,
      scrapedDocuments: scraped.documents.slice(0, 5),
      dataSource: 'scraper-only',
      fetchedAt: new Date().toISOString(),
    };
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  return {
    companyName,
    found: false,
    results: [],
    message: `Kein Jahresabschluss für "${companyName}" im Bundesanzeiger gefunden. Bitte prüfen Sie die Schreibweise oder suchen Sie direkt im Bundesanzeiger.`,
    searchUrl,
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = { searchJahresabschluss };
