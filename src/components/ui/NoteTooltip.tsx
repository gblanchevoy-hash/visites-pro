'use client';
import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  content: React.ReactNode;
  children: React.ReactNode;
}

export default function NoteTooltip({ content, children }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const show = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const sidebarWidth = 260;
    const x = Math.max(sidebarWidth + 8, rect.left);
    setPos({ x, y: rect.bottom + 10 });
  }, []);

  const hide = useCallback(() => setPos(null), []);

  return (
    <div ref={ref} onMouseEnter={show} onMouseLeave={hide} className="contents">
      {children}
      {pos && typeof window !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            left: `${Math.min(pos.x, window.innerWidth - 280)}px`,
            top: `${pos.y}px`,
            zIndex: 99999,
            pointerEvents: 'none',
            maxWidth: '260px',
          }}>
          <div style={{
            background: '#fffbeb',
            color: '#1e293b',
            borderRadius: '12px',
            padding: '10px 14px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
            border: '1.5px solid #fde68a',
          }}>
            {content}
          </div>
          <div style={{
            position: 'absolute', top: '-5px', left: '16px',
            width: 0, height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderBottom: '5px solid #fde68a',
          }} />
        </div>,
        document.body
      )}
    </div>
  );
}
