import { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCompanies } from '../context/CompaniesContext';
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
  Clock,
  PhoneOff,
  TrendingUp,
  ArrowRight,
  MessageSquare,
  Star,
  CalendarClock,
  CalendarCheck,
} from 'lucide-react';
import ProbabilityBadge from '../components/ProbabilityBadge';
import SkeletonCard from '../components/skeletons/SkeletonCard';
import EmptyState from '../components/EmptyState';
import PipelineAnalyticsBar from '../components/PipelineAnalyticsBar';
import ConfettiCelebration from '../components/ConfettiCelebration';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import ContractModal from '../components/ContractModal';

const PIPELINE_STAGES = [
  {
    key: 'FIRMA_IDENTIFIZIERT',
    label: 'Identifiziert',
    color: '#6366f1',
    colorEnd: '#818cf8',
    bgLight: '#eef2ff',
    borderColor: '#c7d2fe',
    bgColumn: 'linear-gradient(180deg, #f5f3ff 0%, #eef2ff 40%, #f8f7ff 100%)',
    iconBg: 'linear-gradient(135deg, #6366f1, #818cf8)',
    // Dark mode variants
    bgLightDark: 'rgba(99,102,241,0.12)',
    borderColorDark: 'rgba(99,102,241,0.25)',
    bgColumnDark: 'linear-gradient(180deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.04) 40%, #13161f 100%)',
  },
  {
    key: 'FIRMA_KONTAKTIERT',
    label: 'Kontaktiert',
    color: '#3b82f6',
    colorEnd: '#60a5fa',
    bgLight: '#eff6ff',
    borderColor: '#bfdbfe',
    bgColumn: 'linear-gradient(180deg, #eff6ff 0%, #e8f2ff 40%, #f5f9ff 100%)',
    iconBg: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    bgLightDark: 'rgba(59,130,246,0.12)',
    borderColorDark: 'rgba(59,130,246,0.25)',
    bgColumnDark: 'linear-gradient(180deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.04) 40%, #13161f 100%)',
  },
  {
    key: 'VERHANDLUNG',
    label: 'Verhandlung',
    color: '#f59e0b',
    colorEnd: '#fbbf24',
    bgLight: '#fffbeb',
    borderColor: '#fde68a',
    bgColumn: 'linear-gradient(180deg, #fffbeb 0%, #fef9e7 40%, #fffdf5 100%)',
    iconBg: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    bgLightDark: 'rgba(245,158,11,0.12)',
    borderColorDark: 'rgba(245,158,11,0.25)',
    bgColumnDark: 'linear-gradient(180deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.04) 40%, #13161f 100%)',
  },
];

const CLOSED_STAGES = [
  {
    key: 'CLOSED_WON',
    label: 'Closed Won',
    color: '#10b981',
    colorEnd: '#34d399',
    bgLight: '#ecfdf5',
    borderColor: '#a7f3d0',
    bgColumn: 'linear-gradient(180deg, #ecfdf5 0%, #e6fbf0 40%, #f2fef8 100%)',
    iconBg: 'linear-gradient(135deg, #10b981, #34d399)',
    icon: Rocket,
    bgLightDark: 'rgba(16,185,129,0.12)',
    borderColorDark: 'rgba(16,185,129,0.25)',
    bgColumnDark: 'linear-gradient(180deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.04) 40%, #13161f 100%)',
  },
  {
    key: 'CLOSED_LOST',
    label: 'Closed Lost',
    color: '#ef4444',
    colorEnd: '#f87171',
    bgLight: '#fef2f2',
    borderColor: '#fecaca',
    bgColumn: 'linear-gradient(180deg, #fef2f2 0%, #fdeaea 40%, #fef5f5 100%)',
    iconBg: 'linear-gradient(135deg, #ef4444, #f87171)',
    icon: Trash2,
    bgLightDark: 'rgba(239,68,68,0.12)',
    borderColorDark: 'rgba(239,68,68,0.25)',
    bgColumnDark: 'linear-gradient(180deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.04) 40%, #13161f 100%)',
  },
];

function formatEuro(value) {
  if (!value && value !== 0) return null;
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function stageSum(companies) {
  return companies.reduce((sum, c) => sum + (c.expectedRevenue || 0), 0);
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `vor ${days} T.`;
  const weeks = Math.floor(days / 7);
  return `vor ${weeks} Wo.`;
}

// Compensate for CSS zoom on <html> — DnD measures zoomed px but renders inside zoom context
const ZOOM = 1.5;
function getDragStyle(draggableStyle, isDragging) {
  if (!isDragging || !draggableStyle) return draggableStyle;
  const s = { ...draggableStyle };
  if (s.width) s.width /= ZOOM;
  if (s.height) s.height /= ZOOM;
  if (typeof s.top === 'number') s.top /= ZOOM;
  if (typeof s.left === 'number') s.left /= ZOOM;
  if (s.transform) {
    s.transform = s.transform.replace(
      /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/,
      (_, x, y) => `translate(${parseFloat(x) / ZOOM}px, ${parseFloat(y) / ZOOM}px)`
    );
  }
  return s;
}

// ── Memoized card for main pipeline stages (prevents re-render during drag) ──
const MainPipelineCard = memo(function MainPipelineCard({
  company, index, stage, dark, score, latestComment,
  isEditingRevenue, editingRevenueValue, isStarAnimating,
  onNavigate, onToggleFavorite, onEditRevenue, onRevenueChange, onSaveRevenue, onCancelRevenue,
}) {
  return (
    <Draggable draggableId={company.id} index={index}>
      {(prov, snap) => (
        <div
          ref={prov.innerRef}
          {...prov.draggableProps}
          className={`group rounded-lg p-3.5 cursor-pointer ${company.doNotCall ? 'bg-red-50' : 'bg-white'} ${snap.isDragging ? '' : 'pipeline-card'}`}
          style={{
            ...getDragStyle(prov.draggableProps.style, snap.isDragging),
            border: company.doNotCall
              ? `1px solid ${dark ? 'rgba(239,68,68,0.25)' : '#fecaca'}`
              : `1px solid ${dark ? stage.borderColorDark : `${stage.borderColor}30`}`,
            borderLeftWidth: '3px',
            borderLeftColor: company.doNotCall ? '#ef4444' : stage.color,
            boxShadow: snap.isDragging
              ? `0 12px 36px rgba(0,0,0,${dark ? '0.4' : '0.18'}), 0 0 0 2px ${stage.color}60`
              : company.doNotCall
              ? `0 1px 3px rgba(239,68,68,${dark ? '0.2' : '0.1'})`
              : `0 1px 2px rgba(0,0,0,${dark ? '0.2' : '0.04'}), 0 1px 4px rgba(0,0,0,${dark ? '0.15' : '0.02'})`,
          }}
          onClick={() => onNavigate(company.id)}
        >
          {company.doNotCall && (
            <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-red-600 font-body">
              <PhoneOff className="w-3 h-3" />
              <span>Nicht mehr anrufen!</span>
            </div>
          )}
          <div className="flex items-start gap-2">
            <div {...prov.dragHandleProps} className="mt-0.5 text-gray-300 hover:text-gray-500 rounded focus-visible:ring-2 focus-visible:ring-brand-300" style={{ transition: 'color 150ms ease' }}>
              <GripVertical className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(company.id); }}
                  className={`shrink-0 rounded focus-visible:ring-2 focus-visible:ring-amber-400 ${isStarAnimating ? 'star-animate' : ''}`}
                  title={company.isFavorite ? 'Aus Scope entfernen' : 'In Scope setzen'}
                  style={{ transition: 'transform 150ms ease' }}
                >
                  <Star className={`w-3.5 h-3.5 ${company.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-400'}`} style={{ transition: 'color 150ms ease' }} />
                </button>
                <span className={`font-display font-semibold text-[13px] truncate leading-snug ${company.doNotCall ? 'text-red-800' : 'text-gray-900'}`}>
                  {company.name}
                </span>
                {score != null && <ProbabilityBadge score={score} size={28} />}
              </div>
              {company.website && (
                <p className="text-[11px] text-gray-400 truncate font-body mt-0.5">{company.website}</p>
              )}
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                {(company._count?.contacts || 0) > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-gray-500 font-body">
                    <Users className="w-3 h-3" /> {company._count.contacts}
                  </span>
                )}
                {company.assignedTo && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-md font-medium"
                    style={{ background: dark ? stage.bgLightDark : stage.bgLight, color: stage.color }}
                  >
                    {company.assignedTo.name}
                  </span>
                )}
                {isEditingRevenue ? (
                  <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Euro className="w-3 h-3 text-green-600" />
                    <input
                      type="number"
                      autoFocus
                      className="w-20 text-[11px] font-semibold text-green-600 font-body border border-green-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-green-400"
                      value={editingRevenueValue}
                      onChange={(e) => onRevenueChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); onSaveRevenue(company.id); }
                        if (e.key === 'Escape') onCancelRevenue();
                      }}
                      onBlur={() => onSaveRevenue(company.id)}
                      step="1000"
                    />
                  </span>
                ) : company.expectedRevenue > 0 ? (
                  <span
                    className="flex items-center gap-1 text-[11px] font-semibold text-green-600 font-body cursor-pointer hover:bg-green-50 rounded px-1 -mx-1"
                    style={{ transition: 'background-color 150ms ease' }}
                    onDoubleClick={(e) => { e.stopPropagation(); onEditRevenue(company.id, String(company.expectedRevenue || '')); }}
                    title="Doppelklick zum Bearbeiten"
                  >
                    <Euro className="w-3 h-3" />{formatEuro(company.expectedRevenue)}
                  </span>
                ) : (
                  <span
                    className="flex items-center gap-1 text-[11px] text-gray-300 font-body cursor-pointer hover:text-green-500 hover:bg-green-50 rounded px-1 -mx-1"
                    style={{ transition: 'background-color 150ms ease, color 150ms ease' }}
                    onDoubleClick={(e) => { e.stopPropagation(); onEditRevenue(company.id, ''); }}
                    title="Doppelklick zum Hinzufügen"
                  >
                    <Euro className="w-3 h-3" />—
                  </span>
                )}
                {company.uisSchwierigkeiten && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 font-body" title={company.uisReason || 'Unternehmen in Schwierigkeiten'}>
                    <AlertTriangle className="w-3 h-3" />UiS
                  </span>
                )}
                {company.meetingStatus === 'MEETING_SET' && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 font-body" title={company.meetingDate ? `Meeting: ${new Date(company.meetingDate).toLocaleDateString('de-DE')}` : 'Meeting geplant'}>
                    <CalendarClock className="w-3 h-3" />Meeting
                  </span>
                )}
                {company.meetingStatus === 'MEETING_DONE' && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 font-body" title={company.meetingFollowUpAt ? `Follow-up: ${new Date(company.meetingFollowUpAt).toLocaleDateString('de-DE')}` : 'Meeting erledigt'}>
                    <CalendarCheck className="w-3 h-3" />Erledigt
                  </span>
                )}
              </div>
              {(company.eigenkapital || company.verlustvortrag || company.gewinnvortrag) && (
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400 font-body">
                  {company.eigenkapital && <span>EK: {company.eigenkapital}</span>}
                  {company.verlustvortrag && <span className="text-red-400">VV: {company.verlustvortrag}</span>}
                  {company.gewinnvortrag && <span className="text-green-500">GV: {company.gewinnvortrag}</span>}
                </div>
              )}
              {company.updatedAt && (
                <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400 font-body">
                  <Clock className="w-3 h-3" />
                  <span>Zuletzt: {timeAgo(company.updatedAt)}</span>
                </div>
              )}
              {latestComment && (
                <div className="flex items-start gap-1.5 mt-2 text-[10px] text-gray-400 font-body">
                  <MessageSquare className="w-3 h-3 shrink-0 mt-0.5" />
                  <span className="truncate" title={latestComment.content}>
                    <span className="font-semibold text-gray-500">{latestComment.user?.name || 'Unbekannt'}:</span>{' '}
                    {latestComment.content.length > 40
                      ? latestComment.content.slice(0, 40) + '...'
                      : latestComment.content}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
});

// ── Memoized card for closed stages ──
const ClosedStageCard = memo(function ClosedStageCard({
  company, index, stage, dark, isStarAnimating,
  onNavigate, onToggleFavorite,
}) {
  return (
    <Draggable draggableId={company.id} index={index}>
      {(prov, snap) => (
        <div
          ref={prov.innerRef}
          {...prov.draggableProps}
          className={`group rounded-lg p-3 cursor-pointer ${company.doNotCall ? 'bg-red-50' : 'bg-white'} ${snap.isDragging ? '' : 'pipeline-card'}`}
          style={{
            ...getDragStyle(prov.draggableProps.style, snap.isDragging),
            border: company.doNotCall
              ? `1px solid ${dark ? 'rgba(239,68,68,0.25)' : '#fecaca'}`
              : `1px solid ${dark ? stage.borderColorDark : `${stage.borderColor}30`}`,
            borderLeftWidth: '3px',
            borderLeftColor: company.doNotCall ? '#ef4444' : stage.color,
            boxShadow: snap.isDragging
              ? `0 12px 36px rgba(0,0,0,${dark ? '0.4' : '0.18'}), 0 0 0 2px ${stage.color}60`
              : company.doNotCall
              ? `0 1px 3px rgba(239,68,68,${dark ? '0.2' : '0.1'})`
              : `0 1px 2px rgba(0,0,0,${dark ? '0.2' : '0.04'}), 0 1px 4px rgba(0,0,0,${dark ? '0.15' : '0.02'})`,
          }}
          onClick={() => onNavigate(company.id)}
        >
          {company.doNotCall && (
            <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-red-600 font-body">
              <PhoneOff className="w-3 h-3" />
              <span>Nicht mehr anrufen!</span>
            </div>
          )}
          <div className="flex items-start gap-2">
            <div {...prov.dragHandleProps} className="mt-0.5 text-gray-300 hover:text-gray-500 rounded focus-visible:ring-2 focus-visible:ring-brand-300" style={{ transition: 'color 150ms ease' }}>
              <GripVertical className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(company.id); }}
                  className={`shrink-0 rounded focus-visible:ring-2 focus-visible:ring-amber-400 ${isStarAnimating ? 'star-animate' : ''}`}
                  title={company.isFavorite ? 'Aus Scope entfernen' : 'In Scope setzen'}
                  style={{ transition: 'transform 150ms ease' }}
                >
                  <Star className={`w-3.5 h-3.5 ${company.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-400'}`} style={{ transition: 'color 150ms ease' }} />
                </button>
                <span className={`font-display font-semibold text-[13px] truncate leading-snug ${company.doNotCall ? 'text-red-800' : 'text-gray-900'}`}>
                  {company.name}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {company.assignedTo && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md font-medium" style={{ background: dark ? stage.bgLightDark : stage.bgLight, color: stage.color }}>
                    {company.assignedTo.name}
                  </span>
                )}
                {company.expectedRevenue > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600 font-body">
                    <Euro className="w-3 h-3" />{formatEuro(company.expectedRevenue)}
                  </span>
                )}
                {company.uisSchwierigkeiten && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 font-body" title={company.uisReason || 'Unternehmen in Schwierigkeiten'}>
                    <AlertTriangle className="w-3 h-3" />UiS
                  </span>
                )}
                {company.meetingStatus === 'MEETING_SET' && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 font-body">
                    <CalendarClock className="w-3 h-3" />Meeting
                  </span>
                )}
                {company.meetingStatus === 'MEETING_DONE' && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 font-body">
                    <CalendarCheck className="w-3 h-3" />Erledigt
                  </span>
                )}
              </div>
              {company.updatedAt && (
                <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400 font-body">
                  <Clock className="w-3 h-3" />
                  <span>Zuletzt: {timeAgo(company.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
});

export default function PipelinePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companies, allUsers, loading, refresh, updateCompany, addCompany } = useCompanies();
  const { addToast } = useToast();
  const { dark } = useTheme();
  const [showCreate, setShowCreate] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [editingRevenueId, setEditingRevenueId] = useState(null);
  const [editingRevenueValue, setEditingRevenueValue] = useState('');
  const [pendingClose, setPendingClose] = useState(null); // { companyId, companyName, stage }
  const [pendingContract, setPendingContract] = useState(null); // company object for contract modal
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [latestComments, setLatestComments] = useState({});
  const [scores, setScores] = useState({});
  const [starAnimatingId, setStarAnimatingId] = useState(null);

  const toggleFavorite = useCallback(async (companyId) => {
    const comp = companies.find((c) => c.id === companyId);
    if (!comp) return;
    const newVal = !comp.isFavorite;
    updateCompany({ ...comp, isFavorite: newVal });
    if (newVal) {
      setStarAnimatingId(companyId);
      setTimeout(() => setStarAnimatingId(null), 650);
    }
    try { await api.patch(`/companies/${companyId}/favorite`); }
    catch { refresh(); }
  }, [companies, updateCompany, refresh]);

  useEffect(() => {
    if (user?.id && !selectedUserId) setSelectedUserId(user.id);
  }, [user?.id, selectedUserId]);

  // Fetch latest comments and scores — only when pipeline company IDs change
  const pipelineIdKey = useMemo(
    () => companies.filter((c) => c.pipelineStage).map((c) => c.id).sort().join(','),
    [companies]
  );
  const prevPipelineIdKey = useRef('');
  useEffect(() => {
    if (!pipelineIdKey || pipelineIdKey === prevPipelineIdKey.current) return;
    prevPipelineIdKey.current = pipelineIdKey;
    api.get(`/comments/latest-batch?entityType=COMPANY&entityIds=${pipelineIdKey}`)
      .then(({ data }) => setLatestComments(data))
      .catch(() => {});
    api.get(`/companies/scores?ids=${pipelineIdKey}`)
      .then(({ data }) => setScores(data))
      .catch(() => {});
  }, [pipelineIdKey]);

  // Keyboard shortcut: N to create new company
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowCreate(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function handleDragEnd(result) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;
    // Confirmation for closing deals
    if (newStage === 'CLOSED_WON' || newStage === 'CLOSED_LOST') {
      const comp = companies.find((c) => c.id === draggableId);
      if (comp && comp.pipelineStage !== newStage) {
        setPendingClose({ companyId: draggableId, companyName: comp?.name, stage: newStage });
        return;
      }
    }
    // Contract creation when moving to Verhandlung
    if (newStage === 'VERHANDLUNG') {
      const comp = companies.find((c) => c.id === draggableId);
      if (comp && comp.pipelineStage !== 'VERHANDLUNG') {
        setPendingContract(comp);
        return;
      }
    }
    applyStageChange(draggableId, newStage);
  }

  async function applyStageChange(companyId, newStage) {
    updateCompany({ ...companies.find((c) => c.id === companyId), pipelineStage: newStage });
    if (newStage === 'CLOSED_WON') {
      setShowConfetti(true);
      addToast('Deal gewonnen!', 'success');
    }
    try { await api.patch(`/companies/${companyId}/stage`, { stage: newStage }); }
    catch { refresh(); }
  }

  function handleCompanyCreated(company) {
    addCompany(company);
    setShowCreate(false);
  }

  const handleNavigate = useCallback((companyId) => navigate(`/company/${companyId}`), [navigate]);

  const handleEditRevenue = useCallback((companyId, value) => {
    setEditingRevenueId(companyId);
    setEditingRevenueValue(value);
  }, []);

  const handleRevenueChange = useCallback((value) => setEditingRevenueValue(value), []);
  const handleCancelRevenue = useCallback(() => setEditingRevenueId(null), []);

  const saveRevenue = useCallback(async (companyId) => {
    const val = editingRevenueValue.trim();
    const num = val ? parseFloat(val) : null;
    try {
      const { data } = await api.put(`/companies/${companyId}`, { expectedRevenue: num });
      updateCompany(data);
      addToast('Umsatz aktualisiert', 'success');
    } catch {
      addToast('Fehler beim Speichern', 'error');
    }
    setEditingRevenueId(null);
  }, [editingRevenueValue, updateCompany, addToast]);

  const filtered = useMemo(() => {
    const withPipeline = companies.filter((c) => c.pipelineStage);
    const byUser = selectedUserId === 'ALL'
      ? withPipeline
      : selectedUserId === 'ADMIN_ONLY'
      ? withPipeline.filter((c) => c.adminPipeline)
      : withPipeline.filter((c) => c.assignedToId === selectedUserId);
    if (!search) return byUser;
    const q = search.toLowerCase();
    return byUser.filter((c) => {
      const contactMatch = c.contacts?.some((ct) =>
        (ct.firstName && ct.firstName.toLowerCase().includes(q)) ||
        (ct.lastName && ct.lastName.toLowerCase().includes(q))
      );
      return c.name.toLowerCase().includes(q) || contactMatch;
    });
  }, [companies, selectedUserId, search]);

  // Pipeline totals
  const totalRevenue = useMemo(() =>
    filtered.reduce((sum, c) => sum + (c.expectedRevenue || 0), 0),
    [filtered]
  );

  if (loading) {
    return (
      <div className="h-[calc(100vh-56px)] flex flex-col">
        <div className="px-6 py-3 bg-white border-b border-border animate-pulse" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="h-8 bg-gray-100 rounded w-24" />
        </div>
        <div className="flex-1 overflow-x-auto px-5 py-5 bg-surface-base">
          <div className="flex gap-3 h-full">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-1 min-w-0 rounded-xl border border-border-light/40 p-3" style={{ background: dark ? '#1a1d27' : '#fafbfd' }}>
                <div className="h-4 bg-gray-100 rounded w-24 mb-4 animate-pulse" />
                <div className="space-y-2">
                  <SkeletonCard />
                  <SkeletonCard />
                  {i <= 3 && <SkeletonCard />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* Toolbar */}
      <div
        className="px-6 py-3 border-b border-border flex items-center justify-between gap-4"
        style={{
          background: dark ? '#1a1d27' : '#ffffff',
          boxShadow: dark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.02)',
        }}
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
              {user?.role === 'ADMIN' && <option value="ADMIN_ONLY">Admin Pipeline</option>}
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

          {/* Pipeline summary */}
          <div className="flex items-center gap-3 ml-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50" style={{ boxShadow: dark ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.6)' }}>
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[12px] font-semibold text-gray-700 font-body">{filtered.length}</span>
              <span className="text-[11px] text-gray-400 font-body">Firmen</span>
            </div>
            {totalRevenue > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50" style={{ boxShadow: dark ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.6)' }}>
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                <span className="text-[12px] font-semibold text-green-700 font-body">{formatEuro(totalRevenue)}</span>
              </div>
            )}
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2" title="Neue Firma (N)">
          <Plus className="w-4 h-4" /> Neue Firma
          <kbd className="text-[9px] font-mono font-semibold bg-white/20 px-1.5 py-0.5 rounded ml-1">N</kbd>
        </button>
      </div>

      {/* Analytics Bar */}
      <PipelineAnalyticsBar companies={filtered} stages={[...PIPELINE_STAGES, ...CLOSED_STAGES]} />

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto px-5 py-5 bg-surface-base">
          <div className="flex gap-3 h-full">
            {/* Main pipeline columns */}
            {PIPELINE_STAGES.map((stage, stageIdx) => {
              const stageCompanies = filtered.filter((c) => c.pipelineStage === stage.key);
              return (
                <Droppable key={stage.key} droppableId={stage.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-1 min-w-0 flex flex-col rounded-xl"
                      style={{
                        background: snapshot.isDraggingOver
                          ? (dark ? stage.bgLightDark : stage.bgLight)
                          : (dark ? stage.bgColumnDark : stage.bgColumn),
                        border: snapshot.isDraggingOver
                          ? `2px solid ${dark ? stage.borderColorDark : stage.borderColor}`
                          : `1px solid ${dark ? stage.borderColorDark : `${stage.borderColor}40`}`,
                        boxShadow: snapshot.isDraggingOver
                          ? `0 0 24px ${stage.color}15, inset 0 1px 2px rgba(0,0,0,${dark ? '0.1' : '0.02'})`
                          : `inset 0 1px 2px rgba(0,0,0,${dark ? '0.1' : '0.02'})`,
                        transition: 'border-color 200ms ease, background 200ms ease, box-shadow 200ms ease',
                      }}
                    >
                      {/* Column header */}
                      <div className="px-3.5 pt-3.5 pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{
                                background: stage.iconBg,
                                boxShadow: `0 2px 6px ${stage.color}30, inset 0 1px 0 rgba(255,255,255,0.25)`,
                              }}
                            >
                              <span className="text-[11px] font-bold text-white font-display">{stageIdx + 1}</span>
                            </div>
                            <span className="font-display font-bold text-[13px] text-gray-800 tracking-display">{stage.label}</span>
                          </div>
                          <span
                            className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                            style={{ background: dark ? stage.bgLightDark : stage.bgLight, color: stage.color, boxShadow: `inset 0 0 0 1px ${stage.color}15` }}
                          >
                            {stageCompanies.length}
                          </span>
                        </div>
                        {stageSum(stageCompanies) > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold font-body" style={{ color: stage.color }}>
                            <Euro className="w-3 h-3" />
                            {formatEuro(stageSum(stageCompanies))}
                          </div>
                        )}
                        {/* Gradient divider */}
                        <div
                          className="mt-3 h-[2px] rounded-full"
                          style={{
                            background: `linear-gradient(90deg, ${stage.color}, ${stage.colorEnd}40, transparent)`,
                          }}
                        />
                      </div>

                      {/* Cards */}
                      <div className="flex-1 overflow-y-auto px-2.5 pb-2.5 space-y-2">
                        {stageCompanies.map((company, index) => (
                          <MainPipelineCard
                            key={company.id}
                            company={company}
                            index={index}
                            stage={stage}
                            dark={dark}
                            score={scores[company.id]}
                            latestComment={latestComments[company.id]}
                            isEditingRevenue={editingRevenueId === company.id}
                            editingRevenueValue={editingRevenueId === company.id ? editingRevenueValue : ''}
                            isStarAnimating={starAnimatingId === company.id}
                            onNavigate={handleNavigate}
                            onToggleFavorite={toggleFavorite}
                            onEditRevenue={handleEditRevenue}
                            onRevenueChange={handleRevenueChange}
                            onSaveRevenue={saveRevenue}
                            onCancelRevenue={handleCancelRevenue}
                          />
                        ))}
                        {provided.placeholder}
                        {stageCompanies.length === 0 && (
                          <EmptyState
                            icon={Building2}
                            title="Keine Firmen"
                            description="Firmen per Drag & Drop hierher verschieben"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}

            {/* Arrow connector between main and closed */}
            <div className="flex items-center justify-center px-0.5 shrink-0 self-start mt-12">
              <ArrowRight className="w-4 h-4 text-gray-300" />
            </div>

            {/* Closed Won / Closed Lost */}
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
                        background: snapshot.isDraggingOver
                          ? (dark ? stage.bgLightDark : stage.bgLight)
                          : (dark ? stage.bgColumnDark : stage.bgColumn),
                        border: snapshot.isDraggingOver
                          ? `2px solid ${dark ? stage.borderColorDark : stage.borderColor}`
                          : `1px solid ${dark ? stage.borderColorDark : `${stage.borderColor}40`}`,
                        boxShadow: snapshot.isDraggingOver
                          ? `0 0 24px ${stage.color}15, inset 0 1px 2px rgba(0,0,0,${dark ? '0.1' : '0.02'})`
                          : `inset 0 1px 2px rgba(0,0,0,${dark ? '0.1' : '0.02'})`,
                        transition: 'border-color 200ms ease, background 200ms ease, box-shadow 200ms ease',
                      }}
                    >
                      {/* Column header */}
                      <div className="px-3.5 pt-3.5 pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{
                                background: stage.iconBg,
                                boxShadow: `0 2px 6px ${stage.color}30, inset 0 1px 0 rgba(255,255,255,0.25)`,
                              }}
                            >
                              <StageIcon className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="font-display font-bold text-[13px] text-gray-800 tracking-display">{stage.label}</span>
                          </div>
                          <span
                            className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                            style={{ background: dark ? stage.bgLightDark : stage.bgLight, color: stage.color, boxShadow: `inset 0 0 0 1px ${stage.color}15` }}
                          >
                            {stageCompanies.length}
                          </span>
                        </div>
                        {stageSum(stageCompanies) > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold font-body" style={{ color: stage.color }}>
                            <Euro className="w-3 h-3" />
                            {formatEuro(stageSum(stageCompanies))}
                          </div>
                        )}
                        <div
                          className="mt-3 h-[2px] rounded-full"
                          style={{
                            background: `linear-gradient(90deg, ${stage.color}, ${stage.colorEnd}40, transparent)`,
                          }}
                        />
                      </div>

                      {/* Cards */}
                      <div className="flex-1 overflow-y-auto px-2.5 pb-2.5 space-y-2">
                        {stageCompanies.map((company, index) => (
                          <ClosedStageCard
                            key={company.id}
                            company={company}
                            index={index}
                            stage={stage}
                            dark={dark}
                            isStarAnimating={starAnimatingId === company.id}
                            onNavigate={handleNavigate}
                            onToggleFavorite={toggleFavorite}
                          />
                        ))}
                        {provided.placeholder}
                        {stageCompanies.length === 0 && (
                          <EmptyState
                            icon={StageIcon}
                            title="Keine Firmen"
                            description="Firmen per Drag & Drop hierher verschieben"
                          />
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

      {/* Confirmation modal for closing deals */}
      {pendingClose && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setPendingClose(null)} style={{ backdropFilter: 'blur(2px)' }} />
          <div
            className="fixed z-50 bg-white rounded-xl border border-border-light p-6 w-[380px]"
            style={{
              top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              boxShadow: dark
                ? '0 8px 32px rgba(0,0,0,0.5), 0 24px 64px rgba(0,0,0,0.4)'
                : '0 8px 32px rgba(0,0,0,0.18), 0 24px 64px rgba(0,0,0,0.12)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: pendingClose.stage === 'CLOSED_WON'
                    ? 'linear-gradient(135deg, #10b981, #34d399)'
                    : 'linear-gradient(135deg, #ef4444, #f87171)',
                  boxShadow: pendingClose.stage === 'CLOSED_WON'
                    ? '0 2px 8px rgba(16,185,129,0.4)'
                    : '0 2px 8px rgba(239,68,68,0.4)',
                }}
              >
                {pendingClose.stage === 'CLOSED_WON'
                  ? <Rocket className="w-5 h-5 text-white" />
                  : <Trash2 className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-gray-900 tracking-display">
                  {pendingClose.stage === 'CLOSED_WON' ? 'Deal abschließen' : 'Deal verloren'}
                </h3>
                <p className="text-[12px] text-gray-500 font-body">
                  {pendingClose.stage === 'CLOSED_WON'
                    ? 'Diesen Deal als gewonnen markieren?'
                    : 'Diesen Deal als verloren markieren?'}
                </p>
              </div>
            </div>
            <div
              className="rounded-lg px-3.5 py-2.5 mb-5 flex items-center gap-2"
              style={{ background: dark ? '#252838' : '#f8f9fc', border: `1px solid ${dark ? '#2a2d3d' : '#eef0f4'}` }}
            >
              <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-[13px] font-display font-semibold text-gray-800 truncate">{pendingClose.companyName}</span>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  applyStageChange(pendingClose.companyId, pendingClose.stage);
                  setPendingClose(null);
                }}
                className={pendingClose.stage === 'CLOSED_WON' ? 'btn-primary flex-1' : 'btn-danger flex-1'}
              >
                {pendingClose.stage === 'CLOSED_WON' ? 'Ja, gewonnen!' : 'Ja, verloren'}
              </button>
              <button onClick={() => setPendingClose(null)} className="btn-secondary flex-1">
                Abbrechen
              </button>
            </div>
          </div>
        </>
      )}

      {/* Contract modal for Verhandlung stage */}
      {pendingContract && (
        <ContractModal
          company={pendingContract}
          onClose={() => {
            // Skip contract — still move to Verhandlung
            applyStageChange(pendingContract.id, 'VERHANDLUNG');
            setPendingContract(null);
          }}
          onComplete={() => {
            applyStageChange(pendingContract.id, 'VERHANDLUNG');
            setPendingContract(null);
            addToast('Vertrag erstellt & Firma in Verhandlung verschoben', 'success');
          }}
        />
      )}

      {showConfetti && <ConfettiCelebration onComplete={() => setShowConfetti(false)} />}
    </div>
  );
}
