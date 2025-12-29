import { cn } from "@/lib/utils";
import { TemplateSettings } from "@/components/template-settings/types";

interface DynamicStampProps {
  status: 'LUNAS' | 'BELUM_LUNAS';
  documentNumber: string;
  companyName: string;
  date: string;
  settings?: Partial<TemplateSettings>;
  className?: string;
}

export const DynamicStamp = ({
  status,
  documentNumber,
  companyName,
  date,
  settings,
  className,
}: DynamicStampProps) => {
  const isLunas = status === 'LUNAS';
  
  // Get settings with defaults
  const stampType = settings?.stamp_type || 'rectangle';
  const stampSize = settings?.stamp_size || 'md';
  const stampRotation = settings?.stamp_rotation ?? -8;
  const stampBorderWidth = settings?.stamp_border_width || 4;
  const stampBorderStyle = settings?.stamp_border_style || 'solid';
  const stampFontFamily = settings?.stamp_font_family || 'Courier New';
  const stampFontSize = settings?.stamp_font_size || 24;
  const stampOpacity = settings?.stamp_opacity || 80;
  const showDate = settings?.stamp_show_date !== false;
  const showDocNumber = settings?.stamp_show_document_number !== false;
  const showCompanyName = settings?.stamp_show_company_name !== false;
  
  const primaryColor = isLunas 
    ? (settings?.stamp_color_lunas || '#047857')
    : (settings?.stamp_color_belum_lunas || '#b91c1c');
  
  const sizeClasses = {
    sm: 'w-32 h-16',
    md: 'w-44 h-24',
    lg: 'w-56 h-28',
  };

  const sizeDimensions = {
    sm: { width: 160, height: 80, fontSize: stampFontSize * 0.75 },
    md: { width: 220, height: 120, fontSize: stampFontSize },
    lg: { width: 280, height: 140, fontSize: stampFontSize * 1.25 },
  };

  const dims = sizeDimensions[stampSize as keyof typeof sizeDimensions] || sizeDimensions.md;
  const uniqueId = `stamp-${Math.random().toString(36).substr(2, 9)}`;

  // Generate border dash array based on style
  const getStrokeDashArray = () => {
    switch (stampBorderStyle) {
      case 'dashed': return '10 5';
      case 'double': return 'none';
      default: return 'none';
    }
  };

  // Render rectangle stamp
  const renderRectangleStamp = () => (
    <svg
      viewBox={`0 0 ${dims.width} ${dims.height}`}
      className="w-full h-full"
      style={{ fontFamily: `'${stampFontFamily}', Courier, monospace` }}
    >
      <defs>
        <filter id={`${uniqueId}-grunge`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" seed="15"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
          <feGaussianBlur in="displaced" stdDeviation="0.3" result="blurred"/>
          <feComposite in="blurred" in2="SourceGraphic" operator="in"/>
        </filter>
      </defs>

      <g filter={`url(#${uniqueId}-grunge)`}>
        {/* Outer border */}
        <rect
          x={stampBorderWidth / 2}
          y={stampBorderWidth / 2}
          width={dims.width - stampBorderWidth}
          height={dims.height - stampBorderWidth}
          fill="none"
          stroke={primaryColor}
          strokeWidth={stampBorderWidth}
          strokeDasharray={getStrokeDashArray()}
          rx="5"
          opacity="0.95"
        />
        
        {/* Inner border for double style */}
        {stampBorderStyle === 'double' && (
          <rect
            x={stampBorderWidth * 2}
            y={stampBorderWidth * 2}
            width={dims.width - stampBorderWidth * 4}
            height={dims.height - stampBorderWidth * 4}
            fill="none"
            stroke={primaryColor}
            strokeWidth={stampBorderWidth / 2}
            rx="3"
            opacity="0.7"
          />
        )}

        {/* Inner dashed border */}
        <rect
          x={stampBorderWidth * 1.5 + 4}
          y={stampBorderWidth * 1.5 + 4}
          width={dims.width - stampBorderWidth * 3 - 8}
          height={dims.height - stampBorderWidth * 3 - 8}
          fill="none"
          stroke={primaryColor}
          strokeWidth="1.5"
          strokeDasharray="10 3"
          rx="3"
          opacity="0.7"
        />

        {/* Corner ornaments */}
        {['8,8', `${dims.width - 8},8`, `8,${dims.height - 8}`, `${dims.width - 8},${dims.height - 8}`].map((pos, i) => (
          <text key={i} x={pos.split(',')[0]} y={parseInt(pos.split(',')[1]) + 10} fontSize="10" fill={primaryColor} opacity="0.9" textAnchor="middle">★</text>
        ))}

        {/* Status text */}
        <text
          x={dims.width / 2}
          y={dims.height * 0.35}
          fontSize={dims.fontSize}
          fill={primaryColor}
          fontWeight="900"
          textAnchor="middle"
          dominantBaseline="middle"
          letterSpacing="3"
        >
          {isLunas ? 'LUNAS' : 'BELUM LUNAS'}
        </text>

        {/* Document number */}
        {showDocNumber && (
          <text
            x={dims.width / 2}
            y={dims.height * 0.52}
            fontSize={dims.fontSize * 0.45}
            fill={primaryColor}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {`No. ${documentNumber}`}
          </text>
        )}

        {/* Date */}
        {showDate && (
          <text
            x={dims.width / 2}
            y={dims.height * 0.66}
            fontSize={dims.fontSize * 0.4}
            fill={primaryColor}
            fontWeight="600"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {date}
          </text>
        )}

        {/* Company name */}
        {showCompanyName && (
          <text
            x={dims.width / 2}
            y={dims.height * 0.82}
            fontSize={dims.fontSize * 0.4}
            fill={primaryColor}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {companyName.toUpperCase()}
          </text>
        )}

        {/* Ink spots */}
        <g opacity="0.12">
          <circle cx={dims.width * 0.15} cy={dims.height * 0.3} r="3" fill={primaryColor}/>
          <circle cx={dims.width * 0.85} cy={dims.height * 0.35} r="2.5" fill={primaryColor}/>
          <circle cx={dims.width * 0.18} cy={dims.height * 0.75} r="2" fill={primaryColor}/>
          <circle cx={dims.width * 0.82} cy={dims.height * 0.7} r="1.5" fill={primaryColor}/>
        </g>
      </g>
    </svg>
  );

  // Render circle stamp
  const renderCircleStamp = () => {
    const radius = Math.min(dims.width, dims.height) / 2 - stampBorderWidth;
    const cx = dims.width / 2;
    const cy = dims.height / 2;
    
    return (
      <svg
        viewBox={`0 0 ${dims.width} ${dims.height}`}
        className="w-full h-full"
        style={{ fontFamily: `'${stampFontFamily}', Courier, monospace` }}
      >
        <defs>
          <filter id={`${uniqueId}-grunge`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" seed="15"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>

        <g filter={`url(#${uniqueId}-grunge)`}>
          {/* Outer circle */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={primaryColor}
            strokeWidth={stampBorderWidth}
            strokeDasharray={getStrokeDashArray()}
            opacity="0.95"
          />
          
          {/* Inner circle */}
          <circle
            cx={cx}
            cy={cy}
            r={radius - 8}
            fill="none"
            stroke={primaryColor}
            strokeWidth="1.5"
            strokeDasharray="6 3"
            opacity="0.7"
          />

          {/* Status text */}
          <text
            x={cx}
            y={cy - 8}
            fontSize={dims.fontSize * 0.8}
            fill={primaryColor}
            fontWeight="900"
            textAnchor="middle"
            dominantBaseline="middle"
            letterSpacing="2"
          >
            {isLunas ? 'LUNAS' : 'BELUM'}
          </text>
          
          {!isLunas && (
            <text
              x={cx}
              y={cy + 8}
              fontSize={dims.fontSize * 0.6}
              fill={primaryColor}
              fontWeight="900"
              textAnchor="middle"
              dominantBaseline="middle"
              letterSpacing="2"
            >
              LUNAS
            </text>
          )}

          {/* Date */}
          {showDate && (
            <text
              x={cx}
              y={cy + (isLunas ? 12 : 24)}
              fontSize={dims.fontSize * 0.35}
              fill={primaryColor}
              fontWeight="600"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {date}
            </text>
          )}
        </g>
      </svg>
    );
  };

  // Render oval stamp
  const renderOvalStamp = () => (
    <svg
      viewBox={`0 0 ${dims.width} ${dims.height}`}
      className="w-full h-full"
      style={{ fontFamily: `'${stampFontFamily}', Courier, monospace` }}
    >
      <defs>
        <filter id={`${uniqueId}-grunge`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" seed="15"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>

      <g filter={`url(#${uniqueId}-grunge)`}>
        {/* Outer ellipse */}
        <ellipse
          cx={dims.width / 2}
          cy={dims.height / 2}
          rx={dims.width / 2 - stampBorderWidth}
          ry={dims.height / 2 - stampBorderWidth}
          fill="none"
          stroke={primaryColor}
          strokeWidth={stampBorderWidth}
          strokeDasharray={getStrokeDashArray()}
          opacity="0.95"
        />
        
        {/* Inner ellipse */}
        <ellipse
          cx={dims.width / 2}
          cy={dims.height / 2}
          rx={dims.width / 2 - stampBorderWidth - 8}
          ry={dims.height / 2 - stampBorderWidth - 6}
          fill="none"
          stroke={primaryColor}
          strokeWidth="1.5"
          strokeDasharray="8 4"
          opacity="0.7"
        />

        {/* Status text */}
        <text
          x={dims.width / 2}
          y={dims.height * 0.4}
          fontSize={dims.fontSize}
          fill={primaryColor}
          fontWeight="900"
          textAnchor="middle"
          dominantBaseline="middle"
          letterSpacing="3"
        >
          {isLunas ? 'LUNAS' : 'BELUM LUNAS'}
        </text>

        {/* Date and company */}
        {showDate && (
          <text
            x={dims.width / 2}
            y={dims.height * 0.6}
            fontSize={dims.fontSize * 0.4}
            fill={primaryColor}
            fontWeight="600"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {date}
          </text>
        )}

        {showCompanyName && (
          <text
            x={dims.width / 2}
            y={dims.height * 0.78}
            fontSize={dims.fontSize * 0.35}
            fill={primaryColor}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {companyName.toUpperCase().substring(0, 20)}
          </text>
        )}
      </g>
    </svg>
  );

  const renderStamp = () => {
    switch (stampType) {
      case 'circle': return renderCircleStamp();
      case 'oval': return renderOvalStamp();
      default: return renderRectangleStamp();
    }
  };

  return (
    <div
      className={cn(
        "relative select-none",
        sizeClasses[stampSize as keyof typeof sizeClasses] || sizeClasses.md,
        className
      )}
      style={{
        transform: `rotate(${stampRotation}deg)`,
        opacity: stampOpacity / 100,
      }}
    >
      {renderStamp()}
    </div>
  );
};
