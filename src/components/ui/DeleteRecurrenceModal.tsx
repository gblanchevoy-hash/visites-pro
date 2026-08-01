'use client';
import { Trash2, CalendarX, CalendarClock } from 'lucide-react';

interface DeleteRecurrenceModalProps {
  isOpen: boolean;
  label: string; // ex: "le RDV de Jean Dupont le 12/08 à 09:00"
  onDeleteOne: () => void;
  onDeleteFromHere: () => void;
  onDeleteAll: () => void;
  onCancel: () => void;
}

export default function DeleteRecurrenceModal({
  isOpen, label, onDeleteOne, onDeleteFromHere, onDeleteAll, onCancel,
}: DeleteRecurrenceModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}
      onClick={onCancel}>
      <div style={{
        background: '#FFFFFF', borderRadius: '20px', padding: '32px',
        width: '100%', maxWidth: '420px',
        boxShadow: '0 24px 80px rgba(15,23,42,.20)',
        animation: 'modalIn .2s ease',
      }}
        onClick={e => e.stopPropagation()}>

        <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>

        <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <Trash2 style={{ width: '22px', height: '22px', color: '#DC2626' }} />
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
          Ce rendez-vous fait partie d&apos;une série récurrente
        </h3>
        <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.65, marginBottom: '24px' }}>
          Vous allez supprimer {label}. Que souhaitez-vous supprimer ?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={onDeleteOne}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              height: '50px', padding: '0 16px', borderRadius: '12px',
              background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}>
            <Trash2 style={{ width: '17px', height: '17px', color: '#64748B', flexShrink: 0 }} />
            Seulement cet événement
          </button>

          <button onClick={onDeleteFromHere}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              height: '50px', padding: '0 16px', borderRadius: '12px',
              background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9A3412',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}>
            <CalendarClock style={{ width: '17px', height: '17px', color: '#EA580C', flexShrink: 0 }} />
            Cet événement et tous les suivants
          </button>

          <button onClick={onDeleteAll}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              height: '50px', padding: '0 16px', borderRadius: '12px',
              background: '#DC2626', border: 'none', color: '#fff',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}>
            <CalendarX style={{ width: '17px', height: '17px', flexShrink: 0 }} />
            Toute la série récurrente
          </button>

          <button onClick={onCancel}
            style={{
              height: '44px', borderRadius: '12px', background: 'transparent', border: 'none',
              color: '#64748B', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: '4px',
            }}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
