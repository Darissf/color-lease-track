import React from 'react';
import { Clock, Truck, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface WaitingScreenProps {
  stopsAhead: number;
  waitingMessage?: string;
  tripStartedAt?: string;
  className?: string;
}

export const WaitingScreen: React.FC<WaitingScreenProps> = ({
  stopsAhead,
  waitingMessage,
  tripStartedAt,
  className,
}) => {
  return (
    <div className={className}>
      <Card className="border-2 border-dashed border-orange-200 bg-orange-50">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
          
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Menunggu Giliran
          </h3>
          
          <p className="text-slate-600 mb-4">
            {waitingMessage || `Ada ${stopsAhead} pengiriman sebelum giliran Anda.`}
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Truck className="h-4 w-4" />
            <span>Driver sedang menuju lokasi lain</span>
          </div>

          {tripStartedAt && (
            <div className="mt-4 pt-4 border-t border-orange-200">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <AlertCircle className="h-4 w-4" />
                <span>Kami akan kirim notifikasi saat giliran Anda</span>
              </div>
            </div>
          )}

          {/* Animated waiting indicator */}
          <div className="mt-6 flex justify-center gap-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 bg-orange-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
