'use client';
import { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  requireCheck?: boolean;
  checkLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen, title, message, confirmLabel = 'Confirmer',
  requireCheck = false, checkLabel = 'Je confirme la suppression',
  danger = true, onConfirm, onCancel
}: ConfirmModalProps) {
  const [checked, setChecked] = useState(false);

  if (!isOpen) return null;

  const canConfirm = !requireCheck || checked;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}
      onClick={onCancel}>
      <div style={{
        background: '#FFFFFF', borderRadius: '20px', padding: '32px',
        width: '100%', maxWidth: '400px',
        boxShadow: '0 24px 80px rgba(15,23,42,.20)',
        animation: 'modalIn .2s ease',
      }}
        onClick={e => e.stopPropagation()}>

        <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>

        {/* Icon */}
        <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: danger ? '#FEE2E2' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          {danger
            ? <Trash2 style={{ width: '22px', height: '22px', color: '#DC2626' }} />
            : <AlertTriangle style={{ width: '22px', height: '22px', color: '#2563EB' }} />
          }
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>{title}</h3>
        <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.65, marginBottom: requireCheck ? '20px' : '28px' }}>{message}</p>

        {/* Case à cocher optionnelle */}
        {requireCheck && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#FEF2F2', borderRadius: '10px', cursor: 'pointer', marginBottom: '20px', border: `1px solid ${checked ? '#FECACA' : '#FEE2E2'}` }}>
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#DC2626', cursor: 'pointer' }} />
            <span style={{ fontSize: '13px', color: '#991B1B', fontWeight: 500 }}>{checkLabel}</span>
          </label>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel}
            style={{ flex: 1, height: '44px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#374151', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Annuler
          </button>
          <button onClick={() => { onConfirm(); setChecked(false); }} disabled={!canConfirm}
            style={{ flex: 1, height: '44px', borderRadius: '12px', background: canConfirm ? (danger ? '#DC2626' : '#2563EB') : '#CBD5E1', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: canConfirm ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all .15s' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
