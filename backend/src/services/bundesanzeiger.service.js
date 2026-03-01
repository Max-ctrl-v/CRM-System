const axios = require('axios');
const cheerio = require('cheerio');
const { PERPLEXITY_API_KEY } = require('../config/env');

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
// The Bundesanzeiger uses Apache Wicket with session-based URLs. Direct URL
// access fails (302 → error). We must:
//   1. GET /pub/de/start → get jsessionid cookie + follow redirect
//   2. Parse the search form from the HTML (dynamic Wicket component paths)
//   3. Submit form with company name → search results page
//   4. Parse results with cheerio → document list (titles, dates)
//
// Note: Individual document pages require a CAPTCHA (Sicherheitsabfrage),
// so we can only get the document LIST, not the actual financial figures.
// We then feed this list to Perplexity as context for enrichment.
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
    // Step 1: Establish session — load start page and follow redirect
    const startResp = await this._follow('/pub/de/start');
    if (startResp.status !== 200) return { documents: [], totalHits: 0 };

    // Step 2: Parse the search form dynamically (Wicket generates component paths)
    const $ = cheerio.load(startResp.data);
    const form = $('form').filter((_, el) => $(el).find('input[name="fulltext"]').length > 0).first();
    const formAction = form.attr('action');
    if (!formAction) return { documents: [], totalHits: 0 };

    // Collect ALL form inputs (including the hidden Wicket component path)
    const params = new URLSearchParams();
    form.find('input, select').each((_, el) => {
      const name = $(el).attr('name');
      if (!name) return;
      if (name === 'fulltext') params.set(name, companyName);
      else if (name === 'search_button') params.set(name, 'Suchen');
      else params.set(name, $(el).attr('value') || '');
    });

    // Step 3: Submit search
    const searchUrl = `${formAction}?${params.toString()}`;
    const searchResp = await this._follow(searchUrl, { Referer: startResp._finalUrl });

    if (searchResp.status !== 200 || /pub\/de\/error/i.test(searchResp._finalUrl)) {
      return { documents: [], totalHits: 0 };
    }

    // Step 4: Parse results
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

      // Use the Wicket publication link (contains 'search~table~panel-rows')
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

  // Step 1: Scrape Bundesanzeiger with session-based crawler
  let scraped = { documents: [], totalHits: 0 };
  try {
    const session = new BundesanzeigerSession();
    scraped = await session.search(companyName);
    console.log(`[Bundesanzeiger] Crawler found ${scraped.documents.length} docs (${scraped.totalHits} hits) for "${companyName}"`);
  } catch (err) {
    console.error(`[Bundesanzeiger] Crawler error for "${companyName}":`, err.message);
  }

  const latestDoc = scraped.documents[0];

  // Step 2: Build context from scraped results for Perplexity
  let scrapeContext = '';
  if (scraped.documents.length > 0) {
    const docList = scraped.documents.slice(0, 5).map((d, i) =>
      `${i + 1}. ${d.info}${d.pubDate ? ` (veröffentlicht am ${d.pubDate})` : ''}`
    ).join('\n');
    scrapeContext = `\n\nWICHTIG: Die direkte Suche im Bundesanzeiger hat ${scraped.totalHits} Treffer für "${companyName}" ergeben. Die neuesten Jahresabschlüsse:\n${docList}\n\nDer neueste Jahresabschluss ist: ${latestDoc.info}. Finde die Finanzdaten (Bilanzsumme, Eigenkapital, Umsatzerlöse, Jahresüberschuss) für diesen Abschluss aus allen verfügbaren öffentlichen Quellen.`;
  }

  // Step 3: Use Perplexity (sonar-pro, NO domain filter) to find financial details
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
      const hasScrapedDocs = scraped.documents.length > 0;

      // Build final content
      let finalContent = content;
      if (hasScrapedDocs) {
        const docSummary = scraped.documents.slice(0, 10).map(d =>
          `- ${d.info}${d.pubDate ? ` (veröffentlicht: ${d.pubDate})` : ''}`
        ).join('\n');

        if (notFound) {
          // Perplexity couldn't find details, but we confirmed documents exist
          finalContent = `## Im Bundesanzeiger veröffentlichte Jahresabschlüsse\n\nFür **${companyName}** wurden **${scraped.totalHits} Veröffentlichungen** im Bundesanzeiger gefunden:\n\n${docSummary}\n\n---\n\n*Die detaillierten Finanzkennzahlen (Bilanzsumme, Eigenkapital, etc.) konnten nicht automatisch extrahiert werden. Bitte nutzen Sie den Link unten, um den vollständigen Jahresabschluss direkt im Bundesanzeiger einzusehen.*`;
        } else {
          // Perplexity found details — prepend the confirmed document list
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

  // Fallback without Perplexity: return scraped document list if available
  if (scraped.documents.length > 0) {
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
