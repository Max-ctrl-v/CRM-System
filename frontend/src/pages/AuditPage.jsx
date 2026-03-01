import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';

const ACTION_LABELS = {
  COMPANY_CREATED: 'Firma erstellt',
  COMPANY_UPDATED: 'Firma bearbeitet',
  STAGE_CHANGE: 'Pipeline geändert',
  COMMENT_ADDED: 'Kommentar hinzugefügt',
  TASK_COMPLETED: 'Aufgabe erledigt',
  CONTACT_ADDED: 'Kontakt hinzugefügt',
  BULK_IMPORT: 'CSV-Import',
};

export default function AuditPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', userId: '' });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get('/auth/users').then(({ data }) => setUsers(data)).catch(() => {});
  }, []);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (filters.action) params.set('action', filters.action);
      if (filters.userId) params.set('userId', filters.userId);
      const { data } = await api.get(`/audit?${params}`);
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      // 403 expected for non-admins
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary dark:text-dark-text-primary tracking-display">
            Audit Trail
          </h1>
          <p className="text-sm font-body text-text-secondary dark:text-dark-text-secondary mt-1">
            {total} Aktivitäten gesamt
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filters.action}
            onChange={(e) => { setFilters((f) => ({ ...f, action: e.target.value })); setPage(1); }}
            className="text-xs font-body bg-surface-elevated dark:bg-dark-elevated border border-border dark:border-dark-border rounded-lg px-3 py-1.5
              text-text-primary dark:text-dark-text-primary focus:ring-2 focus:ring-brand-300"
          >
            <option value="">Alle Aktionen</option>
            {Object.entries(ACTION_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <select
            value={filters.userId}
            onChange={(e) => { setFilters((f) => ({ ...f, userId: e.target.value })); setPage(1); }}
            className="text-xs font-body bg-surface-elevated dark:bg-dark-elevated border border-border dark:border-dark-border rounded-lg px-3 py-1.5
              text-text-primary dark:text-dark-text-primary focus:ring-2 focus:ring-brand-300"
          >
            <option value="">Alle Benutzer</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-raised dark:bg-dark-raised rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)' }}
      >
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="border-b border-border dark:border-dark-border">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-text-secondary dark:text-dark-text-secondary tracking-wider">Zeitpunkt</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-text-secondary dark:text-dark-text-secondary tracking-wider">Benutzer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-text-secondary dark:text-dark-text-secondary tracking-wider">Aktion</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-text-secondary dark:text-dark-text-secondary tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50 dark:border-dark-border/50">
                  <td colSpan={4} className="px-4 py-3"><div className="h-4 bg-surface-elevated dark:bg-dark-elevated rounded animate-pulse" /></td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-text-secondary dark:text-dark-text-secondary">
                  Keine Aktivitäten gefunden.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-border/50 dark:border-dark-border/50 hover:bg-surface-elevated/50 dark:hover:bg-dark-elevated/50">
                  <td className="px-4 py-3 text-xs text-text-secondary dark:text-dark-text-secondary whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleString('de-DE', {
                      day: '2-digit', month: '2-digit', year: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                      {item.user?.name || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-semibold uppercase bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded">
                      {ACTION_LABELS[item.action] || item.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary dark:text-dark-text-secondary">
                    {item.metadata && typeof item.metadata === 'object'
                      ? Object.entries(item.metadata).map(([k, v]) => `${k}: ${v}`).join(', ')
                      : '—'
                    }
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg text-text-secondary dark:text-dark-text-secondary hover:bg-surface-elevated dark:hover:bg-dark-elevated disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-body text-text-secondary dark:text-dark-text-secondary">
            Seite {page} von {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg text-text-secondary dark:text-dark-text-secondary hover:bg-surface-elevated dark:hover:bg-dark-elevated disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
