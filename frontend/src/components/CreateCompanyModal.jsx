import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Building2, Sparkles } from 'lucide-react';

const PIPELINE_OPTIONS = [
  { value: '', label: '— Keine Pipeline —' },
  { value: 'FIRMA_IDENTIFIZIERT', label: 'Firma Identifiziert' },
  { value: 'FIRMA_KONTAKTIERT', label: 'Firma kontaktiert' },
  { value: 'VERHANDLUNG', label: 'Verhandlung' },
  { value: 'CLOSED_WON', label: 'Closed Won' },
  { value: 'CLOSED_LOST', label: 'Closed Lost' },
];

export default function CreateCompanyModal({ onClose, onCreated, showPipelineOption = false }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [city, setCity] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [pipelineStage, setPipelineStage] = useState(showPipelineOption ? '' : 'FIRMA_IDENTIFIZIERT');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/auth/users').then(({ data }) => {
      setUsers(data);
      if (user?.id) setAssignedToId(user.id);
    }).catch(() => {});
  }, [user?.id]);

  const [uisChecking, setUisChecking] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/companies', {
        name: name.trim(),
        website: website.trim() || null,
        city: city.trim() || null,
        assignedToId: assignedToId || null,
        pipelineStage: pipelineStage || null,
      });
      // Fire Perplexity research in background (no need to wait)
      if (website.trim()) {
        api.post('/perplexity/research', { companyId: data.id, companyName: data.name, website: website.trim() }).catch(() => {});
      }
      // Await UiS check + city detection so result is immediately visible
      setUisChecking(true);
      let updatedCompany = data;
      try {
        const uisRes = await api.post('/perplexity/check-uis', {
          companyId: data.id,
          companyName: data.name,
          website: website.trim() || null,
        });
        updatedCompany = {
          ...data,
          uisSchwierigkeiten: uisRes.data.uisSchwierigkeiten,
          uisReason: uisRes.data.uisReason,
          ...(uisRes.data.city && !data.city ? { city: uisRes.data.city } : {}),
        };
      } catch {}
      onCreated(updatedCompany);
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen.');
    } finally {
      setLoading(false);
      setUisChecking(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md mx-4 p-7 border border-border-light"
        style={{ boxShadow: '0 8px 16px rgba(0,0,0,0.1), 0 20px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.03)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-brand-600" />
            </div>
            <h3 className="text-base font-display font-bold text-gray-900 tracking-display">Neue Firma</h3>
          </div>
          <button onClick={onClose} className="icon-btn text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-body">{error}</div>}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-body">Firmenname *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="z.B. Mustermann GmbH" required autoFocus />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-body">Website</label>
            <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className="input-field" placeholder="z.B. www.mustermann.de" />
            {website.trim() && (
              <p className="flex items-center gap-1 text-xs text-amber-600 mt-1.5 font-body">
                <Sparkles className="w-3 h-3" /> KI-Recherche wird automatisch gestartet
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-body">Stadt</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="input-field" placeholder="z.B. München, Berlin, Hamburg" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-body">Zugewiesen an</label>
            <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} className="input-field">
              <option value="">— Nicht zugewiesen —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          {showPipelineOption && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-body">Pipeline-Stufe</label>
              <select value={pipelineStage} onChange={(e) => setPipelineStage(e.target.value)} className="input-field">
                {PIPELINE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              {!pipelineStage && <p className="text-xs text-gray-400 mt-1 font-body">Firma wird ohne Pipeline-Zuordnung erstellt</p>}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{uisChecking ? 'KI-Prüfung...' : loading ? 'Erstellen...' : 'Erstellen'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
