import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, RotateCcw, AlignLeft, AlignCenter, AlignRight, Type, Image as ImageIcon, Upload, X, Home, Globe } from "lucide-react";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageCropper } from "@/components/ImageCropper";

// 40+ Fonts categorized
const FONTS = {
  "Elegant/Serif": [
    "Playfair Display",
    "Merriweather",
    "Lora",
    "Cormorant Garamond",
    "Libre Baskerville",
    "Crimson Text",
    "EB Garamond",
    "Spectral"
  ],
  "Modern/Sans": [
    "Montserrat",
    "Raleway",
    "Poppins",
    "Open Sans",
    "Roboto",
    "Lato",
    "Inter",
    "Nunito",
    "Quicksand",
    "Source Sans Pro"
  ],
  "Bold/Display": [
    "Oswald",
    "Bebas Neue",
    "Anton",
    "Archivo Black",
    "Righteous",
    "Passion One",
    "Teko",
    "Saira Condensed"
  ],
  "Decorative": [
    "Cinzel",
    "Abril Fatface",
    "Alfa Slab One",
    "Lobster Two",
    "Pacifico"
  ],
  "Script/Handwritten": [
    "Dancing Script",
    "Great Vibes",
    "Satisfy",
    "Sacramento",
    "Tangerine",
    "Kaushan Script"
  ],
  "Tech/Futuristic": [
    "Orbitron",
    "Rajdhani",
    "Exo 2",
    "Audiowide",
    "Electrolize",
    "Share Tech Mono"
  ],
  "Luxury": [
    "Cormorant",
    "Bodoni Moda",
    "Yeseva One"
  ]
};

const GRADIENT_PRESETS = [
  { name: "Sunset", colors: ["#FF6B6B", "#FFA500", "#FFD700"] },
  { name: "Ocean", colors: ["#00C9FF", "#0080FF", "#0040FF"] },
  { name: "Forest", colors: ["#56AB2F", "#A8E063"] },
  { name: "Lavender", colors: ["#9D50BB", "#6E48AA"] },
  { name: "Gold", colors: ["#FFD700", "#FFA500", "#FF8C00"] },
  { name: "Rose", colors: ["#FF6B9D", "#C44569"] },
  { name: "Mint", colors: ["#00F260", "#0575E6"] },
];

const ANIMATIONS = [
  "none",
  "shimmer",
  "pulse",
  "glow-pulse",
  "bounce",
  "float",
  "swing",
  "rubber-band",
  "jello",
  "heartbeat",
  "fade-in-out",
  "typing",
  "wave",
  "neon",
  "rainbow",
  "rotate-3d"
];

const VIPDesignSettings = () => {
  const navigate = useNavigate();
  const { settings, isLoading, updateSettings, isUpdating } = useBrandSettings();

  const [formData, setFormData] = useState({
    display_mode: 'text' as 'text' | 'image',
    brand_text: "SewaScaffoldingBali.com",
    brand_image_url: null as string | null,
    image_height: 40,
    image_max_width: 200,
    font_family: "Playfair Display",
    font_weight: "700",
    font_size: 24,
    letter_spacing: 0,
    text_transform: "none",
    text_align: "center",
    color_type: "gradient",
    solid_color: "#000000",
    gradient_type: "linear",
    gradient_colors: ["#667eea", "#764ba2", "#f093fb"],
    gradient_angle: 135,
    shadow_enabled: true,
    shadow_color: "#000000",
    shadow_x: 2,
    shadow_y: 2,
    shadow_blur: 4,
    glow_enabled: false,
    glow_color: "#ffffff",
    glow_blur: 10,
    outline_enabled: false,
    outline_color: "#000000",
    outline_width: 1,
    animation: "shimmer",
    // Sidebar settings
    sidebar_logo_url: null as string | null,
    sidebar_logo_height: 32,
    sidebar_logo_max_width: 150,
    sidebar_text: "Admin Area",
    sidebar_display_mode: "both" as "logo" | "text" | "both",
    // Favicon settings
    favicon_url: null as string | null,
    favicon_type: "svg"
  });
  
  const [sidebarUploading, setSidebarUploading] = useState(false);
  const [sidebarImagePreview, setSidebarImagePreview] = useState<string | null>(null);
  const [sidebarSelectedFile, setSidebarSelectedFile] = useState<File | null>(null);
  const [showSidebarCropper, setShowSidebarCropper] = useState(false);

  const [previewBg, setPreviewBg] = useState<"light" | "dark">("dark");
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [faviconUploading, setFaviconUploading] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        display_mode: settings.display_mode,
        brand_text: settings.brand_text,
        brand_image_url: settings.brand_image_url,
        image_height: settings.image_height,
        image_max_width: settings.image_max_width,
        font_family: settings.font_family,
        font_weight: settings.font_weight,
        font_size: settings.font_size,
        letter_spacing: settings.letter_spacing,
        text_transform: settings.text_transform,
        text_align: settings.text_align,
        color_type: settings.color_type,
        solid_color: settings.solid_color,
        gradient_type: settings.gradient_type,
        gradient_colors: settings.gradient_colors,
        gradient_angle: settings.gradient_angle,
        shadow_enabled: settings.shadow_enabled,
        shadow_color: settings.shadow_color,
        shadow_x: settings.shadow_x,
        shadow_y: settings.shadow_y,
        shadow_blur: settings.shadow_blur,
        glow_enabled: settings.glow_enabled,
        glow_color: settings.glow_color,
        glow_blur: settings.glow_blur,
        outline_enabled: settings.outline_enabled,
        outline_color: settings.outline_color,
        outline_width: settings.outline_width,
        animation: settings.animation,
        // Sidebar settings
        sidebar_logo_url: settings.sidebar_logo_url,
        sidebar_logo_height: settings.sidebar_logo_height || 32,
        sidebar_logo_max_width: settings.sidebar_logo_max_width || 150,
        sidebar_text: settings.sidebar_text || 'Admin Area',
        sidebar_display_mode: settings.sidebar_display_mode || 'both',
        // Favicon settings
        favicon_url: settings.favicon_url || null,
        favicon_type: settings.favicon_type || 'svg'
      });
      setImagePreview(settings.brand_image_url);
      setSidebarImagePreview(settings.sidebar_logo_url);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings(formData);
    toast.success("Design settings saved!");
  };

  const handleReset = () => {
    setFormData({
      display_mode: 'text',
      brand_text: "SewaScaffoldingBali.com",
      brand_image_url: null,
      image_height: 40,
      image_max_width: 200,
      font_family: "Playfair Display",
      font_weight: "700",
      font_size: 24,
      letter_spacing: 0,
      text_transform: "none",
      text_align: "center",
      color_type: "gradient",
      solid_color: "#000000",
      gradient_type: "linear",
      gradient_colors: ["#667eea", "#764ba2", "#f093fb"],
      gradient_angle: 135,
      shadow_enabled: true,
      shadow_color: "#000000",
      shadow_x: 2,
      shadow_y: 2,
      shadow_blur: 4,
      glow_enabled: false,
      glow_color: "#ffffff",
      glow_blur: 10,
      outline_enabled: false,
      outline_color: "#000000",
      outline_width: 1,
      animation: "shimmer",
      // Sidebar settings
      sidebar_logo_url: null,
      sidebar_logo_height: 32,
      sidebar_logo_max_width: 150,
      sidebar_text: "Admin Area",
      sidebar_display_mode: "both",
      // Favicon settings
      favicon_url: null,
      favicon_type: "svg"
    });
    setImagePreview(null);
    setSidebarImagePreview(null);
    toast.info("Reset to default values");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error("Format tidak didukung. Gunakan PNG, JPG, WebP, atau SVG");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File terlalu besar. Maksimal 5MB");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete old image if exists
      if (formData.brand_image_url) {
        const oldPath = formData.brand_image_url.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('brand-images').remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new image
      const fileExt = file.name.split('.').pop();
      const fileName = `brand-logo-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('brand-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('brand-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, brand_image_url: publicUrl });
      setImagePreview(publicUrl);
      toast.success("Gambar berhasil diupload!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Gagal upload gambar");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!formData.brand_image_url) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const oldPath = formData.brand_image_url.split('/').pop();
      if (oldPath) {
        await supabase.storage.from('brand-images').remove([`${user.id}/${oldPath}`]);
      }

      setFormData({ ...formData, brand_image_url: null });
      setImagePreview(null);
      toast.success("Gambar berhasil dihapus");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Gagal hapus gambar");
    }
  };

  // Sidebar Logo Upload Handler - shows cropper for non-SVG images
  const handleSidebarImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error("Format tidak didukung. Gunakan PNG, JPG, WebP, atau SVG");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File terlalu besar. Maksimal 5MB");
      return;
    }

    // SVG doesn't need cropping, upload directly
    if (file.type === 'image/svg+xml') {
      uploadSidebarImage(file);
      return;
    }

    // For other formats, show cropper
    setSidebarSelectedFile(file);
    setShowSidebarCropper(true);
  };

  // Handle cropped image
  const handleSidebarCropComplete = async (blob: Blob) => {
    setShowSidebarCropper(false);
    setSidebarSelectedFile(null);
    
    const file = new File([blob], "sidebar-logo.jpg", { type: "image/jpeg" });
    await uploadSidebarImage(file);
  };

  // Actual upload function
  const uploadSidebarImage = async (file: File) => {
    setSidebarUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete old image if exists
      if (formData.sidebar_logo_url) {
        const oldPath = formData.sidebar_logo_url.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('brand-images').remove([`${user.id}/${oldPath}`]);
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `sidebar-logo-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('brand-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('brand-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, sidebar_logo_url: publicUrl });
      setSidebarImagePreview(publicUrl);
      toast.success("Logo sidebar berhasil diupload!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Gagal upload logo sidebar");
    } finally {
      setSidebarUploading(false);
    }
  };

  const handleDeleteSidebarImage = async () => {
    if (!formData.sidebar_logo_url) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const oldPath = formData.sidebar_logo_url.split('/').pop();
      if (oldPath) {
        await supabase.storage.from('brand-images').remove([`${user.id}/${oldPath}`]);
      }

      setFormData({ ...formData, sidebar_logo_url: null });
      setSidebarImagePreview(null);
      toast.success("Logo sidebar berhasil dihapus");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Gagal hapus logo sidebar");
    }
  };

  // Favicon Upload Handler
  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!validTypes.includes(file.type)) {
      toast.error("Format tidak didukung. Gunakan ICO, PNG, JPG, atau SVG");
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      toast.error("File terlalu besar. Maksimal 1MB untuk favicon");
      return;
    }

    setFaviconUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete old favicon if exists
      if (formData.favicon_url) {
        const oldPath = formData.favicon_url.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('brand-images').remove([`${user.id}/${oldPath}`]);
        }
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `favicon-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('brand-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('brand-images')
        .getPublicUrl(filePath);

      setFormData({ 
        ...formData, 
        favicon_url: publicUrl,
        favicon_type: fileExt || 'png'
      });
      toast.success("Favicon berhasil diupload!");
    } catch (error: any) {
      console.error("Favicon upload error:", error);
      toast.error(error.message || "Gagal upload favicon");
    } finally {
      setFaviconUploading(false);
    }
  };

  const handleDeleteFavicon = async () => {
    if (!formData.favicon_url) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const oldPath = formData.favicon_url.split('/').pop();
      if (oldPath) {
        await supabase.storage.from('brand-images').remove([`${user.id}/${oldPath}`]);
      }

      setFormData({ ...formData, favicon_url: null, favicon_type: 'svg' });
      toast.success("Favicon berhasil dihapus, kembali ke default");
    } catch (error: any) {
      console.error("Delete favicon error:", error);
      toast.error(error.message || "Gagal hapus favicon");
    }
  };

  const getPreviewStyle = () => {
    const styles: React.CSSProperties = {
      fontFamily: formData.font_family,
      fontWeight: formData.font_weight,
      fontSize: `${formData.font_size}px`,
      letterSpacing: `${formData.letter_spacing}px`,
      textTransform: formData.text_transform as any,
      textAlign: formData.text_align as any,
    };

    // Color/Gradient
    if (formData.color_type === 'gradient') {
      const gradientColors = formData.gradient_colors.join(', ');
      styles.background = `${formData.gradient_type}-gradient(${formData.gradient_angle}deg, ${gradientColors})`;
      styles.WebkitBackgroundClip = 'text';
      styles.WebkitTextFillColor = 'transparent';
      styles.backgroundClip = 'text';
    } else {
      styles.color = formData.solid_color;
    }

    // Shadow
    if (formData.shadow_enabled) {
      styles.textShadow = `${formData.shadow_x}px ${formData.shadow_y}px ${formData.shadow_blur}px ${formData.shadow_color}`;
    }

    // Glow
    if (formData.glow_enabled) {
      const existingShadow = styles.textShadow || '';
      styles.textShadow = existingShadow 
        ? `${existingShadow}, 0 0 ${formData.glow_blur}px ${formData.glow_color}`
        : `0 0 ${formData.glow_blur}px ${formData.glow_color}`;
    }

    // Outline
    if (formData.outline_enabled) {
      styles.WebkitTextStroke = `${formData.outline_width}px ${formData.outline_color}`;
    }

    return styles;
  };

  const animationClass = formData.animation !== 'none' ? `brand-text-${formData.animation}` : '';

  if (isLoading) {
    return (
      <Layout>
        <div className="h-[calc(100vh-104px)] overflow-hidden flex flex-col p-0 md:p-6">
          <div className="flex items-center justify-center flex-1">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-104px)] overflow-hidden flex flex-col p-0 md:p-6">
        {/* Header */}
        <div className="shrink-0 mb-4 px-4 md:px-0">
          <Button
            variant="ghost"
            onClick={() => navigate("/vip/settings/admin")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin Settings
          </Button>
          <h1 className="text-2xl md:text-4xl font-bold mb-2">Setting Design VIP</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Customize your brand text appearance in the header
          </p>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
            {/* Live Preview */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Live Preview</h2>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={previewBg === "light" ? "default" : "outline"}
                    onClick={() => setPreviewBg("light")}
                  >
                    Light
                  </Button>
                  <Button
                    size="sm"
                    variant={previewBg === "dark" ? "default" : "outline"}
                    onClick={() => setPreviewBg("dark")}
                  >
                    Dark
                  </Button>
                </div>
              </div>
              <div
                className={`min-h-[200px] flex items-center justify-center rounded-lg border-2 p-8 ${
                  previewBg === "dark" 
                    ? "bg-gradient-to-br from-slate-900 to-slate-800" 
                    : "bg-gradient-to-br from-gray-50 to-gray-100"
                }`}
              >
                {formData.display_mode === 'image' && imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Brand Logo Preview"
                    style={{
                      height: `${formData.image_height}px`,
                      maxWidth: `${formData.image_max_width}px`,
                      objectFit: 'contain'
                    }}
                    className="transition-all duration-300"
                  />
                ) : (
                  <div
                    className={`font-bold ${animationClass}`}
                    style={getPreviewStyle()}
                  >
                    {formData.brand_text}
                  </div>
                )}
              </div>
            </Card>

            {/* Settings Form */}
            <div className="space-y-6">
              {/* Display Mode Toggle */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Display Mode</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormData({ ...formData, display_mode: 'text' })}
                    className={`p-4 rounded-lg border-2 transition-all hover:border-primary ${
                      formData.display_mode === 'text' ? 'border-primary bg-primary/10' : 'border-border'
                    }`}
                  >
                    <Type className="mx-auto h-8 w-8 mb-2" />
                    <div className="text-sm font-semibold">📝 TEKS</div>
                    <div className="text-xs text-muted-foreground">Customize text style</div>
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, display_mode: 'image' })}
                    className={`p-4 rounded-lg border-2 transition-all hover:border-primary ${
                      formData.display_mode === 'image' ? 'border-primary bg-primary/10' : 'border-border'
                    }`}
                  >
                    <ImageIcon className="mx-auto h-8 w-8 mb-2" />
                    <div className="text-sm font-semibold">🖼️ GAMBAR</div>
                    <div className="text-xs text-muted-foreground">Upload logo image</div>
                  </button>
                </div>
              </Card>

              {/* Image Upload (only visible when mode is 'image') */}
              {formData.display_mode === 'image' && (
                <>
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Upload Brand Image</h3>
                    <div className="space-y-4">
                      {!imagePreview ? (
                        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                          <input
                            type="file"
                            id="image-upload"
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={uploading}
                          />
                          <label htmlFor="image-upload" className="cursor-pointer">
                            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-sm font-medium mb-1">
                              {uploading ? "Uploading..." : "Click to upload or drag and drop"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              PNG, JPG, WebP, SVG (Max 5MB)
                            </p>
                          </label>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="relative border-2 border-border rounded-lg p-4 bg-muted/50">
                            <img
                              src={imagePreview}
                              alt="Brand Logo"
                              style={{
                                height: `${formData.image_height}px`,
                                maxWidth: `${formData.image_max_width}px`,
                                objectFit: 'contain'
                              }}
                              className="mx-auto"
                            />
                            <button
                              onClick={handleDeleteImage}
                              className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => document.getElementById('image-replace')?.click()}
                            disabled={uploading}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Replace Image
                          </Button>
                          <input
                            type="file"
                            id="image-replace"
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={uploading}
                          />
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Image Size Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <Label>Height: {formData.image_height}px</Label>
                        <Slider
                          value={[formData.image_height]}
                          onValueChange={(value) => setFormData({ ...formData, image_height: value[0] })}
                          min={20}
                          max={100}
                          step={5}
                        />
                      </div>
                      <div>
                        <Label>Max Width: {formData.image_max_width}px</Label>
                        <Slider
                          value={[formData.image_max_width]}
                          onValueChange={(value) => setFormData({ ...formData, image_max_width: value[0] })}
                          min={100}
                          max={400}
                          step={10}
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Alignment */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Alignment</h3>
                    <div className="flex gap-2">
                      <Button
                        variant={formData.text_align === 'left' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setFormData({ ...formData, text_align: 'left' })}
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={formData.text_align === 'center' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setFormData({ ...formData, text_align: 'center' })}
                      >
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={formData.text_align === 'right' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setFormData({ ...formData, text_align: 'right' })}
                      >
                        <AlignRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                </>
              )}

              {/* Text Settings (only visible when mode is 'text') */}
              {formData.display_mode === 'text' && (
                <>
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Text Settings</h3>
                    <div className="space-y-4">
                  <div>
                    <Label htmlFor="brand_text">Brand Text</Label>
                    <Input
                      id="brand_text"
                      value={formData.brand_text}
                      onChange={(e) => setFormData({ ...formData, brand_text: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="font_family">Font Family</Label>
                    <Select
                      value={formData.font_family}
                      onValueChange={(value) => setFormData({ ...formData, font_family: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[400px]">
                        {Object.entries(FONTS).map(([category, fonts]) => (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              {category}
                            </div>
                            {fonts.map((font) => (
                              <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                                {font}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="font_weight">Font Weight</Label>
                      <Select
                        value={formData.font_weight}
                        onValueChange={(value) => setFormData({ ...formData, font_weight: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="300">Light</SelectItem>
                          <SelectItem value="400">Normal</SelectItem>
                          <SelectItem value="700">Bold</SelectItem>
                          <SelectItem value="900">Black</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="text_transform">Text Transform</Label>
                      <Select
                        value={formData.text_transform}
                        onValueChange={(value) => setFormData({ ...formData, text_transform: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="uppercase">UPPERCASE</SelectItem>
                          <SelectItem value="lowercase">lowercase</SelectItem>
                          <SelectItem value="capitalize">Capitalize</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Font Size: {formData.font_size}px</Label>
                    <Slider
                      value={[formData.font_size]}
                      onValueChange={(value) => setFormData({ ...formData, font_size: value[0] })}
                      min={16}
                      max={72}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Letter Spacing: {formData.letter_spacing}px</Label>
                    <Slider
                      value={[formData.letter_spacing]}
                      onValueChange={(value) => setFormData({ ...formData, letter_spacing: value[0] })}
                      min={-2}
                      max={10}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="mb-3 block">Text Alignment</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={formData.text_align === "left" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormData({ ...formData, text_align: "left" })}
                        className="flex-1"
                      >
                        <AlignLeft className="h-4 w-4 mr-2" />
                        Left
                      </Button>
                      <Button
                        type="button"
                        variant={formData.text_align === "center" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormData({ ...formData, text_align: "center" })}
                        className="flex-1"
                      >
                        <AlignCenter className="h-4 w-4 mr-2" />
                        Center
                      </Button>
                      <Button
                        type="button"
                        variant={formData.text_align === "right" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormData({ ...formData, text_align: "right" })}
                        className="flex-1"
                      >
                        <AlignRight className="h-4 w-4 mr-2" />
                        Right
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Color Settings */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Color Settings</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Color Type</Label>
                    <Select
                      value={formData.color_type}
                      onValueChange={(value) => setFormData({ ...formData, color_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Solid Color</SelectItem>
                        <SelectItem value="gradient">Gradient</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.color_type === 'solid' ? (
                    <div>
                      <Label htmlFor="solid_color">Color</Label>
                      <Input
                        id="solid_color"
                        type="color"
                        value={formData.solid_color}
                        onChange={(e) => setFormData({ ...formData, solid_color: e.target.value })}
                        className="h-12"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Gradient Type</Label>
                          <Select
                            value={formData.gradient_type}
                            onValueChange={(value) => setFormData({ ...formData, gradient_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="linear">Linear</SelectItem>
                              <SelectItem value="radial">Radial</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Angle: {formData.gradient_angle}°</Label>
                          <Slider
                            value={[formData.gradient_angle]}
                            onValueChange={(value) => setFormData({ ...formData, gradient_angle: value[0] })}
                            min={0}
                            max={360}
                            step={15}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="mb-2 block">Gradient Presets</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {GRADIENT_PRESETS.map((preset) => (
                            <button
                              key={preset.name}
                              onClick={() => setFormData({ ...formData, gradient_colors: preset.colors })}
                              className="h-12 rounded border-2 hover:border-primary transition-colors"
                              style={{
                                background: `linear-gradient(135deg, ${preset.colors.join(', ')})`
                              }}
                              title={preset.name}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="mb-2 block">Gradient Colors</Label>
                        <div className="space-y-2">
                          {formData.gradient_colors.map((color, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                type="color"
                                value={color}
                                onChange={(e) => {
                                  const newColors = [...formData.gradient_colors];
                                  newColors[index] = e.target.value;
                                  setFormData({ ...formData, gradient_colors: newColors });
                                }}
                                className="h-10 w-20"
                              />
                              <Input
                                type="text"
                                value={color}
                                onChange={(e) => {
                                  const newColors = [...formData.gradient_colors];
                                  newColors[index] = e.target.value;
                                  setFormData({ ...formData, gradient_colors: newColors });
                                }}
                                className="flex-1"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Card>

              {/* Effects */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Effects</h3>
                <div className="space-y-4">
                  {/* Text Shadow */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="shadow_enabled">Text Shadow</Label>
                      <Switch
                        id="shadow_enabled"
                        checked={formData.shadow_enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, shadow_enabled: checked })}
                      />
                    </div>
                    {formData.shadow_enabled && (
                      <div className="space-y-3 pl-4">
                        <div>
                          <Label htmlFor="shadow_color">Shadow Color</Label>
                          <Input
                            id="shadow_color"
                            type="color"
                            value={formData.shadow_color}
                            onChange={(e) => setFormData({ ...formData, shadow_color: e.target.value })}
                            className="h-10"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label>X: {formData.shadow_x}px</Label>
                            <Slider
                              value={[formData.shadow_x]}
                              onValueChange={(value) => setFormData({ ...formData, shadow_x: value[0] })}
                              min={-10}
                              max={10}
                              step={1}
                            />
                          </div>
                          <div>
                            <Label>Y: {formData.shadow_y}px</Label>
                            <Slider
                              value={[formData.shadow_y]}
                              onValueChange={(value) => setFormData({ ...formData, shadow_y: value[0] })}
                              min={-10}
                              max={10}
                              step={1}
                            />
                          </div>
                          <div>
                            <Label>Blur: {formData.shadow_blur}px</Label>
                            <Slider
                              value={[formData.shadow_blur]}
                              onValueChange={(value) => setFormData({ ...formData, shadow_blur: value[0] })}
                              min={0}
                              max={20}
                              step={1}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Glow */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="glow_enabled">Glow Effect</Label>
                      <Switch
                        id="glow_enabled"
                        checked={formData.glow_enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, glow_enabled: checked })}
                      />
                    </div>
                    {formData.glow_enabled && (
                      <div className="space-y-3 pl-4">
                        <div>
                          <Label htmlFor="glow_color">Glow Color</Label>
                          <Input
                            id="glow_color"
                            type="color"
                            value={formData.glow_color}
                            onChange={(e) => setFormData({ ...formData, glow_color: e.target.value })}
                            className="h-10"
                          />
                        </div>
                        <div>
                          <Label>Blur: {formData.glow_blur}px</Label>
                          <Slider
                            value={[formData.glow_blur]}
                            onValueChange={(value) => setFormData({ ...formData, glow_blur: value[0] })}
                            min={0}
                            max={50}
                            step={1}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Outline */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="outline_enabled">Text Outline</Label>
                      <Switch
                        id="outline_enabled"
                        checked={formData.outline_enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, outline_enabled: checked })}
                      />
                    </div>
                    {formData.outline_enabled && (
                      <div className="space-y-3 pl-4">
                        <div>
                          <Label htmlFor="outline_color">Outline Color</Label>
                          <Input
                            id="outline_color"
                            type="color"
                            value={formData.outline_color}
                            onChange={(e) => setFormData({ ...formData, outline_color: e.target.value })}
                            className="h-10"
                          />
                        </div>
                        <div>
                          <Label>Width: {formData.outline_width}px</Label>
                          <Slider
                            value={[formData.outline_width]}
                            onValueChange={(value) => setFormData({ ...formData, outline_width: value[0] })}
                            min={1}
                            max={5}
                            step={0.5}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Animation */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Animation</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ANIMATIONS.map((anim) => (
                    <button
                      key={anim}
                      onClick={() => setFormData({ ...formData, animation: anim })}
                      className={`p-4 rounded-lg border-2 transition-all hover:border-primary ${
                        formData.animation === anim ? 'border-primary bg-primary/10' : 'border-border'
                      }`}
                    >
                      <div className={`text-2xl font-bold mb-1 ${anim !== 'none' ? `brand-text-${anim}` : ''}`}>
                        Aa
                      </div>
                      <div className="text-xs capitalize">{anim.replace('-', ' ')}</div>
                    </button>
                  ))}
                </div>
              </Card>
              </>
              )}

              {/* ============================================= */}
              {/* FAVICON SETTINGS */}
              {/* ============================================= */}
              <Separator className="my-6" />
              <h2 className="text-xl font-bold mb-4">🌐 Favicon Settings</h2>
              
              {/* Favicon Preview */}
              <Card className="p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Favicon Preview</h3>
                <div className="flex items-center gap-6">
                  <div className="space-y-2 text-center">
                    <p className="text-xs text-muted-foreground font-medium uppercase">32x32</p>
                    <div className="w-8 h-8 border-2 border-border rounded flex items-center justify-center bg-background overflow-hidden">
                      {formData.favicon_url ? (
                        <img src={formData.favicon_url} alt="Favicon" className="w-full h-full object-contain" />
                      ) : (
                        <Globe className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 text-center">
                    <p className="text-xs text-muted-foreground font-medium uppercase">64x64</p>
                    <div className="w-16 h-16 border-2 border-border rounded flex items-center justify-center bg-background overflow-hidden">
                      {formData.favicon_url ? (
                        <img src={formData.favicon_url} alt="Favicon" className="w-full h-full object-contain" />
                      ) : (
                        <Globe className="w-10 h-10 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">
                      {formData.favicon_url ? "Custom Favicon" : "Default Favicon"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formData.favicon_url 
                        ? `Format: ${formData.favicon_type?.toUpperCase() || 'PNG'}`
                        : "Menggunakan favicon default scaffolding"}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Favicon Upload */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Upload Favicon</h3>
                <div className="space-y-4">
                  {!formData.favicon_url ? (
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                      <input
                        type="file"
                        id="favicon-upload"
                        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/x-icon,.ico"
                        onChange={handleFaviconUpload}
                        className="hidden"
                        disabled={faviconUploading}
                      />
                      <label htmlFor="favicon-upload" className="cursor-pointer">
                        <Globe className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-sm font-medium mb-1">
                          {faviconUploading ? "Uploading..." : "Click to upload favicon"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ICO, PNG, JPG, SVG (Max 1MB)
                        </p>
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative border-2 border-border rounded-lg p-4 bg-muted/50 flex items-center justify-center">
                        <img
                          src={formData.favicon_url}
                          alt="Favicon"
                          className="w-16 h-16 object-contain"
                        />
                        <button
                          onClick={handleDeleteFavicon}
                          className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById('favicon-replace')?.click()}
                        disabled={faviconUploading}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Replace Favicon
                      </Button>
                      <input
                        type="file"
                        id="favicon-replace"
                        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/x-icon,.ico"
                        onChange={handleFaviconUpload}
                        className="hidden"
                        disabled={faviconUploading}
                      />
                    </div>
                  )}
                  <div className="bg-muted/50 rounded-lg p-4 text-sm">
                    <p className="font-medium mb-2">💡 Tips:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Ukuran rekomendasi: 32x32 atau 64x64 pixels</li>
                      <li>• Format terbaik: PNG atau ICO untuk kompatibilitas</li>
                      <li>• SVG juga didukung untuk favicon modern</li>
                      <li>• Favicon akan otomatis terupdate setelah save</li>
                    </ul>
                  </div>
                </div>
              </Card>

              {/* ============================================= */}
              {/* SIDEBAR LOGO SETTINGS */}
              {/* ============================================= */}
              <Separator className="my-6" />
              <h2 className="text-xl font-bold mb-4">⚙️ Sidebar Logo Settings</h2>
              
              {/* Sidebar Live Preview */}
              <Card className="p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Sidebar Preview</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Expanded State Preview */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase">Expanded</p>
                    <div className="bg-white border-2 border-slate-200 rounded-lg p-4 min-h-[60px] flex items-center">
                      <div className="flex items-center gap-3">
                        {(formData.sidebar_display_mode === 'logo' || formData.sidebar_display_mode === 'both') && sidebarImagePreview ? (
                          <img
                            src={sidebarImagePreview}
                            alt="Logo Preview"
                            style={{
                              height: `${formData.sidebar_logo_height}px`,
                              maxWidth: `${formData.sidebar_logo_max_width}px`,
                            }}
                            className="object-contain"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-[#487FFF] flex items-center justify-center shrink-0">
                            <Home className="h-4 w-4 text-white" />
                          </div>
                        )}
                        {(formData.sidebar_display_mode === 'text' || formData.sidebar_display_mode === 'both') && (
                          <h1 className="text-base font-semibold text-slate-800">
                            {formData.sidebar_text || 'Admin Area'}
                          </h1>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Collapsed State Preview */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase">Collapsed</p>
                    <div className="bg-white border-2 border-slate-200 rounded-lg p-4 min-h-[60px] flex items-center justify-center w-16">
                      {formData.sidebar_display_mode !== 'text' && sidebarImagePreview ? (
                        <img
                          src={sidebarImagePreview}
                          alt="Logo Preview"
                          style={{
                            height: `${Math.min(formData.sidebar_logo_height, 32)}px`,
                            maxWidth: '32px',
                          }}
                          className="object-contain"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-[#487FFF] flex items-center justify-center">
                          <Home className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Sidebar Display Mode */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Display Mode</h3>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setFormData({ ...formData, sidebar_display_mode: 'logo' })}
                    className={`p-4 rounded-lg border-2 transition-all hover:border-primary text-center ${
                      formData.sidebar_display_mode === 'logo' ? 'border-primary bg-primary/10' : 'border-border'
                    }`}
                  >
                    <ImageIcon className="mx-auto h-6 w-6 mb-2" />
                    <div className="text-sm font-semibold">🖼️ Logo Only</div>
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, sidebar_display_mode: 'text' })}
                    className={`p-4 rounded-lg border-2 transition-all hover:border-primary text-center ${
                      formData.sidebar_display_mode === 'text' ? 'border-primary bg-primary/10' : 'border-border'
                    }`}
                  >
                    <Type className="mx-auto h-6 w-6 mb-2" />
                    <div className="text-sm font-semibold">📝 Text Only</div>
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, sidebar_display_mode: 'both' })}
                    className={`p-4 rounded-lg border-2 transition-all hover:border-primary text-center ${
                      formData.sidebar_display_mode === 'both' ? 'border-primary bg-primary/10' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <ImageIcon className="h-5 w-5" />
                      <span>+</span>
                      <Type className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-semibold">🖼️+📝 Both</div>
                  </button>
                </div>
              </Card>

              {/* Sidebar Logo Upload */}
              {(formData.sidebar_display_mode === 'logo' || formData.sidebar_display_mode === 'both') && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Upload Sidebar Logo</h3>
                  <div className="space-y-4">
                    {!sidebarImagePreview ? (
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                        <input
                          type="file"
                          id="sidebar-image-upload"
                          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                          onChange={handleSidebarImageUpload}
                          className="hidden"
                          disabled={sidebarUploading}
                        />
                        <label htmlFor="sidebar-image-upload" className="cursor-pointer">
                          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-sm font-medium mb-1">
                            {sidebarUploading ? "Uploading..." : "Click to upload sidebar logo"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG, WebP, SVG (Max 5MB)
                          </p>
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="relative border-2 border-border rounded-lg p-4 bg-muted/50">
                          <img
                            src={sidebarImagePreview}
                            alt="Sidebar Logo"
                            style={{
                              height: `${formData.sidebar_logo_height}px`,
                              maxWidth: `${formData.sidebar_logo_max_width}px`,
                              objectFit: 'contain'
                            }}
                            className="mx-auto"
                          />
                          <button
                            onClick={handleDeleteSidebarImage}
                            className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => document.getElementById('sidebar-image-replace')?.click()}
                          disabled={sidebarUploading}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Replace Logo
                        </Button>
                        <input
                          type="file"
                          id="sidebar-image-replace"
                          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                          onChange={handleSidebarImageUpload}
                          className="hidden"
                          disabled={sidebarUploading}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Sidebar Logo Size Settings */}
              {(formData.sidebar_display_mode === 'logo' || formData.sidebar_display_mode === 'both') && sidebarImagePreview && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Logo Size</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Height: {formData.sidebar_logo_height}px</Label>
                      <Slider
                        value={[formData.sidebar_logo_height]}
                        onValueChange={(value) => setFormData({ ...formData, sidebar_logo_height: value[0] })}
                        min={16}
                        max={64}
                        step={2}
                      />
                    </div>
                    <div>
                      <Label>Max Width: {formData.sidebar_logo_max_width}px</Label>
                      <Slider
                        value={[formData.sidebar_logo_max_width]}
                        onValueChange={(value) => setFormData({ ...formData, sidebar_logo_max_width: value[0] })}
                        min={50}
                        max={200}
                        step={10}
                      />
                    </div>
                  </div>
                </Card>
              )}

              {/* Sidebar Text Settings */}
              {(formData.sidebar_display_mode === 'text' || formData.sidebar_display_mode === 'both') && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Sidebar Text</h3>
                  <div>
                    <Label htmlFor="sidebar_text">Text</Label>
                    <Input
                      id="sidebar_text"
                      value={formData.sidebar_text}
                      onChange={(e) => setFormData({ ...formData, sidebar_text: e.target.value })}
                      placeholder="Admin Area"
                    />
                  </div>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 sticky bottom-0 bg-background/95 backdrop-blur-sm py-4 border-t">
                <Button onClick={handleSave} disabled={isUpdating} className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  {isUpdating ? "Saving..." : "Save Settings"}
                </Button>
                <Button onClick={handleReset} variant="outline">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Image Cropper for Sidebar Logo */}
      {sidebarSelectedFile && showSidebarCropper && (
        <ImageCropper
          file={sidebarSelectedFile}
          onCrop={handleSidebarCropComplete}
          onCancel={() => {
            setShowSidebarCropper(false);
            setSidebarSelectedFile(null);
          }}
        />
      )}
    </Layout>
  );
};

export default VIPDesignSettings;
