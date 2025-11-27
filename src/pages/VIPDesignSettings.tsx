import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useBrandSettings, BrandSettings } from "@/hooks/useBrandSettings";
import { toast } from "sonner";
import { ArrowLeft, Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FONTS = [
  "Playfair Display", "Montserrat", "Raleway", "Oswald", "Merriweather",
  "Lora", "Bebas Neue", "Cinzel", "Great Vibes", "Abril Fatface",
  "Righteous", "Permanent Marker", "Lobster", "Pacifico", "Dancing Script"
];

const GRADIENT_PRESETS = [
  { name: "Gold Shine", colors: ["#F5E6A8", "#D4AF37"] },
  { name: "Ocean Blue", colors: ["#00D4FF", "#0099CC"] },
  { name: "Sunset", colors: ["#FF6B6B", "#FFA500"] },
  { name: "Purple Dream", colors: ["#9B59B6", "#E74C3C"] },
  { name: "Green Fresh", colors: ["#2ECC71", "#27AE60"] },
  { name: "Pink Candy", colors: ["#FF69B4", "#FF1493"] },
];

const ANIMATIONS = [
  { value: "none", label: "None" },
  { value: "shimmer", label: "Shimmer" },
  { value: "pulse", label: "Pulse" },
  { value: "glow-pulse", label: "Glow Pulse" },
  { value: "bounce", label: "Bounce" },
];

export default function VIPDesignSettings() {
  const navigate = useNavigate();
  const { settings, updateSettings, isUpdating } = useBrandSettings();
  const [previewBg, setPreviewBg] = useState<'light' | 'dark'>('dark');

  const [formData, setFormData] = useState<Partial<BrandSettings>>(
    settings || {
      brand_text: "SewaScaffoldingBali.com",
      font_family: "Playfair Display",
      font_weight: "700",
      font_size: 24,
      letter_spacing: 0,
      text_transform: "none",
      color_type: "solid",
      solid_color: "#F5E6A8",
      gradient_type: "linear",
      gradient_colors: ["#F5E6A8", "#D4AF37"],
      gradient_angle: 90,
      shadow_enabled: true,
      shadow_color: "rgba(0,0,0,0.3)",
      shadow_x: 2,
      shadow_y: 2,
      shadow_blur: 8,
      glow_enabled: false,
      glow_color: "#F5E6A8",
      glow_blur: 20,
      outline_enabled: false,
      outline_color: "#000000",
      outline_width: 1,
      animation: "none",
    }
  );

  const handleSave = () => {
    updateSettings(formData, {
      onSuccess: () => {
        toast.success("Settings saved successfully!");
      },
      onError: () => {
        toast.error("Failed to save settings");
      },
    });
  };

  const handleReset = () => {
    setFormData({
      brand_text: "SewaScaffoldingBali.com",
      font_family: "Playfair Display",
      font_weight: "700",
      font_size: 24,
      letter_spacing: 0,
      text_transform: "none",
      color_type: "solid",
      solid_color: "#F5E6A8",
      gradient_type: "linear",
      gradient_colors: ["#F5E6A8", "#D4AF37"],
      gradient_angle: 90,
      shadow_enabled: true,
      shadow_color: "rgba(0,0,0,0.3)",
      shadow_x: 2,
      shadow_y: 2,
      shadow_blur: 8,
      glow_enabled: false,
      glow_color: "#F5E6A8",
      glow_blur: 20,
      outline_enabled: false,
      outline_color: "#000000",
      outline_width: 1,
      animation: "none",
    });
    toast.info("Settings reset to default");
  };

  const getPreviewStyle = () => {
    const styles: React.CSSProperties = {
      fontFamily: formData.font_family,
      fontWeight: formData.font_weight,
      fontSize: `${formData.font_size}px`,
      letterSpacing: `${formData.letter_spacing}px`,
      textTransform: formData.text_transform as any,
    };

    if (formData.color_type === 'gradient' && formData.gradient_colors) {
      const gradientColors = formData.gradient_colors.join(', ');
      styles.background = `${formData.gradient_type}-gradient(${formData.gradient_angle}deg, ${gradientColors})`;
      styles.WebkitBackgroundClip = 'text';
      styles.WebkitTextFillColor = 'transparent';
      styles.backgroundClip = 'text';
    } else {
      styles.color = formData.solid_color;
    }

    if (formData.shadow_enabled) {
      styles.textShadow = `${formData.shadow_x}px ${formData.shadow_y}px ${formData.shadow_blur}px ${formData.shadow_color}`;
    }

    if (formData.glow_enabled) {
      const existingShadow = styles.textShadow || '';
      styles.textShadow = existingShadow 
        ? `${existingShadow}, 0 0 ${formData.glow_blur}px ${formData.glow_color}`
        : `0 0 ${formData.glow_blur}px ${formData.glow_color}`;
    }

    if (formData.outline_enabled) {
      styles.WebkitTextStroke = `${formData.outline_width}px ${formData.outline_color}`;
    }

    return styles;
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-104px)] overflow-hidden flex flex-col p-0 md:p-6">
        {/* Header */}
        <div className="shrink-0 px-4 py-2 md:px-0 md:py-0 mb-2 md:mb-4">
          <div className="flex items-center gap-3 mb-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/vip/settings/admin')}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl md:text-4xl font-bold text-foreground">Setting Design VIP</h1>
          </div>
          <p className="text-xs md:text-base text-muted-foreground ml-11 md:ml-14">
            Customize brand text yang tampil di header VIP pages
          </p>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-2 md:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Live Preview */}
            <Card className="p-4 md:p-6 glass-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg md:text-xl font-semibold">Live Preview</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewBg(previewBg === 'light' ? 'dark' : 'light')}
                >
                  {previewBg === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>
              </div>
              <div
                className={`rounded-lg p-8 flex items-center justify-center min-h-[200px] ${
                  previewBg === 'light' ? 'bg-white' : 'bg-slate-900'
                }`}
              >
                <div
                  className={formData.animation !== 'none' ? `brand-text-${formData.animation}` : ''}
                  style={getPreviewStyle()}
                >
                  {formData.brand_text}
                </div>
              </div>
            </Card>

            {/* Settings Form */}
            <div className="space-y-4 md:space-y-6">
              {/* Text Settings */}
              <Card className="p-4 md:p-6 glass-card">
                <h3 className="text-base md:text-lg font-semibold mb-4">Text Settings</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Brand Text</Label>
                    <Input
                      value={formData.brand_text}
                      onChange={(e) => setFormData({ ...formData, brand_text: e.target.value })}
                      placeholder="SewaScaffoldingBali.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Font Family</Label>
                      <Select
                        value={formData.font_family}
                        onValueChange={(value) => setFormData({ ...formData, font_family: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONTS.map((font) => (
                            <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                              {font}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Weight</Label>
                      <Select
                        value={formData.font_weight}
                        onValueChange={(value) => setFormData({ ...formData, font_weight: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="400">Normal</SelectItem>
                          <SelectItem value="500">Medium</SelectItem>
                          <SelectItem value="600">Semi Bold</SelectItem>
                          <SelectItem value="700">Bold</SelectItem>
                          <SelectItem value="800">Extra Bold</SelectItem>
                          <SelectItem value="900">Black</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Font Size: {formData.font_size}px</Label>
                    <Slider
                      value={[formData.font_size || 24]}
                      onValueChange={([value]) => setFormData({ ...formData, font_size: value })}
                      min={12}
                      max={48}
                      step={1}
                    />
                  </div>

                  <div>
                    <Label>Letter Spacing: {formData.letter_spacing}px</Label>
                    <Slider
                      value={[formData.letter_spacing || 0]}
                      onValueChange={([value]) => setFormData({ ...formData, letter_spacing: value })}
                      min={-2}
                      max={10}
                      step={0.5}
                    />
                  </div>

                  <div>
                    <Label>Text Transform</Label>
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
              </Card>

              {/* Color Settings */}
              <Card className="p-4 md:p-6 glass-card">
                <h3 className="text-base md:text-lg font-semibold mb-4">Color Settings</h3>
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
                      <Label>Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={formData.solid_color}
                          onChange={(e) => setFormData({ ...formData, solid_color: e.target.value })}
                          className="w-20 h-10"
                        />
                        <Input
                          value={formData.solid_color}
                          onChange={(e) => setFormData({ ...formData, solid_color: e.target.value })}
                          placeholder="#F5E6A8"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
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
                        <Label>Gradient Presets</Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {GRADIENT_PRESETS.map((preset) => (
                            <button
                              key={preset.name}
                              onClick={() =>
                                setFormData({ ...formData, gradient_colors: preset.colors })
                              }
                              className="h-10 rounded border-2 border-border hover:border-primary transition-colors"
                              style={{
                                background: `linear-gradient(90deg, ${preset.colors.join(', ')})`,
                              }}
                              title={preset.name}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Color 1</Label>
                          <Input
                            type="color"
                            value={formData.gradient_colors?.[0] || '#F5E6A8'}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                gradient_colors: [e.target.value, formData.gradient_colors?.[1] || '#D4AF37'],
                              })
                            }
                            className="w-full h-10"
                          />
                        </div>
                        <div>
                          <Label>Color 2</Label>
                          <Input
                            type="color"
                            value={formData.gradient_colors?.[1] || '#D4AF37'}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                gradient_colors: [formData.gradient_colors?.[0] || '#F5E6A8', e.target.value],
                              })
                            }
                            className="w-full h-10"
                          />
                        </div>
                      </div>

                      {formData.gradient_type === 'linear' && (
                        <div>
                          <Label>Gradient Angle: {formData.gradient_angle}°</Label>
                          <Slider
                            value={[formData.gradient_angle || 90]}
                            onValueChange={([value]) => setFormData({ ...formData, gradient_angle: value })}
                            min={0}
                            max={360}
                            step={15}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card>

              {/* Effects */}
              <Card className="p-4 md:p-6 glass-card">
                <h3 className="text-base md:text-lg font-semibold mb-4">Effects</h3>
                <div className="space-y-4">
                  {/* Shadow */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Text Shadow</Label>
                      <Switch
                        checked={formData.shadow_enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, shadow_enabled: checked })}
                      />
                    </div>
                    {formData.shadow_enabled && (
                      <div className="space-y-3 pl-4 border-l-2 border-border">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">X: {formData.shadow_x}px</Label>
                            <Slider
                              value={[formData.shadow_x || 2]}
                              onValueChange={([value]) => setFormData({ ...formData, shadow_x: value })}
                              min={-10}
                              max={10}
                              step={1}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Y: {formData.shadow_y}px</Label>
                            <Slider
                              value={[formData.shadow_y || 2]}
                              onValueChange={([value]) => setFormData({ ...formData, shadow_y: value })}
                              min={-10}
                              max={10}
                              step={1}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Blur: {formData.shadow_blur}px</Label>
                            <Slider
                              value={[formData.shadow_blur || 8]}
                              onValueChange={([value]) => setFormData({ ...formData, shadow_blur: value })}
                              min={0}
                              max={30}
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
                      <Label>Glow Effect</Label>
                      <Switch
                        checked={formData.glow_enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, glow_enabled: checked })}
                      />
                    </div>
                    {formData.glow_enabled && (
                      <div className="space-y-3 pl-4 border-l-2 border-border">
                        <div>
                          <Label className="text-xs">Glow Color</Label>
                          <Input
                            type="color"
                            value={formData.glow_color}
                            onChange={(e) => setFormData({ ...formData, glow_color: e.target.value })}
                            className="w-full h-10"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Blur: {formData.glow_blur}px</Label>
                          <Slider
                            value={[formData.glow_blur || 20]}
                            onValueChange={([value]) => setFormData({ ...formData, glow_blur: value })}
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
                      <Label>Text Outline</Label>
                      <Switch
                        checked={formData.outline_enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, outline_enabled: checked })}
                      />
                    </div>
                    {formData.outline_enabled && (
                      <div className="space-y-3 pl-4 border-l-2 border-border">
                        <div>
                          <Label className="text-xs">Outline Color</Label>
                          <Input
                            type="color"
                            value={formData.outline_color}
                            onChange={(e) => setFormData({ ...formData, outline_color: e.target.value })}
                            className="w-full h-10"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Width: {formData.outline_width}px</Label>
                          <Slider
                            value={[formData.outline_width || 1]}
                            onValueChange={([value]) => setFormData({ ...formData, outline_width: value })}
                            min={1}
                            max={5}
                            step={1}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Animation */}
              <Card className="p-4 md:p-6 glass-card">
                <h3 className="text-base md:text-lg font-semibold mb-4">Animation</h3>
                <Select
                  value={formData.animation}
                  onValueChange={(value) => setFormData({ ...formData, animation: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANIMATIONS.map((anim) => (
                      <SelectItem key={anim.value} value={anim.value}>
                        {anim.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={isUpdating} className="flex-1">
                  {isUpdating ? "Saving..." : "Save Settings"}
                </Button>
                <Button onClick={handleReset} variant="outline">
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
