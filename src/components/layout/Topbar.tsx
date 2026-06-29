'use client';
import { useAppStore } from '@/lib/stores/appStore';
import { Menu, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  variant?: 'default' | 'road';
}

const ACTION_LABELS: Record<string, string> = {
  ADD_RDV: 'Création RDV annulée',
  UPDATE_RDV: 'Modification RDV annulée',
  DELETE_RDV: 'Suppression RDV annulée',
  ADD_PATIENT: 'Création patient annulée',
  UPDATE_PATIENT: 'Modification patient annulée',
  DELETE_PATIENT: 'Suppression patient annulée',
  UPDATE_SETTINGS: 'Paramètres restaurés',
};

export default function Topbar({ title, subtitle, actions, variant = 'default' }: Props) {
  const { setSidebarOpen, history, undo } = useAppStore();
  const lastAction = history[0];

  const handleUndo = async () => {
    if (!lastAction) return;
    await undo();
    toast.success(ACTION_LABELS[lastAction.type] ?? 'Action annulée');
  };

  const isRoad = variant === 'road';

  return (
    <header className={`flex-shrink-0 flex items-center justify-between px-4 lg:px-6 py-4 border-b ${isRoad ? 'topbar-gradient border-white/10' : 'bg-white border-slate-100'}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className={`lg:hidden p-2 rounded-xl transition-colors ${isRoad ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className={`text-lg font-bold leading-tight ${isRoad ? 'text-white' : 'text-slate-900'}`}>{title}</h1>
          {subtitle && <p className={`text-xs mt-0.5 ${isRoad ? 'text-blue-200' : 'text-slate-500'}`}>{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Undo button — always visible when history exists */}
        {lastAction && (
          <button
            onClick={handleUndo}
            title={`Annuler : ${ACTION_LABELS[lastAction.type] ?? 'dernière action'}`}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              isRoad
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Annuler</span>
          </button>
        )}
        {actions}
      </div>
    </header>
  );
}
