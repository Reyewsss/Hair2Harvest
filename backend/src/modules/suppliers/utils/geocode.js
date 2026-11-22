// backend/src/modules/suppliers/utils/geocode.js
//
// Server-side address lookup, used only when the registration form didn't send a pin
// (the form normally sends the pin the user saw on its map). Same rules as the frontend
// (frontend/src/features/suppliers/geocode.ts):
// - unit / floor text is never sent; Nominatim can't place it and it ruins the match
// - search inside Novaliches Proper first, then Quezon City
// - a miss returns the barangay centre flagged `approximate: true` (never cached),
//   so the UI can say "approximate" instead of silently stacking every shop on one point.

const TARGET_AREA = "Novaliches, Quezon City";
const NOVALICHES_VIEWBOX = "121.015,14.750,121.060,14.705"; // lon/lat: left, top, right, bottom

// Centre of Barangay Novaliches Proper, used only as a flagged fallback.
export const FALLBACK = { lat: 14.7289, lng: 121.0375 };

const CACHE = new Map(); // successful lookups only

async function search(params) {
  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "ph", "accept-language": "en", ...params });
  const res = await fetch(url, {
    headers: { "User-Agent": "Hair2Harvest/1.0 (research project)", Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  return data[0] ?? null;
}

export async function geocodeAddress({ street }) {
  const s = String(street ?? "").trim().replace(/\s+/g, " ");
  const approx = { ...FALLBACK, displayName: `${s || "Unknown street"}, Novaliches Proper (approximate)`, approximate: true };
  if (!s) return approx;

  const key = s.toLowerCase();
  if (CACHE.has(key)) return CACHE.get(key);

  try {
    const hit =
      (await search({ q: `${s}, ${TARGET_AREA}`, viewbox: NOVALICHES_VIEWBOX, bounded: "1" })) ??
      (await search({ street: s, city: "Quezon City", country: "Philippines" }));
    if (!hit) {
      console.warn("Geocode: no match for", JSON.stringify(s), "→ approximate pin");
      return approx;
    }
    const result = { lat: Number(hit.lat), lng: Number(hit.lon), displayName: hit.display_name, approximate: false };
    CACHE.set(key, result);
    return result;
  } catch (err) {
    console.warn("Geocode error:", err.message, "→ approximate pin");
    return approx;
  }
}

/** True for coordinates sitting on the fallback point (records saved before this fix). */
export const isFallbackPin = (lat, lng) =>
  Math.abs(Number(lat) - FALLBACK.lat) < 1e-6 && Math.abs(Number(lng) - FALLBACK.lng) < 1e-6;
