import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef(null);

  // Fetch initial notifications
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

  // SSE connection
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const token = localStorage.getItem('accessToken');
    const baseUrl = api.defaults.baseURL;
    const url = `${baseUrl}/notifications/stream`;

    const es = new EventSource(url, { withCredentials: false });

    // We need to pass auth header — EventSource doesn't support headers.
    // Instead, we'll poll periodically as a fallback.
    const pollInterval = setInterval(fetchNotifications, 30000);

    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_NOTIFICATION') {
          setNotifications((prev) => [data.notification, ...prev].slice(0, 30));
          setUnreadCount((prev) => prev + 1);
        }
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      // SSE may fail due to auth; rely on polling
      es.close();
    };

    return () => {
      es.close();
      clearInterval(pollInterval);
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

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markRead, markAllRead, fetchNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
