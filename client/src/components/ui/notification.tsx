import * as React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export interface NotificationProps {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
}

const NotificationContext = React.createContext<{
  notifications: NotificationProps[];
  addNotification: (notification: Omit<NotificationProps, 'id'>) => string;
  removeNotification: (id: string) => void;
}>({
  notifications: [],
  addNotification: () => '',
  removeNotification: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = React.useState<NotificationProps[]>([]);
  
  const addNotification = React.useCallback((notification: Omit<NotificationProps, 'id'>) => {
    const id = Date.now().toString();
    const newNotification = {
      id,
      duration: notification.duration || 5000,
      ...notification,
    };
    
    setNotifications(prev => [...prev, newNotification]);
    
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
    
    return id;
  }, []);
  
  const removeNotification = React.useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);
  
  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = React.useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  
  return context;
}

function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();
  
  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {notifications.map(notification => (
        <div 
          key={notification.id}
          className={`p-4 rounded-md shadow-md max-w-sm animate-in slide-in-from-right-5 fade-in ${
            notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 
            notification.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          <div className="flex items-start gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            ) : (
              <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
            )}
            <div className="flex-1">
              {notification.title && (
                <h4 className="font-medium text-sm">{notification.title}</h4>
              )}
              <p className="text-sm">{notification.message}</p>
            </div>
            <button 
              onClick={() => removeNotification(notification.id)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
