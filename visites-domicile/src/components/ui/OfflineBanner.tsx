'use client';
import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOffline = () => { setIsOnline(false); setWasOffline(true); };
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowRestored(true);
        setTimeout(() => setShowRestored(false), 3000);
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [wasOffline]);

  if (isOnline && showRestored) return (
    <div style={{ background: '#F0FDF4', borderBottom: '1px solid #BBF7D0', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, animation: 'fadeIn .3s ease' }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <Wifi style={{ width: '14px', height: '14px', color: '#10B981' }} />
      <p style={{ fontSize: '13px', color: '#065F46', fontWeight: 500 }}>Connexion rétablie — vos données sont synchronisées</p>
    </div>
  );

  if (!isOnline) return (
    <div style={{ background: '#FEF2F2', borderBottom: '1px solid #FECACA', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <WifiOff style={{ width: '16px', height: '16px', color: '#DC2626', flexShrink: 0 }} />
        <p style={{ fontSize: '13px', color: '#DC2626', fontWeight: 500 }}>
          Pas de connexion — certaines fonctionnalités sont indisponibles
        </p>
      </div>
      <span style={{ fontSize: '11px', color: '#EF4444', background: '#FEE2E2', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, flexShrink: 0 }}>
        HORS LIGNE
      </span>
    </div>
  );

  return null;
}
