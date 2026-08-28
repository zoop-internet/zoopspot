import React from 'react';
export const SkeletonLine: React.FC<{ width?: string | number; height?: number; style?: React.CSSProperties }> = ({ width='100%', height=12, style }) => (
  <div className="skeleton skeleton-line" style={{ width, height, ...style }} aria-hidden />
);
export const SkeletonMetrics: React.FC = () => (
  <div className="metrics-bar" aria-hidden>
    {[1,2,3].map(i=>(
      <div key={i} className="metric-item" style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div className="skeleton" style={{ height:10, width:80 }} />
        <div className="skeleton" style={{ height:22, width:60 }} />
        <div className="skeleton" style={{ height:10, width:100 }} />
      </div>
    ))}
  </div>
);
export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows=4, cols=4 }) => (
  <div role="status" aria-label="Loading">
    {Array.from({length: rows}).map((_,r)=>(
      <div key={r} className="skeleton-table-row" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({length: cols}).map((__,c)=>(<div key={c} className="skeleton" style={{ height:12 }} />))}
      </div>
    ))}
    <span style={{ position:'absolute', left:-9999 }}>Loading…</span>
  </div>
);
