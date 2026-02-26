import { useState, useEffect } from 'react';
import api from '../services/api';
import { Save, X, Plus } from 'lucide-react';

export default function TaskForm({ initial, defaultCompanyId, defaultContactId, onSaved, onCancel }) {
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    dueDate: initial?.dueDate ? initial.dueDate.slice(0, 10) : '',
    companyId: initial?.companyId || defaultCompanyId || '',
    contactId: initial?.contactId || defaultContactId || '',
    assignedToId: initial?.assignedToId || '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Inline create states
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', website: '' });
  const [creatingContact, setCreatingContact] = useState(false);
  const [newContact, setNewContact] = useState({ firstName: '', lastName: '' });

  useEffect(() => {
    if (!defaultCompanyId) {
      api.get('/companies').then(({ data }) => setCompanies(data)).catch(() => {});
    }
    api.get('/auth/users').then(({ data }) => setUsers(data)).catch(() => {});
  }, [defaultCompanyId]);

  useEffect(() => {
    const cid = form.companyId || defaultCompanyId;
    if (!cid) { setContacts([]); return; }
    setLoadingContacts(true);
    api.get(`/contacts?companyId=${cid}`)
      .then(({ data }) => setContacts(data))
      .catch(() => setContacts([]))
      .finally(() => setLoadingContacts(false));
  }, [form.companyId, defaultCompanyId]);

  function handleCompanyChange(e) {
    const val = e.target.value;
    if (val === '__NEW__') {
      setCreatingCompany(true);
      setNewCompany({ name: '', website: '' });
    } else {
      setCreatingCompany(false);
      setForm({ ...form, companyId: val, contactId: '' });
    }
  }

  function handleContactChange(e) {
    const val = e.target.value;
    if (val === '__NEW__') {
      setCreatingContact(true);
      setNewContact({ firstName: '', lastName: '' });
    } else {
      setCreatingContact(false);
      setForm({ ...form, contactId: val });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      let companyId = form.companyId || defaultCompanyId || null;
      let contactId = form.contactId || defaultContactId || null;

      // Create company inline if needed
      if (creatingCompany && newCompany.name.trim()) {
        const { data } = await api.post('/companies', {
          name: newCompany.name.trim(),
          website: newCompany.website.trim() || null,
        });
        companyId = data.id;
        setCompanies((prev) => [data, ...prev]);
        setCreatingCompany(false);
      }

      // Create contact inline if needed
      if (creatingContact && newContact.firstName.trim() && newContact.lastName.trim() && companyId) {
        const { data } = await api.post('/contacts', {
          firstName: newContact.firstName.trim(),
          lastName: newContact.lastName.trim(),
          companyId,
        });
        contactId = data.id;
        setContacts((prev) => [data, ...prev]);
        setCreatingContact(false);
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        dueDate: form.dueDate || null,
        companyId,
        contactId,
        assignedToId: form.assignedToId || null,
      };
      const { data } = initial
        ? await api.put(`/tasks/${initial.id}`, payload)
        : await api.post('/tasks', payload);
      onSaved(data);
    } catch (err) {
      alert(err.response?.data?.error || 'Fehler beim Speichern.');
    } finally {
      setSubmitting(false);
    }
  }

  const activeCompanyId = form.companyId || defaultCompanyId;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-50 rounded-xl p-5 mb-5 border border-gray-200"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
    >
      <h4 className="text-sm font-display font-bold text-gray-800 mb-3 tracking-display">
        {initial ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}
      </h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider font-body">Titel *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input-field text-sm"
            required
            autoFocus
            placeholder="z.B. Angebot nachfassen"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider font-body">Beschreibung</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-field text-sm"
            rows={2}
            placeholder="Optionale Details..."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider font-body">Fälligkeitsdatum</label>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="input-field text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider font-body">Zugewiesen an</label>
          <select
            value={form.assignedToId}
            onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
            className="input-field text-sm"
          >
            <option value="">— Nicht zugewiesen —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Company picker with inline create */}
        {!defaultCompanyId && (
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider font-body">Firma</label>
            {!creatingCompany ? (
              <select
                value={form.companyId}
                onChange={handleCompanyChange}
                className="input-field text-sm"
              >
                <option value="">— Keine Firma —</option>
                <option value="__NEW__">+ Neue Firma erstellen</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <div
                className="rounded-lg border border-brand-200 bg-brand-50/30 p-3 space-y-2"
                style={{ boxShadow: 'inset 0 1px 2px rgba(13,115,119,0.06)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Plus className="w-3.5 h-3.5 text-brand-500" />
                  <span className="text-[12px] font-display font-bold text-brand-700">Neue Firma</span>
                </div>
                <input
                  type="text"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  className="input-field text-sm"
                  placeholder="Firmenname *"
                  autoFocus
                />
                <input
                  type="text"
                  value={newCompany.website}
                  onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                  className="input-field text-sm"
                  placeholder="Website (optional)"
                />
                <button
                  type="button"
                  onClick={() => { setCreatingCompany(false); setForm({ ...form, companyId: '' }); }}
                  className="text-[11px] text-gray-500 hover:text-gray-700 font-body"
                  style={{ transition: 'color 150ms ease' }}
                >
                  Abbrechen — bestehende Firma wählen
                </button>
              </div>
            )}
          </div>
        )}

        {/* Contact picker with inline create */}
        {!defaultContactId && (activeCompanyId || creatingCompany) && (
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider font-body">Kontakt</label>
            {!creatingContact ? (
              <select
                value={form.contactId}
                onChange={handleContactChange}
                className="input-field text-sm"
                disabled={loadingContacts || creatingCompany}
              >
                <option value="">— Kein Kontakt —</option>
                <option value="__NEW__">+ Neuen Kontakt erstellen</option>
                {contacts.map((ct) => (
                  <option key={ct.id} value={ct.id}>{ct.firstName} {ct.lastName}</option>
                ))}
              </select>
            ) : (
              <div
                className="rounded-lg border border-brand-200 bg-brand-50/30 p-3 space-y-2"
                style={{ boxShadow: 'inset 0 1px 2px rgba(13,115,119,0.06)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Plus className="w-3.5 h-3.5 text-brand-500" />
                  <span className="text-[12px] font-display font-bold text-brand-700">Neuer Kontakt</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newContact.firstName}
                    onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                    className="input-field text-sm"
                    placeholder="Vorname *"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={newContact.lastName}
                    onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                    className="input-field text-sm"
                    placeholder="Nachname *"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setCreatingContact(false); setForm({ ...form, contactId: '' }); }}
                  className="text-[11px] text-gray-500 hover:text-gray-700 font-body"
                  style={{ transition: 'color 150ms ease' }}
                >
                  Abbrechen — bestehenden Kontakt wählen
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button type="submit" disabled={submitting} className="btn-primary text-sm flex items-center gap-1.5">
          <Save className="w-3.5 h-3.5" />
          {submitting ? 'Speichern...' : initial ? 'Speichern' : 'Hinzufügen'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-sm flex items-center gap-1.5">
          <X className="w-3.5 h-3.5" />
          Abbrechen
        </button>
      </div>
    </form>
  );
}
