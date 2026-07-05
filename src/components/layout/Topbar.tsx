'use client';
import { useAppStore, describeAction } from '@/lib/stores/appStore';
import { Menu, Undo2, Redo2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Topbar({ title, subtitle, actions }: Props) {
  const { setSidebarOpen, past, future, undo, redo } = useAppStore();
  const lastAction = past[0];
  const nextAction = future[0];

  const handleUndo = async () => {
    if (!lastAction) return;
    await undo();
    toast.success(`Annulé : ${describeAction(lastAction)}`, { icon: '↩️' });
  };

  const handleRedo = async () => {
    if (!nextAction) return;
    await redo();
    toast.success(`Rétabli : ${describeAction(nextAction)}`, { icon: '↪️' });
  };

  return (
    <header style={{
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      height: '56px',
      minHeight: '56px',
      background: '#ffffff',
      borderBottom: '1px solid #f1f5f9',
      gap: '8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        {/* Menu burger mobile */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden"
          style={{ padding: '8px', borderRadius: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', flexShrink: 0 }}>
          <Menu style={{ width: '20px', height: '20px' }} />
        </button>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
          {subtitle && <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</p>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {lastAction && (
          <button onClick={handleUndo} title={`Annuler : ${describeAction(lastAction)}`}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
            <Undo2 style={{ width: '13px', height: '13px' }} />
            <span className="hidden sm:inline" style={{ fontSize: '12px' }}>Annuler</span>
          </button>
        )}
        {nextAction && (
          <button onClick={handleRedo} title={`Rétablir : ${describeAction(nextAction)}`}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
            <Redo2 style={{ width: '13px', height: '13px' }} />
            <span className="hidden sm:inline" style={{ fontSize: '12px' }}>Rétablir</span>
          </button>
        )}
        {actions}
      </div>
    </header>
  );
}
