import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { makePin, PIN_COLORS } from "./map-pin";
import { formatAddress, hasPin, type Supplier } from "../data/suppliers-data";
import { SupplierLink } from "./supplier-link.tsx";
import { StatusBadge } from "./supplier-shared";

// Cache icons: Leaflet re-creates the marker DOM whenever the icon object changes.
const pinFor = (enrolled: boolean, focused: boolean) =>
  makePin({ color: enrolled ? PIN_COLORS.enrolled : PIN_COLORS.candidate, focused });
const ICONS = {
  enrolled: pinFor(true, false),
  enrolledFocused: pinFor(true, true),
  candidate: pinFor(false, false),
  candidateFocused: pinFor(false, true),
};

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
            <MapPin className="size-3.5" style={{ color: PIN_COLORS.enrolled }} /> Enrolled
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5" style={{ color: PIN_COLORS.candidate }} /> Candidate
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
              icon={
                ICONS[
                  `${s.status === "enrolled" ? "enrolled" : "candidate"}${focusId === s.id ? "Focused" : ""}` as keyof typeof ICONS
                ]
              }
              zIndexOffset={focusId === s.id ? 1000 : 0}
              eventHandlers={{ click: () => setFocusId(s.id) }}
            >
              <Popup>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{s.shopName}</p>
                  <p className="text-xs text-muted-foreground">{formatAddress(s)}</p>
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
                {formatAddress(focus)}
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

// Single-shop map for the profile page: the saved pin on a Leaflet map, same pin as everywhere else.
export function ShopMap({
  lat,
  lng,
  title,
  status = "enrolled",
}: {
  lat: number;
  lng: number;
  title: string;
  status?: "enrolled" | "candidate";
}) {
  const icon = useMemo(
    () => makePin({ color: status === "enrolled" ? PIN_COLORS.enrolled : PIN_COLORS.candidate, size: 34 }),
    [status],
  );
  return (
    <div className="space-y-2">
      <div className="h-56 overflow-hidden rounded-lg border">
        <MapContainer
          key={`${lat},${lng}`}
          center={[lat, lng]}
          zoom={18}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <Marker position={[lat, lng]} icon={icon} title={title} />
        </MapContainer>
      </div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-xs tabular-nums text-muted-foreground">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </span>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary hover:underline"
        >
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}
