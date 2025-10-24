import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Notification as NotificationType } from '../types';
import { notificationsAPI } from '../services/api';
import websocketService from '../services/websocket';

interface NotificationContextType {
  notifications: NotificationType[];
  unreadCount: number;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: NotificationType) => void;
  loading: boolean;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: string }>>([]);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const toastId = Date.now();
    setToasts(prev => [...prev, { id: toastId, message, type }]);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== toastId));
    }, 3000);
  }, []);

  const addNotification = useCallback((notification: NotificationType) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Play notification sound (optional)
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore errors if audio fails to play
      });
    } catch (error) {
      // Ignore audio errors - sound is optional
    }
    
    // Show browser notification if permission is granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo192.png',
        badge: '/logo192.png'
      });
    }
    
    // Show toast notification
    showToast(notification.message, 'info');
  }, [showToast]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [notificationsData, unreadCountData] = await Promise.all([
        notificationsAPI.getNotifications(),
        notificationsAPI.getUnreadCount()
      ]);
      
      setNotifications(notificationsData);
      setUnreadCount(unreadCountData.unread_count);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Load initial notifications
    loadNotifications();

    // Subscribe to WebSocket notifications
    const unsubscribeNotification = websocketService.subscribe('notification', (data) => {
      const newNotification: NotificationType = {
        id: Date.now(), // Temporary ID
        notification_type: data.notification_type,
        title: data.title,
        message: data.message,
        is_read: false,
        created_at: new Date().toISOString(),
        data: data.data || {}
      };
      
      addNotification(newNotification);
    });

    const unsubscribeNotificationCount = websocketService.subscribe('notification_count', (data) => {
      setUnreadCount(data.unread_count);
    });

    const unsubscribeNewResponse = websocketService.subscribe('new_response', (data) => {
      const newNotification: NotificationType = {
        id: Date.now(),
        notification_type: 'new_response',
        title: 'New Response Received',
        message: `New response received for "${data.form_title}"`,
        is_read: false,
        created_at: new Date().toISOString(),
        data: {
          form_id: data.form_id,
          response_id: data.response_id,
          form_title: data.form_title
        }
      };
      
      addNotification(newNotification);
      
      // Reload notifications to get the latest from database
      setTimeout(() => {
        loadNotifications();
      }, 1000);
    });

    return () => {
      unsubscribeNotification();
      unsubscribeNotificationCount();
      unsubscribeNewResponse();
    };
  }, [addNotification]);



  const markAsRead = async (id: number) => {
    try {
      await notificationsAPI.markAsRead(id);
      
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Also send via WebSocket
      websocketService.markNotificationAsRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      
      setUnreadCount(0);
      
      // Also send via WebSocket
      websocketService.markAllNotificationsAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    loading,
    showToast,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Render toasts */}
      {toasts.map(toast => (
        <div key={toast.id} className="fixed top-4 right-4 z-50">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
            <p className="text-sm font-medium text-gray-900">{toast.message}</p>
          </div>
        </div>
      ))}
    </NotificationContext.Provider>
  );
}; 