import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import api from '../services/api';

const PRIORITY_STYLES = {
  high: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30',
  medium: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30',
  low: 'bg-brand-50 dark:bg-brand-900/10 border-brand-200 dark:border-brand-800/30',
};

export default function NextActionBanner({ companyId }) {
  const [suggestion, setSuggestion] = useState(null);

  useEffect(() => {
    if (!companyId) return;
    api.get(`/companies/${companyId}/next-action`)
      .then(({ data }) => setSuggestion(data))
      .catch(() => {});
  }, [companyId]);

  if (!suggestion || suggestion.action === 'Keine Aktion nötig') return null;

  const styles = PRIORITY_STYLES[suggestion.priority] || PRIORITY_STYLES.low;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${styles} mb-4`}>
      <div className="shrink-0">
        <Sparkles className="w-4 h-4 text-brand-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-display font-semibold text-text-primary dark:text-dark-text-primary">
          {suggestion.action}
        </p>
        <p className="text-xs font-body text-text-secondary dark:text-dark-text-secondary mt-0.5">
          {suggestion.reason}
        </p>
      </div>
    </div>
  );
}
