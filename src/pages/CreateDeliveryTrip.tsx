import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import { useDeliveryTracking } from "@/hooks/useDeliveryTracking";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GMapsPasteInput } from "@/components/delivery/GMapsPasteInput";
import { DriverTemplateSelector } from "@/components/delivery/DriverTemplateSelector";
import { DriverTemplate } from "@/hooks/useDriverTemplates";

interface ContractOption {
  id: string;
  invoice_number: string;
  keterangan: string;
  client_name: string;
  alamat_pengiriman: string;
  google_maps_link?: string;
  lat?: number;
  lng?: number;
}

interface StopInput {
  id: string;
  contract_id?: string;
  recipient_name: string;
  recipient_phone: string;
  destination_address: string;
  destination_lat: number;
  destination_lng: number;
  destination_gmaps_link: string;
  delivery_notes: string;
}

const CreateDeliveryTrip = () => {
  const navigate = useNavigate();
  const { createTrip } = useDeliveryTracking();
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<ContractOption[]>([]);
  
  // Driver info
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  
  // Warehouse info
  const [warehouseAddress, setWarehouseAddress] = useState("");
  const [warehouseLat, setWarehouseLat] = useState(-8.6500);
  const [warehouseLng, setWarehouseLng] = useState(115.2167);
  const [warehouseGmapsLink, setWarehouseGmapsLink] = useState("");
  const [notes, setNotes] = useState("");
  
  const [stops, setStops] = useState<StopInput[]>([]);
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('rental_contracts')
        .select(`
          id,
          keterangan,
          lokasi_detail,
          google_maps_link,
          client_group:client_groups(nama, nomor_telepon)
        `)
        .eq('status_pengiriman', 'belum_kirim')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedContracts: ContractOption[] = (data || []).map((c: any) => ({
        id: c.id,
        invoice_number: c.id.slice(0, 8).toUpperCase(),
        keterangan: c.keterangan || '',
        client_name: c.client_group?.nama || 'Unknown',
        alamat_pengiriman: c.lokasi_detail || '',
        google_maps_link: c.google_maps_link || '',
      }));

      setContracts(formattedContracts);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error('Gagal memuat daftar kontrak');
    }
  };

  const handleLoadTemplate = (template: DriverTemplate) => {
    setDriverName(template.driver_name);
    setDriverPhone(template.driver_phone || '');
    setVehicleInfo(template.vehicle_info || '');
    setWarehouseAddress(template.warehouse_address || '');
    setWarehouseLat(template.warehouse_lat || -8.6500);
    setWarehouseLng(template.warehouse_lng || 115.2167);
    setWarehouseGmapsLink(template.warehouse_gmaps_link || '');
    toast.success(`Template "${template.template_name}" dimuat`);
  };

  const handleContractSelect = (contractId: string, checked: boolean) => {
    if (checked) {
      const contract = contracts.find(c => c.id === contractId);
      if (contract) {
        setSelectedContracts(prev => [...prev, contractId]);
        setStops(prev => [...prev, {
          id: `stop-${Date.now()}`,
          contract_id: contractId,
          recipient_name: contract.client_name,
          recipient_phone: '',
          destination_address: contract.alamat_pengiriman,
          destination_lat: -8.6500 + (Math.random() * 0.05),
          destination_lng: 115.2167 + (Math.random() * 0.05),
          destination_gmaps_link: contract.google_maps_link || '',
          delivery_notes: `${contract.invoice_number} - ${contract.keterangan}`,
        }]);
      }
    } else {
      setSelectedContracts(prev => prev.filter(id => id !== contractId));
      setStops(prev => prev.filter(s => s.contract_id !== contractId));
    }
  };

  const addManualStop = () => {
    setStops(prev => [...prev, {
      id: `stop-${Date.now()}`,
      recipient_name: '',
      recipient_phone: '',
      destination_address: '',
      destination_lat: -8.6500,
      destination_lng: 115.2167,
      destination_gmaps_link: '',
      delivery_notes: '',
    }]);
  };

  const removeStop = (stopId: string) => {
    const stop = stops.find(s => s.id === stopId);
    if (stop?.contract_id) {
      setSelectedContracts(prev => prev.filter(id => id !== stop.contract_id));
    }
    setStops(prev => prev.filter(s => s.id !== stopId));
  };

  const updateStop = (stopId: string, field: keyof StopInput, value: string | number) => {
    setStops(prev => prev.map(s => 
      s.id === stopId ? { ...s, [field]: value } : s
    ));
  };

  const handleStopLocationParsed = (stopId: string, lat: number, lng: number, address?: string) => {
    setStops(prev => prev.map(s => {
      if (s.id === stopId) {
        return {
          ...s,
          destination_lat: lat,
          destination_lng: lng,
          destination_address: address || s.destination_address,
        };
      }
      return s;
    }));
  };

  const handleSubmit = async () => {
    if (!driverName.trim()) {
      toast.error('Nama driver wajib diisi');
      return;
    }
    if (stops.length === 0) {
      toast.error('Tambahkan minimal 1 stop pengiriman');
      return;
    }

    setLoading(true);
    try {
      const tripData = {
        driver_name: driverName,
        driver_phone: driverPhone || undefined,
        vehicle_info: vehicleInfo || undefined,
        warehouse_address: warehouseAddress || undefined,
        warehouse_lat: warehouseLat,
        warehouse_lng: warehouseLng,
        notes: notes || undefined,
        stops: stops.map((stop) => ({
          contract_id: stop.contract_id,
          recipient_name: stop.recipient_name || undefined,
          recipient_phone: stop.recipient_phone || undefined,
          destination_address: stop.destination_address || undefined,
          destination_lat: stop.destination_lat,
          destination_lng: stop.destination_lng,
          delivery_notes: stop.delivery_notes || undefined,
        })),
      };

      await createTrip(tripData);
      toast.success('Trip pengiriman berhasil dibuat');
      navigate('/vip/delivery');
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error('Gagal membuat trip pengiriman');
    } finally {
      setLoading(false);
    }
  };

  // Driver data for template selector
  const driverData = {
    driverName,
    driverPhone,
    vehicleInfo,
    warehouseAddress,
    warehouseLat,
    warehouseLng,
    warehouseGmapsLink,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/vip/delivery')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Buat Trip Pengiriman Baru</h1>
          <p className="text-muted-foreground">Atur driver dan daftar stop pengiriman</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Driver Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informasi Driver</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Selector */}
            <DriverTemplateSelector 
              driverData={driverData}
              onLoadTemplate={handleLoadTemplate}
            />

            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <Label>Nama Driver *</Label>
                <Input 
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Masukkan nama driver"
                />
              </div>
              <div className="space-y-2">
                <Label>No. Telepon Driver</Label>
                <Input 
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="08xxx"
                />
              </div>
              <div className="space-y-2">
                <Label>Info Kendaraan</Label>
                <Input 
                  value={vehicleInfo}
                  onChange={(e) => setVehicleInfo(e.target.value)}
                  placeholder="Contoh: Truk Fuso DK 1234 AB"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warehouse Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Titik Awal (Gudang)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* GMaps Link Input */}
            <GMapsPasteInput
              label="Link Google Maps Gudang"
              value={warehouseGmapsLink}
              onLocationParsed={(lat, lng, address) => {
                setWarehouseLat(lat);
                setWarehouseLng(lng);
                if (address) setWarehouseAddress(address);
              }}
              onLinkChange={setWarehouseGmapsLink}
            />

            <div className="space-y-2">
              <Label>Alamat Gudang</Label>
              <Textarea 
                value={warehouseAddress}
                onChange={(e) => setWarehouseAddress(e.target.value)}
                placeholder="Alamat lengkap gudang"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input 
                  type="number"
                  step="0.0001"
                  value={warehouseLat}
                  onChange={(e) => setWarehouseLat(parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input 
                  type="number"
                  step="0.0001"
                  value={warehouseLng}
                  onChange={(e) => setWarehouseLng(parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catatan Trip</Label>
              <Textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contract Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pilih Kontrak untuk Dikirim</CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Tidak ada kontrak dengan status belum kirim</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {contracts.map((contract) => (
                <div 
                  key={contract.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedContracts.includes(contract.id) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleContractSelect(contract.id, !selectedContracts.includes(contract.id))}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={selectedContracts.includes(contract.id)}
                      onCheckedChange={(checked) => handleContractSelect(contract.id, !!checked)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{contract.invoice_number}</p>
                      <p className="text-xs text-muted-foreground truncate">{contract.client_name}</p>
                      <p className="text-xs text-muted-foreground/70 truncate">{contract.alamat_pengiriman || 'Alamat belum diatur'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stops List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Daftar Stop Pengiriman ({stops.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {stops.length === 0 ? (
            <div className="text-center py-8 space-y-4 border-2 border-dashed border-muted rounded-lg">
              <div className="space-y-2">
                <p className="text-muted-foreground font-medium">Belum ada lokasi tujuan pengiriman</p>
                <p className="text-sm text-muted-foreground/70">
                  Pilih kontrak di atas untuk menambahkan tujuan dari kontrak, atau tambah lokasi tujuan secara manual
                </p>
              </div>
              <Button onClick={addManualStop} className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Tujuan Manual
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {stops.map((stop, index) => (
                <div 
                  key={stop.id}
                  className="p-4 border border-border rounded-lg bg-muted/30"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 mt-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      {/* GMaps Link for Stop */}
                      <GMapsPasteInput
                        label="Link Google Maps Tujuan"
                        value={stop.destination_gmaps_link}
                        onLocationParsed={(lat, lng, address) => handleStopLocationParsed(stop.id, lat, lng, address)}
                        onLinkChange={(link) => updateStop(stop.id, 'destination_gmaps_link', link)}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nama Penerima</Label>
                          <Input 
                            value={stop.recipient_name}
                            onChange={(e) => updateStop(stop.id, 'recipient_name', e.target.value)}
                            placeholder="Nama penerima"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">No. Telepon</Label>
                          <Input 
                            value={stop.recipient_phone}
                            onChange={(e) => updateStop(stop.id, 'recipient_phone', e.target.value)}
                            placeholder="08xxx"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <Label className="text-xs">Alamat Tujuan</Label>
                          <Input 
                            value={stop.destination_address}
                            onChange={(e) => updateStop(stop.id, 'destination_address', e.target.value)}
                            placeholder="Alamat lengkap"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Latitude</Label>
                          <Input 
                            type="number"
                            step="0.0001"
                            value={stop.destination_lat}
                            onChange={(e) => updateStop(stop.id, 'destination_lat', parseFloat(e.target.value))}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Longitude</Label>
                          <Input 
                            type="number"
                            step="0.0001"
                            value={stop.destination_lng}
                            onChange={(e) => updateStop(stop.id, 'destination_lng', parseFloat(e.target.value))}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <Label className="text-xs">Catatan Pengiriman</Label>
                          <Input 
                            value={stop.delivery_notes}
                            onChange={(e) => updateStop(stop.id, 'delivery_notes', e.target.value)}
                            placeholder="Catatan..."
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeStop(stop.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Add more button */}
              <Button variant="outline" onClick={addManualStop} className="w-full mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Tujuan Lainnya
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/vip/delivery')}>
          Batal
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={loading || !driverName.trim() || stops.length === 0}
        >
          {loading ? 'Menyimpan...' : 'Buat Trip Pengiriman'}
        </Button>
      </div>
    </div>
  );
};

export default CreateDeliveryTrip;
