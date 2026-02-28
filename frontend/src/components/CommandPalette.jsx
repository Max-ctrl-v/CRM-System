import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { Search, Building2, User, CheckSquare, ArrowRight } from 'lucide-react';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ companies: [], contacts: [], tasks: [] });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { dark } = useTheme();

  // Global Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults({ companies: [], contacts: [], tasks: [] });
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults({ companies: [], contacts: [], tasks: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(data);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Flatten results for keyboard nav
  const allResults = [
    ...results.companies.map((c) => ({ type: 'company', data: c })),
    ...results.contacts.map((c) => ({ type: 'contact', data: c })),
    ...results.tasks.map((t) => ({ type: 'task', data: t })),
  ];

  function handleSelect(item) {
    setOpen(false);
    if (item.type === 'company') navigate(`/company/${item.data.id}`);
    else if (item.type === 'contact') navigate(`/company/${item.data.companyId}`);
    else if (item.type === 'task') {
      if (item.data.companyId) navigate(`/company/${item.data.companyId}`);
      else navigate('/aufgaben');
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(allResults[selectedIndex]);
    }
  }

  if (!open) return null;

  const hasResults = allResults.length > 0;
  let idx = 0;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl w-full max-w-lg border border-border-light overflow-hidden cmd-palette-enter"
        style={{ boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.5), 0 24px 64px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.16), 0 24px 64px rgba(0,0,0,0.12)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-light">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Firma, Kontakt oder Aufgabe suchen..."
            className="flex-1 text-sm font-body text-gray-900 outline-none placeholder:text-gray-400"
            style={{ background: 'transparent' }}
          />
          <kbd className="hidden sm:inline-flex text-[10px] font-mono font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {hasResults && (
          <div className="max-h-80 overflow-y-auto py-2">
            {results.companies.length > 0 && (
              <div>
                <div className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider font-body">Firmen</div>
                {results.companies.map((c) => {
                  const i = idx++;
                  return (
                    <button
                      key={c.id}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${i === selectedIndex ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
                      style={{ transition: 'background-color 100ms ease' }}
                      onClick={() => handleSelect({ type: 'company', data: c })}
                      onMouseEnter={() => setSelectedIndex(i)}
                    >
                      <Building2 className="w-4 h-4 text-brand-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-gray-900 font-body truncate block">{c.name}</span>
                        {c.website && <span className="text-[11px] text-gray-400 font-body truncate block">{c.website}</span>}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}

            {results.contacts.length > 0 && (
              <div>
                <div className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider font-body">Kontakte</div>
                {results.contacts.map((c) => {
                  const i = idx++;
                  return (
                    <button
                      key={c.id}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${i === selectedIndex ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
                      style={{ transition: 'background-color 100ms ease' }}
                      onClick={() => handleSelect({ type: 'contact', data: c })}
                      onMouseEnter={() => setSelectedIndex(i)}
                    >
                      <User className="w-4 h-4 text-purple-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-gray-900 font-body truncate block">{c.firstName} {c.lastName}</span>
                        <span className="text-[11px] text-gray-400 font-body truncate block">{c.company?.name || c.email}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}

            {results.tasks.length > 0 && (
              <div>
                <div className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider font-body">Aufgaben</div>
                {results.tasks.map((t) => {
                  const i = idx++;
                  return (
                    <button
                      key={t.id}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${i === selectedIndex ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
                      style={{ transition: 'background-color 100ms ease' }}
                      onClick={() => handleSelect({ type: 'task', data: t })}
                      onMouseEnter={() => setSelectedIndex(i)}
                    >
                      <CheckSquare className={`w-4 h-4 shrink-0 ${t.done ? 'text-gray-400' : 'text-green-500'}`} />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-semibold font-body truncate block ${t.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{t.title}</span>
                        {t.company?.name && <span className="text-[11px] text-gray-400 font-body truncate block">{t.company.name}</span>}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty / Loading state */}
        {query.length >= 2 && !hasResults && !loading && (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-400 font-body">Keine Ergebnisse für &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {loading && (
          <div className="py-6 text-center">
            <div className="inline-flex items-center gap-2 text-gray-400 text-sm font-body">
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-brand-400 border-t-transparent" />
              Suche...
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border-light bg-gray-50/60">
          <span className="text-[10px] text-gray-400 font-body flex items-center gap-1">
            <kbd className="font-mono font-semibold bg-white px-1 py-0.5 rounded border border-gray-200 text-[9px]">&uarr;&darr;</kbd> Navigieren
          </span>
          <span className="text-[10px] text-gray-400 font-body flex items-center gap-1">
            <kbd className="font-mono font-semibold bg-white px-1 py-0.5 rounded border border-gray-200 text-[9px]">&crarr;</kbd> Öffnen
          </span>
          <span className="text-[10px] text-gray-400 font-body flex items-center gap-1">
            <kbd className="font-mono font-semibold bg-white px-1 py-0.5 rounded border border-gray-200 text-[9px]">ESC</kbd> Schließen
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
