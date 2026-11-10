import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { hasPin, type Supplier } from "../data/suppliers-data";
import { SupplierLink } from "./supplier-link.tsx";
import { StatusBadge } from "./supplier-shared";

// Colored pin built from a tiny SVG so we don't need the default marker PNGs.
const makePinIcon = (enrolled: boolean, focused: boolean) =>
  L.divIcon({
    className: "",
    html: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
        width="${focused ? 34 : 28}" height="${focused ? 34 : 28}"
        fill="currentColor"
        style="color:${enrolled ? "var(--primary, #2563eb)" : "#9ca3af"};
               filter: drop-shadow(0 1px 2px rgba(0,0,0,.35));
               transition: transform .15s ease;"
      >
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/>
      </svg>`,
    iconSize: [focused ? 34 : 28, focused ? 34 : 28],
    iconAnchor: [focused ? 17 : 14, focused ? 34 : 28],
  });

// Auto-fits the viewport and handles re-measuring for animated layouts.
function FitToPins({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();

  // 1. Force a re-measure after mount (handles sidebar transition settling)
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      map.invalidateSize();
    });
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (bounds) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }, 350);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [map]); // Omit bounds intentionally; handled in the effect below

  // 2. Re-measure on any container resize
  useEffect(() => {
    const container = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(container);
    return () => ro.disconnect();
  }, [map]);

  // 3. Fit bounds whenever the filtered pins change
  useEffect(() => {
    if (bounds) {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [bounds, map]);

  return null;
}

export function SupplierPinMap({ suppliers }: { suppliers: Supplier[] }) {
  const [focusId, setFocusId] = useState<string | null>(null);

  const pinned = useMemo(() => suppliers.filter(hasPin), [suppliers]);
  const unpinned = useMemo(
    () => suppliers.filter((s) => !hasPin(s)),
    [suppliers],
  );
  const focus = pinned.find((s) => s.id === focusId) ?? null;

  const bounds = useMemo<L.LatLngBoundsExpression | null>(
    () =>
      pinned.length > 0
        ? pinned.map((s) => [s.lat!, s.lng!] as [number, number])
        : null,
    [pinned],
  );

  if (pinned.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-6 py-14 text-center text-sm text-muted-foreground">
        No shops with a map pin match your filters.
      </div>
    );
  }

  const center: [number, number] = [pinned[0].lat!, pinned[0].lng!];

  return (
    <div className="space-y-3">
      <div className="relative h-[28rem] overflow-hidden rounded-xl border">
        {/* Legend overlay */}
        <div className="pointer-events-none absolute top-3 left-3 z-[1000] flex items-center gap-4 rounded-lg border bg-card/90 px-3 py-1.5 text-xs">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-primary" /> Enrolled
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-muted-foreground" /> Candidate
          </span>
        </div>

        <MapContainer
          center={center}
          zoom={13}
          scrollWheelZoom
          style={{ height: "100%", width: "100%", zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitToPins bounds={bounds} />

          {pinned.map((s) => (
            <Marker
              key={s.id}
              position={[s.lat!, s.lng!]}
              icon={makePinIcon(s.status === "enrolled", focusId === s.id)}
              eventHandlers={{ click: () => setFocusId(s.id) }}
            >
              <Popup>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{s.shopName}</p>
                  <p className="text-xs text-muted-foreground">{s.barangay}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Focus card */}
        {focus ? (
          <div className="absolute right-3 bottom-3 left-3 z-[1000] flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-md sm:right-auto sm:w-80">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{focus.shopName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {focus.barangay}
              </p>
            </div>
            <StatusBadge status={focus.status} />
            <SupplierLink
              href={`/suppliers/${focus.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              View profile
            </SupplierLink>
          </div>
        ) : null}
      </div>

      {unpinned.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          No map pin yet: {unpinned.map((s) => s.shopName).join(", ")}. Add one
          from Edit Details.
        </p>
      ) : null}
    </div>
  );
}

// Single-shop map for the profile page: an OpenStreetMap embed centred on the saved pin.
// Renamed to ShopMap to match the import in supplier-profile-page.tsx.
export function ShopMap({
  lat,
  lng,
  title,
  status,
}: {
  lat: number;
  lng: number;
  title: string;
  status?: "enrolled" | "candidate";
}) {
  const dLat = 0.003;
  const dLng = 0.004;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - dLng}%2C${lat - dLat}%2C${lng + dLng}%2C${lat + dLat}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className="space-y-2">
      <iframe
        title={`Map of ${title}`}
        src={src}
        loading="lazy"
        className="h-56 w-full rounded-lg border"
      />
      <a
        href={`https://www.google.com/maps?q=${lat},${lng}`}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-medium text-primary hover:underline"
      >
        Open in Google Maps
      </a>
    </div>
  );
}
