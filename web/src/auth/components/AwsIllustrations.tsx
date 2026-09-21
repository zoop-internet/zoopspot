import React from 'react';

/**
 * AWS Console-style minimal blue outline vector illustrations
 * Matches the hand holding isometric cubes and rocket launching through clouds.
 */

export const AwsCubeHandIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="240"
    height="180"
    viewBox="0 0 240 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Floating clouds */}
    <path
      d="M30 65C30 58 35 52 42 52C44 44 51 38 60 38C70 38 78 45 79 55C84 55 88 59 88 65C88 71 83 75 77 75H38C33 75 30 71 30 65Z"
      stroke="#4a90e2"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M170 60C170 54 175 49 181 49C183 42 189 37 197 37C206 37 213 43 214 52C218 52 222 56 222 61C222 66 218 70 212 70H177C173 70 170 66 170 60Z"
      stroke="#4a90e2"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Center Top Isometric Cube 1 */}
    <g stroke="#232f3e" strokeWidth="1.8" strokeLinejoin="round">
      {/* Top face */}
      <polygon points="120,18 138,28 120,38 102,28" fill="#ffffff" />
      {/* Left face */}
      <polygon points="102,28 120,38 120,58 102,48" fill="#f8fafc" />
      {/* Right face */}
      <polygon points="120,38 138,28 138,48 120,58" fill="#e2e8f0" />
    </g>

    {/* Center Left Isometric Cube 2 */}
    <g stroke="#232f3e" strokeWidth="1.8" strokeLinejoin="round">
      <polygon points="90,36 106,45 90,54 74,45" fill="#ffffff" />
      <polygon points="74,45 90,54 90,72 74,63" fill="#f8fafc" />
      <polygon points="90,54 106,45 106,63 90,72" fill="#e2e8f0" />
    </g>

    {/* Center Right Isometric Cube 3 */}
    <g stroke="#232f3e" strokeWidth="1.8" strokeLinejoin="round">
      <polygon points="150,36 166,45 150,54 134,45" fill="#ffffff" />
      <polygon points="134,45 150,54 150,72 134,63" fill="#f8fafc" />
      <polygon points="150,54 166,45 166,63 150,72" fill="#e2e8f0" />
    </g>

    {/* Dotted rays / data lines beneath cubes */}
    <line x1="120" y1="64" x2="120" y2="76" stroke="#4a90e2" strokeWidth="1.6" strokeDasharray="3 3" />
    <line x1="110" y1="66" x2="110" y2="74" stroke="#4a90e2" strokeWidth="1.6" strokeDasharray="3 3" />
    <line x1="130" y1="66" x2="130" y2="74" stroke="#4a90e2" strokeWidth="1.6" strokeDasharray="3 3" />

    {/* Hand holding / supporting from the left */}
    <g stroke="#232f3e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* Sleeve / wrist */}
      <line x1="45" y1="95" x2="68" y2="95" />
      <line x1="45" y1="112" x2="68" y2="112" />
      <line x1="68" y1="90" x2="68" y2="117" />
      
      {/* Palm & fingers reaching out to hold */}
      <path d="M68 95H102C110 95 116 99 122 101L148 101C154 101 158 105 156 111C154 116 148 118 140 118L112 118C104 118 96 116 90 114L68 112" fill="#ffffff" />
      {/* Thumb contour */}
      <path d="M96 95C96 88 104 84 114 84C122 84 126 89 126 95" fill="#ffffff" />
    </g>

    {/* Subtle geometric grid lines at bottom */}
    <path
      d="M10 165L60 135M70 165L120 135M130 165L180 135M190 165L240 135"
      stroke="#e2e8f0"
      strokeWidth="1.4"
    />
  </svg>
);

export const AwsRocketIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="200"
    height="160"
    viewBox="0 0 200 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Cloud background */}
    <path
      d="M50 85C42 85 35 91 35 99C35 107 41 113 49 113H145C154 113 162 106 162 97C162 89 156 83 148 82C147 72 138 65 128 65C122 65 116 68 112 73C108 67 101 63 93 63C83 63 75 70 73 80C71 80 69 80 67 80C58 80 50 82 50 85Z"
      stroke="#4a90e2"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="#ffffff"
    />

    {/* Rocket Body */}
    <g stroke="#232f3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Main Fuselage */}
      <path
        d="M125 35C110 42 98 56 94 72L116 94C132 90 146 78 153 63C155 58 156 50 156 42C148 42 140 43 135 45L125 35Z"
        fill="#ffffff"
      />
      {/* Nose cone tip */}
      <path d="M145 38C152 40 156 44 156 42C156 40 152 36 145 38Z" fill="#ec7211" />
      
      {/* Porthole Window */}
      <circle cx="125" cy="63" r="7" fill="#f8fafc" />
      <circle cx="125" cy="63" r="3" fill="#4a90e2" />

      {/* Left Wing / Fin */}
      <path d="M96 66L82 66C78 66 76 70 78 74L89 85" fill="#f8fafc" />
      {/* Right Wing / Fin */}
      <path d="M122 92L122 106C122 110 126 112 130 110L141 99" fill="#f8fafc" />

      {/* Center Fin */}
      <path d="M103 85L93 95" />

      {/* Thruster Base */}
      <path d="M98 86L91 93" />
    </g>

    {/* Flame / Exhaust Thrust */}
    <path
      d="M91 93L78 106C76 108 73 107 74 104L78 98L70 102C68 103 66 100 68 98L83 83"
      stroke="#ec7211"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="#fff7ed"
    />

    {/* Speed Lines */}
    <line x1="72" y1="120" x2="58" y2="134" stroke="#4a90e2" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="88" y1="124" x2="78" y2="134" stroke="#4a90e2" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="102" y1="128" x2="96" y2="134" stroke="#4a90e2" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
