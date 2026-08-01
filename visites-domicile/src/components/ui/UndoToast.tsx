'use client';
import toast from 'react-hot-toast';

interface UndoToastOptions {
  message: string;
  onUndo: () => void;
  duration?: number;
}

export function toastWithUndo({ message, onUndo, duration = 5000 }: UndoToastOptions) {
  toast(
    (t) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px' }}>
        <span style={{ fontSize: '14px', color: '#0F172A', flex: 1 }}>{message}</span>
        <button
          onClick={() => { onUndo(); toast.dismiss(t.id); }}
          style={{
            padding: '5px 12px', borderRadius: '8px',
            background: '#2563EB', color: '#fff',
            border: 'none', fontSize: '12px', fontWeight: 700,
            cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
          }}>
          Annuler
        </button>
      </div>
    ),
    {
      duration,
      style: { background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(15,23,42,.10)', borderRadius: '12px', padding: '12px 16px' },
      icon: '↩️',
    }
  );
}
