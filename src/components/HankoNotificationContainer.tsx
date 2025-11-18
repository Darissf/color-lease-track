import React from 'react';
import { HankoNotification } from './HankoNotification';
import { useNotificationContext } from '@/contexts/NotificationContext';

export const HankoNotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotificationContext();

  if (notifications.length === 0) return null;

  return (
    <div 
      className="fixed top-4 right-4 z-[100] flex flex-col items-end pointer-events-none"
      style={{ maxWidth: 'calc(100vw - 2rem)' }}
    >
      <div className="pointer-events-auto">
        {notifications.map((notification, index) => (
          <div
            key={notification.id}
            style={{
              zIndex: 100 - index,
              transform: `translateY(${index * 8}px) scale(${1 - index * 0.05})`,
              opacity: 1 - index * 0.2,
            }}
          >
            <HankoNotification
              id={notification.id}
              type={notification.type}
              title={notification.title}
              message={notification.message}
              expenseName={notification.expenseName}
              amount={notification.amount}
              onClose={() => removeNotification(notification.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
