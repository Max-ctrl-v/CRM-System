import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import CreateCompanyModal from '../components/CreateCompanyModal';
import {
  Plus,
  Building2,
  Users,
  GripVertical,
  Search,
  ChevronDown,
  Rocket,
  Trash2,
  Euro,
  AlertTriangle,
} from 'lucide-react';

const PIPELINE_STAGES = [
  { key: 'FIRMA_IDENTIFIZIERT', label: 'Identifiziert', color: '#6366f1', bgLight: '#eef2ff', borderColor: '#c7d2fe', bgColumn: '#f0eeff' },
  { key: 'FIRMA_KONTAKTIERT', label: 'Kontaktiert', color: '#3b82f6', bgLight: '#eff6ff', borderColor: '#bfdbfe', bgColumn: '#edf4ff' },
  { key: 'VERHANDLUNG', label: 'Verhandlung', color: '#f59e0b', bgLight: '#fffbeb', borderColor: '#fde68a', bgColumn: '#fff9e6' },
];

const CLOSED_STAGES = [
  { key: 'CLOSED_WON', label: 'Closed Won', color: '#10b981', bgLight: '#ecfdf5', borderColor: '#a7f3d0', bgColumn: '#edfcf4', icon: Rocket },
  { key: 'CLOSED_LOST', label: 'Closed Lost', color: '#ef4444', bgLight: '#fef2f2', borderColor: '#fecaca', bgColumn: '#fef0f0', icon: Trash2 },
];

const ALL_STAGES = [...PIPELINE_STAGES, ...CLOSED_STAGES];

function formatEuro(value) {
  if (!value && value !== 0) return null;
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function stageSum(companies) {
  return companies.reduce((sum, c) => sum + (c.expectedRevenue || 0), 0);
}

export default function PipelinePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    Promise.all([api.get('/auth/users'), api.get('/companies')])
      .then(([usersRes, companiesRes]) => {
        setAllUsers(usersRes.data);
        setCompanies(companiesRes.data);
        setSelectedUserId(user?.id || '');
      })
      .catch((err) => console.error('Fehler:', err))
      .finally(() => setLoading(false));
  }, [user?.id]);

  async function loadCompanies() {
    try { const { data } = await api.get('/companies'); setCompanies(data); }
    catch (err) { console.error('Fehler:', err); }
  }

  async function handleDragEnd(result) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;
    setCompanies((prev) => prev.map((c) => (c.id === draggableId ? { ...c, pipelineStage: newStage } : c)));
    try { await api.patch(`/companies/${draggableId}/stage`, { stage: newStage }); }
    catch { loadCompanies(); }
  }

  function handleCompanyCreated(company) {
    setCompanies((prev) => [company, ...prev]);
    setShowCreate(false);
  }

  const companiesWithPipeline = companies.filter((c) => c.pipelineStage);
  const pipelineCompanies = selectedUserId === 'ALL'
    ? companiesWithPipeline
    : companiesWithPipeline.filter((c) => c.assignedToId === selectedUserId || c.createdById === selectedUserId);

  const filtered = search
    ? pipelineCompanies.filter((c) => {
        const q = search.toLowerCase();
        const contactMatch = c.contacts?.some((ct) =>
          (ct.firstName && ct.firstName.toLowerCase().includes(q)) ||
          (ct.lastName && ct.lastName.toLowerCase().includes(q))
        );
        return c.name.toLowerCase().includes(q) || contactMatch;
      })
    : pipelineCompanies;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* Toolbar */}
      <div
        className="px-6 py-3.5 bg-white border-b border-border flex items-center justify-between gap-4"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.02)' }}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-base font-display font-bold text-gray-900 tracking-display">Pipeline</h2>

          <div className="relative">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="input-field py-2 text-sm pr-8 pl-3 w-48 appearance-none cursor-pointer font-medium"
            >
              <option value={user?.id}>Meine Pipeline</option>
              <option value="ALL">Alle Mitarbeiter</option>
              {allUsers.filter((u) => u.id !== user?.id).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Firma oder Kontakt suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 py-2 text-sm w-60"
            />
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Neue Firma
        </button>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto px-5 py-5 bg-surface-base">
          <div className="flex gap-3 h-full">
            {/* Main pipeline columns */}
            {PIPELINE_STAGES.map((stage) => {
              const stageCompanies = filtered.filter((c) => c.pipelineStage === stage.key);
              return (
                <Droppable key={stage.key} droppableId={stage.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-1 min-w-0 flex flex-col rounded-xl"
                      style={{
                        background: snapshot.isDraggingOver ? stage.bgLight : stage.bgColumn,
                        border: snapshot.isDraggingOver ? `2px solid ${stage.borderColor}` : `1px solid ${stage.borderColor}30`,
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                        transition: 'border-color 200ms ease, background-color 200ms ease',
                      }}
                    >
                      <div className="px-3.5 pt-3 pb-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ background: stage.color, boxShadow: `0 0 6px ${stage.color}40` }}
                            />
                            <span className="font-display font-bold text-[13px] text-gray-800 tracking-display">{stage.label}</span>
                          </div>
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-md" style={{ background: stage.bgLight, color: stage.color }}>
                            {stageCompanies.length}
                          </span>
                        </div>
                        {stageSum(stageCompanies) > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 text-[11px] font-semibold font-body" style={{ color: stage.color }}>
                            <Euro className="w-3 h-3" />
                            {formatEuro(stageSum(stageCompanies))}
                          </div>
                        )}
                        <div className="mt-2.5 h-[2px] rounded-full opacity-50" style={{ background: `linear-gradient(90deg, ${stage.color}, transparent)` }} />
                      </div>
                      <div className="flex-1 overflow-y-auto px-2.5 pb-2.5 space-y-2.5">
                        {stageCompanies.map((company, index) => (
                          <Draggable key={company.id} draggableId={company.id} index={index}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                className={`bg-white rounded-lg p-3.5 cursor-pointer border border-border-light ${snap.isDragging ? '' : 'pipeline-card'}`}
                                style={{
                                  ...prov.draggableProps.style,
                                  boxShadow: snap.isDragging
                                    ? `0 8px 28px rgba(0,0,0,0.15), 0 0 0 2px ${stage.color}50`
                                    : undefined,
                                }}
                                onClick={() => navigate(`/company/${company.id}`)}
                              >
                                <div className="flex items-start gap-2.5">
                                  <div {...prov.dragHandleProps} className="mt-0.5 text-gray-300 hover:text-gray-500 rounded focus-visible:ring-2 focus-visible:ring-brand-300">
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-display font-semibold text-[13px] text-gray-900 truncate block">{company.name}</span>
                                    {company.website && <p className="text-[11px] text-gray-400 truncate font-body mt-0.5">{company.website}</p>}
                                    <div className="flex items-center gap-2.5 mt-2.5 flex-wrap">
                                      {company.contacts && company.contacts.length > 0 && (
                                        <span className="flex items-center gap-1 text-[11px] text-gray-500 font-body"><Users className="w-3 h-3" /> {company.contacts.length}</span>
                                      )}
                                      {company.assignedTo && (
                                        <span className="text-[11px] px-2 py-0.5 rounded-md font-medium" style={{ background: stage.bgLight, color: stage.color }}>{company.assignedTo.name}</span>
                                      )}
                                      {company.expectedRevenue > 0 && (
                                        <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600 font-body"><Euro className="w-3 h-3" />{formatEuro(company.expectedRevenue)}</span>
                                      )}
                                      {company.uisSchwierigkeiten && (
                                        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 font-body" title={company.uisReason || 'Unternehmen in Schwierigkeiten'}><AlertTriangle className="w-3 h-3" />UiS</span>
                                      )}
                                    </div>
                                    {(company.eigenkapital || company.verlustvortrag || company.gewinnvortrag) && (
                                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400 font-body">
                                        {company.eigenkapital && <span>EK: {company.eigenkapital}</span>}
                                        {company.verlustvortrag && <span className="text-red-400">VV: {company.verlustvortrag}</span>}
                                        {company.gewinnvortrag && <span className="text-green-500">GV: {company.gewinnvortrag}</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {stageCompanies.length === 0 && (
                          <div className="text-center py-10 text-gray-400 font-body">
                            <Building2 className="w-6 h-6 mx-auto mb-2 opacity-30" />
                            <span className="text-[12px]">Keine Firmen</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}

            {/* Closed Won / Closed Lost — side by side */}
            {CLOSED_STAGES.map((stage) => {
              const stageCompanies = filtered.filter((c) => c.pipelineStage === stage.key);
              const StageIcon = stage.icon;
              return (
                <Droppable key={stage.key} droppableId={stage.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-1 min-w-0 flex flex-col rounded-xl"
                      style={{
                        background: snapshot.isDraggingOver ? stage.bgLight : stage.bgColumn,
                        border: snapshot.isDraggingOver ? `2px solid ${stage.borderColor}` : `1px solid ${stage.borderColor}30`,
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                        transition: 'border-color 200ms ease, background-color 200ms ease',
                      }}
                    >
                      <div className="px-3.5 pt-3 pb-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StageIcon className="w-4 h-4" style={{ color: stage.color }} />
                            <span className="font-display font-bold text-[13px] text-gray-800 tracking-display">{stage.label}</span>
                          </div>
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-md" style={{ background: stage.bgLight, color: stage.color }}>
                            {stageCompanies.length}
                          </span>
                        </div>
                        {stageSum(stageCompanies) > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 text-[11px] font-semibold font-body" style={{ color: stage.color }}>
                            <Euro className="w-3 h-3" />
                            {formatEuro(stageSum(stageCompanies))}
                          </div>
                        )}
                        <div className="mt-2.5 h-[2px] rounded-full opacity-50" style={{ background: `linear-gradient(90deg, ${stage.color}, transparent)` }} />
                      </div>
                      <div className="flex-1 overflow-y-auto px-2.5 pb-2.5 space-y-2.5">
                        {stageCompanies.map((company, index) => (
                          <Draggable key={company.id} draggableId={company.id} index={index}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                className={`bg-white rounded-lg p-3 cursor-pointer border border-border-light ${snap.isDragging ? '' : 'pipeline-card'}`}
                                style={{
                                  ...prov.draggableProps.style,
                                  boxShadow: snap.isDragging
                                    ? `0 8px 28px rgba(0,0,0,0.15), 0 0 0 2px ${stage.color}50`
                                    : undefined,
                                }}
                                onClick={() => navigate(`/company/${company.id}`)}
                              >
                                <div className="flex items-start gap-2.5">
                                  <div {...prov.dragHandleProps} className="mt-0.5 text-gray-300 hover:text-gray-500 rounded focus-visible:ring-2 focus-visible:ring-brand-300">
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-display font-semibold text-[13px] text-gray-900 truncate block">{company.name}</span>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                      {company.assignedTo && (
                                        <span className="text-[11px] px-2 py-0.5 rounded-md font-medium" style={{ background: stage.bgLight, color: stage.color }}>{company.assignedTo.name}</span>
                                      )}
                                      {company.expectedRevenue > 0 && (
                                        <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600 font-body"><Euro className="w-3 h-3" />{formatEuro(company.expectedRevenue)}</span>
                                      )}
                                      {company.uisSchwierigkeiten && (
                                        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 font-body" title={company.uisReason || 'Unternehmen in Schwierigkeiten'}><AlertTriangle className="w-3 h-3" />UiS</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {stageCompanies.length === 0 && (
                          <div className="text-center py-6 text-gray-400 font-body">
                            <StageIcon className="w-5 h-5 mx-auto mb-1.5 opacity-25" />
                            <span className="text-[11px]">Keine Firmen</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </div>
      </DragDropContext>

      {showCreate && (
        <CreateCompanyModal onClose={() => setShowCreate(false)} onCreated={handleCompanyCreated} />
      )}
    </div>
  );
}
