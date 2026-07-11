// HERE Geocoding helper
const HERE_KEY = process.env.HERE_API_KEY;

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
  postcode?: string;
  city?: string;
  street?: string;
  housenumber?: string;
}

export async function searchHere(q: string): Promise<GeocodeResult[] | null> {
  if (!HERE_KEY) return null;
  try {
    const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(q)}&lang=fr&limit=6&in=countryCode:FRA&apiKey=${HERE_KEY}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.items ?? []).map((item: {
      title: string;
      position: { lat: number; lng: number };
      address?: { postalCode?: string; city?: string; street?: string; houseNumber?: string };
    }) => ({
      label: item.title,
      lat: item.position.lat,
      lng: item.position.lng,
      postcode: item.address?.postalCode,
      city: item.address?.city,
      street: item.address?.street,
      housenumber: item.address?.houseNumber,
    }));
  } catch { return null; }
}
