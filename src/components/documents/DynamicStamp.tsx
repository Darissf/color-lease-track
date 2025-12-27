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
  
  // Simple color - just for text
  const primaryColor = isLunas ? '#047857' : '#b91c1c';
  
  const sizeClasses = {
    sm: 'w-40 h-20',
    md: 'w-52 h-26',
    lg: 'w-64 h-32',
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
        viewBox="0 0 260 120"
        className="w-full h-full"
        style={{
          fontFamily: "'Courier New', Courier, monospace",
        }}
      >
        <defs>
          {/* Grunge filter */}
          <filter id={`${uniqueId}-grunge`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" seed="15"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
            <feGaussianBlur in="displaced" stdDeviation="0.3" result="blurred"/>
            <feComposite in="blurred" in2="SourceGraphic" operator="in"/>
          </filter>
        </defs>

        {/* Main stamp group with grunge effect */}
        <g filter={`url(#${uniqueId}-grunge)`}>
          
          {/* Outer border */}
          <rect
            x="4"
            y="4"
            width="252"
            height="112"
            fill="none"
            stroke={primaryColor}
            strokeWidth="4"
            rx="5"
            opacity="0.95"
          />
          
          {/* Inner border */}
          <rect
            x="12"
            y="12"
            width="236"
            height="96"
            fill="none"
            stroke={primaryColor}
            strokeWidth="1.5"
            strokeDasharray="10 3"
            rx="3"
            opacity="0.7"
          />

          {/* Corner ornaments - Top Left */}
          <g transform="translate(8, 8)">
            <text x="0" y="10" fontSize="12" fill={primaryColor} opacity="0.9">★</text>
          </g>
          
          {/* Corner ornaments - Top Right */}
          <g transform="translate(252, 8) scale(-1, 1)">
            <text x="0" y="10" fontSize="12" fill={primaryColor} opacity="0.9">★</text>
          </g>
          
          {/* Corner ornaments - Bottom Left */}
          <g transform="translate(8, 112) scale(1, -1)">
            <text x="0" y="10" fontSize="12" fill={primaryColor} opacity="0.9">★</text>
          </g>
          
          {/* Corner ornaments - Bottom Right */}
          <g transform="translate(252, 112) scale(-1, -1)">
            <text x="0" y="10" fontSize="12" fill={primaryColor} opacity="0.9">★</text>
          </g>

          {/* Status text - PLAIN, BOLD, LARGE */}
          <text
            x="130"
            y="38"
            fontSize={isLunas ? "24" : "20"}
            fill={primaryColor}
            fontWeight="900"
            textAnchor="middle"
            dominantBaseline="middle"
            letterSpacing="5"
          >
            {isLunas ? 'LUNAS' : 'BELUM LUNAS'}
          </text>

          {/* Document number */}
          <text
            x="130"
            y="58"
            fontSize="12"
            fill={primaryColor}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            letterSpacing="0.5"
          >
            {`No. ${documentNumber}`}
          </text>

          {/* Date */}
          <text
            x="130"
            y="74"
            fontSize="11"
            fill={primaryColor}
            fontWeight="600"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {date}
          </text>

          {/* Company name */}
          <text
            x="130"
            y="92"
            fontSize="11"
            fill={primaryColor}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            letterSpacing="0.5"
          >
            {companyName.toUpperCase()}
          </text>

          {/* Subtle ink spots for authenticity */}
          <g opacity="0.12">
            <circle cx="35" cy="35" r="3" fill={primaryColor}/>
            <circle cx="225" cy="40" r="2.5" fill={primaryColor}/>
            <circle cx="40" cy="85" r="2" fill={primaryColor}/>
            <circle cx="220" cy="80" r="1.5" fill={primaryColor}/>
          </g>
        </g>
      </svg>
    </div>
  );
};