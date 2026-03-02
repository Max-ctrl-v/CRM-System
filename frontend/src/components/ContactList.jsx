import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import CommentSection from './CommentSection';
import {
  UserPlus,
  Phone,
  Mail,
  Briefcase,
  Trash2,
  Edit3,
  Save,
  MessageSquare,
  Sparkles,
  Loader2,
  ExternalLink,
  Send,
  Search,
} from 'lucide-react';

export default function ContactList({ companyId, companyName }) {
  const { addToast } = useToast();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [researchOpenId, setResearchOpenId] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', position: '',
  });

  useEffect(() => { loadContacts(); }, [companyId]);

  async function loadContacts() {
    try {
      const { data } = await api.get(`/contacts?companyId=${companyId}`);
      setContacts(data);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }

  function resetForm() {
    setFormData({ firstName: '', lastName: '', email: '', phone: '', position: '' });
    setShowForm(false);
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        const { data } = await api.put(`/contacts/${editingId}`, formData);
        setContacts((prev) => prev.map((c) => (c.id === editingId ? data : c)));
      } else {
        const { data } = await api.post('/contacts', { ...formData, companyId });
        setContacts((prev) => [data, ...prev]);
      }
      resetForm();
    } catch (err) { addToast(err.response?.data?.error || 'Fehler.', 'error'); }
  }

  function handleEdit(contact) {
    setFormData({ firstName: contact.firstName, lastName: contact.lastName, email: contact.email || '', phone: contact.phone || '', position: contact.position || '' });
    setEditingId(contact.id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Kontakt wirklich löschen?')) return;
    try { await api.delete(`/contacts/${id}`); setContacts((prev) => prev.filter((c) => c.id !== id)); }
    catch { addToast('Fehler beim Löschen.', 'error'); }
  }

  if (loading) return <div className="animate-pulse text-gray-400 font-body">Kontakte laden...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display font-bold text-gray-900 tracking-display">Kontakte ({contacts.length})</h3>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary flex items-center gap-1.5 text-sm">
          <UserPlus className="w-4 h-4" /> Kontakt hinzufügen
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-gray-50 rounded-xl p-5 mb-5 border border-gray-200"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' }}
        >
          <h4 className="text-sm font-display font-bold text-gray-800 mb-3 tracking-display">{editingId ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Vorname *</label><input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="input-field text-sm" required /></div>
            <div><label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Nachname *</label><input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="input-field text-sm" required /></div>
            <div><label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">E-Mail</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-field text-sm" /></div>
            <div><label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Telefon</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input-field text-sm" /></div>
            <div className="col-span-2"><label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Position</label><input type="text" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} className="input-field text-sm" placeholder="z.B. Geschäftsführer, F&E-Leiter" /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="btn-primary text-sm flex items-center gap-1.5"><Save className="w-3.5 h-3.5" />{editingId ? 'Speichern' : 'Hinzufügen'}</button>
            <button type="button" onClick={resetForm} className="btn-secondary text-sm">Abbrechen</button>
          </div>
        </form>
      )}

      {contacts.length === 0 ? (
        <div className="text-center py-14 text-gray-400"><UserPlus className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="text-sm font-body">Noch keine Kontakte. Fügen Sie den ersten hinzu.</p></div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center font-display font-bold text-sm">{contact.firstName?.[0] || ''}{contact.lastName?.[0] || ''}</div>
                  <div>
                    <div className="font-display font-bold text-sm text-gray-900 tracking-display">{contact.firstName} {contact.lastName}</div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 font-body">
                      {contact.position && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{contact.position}</span>}
                      {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-brand-500 hover:text-brand-600 hover:underline rounded focus-visible:ring-2 focus-visible:ring-brand-300"><Mail className="w-3 h-3" />{contact.email}</a>}
                      {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-brand-500 hover:text-brand-600 hover:underline rounded focus-visible:ring-2 focus-visible:ring-brand-300"><Phone className="w-3 h-3" />{contact.phone}</a>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setResearchOpenId(researchOpenId === contact.id ? null : contact.id)} className={`icon-btn ${researchOpenId === contact.id ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'}`} title="KI-Recherche"><Sparkles className="w-4 h-4" /></button>
                  <button onClick={() => setExpandedId(expandedId === contact.id ? null : contact.id)} className={`icon-btn ${expandedId === contact.id ? 'text-brand-500 bg-brand-50' : 'text-gray-400 hover:text-brand-500 hover:bg-brand-50'}`} title="Kommentare"><MessageSquare className="w-4 h-4" /></button>
                  <button onClick={() => handleEdit(contact)} className="icon-btn text-gray-400 hover:text-brand-500 hover:bg-brand-50"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(contact.id)} className="icon-btn text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {researchOpenId === contact.id && (
                <div className="border-t border-gray-100 p-4 bg-amber-50/20">
                  <ContactResearchPanel contact={contact} companyName={companyName} />
                </div>
              )}
              {expandedId === contact.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <CommentSection entityType="CONTACT" entityId={contact.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContactResearchPanel({ contact, companyName }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingStored, setLoadingStored] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const contactName = `${contact.firstName} ${contact.lastName}`;

  useEffect(() => {
    api.get(`/perplexity/contact-stored/${contact.id}`)
      .then(({ data }) => { if (data.stored) setResult(data); })
      .catch(() => {})
      .finally(() => setLoadingStored(false));
  }, [contact.id]);

  async function handleResearch() {
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/perplexity/contact-research', { contactId: contact.id, contactName, position: contact.position || null, companyName });
      setResult({ ...data, fetchedAt: new Date().toISOString() });
    } catch (err) { setError(err.response?.data?.error || 'Fehler bei der KI-Recherche.'); }
    finally { setLoading(false); }
  }

  async function handleFreeSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchLoading(true); setSearchError('');
    try {
      const { data } = await api.post('/perplexity/free-search', { query: query.trim() });
      setSearchResult(data);
    } catch (err) { setSearchError(err.response?.data?.error || 'Fehler bei der Suche.'); }
    finally { setSearchLoading(false); }
  }

  if (loadingStored) return <div className="text-center py-3"><Loader2 className="w-4 h-4 animate-spin text-gray-400 mx-auto" /></div>;

  return (
    <div className="space-y-5">
      {/* Auto Research */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-display font-bold text-gray-700 tracking-display">KI-Recherche: {contactName}</span>
          </div>
          <button onClick={handleResearch} disabled={loading} className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5">
            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Recherche...</> : result ? 'Erneut recherchieren' : 'Person recherchieren'}
          </button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs mb-3">{error}</div>}
        {loading && !result && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto mb-2" />
            <p className="text-xs text-amber-700 font-body">Recherchiere <strong>{contactName}</strong> bei <strong>{companyName}</strong>...</p>
          </div>
        )}
        {result && (
          <div className="space-y-3">
            <div
              className="bg-white border border-gray-200 rounded-xl p-4"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
            >
              {result.fetchedAt && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">KI-Recherche</span>
                  <span className="text-xs text-gray-400 ml-auto">{new Date(result.fetchedAt).toLocaleString('de-DE')}</span>
                </div>
              )}
              <div className="prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-900 prose-headings:text-sm prose-headings:font-semibold prose-strong:text-gray-900 prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
                <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]}>{result.content}</ReactMarkdown>
              </div>
            </div>
            {result.citations?.length > 0 && (
              <div
                className="bg-white border border-gray-200 rounded-xl p-3"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
              >
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Quellen</p>
                <div className="space-y-1">{result.citations.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600 truncate"><ExternalLink className="w-3 h-3 shrink-0" />{url}</a>
                ))}</div>
              </div>
            )}
          </div>
        )}
        {!loading && !result && !error && <div className="text-center py-4 text-gray-400"><p className="text-xs font-body">Klicken Sie auf "Person recherchieren" für Infos über <strong>{contactName}</strong>.</p></div>}
      </div>

      <div className="border-t border-gray-100" />

      {/* Free Search */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-4 h-4 text-brand-500" />
          <span className="text-sm font-display font-bold text-gray-700 tracking-display">Eigene Suche</span>
        </div>
        <form onSubmit={handleFreeSearch} className="flex gap-2 mb-3">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`z.B. "LinkedIn ${contactName}" oder "E-Mail ${contactName} ${companyName}"`} className="input-field flex-1 text-xs" />
          <button type="submit" disabled={searchLoading || !query.trim()} className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5 shrink-0">
            {searchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Suchen
          </button>
        </form>
        {searchError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs mb-3">{searchError}</div>}
        {searchLoading && !searchResult && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center"><Loader2 className="w-5 h-5 animate-spin text-blue-500 mx-auto mb-2" /><p className="text-xs text-blue-700 font-body">Perplexity AI sucht...</p></div>
        )}
        {searchResult && (
          <div
            className="bg-white border border-gray-200 rounded-xl p-4"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-center gap-2 mb-2"><Sparkles className="w-3.5 h-3.5 text-amber-500" /><span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">KI-Antwort</span></div>
            <div className="prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-900 prose-headings:text-sm prose-headings:font-semibold prose-strong:text-gray-900 prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
              <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]}>{searchResult.content}</ReactMarkdown>
            </div>
            {searchResult.citations?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Quellen</p>
                <div className="space-y-1">{searchResult.citations.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600 truncate"><ExternalLink className="w-3 h-3 shrink-0" />{url}</a>
                ))}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
