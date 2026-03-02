import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../services/api';
import {
  FileText,
  Loader2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';

export default function BundesanzeigerPanel({ companyName }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch() {
    setLoading(true);
    setError('');
    try {
      // Pass refresh=true on re-search to bypass backend cache
      const refresh = result ? '?refresh=true' : '';
      const { data } = await api.get(`/bundesanzeiger/${encodeURIComponent(companyName)}${refresh}`);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Abrufen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Jahresabschluss Section */}
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
                    <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]}>{result.content}</ReactMarkdown>
                  </div>
                </div>

                {result.citations && result.citations.length > 0 && (
                  <div
                    className="bg-white border border-gray-200 rounded-xl p-4"
                    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
                  >
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 font-body">Quellen</p>
                    <div className="space-y-1.5">
                      {result.citations.map((url, i) => {
                        let safeUrl = '#';
                        try { safeUrl = ['http:', 'https:'].includes(new URL(url).protocol) ? url : '#'; } catch {}
                        return (
                        <a
                          key={i}
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600 truncate font-body focus-visible:ring-2 focus-visible:ring-brand-300 rounded"
                          style={{ transition: 'color 150ms ease' }}
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          {url}
                        </a>
                        );
                      })}
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

    </div>
  );
}
