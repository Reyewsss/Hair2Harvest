import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { makePin, PIN_COLORS } from "./map-pin";
import { formatAddress, hasPin, type Supplier } from "../data/suppliers-data";
import { SupplierLink } from "./supplier-link.tsx";
import { StatusBadge } from "./supplier-shared";

// Cache icons: Leaflet re-creates the marker DOM whenever the icon object changes.
const ICONS = new Map<string, L.DivIcon>();
function iconFor(s: Supplier, focused: boolean) {
  const key = `${s.status}|${focused}|${!!s.pinApproximate}`;
  let icon = ICONS.get(key);
  if (!icon) {
    icon = makePin({
      color: s.status === "enrolled" ? PIN_COLORS.enrolled : PIN_COLORS.candidate,
      focused,
      approximate: s.pinApproximate,
    });
    ICONS.set(key, icon);
  }
  return icon;
}

/* Shops on exactly the same coordinates (e.g. several approximate pins on the barangay
 * centre, or two shops in one building) would hide each other. Fan each group out in a
 * small circle (~18 m) around the shared point so every shop is visible and clickable. */
function spreadOverlaps(list: Supplier[]): Map<string, [number, number]> {
  const groups = new Map<string, Supplier[]>();
  for (const s of list) {
    const key = `${s.lat!.toFixed(5)},${s.lng!.toFixed(5)}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  const out = new Map<string, [number, number]>();
  for (const group of groups.values()) {
    if (group.length === 1) {
      out.set(group[0].id, [group[0].lat!, group[0].lng!]);
      continue;
    }
    const radius = 18 + group.length * 2; // metres
    group.forEach((s, i) => {
      const angle = (2 * Math.PI * i) / group.length - Math.PI / 2;
      const dLat = (radius * Math.sin(angle)) / 111_320;
      const dLng = (radius * Math.cos(angle)) / (111_320 * Math.cos((s.lat! * Math.PI) / 180));
      out.set(s.id, [s.lat! + dLat, s.lng! + dLng]);
    });
  }
  return out;
}

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

  const positions = useMemo(() => spreadOverlaps(pinned), [pinned]);
  const approximate = useMemo(() => pinned.filter((s) => s.pinApproximate), [pinned]);

  const bounds = useMemo<L.LatLngBoundsExpression | null>(
    () => (pinned.length > 0 ? pinned.map((s) => positions.get(s.id)!) : null),
    [pinned, positions],
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
          {approximate.length > 0 ? (
            <span className="flex items-center gap-1.5">
              <span className="flex size-3.5 items-center justify-center rounded-full border border-dashed border-current text-[0.55rem] font-bold">
                ?
              </span>
              Approximate
            </span>
          ) : null}
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
              position={positions.get(s.id)!}
              icon={iconFor(s, focusId === s.id)}
              zIndexOffset={focusId === s.id ? 1000 : 0}
              eventHandlers={{ click: () => setFocusId(s.id) }}
            >
              <Popup>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{s.shopName}</p>
                  <p className="text-xs text-muted-foreground">{formatAddress(s)}</p>
                  {s.pinApproximate ? (
                    <p className="text-xs font-medium text-amber-700">Approximate location</p>
                  ) : null}
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
              {focus.pinApproximate ? (
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Approximate pin: set the exact spot in Edit Details
                </p>
              ) : null}
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

      {approximate.length > 0 ? (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          {approximate.length === 1 ? "1 shop has" : `${approximate.length} shops have`} an approximate pin
          (address not found): {approximate.map((s) => s.shopName).join(", ")}. Open the shop and
          drag its pin in Edit Details.
        </p>
      ) : null}

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
  approximate = false,
}: {
  lat: number;
  lng: number;
  title: string;
  status?: "enrolled" | "candidate";
  approximate?: boolean;
}) {
  const icon = useMemo(
    () =>
      makePin({ color: status === "enrolled" ? PIN_COLORS.enrolled : PIN_COLORS.candidate, size: 34, approximate }),
    [status, approximate],
  );
  return (
    <div className="space-y-2">
      {approximate ? (
        <p className="rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400">
          Approximate location: the address wasn't found. Use Edit Details to drag the pin onto the shop.
        </p>
      ) : null}
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
