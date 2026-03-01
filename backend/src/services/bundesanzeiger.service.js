const axios = require('axios');
const cheerio = require('cheerio');
const { PERPLEXITY_API_KEY } = require('../config/env');

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Patterns that indicate Perplexity did NOT find Jahresabschluss data
const NOT_FOUND_PATTERNS = [
  /kein(e|en|er)?\s+(jahresabschluss|daten|ergebnis|veröffentlichung|eintrag|angaben)/i,
  /nicht\s+(verfügbar|veröffentlicht|gefunden|auffindbar|vorhanden)/i,
  /keine\s+(informationen|ergebnisse|treffer|finanz)/i,
  /konnte\s+(nicht|kein)/i,
  /lieg(t|en)\s+nicht\s+vor/i,
  /nicht\s+im\s+bundesanzeiger/i,
  /keine\s+öffentlich/i,
  /nicht\s+öffentlich/i,
];

/**
 * Detect whether Perplexity's response is a "not found" answer.
 * Returns true if the content appears to be a negative/empty result.
 */
function isNotFoundResponse(content) {
  if (!content || content.trim().length < 80) return true;
  const matchCount = NOT_FOUND_PATTERNS.filter(p => p.test(content)).length;
  // 2+ negative patterns = likely a "not found" response
  return matchCount >= 2;
}

/**
 * Attempt direct scraping of the Bundesanzeiger search results page.
 * Returns an array of result snippets (title, date, link) or empty array on failure.
 */
async function tryScrapeBundesanzeiger(companyName) {
  const searchUrl = `https://www.bundesanzeiger.de/pub/de/suchergebnis?words=${encodeURIComponent(companyName)}&area=Rechnungslegung%2FFinanzberichte`;

  try {
    const resp = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    const $ = cheerio.load(resp.data);
    const results = [];

    // Try various selectors (Bundesanzeiger HTML structure)
    const selectors = [
      '.result_container .row',
      'table.result_table tr',
      '.publication_container li',
      '.search-result-item',
      'dl.result_dl dt',
      'dl.result_dl dd',
      '[class*="result"] li',
      '[class*="result"] tr',
      '.info_row',
      '.content_block',
    ];

    for (const sel of selectors) {
      $(sel).each((_i, el) => {
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        const href = $(el).find('a').attr('href') || $(el).attr('href') || '';
        if (text.length > 15 && !results.some(r => r.text === text)) {
          results.push({
            text: text.substring(0, 500),
            link: href
              ? (href.startsWith('http') ? href : `https://www.bundesanzeiger.de${href}`)
              : '',
          });
        }
      });
    }

    // Also extract any visible text that mentions Jahresabschluss / Rechnungslegung
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const hasFinancialContent = /jahresabschluss|rechnungslegung|bilanzsumme|bilanz/i.test(bodyText);

    return { results, hasFinancialContent, bodyText: bodyText.substring(0, 2000) };
  } catch (err) {
    console.error(`[Bundesanzeiger] Scraping failed for "${companyName}":`, err.message);
    return { results: [], hasFinancialContent: false, bodyText: '' };
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

  // Step 1: Attempt direct scraping for supplementary context
  const scraped = await tryScrapeBundesanzeiger(companyName);
  let scrapeContext = '';
  if (scraped.results.length > 0) {
    scrapeContext = `\n\nHinweis: Die direkte Suche auf bundesanzeiger.de hat ${scraped.results.length} Treffer ergeben:\n${scraped.results.slice(0, 10).map((r, i) => `${i + 1}. ${r.text}`).join('\n')}\n\nBitte fasse die Jahresabschluss-Daten basierend auf diesen Bundesanzeiger-Ergebnissen zusammen.`;
  } else if (scraped.hasFinancialContent) {
    scrapeContext = '\n\nHinweis: Die Bundesanzeiger-Seite enthält Finanzdaten zu dieser Firma. Bitte suche gezielt auf bundesanzeiger.de nach dem Jahresabschluss.';
  }

  // Step 2: Use Perplexity with domain filtering for reliable results
  if (PERPLEXITY_API_KEY) {
    try {
      const prompt = `Suche den neuesten Jahresabschluss der Firma "${companyName}" ausschließlich im Bundesanzeiger (bundesanzeiger.de), Bereich Rechnungslegung/Finanzberichte.

Liefere NUR Informationen aus dem veröffentlichten Jahresabschluss im Bundesanzeiger:
1. **Geschäftsjahr** (Zeitraum des Jahresabschlusses)
2. **Bilanzsumme**
3. **Eigenkapital**
4. **Jahresüberschuss / Jahresfehlbetrag**
5. **Umsatzerlöse** (falls im Jahresabschluss veröffentlicht)
6. **Art des Abschlusses** (Einzelabschluss, Konzernabschluss, etc.)

BESONDERS WICHTIG — Forschung und Entwicklung:
Falls im Jahresabschluss Angaben zu **Forschung und Entwicklung (F&E)** enthalten sind (z.B. F&E-Aufwendungen, aktivierte Entwicklungskosten, F&E-Quote, Beschreibung von F&E-Aktivitäten), hebe diese Informationen **besonders hervor** in einem eigenen Abschnitt mit der Überschrift "## Forschung & Entwicklung". Dies ist für die Bewertung der Forschungszulage (FZulG) besonders relevant.

Wichtig: Verwende ausschließlich Daten aus dem Bundesanzeiger. Keine Schätzungen oder Daten aus anderen Quellen. Falls kein Jahresabschluss im Bundesanzeiger veröffentlicht ist, sage das klar. Antworte auf Deutsch.${scrapeContext}`;

      const response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'Du bist ein Experte für den Bundesanzeiger (bundesanzeiger.de). Deine Aufgabe ist es, ausschließlich den veröffentlichten Jahresabschluss einer Firma im Bundesanzeiger zu finden und die dort enthaltenen Finanzdaten zusammenzufassen. Suche direkt auf bundesanzeiger.de. Verwende keine anderen Quellen.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 2000,
          search_domain_filter: ['bundesanzeiger.de'],
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

      const data = {
        companyName,
        found: !notFound,
        content: !notFound ? content : null,
        message: notFound
          ? `Kein Jahresabschluss für "${companyName}" im Bundesanzeiger gefunden. Bitte prüfen Sie die Schreibweise oder suchen Sie direkt im Bundesanzeiger.`
          : undefined,
        citations,
        results: !notFound
          ? [{ title: `Jahresabschluss — ${companyName}`, date: 'Via KI-Recherche', link: searchUrl }]
          : [],
        searchUrl,
        fetchedAt: new Date().toISOString(),
      };

      // Only cache positive results — negative results should allow immediate retry
      if (!notFound) {
        cache.set(cacheKey, { data, timestamp: Date.now() });
      }
      return data;
    } catch (err) {
      console.error(`[Bundesanzeiger] Perplexity error for "${companyName}":`, err.message);
    }
  }

  // Fallback: return direct link for manual search
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
