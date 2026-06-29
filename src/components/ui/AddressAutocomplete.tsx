'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface Suggestion {
  label: string;
  x: number; // lng
  y: number; // lat
  postcode?: string;
  city?: string;
  street?: string;
  housenumber?: string;
  context?: string;
  type?: string;
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

// French government address API — very precise for France
async function searchGouv(q: string): Promise<Suggestion[]> {
  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=6&autocomplete=1`;
    const res = await fetch(url);
    const data = await res.json();
    return (data.features ?? []).map((f: {
      properties: { label: string; postcode?: string; city?: string; street?: string; housenumber?: string; context?: string; type?: string };
      geometry: { coordinates: [number, number] };
    }) => ({
      label: f.properties.label,
      x: f.geometry.coordinates[0],
      y: f.geometry.coordinates[1],
      postcode: f.properties.postcode,
      city: f.properties.city,
      street: f.properties.street,
      housenumber: f.properties.housenumber,
      context: f.properties.context,
      type: f.properties.type,
    }));
  } catch { return []; }
}

// Nominatim fallback for non-French or complex queries
async function searchNominatim(q: string): Promise<Suggestion[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ', France')}&limit=4&countrycodes=fr&addressdetails=1&accept-language=fr`;
    const res = await fetch(url, { headers: { 'User-Agent': 'VisitesDomicile/1.0' } });
    const data = await res.json();
    return data.map((f: {
      display_name: string;
      lon: string;
      lat: string;
      address: { postcode?: string; city?: string; town?: string; village?: string; road?: string; house_number?: string };
    }) => {
      const a = f.address;
      const ville = a.city ?? a.town ?? a.village ?? '';
      const rue = [a.house_number, a.road].filter(Boolean).join(' ');
      return {
        label: f.display_name.split(',').slice(0, 3).join(',').trim(),
        x: parseFloat(f.lon),
        y: parseFloat(f.lat),
        postcode: a.postcode,
        city: ville,
        street: rue,
      };
    });
  } catch { return []; }
}

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, className }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading]         = useState(false);
  const [open, setOpen]               = useState(false);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef     = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    // Try French gov API first (best for France)
    let results = await searchGouv(q);
    // Fallback to Nominatim if not enough results
    if (results.length < 2) {
      const nom = await searchNominatim(q);
      results = [...results, ...nom].slice(0, 6);
    }
    setSuggestions(results);
    setOpen(results.length > 0);
    setLoading(false);
  }, []);

  const handleChange = (v: string) => {
    onChange(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 300);
  };

  const handleSelect = (s: Suggestion) => {
    const adresse = [s.housenumber, s.street].filter(Boolean).join(' ') || s.label.split(',')[0].trim();
    const cp    = s.postcode ?? '';
    const ville = s.city ?? '';
    onChange(s.label);
    setSuggestions([]); setOpen(false);
    onSelect?.({ adresse, codePostal: cp, ville, lat: s.y, lng: s.x });
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
                  {[s.postcode, s.city, s.context?.split(',')[0]].filter(Boolean).join(' · ')}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
