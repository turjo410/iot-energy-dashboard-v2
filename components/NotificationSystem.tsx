// components/NotificationSystem.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { useEnergyStore } from '../store/energyStore';

const MyComponent = () => {
  const { 
    data, 
    filteredData, 
    analytics, 
    insights,
    setData, 
    updateFilters 
  } = useEnergyStore();

  // Access analytics
  console.log('Average Power:', analytics.averagePower);
  console.log('Efficiency Score:', analytics.trends.efficiencyScore);
  console.log('Insights:', insights);

  // Update filters
  const handleFilterChange = () => {
    updateFilters({
      compressorStatus: 'on',
      powerRange: { min: 0.1, max: 0.5 }
    });
  };

  return (
    <div>
      <p>Total Records: {filteredData.length}</p>
      <p>Avg Power: {analytics.averagePower.toFixed(3)} kW</p>
    </div>
  );
};


interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  autoHide?: boolean;
}

export const NotificationSystem: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36),
      timestamp: new Date()
    };
    
    setNotifications(prev => [...prev, newNotification]);
    
    if (notification.autoHide !== false) {
      setTimeout(() => removeNotification(newNotification.id), 5000);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Energy monitoring alerts
  useEffect(() => {
    const checkAlerts = () => {
      const { data } = useEnergyStore.getState();
      const latest = data[data.length - 1];
      
      if (latest) {
        if (latest.ActivePower_kW > 0.2) {
          addNotification({
            type: 'warning',
            title: 'High Power Consumption',
            message: `Current power: ${latest.ActivePower_kW.toFixed(3)} kW`,
            autoHide: true
          });
        }
        
        if (latest.PowerFactor < 0.8) {
          addNotification({
            type: 'error',
            title: 'Poor Power Factor',
            message: `Power factor: ${latest.PowerFactor.toFixed(3)}. Consider optimization.`,
            autoHide: false
          });
        }
      }
    };

    const interval = setInterval(checkAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'info': return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-80"
          >
            <div className="flex items-start gap-3">
              {getIcon(notification.type)}
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {notification.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {notification.message}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {notification.timestamp.toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
