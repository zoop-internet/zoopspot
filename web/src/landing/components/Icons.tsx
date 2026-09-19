import React from 'react';

/* ─── SVG Icon Helper ─────────────────────────────────────────────────── */
export const Ico: React.FC<{ d: string | React.ReactNode; size?: number; className?: string }> = ({
  d,
  size = 18,
  className = '',
}) =>
  typeof d === 'string' ? (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={d} />
    </svg>
  ) : (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {d}
    </svg>
  );
