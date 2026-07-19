'use client';
import { useEffect, useState } from 'react';
import { Check, Loader2, Cloud } from 'lucide-react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Singleton event bus pour déclencher l'indicateur depuis n'importe où
const listeners: Array<(status: SaveStatus) => void> = [];

export function triggerSave(status: SaveStatus) {
  listeners.forEach(fn => fn(status));
}

export default function SaveIndicator() {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const handler = (s: SaveStatus) => {
      setStatus(s);
      if (s === 'saved') setLastSaved(new Date());
    };
    listeners.push(handler);
    return () => { const i = listeners.indexOf(handler); if (i > -1) listeners.splice(i, 1); };
  }, []);

  // Mettre à jour "il y a X secondes"
  useEffect(() => {
    if (!lastSaved) return;
    const update = () => {
      const secs = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
      if (secs < 5) setElapsed('à l\'instant');
      else if (secs < 60) setElapsed(`il y a ${secs}s`);
      else setElapsed(`il y a ${Math.floor(secs/60)}min`);
    };
    update();
    const t = setInterval(update, 10000);
    return () => clearInterval(t);
  }, [lastSaved]);

  if (status === 'idle' && !lastSaved) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      fontSize: '12px', color: status === 'error' ? '#EF4444' : '#94A3B8',
      padding: '4px 10px', borderRadius: '8px',
      background: status === 'saving' ? '#F8FAFC' : 'transparent',
      transition: 'all .2s',
    }}>
      {status === 'saving' && <Loader2 style={{ width:'12px', height:'12px', animation:'spin .8s linear infinite', color:'#94A3B8' }} />}
      {status === 'saved' && <Check style={{ width:'12px', height:'12px', color:'#10B981' }} />}
      {status === 'idle' && lastSaved && <Cloud style={{ width:'12px', height:'12px' }} />}
      <span>
        {status === 'saving' && 'Sauvegarde…'}
        {status === 'saved' && `Sauvegardé ${elapsed}`}
        {status === 'idle' && lastSaved && `Sauvegardé ${elapsed}`}
        {status === 'error' && 'Erreur de sauvegarde'}
      </span>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}
