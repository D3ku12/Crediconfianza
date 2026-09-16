import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { subscribe } from '../contexts/RealtimeContext';

const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('[Notifications] Error:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    const unsub = subscribe(fetchNotifications);
    return () => { clearInterval(interval); unsub(); };
  }, [fetchNotifications]);

  const markAllRead = useCallback(() => setUnreadCount(0), []);

  return { notifications, unreadCount, markAllRead, refresh: fetchNotifications };
};

export default useNotifications;