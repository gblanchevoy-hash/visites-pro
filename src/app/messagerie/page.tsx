'use client';
import { useState, useEffect, useRef } from 'react';
import AppShell from '@/components/layout/AppShell';
import Topbar from '@/components/layout/Topbar';
import { useAppStore } from '@/lib/stores/appStore';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Send, UserPlus, Check, X, MessageCircle, Users, Search, Lock } from 'lucide-react';

interface Profil { user_id: string; pseudonyme: string; }
interface Collaborateur { id: string; demandeur_id: string; destinataire_id: string; statut: string; profil?: Profil; }
interface Message { id: string; expediteur_id: string; destinataire_id: string; contenu: string; lu: boolean; created_at: string; }

export default function MessageriePage() {
  const { user, settings } = useAppStore();
  const [tab, setTab] = useState<'messages' | 'collaborateurs'>('messages');
  const [collabs, setCollabs] = useState<Collaborateur[]>([]);
  const [selectedCollab, setSelectedCollab] = useState<Collaborateur | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profil[]>([]);
  const [sending, setSending] = useState(false);
  const [profileOk, setProfileOk] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const myId = user?.id ?? '';

  // Ensure user has a public profile
  useEffect(() => {
    if (!user || !settings?.pseudonyme) return;
    const ensureProfile = async () => {
      const { data } = await supabase.from('profils_publics').select('user_id').eq('user_id', user.id).single();
      if (!data) {
        await supabase.from('profils_publics').insert({ user_id: user.id, pseudonyme: settings.pseudonyme });
      } else if (data) {
        // Update pseudonyme in case it changed
        await supabase.from('profils_publics').update({ pseudonyme: settings.pseudonyme }).eq('user_id', user.id);
      }
      setProfileOk(true);
    };
    ensureProfile();
  }, [user, settings?.pseudonyme]);

  // Load collaborateurs
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from('collaborateurs').select('*').or(`demandeur_id.eq.${user.id},destinataire_id.eq.${user.id}`);
      if (!data) return;
      // Enrich with profils
      const enriched = await Promise.all(data.map(async (c) => {
        const otherId = c.demandeur_id === user.id ? c.destinataire_id : c.demandeur_id;
        const { data: profil } = await supabase.from('profils_publics').select('user_id,pseudonyme').eq('user_id', otherId).single();
        return { ...c, profil: profil ?? undefined };
      }));
      setCollabs(enriched);
    };
    load();

    // Realtime subscription for new messages
    const channel = supabase.channel('messages').on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        const msg = payload.new as Message;
        if (msg.destinataire_id === user.id || msg.expediteur_id === user.id) {
          setMessages(prev => [...prev, msg]);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      }
    ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Load messages for selected collab
  useEffect(() => {
    if (!selectedCollab || !user) return;
    const otherId = selectedCollab.demandeur_id === user.id ? selectedCollab.destinataire_id : selectedCollab.demandeur_id;
    const load = async () => {
      const { data } = await supabase.from('messages').select('*')
        .or(`and(expediteur_id.eq.${user.id},destinataire_id.eq.${otherId}),and(expediteur_id.eq.${otherId},destinataire_id.eq.${user.id})`)
        .order('created_at');
      setMessages((data as Message[]) ?? []);
      // Mark as read
      // Mark as read — triggers Sidebar unread count refresh via realtime UPDATE event
      await supabase.from('messages').update({ lu: true })
        .eq('destinataire_id', user.id).eq('expediteur_id', otherId).eq('lu', false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };
    load();
  }, [selectedCollab, user]);

  const searchProfils = async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); return; }
    const { data } = await supabase.from('profils_publics').select('user_id,pseudonyme')
      .ilike('pseudonyme', `%${q}%`).neq('user_id', myId).limit(8);
    setSearchResults((data as Profil[]) ?? []);
  };

  const sendRequest = async (profil: Profil) => {
    const already = collabs.find(c =>
      (c.demandeur_id === myId && c.destinataire_id === profil.user_id) ||
      (c.destinataire_id === myId && c.demandeur_id === profil.user_id)
    );
    if (already) { toast('Une demande existe déjà avec cet utilisateur', { icon: 'ℹ️' }); return; }
    const { error } = await supabase.from('collaborateurs').insert({ demandeur_id: myId, destinataire_id: profil.user_id });
    if (error) { toast.error('Erreur envoi demande'); return; }
    toast.success(`Demande envoyée à ${profil.pseudonyme}`);
    setSearchQuery(''); setSearchResults([]);
    // Reload
    const { data } = await supabase.from('collaborateurs').select('*').or(`demandeur_id.eq.${myId},destinataire_id.eq.${myId}`);
    if (data) setCollabs(data);
  };

  const respondRequest = async (collab: Collaborateur, accept: boolean) => {
    await supabase.from('collaborateurs').update({ statut: accept ? 'accepte' : 'refuse' }).eq('id', collab.id);
    setCollabs(prev => prev.map(c => c.id === collab.id ? { ...c, statut: accept ? 'accepte' : 'refuse' } : c));
    toast.success(accept ? 'Collaboration acceptée !' : 'Demande refusée');
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedCollab || !user) return;
    setSending(true);
    const otherId = selectedCollab.demandeur_id === user.id ? selectedCollab.destinataire_id : selectedCollab.demandeur_id;
    const contenu = newMsg.trim();
    // Add message locally immediately so sender sees it right away
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      expediteur_id: user.id,
      destinataire_id: otherId,
      contenu,
      lu: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    setNewMsg('');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    const { error } = await supabase.from('messages').insert({ expediteur_id: user.id, destinataire_id: otherId, contenu });
    if (error) {
      toast.error('Erreur envoi');
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id)); // rollback
    }
    setSending(false);
  };

  const pendingReceived = collabs.filter(c => c.statut === 'en_attente' && c.destinataire_id === myId);
  const acceptedCollabs = collabs.filter(c => c.statut === 'accepte');
  const selectedOtherId = selectedCollab ? (selectedCollab.demandeur_id === myId ? selectedCollab.destinataire_id : selectedCollab.demandeur_id) : null;

  return (
    <AppShell>
      <Topbar title="Messagerie" subtitle="Communication sécurisée entre collaborateurs" />
      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-slate-100 p-2 gap-1">
            <button onClick={() => setTab('messages')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${tab === 'messages' ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50'}`}>
              <MessageCircle className="w-3.5 h-3.5" /> Messages
            </button>
            <button onClick={() => setTab('collaborateurs')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${tab === 'collaborateurs' ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Users className="w-3.5 h-3.5" /> Collabs {pendingReceived.length > 0 && <span className="bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">{pendingReceived.length}</span>}
            </button>
          </div>

          {tab === 'messages' ? (
            <div className="flex-1 overflow-y-auto">
              {acceptedCollabs.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Ajoutez des collaborateurs pour commencer à échanger
                </div>
              ) : acceptedCollabs.map(c => (
                <button key={c.id} onClick={() => setSelectedCollab(c)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 text-left ${selectedCollab?.id === c.id ? 'bg-primary-50' : ''}`}>
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700 text-sm flex-shrink-0">
                    {c.profil?.pseudonyme?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <p className="font-medium text-slate-800 text-sm truncate">{c.profil?.pseudonyme ?? 'Inconnu'}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Search */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ajouter un collaborateur</p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input className="input pl-8 text-sm" placeholder="Chercher par pseudonyme…"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); searchProfils(e.target.value); }} />
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                    {searchResults.map(p => (
                      <button key={p.user_id} onClick={() => sendRequest(p)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-primary-50 text-left transition-colors border-b last:border-0">
                        <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700">
                          {p.pseudonyme[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-800">{p.pseudonyme}</span>
                        <UserPlus className="w-3.5 h-3.5 text-primary-500 ml-auto" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending requests */}
              {pendingReceived.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Demandes reçues</p>
                  {pendingReceived.map(c => (
                    <div key={c.id} className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 mb-2">
                      <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-800">
                        {c.profil?.pseudonyme?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <p className="text-sm font-medium text-slate-800 flex-1">{c.profil?.pseudonyme ?? 'Inconnu'}</p>
                      <button onClick={() => respondRequest(c, true)} className="w-7 h-7 bg-emerald-500 text-white rounded-lg flex items-center justify-center hover:bg-emerald-600"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => respondRequest(c, false)} className="w-7 h-7 bg-red-400 text-white rounded-lg flex items-center justify-center hover:bg-red-500"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* All collabs status */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Mes collaborateurs</p>
                {collabs.length === 0 ? <p className="text-xs text-slate-400">Aucun collaborateur pour l'instant</p> :
                  collabs.map(c => (
                    <div key={c.id} className="flex items-center gap-2 py-2 border-b border-slate-50">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                        {c.profil?.pseudonyme?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <p className="text-sm text-slate-700 flex-1">{c.profil?.pseudonyme ?? '…'}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        c.statut === 'accepte' ? 'bg-emerald-100 text-emerald-700' :
                        c.statut === 'en_attente' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>{c.statut === 'accepte' ? 'Actif' : c.statut === 'en_attente' ? 'En attente' : 'Refusé'}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col bg-slate-50">
          {!selectedCollab ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                <Lock className="w-8 h-8 text-primary-400" />
              </div>
              <p className="font-semibold text-slate-600">Messagerie sécurisée</p>
              <p className="text-sm text-slate-400 max-w-xs">Sélectionnez un collaborateur pour commencer à échanger. Seuls les collaborateurs acceptés peuvent se contacter.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700">
                  {selectedCollab.profil?.pseudonyme?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{selectedCollab.profil?.pseudonyme ?? 'Inconnu'}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Chiffré en transit · usage organisationnel</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 mt-8">Aucun message. Dites bonjour 👋</p>
                ) : messages.map(msg => {
                  const isMe = msg.expediteur_id === myId;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                        isMe ? 'bg-primary-600 text-white rounded-br-md' : 'bg-white text-slate-800 rounded-bl-md shadow-sm border border-slate-100'
                      }`}>
                        <p>{msg.contenu}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-slate-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}
                          {isMe && msg.lu && <span className="ml-1">✓✓</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 bg-white border-t border-slate-200">
                <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                  <input className="input flex-1 text-sm" placeholder="Votre message…"
                    value={newMsg} onChange={e => setNewMsg(e.target.value)} />
                  <button type="submit" disabled={sending || !newMsg.trim()} className="btn-primary px-4 py-2">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
