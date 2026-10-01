import React from 'react';

export interface RITLogoProps {
  className?: string;
  variant?: 'full' | 'mark';
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'none';
  showShadow?: boolean;
}

export const RITLogo: React.FC<RITLogoProps> = ({
  className = 'w-8 h-8',
  variant = 'full',
  rounded = 'xl',
  showShadow = true,
}) => {
  const roundedClass = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
  }[rounded];

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden select-none ${roundedClass} ${
        showShadow ? 'shadow-md shadow-amber-500/20' : ''
      } ${className}`}
      aria-label="Rajarambapu Institute of Technology Logo"
      title="Rajarambapu Institute of Technology (RIT)"
    >
      <svg
        viewBox="0 0 500 500"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Yellow Signature Background */}
        <rect width="500" height="500" fill="#FCB913" />

        {/* Geometric 'r' */}
        <rect x="26" y="184" width="204" height="24" fill="#000000" />
        <rect x="26" y="184" width="24" height="126" fill="#000000" />

        {/* Geometric 'i' with distinct Red Square Dot */}
        <rect x="244" y="145" width="23" height="23" fill="#E52427" />
        <rect x="244" y="184" width="23" height="126" fill="#000000" />

        {/* Geometric 't' */}
        <rect x="281" y="145" width="23" height="165" fill="#000000" />
        <rect x="281" y="184" width="195" height="24" fill="#000000" />
        <rect x="281" y="286" width="195" height="24" fill="#000000" />

        {/* Institutional Subtitle (Rendered in full mode) */}
        {variant === 'full' && (
          <text
            x="250"
            y="348"
            textAnchor="middle"
            fill="#000000"
            fontFamily="system-ui, -apple-system, 'Arial Black', Arial, sans-serif"
            fontSize="21.5px"
            fontWeight="900"
            textLength="450"
            lengthAdjust="spacingAndGlyphs"
          >
            RAJARAMBAPU INSTITUTE OF TECHNOLOGY
          </text>
        )}
      </svg>
    </div>
  );
};
