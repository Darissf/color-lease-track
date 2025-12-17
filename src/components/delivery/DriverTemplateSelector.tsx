import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Star, Trash2, User } from 'lucide-react';
import { useDriverTemplates, DriverTemplate, DriverTemplateInput } from '@/hooks/useDriverTemplates';

interface DriverData {
  driverName: string;
  driverPhone: string;
  vehicleInfo: string;
  warehouseAddress: string;
  warehouseLat: number;
  warehouseLng: number;
  warehouseGmapsLink: string;
}

interface DriverTemplateSelectorProps {
  driverData: DriverData;
  onLoadTemplate: (template: DriverTemplate) => void;
  className?: string;
}

export const DriverTemplateSelector = ({
  driverData,
  onLoadTemplate,
  className = '',
}: DriverTemplateSelectorProps) => {
  const { templates, loading, createTemplate, deleteTemplate, setAsDefault } = useDriverTemplates();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSelectTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      onLoadTemplate(template);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;

    setSaving(true);
    const input: DriverTemplateInput = {
      template_name: templateName.trim(),
      driver_name: driverData.driverName,
      driver_phone: driverData.driverPhone,
      vehicle_info: driverData.vehicleInfo,
      warehouse_address: driverData.warehouseAddress,
      warehouse_lat: driverData.warehouseLat || undefined,
      warehouse_lng: driverData.warehouseLng || undefined,
      warehouse_gmaps_link: driverData.warehouseGmapsLink,
      is_default: isDefault,
    };

    const result = await createTemplate(input);
    setSaving(false);

    if (result) {
      setShowSaveDialog(false);
      setTemplateName('');
      setIsDefault(false);
    }
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    if (confirm('Hapus template ini?')) {
      await deleteTemplate(templateId);
    }
  };

  const handleSetDefault = async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    await setAsDefault(templateId);
  };

  const canSave = driverData.driverName.trim().length > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="space-y-3">
        <div>
          <Label className="text-muted-foreground mb-2 block">Template Driver</Label>
          <Select onValueChange={handleSelectTemplate} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder={loading ? 'Memuat...' : 'Pilih template driver'} />
            </SelectTrigger>
            <SelectContent>
              {templates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{template.template_name}</span>
                    {template.is_default && (
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                </SelectItem>
              ))}
              {templates.length === 0 && !loading && (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  Belum ada template
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSaveDialog(true)}
            disabled={!canSave}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            Simpan sebagai Template
          </Button>
          {!canSave && (
            <p className="text-xs text-muted-foreground text-center">
              Isi nama driver terlebih dahulu untuk menyimpan template
            </p>
          )}
        </div>
      </div>

      {/* Template List with Actions */}
      {templates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {templates.map(template => (
            <div
              key={template.id}
              className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1 text-sm"
            >
              <button
                type="button"
                onClick={() => handleSelectTemplate(template.id)}
                className="hover:underline flex items-center gap-1"
              >
                {template.is_default && (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                )}
                {template.template_name}
              </button>
              <button
                type="button"
                onClick={(e) => handleSetDefault(e, template.id)}
                className="p-1 hover:bg-muted rounded"
                title="Set sebagai default"
              >
                <Star className={`h-3 w-3 ${template.is_default ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
              </button>
              <button
                type="button"
                onClick={(e) => handleDeleteTemplate(e, template.id)}
                className="p-1 hover:bg-destructive/10 rounded text-destructive"
                title="Hapus template"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Simpan Template Driver</DialogTitle>
            <DialogDescription>
              Simpan informasi driver saat ini sebagai template untuk digunakan lagi nanti.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nama Template *</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Contoh: Pak Made - Pickup"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-default"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
              />
              <Label htmlFor="is-default" className="text-sm font-normal">
                Jadikan template default (auto-load saat buka halaman)
              </Label>
            </div>

            <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
              <p className="font-medium">Data yang akan disimpan:</p>
              <p>Driver: {driverData.driverName || '-'}</p>
              <p>Telepon: {driverData.driverPhone || '-'}</p>
              <p>Kendaraan: {driverData.vehicleInfo || '-'}</p>
              <p>Alamat Gudang: {driverData.warehouseAddress || '-'}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleSaveTemplate} 
              disabled={!templateName.trim() || saving}
            >
              {saving ? 'Menyimpan...' : 'Simpan Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
