const axios = require('axios');
const cheerio = require('cheerio');
const { PERPLEXITY_API_KEY } = require('../config/env');

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

// Patterns that indicate Perplexity did NOT find Jahresabschluss data
const NOT_FOUND_PATTERNS = [
  /kein(e|en|er)?\s+(jahresabschluss|daten|ergebnis|veröffentlichung|eintrag|angaben)/i,
  /nicht\s+(verfügbar|veröffentlicht|gefunden|auffindbar|vorhanden)/i,
  /keine\s+(informationen|ergebnisse|treffer|finanz)/i,
  /konnte\s+(nicht|kein)/i,
  /lieg(t|en)\s+nicht\s+vor/i,
  /nicht\s+im\s+bundesanzeiger/i,
  /keinen\s+direkten\s+zugriff/i,
  /habe\s+keinen\s+zugriff/i,
];

function isNotFoundResponse(content) {
  if (!content || content.trim().length < 80) return true;
  const matchCount = NOT_FOUND_PATTERNS.filter(p => p.test(content)).length;
  return matchCount >= 2;
}

/**
 * Scrape the Bundesanzeiger search results using a proper session.
 * Steps: 1) GET start page to get session cookie  2) Submit search form  3) Parse results
 */
async function scrapeBundesanzeigerResults(companyName) {
  try {
    // Step 1: Create session by fetching the start page
    const axiosSession = axios.create({
      timeout: 15000,
      maxRedirects: 5,
      headers: BROWSER_HEADERS,
    });

    // Manually track cookies
    let cookies = '';

    const startResp = await axiosSession.get('https://www.bundesanzeiger.de/pub/de/start', {
      maxRedirects: 0,
      validateStatus: (s) => s >= 200 && s < 400,
    });

    // Extract jsessionid from Set-Cookie header
    const setCookies = startResp.headers['set-cookie'] || [];
    for (const c of setCookies) {
      const match = c.match(/jsessionid=([^;]+)/i);
      if (match) cookies = `jsessionid=${match[1]}`;
    }

    if (!cookies) {
      console.error('[Bundesanzeiger] No session cookie received');
      return { documents: [], totalHits: 0 };
    }

    // Follow the redirect with session cookie to establish Wicket page state
    const redirectUrl = startResp.headers.location;
    if (redirectUrl) {
      await axiosSession.get(
        redirectUrl.startsWith('http') ? redirectUrl : `https://www.bundesanzeiger.de${redirectUrl}`,
        { headers: { ...BROWSER_HEADERS, Cookie: cookies } }
      );
    }

    // Step 2: Submit search form (GET request with form params)
    const searchFormUrl = `https://www.bundesanzeiger.de/pub/de/start?4-1.-top~content~panel-left~card-form=&fulltext=${encodeURIComponent(companyName)}&area_select=Rechnungslegung%2FFinanzberichte&search_button=Suchen`;

    const searchResp = await axiosSession.get(searchFormUrl, {
      headers: {
        ...BROWSER_HEADERS,
        Cookie: cookies,
        Referer: 'https://www.bundesanzeiger.de/pub/de/start',
      },
      maxRedirects: 5,
    });

    // Update cookies from search response
    const searchCookies = searchResp.headers['set-cookie'] || [];
    for (const c of searchCookies) {
      const match = c.match(/jsessionid=([^;]+)/i);
      if (match) cookies = `jsessionid=${match[1]}`;
    }

    // Step 3: Parse search results
    const $ = cheerio.load(searchResp.data);
    const documents = [];

    // Extract result info
    const resultInfo = $('.result_info').text().trim().replace(/\s+/g, ' ');
    const totalMatch = resultInfo.match(/(\d+)\s*Treffer/);
    const totalHits = totalMatch ? parseInt(totalMatch[1], 10) : 0;

    // Parse each result row (Bundesanzeiger uses div.row / div.row.back pattern)
    $('div.row, div.row.back').each((_i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');

      // Skip header rows and navigation
      if (!text || text.length < 20) return;
      if (/^Name\s+Bereich/.test(text)) return;
      if (/Ergebnisse pro Seite/.test(text)) return;

      // Extract company name from first column
      const nameCol = $(el).find('.col-md-3 .first, .col-md-3').first().text().trim().replace(/\s+/g, ' ');

      // Extract document type/info (the linked text)
      const infoLink = $(el).find('a');
      const info = infoLink.text().trim().replace(/\s+/g, ' ');

      // Extract area (Rechnungslegung, etc.)
      const areaCol = $(el).find('.col-md-3').eq(1).text().trim().replace(/\s+/g, ' ');

      // Extract publication date (last column)
      const dateMatch = text.match(/(\d{2}\.\d{2}\.\d{4})\s*$/);
      const pubDate = dateMatch ? dateMatch[1] : '';

      // Extract Geschäftsjahr from info text
      const gjMatch = info.match(/vom\s+(\d{2}\.\d{2}\.\d{4})\s+bis\s+zum\s+(\d{2}\.\d{2}\.\d{4})/);

      if (info && /jahresabschluss|rechnungslegung/i.test(text)) {
        documents.push({
          companyName: nameCol || companyName,
          info,
          area: areaCol,
          pubDate,
          geschaeftsjahr: gjMatch ? { from: gjMatch[1], to: gjMatch[2] } : null,
        });
      }
    });

    return { documents, totalHits: totalHits || documents.length };
  } catch (err) {
    console.error(`[Bundesanzeiger] Session scraping failed for "${companyName}":`, err.message);
    return { documents: [], totalHits: 0 };
  }
}

async function searchJahresabschluss(companyName, forceRefresh = false) {
  const cacheKey = companyName.toLowerCase().trim();

  // Check cache (skip if force refresh)
  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  const searchUrl = `https://www.bundesanzeiger.de/pub/de/suchergebnis?words=${encodeURIComponent(companyName)}&area=Rechnungslegung%2FFinanzberichte`;

  // Step 1: Scrape Bundesanzeiger with session-based approach
  const scraped = await scrapeBundesanzeigerResults(companyName);
  const latestDoc = scraped.documents[0]; // Most recent first

  // Build context from scraped results for Perplexity
  let scrapeContext = '';
  if (scraped.documents.length > 0) {
    const docList = scraped.documents.slice(0, 5).map((d, i) =>
      `${i + 1}. ${d.info}${d.pubDate ? ` (veröffentlicht am ${d.pubDate})` : ''}`
    ).join('\n');
    scrapeContext = `\n\nWICHTIG: Die direkte Suche im Bundesanzeiger hat ${scraped.totalHits} Treffer für "${companyName}" ergeben. Die neuesten Jahresabschlüsse:\n${docList}\n\nDer neueste Jahresabschluss ist: ${latestDoc.info}. Finde die Finanzdaten (Bilanzsumme, Eigenkapital, Umsatzerlöse, Jahresüberschuss) für diesen Abschluss aus allen verfügbaren öffentlichen Quellen.`;
  }

  // Step 2: Use Perplexity to find financial details
  // DO NOT use search_domain_filter — Perplexity cannot access bundesanzeiger.de directly.
  // Instead, let it search broadly for indexed Bundesanzeiger data from secondary sources.
  if (PERPLEXITY_API_KEY) {
    try {
      const prompt = `Finde die Finanzdaten aus dem neuesten veröffentlichten Jahresabschluss der Firma "${companyName}" (Bundesanzeiger, Rechnungslegung/Finanzberichte).

Liefere:
1. **Geschäftsjahr** (Zeitraum des Jahresabschlusses)
2. **Bilanzsumme**
3. **Eigenkapital**
4. **Jahresüberschuss / Jahresfehlbetrag**
5. **Umsatzerlöse** (falls im Jahresabschluss veröffentlicht)
6. **Art des Abschlusses** (Einzelabschluss, Konzernabschluss, etc.)

BESONDERS WICHTIG — Forschung und Entwicklung:
Falls im Jahresabschluss Angaben zu **Forschung und Entwicklung (F&E)** enthalten sind (z.B. F&E-Aufwendungen, aktivierte Entwicklungskosten, F&E-Quote, Beschreibung von F&E-Aktivitäten), hebe diese Informationen **besonders hervor** in einem eigenen Abschnitt mit der Überschrift "## Forschung & Entwicklung". Dies ist für die Bewertung der Forschungszulage (FZulG) besonders relevant.

WICHTIG: Liefere NUR verifizierte Daten mit Quellenangabe. Erfinde KEINE Zahlen. Falls du keine konkreten Finanzdaten findest, liste nur die verfügbaren Jahresabschlüsse auf. Antworte auf Deutsch.${scrapeContext}`;

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
          // NO search_domain_filter — Perplexity cannot access bundesanzeiger.de
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

      // If Perplexity couldn't find financial details but we have scraped documents,
      // still return as "found" with the document list + whatever Perplexity returned
      const hasScrapedDocs = scraped.documents.length > 0;

      let finalContent = content;
      if (hasScrapedDocs && notFound) {
        // Perplexity couldn't find financial details, but we know docs exist
        const docSummary = scraped.documents.slice(0, 10).map(d =>
          `- ${d.info}${d.pubDate ? ` (veröffentlicht: ${d.pubDate})` : ''}`
        ).join('\n');
        finalContent = `## Im Bundesanzeiger veröffentlichte Jahresabschlüsse\n\nFür **${companyName}** wurden **${scraped.totalHits} Veröffentlichungen** im Bundesanzeiger gefunden:\n\n${docSummary}\n\n---\n\n*Die detaillierten Finanzkennzahlen (Bilanzsumme, Eigenkapital, etc.) konnten nicht automatisch extrahiert werden. Bitte nutzen Sie den Link unten, um den vollständigen Jahresabschluss direkt im Bundesanzeiger einzusehen.*`;
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

      // Only cache positive results
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
    const content = `## Im Bundesanzeiger veröffentlichte Jahresabschlüsse\n\nFür **${companyName}** wurden **${scraped.totalHits} Veröffentlichungen** im Bundesanzeiger gefunden:\n\n${docSummary}\n\n---\n\n*Bitte nutzen Sie den Link unten, um den vollständigen Jahresabschluss direkt im Bundesanzeiger einzusehen.*`;
    return {
      companyName,
      found: true,
      content,
      citations: [],
      results: [{ title: `Jahresabschluss — ${companyName}`, date: scraped.documents[0]?.pubDate || '', link: searchUrl }],
      searchUrl,
      scrapedDocuments: scraped.documents.slice(0, 5),
      fetchedAt: new Date().toISOString(),
    };
  }

  // Final fallback: return direct link for manual search
  return {
    companyName,
    found: false,
    results: [],
    message: 'Automatische Abfrage nicht möglich. Bitte direkt im Bundesanzeiger suchen.',
    searchUrl,
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = { searchJahresabschluss };
