import React from 'react';

export interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export const MobileBottomNav: React.FC<{
  items: BottomNavItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}> = ({ items, activeId, onChange, ariaLabel = 'Section navigation' }) => (
  <nav className="mobile-bottom-nav" aria-label={ariaLabel}>
    <div className="mobile-bottom-nav-inner">
      {items.map(it => (
        <button
          key={it.id}
          className={`mobile-bottom-nav-item${activeId===it.id ? ' active' : ''}`}
          aria-current={activeId===it.id ? 'page' : undefined}
          aria-label={it.label}
          onClick={() => onChange(it.id)}
        >
          <span aria-hidden style={{ display: 'flex' }}>{it.icon}</span>
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  </nav>
);
