import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { X, Building2, Sparkles, UserPlus, Trash2 } from 'lucide-react';

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
  const { dark } = useTheme();
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [city, setCity] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [pipelineStage, setPipelineStage] = useState(showPipelineOption ? '' : 'FIRMA_IDENTIFIZIERT');
  const [users, setUsers] = useState([]);
  const [adminPipeline, setAdminPipeline] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addContact() {
    setContacts((prev) => [...prev, { firstName: '', lastName: '', email: '', phone: '', position: '' }]);
  }

  function updateContact(index, field, value) {
    setContacts((prev) => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  }

  function removeContact(index) {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  useEffect(() => {
    api.get('/auth/users').then(({ data }) => {
      setUsers(data);
      if (user?.id) setAssignedToId(user.id);
    }).catch(() => {});
  }, [user?.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const validContacts = contacts.filter((c) => c.firstName.trim() && c.lastName.trim());
      const { data } = await api.post('/companies', {
        name: name.trim(),
        website: website.trim() || null,
        city: city.trim() || null,
        assignedToId: assignedToId || null,
        pipelineStage: pipelineStage || null,
        adminPipeline,
        contacts: validContacts.length > 0 ? validContacts : undefined,
      });
      // Close modal immediately — run background tasks after
      onCreated(data);
      // Fire Perplexity research + UiS check in background (non-blocking)
      if (website.trim()) {
        api.post('/perplexity/research', { companyId: data.id, companyName: data.name, website: website.trim() }).catch(() => {});
      }
      api.post('/perplexity/check-uis', {
        companyId: data.id,
        companyName: data.name,
        website: website.trim() || null,
      }).catch(() => {});
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg mx-4 p-7 border border-border-light max-h-[90vh] flex flex-col"
        style={{ boxShadow: dark ? '0 8px 16px rgba(0,0,0,0.4), 0 20px 48px rgba(0,0,0,0.35)' : '0 8px 16px rgba(0,0,0,0.1), 0 20px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.03)' }}
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

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
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

          {user?.role === 'ADMIN' && (
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={adminPipeline} onChange={(e) => setAdminPipeline(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              <span className="text-sm font-semibold text-gray-700 font-body">Admin Pipeline</span>
            </label>
          )}

          {showPipelineOption && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 font-body">Pipeline-Stufe</label>
              <select value={pipelineStage} onChange={(e) => setPipelineStage(e.target.value)} className="input-field">
                {PIPELINE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              {!pipelineStage && <p className="text-xs text-gray-400 mt-1 font-body">Firma wird ohne Pipeline-Zuordnung erstellt</p>}
            </div>
          )}

          {/* Inline Contacts Section */}
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700 font-body">Kontakte</label>
              <button
                type="button"
                onClick={addContact}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 font-body rounded px-2 py-1 hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-300"
                style={{ transition: 'background-color 150ms ease, color 150ms ease' }}
              >
                <UserPlus className="w-3.5 h-3.5" /> Kontakt hinzufügen
              </button>
            </div>
            {contacts.length === 0 && (
              <p className="text-xs text-gray-400 font-body">Optional — Kontakte können auch später hinzugefügt werden.</p>
            )}
            {contacts.map((contact, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-surface-base p-3 mb-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-gray-500 font-body">Kontakt {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeContact(idx)}
                    className="text-gray-400 hover:text-red-500 rounded focus-visible:ring-2 focus-visible:ring-red-300"
                    style={{ transition: 'color 150ms ease' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Vorname *"
                    value={contact.firstName}
                    onChange={(e) => updateContact(idx, 'firstName', e.target.value)}
                    className="input-field text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Nachname *"
                    value={contact.lastName}
                    onChange={(e) => updateContact(idx, 'lastName', e.target.value)}
                    className="input-field text-sm"
                  />
                  <input
                    type="email"
                    placeholder="E-Mail"
                    value={contact.email}
                    onChange={(e) => updateContact(idx, 'email', e.target.value)}
                    className="input-field text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="Telefon"
                    value={contact.phone}
                    onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                    className="input-field text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Position"
                    value={contact.position}
                    onChange={(e) => updateContact(idx, 'position', e.target.value)}
                    className="input-field text-sm col-span-2"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Erstellen...' : 'Erstellen'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
