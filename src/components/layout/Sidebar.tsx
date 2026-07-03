'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/stores/appStore';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Users, Calendar, MapPin,
  BarChart3, Download, Settings, LogOut, X, Navigation,
  Wrench, MessageCircle, CreditCard, ChevronUp, FileText
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Tableau de bord', color: '#60a5fa' },
  { href: '/depart',       icon: Navigation,      label: 'Mon départ',      color: '#fb923c' },
  { href: '/patients',     icon: Users,           label: 'Patients',        color: '#a78bfa' },
  { href: '/planning',     icon: Calendar,        label: 'Planning',        color: '#38bdf8' },
  { href: '/tournees',     icon: MapPin,          label: 'Tournées',        color: '#34d399' },
  { href: '/frais',        icon: CreditCard,      label: 'Frais km',        color: '#fbbf24' },
  { href: '/statistiques', icon: BarChart3,       label: 'Statistiques',    color: '#f472b6' },
  { href: '/exports',      icon: Download,        label: 'Exports',         color: '#2dd4bf' },
  { href: '/rapport-fiscal', icon: FileText,       label: 'Rapport fiscal',  color: '#10b981' },
  { href: '/messagerie',   icon: MessageCircle,   label: 'Messagerie',      color: '#e879f9' },
  { href: '/outils',       icon: Wrench,          label: 'Outils',          color: '#f97316' },
];

export default function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, settings, sidebarOpen, setSidebarOpen, isOnline } = useAppStore();
  const [unreadCount, setUnreadCount] = useState(0);

  // Load unread messages count + subscribe to new messages in real time
  useEffect(() => {
    if (!user) return;

    const loadUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('destinataire_id', user.id)
        .eq('lu', false);
      setUnreadCount(count ?? 0);
    };
    loadUnread();

    // Real-time: new message received → increment badge
    const channel = supabase.channel('sidebar-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as { destinataire_id: string; lu: boolean };
        if (msg.destinataire_id === user.id) {
          setUnreadCount(prev => prev + 1);
        }
      })
      // Real-time: message marked as read → reload count
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
        loadUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Déconnecté');
    router.replace('/auth');
  };

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        'fixed top-0 left-0 h-full z-30 flex flex-col transition-transform duration-300',
        'w-[220px]',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
        style={{ background: '#0f172a', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Logo */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#2563eb' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white"/>
                </svg>
              </div>
              <div>
                <p className="font-bold text-white text-[14px] leading-none">Itilib</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>Gestion de tournées</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-500 hover:text-white transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status badges */}
          <div className="flex gap-2 mt-3">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold"
              style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold"
              style={{ background: 'rgba(148,163,184,0.10)', color: '#94a3b8' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8]" />
              Sécurisé
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {navItems.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
                <div className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group',
                  active
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
                  style={active ? { background: 'rgba(37,99,235,0.18)', color: 'white' } : {}}>
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? item.color : undefined }} />
                  <span className="text-[13px] font-medium flex-1">{item.label}</span>
                  {item.href === '/messagerie' && unreadCount > 0 && !active ? (
                    <span style={{ background:'#ef4444', color:'#fff', borderRadius:'999px', fontSize:'10px', fontWeight:700, padding:'1px 6px', minWidth:'18px', textAlign:'center' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  ) : active ? (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.color }} />
                  ) : null}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: settings + logout */}
        <div className="px-3 pb-3 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
          <Link href="/settings" onClick={() => setSidebarOpen(false)}>
            <div className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
              pathname === '/settings' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            )}>
              <Settings className="w-4 h-4" />
              <span className="text-[13px] font-medium">Paramètres</span>
            </div>
          </Link>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/5 transition-all">
            <LogOut className="w-4 h-4" />
            <span className="text-[13px] font-medium">Déconnexion</span>
          </button>
        </div>

        {/* User profile */}
        <div className="px-3 pb-4">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] flex-shrink-0"
              style={{ background: '#2563eb', color: 'white' }}>
              {(settings?.pseudonyme ?? user?.email ?? 'U')[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white truncate">{settings?.pseudonyme ?? user?.email?.split('@')[0]}</p>
              <p className="text-[10px] truncate" style={{ color: '#64748b' }}>Professionnel de santé</p>
            </div>
            <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#64748b' }} />
          </div>
        </div>
      </aside>
    </>
  );
}
