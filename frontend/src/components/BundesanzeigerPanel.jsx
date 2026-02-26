import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';
import {
  FileText,
  Loader2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Search,
  Sparkles,
  Send,
} from 'lucide-react';

export default function BundesanzeigerPanel({ companyName }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Free search state
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  async function handleSearch() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/bundesanzeiger/${encodeURIComponent(companyName)}`);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Abrufen.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFreeSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchLoading(true);
    setSearchError('');
    try {
      const { data } = await api.post('/perplexity/free-search', { query: query.trim() });
      setSearchResult(data);
    } catch (err) {
      setSearchError(err.response?.data?.error || 'Fehler bei der Suche.');
    } finally {
      setSearchLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Auto Jahresabschluss Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-gray-900 tracking-display">Jahresabschluss</h3>
            <p className="text-sm text-gray-500 mt-0.5 font-body">
              Finanzberichte via KI-Recherche (Bundesanzeiger)
            </p>
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Suche läuft...
              </>
            ) : result ? (
              <>
                <RefreshCw className="w-4 h-4" />
                Erneut suchen
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Jahresabschluss suchen
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-body mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {loading && !result && (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto mb-3" />
            <p className="text-sm text-brand-700 font-body">
              Suche nach Jahresabschlüssen für <strong>{companyName}</strong>...
            </p>
          </div>
        )}

        {result && (
          <div>
            {result.found && result.content ? (
              <div className="space-y-4">
                <div
                  className="bg-white border border-gray-200 rounded-xl p-5"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-body">
                      KI-Recherche
                    </span>
                    {result.fetchedAt && (
                      <span className="text-xs text-gray-400 ml-auto font-body">
                        {new Date(result.fetchedAt).toLocaleString('de-DE')}
                      </span>
                    )}
                  </div>
                  <div className="prose prose-sm max-w-none text-gray-700
                    prose-headings:text-gray-900 prose-headings:font-display prose-headings:font-bold
                    prose-strong:text-gray-900 prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
                    <ReactMarkdown>{result.content}</ReactMarkdown>
                  </div>
                </div>

                {result.citations && result.citations.length > 0 && (
                  <div
                    className="bg-white border border-gray-200 rounded-xl p-4"
                    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
                  >
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 font-body">Quellen</p>
                    <div className="space-y-1.5">
                      {result.citations.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600 truncate font-body focus-visible:ring-2 focus-visible:ring-brand-300 rounded"
                          style={{ transition: 'color 150ms ease' }}
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          {url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
              >
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600 font-body">
                  {result.message || `Keine Jahresabschlüsse für "${companyName}" gefunden.`}
                </p>
              </div>
            )}

            {result.searchUrl && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <a
                  href={result.searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-600 font-body focus-visible:ring-2 focus-visible:ring-brand-300 rounded"
                  style={{ transition: 'color 150ms ease' }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Direkt im Bundesanzeiger suchen
                </a>
              </div>
            )}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-body">
              Klicken Sie auf "Jahresabschluss suchen", um die neuesten
              Finanzberichte von <strong>{companyName}</strong> abzurufen.
            </p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Free Search Section */}
      <div>
        <div className="mb-3">
          <h3 className="font-display font-bold text-gray-900 flex items-center gap-2 tracking-display">
            <Search className="w-4 h-4 text-brand-500" />
            Eigene Perplexity-Suche
          </h3>
          <p className="text-sm text-gray-500 mt-0.5 font-body">
            Stellen Sie eine beliebige Frage zu Finanzdaten — Perplexity AI recherchiert für Sie
          </p>
        </div>

        <form onSubmit={handleFreeSearch} className="flex gap-2 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`z.B. "Umsatz von ${companyName} in den letzten 3 Jahren" ...`}
            className="input-field flex-1 text-sm"
          />
          <button
            type="submit"
            disabled={searchLoading || !query.trim()}
            className="btn-primary flex items-center gap-1.5 shrink-0"
          >
            {searchLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Suchen
          </button>
        </form>

        {searchError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-body mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {searchError}
          </div>
        )}

        {searchLoading && !searchResult && (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto mb-3" />
            <p className="text-sm text-brand-700 font-body">Perplexity AI sucht...</p>
          </div>
        )}

        {searchResult && (
          <div
            className="bg-white border border-gray-200 rounded-xl p-5"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-body">
                KI-Antwort
              </span>
            </div>
            <div className="prose prose-sm max-w-none text-gray-700
              prose-headings:text-gray-900 prose-headings:font-display prose-headings:font-bold
              prose-strong:text-gray-900 prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
              <ReactMarkdown>{searchResult.content}</ReactMarkdown>
            </div>

            {searchResult.citations && searchResult.citations.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 font-body">Quellen</p>
                <div className="space-y-1">
                  {searchResult.citations.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600 truncate font-body focus-visible:ring-2 focus-visible:ring-brand-300 rounded"
                      style={{ transition: 'color 150ms ease' }}
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      {url}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
