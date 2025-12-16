import React from 'react';
import { CheckCircle2, Circle, Truck, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface TimelineStop {
  order: number;
  status: string;
  is_current: boolean;
  label: string;
  estimated_arrival?: string;
  actual_arrival?: string;
  completed_at?: string;
}

interface DeliveryTimelineProps {
  stops: TimelineStop[];
  tripStatus: string;
  className?: string;
}

export const DeliveryTimeline: React.FC<DeliveryTimelineProps> = ({
  stops,
  tripStatus,
  className,
}) => {
  const getStatusIcon = (status: string, isCurrent: boolean) => {
    if (status === 'completed') {
      return <CheckCircle2 className="h-6 w-6 text-green-500" />;
    }
    if (status === 'arrived' || status === 'in_transit') {
      return (
        <div className="relative">
          <Truck className={cn(
            "h-6 w-6",
            status === 'arrived' ? "text-yellow-500" : "text-blue-500"
          )} />
          {isCurrent && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
          )}
        </div>
      );
    }
    return <Circle className="h-6 w-6 text-slate-300" />;
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Selesai';
      case 'arrived':
        return 'Driver Tiba';
      case 'in_transit':
        return 'Dalam Perjalanan';
      default:
        return 'Menunggu';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'arrived':
        return 'text-yellow-600 bg-yellow-50';
      case 'in_transit':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-slate-500 bg-slate-50';
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Trip Status Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium text-slate-600">Status Trip:</span>
        <span className={cn(
          "px-2 py-1 rounded-full text-xs font-medium",
          tripStatus === 'completed' ? "bg-green-100 text-green-700" :
          tripStatus === 'in_progress' ? "bg-blue-100 text-blue-700" :
          tripStatus === 'cancelled' ? "bg-red-100 text-red-700" :
          "bg-slate-100 text-slate-700"
        )}>
          {tripStatus === 'completed' ? 'Selesai' :
           tripStatus === 'in_progress' ? 'Dalam Perjalanan' :
           tripStatus === 'cancelled' ? 'Dibatalkan' : 'Menunggu'}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {stops.map((stop, index) => (
          <div key={index} className="flex gap-4 pb-6 last:pb-0">
            {/* Timeline Line */}
            <div className="flex flex-col items-center">
              {getStatusIcon(stop.status, stop.is_current)}
              {index < stops.length - 1 && (
                <div className={cn(
                  "w-0.5 flex-1 mt-2",
                  stop.status === 'completed' ? "bg-green-300" : "bg-slate-200"
                )} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className={cn(
                    "font-medium",
                    stop.is_current ? "text-blue-600" : "text-slate-800"
                  )}>
                    {stop.label}
                    {stop.is_current && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                        Anda
                      </span>
                    )}
                  </p>
                  <span className={cn(
                    "inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-xs font-medium",
                    getStatusColor(stop.status)
                  )}>
                    {getStatusText(stop.status)}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  Stop {stop.order}
                </span>
              </div>

              {/* Time Info */}
              {(stop.estimated_arrival || stop.actual_arrival || stop.completed_at) && (
                <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                  {stop.estimated_arrival && stop.status !== 'completed' && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      ETA: {format(new Date(stop.estimated_arrival), 'HH:mm', { locale: id })}
                    </span>
                  )}
                  {stop.actual_arrival && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Tiba: {format(new Date(stop.actual_arrival), 'HH:mm', { locale: id })}
                    </span>
                  )}
                  {stop.completed_at && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Selesai: {format(new Date(stop.completed_at), 'HH:mm', { locale: id })}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
