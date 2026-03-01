import { useState, useEffect, useRef } from 'react';
import { Bookmark, Plus, Trash2, ChevronDown } from 'lucide-react';
import api from '../services/api';

export default function SavedViewSelector({ currentFilters, onLoadView }) {
  const [views, setViews] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    api.get('/saved-views')
      .then(({ data }) => setViews(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const saveView = async () => {
    if (!newName.trim()) return;
    try {
      const { data } = await api.post('/saved-views', {
        name: newName.trim(),
        filters: currentFilters,
      });
      setViews((prev) => [data, ...prev]);
      setNewName('');
      setSaving(false);
    } catch {}
  };

  const deleteView = async (id) => {
    try {
      await api.delete(`/saved-views/${id}`);
      setViews((prev) => prev.filter((v) => v.id !== id));
    } catch {}
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-body font-medium
          bg-surface-elevated dark:bg-dark-elevated text-text-secondary dark:text-dark-text-secondary
          hover:text-text-primary dark:hover:text-dark-text-primary transition-colors
          focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <Bookmark className="w-4 h-4" />
        Ansichten
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-surface-raised dark:bg-dark-raised rounded-xl overflow-hidden z-40"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)' }}
        >
          {/* Save new */}
          <div className="p-3 border-b border-border dark:border-dark-border">
            {saving ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveView()}
                  placeholder="Name der Ansicht"
                  autoFocus
                  className="flex-1 text-xs font-body bg-surface-elevated dark:bg-dark-elevated border border-border dark:border-dark-border rounded-lg px-2.5 py-1.5
                    text-text-primary dark:text-dark-text-primary focus:ring-2 focus:ring-brand-300 focus:border-brand-300"
                />
                <button onClick={saveView} className="text-xs text-brand-500 font-body font-semibold">
                  OK
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSaving(true)}
                className="flex items-center gap-2 text-xs font-body font-medium text-brand-500 hover:text-brand-600"
              >
                <Plus className="w-3.5 h-3.5" />
                Aktuelle Filter speichern
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-48 overflow-y-auto">
            {views.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-text-secondary dark:text-dark-text-secondary font-body">
                Keine gespeicherten Ansichten
              </div>
            ) : (
              views.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-surface-elevated dark:hover:bg-dark-elevated"
                >
                  <button
                    onClick={() => { onLoadView(v.filters); setOpen(false); }}
                    className="flex-1 text-left text-xs font-body font-medium text-text-primary dark:text-dark-text-primary truncate"
                  >
                    {v.name}
                  </button>
                  <button
                    onClick={() => deleteView(v.id)}
                    className="p-1 rounded text-text-tertiary dark:text-dark-text-tertiary hover:text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
