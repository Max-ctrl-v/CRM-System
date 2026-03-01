import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { Bell, Check, CheckCheck, X } from 'lucide-react';

const TYPE_LABELS = {
  TASK_ASSIGNED: 'Aufgabe',
  STAGE_CHANGED: 'Pipeline',
  COMMENT_ADDED: 'Kommentar',
  OVERDUE_REMINDER: 'Überfällig',
  SYSTEM: 'System',
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Gerade eben';
  if (mins < 60) return `vor ${mins} Min.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `vor ${hrs} Std.`;
  const days = Math.floor(hrs / 24);
  return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
}

export default function NotificationPanel() {
  const { notifications, unreadCount, markRead, markAllRead, fetchNotifications } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => {
          const willOpen = !open;
          setOpen(willOpen);
          if (willOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-lg text-white/35 hover:text-white hover:bg-white/10
          focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300
          active:scale-95"
        title="Benachrichtigungen"
        style={{ transition: 'background-color 150ms ease, color 150ms ease, transform 100ms ease' }}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 bg-surface-raised dark:bg-dark-raised rounded-xl overflow-hidden z-50"
          style={{
            boxShadow: '0 4px 24px rgba(0,0,0,0.15), 0 12px 48px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-dark-border">
            <span className="text-sm font-display font-semibold text-text-primary dark:text-dark-text-primary">
              Benachrichtigungen
            </span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="p-1 rounded text-text-secondary dark:text-dark-text-secondary hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  title="Alle als gelesen markieren"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-text-secondary dark:text-dark-text-secondary">
                Keine Benachrichtigungen
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.read) markRead(n.id);
                    if (n.link) navigate(n.link);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 dark:border-dark-border/50
                    hover:bg-surface-elevated dark:hover:bg-dark-elevated transition-colors
                    ${!n.read ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase text-brand-500 font-body">
                          {TYPE_LABELS[n.type] || n.type}
                        </span>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary truncate mt-0.5">
                        {n.title}
                      </p>
                      <p className="text-xs text-text-secondary dark:text-dark-text-secondary line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-text-tertiary dark:text-dark-text-tertiary mt-1 block">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
