import React from 'react';
import { User, Phone, Truck, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DriverInfoCardProps {
  driverName: string;
  driverPhone?: string;
  vehicleInfo?: string;
  warehouseAddress?: string;
  className?: string;
}

export const DriverInfoCard: React.FC<DriverInfoCardProps> = ({
  driverName,
  driverPhone,
  vehicleInfo,
  warehouseAddress,
  className,
}) => {
  const handleCall = () => {
    if (driverPhone) {
      window.location.href = `tel:${driverPhone}`;
    }
  };

  const handleWhatsApp = () => {
    if (driverPhone) {
      const phone = driverPhone.replace(/\D/g, '');
      const formattedPhone = phone.startsWith('0') ? `62${phone.slice(1)}` : phone;
      window.open(`https://wa.me/${formattedPhone}`, '_blank');
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <h3 className="font-semibold text-slate-800 mb-3">Info Driver</h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800">{driverName}</p>
              <p className="text-sm text-slate-500">Driver</p>
            </div>
          </div>

          {driverPhone && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-800">{driverPhone}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCall}>
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleWhatsApp} className="text-green-600">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </Button>
              </div>
            </div>
          )}

          {vehicleInfo && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Truck className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-800">{vehicleInfo}</p>
                <p className="text-xs text-slate-500">Kendaraan</p>
              </div>
            </div>
          )}

          {warehouseAddress && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-800">{warehouseAddress}</p>
                <p className="text-xs text-slate-500">Lokasi Gudang</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
