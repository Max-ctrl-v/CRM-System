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

    // Try SSE connection for real-time notifications
    let sseConnected = false;
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const es = new EventSource(`${API_BASE}/notifications/stream?token=${encodeURIComponent(token)}`);
        sseRef.current = es;

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'NEW_NOTIFICATION') {
              setNotifications((prev) => [data.notification, ...prev].slice(0, 30));
              setUnreadCount((prev) => prev + 1);
            } else if (data.type === 'CONNECTED') {
              sseConnected = true;
            }
          } catch {
            // ignore parse errors
          }
        };

        es.onerror = () => {
          // SSE failed — fall back to polling
          es.close();
          sseRef.current = null;
          sseConnected = false;
          if (!pollRef.current) {
            pollRef.current = setInterval(fetchNotifications, 15000);
          }
        };
      } catch {
        // EventSource not supported — use polling
      }
    }

    // Start polling as fallback (slower if SSE is connected)
    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(fetchNotifications, sseConnected ? 60000 : 15000);
    };
    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchNotifications();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
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
