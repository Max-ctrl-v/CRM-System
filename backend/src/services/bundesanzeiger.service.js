const axios = require('axios');
const { PERPLEXITY_API_KEY } = require('../config/env');

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function searchJahresabschluss(companyName) {
  const cached = cache.get(companyName.toLowerCase());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const searchUrl = `https://www.bundesanzeiger.de/pub/de/suchergebnis?words=${encodeURIComponent(companyName)}&area=Rechnungslegung%2FFinanzberichte`;

  // Use Perplexity to fetch Jahresabschluss data (Bundesanzeiger blocks direct scraping)
  if (PERPLEXITY_API_KEY) {
    try {
      const prompt = `Suche den neuesten Jahresabschluss der Firma "${companyName}" im Bundesanzeiger (bundesanzeiger.de).

Liefere folgende Informationen falls verfügbar:
1. **Datum des letzten Jahresabschlusses** (Geschäftsjahr)
2. **Umsatzerlöse**
3. **Bilanzsumme**
4. **Jahresüberschuss / Jahresfehlbetrag**
5. **Eigenkapital**
6. **Mitarbeiterzahl**
7. **Art des Abschlusses** (z.B. Einzelabschluss, Konzernabschluss)

Falls keine Daten im Bundesanzeiger verfügbar sind, sage das klar. Antworte auf Deutsch.`;

      const response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: 'sonar',
          messages: [
            { role: 'system', content: 'Du bist ein Experte für deutsche Unternehmensfinanzberichte und den Bundesanzeiger.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 1500,
        },
        {
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const content = response.data.choices[0].message.content;
      const citations = response.data.citations || [];

      const data = {
        companyName,
        found: true,
        content,
        citations,
        results: [{
          title: `Jahresabschluss — ${companyName}`,
          date: 'Via KI-Recherche',
          link: searchUrl,
        }],
        searchUrl,
        fetchedAt: new Date().toISOString(),
      };

      cache.set(companyName.toLowerCase(), { data, timestamp: Date.now() });
      return data;
    } catch (err) {
      // Fall through to fallback
    }
  }

  // Fallback: just return direct link
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
