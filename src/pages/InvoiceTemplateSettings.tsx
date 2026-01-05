import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, RotateCcw, Palette, Type, Layout, FileText, Settings2, Image as ImageIcon, Loader2, Stamp, PenTool, Wallet, TypeIcon, TextCursor, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { ImageCropper } from '@/components/ImageCropper';
import { SignatureCropper } from '@/components/SignatureCropper';
import { InvoiceTemplatePreview } from '@/components/documents/InvoiceTemplatePreview';
import { ReceiptTemplatePreview } from '@/components/documents/ReceiptTemplatePreview';
import { TemplateSettings, defaultSettings } from '@/components/template-settings/types';
import { BrandingSection } from '@/components/template-settings/BrandingSection';
import { ColorsSection } from '@/components/template-settings/ColorsSection';
import { TypographySection } from '@/components/template-settings/TypographySection';
import { LayoutSection } from '@/components/template-settings/LayoutSection';
import { ContentSection } from '@/components/template-settings/ContentSection';
import { AdvancedSection } from '@/components/template-settings/AdvancedSection';
import { StampSection } from '@/components/template-settings/StampSection';
import { SignatureSection } from '@/components/template-settings/SignatureSection';
import { PaymentSection } from '@/components/template-settings/PaymentSection';
import { CustomTextSection } from '@/components/custom-text/CustomTextSection';
import { CustomTextElement } from '@/components/custom-text/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { ResponsiveDocumentWrapper } from '@/components/documents/ResponsiveDocumentWrapper';
import { ZoomableDocumentWrapper } from '@/components/documents/ZoomableDocumentWrapper';

type CropTarget = 'invoice_logo_url' | 'icon_maps_url' | 'icon_whatsapp_url' | 'icon_email_url' | 'icon_website_url' | 'bank_logo_url' | 'signature_url' | 'custom_stamp_url' | null;

const InvoiceTemplateSettings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'receipt' ? 'receipt' : 'invoice';
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<'settings' | 'preview'>('settings');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<TemplateSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<'invoice' | 'receipt'>(defaultTab);
  const [cropTarget, setCropTarget] = useState<CropTarget>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [customTextElements, setCustomTextElements] = useState<CustomTextElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchCustomTextElements();
  }, []);

  useEffect(() => {
    fetchCustomTextElements();
  }, [activeTab]);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('document_settings').select('*').eq('user_id', user.id).maybeSingle();
      if (data) {
        // Parse JSONB layout settings
        const parsedData = {
          ...defaultSettings,
          ...data,
          invoice_layout_settings: typeof data.invoice_layout_settings === 'object' && data.invoice_layout_settings 
            ? { ...defaultSettings.invoice_layout_settings, ...data.invoice_layout_settings }
            : defaultSettings.invoice_layout_settings,
          receipt_layout_settings: typeof data.receipt_layout_settings === 'object' && data.receipt_layout_settings
            ? { ...defaultSettings.receipt_layout_settings, ...data.receipt_layout_settings }
            : defaultSettings.receipt_layout_settings,
        };
        setSettings(parsedData);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomTextElements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('custom_text_elements')
        .select('*')
        .eq('user_id', user.id)
        .eq('document_type', activeTab)
        .order('order_index', { ascending: true });
      if (data) {
        setCustomTextElements(data as CustomTextElement[]);
      }
    } catch (error) {
      console.error('Error fetching custom text elements:', error);
    }
  };

  const handleAddTextElement = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const newElement = {
        user_id: user.id,
        document_type: activeTab,
        content: 'Teks Kustom',
        position_x: 50,
        position_y: 80,
        rotation: 0,
        font_size: 14,
        font_family: 'Arial',
        font_weight: 'normal',
        font_color: '#000000',
        text_align: 'left',
        is_visible: true,
        order_index: customTextElements.length
      };
      const { data, error } = await supabase.from('custom_text_elements').insert(newElement).select().single();
      if (error) throw error;
      if (data) {
        setCustomTextElements(prev => [...prev, data as CustomTextElement]);
        setSelectedElementId(data.id);
        toast.success('Text box ditambahkan');
      }
    } catch (error) {
      console.error('Error adding text element:', error);
      toast.error('Gagal menambahkan text box');
    }
  };

  const handleUpdateTextElement = async (id: string, updates: Partial<CustomTextElement>) => {
    try {
      const { error } = await supabase.from('custom_text_elements').update(updates).eq('id', id);
      if (error) throw error;
      setCustomTextElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
    } catch (error) {
      console.error('Error updating text element:', error);
    }
  };

  const handleDeleteTextElement = async (id: string) => {
    try {
      const { error } = await supabase.from('custom_text_elements').delete().eq('id', id);
      if (error) throw error;
      setCustomTextElements(prev => prev.filter(el => el.id !== id));
      if (selectedElementId === id) setSelectedElementId(null);
      toast.success('Text box dihapus');
    } catch (error) {
      console.error('Error deleting text element:', error);
      toast.error('Gagal menghapus text box');
    }
  };

  const handleFileSelect = useCallback((file: File, target: string) => {
    setCropFile(file);
    setCropTarget(target as CropTarget);
  }, []);

  const handleCrop = async (blob: Blob) => {
    if (!cropTarget) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const fileName = `${user.id}/${cropTarget}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage.from('brand-images').upload(fileName, blob, { contentType: 'image/png', upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('brand-images').getPublicUrl(fileName);
      updateSetting(cropTarget as keyof TemplateSettings, publicUrl);
      toast.success('Gambar berhasil diupload');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Gagal upload gambar');
    } finally {
      setUploading(false);
      setCropFile(null);
      setCropTarget(null);
    }
  };

  const handleRemoveImage = useCallback((field: string) => {
    updateSetting(field as keyof TemplateSettings, null);
  }, []);

  const updateSetting = <K extends keyof TemplateSettings>(key: K, value: TemplateSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Update layout settings based on active tab
  const updateLayoutSetting = (key: string, value: any) => {
    if (activeTab === 'invoice') {
      setSettings(prev => ({
        ...prev,
        invoice_layout_settings: {
          ...prev.invoice_layout_settings,
          [key]: value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        receipt_layout_settings: {
          ...prev.receipt_layout_settings,
          [key]: value
        }
      }));
    }
  };

  // Get current layout settings based on active tab
  const currentLayoutSettings = activeTab === 'invoice' 
    ? settings.invoice_layout_settings 
    : settings.receipt_layout_settings;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Prepare save data - exclude read-only fields that don't exist in DB
      const { invoice_layout_settings, receipt_layout_settings, ...restSettings } = settings;
      
      const saveData = {
        user_id: user.id,
        ...restSettings,
        invoice_layout_settings: invoice_layout_settings,
        receipt_layout_settings: receipt_layout_settings,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase.from('document_settings').upsert(saveData as any, { onConflict: 'user_id' });
      if (error) throw error;
      toast.success('Pengaturan template berhasil disimpan');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    toast.info('Pengaturan dikembalikan ke default');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-2 sm:px-4 py-3 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0"><ArrowLeft className="h-5 w-5" /></Button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Template Dokumen</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Kustomisasi template invoice dan kwitansi</p>
            </div>
          </div>
          <div className="flex gap-1 sm:gap-2">
            {/* Mobile: View Toggle */}
            {isMobile && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setMobileView(mobileView === 'settings' ? 'preview' : 'settings')}
                className="gap-1"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">{mobileView === 'settings' ? 'Preview' : 'Settings'}</span>
              </Button>
            )}
            <Button 
              variant={isEditingMode ? "default" : "outline"} 
              size="sm" 
              onClick={() => setIsEditingMode(!isEditingMode)}
              className="gap-1"
            >
              <TextCursor className="h-4 w-4" />
              <span className="hidden sm:inline">{isEditingMode ? 'Selesai' : 'Edit'}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="hidden sm:inline">Simpan</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      {isMobile ? (
        <div className="min-h-[calc(100vh-65px)]">
          {mobileView === 'settings' ? (
            <div className="p-4 space-y-4">
              {/* Document Type Tabs for mobile settings */}
              <Tabs defaultValue="invoice" value={activeTab} onValueChange={(val) => setActiveTab(val as 'invoice' | 'receipt')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="invoice">Invoice</TabsTrigger>
                  <TabsTrigger value="receipt">Kwitansi</TabsTrigger>
                </TabsList>
              </Tabs>
              <Accordion type="multiple" defaultValue={['branding', 'colors']} className="space-y-3">
                <AccordionItem value="branding" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-primary" /><span className="font-medium">Branding & Media</span></div></AccordionTrigger>
                  <AccordionContent className="pb-4"><BrandingSection settings={settings} onFileSelect={handleFileSelect} onRemoveImage={handleRemoveImage} uploading={uploading} /></AccordionContent>
                </AccordionItem>
                <AccordionItem value="colors" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /><span className="font-medium">Warna & Tema</span></div></AccordionTrigger>
                  <AccordionContent className="pb-4"><ColorsSection settings={settings} updateSetting={updateSetting} /></AccordionContent>
                </AccordionItem>
                <AccordionItem value="typography" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><Type className="h-4 w-4 text-primary" /><span className="font-medium">Tipografi</span></div></AccordionTrigger>
                  <AccordionContent className="pb-4"><TypographySection settings={settings} updateSetting={updateSetting} /></AccordionContent>
                </AccordionItem>
                <AccordionItem value="layout" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><Layout className="h-4 w-4 text-primary" /><span className="font-medium">Layout & Tabel</span></div></AccordionTrigger>
                  <AccordionContent className="pb-4"><LayoutSection settings={settings} updateSetting={updateSetting} /></AccordionContent>
                </AccordionItem>
                <AccordionItem value="content" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><span className="font-medium">Konten & Info</span></div></AccordionTrigger>
                  <AccordionContent className="pb-4"><ContentSection settings={settings} updateSetting={updateSetting} onFileSelect={handleFileSelect} onRemoveImage={handleRemoveImage} uploading={uploading} /></AccordionContent>
                </AccordionItem>
                <AccordionItem value="signature" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><PenTool className="h-4 w-4 text-primary" /><span className="font-medium">Tanda Tangan</span></div></AccordionTrigger>
                  <AccordionContent className="pb-4"><SignatureSection settings={settings} updateSetting={updateSetting} onFileSelect={handleFileSelect} onRemoveImage={handleRemoveImage} uploading={uploading} layoutSettings={currentLayoutSettings} updateLayoutSetting={updateLayoutSetting} documentMode={activeTab} /></AccordionContent>
                </AccordionItem>
                <AccordionItem value="stamp" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><Stamp className="h-4 w-4 text-primary" /><span className="font-medium">Stempel</span></div></AccordionTrigger>
                  <AccordionContent className="pb-4"><StampSection settings={settings} updateSetting={updateSetting} onFileSelect={handleFileSelect} onRemoveImage={handleRemoveImage} uploading={uploading} activeTab={activeTab} layoutSettings={currentLayoutSettings} updateLayoutSetting={updateLayoutSetting} /></AccordionContent>
                </AccordionItem>
                {activeTab === 'invoice' && (
                  <AccordionItem value="payment" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /><span className="font-medium">Pembayaran Transfer</span></div></AccordionTrigger>
                    <AccordionContent className="pb-4"><PaymentSection settings={settings} updateSetting={updateSetting} /></AccordionContent>
                  </AccordionItem>
                )}
                <AccordionItem value="custom-text" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><TypeIcon className="h-4 w-4 text-primary" /><span className="font-medium">Custom Text Box</span></div></AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <CustomTextSection
                      elements={customTextElements}
                      selectedElementId={selectedElementId}
                      documentType={activeTab}
                      onAdd={handleAddTextElement}
                      onUpdate={handleUpdateTextElement}
                      onDelete={handleDeleteTextElement}
                      onSelect={setSelectedElementId}
                    />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="advanced" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-primary" /><span className="font-medium">Advanced</span></div></AccordionTrigger>
                  <AccordionContent className="pb-4"><AdvancedSection settings={settings} updateSetting={updateSetting} onFileSelect={handleFileSelect} onRemoveImage={handleRemoveImage} uploading={uploading} activeTab={activeTab} layoutSettings={currentLayoutSettings} updateLayoutSetting={updateLayoutSetting} /></AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          ) : (
            <div className="p-4 bg-muted/30">
              <Tabs defaultValue="invoice" value={activeTab} onValueChange={(val) => setActiveTab(val as 'invoice' | 'receipt')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="invoice">Invoice</TabsTrigger>
                  <TabsTrigger value="receipt">Kwitansi</TabsTrigger>
                </TabsList>
                <TabsContent value="invoice">
                  <div className="w-full bg-gray-100 rounded-xl border border-gray-200 overflow-hidden flex justify-center items-start pt-4 pb-4">
                    <div style={{
                      transform: 'scale(0.45)',
                      transformOrigin: 'top center',
                      width: '210mm',
                      height: '297mm',
                      marginBottom: '-55%'
                    }}>
                      <InvoiceTemplatePreview 
                        settings={settings}
                        customTextElements={customTextElements}
                        selectedElementId={selectedElementId}
                        onSelectElement={setSelectedElementId}
                        onUpdateElement={handleUpdateTextElement}
                        isEditing={isEditingMode}
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="receipt">
                  <div className="w-full bg-gray-100 rounded-xl border border-gray-200 overflow-hidden flex justify-center items-start pt-4 pb-4">
                    <div style={{
                      transform: 'scale(0.45)',
                      transformOrigin: 'top center',
                      width: '210mm',
                      height: '297mm',
                      marginBottom: '-55%'
                    }}>
                      <ReceiptTemplatePreview 
                        settings={settings}
                        customTextElements={customTextElements}
                        selectedElementId={selectedElementId}
                        onSelectElement={setSelectedElementId}
                        onUpdateElement={handleUpdateTextElement}
                        isEditing={isEditingMode}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      ) : (
        /* Desktop Layout */
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(450px,40%)_1fr] gap-0 min-h-[calc(100vh-65px)]">
          <div className="border-r overflow-y-auto max-h-[calc(100vh-65px)]">
            <div className="p-4 space-y-4">
              <Accordion type="multiple" defaultValue={['branding', 'colors']} className="space-y-3">
                <AccordionItem value="branding" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-primary" /><span className="font-medium">Branding & Media</span></div></AccordionTrigger>
                  <AccordionContent className="pb-4"><BrandingSection settings={settings} onFileSelect={handleFileSelect} onRemoveImage={handleRemoveImage} uploading={uploading} /></AccordionContent>
                </AccordionItem>
                <AccordionItem value="colors" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /><span className="font-medium">Warna & Tema</span></div></AccordionTrigger>
                  <AccordionContent className="pb-4"><ColorsSection settings={settings} updateSetting={updateSetting} /></AccordionContent>
                </AccordionItem>
                <AccordionItem value="typography" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><Type className="h-4 w-4 text-primary" /><span className="font-medium">Tipografi</span></div></AccordionTrigger>
                  <AccordionContent className="pb-4"><TypographySection settings={settings} updateSetting={updateSetting} /></AccordionContent>
                </AccordionItem>
                <AccordionItem value="layout" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><Layout className="h-4 w-4 text-primary" /><span className="font-medium">Layout & Tabel</span></div></AccordionTrigger>
                  <AccordionContent className="pb-4"><LayoutSection settings={settings} updateSetting={updateSetting} /></AccordionContent>
                </AccordionItem>
                <AccordionItem value="content" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><span className="font-medium">Konten & Info</span></div></AccordionTrigger>
                  <AccordionContent className="pb-4"><ContentSection settings={settings} updateSetting={updateSetting} onFileSelect={handleFileSelect} onRemoveImage={handleRemoveImage} uploading={uploading} /></AccordionContent>
                </AccordionItem>
                <AccordionItem value="signature" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><PenTool className="h-4 w-4 text-primary" /><span className="font-medium">Tanda Tangan</span></div></AccordionTrigger>
                  <AccordionContent className="pb-4"><SignatureSection settings={settings} updateSetting={updateSetting} onFileSelect={handleFileSelect} onRemoveImage={handleRemoveImage} uploading={uploading} layoutSettings={currentLayoutSettings} updateLayoutSetting={updateLayoutSetting} documentMode={activeTab} /></AccordionContent>
                </AccordionItem>
                <AccordionItem value="stamp" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><Stamp className="h-4 w-4 text-primary" /><span className="font-medium">Stempel</span></div></AccordionTrigger>
                  <AccordionContent className="pb-4"><StampSection settings={settings} updateSetting={updateSetting} onFileSelect={handleFileSelect} onRemoveImage={handleRemoveImage} uploading={uploading} activeTab={activeTab} layoutSettings={currentLayoutSettings} updateLayoutSetting={updateLayoutSetting} /></AccordionContent>
                </AccordionItem>
                {activeTab === 'invoice' && (
                  <AccordionItem value="payment" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /><span className="font-medium">Pembayaran Transfer</span></div></AccordionTrigger>
                    <AccordionContent className="pb-4"><PaymentSection settings={settings} updateSetting={updateSetting} /></AccordionContent>
                  </AccordionItem>
                )}
                <AccordionItem value="custom-text" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><TypeIcon className="h-4 w-4 text-primary" /><span className="font-medium">Custom Text Box</span></div></AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <CustomTextSection
                      elements={customTextElements}
                      selectedElementId={selectedElementId}
                      documentType={activeTab}
                      onAdd={handleAddTextElement}
                      onUpdate={handleUpdateTextElement}
                      onDelete={handleDeleteTextElement}
                      onSelect={setSelectedElementId}
                    />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="advanced" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-primary" /><span className="font-medium">Advanced</span></div></AccordionTrigger>
                  <AccordionContent className="pb-4"><AdvancedSection settings={settings} updateSetting={updateSetting} onFileSelect={handleFileSelect} onRemoveImage={handleRemoveImage} uploading={uploading} activeTab={activeTab} layoutSettings={currentLayoutSettings} updateLayoutSetting={updateLayoutSetting} /></AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>

          <div className="bg-muted/30 overflow-y-auto max-h-[calc(100vh-65px)]">
            <div className="p-4">
              <Tabs defaultValue="invoice" value={activeTab} onValueChange={(val) => setActiveTab(val as 'invoice' | 'receipt')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="invoice">Invoice</TabsTrigger>
                  <TabsTrigger value="receipt">Kwitansi</TabsTrigger>
                </TabsList>
                <TabsContent value="invoice">
                  <div className="w-full bg-gray-100 rounded-xl border border-gray-200 overflow-hidden flex justify-center items-start pt-8 pb-8">
                    <div style={{
                      transform: 'scale(0.65)',
                      transformOrigin: 'top center',
                      width: '210mm',
                      height: '297mm',
                      marginBottom: '-35%'
                    }}>
                      <InvoiceTemplatePreview 
                        settings={settings}
                        customTextElements={customTextElements}
                        selectedElementId={selectedElementId}
                        onSelectElement={setSelectedElementId}
                        onUpdateElement={handleUpdateTextElement}
                        isEditing={isEditingMode}
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="receipt">
                  <div className="w-full bg-gray-100 rounded-xl border border-gray-200 overflow-hidden flex justify-center items-start pt-8 pb-8">
                    <div style={{
                      transform: 'scale(0.65)',
                      transformOrigin: 'top center',
                      width: '210mm',
                      height: '297mm',
                      marginBottom: '-35%'
                    }}>
                      <ReceiptTemplatePreview 
                        settings={settings}
                        customTextElements={customTextElements}
                        selectedElementId={selectedElementId}
                        onSelectElement={setSelectedElementId}
                        onUpdateElement={handleUpdateTextElement}
                        isEditing={isEditingMode}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {cropFile && cropTarget === 'signature_url' ? (
        <SignatureCropper file={cropFile} onCrop={handleCrop} onCancel={() => { setCropFile(null); setCropTarget(null); }} />
      ) : cropFile && (
        <ImageCropper file={cropFile} onCrop={handleCrop} onCancel={() => { setCropFile(null); setCropTarget(null); }} />
      )}
    </div>
  );
};

export default InvoiceTemplateSettings;
