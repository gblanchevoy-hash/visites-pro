'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    house_number?: string;
    road?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    county?: string;
  };
}

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
}

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, className }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading]         = useState(false);
  const [open, setOpen]               = useState(false);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef    = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setSuggestions([]); setOpen(false); return; }
    // Cancel previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      // Try with France restriction first
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ', France')}&limit=6&countrycodes=fr&addressdetails=1&accept-language=fr`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'VisitesDomicile/1.0' },
        signal: abortRef.current.signal,
      });
      const data: Suggestion[] = await res.json();
      // If no results, try without country restriction
      if (data.length === 0) {
        const url2 = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&addressdetails=1&accept-language=fr`;
        const res2 = await fetch(url2, { headers: { 'User-Agent': 'VisitesDomicile/1.0' } });
        const data2: Suggestion[] = await res2.json();
        setSuggestions(data2);
        setOpen(data2.length > 0);
      } else {
        setSuggestions(data);
        setOpen(true);
      }
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') setSuggestions([]);
    }
    setLoading(false);
  }, []);

  const handleChange = (v: string) => {
    onChange(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 350);
  };

  const getLabel = (s: Suggestion) => {
    const a = s.address;
    const rue = [a.house_number, a.road].filter(Boolean).join(' ');
    const cp  = a.postcode ?? '';
    const ville = a.city ?? a.town ?? a.village ?? a.hamlet ?? a.municipality ?? a.county ?? '';
    return { rue: rue || s.display_name.split(',')[0], cp, ville };
  };

  const handleSelect = (s: Suggestion) => {
    const { rue, cp, ville } = getLabel(s);
    const fullText = `${rue}${cp || ville ? ', ' : ''}${cp} ${ville}`.trim().replace(/,\s*$/, '');
    onChange(fullText);
    setSuggestions([]); setOpen(false);
    if (onSelect) {
      onSelect({ adresse: rue || fullText, codePostal: cp, ville, lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
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
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((s, i) => {
            const { rue, cp, ville } = getLabel(s);
            return (
              <li key={i}
                onMouseDown={e => { e.preventDefault(); handleSelect(s); }}
                className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-primary-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0">
                <MapPin className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{rue || s.display_name.split(',')[0]}</p>
                  {(cp || ville) && <p className="text-xs text-slate-500">{cp} {ville}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
