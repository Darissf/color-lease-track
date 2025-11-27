import { useBrandSettings } from "@/hooks/useBrandSettings";
import { cn } from "@/lib/utils";

export const BrandText = () => {
  const { settings, isLoading } = useBrandSettings();

  if (isLoading || !settings) {
    return (
      <div className="text-xl font-bold text-foreground">
        SewaScaffoldingBali.com
      </div>
    );
  }

  const getTextStyle = () => {
    const styles: React.CSSProperties = {
      fontFamily: settings.font_family,
      fontWeight: settings.font_weight,
      fontSize: `${settings.font_size}px`,
      letterSpacing: `${settings.letter_spacing}px`,
      textTransform: settings.text_transform as any,
    };

    // Color/Gradient
    if (settings.color_type === 'gradient') {
      const gradientColors = settings.gradient_colors.join(', ');
      styles.background = `${settings.gradient_type}-gradient(${settings.gradient_angle}deg, ${gradientColors})`;
      styles.WebkitBackgroundClip = 'text';
      styles.WebkitTextFillColor = 'transparent';
      styles.backgroundClip = 'text';
    } else {
      styles.color = settings.solid_color;
    }

    // Shadow
    if (settings.shadow_enabled) {
      styles.textShadow = `${settings.shadow_x}px ${settings.shadow_y}px ${settings.shadow_blur}px ${settings.shadow_color}`;
    }

    // Glow
    if (settings.glow_enabled) {
      const existingShadow = styles.textShadow || '';
      styles.textShadow = existingShadow 
        ? `${existingShadow}, 0 0 ${settings.glow_blur}px ${settings.glow_color}`
        : `0 0 ${settings.glow_blur}px ${settings.glow_color}`;
    }

    // Outline
    if (settings.outline_enabled) {
      styles.WebkitTextStroke = `${settings.outline_width}px ${settings.outline_color}`;
    }

    return styles;
  };

  const animationClass = settings.animation !== 'none' ? `brand-text-${settings.animation}` : '';

  const alignmentClass = 
    settings.text_align === 'left' ? 'text-left' :
    settings.text_align === 'right' ? 'text-right' :
    'text-center';

  return (
    <div
      className={cn("font-bold whitespace-nowrap", animationClass, alignmentClass)}
      style={getTextStyle()}
    >
      {settings.brand_text}
    </div>
  );
};
