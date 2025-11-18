import React from 'react';

interface HankoStampProps {
  text: string;
  color: string;
  size?: number;
  animate?: boolean;
}

export const HankoStamp: React.FC<HankoStampProps> = ({ 
  text, 
  color, 
  size = 80, 
  animate = true 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={animate ? 'animate-[hanko-stamp-appear_0.5s_ease-out]' : ''}
      style={{ filter: `drop-shadow(0 2px 8px ${color}40)` }}
    >
      {/* Outer circle */}
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke={color}
        strokeWidth="3"
      />
      
      {/* Inner circle */}
      <circle
        cx="50"
        cy="50"
        r="38"
        fill="none"
        stroke={color}
        strokeWidth="2"
      />
      
      {/* Textured background for ink effect */}
      <circle
        cx="50"
        cy="50"
        r="35"
        fill={`${color}15`}
      />
      
      {/* Japanese text */}
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize="24"
        fontWeight="bold"
        fontFamily="serif"
        style={{ letterSpacing: '2px' }}
      >
        {text}
      </text>
    </svg>
  );
};
