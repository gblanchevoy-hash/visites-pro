'use client';
import { useAppStore, describeAction } from '@/lib/stores/appStore';
import { Menu, Undo2, Redo2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  variant?: 'default' | 'road';
}

export default function Topbar({ title, subtitle, actions, variant = 'default' }: Props) {
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
      padding: '0 20px',
      height: '64px',
      background: '#ffffff',
      borderBottom: '1px solid #f1f5f9',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '1px' }}>{subtitle}</p>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Undo */}
        {lastAction && (
          <button onClick={handleUndo} title={`Annuler : ${describeAction(lastAction)}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '10px', border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#64748b', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f8fafc')}>
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Annuler</span>
          </button>
        )}
        {/* Redo */}
        {nextAction && (
          <button onClick={handleRedo} title={`Rétablir : ${describeAction(nextAction)}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '10px', border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#64748b', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f8fafc')}>
            <Redo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rétablir</span>
          </button>
        )}
        {actions}
      </div>
    </header>
  );
}
