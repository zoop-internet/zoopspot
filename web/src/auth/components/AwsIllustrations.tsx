import React from 'react';

/**
 * AWS Console-style minimal blue/cyan outline vector illustrations for Dark Mode
 * Hand holding isometric cubes, and rocket launching through clouds.
 */

export const AwsCubeHandIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="260"
    height="190"
    viewBox="0 0 260 190"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Floating clouds */}
    <path
      d="M35 70C35 62 41 55 49 55C51 46 59 40 69 40C80 40 89 47 90 58C96 58 100 62 100 69C100 75 94 80 88 80H44C38 80 35 76 35 70Z"
      stroke="#38bdf8"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="rgba(56, 189, 248, 0.04)"
    />
    <path
      d="M180 65C180 58 186 53 193 53C195 45 202 39 211 39C221 39 229 46 230 56C234 56 239 60 239 66C239 71 234 76 228 76H188C183 76 180 71 180 65Z"
      stroke="#38bdf8"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="rgba(56, 189, 248, 0.04)"
    />

    {/* Center Top Isometric Cube 1 */}
    <g stroke="#38bdf8" strokeWidth="1.8" strokeLinejoin="round">
      {/* Top face */}
      <polygon points="130,22 150,33 130,44 110,33" fill="#131d2e" />
      {/* Left face */}
      <polygon points="110,33 130,44 130,66 110,55" fill="#0d1522" />
      {/* Right face */}
      <polygon points="130,44 150,33 150,55 130,66" fill="#172338" />
    </g>

    {/* Center Left Isometric Cube 2 */}
    <g stroke="#38bdf8" strokeWidth="1.8" strokeLinejoin="round">
      <polygon points="98,42 116,52 98,62 80,52" fill="#131d2e" />
      <polygon points="80,52 98,62 98,82 80,72" fill="#0d1522" />
      <polygon points="98,62 116,52 116,72 98,82" fill="#172338" />
    </g>

    {/* Center Right Isometric Cube 3 */}
    <g stroke="#38bdf8" strokeWidth="1.8" strokeLinejoin="round">
      <polygon points="162,42 180,52 162,62 144,52" fill="#131d2e" />
      <polygon points="144,52 162,62 162,82 144,72" fill="#0d1522" />
      <polygon points="162,62 180,52 180,72 162,82" fill="#172338" />
    </g>

    {/* Dotted data rays beneath cubes */}
    <line x1="130" y1="72" x2="130" y2="86" stroke="#38bdf8" strokeWidth="1.6" strokeDasharray="3 3" />
    <line x1="118" y1="74" x2="118" y2="84" stroke="#38bdf8" strokeWidth="1.6" strokeDasharray="3 3" />
    <line x1="142" y1="74" x2="142" y2="84" stroke="#38bdf8" strokeWidth="1.6" strokeDasharray="3 3" />

    {/* Hand holding / supporting from the left */}
    <g stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* Sleeve / wrist */}
      <line x1="45" y1="105" x2="72" y2="105" />
      <line x1="45" y1="124" x2="72" y2="124" />
      <line x1="72" y1="100" x2="72" y2="129" />
      
      {/* Palm & fingers reaching out to hold */}
      <path d="M72 105H110C118 105 125 109 132 111L160 111C166 111 170 115 168 121C166 126 160 128 152 128L120 128C112 128 103 126 96 124L72 124" fill="#0d1522" />
      {/* Thumb contour */}
      <path d="M104 105C104 97 113 92 123 92C132 92 136 98 136 105" fill="#0d1522" />
    </g>

    {/* Subtle geometric line grid at bottom */}
    <path
      d="M10 175L60 145M70 175L120 145M130 175L180 145M190 175L240 145"
      stroke="rgba(255, 255, 255, 0.08)"
      strokeWidth="1.4"
    />
  </svg>
);

export const AwsRocketIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="220"
    height="170"
    viewBox="0 0 220 170"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Cloud background */}
    <path
      d="M55 92C46 92 38 98 38 107C38 116 45 122 54 122H160C170 122 178 114 178 105C178 96 171 90 162 89C161 78 151 70 140 70C133 70 127 73 123 79C118 72 111 68 102 68C91 68 82 76 80 87C78 87 76 87 74 87C64 87 55 89 55 92Z"
      stroke="#38bdf8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="rgba(56, 189, 248, 0.04)"
    />

    {/* Rocket Body */}
    <g stroke="#f1f5f9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Main Fuselage */}
      <path
        d="M138 38C121 46 108 61 104 79L128 103C146 99 161 86 169 69C171 64 172 55 172 46C163 46 154 47 149 49L138 38Z"
        fill="#0d1522"
      />
      {/* Nose cone tip */}
      <path d="M160 41C167 43 172 47 172 45C172 43 167 39 160 41Z" fill="#ec7211" />
      
      {/* Porthole Window */}
      <circle cx="138" cy="69" r="8" fill="#131d2e" stroke="#38bdf8" strokeWidth="1.8" />
      <circle cx="138" cy="69" r="3.5" fill="#38bdf8" />

      {/* Left Wing / Fin */}
      <path d="M106 72L91 72C87 72 84 76 87 81L98 93" fill="#131d2e" />
      {/* Right Wing / Fin */}
      <path d="M134 101L134 116C134 120 139 123 143 120L155 108" fill="#131d2e" />

      {/* Center Fin */}
      <path d="M113 93L102 104" />

      {/* Thruster Base */}
      <path d="M108 94L100 102" />
    </g>

    {/* Flame / Exhaust Thrust */}
    <path
      d="M100 102L86 116C84 118 80 117 81 114L86 107L77 112C75 113 73 110 75 107L91 91"
      stroke="#ec7211"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="rgba(236, 114, 17, 0.15)"
    />

    {/* Speed Lines */}
    <line x1="78" y1="132" x2="63" y2="147" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="96" y1="136" x2="85" y2="147" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="112" y1="140" x2="105" y2="147" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
