'use client';
import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  content: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export default function NoteTooltip({ content, children, style }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const timerRef = { current: null as ReturnType<typeof setTimeout> | null };

  const show = useCallback((e: React.MouseEvent) => {
    if (e.buttons !== 0) return; // don't show during drag
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const sidebarWidth = 260;
    const x = Math.min(Math.max(sidebarWidth + 8, rect.left), window.innerWidth - 280);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPos({ x, y: rect.bottom + 10 }), 200);
  }, []);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPos(null);
  }, []);

  // Always hide on any pointer/mouse press (drag starts)
  useEffect(() => {
    const clear = () => { if (timerRef.current) clearTimeout(timerRef.current); setPos(null); };
    window.addEventListener('pointerdown', clear);
    window.addEventListener('mousedown', clear);
    return () => { window.removeEventListener('pointerdown', clear); window.removeEventListener('mousedown', clear); };
  }, []);

  return (
    <div
      onMouseEnter={show}
      onMouseLeave={hide}
      style={{ position: 'absolute', inset: 0, zIndex: 20, ...style }}>
      {children}
      {pos && typeof window !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', left: `${pos.x}px`, top: `${pos.y}px`, zIndex: 99999, pointerEvents: 'none', maxWidth: '260px' }}>
          <div style={{ background: '#fffbeb', color: '#1e293b', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 8px 28px rgba(0,0,0,0.18)', border: '1.5px solid #fde68a' }}>
            {content}
          </div>
          <div style={{ position: 'absolute', top: '-5px', left: '16px', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '5px solid #fde68a' }} />
        </div>,
        document.body
      )}
    </div>
  );
}
