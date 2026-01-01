import React, { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Upload, Trash2, Image as ImageIcon, ChevronDown, Type, Move, Palette } from 'lucide-react';
import { TemplateSettings, LayoutSettings, fontFamilies } from './types';

interface SignatureSectionProps {
  settings: TemplateSettings;
  updateSetting: <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => void;
  onFileSelect: (file: File, target: string) => void;
  onRemoveImage: (field: string) => void;
  uploading: boolean;
  layoutSettings?: LayoutSettings;
  updateLayoutSetting?: (key: string, value: any) => void;
  documentMode?: 'invoice' | 'receipt'; // NEW: To differentiate settings
}

export const SignatureSection: React.FC<SignatureSectionProps> = ({
  settings,
  updateSetting,
  onFileSelect,
  onRemoveImage,
  uploading,
  layoutSettings,
  updateLayoutSetting,
  documentMode = 'invoice', // Default to invoice
}) => {
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file, 'signature_url');
    }
    e.target.value = '';
  };

  // Get current values from layoutSettings or use defaults
  const posX = layoutSettings?.signature_position_x ?? 80;
  const posY = layoutSettings?.signature_position_y ?? 85;
  const scale = layoutSettings?.signature_scale ?? 1;
  const opacity = layoutSettings?.signature_opacity ?? 100;

  const getFontFamilyLabel = (value: string) => {
    if (value === 'inherit') return 'Ikuti Dokumen';
    return fontFamilies.find(f => f.value === value)?.label || value;
  };

  // Helper functions to get/set values based on document mode
  const isReceipt = documentMode === 'receipt';
  
  // Get label values based on mode
  const getLabelPosX = () => isReceipt ? (settings.receipt_signature_label_position_x ?? 0) : (settings.signature_label_position_x ?? 0);
  const getLabelPosY = () => isReceipt ? (settings.receipt_signature_label_position_y ?? 0) : (settings.signature_label_position_y ?? 0);
  const getLabelFontSize = () => isReceipt ? (settings.receipt_signature_label_font_size ?? 14) : (settings.signature_label_font_size ?? 14);
  const getLabelFontFamily = () => isReceipt ? (settings.receipt_signature_label_font_family || 'inherit') : (settings.signature_label_font_family || 'inherit');
  const getLabelColor = () => isReceipt ? (settings.receipt_signature_label_color || '#4b5563') : (settings.signature_label_color || '#4b5563');
  const getLabelFontWeight = () => isReceipt ? (settings.receipt_signature_label_font_weight ?? 'normal') : (settings.signature_label_font_weight ?? 'normal');
  const getLabelFontStyle = () => isReceipt ? (settings.receipt_signature_label_font_style ?? 'normal') : (settings.signature_label_font_style ?? 'normal');
  const getLabelTextDecoration = () => isReceipt ? (settings.receipt_signature_label_text_decoration ?? 'none') : (settings.signature_label_text_decoration ?? 'none');
  
  // Get name values based on mode
  const getNamePosX = () => isReceipt ? (settings.receipt_signer_name_position_x ?? 0) : (settings.signer_name_position_x ?? 0);
  const getNamePosY = () => isReceipt ? (settings.receipt_signer_name_position_y ?? 0) : (settings.signer_name_position_y ?? 0);
  const getNameFontSize = () => isReceipt ? (settings.receipt_signer_name_font_size ?? 14) : (settings.signer_name_font_size ?? 14);
  const getNameFontFamily = () => isReceipt ? (settings.receipt_signer_name_font_family || 'inherit') : (settings.signer_name_font_family || 'inherit');
  const getNameColor = () => isReceipt ? (settings.receipt_signer_name_color || '#1f2937') : (settings.signer_name_color || '#1f2937');
  const getNameFontWeight = () => isReceipt ? (settings.receipt_signer_name_font_weight ?? 'bold') : (settings.signer_name_font_weight ?? 'bold');
  const getNameFontStyle = () => isReceipt ? (settings.receipt_signer_name_font_style ?? 'normal') : (settings.signer_name_font_style ?? 'normal');
  const getNameTextDecoration = () => isReceipt ? (settings.receipt_signer_name_text_decoration ?? 'none') : (settings.signer_name_text_decoration ?? 'none');
  
  // Get title values based on mode
  const getTitlePosX = () => isReceipt ? (settings.receipt_signer_title_position_x ?? 0) : (settings.signer_title_position_x ?? 0);
  const getTitlePosY = () => isReceipt ? (settings.receipt_signer_title_position_y ?? 0) : (settings.signer_title_position_y ?? 0);
  const getTitleFontSize = () => isReceipt ? (settings.receipt_signer_title_font_size ?? 12) : (settings.signer_title_font_size ?? 12);
  const getTitleFontFamily = () => isReceipt ? (settings.receipt_signer_title_font_family || 'inherit') : (settings.signer_title_font_family || 'inherit');
  const getTitleColor = () => isReceipt ? (settings.receipt_signer_title_color || '#6b7280') : (settings.signer_title_color || '#6b7280');
  const getTitleFontWeight = () => isReceipt ? (settings.receipt_signer_title_font_weight ?? 'normal') : (settings.signer_title_font_weight ?? 'normal');
  const getTitleFontStyle = () => isReceipt ? (settings.receipt_signer_title_font_style ?? 'normal') : (settings.signer_title_font_style ?? 'normal');
  const getTitleTextDecoration = () => isReceipt ? (settings.receipt_signer_title_text_decoration ?? 'none') : (settings.signer_title_text_decoration ?? 'none');
  
  // Helper to update the correct setting key based on mode
  const updateTextSetting = (baseName: string, value: any) => {
    const key = (isReceipt ? `receipt_${baseName}` : baseName) as keyof TemplateSettings;
    updateSetting(key, value);
  };

  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Tampilkan Tanda Tangan</Label>
        <Switch
          checked={settings.show_signature !== false}
          onCheckedChange={(checked) => updateSetting('show_signature', checked)}
        />
      </div>

      {settings.show_signature !== false && (
        <>
          {/* Signature Upload */}
          <div className="space-y-2">
            <Label className="text-xs">Gambar Tanda Tangan (Landscape)</Label>
            <div className="border-2 border-dashed rounded-lg p-3">
              {settings.signature_url ? (
                <div className="flex items-center gap-3">
                  <div className="w-32 h-16 rounded bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZGRkIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNkZGQiLz48L3N2Zz4=')]">
                    <img src={settings.signature_url} alt="Signature" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => signatureInputRef.current?.click()} disabled={uploading}>
                      <Upload className="h-3 w-3 mr-1" />
                      Ganti
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => onRemoveImage('signature_url')} className="text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-2 cursor-pointer" onClick={() => signatureInputRef.current?.click()}>
                  <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Upload gambar tanda tangan (PNG dengan transparansi)</span>
                </div>
              )}
            </div>
            <input ref={signatureInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>

          {/* Position X Slider */}
          {updateLayoutSetting && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Posisi Horizontal Gambar (X)</Label>
                  <span className="text-xs text-muted-foreground">{posX}%</span>
                </div>
                <Slider
                  value={[posX]}
                  onValueChange={([value]) => updateLayoutSetting('signature_position_x', value)}
                  min={5}
                  max={300}
                  step={1}
                />
              </div>

              {/* Position Y Slider */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Posisi Vertikal Gambar (Y)</Label>
                  <span className="text-xs text-muted-foreground">{posY}%</span>
                </div>
                <Slider
                  value={[posY]}
                  onValueChange={([value]) => updateLayoutSetting('signature_position_y', value)}
                  min={20}
                  max={300}
                  step={1}
                />
              </div>

              {/* Scale Slider */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Ukuran Gambar</Label>
                  <span className="text-xs text-muted-foreground">{Math.round(scale * 100)}%</span>
                </div>
                <Slider
                  value={[scale * 100]}
                  onValueChange={([value]) => updateLayoutSetting('signature_scale', value / 100)}
                  min={30}
                  max={200}
                  step={5}
                />
              </div>

              {/* Opacity Slider */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Opacity Gambar</Label>
                  <span className="text-xs text-muted-foreground">{opacity}%</span>
                </div>
                <Slider
                  value={[opacity]}
                  onValueChange={([value]) => updateLayoutSetting('signature_opacity', value)}
                  min={20}
                  max={100}
                  step={5}
                />
              </div>
            </>
          )}

          <div className="border-t pt-4 mt-4">
            <Label className="text-sm font-medium mb-3 block">
              Pengaturan Teks Tanda Tangan ({documentMode === 'receipt' ? 'Kwitansi' : 'Invoice'})
            </Label>
          </div>

          {/* Label Tanda Tangan Section */}
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                <span className="text-sm font-medium">Label Tanda Tangan</span>
              </div>
              <ChevronDown className="h-4 w-4 transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Teks Label</Label>
                <Input
                  value={settings.signature_label || 'Hormat Kami,'}
                  onChange={(e) => updateSetting('signature_label', e.target.value)}
                  placeholder="Hormat Kami,"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs">Posisi X</Label>
                    <span className="text-xs text-muted-foreground">{getLabelPosX()}px</span>
                  </div>
                  <Slider
                    value={[getLabelPosX()]}
                    onValueChange={([value]) => updateTextSetting('signature_label_position_x', value)}
                    min={-100}
                    max={100}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs">Posisi Y</Label>
                    <span className="text-xs text-muted-foreground">{getLabelPosY()}px</span>
                  </div>
                  <Slider
                    value={[getLabelPosY()]}
                    onValueChange={([value]) => updateTextSetting('signature_label_position_y', value)}
                    min={-100}
                    max={100}
                    step={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Ukuran Font</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[getLabelFontSize()]}
                      onValueChange={([value]) => updateTextSetting('signature_label_font_size', value)}
                      min={8}
                      max={24}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-8">{getLabelFontSize()}px</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Warna</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={getLabelColor()}
                      onChange={(e) => updateTextSetting('signature_label_color', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border"
                    />
                    <Input
                      value={getLabelColor()}
                      onChange={(e) => updateTextSetting('signature_label_color', e.target.value)}
                      className="flex-1 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Font Family</Label>
                <Select
                  value={getLabelFontFamily()}
                  onValueChange={(value) => updateTextSetting('signature_label_font_family', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih font" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">Ikuti Dokumen</SelectItem>
                    {fontFamilies.map(font => (
                      <SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Text Styling Toggles */}
              <div className="space-y-2">
                <Label className="text-xs">Gaya Teks</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={getLabelFontWeight() === 'bold' ? 'default' : 'outline'}
                    size="sm"
                    className="w-10 font-bold"
                    onClick={() => updateTextSetting('signature_label_font_weight', 
                      getLabelFontWeight() === 'bold' ? 'normal' : 'bold'
                    )}
                  >
                    B
                  </Button>
                  <Button
                    type="button"
                    variant={getLabelFontStyle() === 'italic' ? 'default' : 'outline'}
                    size="sm"
                    className="w-10 italic"
                    onClick={() => updateTextSetting('signature_label_font_style', 
                      getLabelFontStyle() === 'italic' ? 'normal' : 'italic'
                    )}
                  >
                    I
                  </Button>
                  <Button
                    type="button"
                    variant={getLabelTextDecoration() === 'underline' ? 'default' : 'outline'}
                    size="sm"
                    className="w-10 underline"
                    onClick={() => updateTextSetting('signature_label_text_decoration', 
                      getLabelTextDecoration() === 'underline' ? 'none' : 'underline'
                    )}
                  >
                    U
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Nama Penanda Tangan Section */}
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                <span className="text-sm font-medium">Nama Penanda Tangan</span>
              </div>
              <ChevronDown className="h-4 w-4 transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Nama</Label>
                <Input
                  value={settings.signer_name}
                  onChange={(e) => updateSetting('signer_name', e.target.value)}
                  placeholder="Nama lengkap"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs">Posisi X</Label>
                    <span className="text-xs text-muted-foreground">{getNamePosX()}px</span>
                  </div>
                  <Slider
                    value={[getNamePosX()]}
                    onValueChange={([value]) => updateTextSetting('signer_name_position_x', value)}
                    min={-100}
                    max={100}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs">Posisi Y</Label>
                    <span className="text-xs text-muted-foreground">{getNamePosY()}px</span>
                  </div>
                  <Slider
                    value={[getNamePosY()]}
                    onValueChange={([value]) => updateTextSetting('signer_name_position_y', value)}
                    min={-100}
                    max={100}
                    step={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Ukuran Font</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[getNameFontSize()]}
                      onValueChange={([value]) => updateTextSetting('signer_name_font_size', value)}
                      min={10}
                      max={28}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-8">{getNameFontSize()}px</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Warna</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={getNameColor()}
                      onChange={(e) => updateTextSetting('signer_name_color', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border"
                    />
                    <Input
                      value={getNameColor()}
                      onChange={(e) => updateTextSetting('signer_name_color', e.target.value)}
                      className="flex-1 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Font Family</Label>
                <Select
                  value={getNameFontFamily()}
                  onValueChange={(value) => updateTextSetting('signer_name_font_family', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih font" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">Ikuti Dokumen</SelectItem>
                    {fontFamilies.map(font => (
                      <SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Text Styling Toggles */}
              <div className="space-y-2">
                <Label className="text-xs">Gaya Teks</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={getNameFontWeight() === 'bold' ? 'default' : 'outline'}
                    size="sm"
                    className="w-10 font-bold"
                    onClick={() => updateTextSetting('signer_name_font_weight', 
                      getNameFontWeight() === 'bold' ? 'normal' : 'bold'
                    )}
                  >
                    B
                  </Button>
                  <Button
                    type="button"
                    variant={getNameFontStyle() === 'italic' ? 'default' : 'outline'}
                    size="sm"
                    className="w-10 italic"
                    onClick={() => updateTextSetting('signer_name_font_style', 
                      getNameFontStyle() === 'italic' ? 'normal' : 'italic'
                    )}
                  >
                    I
                  </Button>
                  <Button
                    type="button"
                    variant={getNameTextDecoration() === 'underline' ? 'default' : 'outline'}
                    size="sm"
                    className="w-10 underline"
                    onClick={() => updateTextSetting('signer_name_text_decoration', 
                      getNameTextDecoration() === 'underline' ? 'none' : 'underline'
                    )}
                  >
                    U
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Jabatan Section */}
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                <span className="text-sm font-medium">Jabatan</span>
              </div>
              <ChevronDown className="h-4 w-4 transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Jabatan</Label>
                <Input
                  value={settings.signer_title}
                  onChange={(e) => updateSetting('signer_title', e.target.value)}
                  placeholder="Direktur"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs">Posisi X</Label>
                    <span className="text-xs text-muted-foreground">{getTitlePosX()}px</span>
                  </div>
                  <Slider
                    value={[getTitlePosX()]}
                    onValueChange={([value]) => updateTextSetting('signer_title_position_x', value)}
                    min={-100}
                    max={100}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs">Posisi Y</Label>
                    <span className="text-xs text-muted-foreground">{getTitlePosY()}px</span>
                  </div>
                  <Slider
                    value={[getTitlePosY()]}
                    onValueChange={([value]) => updateTextSetting('signer_title_position_y', value)}
                    min={-100}
                    max={100}
                    step={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Ukuran Font</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[getTitleFontSize()]}
                      onValueChange={([value]) => updateTextSetting('signer_title_font_size', value)}
                      min={8}
                      max={20}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-8">{getTitleFontSize()}px</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Warna</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={getTitleColor()}
                      onChange={(e) => updateTextSetting('signer_title_color', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border"
                    />
                    <Input
                      value={getTitleColor()}
                      onChange={(e) => updateTextSetting('signer_title_color', e.target.value)}
                      className="flex-1 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Font Family</Label>
                <Select
                  value={getTitleFontFamily()}
                  onValueChange={(value) => updateTextSetting('signer_title_font_family', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih font" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">Ikuti Dokumen</SelectItem>
                    {fontFamilies.map(font => (
                      <SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Text Styling Toggles */}
              <div className="space-y-2">
                <Label className="text-xs">Gaya Teks</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={getTitleFontWeight() === 'bold' ? 'default' : 'outline'}
                    size="sm"
                    className="w-10 font-bold"
                    onClick={() => updateTextSetting('signer_title_font_weight', 
                      getTitleFontWeight() === 'bold' ? 'normal' : 'bold'
                    )}
                  >
                    B
                  </Button>
                  <Button
                    type="button"
                    variant={getTitleFontStyle() === 'italic' ? 'default' : 'outline'}
                    size="sm"
                    className="w-10 italic"
                    onClick={() => updateTextSetting('signer_title_font_style', 
                      getTitleFontStyle() === 'italic' ? 'normal' : 'italic'
                    )}
                  >
                    I
                  </Button>
                  <Button
                    type="button"
                    variant={getTitleTextDecoration() === 'underline' ? 'default' : 'outline'}
                    size="sm"
                    className="w-10 underline"
                    onClick={() => updateTextSetting('signer_title_text_decoration', 
                      getTitleTextDecoration() === 'underline' ? 'none' : 'underline'
                    )}
                  >
                    U
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Preview */}
          <div className="space-y-2 p-4 rounded-lg border bg-white relative overflow-hidden" style={{ minHeight: '180px' }}>
            <Label className="text-xs font-medium text-muted-foreground">Preview ({documentMode === 'receipt' ? 'Kwitansi' : 'Invoice'}):</Label>
            <div className="flex flex-col items-center text-center pt-8">
              {/* Label Preview */}
              <p 
                className="mb-1"
                style={{
                  fontSize: `${getLabelFontSize()}px`,
                  fontFamily: getLabelFontFamily() === 'inherit' ? 'inherit' : getLabelFontFamily(),
                  color: getLabelColor(),
                  fontWeight: getLabelFontWeight(),
                  fontStyle: getLabelFontStyle(),
                  textDecoration: getLabelTextDecoration(),
                  transform: `translate(${getLabelPosX()}px, ${getLabelPosY()}px)`
                }}
              >
                {settings.signature_label || 'Hormat Kami,'}
              </p>
              
              {/* Signature Image Preview */}
              <div className="my-2">
                {settings.signature_url ? (
                  <img 
                    src={settings.signature_url} 
                    alt="Signature" 
                    className="max-h-12 max-w-24 mx-auto object-contain"
                    style={{ opacity: opacity / 100 }}
                  />
                ) : (
                  <div className="h-8 w-20 border-b border-gray-400 mx-auto" />
                )}
              </div>
              
              {/* Name Preview */}
              <p 
                className="mt-1"
                style={{
                  fontSize: `${getNameFontSize()}px`,
                  fontFamily: getNameFontFamily() === 'inherit' ? 'inherit' : getNameFontFamily(),
                  color: getNameColor(),
                  fontWeight: getNameFontWeight(),
                  fontStyle: getNameFontStyle(),
                  textDecoration: getNameTextDecoration(),
                  transform: `translate(${getNamePosX()}px, ${getNamePosY()}px)`
                }}
              >
                {settings.signer_name || 'Nama Penanda'}
              </p>
              
              {/* Title Preview */}
              {settings.signer_title && (
                <p 
                  style={{
                    fontSize: `${getTitleFontSize()}px`,
                    fontFamily: getTitleFontFamily() === 'inherit' ? 'inherit' : getTitleFontFamily(),
                    color: getTitleColor(),
                    fontWeight: getTitleFontWeight(),
                    fontStyle: getTitleFontStyle(),
                    textDecoration: getTitleTextDecoration(),
                    transform: `translate(${getTitlePosX()}px, ${getTitlePosY()}px)`
                  }}
                >
                  {settings.signer_title}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};