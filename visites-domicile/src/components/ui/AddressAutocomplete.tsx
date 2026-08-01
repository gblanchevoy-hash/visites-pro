'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { searchAdresses } from '@/lib/utils/geo';
import { useAppStore } from '@/lib/stores/appStore';

const MiniMapPicker = dynamic(() => import('./MiniMapPicker'), { ssr: false });

interface SelectResult {
  adresse: string;
  codePostal: string;
  ville: string;
  lat: number;
  lng: number;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: SelectResult) => void;
  placeholder?: string;
  className?: string;
  /** Show a draggable mini-map after an address is selected, to fine-tune GPS coords */
  allowMapAdjust?: boolean;
}

const sessionCache = new Map<string, Awaited<ReturnType<typeof searchAdresses>>>();

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, className, allowMapAdjust = true }: Props) {
  const { user } = useAppStore();
  const [suggestions, setSuggestions] = useState<Awaited<ReturnType<typeof searchAdresses>>>([]);
  const [loading, setLoading]         = useState(false);
  const [open, setOpen]               = useState(false);
  const [coords, setCoords]           = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap]         = useState(false);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reqIdRef      = useRef(0);
  const lastResultRef = useRef<SelectResult | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 3) { setSuggestions([]); setOpen(false); return; }

    const cacheKey = q.trim().toLowerCase();
    const cached = sessionCache.get(cacheKey);
    if (cached) {
      setSuggestions(cached);
      setOpen(cached.length > 0);
      return;
    }

    const thisReqId = ++reqIdRef.current;
    setLoading(true);
    const results = await searchAdresses(q, user?.id);
    if (thisReqId !== reqIdRef.current) return;

    sessionCache.set(cacheKey, results);
    if (sessionCache.size > 200) {
      const firstKey = sessionCache.keys().next().value;
      if (firstKey) sessionCache.delete(firstKey);
    }

    setSuggestions(results);
    setOpen(results.length > 0);
    setLoading(false);
  }, [user?.id]);

  const handleChange = (v: string) => {
    onChange(v);
    setShowMap(false); // typing again invalidates the previous pin
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 300);
  };

  const handleSelect = (s: Awaited<ReturnType<typeof searchAdresses>>[number]) => {
    const adresse = [s.housenumber, s.street].filter(Boolean).join(' ') || s.label.split(',')[0].trim();
    const cp = s.postcode ?? '';
    const ville = s.city ?? '';
    const result: SelectResult = { adresse, codePostal: cp, ville, lat: s.lat, lng: s.lng };
    onChange(s.label);
    setSuggestions([]); setOpen(false);
    setCoords({ lat: s.lat, lng: s.lng });
    lastResultRef.current = result;
    if (allowMapAdjust) setShowMap(true);
    onSelect?.(result);
  };

  const handleMapDrag = (lat: number, lng: number) => {
    setCoords({ lat, lng });
    if (lastResultRef.current) {
      const updated = { ...lastResultRef.current, lat, lng };
      lastResultRef.current = updated;
      onSelect?.(updated);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          className={className ?? 'input'}
          placeholder={placeholder ?? 'Commencez à taper une adresse…'}
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
          spellCheck={false}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-72 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li key={i}
              onMouseDown={e => { e.preventDefault(); handleSelect(s); }}
              className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-primary-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0">
              <MapPin className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {[s.housenumber, s.street].filter(Boolean).join(' ') || s.label.split(',')[0]}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {[s.postcode, s.city].filter(Boolean).join(' · ')}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Mini-map to fine-tune the pin after selection — handles lieux-dits / imprecise matches */}
      {allowMapAdjust && coords && (
        <div className="mt-2">
          <button type="button" onClick={() => setShowMap(s => !s)}
            className="flex items-center gap-1.5 text-xs text-primary-600 font-medium hover:text-primary-700 transition-colors">
            {showMap ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showMap ? 'Masquer la carte' : 'Affiner la position sur la carte'}
          </button>
          {showMap && (
            <div className="mt-2">
              <MiniMapPicker lat={coords.lat} lng={coords.lng} onChange={handleMapDrag} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
