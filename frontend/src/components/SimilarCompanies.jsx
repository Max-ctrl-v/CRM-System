import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, TrendingUp, Sparkles, Globe, Loader2 } from 'lucide-react';
import api from '../services/api';

const STAGE_LABELS = {
  FIRMA_IDENTIFIZIERT: 'Identifiziert',
  FIRMA_KONTAKTIERT: 'Kontaktiert',
  VERHANDLUNG: 'Verhandlung',
  CLOSED_WON: 'Gewonnen',
};

export default function SimilarCompanies({ companyId }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiResults, setAiResults] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiRequested, setAiRequested] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    api.get(`/companies/${companyId}/similar`)
      .then(({ data }) => setCompanies(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId]);

  async function requestAiSuggestions() {
    setAiLoading(true);
    setAiError('');
    setAiRequested(true);
    try {
      const { data } = await api.post('/perplexity/similar-companies', { companyId });
      setAiResults(data);
    } catch (err) {
      setAiError(err.response?.data?.error || 'KI-Recherche fehlgeschlagen.');
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-16 bg-surface-elevated dark:bg-dark-elevated rounded-xl" />)}
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Existing DB-based similar companies */}
      {companies.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider font-body mb-3">
            Ähnliche Firmen in der Pipeline
          </h4>
          <div className="space-y-2">
            {companies.map((c) => (
              <Link
                key={c.id}
                to={`/company/${c.id}`}
                className="flex items-center gap-3 px-4 py-3 bg-surface-elevated dark:bg-dark-elevated rounded-xl
                  hover:bg-surface-base dark:hover:bg-dark-base
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                style={{ transition: 'background-color 150ms ease' }}
              >
                <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display font-semibold text-text-primary dark:text-dark-text-primary truncate">
                    {c.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {c.city && (
                      <span className="flex items-center gap-0.5 text-[11px] text-text-tertiary dark:text-dark-text-tertiary font-body">
                        <MapPin className="w-3 h-3" />
                        {c.city}
                      </span>
                    )}
                    {c.pipelineStage && (
                      <span className="text-[10px] font-body font-medium text-brand-500 bg-brand-50 dark:bg-brand-900/20 px-1.5 py-0.5 rounded">
                        {STAGE_LABELS[c.pipelineStage] || c.pipelineStage}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 shrink-0">
                  {c.reasons?.map((r, i) => (
                    <span key={i} className="text-[9px] font-body font-medium bg-surface-base dark:bg-dark-base text-text-secondary dark:text-dark-text-secondary px-1.5 py-0.5 rounded">
                      {r}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {companies.length === 0 && !aiRequested && (
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary text-center py-4 font-body">
          Keine ähnlichen Firmen in der Pipeline gefunden.
        </p>
      )}

      {/* AI-powered suggestions */}
      <div className="border-t border-border dark:border-dark-border pt-4">
        {!aiRequested ? (
          <button
            onClick={requestAiSuggestions}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-display font-semibold
              bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/15 dark:to-orange-900/15
              text-amber-700 dark:text-amber-400
              border border-amber-200 dark:border-amber-800/30
              hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/25 dark:hover:to-orange-900/25
              focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
              active:scale-[0.98]"
            style={{ transition: 'transform 150ms ease, background 150ms ease' }}
          >
            <Sparkles className="w-4 h-4" />
            KI-Empfehlungen anfordern
          </button>
        ) : aiLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-amber-600 dark:text-amber-400 font-body">
            <Loader2 className="w-4 h-4 animate-spin" />
            KI sucht ähnliche Firmen...
          </div>
        ) : aiError ? (
          <div className="text-center py-4">
            <p className="text-sm text-red-500 font-body mb-2">{aiError}</p>
            <button
              onClick={requestAiSuggestions}
              className="text-xs text-brand-500 hover:text-brand-700 font-semibold font-body"
              style={{ transition: 'color 150ms ease' }}
            >
              Erneut versuchen
            </button>
          </div>
        ) : aiResults.length > 0 ? (
          <div>
            <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-body mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              KI-Empfehlungen
            </h4>
            <div className="space-y-2">
              {aiResults.map((c, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-4 py-3 bg-surface-elevated dark:bg-dark-elevated rounded-xl border border-amber-100 dark:border-amber-900/20"
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display font-semibold text-text-primary dark:text-dark-text-primary truncate">
                      {c.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {c.city && (
                        <span className="flex items-center gap-0.5 text-[11px] text-text-tertiary dark:text-dark-text-tertiary font-body">
                          <MapPin className="w-3 h-3" />
                          {c.city}
                        </span>
                      )}
                      {c.website && (
                        <span className="flex items-center gap-0.5 text-[11px] text-text-tertiary dark:text-dark-text-tertiary font-body">
                          <Globe className="w-3 h-3" />
                          {c.website}
                        </span>
                      )}
                    </div>
                    {c.reason && (
                      <p className="text-[11px] text-text-secondary dark:text-dark-text-secondary font-body mt-1 leading-relaxed">
                        {c.reason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={requestAiSuggestions}
              className="mt-3 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 font-semibold font-body flex items-center gap-1"
              style={{ transition: 'color 150ms ease' }}
            >
              <Sparkles className="w-3 h-3" />
              Erneut suchen
            </button>
          </div>
        ) : (
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary text-center py-4 font-body">
            Keine KI-Empfehlungen gefunden.
          </p>
        )}
      </div>
    </div>
  );
}
