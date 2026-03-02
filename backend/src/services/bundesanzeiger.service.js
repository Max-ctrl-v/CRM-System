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
// Firecrawl: Web search + scrape for exact financial data
// ---------------------------------------------------------------------------

// Search the web for company financial data and get full page content
async function firecrawlSearchFinancials(companyName, geschaeftsjahr) {
  if (!FIRECRAWL_API_KEY) return null;

  let yearStr = '';
  if (geschaeftsjahr?.to) {
    yearStr = ` ${geschaeftsjahr.to.split('.').pop()}`;
  }

  const query = `"${companyName}" Jahresabschluss${yearStr} Bilanzsumme Eigenkapital Umsatz`;
  console.log(`[Firecrawl] Searching: ${query}`);

  try {
    const resp = await axios.post(
      'https://api.firecrawl.dev/v2/search',
      {
        query,
        limit: 5,
        scrapeOptions: { formats: ['markdown'] },
      },
      {
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    if (!resp.data?.success || !resp.data.data?.length) {
      console.log(`[Firecrawl] No search results for "${companyName}"`);
      return null;
    }

    const results = resp.data.data;
    console.log(`[Firecrawl] Found ${results.length} results for "${companyName}"`);

    // Combine markdown from relevant results (skip very short / empty pages)
    const pages = results
      .filter(r => r.markdown && r.markdown.length > 200)
      .map(r => ({
        url: r.url || r.metadata?.sourceURL || '',
        title: r.metadata?.title || '',
        markdown: r.markdown,
      }));

    if (pages.length === 0) return null;

    return {
      pages,
      sources: pages.map(p => p.url).filter(Boolean),
    };
  } catch (err) {
    console.error(`[Firecrawl] Search error for "${companyName}":`, err.message);
    return null;
  }
}

// Extract structured financial data using Firecrawl Extract API
async function firecrawlExtractFinancials(companyName, geschaeftsjahr) {
  if (!FIRECRAWL_API_KEY) return null;

  let yearStr = '';
  if (geschaeftsjahr?.to) {
    yearStr = geschaeftsjahr.to.split('.').pop();
  }

  const slug = companyName.replace(/\s+/g, '+');
  const urls = [
    `https://www.northdata.de/${slug}`,
  ];

  try {
    const resp = await axios.post(
      'https://api.firecrawl.dev/v2/extract',
      {
        urls,
        prompt: `Extrahiere die Finanzdaten aus dem neuesten Jahresabschluss der Firma "${companyName}"${yearStr ? ` (Geschäftsjahr ${yearStr})` : ''}. Suche nach: Bilanzsumme, Eigenkapital, Jahresüberschuss/Jahresfehlbetrag, Umsatzerlöse, Mitarbeiterzahl, Geschäftsjahr-Zeitraum, Art des Abschlusses. Falls Angaben zu Forschung und Entwicklung (F&E) vorhanden sind, extrahiere diese ebenfalls.`,
        schema: {
          type: 'object',
          properties: {
            geschaeftsjahr: { type: 'string', description: 'Zeitraum z.B. "01.01.2023 - 31.12.2023"' },
            bilanzsumme: { type: 'string', description: 'Bilanzsumme/Aktiva in Euro' },
            eigenkapital: { type: 'string', description: 'Eigenkapital in Euro' },
            jahresueberschuss: { type: 'string', description: 'Jahresüberschuss/-fehlbetrag in Euro' },
            umsatzerloese: { type: 'string', description: 'Umsatzerlöse in Euro' },
            mitarbeiter: { type: 'string', description: 'Anzahl Mitarbeiter' },
            abschlussart: { type: 'string', description: 'Einzelabschluss, Konzernabschluss, etc.' },
            fue_aufwendungen: { type: 'string', description: 'F&E-Aufwendungen falls vorhanden' },
            fue_beschreibung: { type: 'string', description: 'F&E-Aktivitäten Beschreibung' },
            gegenstand: { type: 'string', description: 'Unternehmensgegenstand' },
          },
        },
        enableWebSearch: true,
      },
      {
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 90000,
      }
    );

    if (!resp.data?.success) {
      // Check for async job ID
      if (resp.data?.id) {
        return pollFirecrawlJob(resp.data.id, companyName);
      }
      console.log(`[Firecrawl] Extract returned no data for "${companyName}"`);
      return null;
    }

    return validateExtractedData(resp.data.data, companyName);
  } catch (err) {
    if (err.response?.status === 202 && err.response?.data?.id) {
      return pollFirecrawlJob(err.response.data.id, companyName);
    }
    console.error(`[Firecrawl] Extract error for "${companyName}":`, err.message);
    return null;
  }
}

// Poll async Firecrawl extract job
async function pollFirecrawlJob(jobId, companyName) {
  console.log(`[Firecrawl] Polling async job ${jobId} for "${companyName}"`);
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const resp = await axios.get(
        `https://api.firecrawl.dev/v2/extract/${jobId}`,
        { headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}` }, timeout: 15000 }
      );
      if (resp.data?.status === 'completed' && resp.data.data) {
        return validateExtractedData(resp.data.data, companyName);
      }
      if (resp.data?.status === 'failed' || resp.data?.status === 'cancelled') return null;
    } catch (err) {
      console.error(`[Firecrawl] Poll error:`, err.message);
    }
  }
  console.log(`[Firecrawl] Job ${jobId} timed out for "${companyName}"`);
  return null;
}

function validateExtractedData(data, companyName) {
  if (!data) return null;
  const hasData = data.bilanzsumme || data.eigenkapital || data.umsatzerloese || data.jahresueberschuss;
  if (!hasData) {
    console.log(`[Firecrawl] Extract found no financial figures for "${companyName}"`);
    return null;
  }
  console.log(`[Firecrawl] Extract OK for "${companyName}": Bilanz=${data.bilanzsumme || 'n/a'}, Umsatz=${data.umsatzerloese || 'n/a'}`);
  return data;
}

// Parse financial figures from Firecrawl search page markdown
function parseFinancialsFromMarkdown(pages, companyName) {
  const result = { sources: [] };

  for (const page of pages) {
    const md = page.markdown;
    result.sources.push(page.url);

    // Try to extract key financial figures using common patterns
    // Bilanzsumme / Aktiva
    if (!result.bilanzsumme) {
      const m = md.match(/(?:Bilanzsumme|Aktiva|Balance\s*Sheet\s*Total)[:\s]*(?:ca\.\s*)?([€\d.,]+\s*(?:Mio\.?\s*€?|Tsd\.?\s*€?|EUR|€)?)/i)
        || md.match(/([\d.,]+)\s*(?:Mio\.?\s*€|Tsd\.?\s*€)\s*(?:Aktiva|Bilanzsumme)/i);
      if (m) result.bilanzsumme = m[1].trim();
    }

    // Eigenkapital
    if (!result.eigenkapital) {
      const m = md.match(/Eigenkapital[:\s]*(?:ca\.\s*)?([€\d.,]+\s*(?:Mio\.?\s*€?|Tsd\.?\s*€?|EUR|€)?)/i)
        || md.match(/([\d.,]+)\s*(?:Mio\.?\s*€|Tsd\.?\s*€)\s*Eigenkapital/i);
      if (m) result.eigenkapital = m[1].trim();
    }

    // Umsatz / Umsatzerlöse / Revenue
    if (!result.umsatzerloese) {
      const m = md.match(/(?:Umsatzerlöse|Umsatz|Revenue)[:\s]*(?:ca\.\s*)?([€\d.,]+\s*(?:Mio\.?\s*€?|Tsd\.?\s*€?|EUR|€)?)/i)
        || md.match(/([\d.,]+)\s*(?:Mio\.?\s*€|Tsd\.?\s*€)\s*(?:Umsatzerlöse|Umsatz)/i);
      if (m) result.umsatzerloese = m[1].trim();
    }

    // Jahresüberschuss / Jahresfehlbetrag
    if (!result.jahresueberschuss) {
      const m = md.match(/(?:Jahresüberschuss|Jahresfehlbetrag|Gewinn|Verlust|Net\s*Income)[:\s]*(?:ca\.\s*)?(-?[€\d.,]+\s*(?:Mio\.?\s*€?|Tsd\.?\s*€?|EUR|€)?)/i);
      if (m) result.jahresueberschuss = m[1].trim();
    }

    // Mitarbeiter
    if (!result.mitarbeiter) {
      const m = md.match(/(?:Mitarbeiter|Beschäftigte|Employees)[:\s]*(?:ca\.\s*)?([\d.,]+)/i);
      if (m) result.mitarbeiter = m[1].trim();
    }

    // Geschäftsjahr
    if (!result.geschaeftsjahr) {
      const m = md.match(/(?:Geschäftsjahr|Fiscal\s*Year|GJ)[:\s]*([\d]{4}(?:\s*[-\/]\s*[\d]{4})?)/i)
        || md.match(/(\d{2}\.\d{2}\.\d{4})\s*(?:bis|[-–])\s*(\d{2}\.\d{2}\.\d{4})/);
      if (m) result.geschaeftsjahr = m[0].replace(/(?:Geschäftsjahr|Fiscal\s*Year|GJ)[:\s]*/i, '').trim();
    }

    // F&E / Forschung und Entwicklung
    if (!result.fue_aufwendungen) {
      const m = md.match(/(?:F&E|Forschung\s*(?:und|&)\s*Entwicklung|R&D)[:\s-]*(?:Aufwendungen|Kosten|Ausgaben)?[:\s]*(?:ca\.\s*)?([€\d.,]+\s*(?:Mio\.?\s*€?|Tsd\.?\s*€?|EUR|€)?)/i);
      if (m) result.fue_aufwendungen = m[1].trim();
    }

    // Gegenstand des Unternehmens
    if (!result.gegenstand) {
      const m = md.match(/(?:Gegenstand|Unternehmensgegenstand|Geschäftstätigkeit)[:\s]*([^\n]{20,200})/i);
      if (m) result.gegenstand = m[1].trim();
    }
  }

  const hasData = result.bilanzsumme || result.eigenkapital || result.umsatzerloese || result.jahresueberschuss;
  if (!hasData) return null;

  console.log(`[Firecrawl] Parsed from search results for "${companyName}": Bilanz=${result.bilanzsumme || 'n/a'}, Umsatz=${result.umsatzerloese || 'n/a'}`);
  return result;
}

// Format extracted/parsed data as markdown
function formatFinancialData(data, companyName, source) {
  const lines = [`## Finanzdaten — ${companyName}\n`];
  lines.push(`*Quelle: ${source}*\n`);

  if (data.geschaeftsjahr) lines.push(`**Geschäftsjahr:** ${data.geschaeftsjahr}\n`);
  if (data.abschlussart) lines.push(`**Art:** ${data.abschlussart}\n`);

  const hasFinancials = data.bilanzsumme || data.eigenkapital || data.umsatzerloese || data.jahresueberschuss;
  if (hasFinancials) {
    lines.push('### Finanzkennzahlen\n');
    lines.push('| Kennzahl | Wert |');
    lines.push('|----------|------|');
    if (data.bilanzsumme) lines.push(`| **Bilanzsumme** | ${data.bilanzsumme} |`);
    if (data.eigenkapital) lines.push(`| **Eigenkapital** | ${data.eigenkapital} |`);
    if (data.jahresueberschuss) lines.push(`| **Jahresüberschuss/-fehlbetrag** | ${data.jahresueberschuss} |`);
    if (data.umsatzerloese) lines.push(`| **Umsatzerlöse** | ${data.umsatzerloese} |`);
    if (data.mitarbeiter) lines.push(`| **Mitarbeiter** | ${data.mitarbeiter} |`);
  }

  if (data.fue_aufwendungen || data.fue_beschreibung) {
    lines.push('\n## Forschung & Entwicklung\n');
    if (data.fue_aufwendungen) lines.push(`**F&E-Aufwendungen:** ${data.fue_aufwendungen}\n`);
    if (data.fue_beschreibung) lines.push(`${data.fue_beschreibung}\n`);
  }

  if (data.gegenstand) {
    lines.push(`\n### Unternehmensgegenstand\n\n${data.gegenstand}\n`);
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

  // Step 2: Firecrawl — search web + extract structured data (run in parallel)
  let firecrawlExtracted = null;
  let firecrawlSearchResult = null;
  let firecrawlParsed = null;

  if (FIRECRAWL_API_KEY) {
    const [extractRes, searchRes] = await Promise.allSettled([
      firecrawlExtractFinancials(companyName, geschaeftsjahr),
      firecrawlSearchFinancials(companyName, geschaeftsjahr),
    ]);

    firecrawlExtracted = extractRes.status === 'fulfilled' ? extractRes.value : null;
    firecrawlSearchResult = searchRes.status === 'fulfilled' ? searchRes.value : null;

    // Also try to parse financial figures directly from search result pages
    if (firecrawlSearchResult?.pages?.length > 0) {
      firecrawlParsed = parseFinancialsFromMarkdown(firecrawlSearchResult.pages, companyName);
    }
  }

  // Merge: prefer Extract (structured) > Parsed (regex from pages) > null
  const firecrawlData = firecrawlExtracted || firecrawlParsed;
  const firecrawlSources = [
    ...(firecrawlSearchResult?.sources || []),
  ];

  // If Firecrawl got exact structured data, use it as primary result
  if (firecrawlData) {
    const source = firecrawlExtracted ? 'Firecrawl Extract (verifiziert)' : 'Firecrawl Web-Scraping';
    const firecrawlContent = formatFinancialData(firecrawlData, companyName, source);

    let finalContent = firecrawlContent;
    if (hasScrapedDocs) {
      const docSummary = scraped.documents.slice(0, 10).map(d =>
        `- ${d.info}${d.pubDate ? ` (veröffentlicht: ${d.pubDate})` : ''}`
      ).join('\n');
      finalContent = `## Im Bundesanzeiger veröffentlichte Jahresabschlüsse\n\n${docSummary}\n\n---\n\n${firecrawlContent}`;
    }

    const data = {
      companyName,
      found: true,
      content: finalContent,
      citations: firecrawlSources,
      results: [{ title: `Jahresabschluss — ${companyName}`, date: latestDoc?.pubDate || 'Via Firecrawl', link: searchUrl }],
      searchUrl,
      scrapedDocuments: scraped.documents.slice(0, 5),
      dataSource: firecrawlExtracted ? 'firecrawl-extract' : 'firecrawl-search',
      fetchedAt: new Date().toISOString(),
    };
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  // Step 3: Build context from scraped docs + Firecrawl search pages for Perplexity
  let scrapeContext = '';
  if (hasScrapedDocs) {
    const docList = scraped.documents.slice(0, 5).map((d, i) =>
      `${i + 1}. ${d.info}${d.pubDate ? ` (veröffentlicht am ${d.pubDate})` : ''}`
    ).join('\n');
    scrapeContext += `\n\nWICHTIG: Die direkte Suche im Bundesanzeiger hat ${scraped.totalHits} Treffer für "${companyName}" ergeben. Die neuesten Jahresabschlüsse:\n${docList}\n\nDer neueste Jahresabschluss ist: ${latestDoc.info}. Finde die Finanzdaten (Bilanzsumme, Eigenkapital, Umsatzerlöse, Jahresüberschuss) für diesen Abschluss aus allen verfügbaren öffentlichen Quellen.`;
  }

  // Feed Firecrawl's scraped page content to Perplexity for better accuracy
  if (firecrawlSearchResult?.pages?.length > 0) {
    const pagesContext = firecrawlSearchResult.pages
      .slice(0, 3)
      .map(p => {
        const truncated = p.markdown.length > 2000 ? p.markdown.substring(0, 2000) + '...' : p.markdown;
        return `--- Quelle: ${p.url} ---\n${truncated}`;
      })
      .join('\n\n');
    scrapeContext += `\n\nZUSÄTZLICHER KONTEXT (Firecrawl Web-Scraping — nutze diese Daten als primäre Quelle):\n${pagesContext}`;
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

      // Merge Firecrawl sources into citations
      for (const src of firecrawlSources) {
        if (!citations.includes(src)) citations.push(src);
      }

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
        dataSource: firecrawlSearchResult ? 'perplexity+firecrawl' : 'perplexity',
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
