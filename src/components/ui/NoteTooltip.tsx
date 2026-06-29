'use client';
import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FileText } from 'lucide-react';

interface Props {
  text: string;
  children: React.ReactNode;
}

export default function NoteTooltip({ text, children }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const show = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const sidebarWidth = 260; // sidebar width in px
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
            left: `${Math.min(pos.x, window.innerWidth - 260)}px`,
            top: `${pos.y}px`,
            zIndex: 99999,
            pointerEvents: 'none',
            maxWidth: '240px',
          }}>
          <div style={{
            background: '#fffbeb',
            color: '#1e293b',
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '12px',
            lineHeight: '1.6',
            boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
            border: '1.5px solid #fde68a',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px', color: '#92400e', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              Note
            </div>
            {text}
          </div>
          {/* Arrow */}
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
