import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import CommentSection from '../components/CommentSection';
import ContactList from '../components/ContactList';
import PerplexityPanel from '../components/PerplexityPanel';
import BundesanzeigerPanel from '../components/BundesanzeigerPanel';
import TaskList from '../components/TaskList';
import {
  ArrowLeft,
  Building2,
  Globe,
  Edit3,
  Save,
  X,
  Trash2,
  Users,
  FileText,
  Sparkles,
  CircleOff,
  MessageSquare,
  Euro,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  CheckSquare,
} from 'lucide-react';

const STAGES = [
  { key: null, label: 'Keine Pipeline', color: '#94a3b8' },
  { key: 'FIRMA_IDENTIFIZIERT', label: 'Identifiziert', color: '#6366f1' },
  { key: 'FIRMA_KONTAKTIERT', label: 'Kontaktiert', color: '#3b82f6' },
  { key: 'VERHANDLUNG', label: 'Verhandlung', color: '#f59e0b' },
  { key: 'CLOSED_WON', label: 'Won', color: '#10b981' },
  { key: 'CLOSED_LOST', label: 'Lost', color: '#ef4444' },
];

const TABS = [
  { key: 'contacts', label: 'Kontakte', icon: Users },
  { key: 'comments', label: 'Kommentare', icon: MessageSquare },
  { key: 'perplexity', label: 'KI-Recherche', icon: Sparkles },
  { key: 'bundesanzeiger', label: 'Jahresabschluss', icon: FileText },
  { key: 'tasks', label: 'Aufgaben', icon: CheckSquare },
];

function formatEuro(value) {
  if (!value && value !== 0) return null;
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export default function CompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('contacts');
  const [checkingUiS, setCheckingUiS] = useState(false);

  useEffect(() => {
    loadCompany();
    api.get('/auth/users').then(({ data }) => setUsers(data)).catch(() => {});
  }, [id]);

  async function loadCompany() {
    try {
      const { data } = await api.get(`/companies/${id}`);
      setCompany(data);
      setEditData({
        name: data.name,
        website: data.website || '',
        city: data.city || '',
        assignedToId: data.assignedToId || '',
        eigenkapital: data.eigenkapital || '',
        verlustvortrag: data.verlustvortrag || '',
        gewinnvortrag: data.gewinnvortrag || '',
        expectedRevenue: data.expectedRevenue || '',
      });
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      const { data } = await api.put(`/companies/${id}`, {
        ...editData,
        expectedRevenue: editData.expectedRevenue ? parseFloat(editData.expectedRevenue) : null,
      });
      setCompany(data);
      setEditing(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Fehler beim Speichern.');
    }
  }

  async function handleStageChange(stage) {
    try {
      const { data } = await api.patch(`/companies/${id}/stage`, { stage });
      setCompany(data);
    } catch (err) {
      alert(err.response?.data?.error || 'Fehler beim Ändern der Stufe.');
    }
  }

  async function handleDelete() {
    if (!window.confirm(`"${company.name}" wirklich löschen?`)) return;
    try {
      await api.delete(`/companies/${id}`);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.error || 'Fehler beim Löschen.');
    }
  }

  async function recheckUiS() {
    setCheckingUiS(true);
    try {
      const { data } = await api.post('/perplexity/check-uis', {
        companyId: company.id,
        companyName: company.name,
        website: company.website,
      });
      setCompany((prev) => ({
        ...prev,
        uisSchwierigkeiten: data.uisSchwierigkeiten,
        uisReason: data.uisReason,
        ...(data.city && !prev.city ? { city: data.city } : {}),
      }));
    } catch {
      alert('UiS-Prüfung fehlgeschlagen.');
    } finally {
      setCheckingUiS(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-5">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="icon-btn flex items-center gap-1.5 text-gray-600 hover:text-brand-600 hover:bg-brand-50 text-[13px] font-semibold font-body mb-4 px-2.5 py-1.5 rounded-lg"
      >
        <ArrowLeft className="w-4 h-4" />
        Zurück
      </button>

      {/* UiS Warning Banner */}
      {company.uisSchwierigkeiten && (
        <div
          className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5"
          style={{ boxShadow: '0 1px 3px rgba(245,158,11,0.1)' }}
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-display font-bold text-amber-800">Unternehmen in Schwierigkeiten (UiS)</p>
            <p className="text-[12px] text-amber-700 font-body mt-1">{company.uisReason || 'Dieses Unternehmen wurde als UiS nach FZulG eingestuft.'}</p>
          </div>
          <button
            onClick={recheckUiS}
            disabled={checkingUiS}
            className="icon-btn text-amber-600 hover:text-amber-800 hover:bg-amber-100"
            title="Erneut prüfen"
          >
            <RefreshCw className={`w-4 h-4 ${checkingUiS ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* Header Card */}
      <div
        className="bg-white rounded-xl p-6 mb-5 border border-border-light"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <input type="text" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="input-field text-lg font-display font-bold" />
                <input type="text" value={editData.website} onChange={(e) => setEditData({ ...editData, website: e.target.value })} className="input-field" placeholder="Website" />
                <input type="text" value={editData.city} onChange={(e) => setEditData({ ...editData, city: e.target.value })} className="input-field" placeholder="Stadt (z.B. München)" />
                <select value={editData.assignedToId} onChange={(e) => setEditData({ ...editData, assignedToId: e.target.value })} className="input-field">
                  <option value="">— Nicht zugewiesen —</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <input type="number" value={editData.expectedRevenue} onChange={(e) => setEditData({ ...editData, expectedRevenue: e.target.value })} className="input-field" placeholder="Erwarteter Umsatz (€)" step="1000" />
                <input type="text" value={editData.eigenkapital} onChange={(e) => setEditData({ ...editData, eigenkapital: e.target.value })} className="input-field" placeholder="Eigenkapital (z.B. 1.234.567 €)" />
                <div className="flex gap-2">
                  <input type="text" value={editData.verlustvortrag} onChange={(e) => setEditData({ ...editData, verlustvortrag: e.target.value })} className="input-field" placeholder="Verlustvortrag" />
                  <input type="text" value={editData.gewinnvortrag} onChange={(e) => setEditData({ ...editData, gewinnvortrag: e.target.value })} className="input-field" placeholder="Gewinnvortrag" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} className="btn-primary flex items-center gap-1.5"><Save className="w-4 h-4" /> Speichern</button>
                  <button onClick={() => setEditing(false)} className="btn-secondary flex items-center gap-1.5"><X className="w-4 h-4" /> Abbrechen</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3.5 mb-1.5">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #e8fafb, #c5f2f3)',
                      boxShadow: '0 2px 6px rgba(13,115,119,0.12)',
                    }}
                  >
                    <Building2 className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-display font-bold text-gray-900 tracking-display">{company.name}</h1>
                    {company.website && (
                      <a
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-brand-500 hover:text-brand-600 text-[13px] font-body flex items-center gap-1 mt-0.5 rounded focus-visible:ring-2 focus-visible:ring-brand-300"
                        style={{ transition: 'color 150ms ease' }}
                      >
                        <Globe className="w-3.5 h-3.5" /> {company.website}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[13px] text-gray-500 font-body mt-3 pl-[56px] flex-wrap">
                  {company.assignedTo && <span>Zugewiesen: <strong className="text-gray-700">{company.assignedTo.name}</strong></span>}
                  <span>Erstellt: <strong className="text-gray-700">{company.createdBy?.name}</strong></span>
                  <span>{new Date(company.createdAt).toLocaleDateString('de-DE')}</span>
                  {company.expectedRevenue > 0 && (
                    <span className="flex items-center gap-1"><Euro className="w-3.5 h-3.5 text-green-600" /><strong className="text-green-600">{formatEuro(company.expectedRevenue)}</strong></span>
                  )}
                  {company.eigenkapital && <span>Eigenkapital: <strong className="text-gray-700">{company.eigenkapital}</strong></span>}
                  {company.verlustvortrag && <span>Verlustvortrag: <strong className="text-red-600">{company.verlustvortrag}</strong></span>}
                  {company.gewinnvortrag && <span>Gewinnvortrag: <strong className="text-green-600">{company.gewinnvortrag}</strong></span>}
                </div>
                {!company.uisSchwierigkeiten && (
                  <div className="pl-[56px] mt-2">
                    {company.uisReason ? (
                      <div className="flex items-center gap-1.5 text-[12px] font-body">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        <span className="text-green-600 font-medium">Kein UiS</span>
                        <span className="text-gray-400">— {company.uisReason}</span>
                        <button
                          onClick={recheckUiS}
                          disabled={checkingUiS}
                          className="ml-1.5 text-gray-400 hover:text-brand-600 rounded focus-visible:ring-2 focus-visible:ring-brand-300"
                          title="Erneut prüfen"
                          style={{ transition: 'color 150ms ease' }}
                        >
                          <RefreshCw className={`w-3 h-3 ${checkingUiS ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={recheckUiS}
                        disabled={checkingUiS}
                        className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-brand-600 font-body rounded focus-visible:ring-2 focus-visible:ring-brand-300 px-1 py-0.5"
                        style={{ transition: 'color 150ms ease' }}
                      >
                        <RefreshCw className={`w-3 h-3 ${checkingUiS ? 'animate-spin' : ''}`} />
                        UiS-Prüfung {checkingUiS ? 'läuft...' : 'starten'}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {!editing && (
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-1.5 text-[13px]"><Edit3 className="w-3.5 h-3.5" /> Bearbeiten</button>
              <button onClick={handleDelete} className="btn-danger flex items-center gap-1.5 text-[13px] px-3"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>

        {/* Stage Selector */}
        <div className="mt-5 pt-5 border-t border-border-light">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5 block font-body">Pipeline-Stufe</label>
          <div className="flex gap-2 flex-wrap">
            {STAGES.map((stage) => {
              const isActive = company.pipelineStage === stage.key;
              return (
                <button
                  key={stage.key ?? 'none'}
                  onClick={() => handleStageChange(stage.key)}
                  className="px-4 py-2 rounded-lg text-[12px] font-semibold font-body focus-visible:ring-2 focus-visible:ring-brand-300 active:scale-95"
                  style={{
                    background: isActive ? stage.color : '#f0f1f5',
                    color: isActive ? '#fff' : '#6b7280',
                    border: isActive ? 'none' : '1px solid #e2e5eb',
                    boxShadow: isActive
                      ? `0 2px 8px ${stage.color}40, inset 0 1px 0 rgba(255,255,255,0.2)`
                      : 'inset 0 1px 3px rgba(0,0,0,0.08)',
                    transition: 'transform 100ms cubic-bezier(0.16, 1, 0.3, 1), background-color 150ms ease, color 150ms ease, box-shadow 150ms ease',
                  }}
                >
                  {stage.key === null && <CircleOff className="w-3 h-3 inline mr-1 -mt-px" />}
                  {stage.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-5 bg-white rounded-xl p-1.5 w-fit border border-border-light"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.03)' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold font-body focus-visible:ring-2 focus-visible:ring-brand-300 ${
              activeTab === tab.key
                ? 'text-brand-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{
              background: activeTab === tab.key ? '#e8fafb' : 'transparent',
              boxShadow: activeTab === tab.key ? '0 1px 2px rgba(13,115,119,0.08)' : 'none',
              transition: 'background-color 150ms ease, color 150ms ease, box-shadow 150ms ease',
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        className="bg-white rounded-xl p-6 border border-border-light"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)' }}
      >
        {activeTab === 'contacts' && <ContactList companyId={company.id} companyName={company.name} />}
        {activeTab === 'comments' && <CommentSection entityType="COMPANY" entityId={company.id} />}
        {activeTab === 'perplexity' && <PerplexityPanel companyId={company.id} companyName={company.name} website={company.website} />}
        {activeTab === 'bundesanzeiger' && <BundesanzeigerPanel companyName={company.name} />}
        {activeTab === 'tasks' && <TaskList companyId={company.id} />}
      </div>
    </div>
  );
}
