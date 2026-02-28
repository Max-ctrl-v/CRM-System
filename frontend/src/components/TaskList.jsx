import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
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
} from 'lucide-react';

export default function TaskList({ companyId, contactId, showLinks = false }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => { loadTasks(); }, [companyId, contactId]);

  async function loadTasks() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (companyId) params.set('companyId', companyId);
      if (contactId) params.set('contactId', contactId);
      const { data } = await api.get(`/tasks?${params}`);
      setTasks(data);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleDone(task) {
    try {
      const { data } = await api.patch(`/tasks/${task.id}/done`, { done: !task.done });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
    } catch (err) {
      alert(err.response?.data?.error || 'Fehler beim Aktualisieren.');
    }
  }

  async function handleDelete(task) {
    if (!window.confirm(`Aufgabe "${task.title}" wirklich löschen?`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      alert(err.response?.data?.error || 'Fehler beim Löschen.');
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

  if (loading) {
    return <div className="animate-pulse text-gray-400 text-sm font-body py-8 text-center">Aufgaben laden...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display font-bold text-gray-900 tracking-display">
          Aufgaben ({tasks.length})
        </h3>
        <button onClick={() => { setEditingTask(null); setShowForm(true); }} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus className="w-4 h-4" /> Aufgabe hinzufügen
        </button>
      </div>

      {showForm && (
        <TaskForm
          initial={editingTask}
          defaultCompanyId={companyId}
          defaultContactId={contactId}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditingTask(null); }}
        />
      )}

      {tasks.length === 0 && !showForm ? (
        <div className="text-center py-14 text-gray-400">
          <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-body">Noch keine Aufgaben. Erstellen Sie die erste.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const isOverdue = !task.done && task.dueDate && new Date(task.dueDate) < new Date();
            const dueDateFormatted = task.dueDate
              ? new Date(task.dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : null;

            return (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                  task.done
                    ? 'bg-gray-50 border-gray-100'
                    : isOverdue
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-border-light'
                }`}
                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)', transition: 'background-color 150ms ease' }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleDone(task)}
                  className={`mt-0.5 shrink-0 rounded focus-visible:ring-2 focus-visible:ring-brand-300 ${
                    task.done ? 'text-brand-500' : 'text-gray-300 hover:text-brand-500'
                  }`}
                  title={task.done ? 'Als offen markieren' : 'Als erledigt markieren'}
                  style={{ transition: 'color 150ms ease' }}
                >
                  {task.done ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <span
                    className={`font-display font-semibold text-[13px] block ${
                      task.done ? 'line-through text-gray-400' : 'text-gray-900'
                    }`}
                  >
                    {task.title}
                  </span>

                  {task.description && (
                    <p className="text-[12px] text-gray-500 font-body mt-0.5 leading-relaxed">{task.description}</p>
                  )}

                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {dueDateFormatted && (
                      <span
                        className={`flex items-center gap-1 text-[11px] font-semibold ${
                          isOverdue ? 'text-red-600' : task.done ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        {isOverdue ? <AlertCircle className="w-3.5 h-3.5 shrink-0" /> : <CalendarClock className="w-3.5 h-3.5 shrink-0" />}
                        {isOverdue ? 'Überfällig: ' : 'Fällig: '}{dueDateFormatted}
                      </span>
                    )}

                    {task.assignedTo && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400 font-body">
                        <User className="w-3 h-3" />
                        {task.assignedTo.name}
                      </span>
                    )}

                    {showLinks && task.company && (
                      <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium bg-brand-50 text-brand-600">
                        <Building2 className="w-3 h-3" />
                        {task.company.name}
                      </span>
                    )}

                    {showLinks && task.contact && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-gray-100 text-gray-600">
                        {task.contact.firstName} {task.contact.lastName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
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
