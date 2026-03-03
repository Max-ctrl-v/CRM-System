import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import TaskForm from './TaskForm';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Edit3,
  CalendarClock,
  AlertCircle,
  Building2,
  User,
  ListChecks,
  CircleCheck,
  Clock,
} from 'lucide-react';
import SkeletonTask from './skeletons/SkeletonTask';

export default function TaskList({ companyId, contactId, assignedToId, showLinks = false, search = '', doneFilter = 'all', onTabChange }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => { loadTasks(); }, [companyId, contactId, assignedToId]);

  async function loadTasks() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (companyId) params.set('companyId', companyId);
      if (contactId) params.set('contactId', contactId);
      if (assignedToId) params.set('assignedToId', assignedToId);
      const { data } = await api.get(`/tasks?${params}`);
      setTasks(data);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleDone(task) {
    // Optimistic: toggle immediately
    const newDone = !task.done;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, done: newDone, doneAt: newDone ? new Date().toISOString() : null } : t,
      ),
    );
    try {
      const { data } = await api.patch(`/tasks/${task.id}/done`, { done: newDone });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
    } catch (err) {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, done: !newDone, doneAt: task.doneAt } : t,
        ),
      );
      addToast(err.response?.data?.error || 'Fehler beim Aktualisieren.', 'error');
    }
  }

  async function handleDelete(task) {
    if (!window.confirm(`Aufgabe "${task.title}" wirklich löschen?`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      addToast(err.response?.data?.error || 'Fehler beim Löschen.', 'error');
    }
  }

  function handleSaved(savedTask) {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === savedTask.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedTask;
        return next;
      }
      return [savedTask, ...prev];
    });
    setShowForm(false);
    setEditingTask(null);
  }

  // Filter tasks by search + done/open tab
  const filtered = useMemo(() => {
    let result = tasks;
    if (doneFilter === 'open') result = result.filter((t) => !t.done);
    else if (doneFilter === 'done') result = result.filter((t) => t.done);
    else if (doneFilter === 'overdue') result = result.filter((t) => !t.done && t.dueDate && new Date(t.dueDate) < new Date());
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.company?.name?.toLowerCase().includes(q) ||
        t.assignedTo?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tasks, search, doneFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const open = tasks.filter((t) => !t.done).length;
    const overdue = tasks.filter((t) => !t.done && t.dueDate && new Date(t.dueDate) < new Date()).length;
    const done = tasks.filter((t) => t.done).length;
    return { total, open, overdue, done };
  }, [tasks]);

  if (loading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3, 4].map((i) => <SkeletonTask key={i} />)}
      </div>
    );
  }

  return (
    <div>
      {/* Stats bar */}
      {showLinks && (
        <div className="flex items-center gap-3 mb-4">
          <StatPill icon={ListChecks} label="Offen" value={stats.open} color="brand"
            active={doneFilter === 'open'} onClick={() => onTabChange?.(doneFilter === 'open' ? 'all' : 'open')} />
          <StatPill icon={AlertCircle} label="Überfällig" value={stats.overdue} color="red"
            active={doneFilter === 'overdue'} onClick={() => onTabChange?.(doneFilter === 'overdue' ? 'all' : 'overdue')} />
          <StatPill icon={CircleCheck} label="Erledigt" value={stats.done} color="gray"
            active={doneFilter === 'done'} onClick={() => onTabChange?.(doneFilter === 'done' ? 'all' : 'done')} />

          {/* Progress bar */}
          {stats.total > 0 && (
            <div className="flex-1 flex items-center gap-2.5 ml-2">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(stats.done / stats.total) * 100}%`,
                    background: 'linear-gradient(90deg, #0D7377, #24b8be)',
                    transition: 'width 400ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </div>
              <span className="text-[11px] font-semibold text-gray-400 font-body whitespace-nowrap">
                {Math.round((stats.done / stats.total) * 100)}%
              </span>
            </div>
          )}

          <button
            onClick={() => { setEditingTask(null); setShowForm(true); }}
            className="btn-primary flex items-center gap-1.5 text-sm ml-auto"
          >
            <Plus className="w-4 h-4" /> Neue Aufgabe
          </button>
        </div>
      )}

      {/* Compact header for embedded use (company detail) */}
      {!showLinks && (
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-gray-900 tracking-display">
            Aufgaben ({tasks.length})
          </h3>
          <button onClick={() => { setEditingTask(null); setShowForm(true); }} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" /> Aufgabe hinzufügen
          </button>
        </div>
      )}

      {showForm && (
        <TaskForm
          initial={editingTask}
          defaultCompanyId={companyId}
          defaultContactId={contactId}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditingTask(null); }}
        />
      )}

      {filtered.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f3f4f8, #e8eaef)' }}
          >
            <CheckSquare className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm font-display font-semibold text-gray-400">
            {search ? 'Keine Ergebnisse gefunden' : doneFilter === 'done' ? 'Noch keine erledigten Aufgaben' : 'Noch keine Aufgaben'}
          </p>
          <p className="text-[12px] text-gray-400 font-body mt-1">
            {search ? 'Versuchen Sie einen anderen Suchbegriff.' : 'Erstellen Sie die erste Aufgabe.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const isOverdue = !task.done && task.dueDate && new Date(task.dueDate) < new Date();
            const dueDateFormatted = task.dueDate
              ? new Date(task.dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : null;

            // Days until due
            const daysUntil = task.dueDate && !task.done
              ? Math.ceil((new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <div
                key={task.id}
                className={`group flex items-start gap-3.5 p-4 rounded-xl border ${
                  task.done
                    ? 'bg-gray-50/70 border-gray-100'
                    : isOverdue
                    ? 'bg-red-50/70 border-red-200/80'
                    : 'bg-white border-border-light hover:border-brand-200/50'
                }`}
                style={{
                  boxShadow: task.done
                    ? 'none'
                    : isOverdue
                    ? '0 1px 3px rgba(239,68,68,0.08), 0 2px 6px rgba(239,68,68,0.04)'
                    : '0 1px 2px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.02)',
                  transition: 'border-color 200ms ease, box-shadow 200ms ease, transform 150ms cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleDone(task)}
                  className={`mt-0.5 shrink-0 rounded-md p-0.5 focus-visible:ring-2 focus-visible:ring-brand-300 ${
                    task.done ? 'text-brand-500' : 'text-gray-300 hover:text-brand-400'
                  }`}
                  title={task.done ? 'Als offen markieren' : 'Als erledigt markieren'}
                  style={{ transition: 'color 150ms ease, transform 100ms ease' }}
                >
                  {task.done ? <CheckSquare className="w-[18px] h-[18px]" /> : <Square className="w-[18px] h-[18px]" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`font-display font-semibold text-[13px] leading-snug ${
                        task.done ? 'line-through text-gray-400' : 'text-gray-900'
                      }`}
                    >
                      {task.title}
                    </span>

                    {/* Due date pill - prominent placement */}
                    {dueDateFormatted && !task.done && (
                      <span
                        className={`shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isOverdue
                            ? 'bg-red-100 text-red-700'
                            : daysUntil !== null && daysUntil <= 2
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {isOverdue ? (
                          <><AlertCircle className="w-3 h-3" />Überfällig</>
                        ) : daysUntil === 0 ? (
                          <><Clock className="w-3 h-3" />Heute</>
                        ) : daysUntil === 1 ? (
                          <><Clock className="w-3 h-3" />Morgen</>
                        ) : (
                          <><CalendarClock className="w-3 h-3" />{dueDateFormatted}</>
                        )}
                      </span>
                    )}
                  </div>

                  {task.description && (
                    <p className={`text-[12px] font-body mt-0.5 leading-relaxed ${task.done ? 'text-gray-400' : 'text-gray-500'}`}>
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {task.assignedTo && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium bg-brand-50/60 text-brand-600 font-body">
                        <User className="w-3 h-3" />
                        {task.assignedTo.name}
                      </span>
                    )}

                    {showLinks && task.company && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium bg-brand-50 text-brand-700">
                        <Building2 className="w-3 h-3" />
                        {task.company.name}
                      </span>
                    )}

                    {showLinks && task.contact && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium bg-gray-100 text-gray-600">
                        {task.contact.firstName} {task.contact.lastName}
                      </span>
                    )}

                    {task.done && task.doneAt && (
                      <span className="text-[10px] text-gray-400 font-body">
                        Erledigt am {new Date(task.doneAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions — visible on hover */}
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100" style={{ transition: 'opacity 150ms ease' }}>
                  <button
                    onClick={() => { setEditingTask(task); setShowForm(true); }}
                    className="icon-btn text-gray-400 hover:text-brand-500 hover:bg-brand-50"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(task)}
                    className="icon-btn text-gray-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatPill({ icon: Icon, label, value, color, active, onClick }) {
  const colors = {
    brand: { bg: 'bg-brand-50', text: 'text-brand-700', iconColor: 'text-brand-500' },
    red: { bg: value > 0 ? 'bg-red-50' : 'bg-gray-50', text: value > 0 ? 'text-red-700' : 'text-gray-400', iconColor: value > 0 ? 'text-red-500' : 'text-gray-300' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-600', iconColor: 'text-gray-400' },
  };
  const c = colors[color] || colors.gray;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg
        focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300
        active:scale-95 ${c.bg} ${active ? 'ring-2 ring-brand-400 ring-offset-1' : ''}`}
      style={{
        boxShadow: active
          ? '0 1px 3px rgba(13,115,119,0.2), inset 0 1px 0 rgba(255,255,255,0.6)'
          : 'inset 0 1px 0 rgba(255,255,255,0.6)',
        transition: 'transform 100ms ease, box-shadow 150ms ease',
        cursor: 'pointer',
      }}
    >
      <Icon className={`w-3.5 h-3.5 ${c.iconColor}`} />
      <span className={`text-[12px] font-semibold font-body ${c.text}`}>
        {value}
      </span>
      <span className="text-[11px] text-gray-400 font-body">{label}</span>
    </button>
  );
}
