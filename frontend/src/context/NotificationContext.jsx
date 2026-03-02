import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef(null);
  const sseRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications?limit=30');
      setNotifications(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    let sseConnected = false;

    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(fetchNotifications, 30000);
    };
    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    // Fetch a one-time SSE ticket, then open EventSource
    let cancelled = false;
    api.post('/auth/sse-ticket')
      .then(({ data }) => {
        if (cancelled) return;
        const es = new EventSource(`${API_BASE}/notifications/stream?ticket=${encodeURIComponent(data.ticket)}`);
        sseRef.current = es;

        es.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'NEW_NOTIFICATION') {
              setNotifications((prev) => [msg.notification, ...prev].slice(0, 30));
              setUnreadCount((prev) => prev + 1);
            } else if (msg.type === 'CONNECTED') {
              sseConnected = true;
              stopPolling();
            }
          } catch {
            // ignore parse errors
          }
        };

        es.onerror = () => {
          es.close();
          sseRef.current = null;
          sseConnected = false;
          startPolling();
        };
      })
      .catch(() => {
        if (!cancelled) startPolling();
      });

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchNotifications();
        if (!sseConnected) startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [user, fetchNotifications]);

  const markRead = useCallback(async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(() => ({
    notifications, unreadCount, markRead, markAllRead, fetchNotifications,
  }), [notifications, unreadCount, markRead, markAllRead, fetchNotifications]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
