/* Address → coordinates via OpenStreetMap Nominatim (free; ~1 request/second, so callers debounce).
 *
 * Accuracy rules:
 * - Unit / floor text ("2nd floor, Unit 3B") is never sent: Nominatim can't place it and it
 *   pushes results to the wrong street. It stays on the record, just not in the lookup.
 * - Search inside a box around Barangay Novaliches Proper first (all shops must be there),
 *   then fall back to Quezon City as a whole.
 * - Return up to 5 matches so the user can pick the right one, each with a precision label.
 */

export type Precision = "exact" | "street" | "area";

export interface GeocodeMatch {
  lat: number;
  lng: number;
  label: string; // human-readable address from OSM
  precision: Precision;
}

// ≈ 2 km around Novaliches Proper (lon/lat: left, top, right, bottom).
const NOVALICHES_VIEWBOX = "121.015,14.750,121.060,14.705";
const ENDPOINT = "https://nominatim.openstreetmap.org/search";

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  category?: string; // jsonv2 name
  class?: string; // json (v1) name
  type: string;
  addresstype?: string;
};

function precisionOf(r: NominatimResult): Precision {
  const cls = r.category ?? r.class ?? "";
  const t = r.addresstype ?? r.type;
  if (["house", "building", "shop", "amenity", "office", "craft"].includes(cls) || t === "house" || t === "building") {
    return "exact";
  }
  if (cls === "highway" || ["road", "street", "residential"].includes(t)) return "street";
  return "area";
}

// Drop the repetitive tail ("Quezon City, Metro Manila, …, Philippines") for display.
const shorten = (displayName: string) => displayName.split(", ").slice(0, 4).join(", ");

async function search(params: Record<string, string>, signal?: AbortSignal): Promise<GeocodeMatch[]> {
  const qs = new URLSearchParams({
    format: "jsonv2",
    limit: "5",
    countrycodes: "ph",
    "accept-language": "en",
    ...params,
  });
  const res = await fetch(`${ENDPOINT}?${qs}`, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as NominatimResult[];
  const order: Record<Precision, number> = { exact: 0, street: 1, area: 2 };
  return data
    .map((r) => ({
      lat: Number(r.lat),
      lng: Number(r.lon),
      label: shorten(r.display_name),
      precision: precisionOf(r),
    }))
    .sort((a, b) => order[a.precision] - order[b.precision]);
}

export async function geocodeStreet(street: string, signal?: AbortSignal): Promise<GeocodeMatch[]> {
  const s = street.trim().replace(/\s+/g, " ");
  if (!s) return [];

  // 1. Inside Novaliches Proper only.
  const local = await search({ q: `${s}, Novaliches, Quezon City`, viewbox: NOVALICHES_VIEWBOX, bounded: "1" }, signal);
  if (local.length) return local;

  // 2. Anywhere in Quezon City (structured search copes better with "#12 Name St." styles).
  return search({ street: s, city: "Quezon City", country: "Philippines" }, signal);
}

export const PRECISION_LABEL: Record<Precision, string> = {
  exact: "Exact address match",
  street: "Street-level match: drag the pin onto the shop",
  area: "Approximate area only: drag the pin onto the shop",
};
