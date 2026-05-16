import React from 'react';

interface ImpersonationBannerProps {
  viewingAs?: { email: string; id: number } | null;
  onExit: () => void;
}

export function ImpersonationBanner({ viewingAs, onExit }: ImpersonationBannerProps) {
  if (!viewingAs) return null;
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: '#F39C12', color: '#000',
      padding: '8px 16px', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between',
      fontWeight: 600, fontSize: 14,
    }}>
      <span>Viewing as: {viewingAs.email} (ID: {viewingAs.id})</span>
      <button onClick={onExit} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontWeight: 700 }}>
        Exit
      </button>
    </div>
  );
}
