import { cn } from "@/lib/utils";

interface DynamicStampProps {
  status: 'LUNAS' | 'BELUM_LUNAS';
  documentNumber: string;
  companyName: string;
  date: string;
  variant?: 'circular' | 'oval';
  className?: string;
}

export const DynamicStamp = ({
  status,
  documentNumber,
  companyName,
  date,
  variant = 'circular',
  className,
}: DynamicStampProps) => {
  const isLunas = status === 'LUNAS';
  
  const primaryColor = isLunas ? '#047857' : '#c2410c';
  const secondaryColor = isLunas ? '#059669' : '#ea580c';
  
  // Generate stars for decoration
  const starCount = 12;
  const stars = Array.from({ length: starCount }, (_, i) => {
    const angle = (i * 360) / starCount - 90;
    const radius = variant === 'oval' ? 42 : 44;
    const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
    const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
    return { x, y, angle };
  });

  return (
    <div
      className={cn(
        "relative select-none",
        variant === 'oval' ? "w-40 h-32" : "w-36 h-36",
        className
      )}
      style={{
        transform: 'rotate(-12deg)',
        filter: 'url(#grunge)',
      }}
    >
      {/* SVG Filter for grunge effect */}
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="grunge">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{
          fontFamily: "'Courier New', Courier, monospace",
        }}
      >
        {/* Outer decorative border */}
        <ellipse
          cx="50"
          cy="50"
          rx={variant === 'oval' ? 48 : 47}
          ry="47"
          fill="none"
          stroke={primaryColor}
          strokeWidth="2.5"
          strokeDasharray="1 3"
          opacity="0.7"
        />
        
        {/* Main outer border */}
        <ellipse
          cx="50"
          cy="50"
          rx={variant === 'oval' ? 44 : 43}
          ry="43"
          fill="none"
          stroke={primaryColor}
          strokeWidth="3"
          opacity="0.9"
        />
        
        {/* Inner border */}
        <ellipse
          cx="50"
          cy="50"
          rx={variant === 'oval' ? 40 : 39}
          ry="39"
          fill="none"
          stroke={primaryColor}
          strokeWidth="1.5"
          opacity="0.8"
        />

        {/* Stars decoration around the border */}
        {stars.map((star, i) => (
          <text
            key={i}
            x={star.x}
            y={star.y}
            fontSize="4"
            fill={primaryColor}
            textAnchor="middle"
            dominantBaseline="middle"
            opacity="0.85"
          >
            ★
          </text>
        ))}

        {/* Top arc text - Company name */}
        <defs>
          <path
            id="topArc"
            d={variant === 'oval' 
              ? "M 12,50 A 38,38 0 0,1 88,50" 
              : "M 14,50 A 36,36 0 0,1 86,50"
            }
            fill="none"
          />
          <path
            id="bottomArc"
            d={variant === 'oval'
              ? "M 88,50 A 38,38 0 0,1 12,50"
              : "M 86,50 A 36,36 0 0,1 14,50"
            }
            fill="none"
          />
        </defs>
        
        <text
          fontSize="5"
          fill={primaryColor}
          fontWeight="bold"
          letterSpacing="1"
          opacity="0.9"
        >
          <textPath href="#topArc" startOffset="50%" textAnchor="middle">
            {companyName.toUpperCase().slice(0, 25)}
          </textPath>
        </text>

        {/* Center content box */}
        <rect
          x="20"
          y="38"
          width="60"
          height="24"
          fill="none"
          stroke={primaryColor}
          strokeWidth="1"
          rx="2"
          opacity="0.6"
        />

        {/* Status text */}
        <text
          x="50"
          y="48"
          fontSize={isLunas ? "10" : "7"}
          fill={primaryColor}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
          letterSpacing="2"
        >
          {isLunas ? '✓ LUNAS' : 'BELUM LUNAS'}
        </text>

        {/* Document number */}
        <text
          x="50"
          y="58"
          fontSize="5"
          fill={secondaryColor}
          fontWeight="600"
          textAnchor="middle"
          dominantBaseline="middle"
          opacity="0.95"
        >
          {documentNumber}
        </text>

        {/* Bottom arc text - Date */}
        <text
          fontSize="5"
          fill={primaryColor}
          fontWeight="600"
          letterSpacing="0.5"
          opacity="0.85"
        >
          <textPath href="#bottomArc" startOffset="50%" textAnchor="middle">
            {date}
          </textPath>
        </text>

        {/* Grunge overlay effect using circles */}
        <g opacity="0.15">
          <circle cx="25" cy="30" r="3" fill={primaryColor} />
          <circle cx="75" cy="35" r="2" fill={primaryColor} />
          <circle cx="30" cy="70" r="2.5" fill={primaryColor} />
          <circle cx="70" cy="68" r="1.5" fill={primaryColor} />
          <circle cx="45" cy="25" r="1" fill={primaryColor} />
          <circle cx="55" cy="75" r="1.8" fill={primaryColor} />
          <circle cx="20" cy="50" r="1.2" fill={primaryColor} />
          <circle cx="80" cy="52" r="1" fill={primaryColor} />
        </g>

        {/* Additional texture lines */}
        <g opacity="0.1" stroke={primaryColor} strokeWidth="0.3">
          <line x1="15" y1="45" x2="25" y2="47" />
          <line x1="75" y1="53" x2="85" y2="55" />
          <line x1="30" y1="75" x2="40" y2="73" />
          <line x1="60" y1="25" x2="70" y2="27" />
        </g>
      </svg>

      {/* Additional CSS-based grunge overlay */}
      <div 
        className="absolute inset-0 pointer-events-none rounded-full"
        style={{
          background: `radial-gradient(ellipse at 30% 40%, transparent 0%, transparent 50%, ${primaryColor}08 100%)`,
          mixBlendMode: 'multiply',
        }}
      />
    </div>
  );
};
