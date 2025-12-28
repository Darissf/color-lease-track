import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, RotateCcw, Palette, Type, Layout, FileText, Settings2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ImageCropper } from '@/components/ImageCropper';
import { InvoiceTemplatePreview } from '@/components/documents/InvoiceTemplatePreview';
import { ReceiptTemplatePreview } from '@/components/documents/ReceiptTemplatePreview';
import { TemplateSettings, defaultSettings } from '@/components/template-settings/types';
import { BrandingSection } from '@/components/template-settings/BrandingSection';
import { ColorsSection } from '@/components/template-settings/ColorsSection';
import { TypographySection } from '@/components/template-settings/TypographySection';
import { LayoutSection } from '@/components/template-settings/LayoutSection';
import { ContentSection } from '@/components/template-settings/ContentSection';
import { AdvancedSection } from '@/components/template-settings/AdvancedSection';

type CropTarget = 'invoice_logo_url' | 'icon_maps_url' | 'icon_whatsapp_url' | 'icon_email_url' | 'icon_website_url' | 'bank_logo_url' | 'signature_url' | 'custom_stamp_url' | null;

const InvoiceTemplateSettings = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<TemplateSettings>(defaultSettings);
  const [cropTarget, setCropTarget] = useState<CropTarget>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('document_settings').select('*').eq('user_id', user.id).maybeSingle();
      if (data) setSettings({ ...defaultSettings, ...data });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('document_settings').upsert({ user_id: user.id, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
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
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-lg font-semibold">Template Invoice & Kwitansi</h1>
              <p className="text-xs text-muted-foreground">Kustomisasi dokumen profesional</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}><RotateCcw className="h-4 w-4 mr-1" />Reset</Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}Simpan
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-[calc(100vh-65px)]">
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
              <AccordionItem value="advanced" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-3"><div className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-primary" /><span className="font-medium">Advanced</span></div></AccordionTrigger>
                <AccordionContent className="pb-4"><AdvancedSection settings={settings} updateSetting={updateSetting} onFileSelect={handleFileSelect} onRemoveImage={handleRemoveImage} uploading={uploading} /></AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        <div className="bg-muted/30 overflow-y-auto max-h-[calc(100vh-65px)]">
          <div className="p-4">
            <Tabs defaultValue="invoice" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="invoice">Invoice</TabsTrigger>
                <TabsTrigger value="receipt">Kwitansi</TabsTrigger>
              </TabsList>
              <TabsContent value="invoice">
                <Card className="shadow-lg"><CardContent className="p-0"><div className="transform scale-[0.6] origin-top-left" style={{ width: '166.67%' }}><InvoiceTemplatePreview settings={settings} /></div></CardContent></Card>
              </TabsContent>
              <TabsContent value="receipt">
                <Card className="shadow-lg"><CardContent className="p-0"><div className="transform scale-[0.6] origin-top-left" style={{ width: '166.67%' }}><ReceiptTemplatePreview settings={settings} /></div></CardContent></Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {cropFile && (
        <ImageCropper file={cropFile} onCrop={handleCrop} onCancel={() => { setCropFile(null); setCropTarget(null); }} />
      )}
    </div>
  );
};

export default InvoiceTemplateSettings;
