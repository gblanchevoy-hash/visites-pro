'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/stores/appStore';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Users, Calendar, MapPin, Calculator,
  BarChart3, Download, Settings, LogOut, X, Wifi, WifiOff,
  Navigation, Shield, Wrench, MessageCircle
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', color: 'text-blue-400' },
  { href: '/depart', icon: Navigation, label: 'Mon départ', color: 'text-road-400' },
  { href: '/patients', icon: Users, label: 'Patients', color: 'text-violet-400' },
  { href: '/planning', icon: Calendar, label: 'Planning', color: 'text-sky-400' },
  { href: '/tournees', icon: MapPin, label: 'Tournées', color: 'text-emerald-400' },
  { href: '/frais', icon: Calculator, label: 'Frais km', color: 'text-amber-400' },
  { href: '/statistiques', icon: BarChart3, label: 'Statistiques', color: 'text-pink-400' },
  { href: '/exports', icon: Download, label: 'Exports', color: 'text-teal-400' },
  { href: '/messagerie', icon: MessageCircle, label: 'Messagerie', color: 'text-pink-400' },
  { href: '/outils', icon: Wrench, label: 'Outils', color: 'text-orange-400' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, settings, sidebarOpen, setSidebarOpen, isOnline } = useAppStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Déconnecté');
    router.replace('/auth');
  };

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        'fixed top-0 left-0 h-full z-30 flex flex-col transition-transform duration-300',
        'w-[260px] sidebar-bg',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Road icon */}
              <div className="w-10 h-10 flex-shrink-0">
                <img src="/icons/logo.png" alt="Itilib" className="w-10 h-10 rounded-xl object-contain" />
              </div>
              <div>
                <span className="font-bold text-white text-sm tracking-tight">Itilib</span>
                <p className="text-[10px] text-slate-500 -mt-0.5">Gestion de tournées</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Online status */}
        <div className="px-5 py-2.5 flex items-center gap-2">
          <span className={cn('flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full',
            isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400')}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'En ligne' : 'Hors ligne'}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-slate-600">
            <Shield className="w-3 h-3 text-emerald-600" />
            Sécurisé
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label, color }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  active
                    ? 'nav-active text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon size={17} className={active ? 'text-white' : color} />
                {label}
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-3 border-t border-white/5 space-y-0.5">
          <Link href="/settings" onClick={() => setSidebarOpen(false)}
            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              pathname === '/settings' ? 'nav-active text-white' : 'text-slate-400 hover:text-white hover:bg-white/5')}>
            <Settings size={17} />
            Paramètres
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all duration-150">
            <LogOut size={17} />
            Déconnexion
          </button>
          {(settings?.pseudonyme || user?.email) && (
            <p className="px-3 pt-1 text-[11px] text-slate-600 truncate">{settings?.pseudonyme ?? user?.email}</p>
          )}
        </div>
      </aside>
    </>
  );
}
