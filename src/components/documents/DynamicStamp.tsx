import { cn } from "@/lib/utils";

interface DynamicStampProps {
  status: 'LUNAS' | 'BELUM_LUNAS';
  documentNumber: string;
  companyName: string;
  date: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const DynamicStamp = ({
  status,
  documentNumber,
  companyName,
  date,
  size = 'md',
  className,
}: DynamicStampProps) => {
  const isLunas = status === 'LUNAS';
  
  const primaryColor = isLunas ? '#047857' : '#b91c1c';
  const secondaryColor = isLunas ? '#065f46' : '#991b1b';
  const accentColor = isLunas ? '#10b981' : '#ef4444';
  
  const sizeClasses = {
    sm: 'w-44 h-28',
    md: 'w-56 h-36',
    lg: 'w-72 h-44',
  };

  const uniqueId = `stamp-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div
      className={cn(
        "relative select-none",
        sizeClasses[size],
        className
      )}
      style={{
        transform: 'rotate(-8deg)',
      }}
    >
      <svg
        viewBox="0 0 280 180"
        className="w-full h-full"
        style={{
          fontFamily: "'Courier New', Courier, monospace",
        }}
      >
        <defs>
          {/* Advanced grunge filter */}
          <filter id={`${uniqueId}-grunge`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" seed="15"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
            <feGaussianBlur in="displaced" stdDeviation="0.3" result="blurred"/>
            <feComposite in="blurred" in2="SourceGraphic" operator="in"/>
          </filter>
          
          {/* Ink bleeding effect */}
          <filter id={`${uniqueId}-ink`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G"/>
          </filter>

          {/* Worn edge effect */}
          <filter id={`${uniqueId}-worn`}>
            <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" result="turbulence"/>
            <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="3" xChannelSelector="R" yChannelSelector="G"/>
          </filter>

          {/* Gradient for ribbon */}
          <linearGradient id={`${uniqueId}-ribbon-grad`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.9"/>
            <stop offset="50%" stopColor={primaryColor} stopOpacity="1"/>
            <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.9"/>
          </linearGradient>

          {/* Pattern for decorative line */}
          <pattern id={`${uniqueId}-dots`} patternUnits="userSpaceOnUse" width="8" height="8">
            <circle cx="4" cy="4" r="1" fill={primaryColor} opacity="0.6"/>
          </pattern>
        </defs>

        {/* Main stamp group with grunge effect */}
        <g filter={`url(#${uniqueId}-grunge)`}>
          
          {/* Outer border - thick */}
          <rect
            x="4"
            y="4"
            width="272"
            height="172"
            fill="none"
            stroke={primaryColor}
            strokeWidth="4"
            rx="6"
            opacity="0.95"
          />
          
          {/* Middle decorative border */}
          <rect
            x="12"
            y="12"
            width="256"
            height="156"
            fill="none"
            stroke={primaryColor}
            strokeWidth="1.5"
            strokeDasharray="12 4"
            rx="4"
            opacity="0.8"
          />
          
          {/* Inner border */}
          <rect
            x="18"
            y="18"
            width="244"
            height="144"
            fill="none"
            stroke={primaryColor}
            strokeWidth="2"
            rx="3"
            opacity="0.9"
          />

          {/* Corner ornaments - Top Left */}
          <g transform="translate(8, 8)">
            <text x="0" y="12" fontSize="14" fill={primaryColor} opacity="0.9">★</text>
            <line x1="16" y1="6" x2="40" y2="6" stroke={primaryColor} strokeWidth="2" opacity="0.7"/>
            <line x1="6" y1="16" x2="6" y2="40" stroke={primaryColor} strokeWidth="2" opacity="0.7"/>
          </g>
          
          {/* Corner ornaments - Top Right */}
          <g transform="translate(272, 8) scale(-1, 1)">
            <text x="0" y="12" fontSize="14" fill={primaryColor} opacity="0.9">★</text>
            <line x1="16" y1="6" x2="40" y2="6" stroke={primaryColor} strokeWidth="2" opacity="0.7"/>
            <line x1="6" y1="16" x2="6" y2="40" stroke={primaryColor} strokeWidth="2" opacity="0.7"/>
          </g>
          
          {/* Corner ornaments - Bottom Left */}
          <g transform="translate(8, 172) scale(1, -1)">
            <text x="0" y="12" fontSize="14" fill={primaryColor} opacity="0.9">★</text>
            <line x1="16" y1="6" x2="40" y2="6" stroke={primaryColor} strokeWidth="2" opacity="0.7"/>
            <line x1="6" y1="16" x2="6" y2="40" stroke={primaryColor} strokeWidth="2" opacity="0.7"/>
          </g>
          
          {/* Corner ornaments - Bottom Right */}
          <g transform="translate(272, 172) scale(-1, -1)">
            <text x="0" y="12" fontSize="14" fill={primaryColor} opacity="0.9">★</text>
            <line x1="16" y1="6" x2="40" y2="6" stroke={primaryColor} strokeWidth="2" opacity="0.7"/>
            <line x1="6" y1="16" x2="6" y2="40" stroke={primaryColor} strokeWidth="2" opacity="0.7"/>
          </g>

          {/* Ribbon banner background - THINNER */}
          <g filter={`url(#${uniqueId}-ink)`}>
            {/* Ribbon left fold */}
            <polygon 
              points="30,52 40,48 40,72 30,68" 
              fill={secondaryColor}
              opacity="0.6"
            />
            {/* Ribbon right fold */}
            <polygon 
              points="250,52 240,48 240,72 250,68" 
              fill={secondaryColor}
              opacity="0.6"
            />
            {/* Main ribbon - thinner */}
            <rect
              x="40"
              y="46"
              width="200"
              height="26"
              fill={`url(#${uniqueId}-ribbon-grad)`}
              opacity="0.75"
            />
            {/* Ribbon highlight */}
            <rect
              x="40"
              y="46"
              width="200"
              height="3"
              fill={accentColor}
              opacity="0.3"
            />
          </g>

          {/* Status text in ribbon - NO SYMBOLS */}
          <text
            x="140"
            y="62"
            fontSize={isLunas ? "16" : "14"}
            fill="white"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            letterSpacing="3"
            filter={`url(#${uniqueId}-worn)`}
          >
            {isLunas ? 'LUNAS' : 'BELUM LUNAS'}
          </text>

          {/* Decorative separator line */}
          <line
            x1="50"
            y1="82"
            x2="230"
            y2="82"
            stroke={primaryColor}
            strokeWidth="1"
            strokeDasharray="4 2 1 2"
            opacity="0.5"
          />

          {/* Document number - LARGER */}
          <text
            x="140"
            y="100"
            fontSize="14"
            fill={primaryColor}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            letterSpacing="0.5"
          >
            {documentNumber}
          </text>

          {/* Date - LARGER */}
          <text
            x="140"
            y="118"
            fontSize="12"
            fill={primaryColor}
            fontWeight="600"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {date}
          </text>

          {/* Decorative dots separator */}
          <g opacity="0.4">
            <circle cx="80" cy="132" r="1.5" fill={primaryColor}/>
            <circle cx="100" cy="132" r="1.5" fill={primaryColor}/>
            <circle cx="120" cy="132" r="1.5" fill={primaryColor}/>
            <circle cx="140" cy="132" r="1.5" fill={primaryColor}/>
            <circle cx="160" cy="132" r="1.5" fill={primaryColor}/>
            <circle cx="180" cy="132" r="1.5" fill={primaryColor}/>
            <circle cx="200" cy="132" r="1.5" fill={primaryColor}/>
          </g>

          {/* Company name - LARGER, FULL TEXT */}
          <text
            x="140"
            y="150"
            fontSize="13"
            fill={primaryColor}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            letterSpacing="1"
          >
            {companyName.toUpperCase()}
          </text>

          {/* Random ink spots for authenticity */}
          <g opacity="0.15">
            <circle cx="45" cy="65" r="4" fill={primaryColor}/>
            <circle cx="235" cy="70" r="3" fill={primaryColor}/>
            <circle cx="60" cy="140" r="2.5" fill={primaryColor}/>
            <circle cx="220" cy="135" r="2" fill={primaryColor}/>
            <circle cx="100" cy="40" r="1.5" fill={primaryColor}/>
            <circle cx="180" cy="160" r="2" fill={primaryColor}/>
            <ellipse cx="130" cy="35" rx="8" ry="2" fill={primaryColor}/>
            <ellipse cx="150" cy="165" rx="6" ry="1.5" fill={primaryColor}/>
          </g>

          {/* Texture scratches */}
          <g opacity="0.1" stroke={primaryColor} strokeWidth="0.5">
            <line x1="25" y1="60" x2="35" y2="65"/>
            <line x1="245" y1="55" x2="255" y2="60"/>
            <line x1="30" y1="120" x2="40" y2="125"/>
            <line x1="240" y1="115" x2="250" y2="120"/>
            <line x1="70" y1="30" x2="85" y2="32"/>
            <line x1="195" y1="148" x2="210" y2="150"/>
          </g>

          {/* Edge wear marks */}
          <g opacity="0.08">
            <rect x="2" y="40" width="6" height="20" fill={primaryColor}/>
            <rect x="272" y="80" width="6" height="25" fill={primaryColor}/>
            <rect x="100" y="2" width="30" height="5" fill={primaryColor}/>
            <rect x="150" y="173" width="40" height="5" fill={primaryColor}/>
          </g>
        </g>

        {/* Additional overlay for depth */}
        <rect
          x="4"
          y="4"
          width="272"
          height="172"
          fill="none"
          stroke={primaryColor}
          strokeWidth="0.5"
          rx="6"
          opacity="0.3"
          style={{ transform: 'translate(1px, 1px)' }}
        />
      </svg>

      {/* CSS overlay for extra grunge texture */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 20% 30%, ${primaryColor}05 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, ${primaryColor}08 0%, transparent 40%),
            radial-gradient(ellipse at 50% 50%, transparent 0%, ${primaryColor}03 100%)
          `,
          mixBlendMode: 'multiply',
        }}
      />
    </div>
  );
};
