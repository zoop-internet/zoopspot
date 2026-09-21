import React from 'react';

/**
 * Zoop Network Minimal Vector Line-Art Illustrations (Dark Mode)
 * Hand holding isometric mesh cubes, and rocket launching through clouds.
 * Styled with Zoop's cyan (#38bdf8), emerald (#34d399), and slate (#94a3b8).
 */

export const AwsCubeHandIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 280 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '100%', maxWidth: '280px', height: 'auto', display: 'block' }}
    aria-hidden="true"
  >
    {/* Floating clouds */}
    <path
      d="M35 75C35 67 41 60 49 60C51 51 59 45 69 45C80 45 89 52 90 63C96 63 100 67 100 74C100 80 94 85 88 85H44C38 85 35 81 35 75Z"
      stroke="#38bdf8"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="rgba(56, 189, 248, 0.05)"
    />
    <path
      d="M195 70C195 63 201 58 208 58C210 50 217 44 226 44C236 44 244 51 245 61C249 61 254 65 254 71C254 76 249 81 243 81H203C198 81 195 76 195 70Z"
      stroke="#38bdf8"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="rgba(56, 189, 248, 0.05)"
    />

    {/* Center Top Isometric Cube 1 (Cyan) */}
    <g stroke="#38bdf8" strokeWidth="1.8" strokeLinejoin="round">
      <polygon points="140,24 162,36 140,48 118,36" fill="rgba(56, 189, 248, 0.15)" />
      <polygon points="118,36 140,48 140,72 118,60" fill="rgba(15, 23, 42, 0.85)" />
      <polygon points="140,48 162,36 162,60 140,72" fill="rgba(30, 41, 59, 0.85)" />
    </g>

    {/* Center Left Isometric Cube 2 (Emerald) */}
    <g stroke="#34d399" strokeWidth="1.8" strokeLinejoin="round">
      <polygon points="105,46 125,57 105,68 85,57" fill="rgba(52, 211, 153, 0.15)" />
      <polygon points="85,57 105,68 105,90 85,79" fill="rgba(15, 23, 42, 0.85)" />
      <polygon points="105,68 125,57 125,79 105,90" fill="rgba(30, 41, 59, 0.85)" />
    </g>

    {/* Center Right Isometric Cube 3 (Cyan) */}
    <g stroke="#38bdf8" strokeWidth="1.8" strokeLinejoin="round">
      <polygon points="175,46 195,57 175,68 155,57" fill="rgba(56, 189, 248, 0.15)" />
      <polygon points="155,57 175,68 175,90 155,79" fill="rgba(15, 23, 42, 0.85)" />
      <polygon points="175,68 195,57 195,79 175,90" fill="rgba(30, 41, 59, 0.85)" />
    </g>

    {/* Dotted data rays beneath cubes */}
    <line x1="140" y1="78" x2="140" y2="92" stroke="#38bdf8" strokeWidth="1.6" strokeDasharray="3 3" />
    <line x1="126" y1="80" x2="126" y2="90" stroke="#34d399" strokeWidth="1.6" strokeDasharray="3 3" />
    <line x1="154" y1="80" x2="154" y2="90" stroke="#38bdf8" strokeWidth="1.6" strokeDasharray="3 3" />

    {/* Hand holding / supporting from the left */}
    <g stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* Sleeve / wrist */}
      <line x1="45" y1="112" x2="74" y2="112" />
      <line x1="45" y1="132" x2="74" y2="132" />
      <line x1="74" y1="106" x2="74" y2="137" />
      
      {/* Palm & fingers reaching out to hold */}
      <path d="M74 112H118C126 112 133 116 140 118L170 118C176 118 180 122 178 128C176 133 170 135 162 135L128 135C120 135 110 133 102 131L74 131" fill="rgba(15, 23, 42, 0.9)" />
      {/* Thumb contour */}
      <path d="M110 112C110 104 120 99 130 99C140 99 144 105 144 112" fill="rgba(15, 23, 42, 0.9)" />
    </g>

    {/* Subtle geometric line grid at bottom */}
    <path
      d="M10 185L60 155M70 185L120 155M130 185L180 155M190 185L240 155M250 185L280 167"
      stroke="rgba(56, 189, 248, 0.15)"
      strokeWidth="1.4"
    />
  </svg>
);

export const AwsRocketIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 240 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '100%', maxWidth: '240px', height: 'auto', display: 'block' }}
    aria-hidden="true"
  >
    {/* Cloud background */}
    <path
      d="M60 98C50 98 42 104 42 114C42 123 50 130 60 130H175C186 130 195 121 195 112C195 102 187 96 177 95C176 83 165 74 153 74C145 74 138 77 134 84C128 76 120 72 110 72C98 72 88 80 86 92C84 92 82 92 80 92C69 92 60 94 60 98Z"
      stroke="#38bdf8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="rgba(56, 189, 248, 0.05)"
    />

    {/* Rocket Body */}
    <g stroke="#f1f5f9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Main Fuselage */}
      <path
        d="M150 40C132 49 118 65 114 84L140 110C159 106 175 92 184 74C186 69 187 59 187 50C177 50 167 51 162 53L150 40Z"
        fill="#0f172a"
      />
      {/* Nose cone tip */}
      <path d="M174 44C181 46 187 50 187 48C187 46 181 42 174 44Z" fill="#38bdf8" />
      
      {/* Porthole Window */}
      <circle cx="150" cy="74" r="9" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.8" />
      <circle cx="150" cy="74" r="4" fill="#38bdf8" />

      {/* Left Wing / Fin */}
      <path d="M116 77L100 77C96 77 92 81 96 87L108 100" fill="#1e293b" />
      {/* Right Wing / Fin */}
      <path d="M146 108L146 124C146 128 152 131 156 128L169 115" fill="#1e293b" />

      {/* Center Fin */}
      <path d="M123 100L112 111" />

      {/* Thruster Base */}
      <path d="M118 101L110 109" />
    </g>

    {/* Flame / Exhaust Thrust */}
    <path
      d="M110 109L95 124C93 126 89 125 90 122L95 115L85 120C83 121 81 118 83 115L100 98"
      stroke="#38bdf8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="rgba(56, 189, 248, 0.2)"
    />

    {/* Speed Lines */}
    <line x1="86" y1="141" x2="70" y2="157" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="105" y1="145" x2="94" y2="157" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="123" y1="150" x2="115" y2="157" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
