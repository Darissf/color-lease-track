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
import { ArrowLeft, Save, RotateCcw, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { toast } from "sonner";

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
    brand_text: "SewaScaffoldingBali.com",
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
    animation: "shimmer"
  });

  const [previewBg, setPreviewBg] = useState<"light" | "dark">("dark");

  useEffect(() => {
    if (settings) {
      setFormData({
        brand_text: settings.brand_text,
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
        animation: settings.animation
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings(formData);
    toast.success("Design settings saved!");
  };

  const handleReset = () => {
    setFormData({
      brand_text: "SewaScaffoldingBali.com",
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
      animation: "shimmer"
    });
    toast.info("Reset to default values");
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
                <div
                  className={`font-bold ${animationClass}`}
                  style={getPreviewStyle()}
                >
                  {formData.brand_text}
                </div>
              </div>
            </Card>

            {/* Settings Form */}
            <div className="space-y-6">
              {/* Text Settings */}
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
    </Layout>
  );
};

export default VIPDesignSettings;
