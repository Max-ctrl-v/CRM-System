import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Bell, AlertCircle, X, ChevronRight } from 'lucide-react';

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export default function OverdueNotification() {
  const navigate = useNavigate();
  const [overdue, setOverdue] = useState([]);
  const [open, setOpen] = useState(false);

  const fetchOverdue = useCallback(async () => {
    try {
      const { data } = await api.get('/tasks/overdue');
      setOverdue(data);
    } catch {
      // silent — notifications are non-critical
    }
  }, []);

  useEffect(() => { fetchOverdue(); }, [fetchOverdue]);

  useEffect(() => {
    const id = setInterval(fetchOverdue, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchOverdue]);

  if (overdue.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10
          focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        title={`${overdue.length} überfällige Aufgabe(n)`}
        style={{ transition: 'background-color 150ms ease, color 150ms ease' }}
      >
        <Bell className="w-4 h-4" />
        <span
          className="absolute -top-0.5 -right-0.5 flex items-center justify-center
            w-4 h-4 rounded-full text-[9px] font-bold text-white"
          style={{ background: '#ef4444' }}
        >
          {overdue.length > 9 ? '9+' : overdue.length}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-border-light z-50 overflow-hidden"
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 8px 32px rgba(0,0,0,0.08)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-[13px] font-display font-bold text-gray-900">
                  Überfällige Aufgaben
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                  {overdue.length}
                </span>
              </div>
              <button onClick={() => setOpen(false)} className="icon-btn text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
              {overdue.map((task) => (
                <button
                  key={task.id}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start gap-2.5 group"
                  style={{ transition: 'background-color 150ms ease' }}
                  onClick={() => {
                    setOpen(false);
                    if (task.company) {
                      navigate(`/company/${task.companyId}`);
                    } else {
                      navigate('/aufgaben');
                    }
                  }}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-semibold text-gray-900 block truncate">{task.title}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.company && (
                        <span className="text-[11px] text-brand-500 truncate">{task.company.name}</span>
                      )}
                      <span className="text-[11px] text-red-500">
                        Fällig: {new Date(task.dueDate).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 shrink-0 mt-0.5" />
                </button>
              ))}
            </div>

            <div className="px-4 py-2.5 border-t border-border-light bg-gray-50">
              <button
                onClick={() => { setOpen(false); navigate('/aufgaben'); }}
                className="text-[12px] font-semibold text-brand-600 hover:text-brand-700 font-body"
                style={{ transition: 'color 150ms ease' }}
              >
                Alle Aufgaben anzeigen →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
