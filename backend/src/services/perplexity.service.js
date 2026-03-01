const axios = require('axios');
const { PERPLEXITY_API_KEY } = require('../config/env');
const { AppError } = require('../middleware/errorHandler');

async function researchCompany(companyName, website) {
  if (!PERPLEXITY_API_KEY) {
    throw new AppError('Perplexity API-Key nicht konfiguriert.', 500);
  }

  const prompt = `Recherchiere die Firma "${companyName}"${website ? ` (Website: ${website})` : ''} im Kontext des deutschen Forschungszulagengesetzes (FZulG).

Bitte liefere folgende Informationen:

1. **Firmenprofil:** Branche, Größe, Haupttätigkeitsfelder
2. **Forschung & Entwicklung:** Bekannte F&E-Aktivitäten, Innovationsprojekte, Patente
3. **Förderfähigkeit nach FZulG:** Einschätzung, ob die Firma Anspruch auf Forschungszulage haben könnte
4. **Relevante Projekte:** Mögliche förderfähige Vorhaben (Grundlagenforschung, industrielle Forschung, experimentelle Entwicklung)
5. **Branchenspezifische Hinweise:** Besonderheiten der Branche bezüglich Forschungszulage

Antworte auf Deutsch und sei so spezifisch wie möglich.`;

  try {
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'Du bist ein Experte für das deutsche Forschungszulagengesetz (FZulG) und hilfst bei der Bewertung von Unternehmen hinsichtlich ihrer Förderfähigkeit.',
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
        timeout: 30000,
      }
    );

    return {
      content: response.data.choices[0].message.content,
      citations: response.data.citations || [],
    };
  } catch (err) {
    if (err.response?.status === 401) {
      throw new AppError('Perplexity API-Key ungültig.', 401);
    }
    console.error('Perplexity API error:', err.message);
    throw new AppError('Recherche-Dienst vorübergehend nicht verfügbar.', 502);
  }
}

async function researchContact(contactName, position, companyName) {
  if (!PERPLEXITY_API_KEY) {
    throw new AppError('Perplexity API-Key nicht konfiguriert.', 500);
  }

  const prompt = `Recherchiere die Person "${contactName}"${position ? ` (Position: ${position})` : ''} bei der Firma "${companyName}".

Bitte liefere folgende Informationen:

1. **Personenprofil:** Beruflicher Hintergrund, aktuelle Rolle, Verantwortlichkeiten
2. **Kontaktdaten:** Geschäftliche E-Mail-Adresse und Telefonnummer (falls öffentlich auffindbar)
3. **Beruflicher Werdegang:** Vorherige Positionen, Ausbildung, Qualifikationen
4. **LinkedIn / Soziale Medien:** Öffentlich verfügbare Profile
5. **Relevanz für Forschungszulage:** Ist die Person in F&E-Entscheidungen involviert? Ist sie ein relevanter Ansprechpartner für das Thema Forschungszulagengesetz?
6. **Veröffentlichungen / Patente:** Falls vorhanden

Antworte auf Deutsch und sei so spezifisch wie möglich. Falls keine Informationen verfügbar sind, sage das klar.`;

  try {
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'Du bist ein Experte für Geschäftskontakte und Personalrecherche im Kontext des deutschen Forschungszulagengesetzes.',
          },
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

    return {
      content: response.data.choices[0].message.content,
      citations: response.data.citations || [],
    };
  } catch (err) {
    if (err.response?.status === 401) {
      throw new AppError('Perplexity API-Key ungültig.', 401);
    }
    console.error('Perplexity API error:', err.message);
    throw new AppError('Recherche-Dienst vorübergehend nicht verfügbar.', 502);
  }
}

async function freeSearch(query) {
  if (!PERPLEXITY_API_KEY) {
    throw new AppError('Perplexity API-Key nicht konfiguriert.', 500);
  }

  try {
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'Du bist ein hilfreicher Recherche-Assistent. Antworte auf Deutsch, ausführlich und mit Quellenangaben.',
          },
          { role: 'user', content: query },
        ],
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return {
      content: response.data.choices[0].message.content,
      citations: response.data.citations || [],
    };
  } catch (err) {
    if (err.response?.status === 401) {
      throw new AppError('Perplexity API-Key ungültig.', 401);
    }
    console.error('Perplexity API error:', err.message);
    throw new AppError('Recherche-Dienst vorübergehend nicht verfügbar.', 502);
  }
}

async function checkUiS(companyName, website) {
  if (!PERPLEXITY_API_KEY) {
    return { uisSchwierigkeiten: false, uisReason: 'API-Key nicht konfiguriert.', city: null };
  }

  const prompt = `Recherchiere die Firma "${companyName}"${website ? ` (Website: ${website})` : ''} und beantworte zwei Fragen:

1. Ist die Firma ein "Unternehmen in Schwierigkeiten" gemäß §1 Abs. 3 Forschungszulagengesetz (FZulG) i.V.m. Art. 2 Nr. 18 der Allgemeinen Gruppenfreistellungsverordnung (AGVO, EU-Verordnung Nr. 651/2014)?

Ein Unternehmen gilt als "in Schwierigkeiten" wenn MINDESTENS EINES der folgenden Kriterien zutrifft:
a) Bei Gesellschaften mit beschränkter Haftung (GmbH, AG, UG): Mehr als die Hälfte des gezeichneten Stammkapitals/Grundkapitals ist infolge aufgelaufener Verluste verlorengegangen.
b) Bei Personengesellschaften (OHG, KG): Mehr als die Hälfte der in den Geschäftsbüchern ausgewiesenen Eigenmittel ist infolge aufgelaufener Verluste verlorengegangen.
c) Das Unternehmen ist Gegenstand eines Insolvenzverfahrens oder erfüllt die Voraussetzungen für die Eröffnung eines Insolvenzverfahrens auf Antrag seiner Gläubiger.
d) Das Unternehmen hat eine Rettungsbeihilfe erhalten und den Kredit noch nicht zurückgezahlt bzw. die Garantie ist noch nicht erloschen, oder es hat eine Umstrukturierungsbeihilfe erhalten und unterliegt noch einem Umstrukturierungsplan.
e) Bei großen Unternehmen (kein KMU): Buchwert-Verschuldungsgrad > 7,5 UND EBITDA-Zinsdeckungsgrad < 1,0 in den letzten beiden abgeschlossenen Geschäftsjahren.

Prüfe NUR anhand dieser FZulG/AGVO-Kriterien, nicht anhand anderer Definitionen.

2. In welcher deutschen Stadt befindet sich der Hauptsitz der Firma?

Antworte NUR im folgenden JSON-Format (kein anderer Text):
{"isUiS": true oder false, "reason": "Kurze Begründung auf Deutsch mit Bezug auf das konkrete AGVO-Kriterium", "city": "Name der deutschen Stadt des Hauptsitzes oder null falls unbekannt"}`;

  try {
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'sonar',
        messages: [
          { role: 'system', content: 'Du bist ein Experte für das Beihilferecht und das Forschungszulagengesetz. Antworte ausschließlich im angeforderten JSON-Format.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
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
    if (process.env.NODE_ENV !== 'production') console.log('UiS check raw response:', content);
    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        uisSchwierigkeiten: !!parsed.isUiS,
        uisReason: parsed.reason || 'Keine Begründung.',
        city: parsed.city || null,
      };
    }
    return { uisSchwierigkeiten: false, uisReason: 'Konnte nicht automatisch ermittelt werden.', city: null };
  } catch (err) {
    console.error('UiS check error:', err.message);
    return { uisSchwierigkeiten: false, uisReason: 'Prüfung fehlgeschlagen.', city: null };
  }
}

async function findSimilarCompanies(companyName, website, industry, city) {
  if (!PERPLEXITY_API_KEY) {
    throw new AppError('Perplexity API-Key nicht konfiguriert.', 500);
  }

  const prompt = `Ich suche ähnliche Firmen wie "${companyName}"${website ? ` (Website: ${website})` : ''}${city ? ` mit Sitz in/nahe ${city}` : ''}.

Die Firma ist im Bereich Forschungszulage (FZulG) relevant${industry ? ` und ist in der Branche: ${industry}` : ''}.

Bitte nenne mir 5-8 deutsche Firmen, die:
- In einer ähnlichen Branche oder einem ähnlichen Tätigkeitsfeld arbeiten
- Ähnliche Größe oder ähnliches Profil haben
- Potenzial für Forschungszulage nach FZulG haben könnten
- Möglichst in der gleichen Region oder ähnlichen Städten ansässig sind

Antworte NUR im folgenden JSON-Format (kein anderer Text):
[{"name": "Firmenname", "city": "Stadt", "reason": "Kurze Begründung warum ähnlich", "website": "Website falls bekannt oder null"}]`;

  try {
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'sonar',
        messages: [
          { role: 'system', content: 'Du bist ein Experte für deutsche Unternehmen und das Forschungszulagengesetz. Antworte ausschließlich im angeforderten JSON-Format.' },
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
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (err) {
    console.error('Similar companies AI error:', err.message);
    throw new AppError('KI-Recherche vorübergehend nicht verfügbar.', 502);
  }
}

module.exports = { researchCompany, researchContact, freeSearch, checkUiS, findSimilarCompanies };
