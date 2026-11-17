// backend/src/modules/suppliers/utils/geocode.js
const TARGET_BARANGAY = "Barangay Novaliches Proper";
const CITY = "Quezon City";
const COUNTRY = "Philippines";

// Fallback center of Barangay Novaliches Proper, Novaliches, Quezon City
// Adjust these two numbers if you want a different default
const FALLBACK = { lat: 14.7289, lng: 121.0375 };

const CACHE = new Map();

export async function geocodeAddress({ street, unit }) {
  const query = [unit, street, TARGET_BARANGAY, CITY, COUNTRY]
    .filter(Boolean)
    .join(", ");

  const cacheKey = query.toLowerCase();
  if (CACHE.has(cacheKey)) return CACHE.get(cacheKey);

  try {
    const url =
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({
        q: query,
        format: "json",
        limit: "1",
        countrycodes: "ph",
      });

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Hair2Harvest/1.0 (research project)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn("Nominatim failed:", res.status);
      return { ...FALLBACK, displayName: `${street}, ${TARGET_BARANGAY} (approx)` };
    }

    const data = await res.json();
    if (data.length) {
      const result = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
      CACHE.set(cacheKey, result);
      return result;
    }

    // 👈 NEW: Return the fallback center, flagged as approximate
    console.warn("Nominatim found no match for:", query, "→ using fallback");
    const fallback = {
      ...FALLBACK,
      displayName: `${street}, ${TARGET_BARANGAY} (approximate)`,
    };
    CACHE.set(cacheKey, fallback);
    return fallback;
  } catch (err) {
    console.warn("Geocode error:", err.message, "→ using fallback");
    return { ...FALLBACK, displayName: `${street}, ${TARGET_BARANGAY} (approx)` };
  }
}