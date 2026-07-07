'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/lib/stores/appStore';
import { supabase } from '@/lib/supabase/client';
import { StickyNote as StickyNoteIcon, X, Plus, Trash2 } from 'lucide-react';

interface Note {
  id: string;
  contenu: string;
  couleur: string;
}

const COLORS: Record<string, { bg: string; border: string; text: string; btn: string }> = {
  yellow: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', btn: '#F59E0B' },
  blue:   { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', btn: '#3B82F6' },
  green:  { bg: '#F0FDF4', border: '#BBF7D0', text: '#14532D', btn: '#22C55E' },
  pink:   { bg: '#FDF2F8', border: '#F9A8D4', text: '#831843', btn: '#EC4899' },
  slate:  { bg: '#F8FAFC', border: '#CBD5E1', text: '#1E293B', btn: '#64748B' },
};

export default function StickyNoteButton() {
  const { user } = useAppStore();
  const [open, setOpen]       = useState(false);
  const [notes, setNotes]     = useState<Note[]>([]);
  const [saving, setSaving]   = useState<string | null>(null);
  const saveTimer = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const panelRef  = useRef<HTMLDivElement>(null);
  const btnRef    = useRef<HTMLButtonElement>(null);

  // Load notes
  useEffect(() => {
    if (!user) return;
    supabase.from('notes_rapides').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
      .then(({ data }) => setNotes((data as Note[]) ?? []));
  }, [user]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const addNote = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('notes_rapides')
      .insert({ user_id: user.id, contenu: '', couleur: 'yellow' })
      .select().single();
    if (!error && data) setNotes(prev => [data as Note, ...prev]);
  };

  const updateNote = useCallback((id: string, field: 'contenu' | 'couleur', value: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));
    setSaving(id);
    clearTimeout(saveTimer.current[id]);
    saveTimer.current[id] = setTimeout(async () => {
      await supabase.from('notes_rapides').update({ [field]: value }).eq('id', id);
      setSaving(null);
    }, 800);
  }, []);

  const deleteNote = async (id: string) => {
    await supabase.from('notes_rapides').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const totalNotes = notes.length;
  const hasContent = notes.some(n => n.contenu.trim().length > 0);

  return (
    <>
      {/* Bouton dans la Topbar */}
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        title="Pense-bête"
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '36px', height: '36px',
          borderRadius: '10px',
          background: open ? '#FFFBEB' : '#F8FAFC',
          border: `1px solid ${open ? '#FDE68A' : '#E2E8F0'}`,
          cursor: 'pointer',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = '#F1F5F9'; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
      >
        <StickyNoteIcon style={{ width: '16px', height: '16px', color: open ? '#F59E0B' : '#64748B' }} />
        {/* Badge si notes avec contenu */}
        {hasContent && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            width: '14px', height: '14px', borderRadius: '50%',
            background: '#F59E0B', color: '#fff',
            fontSize: '9px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid #fff',
          }}>{totalNotes > 9 ? '9+' : totalNotes}</span>
        )}
      </button>

      {/* Panel pense-bête */}
      {open && typeof window !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: '64px', right: '16px',
            width: '320px',
            maxHeight: 'calc(100vh - 80px)',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '18px',
            boxShadow: '0 20px 60px rgba(15,23,42,0.14), 0 4px 16px rgba(15,23,42,0.06)',
            zIndex: 99998,
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderBottom: '1px solid #F1F5F9',
            background: '#FFFBEB',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <StickyNoteIcon style={{ width: '16px', height: '16px', color: '#F59E0B' }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Pense-bête</span>
              {totalNotes > 0 && (
                <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>{totalNotes} note{totalNotes > 1 ? 's' : ''}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={addNote}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '8px', background: '#F59E0B', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                <Plus style={{ width: '13px', height: '13px' }} /> Ajouter
              </button>
              <button onClick={() => setOpen(false)}
                style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X style={{ width: '14px', height: '14px' }} />
              </button>
            </div>
          </div>

          {/* Notes list */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '10px' }}>
            {notes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <StickyNoteIcon style={{ width: '32px', height: '32px', color: '#FDE68A', margin: '0 auto 10px' }} />
                <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '12px' }}>Aucune note pour l'instant</p>
                <button onClick={addNote}
                  style={{ padding: '8px 18px', borderRadius: '10px', background: '#F59E0B', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  + Créer une note
                </button>
              </div>
            ) : notes.map(note => {
              const c = COLORS[note.couleur] ?? COLORS.yellow;
              return (
                <div key={note.id} style={{
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: '12px', padding: '10px 12px', marginBottom: '8px',
                  position: 'relative',
                }}>
                  {/* Color picker */}
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {Object.entries(COLORS).map(([key, col]) => (
                        <button key={key} onClick={() => updateNote(note.id, 'couleur', key)}
                          style={{
                            width: '14px', height: '14px', borderRadius: '50%',
                            background: col.btn, border: note.couleur === key ? `2px solid #0F172A` : `1.5px solid transparent`,
                            cursor: 'pointer', padding: 0, transition: 'transform 0.1s',
                          }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {saving === note.id && <span style={{ fontSize: '10px', color: '#94A3B8' }}>Sauvegarde…</span>}
                      <button onClick={() => deleteNote(note.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', padding: '2px' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}>
                        <Trash2 style={{ width: '13px', height: '13px' }} />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={note.contenu}
                    onChange={e => updateNote(note.id, 'contenu', e.target.value)}
                    placeholder="Votre note…"
                    style={{
                      width: '100%', minHeight: '80px', background: 'transparent',
                      border: 'none', outline: 'none', resize: 'vertical',
                      fontSize: '13px', color: c.text, fontFamily: 'inherit',
                      lineHeight: 1.6, padding: 0,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
