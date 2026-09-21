import React from 'react';

export interface AwsSpinnerProps {
  size?: number | 'small' | 'normal' | 'large';
  variant?: 'primary' | 'normal' | 'inverted';
  className?: string;
}

export const AwsSpinner: React.FC<AwsSpinnerProps> = ({
  size = 'normal',
  variant = 'normal',
  className = '',
}) => {
  const pixelSize = typeof size === 'number' ? size : size === 'small' ? 16 : size === 'large' ? 32 : 20;
  const strokeWidth = pixelSize >= 32 ? 3 : 2.5;
  const radius = (pixelSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.7;
  const gapLength = circumference * 0.3;
  // Track and arc stroke colors based on variant
  const trackColor = variant === 'inverted' ? 'rgba(2, 9, 4, 0.25)' : 'rgba(255, 255, 255, 0.18)';
  const arcColor = variant === 'primary' ? '#ec7211' : variant === 'inverted' ? '#020904' : '#38bdf8';

  return (
    <span
      className={`aws-spinner aws-spinner-${variant} ${className}`}
      style={{
        width: pixelSize,
        height: pixelSize,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        verticalAlign: 'middle',
        flexShrink: 0,
      }}
      role="status"
      aria-label="Loading"
    >
      <svg
        viewBox={`0 0 ${pixelSize} ${pixelSize}`}
        width={pixelSize}
        height={pixelSize}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animation: 'aws-spin 0.8s linear infinite',
          transformOrigin: 'center',
        }}
      >
        <circle
          className="aws-spinner-track"
          cx={pixelSize / 2}
          cy={pixelSize / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          className="aws-spinner-arc"
          cx={pixelSize / 2}
          cy={pixelSize / 2}
          r={radius}
          stroke={arcColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${gapLength}`}
        />
      </svg>
    </span>
  );
};

export default AwsSpinner;
