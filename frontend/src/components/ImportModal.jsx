import { useState, useRef } from 'react';
import { X, Upload, Check, AlertTriangle } from 'lucide-react';
import api from '../services/api';

const STEPS = ['Datei hochladen', 'Spalten zuordnen', 'Prüfen', 'Importieren'];

export default function ImportModal({ onClose, onComplete }) {
  const [step, setStep] = useState(0);
  const [csvData, setCsvData] = useState({ headers: [], rows: [] });
  const [mapping, setMapping] = useState({ name: '', website: '', city: '', revenue: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const parseCSV = (text) => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return;
    const sep = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(sep).map((h) => h.replace(/^"|"$/g, '').trim());
    const rows = lines.slice(1).map((l) => {
      const vals = l.split(sep).map((v) => v.replace(/^"|"$/g, '').trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return obj;
    });
    setCsvData({ headers, rows });

    // Auto-map common names
    const autoMap = {};
    for (const h of headers) {
      const hl = h.toLowerCase();
      if (hl.includes('name') || hl.includes('firma')) autoMap.name = h;
      else if (hl.includes('website') || hl.includes('url')) autoMap.website = h;
      else if (hl.includes('stadt') || hl.includes('city') || hl.includes('ort')) autoMap.city = h;
      else if (hl.includes('umsatz') || hl.includes('revenue')) autoMap.revenue = h;
    }
    setMapping({ name: autoMap.name || headers[0], website: autoMap.website || '', city: autoMap.city || '', revenue: autoMap.revenue || '' });
    setStep(1);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => parseCSV(e.target.result);
    reader.readAsText(file);
  };

  const doImport = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/companies/import', {
        rows: csvData.rows,
        mapping,
      });
      setResult(data);
      setStep(3);
    } catch {
      setResult({ created: 0, errors: [{ row: 0, error: 'Import fehlgeschlagen' }] });
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-raised dark:bg-dark-raised rounded-2xl w-full max-w-lg mx-4 overflow-hidden"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.2), 0 24px 64px rgba(0,0,0,0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-dark-border">
          <h2 className="text-lg font-display font-bold text-text-primary dark:text-dark-text-primary">
            CSV Import
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-secondary dark:text-dark-text-secondary hover:bg-surface-elevated dark:hover:bg-dark-elevated">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="px-6 py-3 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
                ${i <= step ? 'bg-brand-500 text-white' : 'bg-surface-elevated dark:bg-dark-elevated text-text-tertiary dark:text-dark-text-tertiary'}`}>
                {i < step ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className={`text-[11px] font-body ${i === step ? 'text-text-primary dark:text-dark-text-primary font-medium' : 'text-text-tertiary dark:text-dark-text-tertiary'}`}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="w-4 h-px bg-border dark:bg-dark-border" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-4 min-h-[200px]">
          {step === 0 && (
            <div
              className="border-2 border-dashed border-border dark:border-dark-border rounded-xl p-8 text-center cursor-pointer hover:border-brand-300"
              onClick={() => inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
              <Upload className="w-8 h-8 mx-auto text-text-tertiary dark:text-dark-text-tertiary mb-3" />
              <p className="text-sm font-body text-text-secondary dark:text-dark-text-secondary">CSV-Datei auswählen</p>
              <p className="text-xs font-body text-text-tertiary dark:text-dark-text-tertiary mt-1">Komma- oder Semikolon-getrennt</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-body text-text-secondary dark:text-dark-text-secondary">
                {csvData.rows.length} Zeilen erkannt. Ordne die Spalten zu:
              </p>
              {['name', 'website', 'city', 'revenue'].map((field) => (
                <div key={field} className="flex items-center gap-3">
                  <span className="w-28 text-xs font-body font-medium text-text-primary dark:text-dark-text-primary">
                    {field === 'name' ? 'Firmenname *' : field === 'website' ? 'Website' : field === 'city' ? 'Stadt' : 'Umsatz'}
                  </span>
                  <select
                    value={mapping[field]}
                    onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                    className="flex-1 text-xs font-body bg-surface-elevated dark:bg-dark-elevated border border-border dark:border-dark-border rounded-lg px-2.5 py-1.5
                      text-text-primary dark:text-dark-text-primary focus:ring-2 focus:ring-brand-300"
                  >
                    <option value="">— Nicht zuordnen —</option>
                    {csvData.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
              <button
                onClick={() => setStep(2)}
                disabled={!mapping.name}
                className="btn-primary mt-3 w-full py-2 text-sm disabled:opacity-50"
              >
                Weiter
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-body text-text-secondary dark:text-dark-text-secondary">
                Vorschau (erste 5 Zeilen):
              </p>
              <div className="overflow-x-auto rounded-lg border border-border dark:border-dark-border">
                <table className="w-full text-xs font-body">
                  <thead>
                    <tr className="bg-surface-elevated dark:bg-dark-elevated">
                      {Object.entries(mapping).filter(([, v]) => v).map(([field, col]) => (
                        <th key={field} className="px-3 py-2 text-left text-text-secondary dark:text-dark-text-secondary font-semibold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t border-border dark:border-dark-border">
                        {Object.entries(mapping).filter(([, v]) => v).map(([field, col]) => (
                          <td key={field} className="px-3 py-2 text-text-primary dark:text-dark-text-primary">
                            {row[col] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 py-2 text-sm font-body font-medium text-text-secondary dark:text-dark-text-secondary
                  bg-surface-elevated dark:bg-dark-elevated rounded-lg hover:bg-surface-base dark:hover:bg-dark-base">
                  Zurück
                </button>
                <button onClick={doImport} disabled={loading} className="flex-1 btn-primary py-2 text-sm disabled:opacity-50">
                  {loading ? 'Importiere...' : `${csvData.rows.length} Firmen importieren`}
                </button>
              </div>
            </div>
          )}

          {step === 3 && result && (
            <div className="space-y-4 text-center py-4">
              <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
                result.errors.length === 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-amber-50 dark:bg-amber-900/20'
              }`}>
                {result.errors.length === 0 ? (
                  <Check className="w-6 h-6 text-green-500" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                )}
              </div>
              <p className="text-sm font-display font-semibold text-text-primary dark:text-dark-text-primary">
                {result.created} Firmen importiert
              </p>
              {result.errors.length > 0 && (
                <div className="text-left bg-red-50 dark:bg-red-900/10 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs font-body text-red-600 dark:text-red-400">
                      Zeile {e.row}: {e.error}
                    </p>
                  ))}
                </div>
              )}
              <button onClick={() => { onComplete?.(); onClose(); }} className="btn-primary py-2 px-6 text-sm">
                Schließen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
