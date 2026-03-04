import { useState, useEffect } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import api from '../services/api';

const STAGES = [
  { value: 'FIRMA_IDENTIFIZIERT', label: 'Identifiziert' },
  { value: 'FIRMA_KONTAKTIERT', label: 'Kontaktiert' },
  { value: 'VERHANDLUNG', label: 'Verhandlung' },
  { value: 'CLOSED_WON', label: 'Gewonnen' },
  { value: 'CLOSED_LOST', label: 'Verloren' },
];

export default function FilterPanel({ filters, onFiltersChange, expanded, onToggle }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get('/auth/users')
      .then(({ data }) => setUsers(data))
      .catch(() => {});
  }, []);

  const activeCount = [
    filters.stages?.length > 0,
    filters.assignedToId,
    filters.city,
    filters.dateFrom || filters.dateTo,
    filters.uisOnly,
  ].filter(Boolean).length;

  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAll = () => {
    onFiltersChange({ stages: [], assignedToId: '', city: '', dateFrom: '', dateTo: '', uisOnly: false });
  };

  return (
    <div>
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-body font-medium transition-colors
          focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300
          ${expanded || activeCount > 0
            ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
            : 'bg-surface-elevated dark:bg-dark-elevated text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary'
          }`}
      >
        <Filter className="w-4 h-4" />
        Filter
        {activeCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-3 p-4 bg-surface-raised dark:bg-dark-raised rounded-xl border border-border dark:border-dark-border space-y-4"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-body font-semibold uppercase text-text-secondary dark:text-dark-text-secondary tracking-wider">
              Erweiterte Filter
            </span>
            {activeCount > 0 && (
              <button onClick={clearAll} className="text-xs text-brand-500 hover:text-brand-600 font-body font-medium">
                Alle zurücksetzen
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Stage multi-select */}
            <div>
              <label className="text-[11px] font-body font-medium text-text-secondary dark:text-dark-text-secondary block mb-1">
                Pipeline-Stufe
              </label>
              <div className="space-y-1">
                {STAGES.map((s) => (
                  <label key={s.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.stages?.includes(s.value) || false}
                      onChange={(e) => {
                        const newStages = e.target.checked
                          ? [...(filters.stages || []), s.value]
                          : (filters.stages || []).filter((v) => v !== s.value);
                        updateFilter('stages', newStages);
                      }}
                      className="rounded border-border dark:border-dark-border text-brand-500 focus:ring-brand-300 w-3.5 h-3.5"
                    />
                    <span className="text-xs font-body text-text-primary dark:text-dark-text-primary">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Assigned user */}
            <div>
              <label className="text-[11px] font-body font-medium text-text-secondary dark:text-dark-text-secondary block mb-1">
                Zugewiesen an
              </label>
              <select
                value={filters.assignedToId || ''}
                onChange={(e) => updateFilter('assignedToId', e.target.value)}
                className="w-full text-xs font-body bg-surface-elevated dark:bg-dark-elevated border border-border dark:border-dark-border rounded-lg px-2.5 py-1.5
                  text-text-primary dark:text-dark-text-primary focus:ring-2 focus:ring-brand-300 focus:border-brand-300"
              >
                <option value="">Alle</option>
                <option value="UNASSIGNED">Nicht zugewiesen</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* City */}
            <div>
              <label className="text-[11px] font-body font-medium text-text-secondary dark:text-dark-text-secondary block mb-1">
                Stadt
              </label>
              <input
                type="text"
                value={filters.city || ''}
                onChange={(e) => updateFilter('city', e.target.value)}
                placeholder="z.B. München"
                className="w-full text-xs font-body bg-surface-elevated dark:bg-dark-elevated border border-border dark:border-dark-border rounded-lg px-2.5 py-1.5
                  text-text-primary dark:text-dark-text-primary placeholder:text-text-tertiary dark:placeholder:text-dark-text-tertiary
                  focus:ring-2 focus:ring-brand-300 focus:border-brand-300"
              />
            </div>

            {/* UiS toggle */}
            <div>
              <label className="text-[11px] font-body font-medium text-text-secondary dark:text-dark-text-secondary block mb-1">
                Status
              </label>
              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={filters.uisOnly || false}
                  onChange={(e) => updateFilter('uisOnly', e.target.checked)}
                  className="rounded border-border dark:border-dark-border text-brand-500 focus:ring-brand-300 w-3.5 h-3.5"
                />
                <span className="text-xs font-body text-text-primary dark:text-dark-text-primary">
                  Nur UiS-Firmen
                </span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
