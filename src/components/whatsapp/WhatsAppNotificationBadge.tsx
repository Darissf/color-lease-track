import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Bell, Volume2, VolumeX, X, MessageCircle } from 'lucide-react';
import { useWhatsAppRealtime } from '@/hooks/useWhatsAppRealtime';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

export const WhatsAppNotificationBadge = () => {
  const { unreadCount, notifications, soundEnabled, toggleSound, clearNotification, clearAllNotifications } = useWhatsAppRealtime();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="font-semibold text-sm">Notifikasi WhatsApp</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSound}
              className="h-8 w-8 p-0"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <ScrollArea className="max-h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2" />
              <p className="text-sm">Tidak ada notifikasi</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div key={notif.id} className="p-3 hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {notif.customerName || notif.customerPhone}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {notif.messagePreview}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notif.timestamp), {
                          addSuffix: true,
                          locale: id
                        })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0"
                      onClick={() => clearNotification(notif.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={clearAllNotifications}
            >
              Hapus Semua
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
